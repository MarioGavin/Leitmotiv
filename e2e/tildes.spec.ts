import { expect, test } from '@playwright/test'
import { ESQUEMAS, PANTALLAS, elegirEsquema } from './ayudas.ts'

/**
 * Ninguna caja que recorta su contenido se come las tildes de las mayúsculas.
 *
 * Un título en una sola línea con `overflow: hidden` y un interlineado apretado
 * pierde lo que sobresale por arriba: «EXPRÉS» se leía «EXPRES». Aquí se calcula,
 * para cada elemento con texto propio y recorte vertical, dónde cae la línea base
 * y hasta dónde sube una «É» en su fuente, y se comprueba que cabe.
 */
for (const esquema of ESQUEMAS) {
  test(`las cajas con recorte dejan sitio a las tildes en el esquema ${esquema}`, async ({ page }) => {
    await elegirEsquema(page, esquema)
    let medidas = 0
    for (const [ruta, lista] of PANTALLAS) {
      await page.goto(`./${ruta}`)
      await expect(page.locator(lista).first()).toBeVisible()
      await page.evaluate(() => document.fonts.ready)
      const { total, comidas } = await page.evaluate(() => {
        const lienzo = document.createElement('canvas').getContext('2d')
        if (!lienzo) throw new Error('No hay lienzo para medir el texto.')
        let cajas = 0
        const recortadas: string[] = []
        for (const el of document.querySelectorAll<HTMLElement>('body *')) {
          const estilo = getComputedStyle(el)
          if (estilo.overflowY === 'visible') continue
          // Fuera lo que no se ve y lo que solo existe para los lectores de pantalla.
          if (el.getClientRects().length === 0 || el.getBoundingClientRect().height < 4) continue
          const conTexto = [...el.childNodes].some((nodo) => nodo.nodeType === Node.TEXT_NODE && (nodo.textContent ?? '').trim() !== '')
          if (!conTexto) continue
          cajas++
          lienzo.font = `${estilo.fontStyle} ${estilo.fontWeight} ${estilo.fontSize} ${estilo.fontFamily}`
          const letra = lienzo.measureText('É')
          const altoDeFuente = letra.fontBoundingBoxAscent + letra.fontBoundingBoxDescent
          const interlinea = estilo.lineHeight === 'normal' ? altoDeFuente : Number.parseFloat(estilo.lineHeight)
          // El recorte llega hasta el borde del relleno; la primera línea reparte su interlineado por arriba y por abajo.
          const lineaBase = Number.parseFloat(estilo.paddingTop) + (interlinea - altoDeFuente) / 2 + letra.fontBoundingBoxAscent
          const sobra = lineaBase - letra.actualBoundingBoxAscent
          if (sobra < -0.5) recortadas.push(`${el.tagName.toLowerCase()}.${el.className} «${(el.textContent ?? '').trim().slice(0, 30)}»: a la tilde le faltan ${(-sobra).toFixed(1)} px`)
        }
        return { total: cajas, comidas: recortadas }
      })
      medidas += total
      expect(comidas, `Tildes recortadas en ${ruta}`).toEqual([])
    }
    // Las cabeceras con título recortan: si no se hubiera medido ninguna, la comprobación no valdría nada.
    expect(medidas).toBeGreaterThan(1)
  })
}
