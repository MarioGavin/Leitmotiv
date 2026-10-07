import { type Page, expect, test } from '@playwright/test'
import type { IndiceDelCurso } from '../src/contenido/tipos.ts'
import { sembrarProgreso, vigilarErrores } from './ayudas.ts'
import { ID_DE_PRUEBA, leccionDePrueba } from './leccion-de-prueba.ts'

// El service worker serviría el contenido real sin pasar por `page.route`.
test.use({ serviceWorkers: 'block' })

const LECCION = leccionDePrueba(`
- tipo: oido
  modo: preguntas
  enunciado: ¿Cuántos golpes suenan?
  pista: Cuéntalos.
  explicacion: Son dos.
  preguntas:
    - opciones: [Uno, Dos]
      correcta: 2
      pieza:
        tempo: 100
        compases: 1
        pistas:
          - rol: percusion
            instrumento: bateria
            rejilla:
              paso: "4"
              lineas:
                caja: "x.x."
`)

const AYER = new Date(Date.now() - 86_400_000).toISOString()

/**
 * Sustituye la lección de prueba por una de un solo ejercicio de oído y hace
 * que el concepto «pulso» se repase con él: así se sabe qué va a salir.
 */
async function servirCurso(pagina: Page): Promise<void> {
  await pagina.route(`**/lecciones/${ID_DE_PRUEBA}.json`, (ruta) => ruta.fulfill({ json: LECCION }))
  await pagina.route('**/content/indice.json', async (ruta) => {
    const respuesta = await ruta.fetch()
    const indice = (await respuesta.json()) as IndiceDelCurso
    for (const leccion of indice.mundos.flatMap((m) => m.unidades).flatMap((u) => u.lecciones)) if (leccion.id === ID_DE_PRUEBA) leccion.pasos = ['oido']
    await ruta.fulfill({ response: respuesta, json: indice })
  })
  await pagina.route('**/content/conceptos.json', (ruta) => ruta.fulfill({ json: [{ id: 'pulso', nombre: 'Pulso', definicion: [], pasos: [`${ID_DE_PRUEBA}#1`] }] }))
}

/** Cuándo le toca volver a la tarjeta de un concepto, leído de la base del navegador. */
function vencimiento(pagina: Page, concepto: string): Promise<string | undefined> {
  return pagina.evaluate(
    (id) =>
      new Promise<string | undefined>((resolver, rechazar) => {
        const apertura = indexedDB.open('leitmotiv')
        apertura.onerror = () => rechazar(apertura.error)
        apertura.onsuccess = () => {
          const peticion = apertura.result.transaction('tarjetas').objectStore('tarjetas').get(id)
          peticion.onsuccess = () => resolver((peticion.result as { fsrs: { due: string } } | undefined)?.fsrs.due)
        }
      }),
    concepto,
  )
}

test('sin lecciones hechas no hay nada que repasar', async ({ page }) => {
  await page.goto('./#/repaso')
  await expect(page.getByRole('heading', { name: 'Aún no hay nada que repasar' })).toBeVisible()
  await page.getByRole('button', { name: 'Ir al mapa' }).click()
  await expect(page).toHaveURL(/#\/mapa$/)
})

test('una sesión de repaso con lo que toca, a pantalla completa, y luego nada hasta el próximo', async ({ page }) => {
  const errores = vigilarErrores(page)
  await servirCurso(page)
  await sembrarProgreso(page, { lecciones: [ID_DE_PRUEBA], tarjetas: { pulso: AYER } })
  await page.goto('./#/repaso')

  await expect(page.getByText('Toca repasar un concepto')).toBeVisible()
  await expect(page.locator('.repaso__lista')).toContainText('Pulso')
  await page.getByRole('button', { name: 'Empezar' }).click()

  // Mientras se repasa no está la navegación: como en una lección.
  await expect(page.getByText('Repasas: Pulso')).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Secciones' })).toHaveCount(0)
  await page.getByRole('radio', { name: 'Dos' }).click()
  await page.getByRole('button', { name: 'Comprobar' }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()

  await expect(page.getByRole('heading', { name: 'Repaso hecho' })).toBeVisible()
  await expect(page.locator('.repaso__fila')).toContainText('A la primera')
  await expect(page.locator('.recompensa')).toContainText('+3')
  // Bien a la primera: la tarjeta pasa a varios días vista.
  await expect.poll(() => vencimiento(page, 'pulso')).not.toBe(AYER)
  const proxima = Date.parse((await vencimiento(page, 'pulso')) ?? '')
  expect(proxima).toBeGreaterThan(Date.now() + 86_400_000)

  await page.getByRole('button', { name: 'Terminar' }).click()
  await expect(page.getByRole('heading', { name: 'Hoy no toca repasar nada' })).toBeVisible()
  await expect(page.getByText('El próximo repaso, el')).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Secciones' })).toBeVisible()
  // Se puede adelantar.
  await page.getByRole('button', { name: 'Repasar igualmente' }).click()
  await expect(page.getByText('Repasas: Pulso')).toBeVisible()
  expect(errores).toEqual([])
})

test('un repaso con fallos lo dice y el concepto vuelve pronto', async ({ page }) => {
  await servirCurso(page)
  await sembrarProgreso(page, { lecciones: [ID_DE_PRUEBA], tarjetas: { pulso: AYER } })
  await page.goto('./#/repaso')
  await page.getByRole('button', { name: 'Empezar' }).click()
  await page.getByRole('radio', { name: 'Uno' }).click()
  await page.getByRole('button', { name: 'Comprobar' }).click()
  await page.getByRole('button', { name: 'Siguiente pregunta' }).click()
  await page.getByRole('radio', { name: 'Dos' }).click()
  await page.getByRole('button', { name: 'Comprobar' }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.locator('.repaso__fila')).toContainText('Con fallos')
  // Fallada, vuelve como mucho en un par de días.
  await expect.poll(() => vencimiento(page, 'pulso')).not.toBe(AYER)
  expect(Date.parse((await vencimiento(page, 'pulso')) ?? '')).toBeLessThan(Date.now() + 3 * 86_400_000)
})
