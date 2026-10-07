import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { clavesDe, hoy, sembrarProgreso, vigilarErrores } from './ayudas.ts'

test('la copia de seguridad se exporta, se borra todo y se restaura', async ({ page }) => {
  const errores = vigilarErrores(page)
  await sembrarProgreso(page, { lecciones: ['m00.u01.l01'], diario: { [hoy()]: 20 } })
  await page.goto('./#/ajustes')
  const esquemaGuardado = (): Promise<string | undefined> => page.evaluate(() => (JSON.parse(localStorage.getItem('leitmotiv-ajustes') ?? '{}') as { state?: { esquema?: string } }).state?.esquema)

  await page.getByRole('group', { name: 'Esquema de color' }).getByRole('button', { name: 'Claro' }).click()
  await expect(page.locator('.ajustes__latencia')).toHaveText('0 ms')

  // Exportar: un archivo JSON con el progreso y los ajustes.
  const [descarga] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar copia' }).click()])
  expect(descarga.suggestedFilename()).toMatch(/^leitmotiv-copia-\d{4}-\d{2}-\d{2}\.json$/)
  const ruta = await descarga.path()
  const copia = JSON.parse(await readFile(ruta, 'utf8')) as { app: string; ajustes: { esquema: string }; progreso: { lecciones: Array<{ id: string }> } }
  expect(copia.app).toBe('leitmotiv')
  expect(copia.ajustes.esquema).toBe('claro')
  expect(copia.progreso.lecciones.map((l) => l.id)).toEqual(['m00.u01.l01'])
  await expect(page.getByRole('status').filter({ hasText: 'Copia descargada' })).toContainText('1 lección hecha y 0 piezas')

  // Borrar todo pide confirmación; cancelar no borra nada.
  await page.getByRole('button', { name: 'Borrar todos los datos' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click()
  expect(await clavesDe(page, 'lecciones')).toEqual(['m00.u01.l01'])
  await page.getByRole('button', { name: 'Borrar todos los datos' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Borrar todo' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Datos borrados' })).toBeVisible()
  await expect.poll(() => clavesDe(page, 'lecciones')).toEqual([])
  expect(await clavesDe(page, 'diario')).toEqual([])
  expect(await esquemaGuardado()).toBe('sistema')

  // Un archivo que no es una copia se rechaza y lo dice.
  await page.locator('input[type="file"]').setInputFiles({ name: 'notas.json', mimeType: 'application/json', buffer: Buffer.from('{"hola": 1}') })
  await expect(page.getByRole('alert')).toHaveText('Ese archivo no es una copia de seguridad de Leitmotiv.')

  // Importar la copia buena: confirma, restaura el progreso y los ajustes.
  await page.locator('input[type="file"]').setInputFiles(ruta)
  const confirmacion = page.getByRole('dialog')
  await expect(confirmacion).toContainText('1 lección hecha y 0 piezas en Mi repertorio')
  await confirmacion.getByRole('button', { name: 'Restaurar' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Copia restaurada' })).toBeVisible()
  await expect.poll(() => clavesDe(page, 'lecciones')).toEqual(['m00.u01.l01'])
  expect(await esquemaGuardado()).toBe('claro')

  // Lo restaurado se ve en el resto de la app, también después de recargar.
  await page.reload()
  await page.goto('./#/mundo/m00')
  await expect(page.getByRole('link', { name: /El pulso/ })).toContainText('Hecha')
  expect(errores).toEqual([])
})

test('el retardo calibrado se ve en los ajustes y lleva a calibrar', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('leitmotiv-ajustes', JSON.stringify({ state: { esquema: 'oscuro', nomenclatura: 'latina', sonidosDeInterfaz: true, timbre: 'chip', latenciaMs: 85 }, version: 3 }))
  })
  await page.goto('./#/ajustes')
  await expect(page.locator('.ajustes__latencia')).toHaveText('+85 ms')
  await page.getByRole('button', { name: 'Calibrar' }).click()
  await expect(page.getByRole('heading', { name: 'Calibración' })).toBeVisible()
  await expect(page.locator('.calibracion__datos')).toContainText('+85 ms')
  // Desde los ajustes, salir de la calibración vuelve a ellos.
  await page.getByRole('button', { name: 'Salir de la calibración' }).click()
  await expect(page.getByRole('heading', { name: 'Ajustes' })).toBeVisible()
})
