import { readFileSync } from 'node:fs'
import { type Page, expect, test } from '@playwright/test'
import type { IndiceDelCurso } from '../src/contenido/tipos.ts'
import { PIEZA_GUARDADA, sembrarProgreso, vigilarErrores } from './ayudas.ts'

const indice = JSON.parse(readFileSync(new URL('../dist/content/indice.json', import.meta.url), 'utf8')) as IndiceDelCurso
const DEL_MUNDO_0 = indice.mundos.filter((m) => m.id === 'm00').flatMap((m) => m.unidades.flatMap((u) => u.lecciones.map((l) => l.id)))

/** Visita la app con conexión hasta que el service worker la controla: a partir de ahí, todo sale de lo guardado. */
async function instalar(pagina: Page): Promise<void> {
  await pagina.goto('./')
  // El service worker se instala en la primera visita y toma el control en la siguiente.
  await pagina.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await pagina.reload()
  await expect.poll(() => pagina.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true)
}

/** Da por hechas unas lecciones escribiendo en IndexedDB con la app abierta; la app lo lee al recargar. */
function marcarHechas(pagina: Page, ids: readonly string[]): Promise<void> {
  return pagina.evaluate(
    (lecciones) =>
      new Promise<void>((resolver, rechazar) => {
        const apertura = indexedDB.open('leitmotiv')
        apertura.onerror = () => rechazar(apertura.error)
        apertura.onsuccess = () => {
          const transaccion = apertura.result.transaction('lecciones', 'readwrite')
          const momento = new Date().toISOString()
          for (const id of lecciones) transaccion.objectStore('lecciones').put({ id, completada: momento, ultima: momento, veces: 1, mejor: 1 })
          transaccion.oncomplete = () => {
            apertura.result.close()
            resolver()
          }
          transaccion.onerror = () => rechazar(transaccion.error)
        }
      }),
    [...ids],
  )
}

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
  await instalar(page)

  await context.setOffline(true)
  await page.reload()
  await page.getByRole('button', { name: 'Empezar' }).click()
  await expect(page.getByRole('button', { name: /Mundo 0: Repaso exprés/ })).toBeVisible()

  // El contenido de las lecciones también está guardado.
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByRole('link', { name: /El pulso/ }).click()
  await expect(page.getByRole('heading', { name: 'El latido de la música' })).toBeVisible()
})

test('sin conexión se abren todas las pantallas y suena un instrumento ya usado', async ({ page, context }) => {
  test.setTimeout(90_000)
  // Todo el Mundo 0 hecho salvo el último encargo: así queda una unidad para la prueba de nivel. Un concepto que toca
  // repasar desde ayer y una pieza en el repertorio.
  await sembrarProgreso(page, {
    lecciones: DEL_MUNDO_0.filter((id) => id !== 'm00.u03.l08'),
    tarjetas: { pulso: new Date(Date.now() - 86_400_000).toISOString() },
    repertorio: [PIEZA_GUARDADA],
  })
  const errores = vigilarErrores(page)
  await instalar(page)

  // Con conexión: el piano se descarga al probarlo.
  await page.goto('./#/diagnostico')
  const fila = page.getByRole('listitem').filter({ hasText: 'Piano' })
  await fila.getByRole('button', { name: 'Probar Piano' }).click()
  await expect(fila).toContainText('Guardado en el dispositivo')

  // Modo avión y desde cero: la carcasa, las pantallas (cada una en su trozo) y el contenido salen de lo guardado.
  await context.setOffline(true)
  await page.reload()
  const pantallas: ReadonlyArray<readonly [ruta: string, lista: string, texto: string | RegExp]> = [
    ['#/glosario', '.glosario__fila', 'Bucle'],
    ['#/ficha/intervalos', '.ficha-de-consulta__resumen', /./],
    ['#/repaso', '.repaso__lista', 'Pulso'],
    ['#/repertorio', '.repertorio__pieza', 'Tema de la pradera'],
    ['#/prueba', '.pie .boton', 'Empezar'],
    ['#/calibracion', '.pad', /./],
    // Una lección de cada unidad del Mundo 0.
    ['#/leccion/m00.u01.l03/1', '.pie .boton', 'Continuar'],
    ['#/leccion/m00.u02.l04/1', '.pie .boton', 'Continuar'],
    ['#/leccion/m00.u03.l05/1', '.pie .boton', 'Continuar'],
  ]
  for (const [ruta, lista, texto] of pantallas) {
    await page.goto(`./${ruta}`)
    await expect(page.locator(lista).filter({ hasText: texto }).first(), ruta).toBeVisible()
  }

  // La unidad del Mundo 1: con el Mundo 0 terminado (escrito en la base sin conexión), su primera lección se abre.
  await marcarHechas(page, ['m00.u03.l08'])
  await page.goto('./#/leccion/m01.u01.l01/1')
  await page.reload()
  await expect(page.getByRole('progressbar', { name: 'Avance de la lección' })).toHaveAttribute('aria-valuenow', '1')
  await expect(page.locator('.pie .boton').first()).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Lección bloqueada' })).toHaveCount(0)

  // El piano, ya usado, suena sin conexión.
  await page.goto('./#/diagnostico')
  await expect(fila).toContainText('Guardado en el dispositivo')
  await fila.getByRole('button', { name: 'Probar Piano' }).click()
  await expect(page.getByText('En marcha')).toBeVisible()
  // El medidor de salida deja de marcar «Silencio»: ha llegado sonido a la salida.
  const nivel = page.locator('dt', { hasText: 'Nivel de salida' }).locator('+ dd')
  await expect.poll(() => nivel.textContent(), { intervals: [100], timeout: 10_000 }).toMatch(/^-?\d+[.,]\d dB$/)
  await expect(fila).not.toContainText('No se ha podido cargar')
  // Al probar el piano, la app empieza a guardar el resto del banco de sonidos en segundo plano; si el modo avión la
  // pilla a medias, el navegador anota la muestra que no ha llegado. Es lo esperado: la app no falla y lo reintenta
  // en la próxima visita con conexión.
  expect(errores.filter((e) => !e.includes('net::ERR_INTERNET_DISCONNECTED'))).toEqual([])
})
