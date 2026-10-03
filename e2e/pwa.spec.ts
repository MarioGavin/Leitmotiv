import { expect, test } from '@playwright/test'

test('el manifiesto declara una app instalable', async ({ page, request }) => {
  await page.goto('./')
  const enlace = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(enlace).toBeTruthy()
  const url = new URL(enlace ?? '', page.url())
  const manifiesto = (await (await request.get(url.toString())).json()) as {
    name: string
    display: string
    start_url: string
    icons: Array<{ src: string; sizes: string; purpose: string }>
  }
  expect(manifiesto.name).toBe('Leitmotiv')
  expect(manifiesto.display).toBe('standalone')
  expect(manifiesto.icons.map((i) => `${i.sizes} ${i.purpose}`).sort()).toEqual(['192x192 any', '512x512 any', '512x512 maskable'])
  for (const icono of manifiesto.icons) {
    const respuesta = await request.get(new URL(icono.src, url).toString())
    expect(respuesta.status()).toBe(200)
    expect(respuesta.headers()['content-type']).toContain('image/png')
  }
})

test('funciona sin conexión tras la primera carga', async ({ page, context }) => {
  await page.goto('./')
  // El service worker se instala en la primera visita y toma el control en la siguiente.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload()
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true)

  await context.setOffline(true)
  await page.reload()
  await page.getByRole('button', { name: 'Empezar' }).click()
  await expect(page.getByRole('button', { name: /Mundo 0: Repaso exprés/ })).toBeVisible()

  // El contenido de las lecciones también está guardado.
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByRole('link', { name: /El pulso/ }).click()
  await expect(page.getByRole('heading', { name: 'El latido de la música' })).toBeVisible()
})

test('un instrumento ya usado suena sin conexión', async ({ page, context }) => {
  await page.goto('./')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload()
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true)

  // Con conexión: el instrumento se descarga al probarlo.
  await page.goto('./#/diagnostico')
  const fila = page.getByRole('listitem').filter({ hasText: 'Bajo eléctrico' })
  await fila.getByRole('button', { name: 'Probar Bajo eléctrico' }).click()
  await expect(fila).toContainText('Guardado en el dispositivo')

  // Sin conexión y desde cero: la app, el motor de audio y las muestras salen de lo guardado.
  await context.setOffline(true)
  await page.reload()
  await expect(fila).toContainText('Guardado en el dispositivo')
  await fila.getByRole('button', { name: 'Probar Bajo eléctrico' }).click()
  await expect(page.getByText('En marcha')).toBeVisible()
  // El medidor de salida deja de marcar «Silencio»: ha llegado sonido a la salida.
  const nivel = page.locator('dt', { hasText: 'Nivel de salida' }).locator('+ dd')
  await expect.poll(() => nivel.textContent(), { intervals: [100], timeout: 10_000 }).toMatch(/^-?\d+[.,]\d dB$/)
  await expect(fila).not.toContainText('No se ha podido cargar')
})
