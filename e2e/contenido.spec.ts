import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import type { IndiceDelCurso } from '../src/contenido/tipos.ts'
import { sembrarProgreso, vigilarErrores } from './ayudas.ts'

/**
 * Recorrido por todo el contenido real: cada paso de cada lección se abre y se
 * pinta sin errores. No hace los ejercicios (de eso se encargan las pruebas de
 * cada tipo de paso); vigila que ningún paso escrito en `content/` rompa la
 * pantalla. Lee el índice compilado de `dist/`, el mismo que sirve la app.
 *
 * Va con la pantalla más pequeña que se admite (360 × 640): ningún paso puede
 * salirse por los lados ni dejar el pie, con sus botones, fuera de la vista.
 */
// Sin la entrada de pantalla (que la trae 6 px más abajo durante 160 ms): aquí se mide dónde queda cada cosa, no cómo llega.
test.use({ viewport: { width: 360, height: 640 }, contextOptions: { reducedMotion: 'reduce' } })
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
          const medidas = await page.evaluate(() => {
            const pie = document.querySelector('.pie')?.getBoundingClientRect()
            // En un móvil, si algo se sale, el navegador ensancha la página (y `innerWidth` con ella): lo que se ve es `visualViewport`.
            const vista = window.visualViewport
            return { ancho: document.documentElement.scrollWidth, pantalla: vista?.width ?? 360, pieAbajo: pie?.bottom ?? 0, alto: vista?.height ?? 640 }
          })
          expect(medidas.ancho, `${donde}: se sale por los lados`).toBeLessThanOrEqual(medidas.pantalla)
          expect(medidas.pieAbajo, `${donde}: el pie no se ve entero`).toBeLessThanOrEqual(medidas.alto)
        }
      }
      expect(errores).toEqual([])
    })
  }
}
