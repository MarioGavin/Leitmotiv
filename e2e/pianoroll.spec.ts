import { expect, test } from '@playwright/test'
import { vigilarErrores } from './ayudas.ts'

test('se pone y se quita una nota, se cambia de pista y se reproduce', async ({ page }) => {
  const errores = vigilarErrores(page)
  await page.goto('./#/pianoroll')
  const rejilla = page.getByRole('application', { name: /^Rejilla de/ })
  await expect(rejilla).toHaveAccessibleName(/Rejilla de Piano de cola: 16 notas/)

  // Con el lápiz, un toque en un hueco de la rejilla pone una nota; «Deshacer» la quita.
  const caja = await page.locator('.rollo').boundingBox()
  if (!caja) throw new Error('No se ve la rejilla.')
  const x = caja.x + caja.width / 2
  const y = caja.y + caja.height / 2
  await page.mouse.click(x, y)
  await expect(rejilla).toHaveAccessibleName(/: 17 notas/)
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(rejilla).toHaveAccessibleName(/: 16 notas/)

  await page.getByRole('button', { name: 'Bajo', exact: true }).click()
  await expect(rejilla).toHaveAccessibleName(/Rejilla de Bajo eléctrico: 20 notas/)
  await page.getByRole('button', { name: 'Percusión' }).click()
  await expect(rejilla).toHaveAccessibleName(/Rejilla de Batería: 52 notas/)

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
