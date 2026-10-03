import { expect, test } from '@playwright/test'
import { vigilarErrores } from './ayudas.ts'

test('se pone y se quita una nota, se cambia de pista y se reproduce', async ({ page }) => {
  const errores = vigilarErrores(page)
  await page.goto('./#/pianoroll')
  const rejilla = page.getByRole('img', { name: /^Rejilla de/ })
  await expect(rejilla).toHaveAccessibleName(/Rejilla de Piano de cola: 16 notas/)

  // Un toque en el centro de la rejilla pone una nota (o quita la que hubiera); otro toque en el mismo sitio lo deshace.
  const caja = await page.locator('.rollo').boundingBox()
  if (!caja) throw new Error('No se ve la rejilla.')
  const x = caja.x + caja.width / 2
  const y = caja.y + caja.height / 2
  await page.mouse.click(x, y)
  await expect(rejilla).toHaveAccessibleName(/: 1[57] notas/)
  await page.mouse.click(x, y)
  await expect(rejilla).toHaveAccessibleName(/: 16 notas/)

  await page.getByRole('button', { name: 'Bajo', exact: true }).click()
  await expect(rejilla).toHaveAccessibleName(/Rejilla de Bajo eléctrico: 20 notas/)
  await page.getByRole('button', { name: 'Percusión' }).click()
  await expect(rejilla).toHaveAccessibleName(/Rejilla de Batería: 52 notas/)

  await page.getByRole('button', { name: 'Reproducir' }).click()
  await expect(page.getByRole('button', { name: 'Parar' })).toBeVisible()
  await page.getByRole('button', { name: 'Subir el tempo' }).click()
  await expect(page.getByRole('status', { name: 'Tempo' })).toContainText('108')
  await page.getByRole('button', { name: 'Parar' }).click()
  await expect(page.getByRole('button', { name: 'Reproducir' })).toBeVisible()
  expect(errores).toEqual([])
})
