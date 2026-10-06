import { expect, test } from '@playwright/test'
import { vigilarErrores } from './ayudas.ts'
import { ID_DE_PRUEBA, leccionDePrueba } from './leccion-de-prueba.ts'

// El service worker serviría la lección real sin pasar por `page.route`.
test.use({ serviceWorkers: 'block' })

const PIEZA = `
    tempo: 100
    tonalidad: D mayor
    compases: 2
    acordes: "D:1 | G:2 A:2"
    pistas:
      - rol: melodia
        instrumento: piano`

const LECCION = leccionDePrueba(`
- tipo: construccion
  modo: completar-melodia
  enunciado: Elige el final de la frase.
  pista: Escucha hacia dónde va la melodía.
  explicacion: La frase baja por grados hasta la tónica.
  pieza:${PIEZA}
        notas: "A4:4 D5:4 ?:2 | D5:4 B4:4 A4:2"
  opciones:
    - notas: "F#5:4. E5:8"
      correcta: true
      porque: Fa sostenido es de Re mayor y lleva a Mi.
    - notas: "F5:2"
      correcta: false
      porque: Fa natural no es de Re mayor.

- tipo: construccion
  modo: elegir-acorde
  enunciado: Elige el acorde que falta.
  pista: Busca el acorde que contiene la nota de la melodía.
  explicacion: Sol mayor contiene el Re de la melodía.
  pieza:
    tempo: 100
    tonalidad: D mayor
    compases: 2
    acordes: "D:1 | ?:2 A:2"
    pistas:
      - rol: melodia
        instrumento: piano
        notas: "A4:4 D5:4 F#5:4. E5:8 | D5:4 B4:4 A4:2"
  opciones:
    - acorde: G
      correcta: true
      porque: Contiene el Re de la melodía.
    - acorde: C
      correcta: false
      porque: Do natural no es de Re mayor.

- tipo: construccion
  modo: ordenar-secciones
  enunciado: Pon los fragmentos en orden.
  pista: El último fragmento acaba en la tónica.
  explicacion: Pregunta, respuesta y cierre.
  pieza:
    tempo: 100
    compases: 3
    pistas:
      - rol: melodia
        instrumento: piano
        notas: "C4:1 | D4:1 | C4:1"
    secciones:
      - {id: A, desde: 1, hasta: 1}
      - {id: B, desde: 2, hasta: 2}
      - {id: C, desde: 3, hasta: 3}
`)

test('los tres modos de construcción guiada se corrigen y explican', async ({ page }) => {
  const errores = vigilarErrores(page)
  await page.route(`**/lecciones/${ID_DE_PRUEBA}.json`, (ruta) => ruta.fulfill({ json: LECCION }))
  await page.goto(`./#/leccion/${ID_DE_PRUEBA}/1`)

  // Completar la melodía: primero la opción mala, que se explica, y luego la buena cuando vuelve a salir.
  await expect(page.getByText('Elige el final de la frase.')).toBeVisible()
  await expect(page.getByRole('img', { name: /Ejemplo de 2 compases/ })).toBeVisible()
  await page.getByRole('radio', { name: 'Fa5' }).click()
  await page.getByRole('button', { name: 'Comprobar' }).click()
  const fallo = page.getByRole('status').filter({ hasText: 'Fallo' })
  await expect(fallo).toContainText('Fa natural no es de Re mayor.')
  await expect(fallo).toContainText('La respuesta era «Fa♯5 – Mi5»')
  await page.getByRole('button', { name: 'Siguiente pregunta' }).click()
  await page.getByRole('radio', { name: 'Fa♯5 – Mi5' }).click()
  await page.getByRole('button', { name: 'Comprobar' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Correcto' })).toBeVisible()
  await page.getByRole('button', { name: 'Continuar' }).click()

  // Elegir el acorde.
  await expect(page.getByText('Elige el acorde que falta.')).toBeVisible()
  await page.getByRole('radio', { name: 'G', exact: true }).click()
  await page.getByRole('button', { name: 'Comprobar' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Correcto' })).toContainText('Contiene el Re de la melodía.')
  await page.getByRole('button', { name: 'Continuar' }).click()

  // Ordenar: salen barajados, así que se recorren las seis ordenaciones posibles con cambios entre vecinos.
  await expect(page.getByText('Pon los fragmentos en orden.')).toBeVisible()
  const filas = page.locator('.orden__fila')
  await expect(filas).toHaveCount(3)
  const correcto = page.getByRole('status').filter({ hasText: 'Correcto' })
  for (const cambio of [0, 1, 0, 1, 0, -1]) {
    await page.getByRole('button', { name: 'Comprobar' }).click()
    if (await correcto.isVisible()) break
    await expect(page.getByRole('status').filter({ hasText: 'Todavía no' })).toContainText('en su sitio')
    if (cambio >= 0) await filas.nth(cambio).getByRole('button', { name: /^Bajar/ }).click()
  }
  await expect(correcto).toContainText('Pregunta, respuesta y cierre.')
  await page.getByRole('button', { name: 'Continuar' }).click()

  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible()
  expect(errores).toEqual([])
})
