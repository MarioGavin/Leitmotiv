import { type Page, expect, test } from '@playwright/test'
import { abrirDiagnostico, entrar } from './ayudas.ts'

/** Hace creer a la página que ha pasado a segundo plano o que ha vuelto, como al cambiar de app en el móvil. */
async function cambiarVisibilidad(pagina: Page, estado: 'hidden' | 'visible'): Promise<void> {
  await pagina.evaluate((valor) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => valor })
    document.dispatchEvent(new Event('visibilitychange'))
  }, estado)
}

test('el audio no arranca hasta que hay un gesto', async ({ page }) => {
  await page.goto('./#/diagnostico')
  await expect(page.getByText(/Apagado/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Activar el sonido' })).toBeVisible()
  // Cualquier toque vale como gesto: el botón desaparece en cuanto el audio arranca.
  await page.getByRole('heading', { name: 'Diagnóstico' }).tap()
  await expect(page.getByText('En marcha')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Activar el sonido' })).toBeHidden()
})

test('el audio se suspende en segundo plano y se reanuda al volver', async ({ page }) => {
  await entrar(page)
  await abrirDiagnostico(page)
  await expect(page.getByText('En marcha')).toBeVisible()
  await cambiarVisibilidad(page, 'hidden')
  await expect(page.getByText(/Suspendido/)).toBeVisible()
  await cambiarVisibilidad(page, 'visible')
  await expect(page.getByText('En marcha')).toBeVisible()
})

test('probar un instrumento lo descarga y queda guardado para usarlo sin conexión', async ({ page }) => {
  await page.goto('./#/diagnostico')
  const fila = page.getByRole('listitem').filter({ hasText: 'Bajo eléctrico' })
  await fila.getByRole('button', { name: 'Probar Bajo eléctrico' }).click()
  await expect(fila).toContainText('Guardado en el dispositivo')
  const guardados = await page.evaluate(async () => {
    const cache = await caches.open('leitmotiv-muestras-v1')
    return (await cache.keys()).filter((peticion) => peticion.url.includes('/samples/bajo-electrico/')).length
  })
  // El archivo del instrumento y sus trece muestras.
  expect(guardados).toBe(14)
})
