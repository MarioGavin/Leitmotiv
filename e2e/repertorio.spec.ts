import { type Page, expect, test } from '@playwright/test'
import { PIEZA_GUARDADA, clavesDe, sembrarProgreso, vigilarErrores } from './ayudas.ts'

/** Toca un hueco de la rejilla, abajo del todo, donde la pieza no tiene notas: pone una. */
async function ponerNota(pagina: Page, x = 0.5): Promise<void> {
  const caja = await pagina.locator('.rollo').boundingBox()
  if (!caja) throw new Error('No se ve la rejilla.')
  await pagina.mouse.click(caja.x + caja.width * x, caja.y + caja.height - 30)
}

// Sin service worker: aquí no hace falta, y su precarga de cada contexto nuevo satura el servidor de pruebas en Windows.
test.use({ serviceWorkers: 'block' })

const rejilla = (pagina: Page) => pagina.getByRole('application', { name: /^Rejilla de/ })

test('una pieza del repertorio se escucha, se exporta, se edita y se borra', async ({ page }) => {
  const errores = vigilarErrores(page)
  await sembrarProgreso(page, { repertorio: [PIEZA_GUARDADA] })
  await page.goto('./#/repertorio')

  await page.getByRole('button', { name: /Tema de la pradera/ }).click()
  const ventana = page.getByRole('dialog')
  await expect(ventana.getByRole('heading', { name: 'Tema de la pradera' })).toBeVisible()
  await expect(ventana).toContainText('4 compases · 104 BPM')

  // Escuchar y parar.
  await ventana.getByRole('button', { name: 'Escuchar' }).click()
  await expect(ventana.getByRole('button', { name: 'Parar' })).toBeVisible()
  await ventana.getByRole('button', { name: 'Parar' }).click()

  // Exportar a MIDI: un archivo con el nombre de la pieza y la cabecera de un MIDI.
  const [descarga] = await Promise.all([page.waitForEvent('download'), ventana.getByRole('button', { name: 'Exportar MIDI' }).click()])
  expect(descarga.suggestedFilename()).toBe('tema-de-la-pradera.mid')
  const flujo = await descarga.createReadStream()
  const trozos: Buffer[] = []
  for await (const trozo of flujo) trozos.push(trozo as Buffer)
  expect(Buffer.concat(trozos).subarray(0, 4).toString('latin1')).toBe('MThd')

  // Abrir en el piano roll, editar y volver: lo editado se queda.
  await ventana.getByRole('button', { name: 'Abrir en el piano roll' }).click()
  await expect(rejilla(page)).toHaveAccessibleName(/Piano de cola: 15 notas/)
  await ponerNota(page)
  await expect(rejilla(page)).toHaveAccessibleName(/: 16 notas/)
  await page.getByRole('button', { name: 'Volver al repertorio' }).click()
  await page.reload()
  await page.getByRole('button', { name: /Tema de la pradera/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Abrir en el piano roll' }).click()
  await expect(rejilla(page)).toHaveAccessibleName(/Piano de cola: 16 notas/)
  await page.getByRole('button', { name: 'Volver al repertorio' }).click()

  // Borrar pide confirmación.
  await page.getByRole('button', { name: /Tema de la pradera/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Borrar' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'No, dejarla' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Borrar' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Sí, borrar' }).click()
  await expect(page.getByRole('heading', { name: 'Aún no tienes piezas' })).toBeVisible()
  await expect.poll(() => clavesDe(page, 'repertorio')).toEqual([])
  expect(errores).toEqual([])
})

test('una pieza nueva entra en el repertorio con el primer cambio y no se pierde al salir', async ({ page }) => {
  const errores = vigilarErrores(page)
  await page.goto('./#/repertorio')
  await expect(page.getByRole('heading', { name: 'Aún no tienes piezas' })).toBeVisible()
  await page.getByRole('button', { name: 'Pieza nueva' }).click()
  await expect(rejilla(page)).toHaveAccessibleName(/Piano de cola: 0 notas/)
  // Sin cambios, no se guarda nada.
  expect(await clavesDe(page, 'repertorio')).toEqual([])

  await ponerNota(page)
  await expect(rejilla(page)).toHaveAccessibleName(/: 1 nota\./)
  // Con el primer guardado, la dirección pasa a llevar el identificador de la pieza.
  await expect(page).toHaveURL(/#\/pianoroll\/[\w-]+$/)
  await expect(rejilla(page)).toHaveAccessibleName(/: 1 nota\./)

  // El título se cambia en las opciones; se sale enseguida, antes de que salte el guardado diferido.
  await page.getByRole('button', { name: 'Opciones de la pieza' }).click()
  await page.getByRole('textbox', { name: 'Título' }).fill('Mi primer tema')
  await page.getByRole('dialog').getByRole('button', { name: 'Cerrar' }).click()
  await ponerNota(page, 0.8)
  await page.getByRole('button', { name: 'Volver al repertorio' }).click()

  await expect(page.getByRole('button', { name: /Mi primer tema/ })).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: /Mi primer tema/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Abrir en el piano roll' }).click()
  await expect(rejilla(page)).toHaveAccessibleName(/Piano de cola: 2 notas/)
  expect(await clavesDe(page, 'repertorio')).toHaveLength(1)
  expect(errores).toEqual([])
})
