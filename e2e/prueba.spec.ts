import { type Page, expect, test } from '@playwright/test'
import { sembrarProgreso, vigilarErrores } from './ayudas.ts'
import { PRUEBA_DE_PRUEBA as PRUEBA } from './leccion-de-prueba.ts'

// El service worker serviría el contenido real sin pasar por `page.route`.
test.use({ serviceWorkers: 'block' })

/** Contesta la pregunta que haya en pantalla y sigue. */
async function contestar(pagina: Page, opcion: 'Uno' | 'Dos'): Promise<void> {
  await pagina.getByRole('radio', { name: opcion }).click()
  await pagina.getByRole('button', { name: 'Comprobar' }).click()
  await pagina.getByRole('button', { name: /Continuar|Siguiente pregunta/ }).click()
}

function superadasGuardadas(pagina: Page): Promise<unknown> {
  return pagina.evaluate(
    () =>
      new Promise((resolver, rechazar) => {
        const apertura = indexedDB.open('leitmotiv')
        apertura.onerror = () => rechazar(apertura.error)
        apertura.onsuccess = () => {
          const peticion = apertura.result.transaction('datos').objectStore('datos').get('superadas')
          peticion.onsuccess = () => resolver((peticion.result as { valor?: unknown } | undefined)?.valor)
        }
      }),
  )
}

test('la prueba de nivel da por sabida la unidad superada y termina en la primera que no', async ({ page }) => {
  const errores = vigilarErrores(page)
  await page.route('**/content/prueba-de-nivel.json', (ruta) => ruta.fulfill({ json: PRUEBA }))

  // Quien empieza de cero la encuentra en la pantalla de título.
  await page.goto('./')
  await page.getByRole('button', { name: 'Ya sé algo: prueba de nivel' }).click()
  await expect(page.getByRole('heading', { name: 'Prueba de nivel' })).toBeVisible()
  await expect(page.locator('.repaso__lista')).toContainText('Pulso y compás')
  await page.getByRole('button', { name: 'Empezar la prueba' }).click()

  // Primer bloque: los dos ejercicios bien. Sin navegación mientras dura.
  await expect(page.getByText('Prueba de nivel · Pulso y compás')).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Secciones' })).toHaveCount(0)
  await contestar(page, 'Dos')
  await contestar(page, 'Uno')
  const balance = page.getByRole('status').filter({ hasText: 'Superada' })
  await expect(balance).toContainText('2 de 2 a la primera')
  await page.getByRole('button', { name: 'Seguir' }).click()

  // Segundo bloque: un fallo, y hacía falta acertarlo todo.
  await contestar(page, 'Dos')
  await contestar(page, 'Uno')
  await contestar(page, 'Dos')
  await expect(page.getByRole('status').filter({ hasText: 'No superada' })).toContainText('Empieza por esta unidad')
  await page.getByRole('button', { name: 'Ver el resultado' }).click()

  await expect(page.locator('.repaso__fila')).toHaveText([/Pulso y compás.*Dada por sabida/, /Por aquí empiezas/])
  await expect(page.locator('.recompensa')).toContainText('+10')
  await expect.poll(() => superadasGuardadas(page)).toEqual(['m00.u01'])

  // En el mundo, la unidad consta como sabida y sus lecciones están abiertas.
  await page.getByRole('button', { name: 'Ir al mapa' }).click()
  await page.goto('./#/mundo/m00')
  await expect(page.getByText('Dada por sabida en la prueba de nivel.')).toBeVisible()
  await expect(page.getByRole('link', { name: /El tempo/ })).toBeVisible()

  // Lo ya sabido no se vuelve a examinar.
  await page.goto('./#/prueba')
  await expect(page.locator('.repaso__lista')).not.toContainText('Pulso y compás')
  expect(errores).toEqual([])
})

test('salir a mitad de la prueba no guarda nada', async ({ page }) => {
  await page.route('**/content/prueba-de-nivel.json', (ruta) => ruta.fulfill({ json: PRUEBA }))
  await page.goto('./#/prueba')
  await page.getByRole('button', { name: 'Empezar la prueba' }).click()
  await contestar(page, 'Dos')
  await page.getByRole('button', { name: 'Salir de la prueba' }).click()
  await expect(page.getByRole('button', { name: 'Empezar la prueba' })).toBeVisible()
  expect(await superadasGuardadas(page)).toBeUndefined()
})

test('sin prueba en el contenido, lo dice', async ({ page }) => {
  await page.route('**/content/prueba-de-nivel.json', (ruta) => ruta.fulfill({ json: [] }))
  await page.goto('./#/prueba')
  await expect(page.getByRole('heading', { name: 'La prueba aún no está lista' })).toBeVisible()
})

test.describe('con la prueba de nivel del curso', () => {
  test('tiene un bloque por unidad del Mundo 0, en orden, y empieza por el primero', async ({ page }) => {
    const errores = vigilarErrores(page)
    await page.goto('./#/prueba')
    await expect(page.getByRole('heading', { name: 'La prueba aún no está lista' })).toHaveCount(0)
    await expect(page.locator('.repaso__lista')).toHaveText(/Pulso y compás.*Notas e intervalos.*Escalas y tríadas/s)
    await page.getByRole('button', { name: 'Empezar la prueba' }).click()
    await expect(page.getByText('Prueba de nivel · Pulso y compás')).toBeVisible()
    // Cinco ejercicios en el primer bloque; el primero, un oído de compás con sus tres opciones.
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '5')
    for (const compas of ['4/4', '3/4', '6/8']) await expect(page.getByRole('radio', { name: compas })).toBeVisible()
    await page.getByRole('button', { name: 'Salir de la prueba' }).click()
    await expect(page.getByRole('button', { name: 'Empezar la prueba' })).toBeVisible()
    expect(errores).toEqual([])
  })

  test('se salta las unidades ya hechas', async ({ page }) => {
    await sembrarProgreso(page, { lecciones: ['m00.u01.l01', 'm00.u01.l02', 'm00.u01.l03', 'm00.u01.l04', 'm00.u01.l05', 'm00.u01.l06', 'm00.u01.l07', 'm00.u01.l08'] })
    await page.goto('./#/prueba')
    await expect(page.locator('.repaso__lista')).not.toContainText('Pulso y compás')
    await page.getByRole('button', { name: 'Empezar la prueba' }).click()
    await expect(page.getByText('Prueba de nivel · Notas e intervalos')).toBeVisible()
  })
})
