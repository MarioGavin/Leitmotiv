import { expect, test } from '@playwright/test'
import { vigilarErrores } from './ayudas.ts'
import { ID_DE_PRUEBA, leccionDePrueba } from './leccion-de-prueba.ts'

// El service worker serviría la lección real sin pasar por `page.route`.
test.use({ serviceWorkers: 'block' })

const LECCION = leccionDePrueba(`
- tipo: analisis
  enunciado: Escucha la pieza y contesta.
  pista: Busca la nota en la que descansa.
  explicacion: Todo gira alrededor de Re.
  pieza:
    tempo: 100
    tonalidad: D mayor
    compases: 4
    acordes: "D:1 | G:1 | A:1 | D:1"
    pistas:
      - rol: melodia
        instrumento: piano
        notas: "D5:2 F#5:2 | D5:2 B4:2 | C#5:2 E5:2 | D5:1"
    secciones:
      - {id: A1, desde: 1, hasta: 1}
      - {id: A2, desde: 2, hasta: 2}
      - {id: B, desde: 3, hasta: 3}
      - {id: A3, desde: 4, hasta: 4}
  preguntas:
    - {sobre: tonalidad, opciones: [D mayor, B menor]}
    - {sobre: compas, opciones: ["4/4", "3/4"]}
    - {sobre: forma, opciones: [AABA, ABAB]}
    - {sobre: funcion, compas: 3}
    - {sobre: acorde, compas: 2, opciones: [G, Em]}
    - sobre: libre
      pregunta: ¿Qué instrumento toca la melodía?
      opciones: [Piano, Cuerdas]
      correcta: 1
      explicacion: Es un piano.
`)

test('el análisis pregunta por la pieza, destaca el compás y corrige', async ({ page }) => {
  const errores = vigilarErrores(page)
  await page.route(`**/lecciones/${ID_DE_PRUEBA}.json`, (ruta) => ruta.fulfill({ json: LECCION }))
  await page.goto(`./#/leccion/${ID_DE_PRUEBA}/1`)
  await expect(page.getByRole('img', { name: /Ejemplo de 4 compases/ })).toBeVisible()

  const respuestas: Array<[pregunta: string, respuesta: string]> = [
    ['¿En qué tonalidad está?', 'Re mayor'],
    ['¿En qué compás está escrita?', '4/4'],
    ['¿Qué forma tiene?', 'AABA'],
    ['¿Qué función cumple el acorde del compás 3?', 'Dominante'],
    ['¿Qué acorde suena en el compás 2?', 'G'],
    ['¿Qué instrumento toca la melodía?', 'Piano'],
  ]
  for (const [i, [pregunta, respuesta]] of respuestas.entries()) {
    await expect(page.locator('.pregunta')).toHaveText(pregunta)
    // Las preguntas sobre un compás lo destacan en la pieza.
    await expect(page.locator('.vista-pieza__resaltado')).toHaveCount(pregunta.includes('compás 3') || pregunta.includes('compás 2') ? 1 : 0)
    if (i === 0) {
      // Un fallo, para ver la explicación; la pregunta vuelve al final.
      await page.getByRole('radio', { name: 'Si menor' }).click()
      await page.getByRole('button', { name: 'Comprobar' }).click()
      await expect(page.getByRole('status').filter({ hasText: 'Fallo' })).toContainText('La respuesta era «Re mayor»')
      await page.getByRole('button', { name: 'Siguiente pregunta' }).click()
      continue
    }
    await page.getByRole('radio', { name: respuesta, exact: true }).click()
    await page.getByRole('button', { name: 'Comprobar' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Correcto' })).toBeVisible()
    await page.getByRole('button', { name: 'Siguiente pregunta' }).click()
  }

  // Vuelve la fallada.
  await expect(page.getByText('Pregunta 7 de 7')).toBeVisible()
  await page.getByRole('radio', { name: 'Re mayor' }).click()
  await page.getByRole('button', { name: 'Comprobar' }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible()
  expect(errores).toEqual([])
})
