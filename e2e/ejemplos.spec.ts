import { expect, test } from '@playwright/test'
import { vigilarErrores } from './ayudas.ts'
import { ID_DE_PRUEBA, leccionDePrueba } from './leccion-de-prueba.ts'

// El service worker serviría la lección real sin pasar por `page.route`.
test.use({ serviceWorkers: 'block' })

/** Ninguna lección del curso usa todavía estas vistas: se ensayan con una propia. */
const LECCION = leccionDePrueba(`
- tipo: teoria
  titulo: En el teclado
  texto: Una melodía sobre un acorde, vista en el teclado.
  vista: teclado
  manipulable: [instrumento]
  ejemplo:
    tempo: 90
    tonalidad: C mayor
    compases: 2
    bucle: true
    pistas:
      - rol: melodia
        instrumento: piano
        notas: "E5:4 D5:4 C5:4 D5:4 | E5:2 E5:2"
      - rol: colchon
        instrumento: cuerdas
        notas: "[C4 E4 G4]:1 | [C4 E4 G4]:1"

- tipo: teoria
  titulo: En la rejilla
  texto: Un ritmo de batería, paso a paso.
  vista: rejilla
  ejemplo:
    tempo: 100
    compases: 1
    bucle: true
    pistas:
      - rol: percusion
        instrumento: bateria
        rejilla:
          paso: "8"
          lineas:
            charles: "xxxxxxxx"
            caja: "..x...x."
            bombo: "x...x..."

- tipo: teoria
  titulo: En el pentagrama
  texto: La misma melodía, escrita.
  vista: pentagrama
  ejemplo:
    tempo: 90
    tonalidad: C mayor
    compases: 2
    pistas:
      - rol: melodia
        instrumento: piano
        notas: "E5:4 D5:4 C5:4 D5:4 | E5:2 E5:2"
`)

test('los ejemplos se ven en teclado, rejilla y pentagrama, y se les cambia el instrumento', async ({ page }) => {
  test.setTimeout(60_000)
  const errores = vigilarErrores(page)
  await page.route(`**/lecciones/${ID_DE_PRUEBA}.json`, (ruta) => ruta.fulfill({ json: LECCION }))
  await page.goto(`./#/leccion/${ID_DE_PRUEBA}/1`)

  // Teclado: marca las notas de la pieza y enciende las que suenan.
  const teclado = page.getByRole('img', { name: /^Teclado\. Notas de la pieza: Do4, Mi4, Sol4, Do5, Re5, Mi5\.$/ })
  await expect(teclado).toBeVisible()
  await expect(page.locator('.teclado__marca')).toHaveCount(6)
  const instrumentos = page.getByRole('group', { name: 'Instrumento de la melodía' })
  await expect(instrumentos.getByRole('button', { name: 'Piano de cola' })).toHaveAttribute('aria-pressed', 'true')
  // Una melodía de una voz admite también los chips.
  await expect(instrumentos.getByRole('button', { name: 'Onda de pulso (chip)' })).toBeVisible()
  await page.getByRole('button', { name: 'Escuchar' }).click()
  await expect(page.getByRole('button', { name: 'Parar' })).toBeVisible({ timeout: 20_000 })
  await expect.poll(() => page.locator('.teclado__tecla--suena').count()).toBeGreaterThan(0)
  // Cambiar de instrumento con la pieza sonando no la para.
  await instrumentos.getByRole('button', { name: 'Onda de pulso (chip)' }).click()
  await expect(instrumentos.getByRole('button', { name: 'Onda de pulso (chip)' })).toHaveAttribute('aria-pressed', 'true')
  await expect(instrumentos.getByRole('button', { name: 'Piano de cola' })).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByRole('button', { name: 'Parar' })).toBeVisible()
  await page.getByRole('button', { name: 'Parar' }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()

  // Rejilla: una fila por pieza de la batería, un golpe por casilla llena.
  await expect(page.getByRole('img', { name: 'Rejilla de pasos de 1 compás: charles, caja, bombo, con 12 golpes.' })).toBeVisible()
  await expect(page.locator('.pasos__casilla--golpe')).toHaveCount(12)
  await expect(page.locator('.pasos__nombre')).toHaveText(['Charles', 'Caja', 'Bombo'])
  await page.getByRole('button', { name: 'Escuchar' }).click()
  await expect.poll(() => page.locator('.pasos__casilla--actual').count(), { timeout: 20_000 }).toBe(3)
  await page.getByRole('button', { name: 'Parar' }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()

  // Pentagrama: abcjs dibuja la pieza con la tinta del tema.
  const pentagrama = page.getByRole('img', { name: 'La pieza escrita en pentagrama' })
  await expect(pentagrama.locator('svg')).toBeVisible({ timeout: 15_000 })
  await expect(pentagrama.locator('svg .abcjs-note')).toHaveCount(6)
  const colores = await pentagrama.evaluate((caja) => {
    const tinta = getComputedStyle(caja).color
    const trazo = caja.querySelector('svg .abcjs-note path')
    return { tinta, nota: trazo ? getComputedStyle(trazo).fill : '' }
  })
  expect(colores.nota).toBe(colores.tinta)
  expect(errores).toEqual([])
})
