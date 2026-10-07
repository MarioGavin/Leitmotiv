import { expect, test } from '@playwright/test'
import { abrirDiagnostico, entrar, hoy, sembrarProgreso, vigilarErrores } from './ayudas.ts'

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

test('quien empieza no ve ficha en el título, y en el mapa y el mundo empieza en el nivel 1', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('button', { name: 'Empezar' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Tu progreso' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Empezar' }).click()
  const ficha = page.getByRole('region', { name: 'Tu progreso' })
  await expect(ficha).toContainText('Nivel')
  await expect(ficha).toContainText('0/50 XP')
  await expect(ficha).toContainText('0 días')
  await expect(page.locator('.mapa__detalle')).toContainText('0 de 2 lecciones hechas')
})

test('el nivel, la experiencia y la racha se ven en el título, el mapa y el mundo', async ({ page }) => {
  const errores = vigilarErrores(page)
  // 60 puntos: nivel 2 (empieza en 50) y 10 de los 80 que pide el 3. Hoy ya se ha estudiado: racha de 1 día.
  await sembrarProgreso(page, { lecciones: ['m00.u01.l01'], diario: { [hoy()]: 60 } })
  await page.goto('./')
  for (const pantalla of ['título', 'mapa', 'mundo']) {
    if (pantalla === 'mapa') await page.getByRole('button', { name: 'Empezar' }).click()
    if (pantalla === 'mundo') await page.getByRole('button', { name: 'Entrar' }).click()
    const ficha = page.getByRole('region', { name: 'Tu progreso' })
    await expect(ficha, pantalla).toContainText('10/80 XP')
    await expect(ficha, pantalla).toContainText('1 día')
    await expect(ficha.locator('.ficha__cifra'), pantalla).toHaveText('2')
    await expect(ficha.getByRole('progressbar', { name: 'Experiencia para el nivel 3' }), pantalla).toHaveAttribute('aria-valuenow', '10')
  }
  await expect(page.getByRole('heading', { name: 'Pulso y compás' })).toBeVisible()
  await expect(page.getByText('1 de 2 hechas')).toBeVisible()
  expect(errores).toEqual([])
})

test('el esquema de color elegido se recuerda al volver a abrir la app', async ({ page }) => {
  await page.goto('./#/ajustes')
  await page.getByRole('button', { name: 'Claro' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-esquema', 'claro')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-esquema', 'claro')
  await page.getByRole('button', { name: 'Oscuro' }).click()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-esquema', 'oscuro')
})

test('unos ajustes guardados por la versión anterior siguen valiendo', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('leitmotiv-ajustes') === null) {
      localStorage.setItem('leitmotiv-ajustes', JSON.stringify({ state: { direccion: 'vinilo', esquema: 'claro', nomenclatura: 'anglosajona', sonidosDeInterfaz: true }, version: 1 }))
    }
  })
  await page.goto('./#/ajustes')
  await expect(page.locator('html')).toHaveAttribute('data-esquema', 'claro')
  await expect(page.getByRole('button', { name: 'C D E' })).toHaveAttribute('aria-pressed', 'true')
  // Quien tenía la dirección «Vinilo» conserva su timbre de campana.
  await expect(page.getByRole('button', { name: 'Campana' })).toHaveAttribute('aria-pressed', 'true')
})
