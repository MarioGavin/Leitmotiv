import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import type { IndiceDelCurso } from '../src/contenido/tipos.ts'
import { sembrarProgreso, vigilarErrores } from './ayudas.ts'

/**
 * Recorrido por todo el contenido real: cada paso de cada lección se abre y se
 * pinta sin errores. No hace los ejercicios (de eso se encargan las pruebas de
 * cada tipo de paso); vigila que ningún paso escrito en `content/` rompa la
 * pantalla. Lee el índice compilado de `dist/`, el mismo que sirve la app.
 */
const indice = JSON.parse(readFileSync(new URL('../dist/content/indice.json', import.meta.url), 'utf8')) as IndiceDelCurso
const todas = indice.mundos.flatMap((m) => m.unidades.flatMap((u) => u.lecciones.map((l) => l.id)))

for (const mundo of indice.mundos) {
  for (const unidad of mundo.unidades.filter((u) => u.lecciones.length > 0)) {
    test(`cada paso de la unidad ${unidad.id} («${unidad.titulo}») se abre sin errores`, async ({ page }) => {
      test.setTimeout(120_000)
      // Con todo el curso hecho, cualquier lección se abre por su dirección.
      await sembrarProgreso(page, { lecciones: todas })
      const errores = vigilarErrores(page)
      await page.goto('./#/mapa')
      for (const leccion of unidad.lecciones) {
        for (let numero = 1; numero <= leccion.pasos.length; numero++) {
          await page.goto(`./#/leccion/${leccion.id}/${numero}`)
          const donde = `${leccion.id}, paso ${numero} (${leccion.pasos[numero - 1]})`
          await expect(page.getByRole('progressbar', { name: 'Avance de la lección' }), donde).toHaveAttribute('aria-valuenow', String(numero))
          await expect(page.locator('.pie .boton').first(), donde).toBeVisible()
        }
      }
      expect(errores).toEqual([])
    })
  }
}
