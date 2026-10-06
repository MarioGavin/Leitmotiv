import { expect, test } from '@playwright/test'
import { entrar, vigilarErrores } from './ayudas.ts'
import { ID_DE_PRUEBA, leccionDePrueba } from './leccion-de-prueba.ts'

// El service worker serviría la lección real sin pasar por `page.route`.
test.use({ serviceWorkers: 'block' })

const LECCION = leccionDePrueba(`
- tipo: capas
  enunciado: Elige qué debe sonar en cada momento del juego.
  pista: Cuanto más peligro, más capas.
  explicacion: La música acompaña la tensión del juego.
  pieza:
    tempo: 100
    tonalidad: C mayor
    compases: 2
    bucle: true
    pistas:
      - rol: colchon
        instrumento: cuerdas
        capa: base
        notas: "C4:1 | G3:1"
      - rol: percusion
        instrumento: bateria
        capa: tension
        rejilla:
          paso: "8"
          lineas:
            bombo: "x...x..."
            caja: "..x...x."
  capas: {base: Base, tension: Percusión}
  estados:
    - {id: explorar, nombre: Explorar, capas: [base]}
    - {id: combate, nombre: Combate, capas: [base, tension]}
  situaciones:
    - texto: Aparece un enemigo.
      estado: combate
      porque: El combate pide el pulso de la percusión.
    - texto: El enemigo cae y vuelves a pasear.
      estado: explorar
      porque: Al pasear basta con la base.
`)

test('la mezcla por capas cambia lo que suena al marcar un estado y corrige', async ({ page }) => {
  const errores = vigilarErrores(page)
  await page.route(`**/lecciones/${ID_DE_PRUEBA}.json`, (ruta) => ruta.fulfill({ json: LECCION }))
  // Entrar por el título arranca el audio, así se prueba también el cambio de capas sonando.
  await entrar(page)
  await page.goto(`./#/leccion/${ID_DE_PRUEBA}/1`)

  const capas = page.getByRole('list', { name: /Capas que suenan/ })
  await expect(capas).toHaveAccessibleName('Capas que suenan en «Explorar»')
  await expect(capas.getByRole('listitem')).toHaveText(['Base: suena', 'Percusión: callada'])
  await page.getByRole('button', { name: 'Escuchar' }).click()
  await expect(page.getByRole('button', { name: 'Parar' })).toBeVisible({ timeout: 15_000 })

  // Marcar un estado lo hace sonar antes de responder.
  await page.getByRole('radio', { name: 'Combate' }).click()
  await expect(capas).toHaveAccessibleName('Capas que suenan en «Combate»')
  await expect(capas.getByRole('listitem')).toHaveText(['Base: suena', 'Percusión: suena'])
  await page.getByRole('button', { name: 'Comprobar' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Correcto' })).toContainText('El combate pide el pulso de la percusión.')
  await page.getByRole('button', { name: 'Siguiente pregunta' }).click()

  // Un fallo se explica.
  await expect(page.locator('.pregunta')).toHaveText('El enemigo cae y vuelves a pasear.')
  await page.getByRole('radio', { name: 'Combate' }).click()
  await page.getByRole('button', { name: 'Comprobar' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Fallo' })).toContainText('La respuesta era «Explorar»')
  await page.getByRole('button', { name: 'Siguiente pregunta' }).click()
  await page.getByRole('radio', { name: 'Explorar' }).click()
  await page.getByRole('button', { name: 'Comprobar' }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible()
  expect(errores).toEqual([])
})
