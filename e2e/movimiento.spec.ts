import { type Page, expect, test } from '@playwright/test'
import { vigilarErrores } from './ayudas.ts'

/**
 * Cambia de pantalla con la navegación y mide, fotograma a fotograma, la
 * opacidad y la transformación del envoltorio de la pantalla nueva hasta que
 * lleva un rato quieta (o, como mucho, un segundo y medio). No se mide un
 * tiempo fijo desde el clic: la pantalla nueva se descarga aparte y, con la
 * máquina ocupada, la entrada puede empezar tarde y estar aún acabando. Motion
 * se descarga cuando la app está ociosa, así que antes se espera a que haya llegado.
 */
async function entrarEn(pagina: Page, seccion: string): Promise<{ opacidades: number[]; transformaciones: string[]; envoltorios: number }> {
  await pagina.waitForFunction(() => performance.getEntriesByType('resource').some((r) => /\/Entrada-[\w-]+\.js$/.test(r.name)))
  // Un momento más, para que el módulo termine de evaluarse.
  await pagina.waitForTimeout(200)
  return pagina.evaluate(async (nombre) => {
    const opacidades: number[] = []
    const transformaciones: string[] = []
    const enlace = [...document.querySelectorAll<HTMLAnchorElement>('.navegacion__enlace')].find((a) => a.textContent?.includes(nombre))
    enlace?.click()
    const inicio = performance.now()
    let quietaDesde: number | undefined
    let seHaMovido = false
    while (performance.now() - inicio < 1500) {
      await new Promise(requestAnimationFrame)
      const envoltorio = document.querySelector<HTMLElement>('.entrada')
      if (!envoltorio) continue
      const estilo = getComputedStyle(envoltorio)
      opacidades.push(Number(estilo.opacity))
      transformaciones.push(estilo.transform)
      const quieta = estilo.opacity === '1' && (estilo.transform === 'none' || estilo.transform.endsWith(', 0)'))
      if (!quieta) {
        seHaMovido = true
        quietaDesde = undefined
      } else quietaDesde ??= performance.now()
      // Tras moverse, 100 ms quieta bastan; si no se ha movido (reducir movimiento), se mira medio segundo.
      if (quietaDesde !== undefined && performance.now() - quietaDesde > (seHaMovido ? 100 : 500)) break
    }
    return { opacidades, transformaciones, envoltorios: document.querySelectorAll('.entrada').length }
  }, seccion)
}

test('cada pantalla entra con un solo movimiento corto, que acaba quieto', async ({ page }) => {
  const errores = vigilarErrores(page)
  await page.goto('./#/ajustes')
  const { opacidades, transformaciones, envoltorios } = await entrarEn(page, 'Glosario')
  await expect(page.getByRole('heading', { name: 'Glosario' })).toBeVisible()
  expect(envoltorios).toBe(1)
  // Empieza transparente y algo más abajo, y en 160 ms queda opaca y en su sitio.
  expect(Math.min(...opacidades)).toBeLessThan(1)
  expect(opacidades.at(-1)).toBe(1)
  expect(transformaciones.some((t) => t !== 'none' && !t.endsWith(', 0)'))).toBe(true)
  expect(transformaciones.at(-1)).toMatch(/^none$|, 0\)$/)
  expect(errores).toEqual([])
})

test('con «reducir movimiento», las pantallas aparecen sin moverse', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./#/ajustes')
  const { opacidades, transformaciones } = await entrarEn(page, 'Repertorio')
  await expect(page.getByRole('heading', { name: 'Mi repertorio' })).toBeVisible()
  expect(opacidades.length).toBeGreaterThan(0)
  expect(opacidades.every((o) => o === 1)).toBe(true)
  expect(transformaciones.every((t) => t === 'none' || t.endsWith(', 0)'))).toBe(true)
})
