import { expect, test } from '@playwright/test'
import { DIRECCIONES, PANTALLAS, elegirDireccion } from './ayudas.ts'

/**
 * Todo lo que se toca mide al menos 44 × 44 px. Quedan fuera los términos del
 * glosario, que son enlaces dentro de un texto (la norma los exceptúa), y la
 * rejilla del piano roll, que se amplía con su propio control.
 */
const MINIMO = 44

for (const direccion of DIRECCIONES) {
  test(`los controles miden al menos ${MINIMO} px en «${direccion}»`, async ({ page }) => {
    await elegirDireccion(page, direccion)
    for (const [ruta, lista] of PANTALLAS) {
      await page.goto(`./${ruta}`)
      await expect(page.locator(lista).first()).toBeVisible()
      const { total, pequenos } = await page.evaluate((minimo) => {
        const controles = [...document.querySelectorAll<HTMLElement>('button, a[href], input, [role="radio"]')].filter(
          (el) => !el.classList.contains('termino') && el.getClientRects().length > 0,
        )
        return {
          total: controles.length,
          pequenos: controles
            .map((el) => ({ el, caja: el.getBoundingClientRect() }))
            .filter(({ caja }) => caja.width < minimo - 0.5 || caja.height < minimo - 0.5)
            .map(({ el, caja }) => `${el.tagName.toLowerCase()}.${el.className} «${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 30)}» ${Math.round(caja.width)}×${Math.round(caja.height)}`),
        }
      }, MINIMO)
      // Si no hubiera ningún control, la pantalla no habría terminado de cargar y la comprobación no valdría nada.
      expect(total, `Controles encontrados en ${ruta}`).toBeGreaterThan(1)
      expect(pequenos, `Controles pequeños en ${ruta}`).toEqual([])
    }
  })
}
