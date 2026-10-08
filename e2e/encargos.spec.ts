import { readFileSync } from 'node:fs'
import { type Page, expect, test } from '@playwright/test'
import type { IndiceDelCurso } from '../src/contenido/tipos.ts'
import { escribirEnElRollo, filaDeNota, filaDePercusion, sembrarProgreso, vigilarErrores } from './ayudas.ts'

/**
 * Los encargos reales de las tres unidades del Mundo 0: se escriben en el
 * piano roll (con el teclado, casilla a casilla) hasta cumplir todos los
 * requisitos, se entregan y la pieza aparece en «Mi repertorio» con el título
 * del encargo. Lee el índice compilado de `dist/` para saber qué lecciones van antes.
 */
const indice = JSON.parse(readFileSync(new URL('../dist/content/indice.json', import.meta.url), 'utf8')) as IndiceDelCurso
const DEL_MUNDO_0 = indice.mundos.filter((m) => m.id === 'm00').flatMap((m) => m.unidades.flatMap((u) => u.lecciones.map((l) => l.id)))

/** Las lecciones del Mundo 0 anteriores a una: con ellas hechas, esa es la siguiente. */
function anterioresA(id: string): string[] {
  return DEL_MUNDO_0.slice(0, DEL_MUNDO_0.indexOf(id))
}

/** Los títulos de las piezas de «Mi repertorio», leídos de IndexedDB. */
function titulosDelRepertorio(pagina: Page): Promise<string[]> {
  return pagina.evaluate(
    () =>
      new Promise<string[]>((resolver, rechazar) => {
        const apertura = indexedDB.open('leitmotiv')
        apertura.onerror = () => rechazar(apertura.error)
        apertura.onsuccess = () => {
          const peticion = apertura.result.transaction('repertorio').objectStore('repertorio').getAll()
          peticion.onsuccess = () => {
            apertura.result.close()
            resolver(peticion.result.map((p: { titulo: string }) => p.titulo))
          }
          peticion.onerror = () => rechazar(peticion.error)
        }
      }),
  )
}

/** Abre el encargo (último paso de su lección), lo escribe con `escribir`, lo entrega y busca la pieza en el repertorio. */
async function hacerEncargo(pagina: Page, leccion: string, paso: number, titulo: string, requisitos: number, escribir: () => Promise<void>): Promise<void> {
  const errores = vigilarErrores(pagina)
  await sembrarProgreso(pagina, { lecciones: anterioresA(leccion) })
  await pagina.goto(`./#/leccion/${leccion}/${paso}`)
  await expect(pagina.getByRole('heading', { name: titulo, level: 2 })).toBeVisible()
  await expect(pagina.locator('.requisito')).toHaveCount(requisitos)
  await pagina.getByRole('button', { name: 'Abrir el piano roll' }).click()
  await escribir()

  const contador = pagina.getByRole('button', { name: /^Requisitos:/ })
  await expect(contador).toHaveAccessibleName(`Requisitos: ${requisitos} de ${requisitos} cumplidos`)
  await contador.click()
  const lista = pagina.getByRole('dialog')
  await expect(lista.getByRole('heading', { name: 'Todo cumplido' })).toBeVisible()
  await expect(lista.locator('.requisito--cumplido')).toHaveCount(requisitos)
  await lista.getByRole('button', { name: 'Entregar y guardar en Mi repertorio' }).click()
  await expect(pagina.getByRole('heading', { name: 'Lección completada' })).toBeVisible()

  // La pieza está en la base del dispositivo y en la pantalla del repertorio, con el título del encargo.
  expect(await titulosDelRepertorio(pagina)).toEqual([titulo])
  await pagina.goto('./#/repertorio')
  await expect(pagina.locator('.repertorio__pieza')).toHaveCount(1)
  await expect(pagina.locator('.repertorio__pieza')).toContainText(titulo)
  expect(errores).toEqual([])
}

test('el encargo «El bucle de la feria» (m00.u01.l08) se cumple, se entrega y va al repertorio', async ({ page }) => {
  test.setTimeout(120_000)
  await hacerEncargo(page, 'm00.u01.l08', 4, 'El bucle de la feria', 8, async () => {
    // Melodía en corcheas sueltas, cuatro por compás, en Do mayor; acaba en Re5, cerca del Do5 del principio.
    const melodia = ['C5', 'E5', 'G5', 'E5', 'F5', 'A5', 'F5', 'C5', 'D5', 'G5', 'B4', 'D5', 'E5', 'D5', 'C5', 'D5']
    await escribirEnElRollo(page, 'Melodía', melodia.map((nota, i) => ({ casilla: i * 2, fila: filaDeNota(nota, 'piano') })))
    // Batería: bombo en el uno y el tres, caja en el dos y el cuatro.
    const golpes = Array.from({ length: 16 }, (_, i) => ({ casilla: i * 2, fila: filaDePercusion(i % 2 === 0 ? 'bombo' : 'caja') }))
    await escribirEnElRollo(page, 'Percusión', golpes)
  })
})

test('el encargo «La llamada del héroe» (m00.u02.l08) se cumple, se entrega y va al repertorio', async ({ page }) => {
  test.setTimeout(120_000)
  await hacerEncargo(page, 'm00.u02.l08', 4, 'La llamada del héroe', 7, async () => {
    // Empieza en la tónica, salta una quinta, sube por pasos hasta Do6 y vuelve a Do5.
    const llamada: Array<[number, string]> = [[0, 'C5'], [2, 'G5'], [4, 'A5'], [6, 'B5'], [8, 'C6'], [12, 'G5'], [16, 'E5'], [20, 'D5'], [24, 'C5']]
    await escribirEnElRollo(page, 'Melodía', llamada.map(([casilla, nota]) => ({ casilla, fila: filaDeNota(nota, 'chip-pulso') })))
  })
})

test('el encargo «El bucle de la aldea» (m00.u03.l08) se cumple, se entrega y va al repertorio', async ({ page }) => {
  test.setTimeout(120_000)
  await hacerEncargo(page, 'm00.u03.l08', 4, 'El bucle de la aldea', 7, async () => {
    // Notas del acorde en los pulsos fuertes (C, Am, F, G) y final en Re5, del acorde de G.
    const melodia = ['E5', 'D5', 'C5', 'G4', 'C5', 'A4', 'E5', 'C5', 'A4', 'C5', 'F5', 'C5', 'B4', 'D5', 'G5', 'D5']
    await escribirEnElRollo(page, 'Melodía', melodia.map((nota, i) => ({ casilla: i * 2, fila: filaDeNota(nota, 'piano') })))
  })
})
