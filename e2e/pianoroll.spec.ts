import { expect, test } from '@playwright/test'
import { PIEZA_GUARDADA, sembrarProgreso, vigilarErrores } from './ayudas.ts'

test('se pone y se quita una nota, se cambia de pista y se reproduce', async ({ page }) => {
  const errores = vigilarErrores(page)
  await sembrarProgreso(page, { repertorio: [PIEZA_GUARDADA] })
  await page.goto(`./#/pianoroll/${PIEZA_GUARDADA.id}`)
  const rejilla = page.getByRole('application', { name: /^Rejilla de/ })
  await expect(rejilla).toHaveAccessibleName(/Rejilla de Piano de cola: 15 notas/)

  // Con el lápiz, un toque en un hueco de la rejilla pone una nota; «Deshacer» la quita.
  const caja = await page.locator('.rollo').boundingBox()
  if (!caja) throw new Error('No se ve la rejilla.')
  await page.mouse.click(caja.x + caja.width / 2, caja.y + caja.height - 30)
  await expect(rejilla).toHaveAccessibleName(/: 16 notas/)
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(rejilla).toHaveAccessibleName(/: 15 notas/)

  await page.getByRole('button', { name: 'Bajo', exact: true }).click()
  await expect(rejilla).toHaveAccessibleName(/Rejilla de Bajo eléctrico: 8 notas/)
  await page.getByRole('button', { name: 'Percusión' }).click()
  await expect(rejilla).toHaveAccessibleName(/Rejilla de Batería: 16 notas/)

  await page.getByRole('button', { name: 'Reproducir' }).click()
  await expect(page.getByRole('button', { name: 'Parar' })).toBeVisible()
  // El tempo está en las opciones de la pieza.
  await page.getByRole('button', { name: 'Opciones de la pieza' }).click()
  const opciones = page.getByRole('dialog')
  await opciones.getByRole('button', { name: 'Subir el tempo' }).click()
  await expect(opciones.getByRole('status', { name: 'Tempo' })).toContainText('108')
  await opciones.getByRole('button', { name: 'Cerrar' }).click()
  await page.getByRole('button', { name: 'Parar' }).click()
  await expect(page.getByRole('button', { name: 'Reproducir' })).toBeVisible()
  expect(errores).toEqual([])
})

test('una pieza que no está en el repertorio lo dice', async ({ page }) => {
  await page.goto('./#/pianoroll/no-existe')
  await expect(page.getByRole('heading', { name: 'Esta pieza no está' })).toBeVisible()
  await page.getByRole('button', { name: 'Volver al repertorio' }).last().click()
  await expect(page.getByRole('heading', { name: 'Mi repertorio' })).toBeVisible()
})
