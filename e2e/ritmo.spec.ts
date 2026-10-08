import { expect, test } from '@playwright/test'
import { sembrarProgreso, tocarAlRitmo, vigilarErrores } from './ayudas.ts'

/**
 * Los modos de ritmo que no son «seguir», de punta a punta sobre el contenido
 * real: «Redondas, blancas y negras» (m00.u01.l03) tiene uno de leer (paso 4)
 * y uno de eco (paso 5), seguidos. Suenan de verdad: si fallan los dos sin
 * motivo, mira antes «Ojo con el reloj de audio» en HANDOFF.md.
 */
const ANTERIORES = { lecciones: ['m00.u01.l01', 'm00.u01.l02'] }

test('un ritmo para leer y otro de eco se tocan a tiempo y se superan', async ({ page }) => {
  // Leer: 80 BPM, cuatro compases y dos vueltas; eco: el patrón suena y luego se repite. Casi un minuto de música.
  test.setTimeout(120_000)
  await sembrarProgreso(page, ANTERIORES)
  const errores = vigilarErrores(page)
  await page.goto('./#/leccion/m00.u01.l03/4')

  // Leer: el patrón se ve entero desde el principio y no suena.
  await expect(page.getByText('80 BPM · 4/4 · El patrón no suena: léelo')).toBeVisible()
  await expect(page.getByRole('img', { name: 'Patrón de 10 golpes en 4 compases de 4/4.' })).toBeVisible()
  await tocarAlRitmo(page)
  await page.getByRole('button', { name: 'Empezar' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Superado' })).toContainText('20 de 20', { timeout: 60_000 })
  await page.getByRole('button', { name: 'Continuar' }).click()

  // Eco: el patrón está oculto hasta corregir, y solo cuentan los toques del turno de repetir.
  await expect(page.getByText('84 BPM · 4/4 · Primero escuchas, luego repites')).toBeVisible()
  await expect(page.getByRole('img', { name: 'Patrón de 2 compases: tienes que sacarlo de oído.' })).toBeVisible()
  await tocarAlRitmo(page)
  await page.getByRole('button', { name: 'Empezar' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Superado' })).toContainText('10 de 10', { timeout: 60_000 })
  // Al corregir, el patrón se enseña: una rejilla por vuelta.
  await expect(page.getByRole('img', { name: /^Vuelta 1\. Patrón de 5 golpes en 2 compases/ })).toBeVisible()
  await page.getByRole('button', { name: 'Continuar' }).click()

  // Sigue el análisis: la lección avanza.
  await expect(page.getByRole('progressbar', { name: 'Avance de la lección' })).toHaveAttribute('aria-valuenow', '6')
  expect(errores).toEqual([])
})
