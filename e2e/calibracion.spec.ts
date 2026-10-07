import { expect, test } from '@playwright/test'
import { latenciaGuardada, tocarAlRitmo, vigilarErrores } from './ayudas.ts'
import { ID_DE_PRUEBA, leccionDePrueba } from './leccion-de-prueba.ts'

/** Lo que tardan los toques simulados en llegar: como con unos auriculares Bluetooth. */
const RETRASO = 150

test('la calibración mide el retardo de los toques y lo guarda', async ({ page }) => {
  test.setTimeout(60_000)
  const errores = vigilarErrores(page)
  await page.goto('./#/calibracion')
  await expect(page.locator('.calibracion__datos')).toContainText('0 ms')

  // Se puede parar a medias.
  await page.getByRole('button', { name: 'Empezar' }).click()
  await page.getByRole('button', { name: 'Parar' }).click()
  await expect(page.getByRole('button', { name: 'Empezar' })).toBeVisible()

  await tocarAlRitmo(page, RETRASO)
  await page.getByRole('button', { name: 'Empezar' }).click()
  const medida = page.getByRole('status').filter({ hasText: 'Medido' })
  await expect(medida).toBeVisible({ timeout: 30_000 })
  const ms = Number(((await medida.locator('.dato').textContent()) ?? '').replace(/[^\d-]/g, ''))
  // Los toques los dispara un temporizador de la página: llegan con unos milisegundos de holgura.
  expect(ms).toBeGreaterThan(RETRASO - 40)
  expect(ms).toBeLessThan(RETRASO + 40)
  // Medir no es guardar.
  expect(await latenciaGuardada(page)).toBe(0)

  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Guardado' })).toBeVisible()
  await expect(page.locator('.calibracion__datos')).toContainText(`+${ms} ms`)
  expect(await latenciaGuardada(page)).toBe(ms)

  // Entrando por la dirección, «Volver» lleva a los ajustes.
  await page.getByRole('button', { name: 'Volver', exact: true }).click()
  await expect(page).toHaveURL(/#\/ajustes$/)

  // Se puede dejar a cero.
  await page.goto('./#/calibracion')
  await page.getByRole('button', { name: 'Poner a cero' }).click()
  await expect(page.locator('.calibracion__datos')).toContainText('0 ms')
  expect(await latenciaGuardada(page)).toBe(0)
  expect(errores).toEqual([])
})

test.describe('desde un ejercicio de ritmo', () => {
  // El service worker serviría la lección real sin pasar por `page.route`.
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

- tipo: ritmo
  modo: seguir
  enunciado: Marca el pulso.
  tempo: 100
  paso: "4"
  patron: "xxxx|xxxx"
  tolerancia: estricta
  pista: Toca con la claqueta.
  explicacion: Cada toque en su pulso.
`)

  test('un retardo grande se calibra y, al volver, el ejercicio sale y la lección conserva lo de antes', async ({ page }) => {
    test.setTimeout(90_000)
    const errores = vigilarErrores(page)
    await page.route(`**/lecciones/${ID_DE_PRUEBA}.json`, (ruta) => ruta.fulfill({ json: LECCION }))
    await page.goto(`./#/leccion/${ID_DE_PRUEBA}/1`)

    // Paso 1, acertado a la primera.
    await page.getByRole('radio', { name: 'Dos' }).click()
    await page.getByRole('button', { name: 'Comprobar' }).click()
    await page.getByRole('button', { name: 'Continuar' }).click()

    // Paso 2: con los toques llegando tarde, ninguno cae en su sitio y se ofrece calibrar.
    await tocarAlRitmo(page, RETRASO)
    await page.getByRole('button', { name: 'Empezar' }).click()
    const fallo = page.getByRole('status').filter({ hasText: 'Todavía no' })
    await expect(fallo).toContainText('puede que te llegue con retardo', { timeout: 30_000 })
    await fallo.getByRole('button', { name: 'Calibrarlo' }).click()

    await expect(page.getByRole('heading', { name: 'Calibración' })).toBeVisible()
    await tocarAlRitmo(page, RETRASO)
    await page.getByRole('button', { name: 'Empezar' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Medido' })).toBeVisible({ timeout: 30_000 })
    await page.getByRole('button', { name: 'Guardar' }).click()
    await page.getByRole('button', { name: 'Volver', exact: true }).click()

    // De vuelta en el mismo paso, con el retardo restado.
    await expect(page).toHaveURL(new RegExp(`#/leccion/${ID_DE_PRUEBA}/2$`))
    await expect(page.getByText('100 BPM · 4/4')).toBeVisible()
    // El ejercicio publica ya los instantes con el retardo sumado: los toques simulados no necesitan más.
    await tocarAlRitmo(page)
    await page.getByRole('button', { name: 'Empezar' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Superado' })).toBeVisible({ timeout: 30_000 })
    await page.getByRole('button', { name: 'Continuar' }).click()

    // El acierto del paso 1 no se ha perdido con la visita a la calibración.
    await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible()
    await expect(page.locator('.recompensa')).toContainText('2 de 2')
    expect(errores).toEqual([])
  })
})
