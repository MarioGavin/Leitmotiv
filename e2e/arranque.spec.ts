import { expect, test } from '@playwright/test'
import { abrirDiagnostico, entrar, vigilarErrores } from './ayudas.ts'

test('la pantalla de título lleva al mapa y arranca el audio', async ({ page }) => {
  const errores = vigilarErrores(page)
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Leitmotiv' })).toBeVisible()
  await page.getByRole('button', { name: 'Empezar' }).click()
  await expect(page).toHaveURL(/#\/mapa$/)
  await expect(page.getByRole('button', { name: /Mundo 0: Repaso exprés/ })).toBeVisible()
  await abrirDiagnostico(page)
  await expect(page.getByText('En marcha')).toBeVisible()
  expect(errores).toEqual([])
})

test('el mapa enseña los once mundos y el proyecto final, y solo deja entrar en los que tienen lecciones', async ({ page }) => {
  await entrar(page)
  await expect(page.locator('[data-nodo]')).toHaveCount(12)
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeEnabled()
  await page.getByRole('button', { name: /Mundo 5: Orquestación/ }).click()
  await expect(page.getByRole('heading', { name: 'Orquestación' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeDisabled()
  await page.getByRole('button', { name: /Mundo 0: Repaso exprés/ }).click()
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/#\/mundo\/m00$/)
  await expect(page.getByRole('heading', { name: 'Pulso y compás' })).toBeVisible()
})

test('el aspecto elegido se recuerda al volver a abrir la app', async ({ page }) => {
  await page.goto('./#/ajustes')
  await page.getByRole('button', { name: 'Vinilo' }).click()
  await page.getByRole('button', { name: 'Claro' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-direccion', 'vinilo')
  await expect(page.locator('html')).toHaveAttribute('data-esquema', 'claro')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-direccion', 'vinilo')
  await expect(page.locator('html')).toHaveAttribute('data-esquema', 'claro')
})
