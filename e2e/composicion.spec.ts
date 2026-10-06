import { type Page, expect, test } from '@playwright/test'
import { vigilarErrores } from './ayudas.ts'
import { ID_DE_PRUEBA, leccionDePrueba } from './leccion-de-prueba.ts'

// El service worker serviría la lección real sin pasar por `page.route`.
test.use({ serviceWorkers: 'block' })

const LECCION = leccionDePrueba(`
- tipo: pianoroll
  enunciado: Escribe un motivo de tres notas en la melodía.
  pista: Toca en la rejilla para poner notas.
  explicacion: Con tres notas ya hay un motivo.
  plantilla:
    tempo: 100
    tonalidad: C mayor
    compases: 2
    pistas:
      - rol: melodia
        instrumento: piano
        notas: ""
      - rol: bajo
        instrumento: bajo-electrico
        notas: "C2:1 | G1:1"
  editables: [melodia]
  requisitos:
    - {regla: notas-minimas, pista: melodia, valor: 3}

- tipo: encargo
  titulo: Fanfarria de victoria
  cliente: Estudio de prueba
  brief: Una fanfarria corta para cuando ganas un combate.
  pista: Bastan dos notas para empezar.
  explicacion: Una fanfarria anuncia; no necesita más.
  requisitos:
    - {regla: compases, valor: 2}
    - {regla: compas, valor: "4/4"}
    - {regla: notas-minimas, pista: melodia, valor: 2}
`)

/** Toca la rejilla en varios puntos de una misma altura: cada toque en un hueco pone una nota. */
async function ponerNotas(pagina: Page, fracciones: readonly number[]): Promise<void> {
  const caja = await pagina.locator('.rollo').boundingBox()
  if (!caja) throw new Error('No se ve la rejilla.')
  for (const f of fracciones) await pagina.mouse.click(caja.x + caja.width * f, caja.y + caja.height / 2)
}

/** Lee de la base de datos del navegador los títulos del repertorio y las claves de los borradores. */
function leerBase(pagina: Page): Promise<{ repertorio: string[]; borradores: string[] }> {
  return pagina.evaluate(
    () =>
      new Promise((resolver, rechazar) => {
        const apertura = indexedDB.open('leitmotiv')
        apertura.onerror = () => rechazar(apertura.error)
        apertura.onsuccess = () => {
          const transaccion = apertura.result.transaction(['repertorio', 'borradores'])
          const piezas = transaccion.objectStore('repertorio').getAll()
          const borradores = transaccion.objectStore('borradores').getAllKeys()
          transaccion.oncomplete = () => resolver({ repertorio: piezas.result.map((p: { titulo: string }) => p.titulo), borradores: borradores.result.map(String) })
        }
      }),
  )
}

test('el piano roll se corrige con requisitos y el encargo guarda borrador y va al repertorio', async ({ page }) => {
  test.setTimeout(60_000)
  const errores = vigilarErrores(page)
  await page.route(`**/lecciones/${ID_DE_PRUEBA}.json`, (ruta) => ruta.fulfill({ json: LECCION }))
  await page.goto(`./#/leccion/${ID_DE_PRUEBA}/1`)

  // Piano roll: el enunciado enseña los requisitos, y el editor los va cumpliendo.
  await expect(page.getByText('Escribe un motivo de tres notas en la melodía.')).toBeVisible()
  await expect(page.locator('.requisito')).toHaveCount(1)
  await page.getByRole('button', { name: 'Abrir el piano roll' }).click()
  const contador = page.getByRole('button', { name: /^Requisitos:/ })
  await expect(contador).toHaveAccessibleName('Requisitos: 0 de 1 cumplidos')
  // La pista del bajo no se puede editar: lleva candado.
  await expect(page.getByRole('button', { name: /Bajo/ }).getByRole('img', { name: 'No se puede editar' })).toBeVisible()
  await ponerNotas(page, [0.35, 0.55, 0.75])
  await expect(contador).toHaveAccessibleName('Requisitos: 1 de 1 cumplidos')
  await contador.click()
  const lista = page.getByRole('dialog')
  await expect(lista.getByRole('heading', { name: 'Todo cumplido' })).toBeVisible()
  await expect(lista).toContainText('Con tres notas ya hay un motivo.')
  await lista.getByRole('button', { name: 'Continuar' }).click()

  // Encargo: lo escrito se guarda como borrador y sobrevive a recargar la página.
  await expect(page.getByRole('heading', { name: 'Fanfarria de victoria' })).toBeVisible()
  await expect(page.getByText('Encargo · Estudio de prueba')).toBeVisible()
  await page.getByRole('button', { name: 'Pista' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Pista' })).toContainText('Bastan dos notas')
  await page.getByRole('button', { name: 'Abrir el piano roll' }).click()
  await ponerNotas(page, [0.4])
  await expect(page.getByRole('button', { name: /^Requisitos:/ })).toHaveAccessibleName('Requisitos: 2 de 3 cumplidos')
  await page.getByRole('button', { name: 'Volver al enunciado' }).click()
  await expect(page.getByRole('button', { name: 'Seguir componiendo' })).toBeVisible()
  expect((await leerBase(page)).borradores).toEqual([`${ID_DE_PRUEBA}#2`])
  await page.reload()
  await page.getByRole('button', { name: 'Seguir componiendo' }).click()
  await ponerNotas(page, [0.7])
  await page.getByRole('button', { name: 'Requisitos: 3 de 3 cumplidos' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Entregar y guardar en Mi repertorio' }).click()

  // Final: la experiencia de una lección con encargo, la pieza en el repertorio y el borrador borrado.
  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible()
  await expect(page.locator('.recompensa')).toContainText('+40')
  expect(await leerBase(page)).toEqual({ repertorio: ['Fanfarria de victoria'], borradores: [] })
  expect(errores).toEqual([])
})
