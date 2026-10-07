import { expect, test } from '@playwright/test'
import { sembrarProgreso, tocarAlRitmo, vigilarErrores } from './ayudas.ts'

/** «El tempo» (m00.u01.l02), la lección de casi todas estas pruebas, se abre al completar «El pulso». */
const PULSO_HECHO = { lecciones: ['m00.u01.l01'] }

test('se completa una lección de principio a fin', async ({ page }) => {
  await sembrarProgreso(page, PULSO_HECHO)
  // Los dos ejercicios de ritmo suenan de verdad: unos 25 segundos.
  test.setTimeout(90_000)
  const errores = vigilarErrores(page)
  await page.goto('./#/mundo/m00')
  // «El pulso» está hecha y «El tempo» es la siguiente.
  await expect(page.getByRole('link', { name: /El pulso/ })).toContainText('Hecha')
  await expect(page.getByRole('link', { name: /El tempo/ })).toHaveAccessibleName(/la siguiente/)
  await page.getByRole('link', { name: /El tempo/ }).click()

  // Paso 1: teoría con ejemplo sonoro.
  await expect(page.getByRole('heading', { name: 'Pulsos por minuto' })).toBeVisible()
  await expect(page.getByRole('img', { name: /Ejemplo de 2 compases/ })).toBeVisible()
  await page.getByRole('button', { name: 'Continuar' }).click()

  // Paso 2: tres preguntas de oído, respondidas bien.
  for (const [i, respuesta] of ['Lento', 'Rápido', 'Medio'].entries()) {
    await expect(page.getByText(`Pregunta ${i + 1} de 3`)).toBeVisible()
    await page.getByRole('radio', { name: respuesta }).click()
    await page.getByRole('button', { name: 'Comprobar' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Correcto' })).toBeVisible()
    await page.getByRole('button', { name: i < 2 ? 'Siguiente pregunta' : 'Continuar' }).click()
  }

  // Paso 3: teoría.
  await expect(page.getByRole('heading', { name: 'El tempo cuenta lo que pasa' })).toBeVisible()
  await page.getByRole('button', { name: 'Continuar' }).click()

  // Pasos 4 y 5: ejercicios de ritmo, tocados a tiempo.
  for (const bpm of ['72 BPM · 4/4', '144 BPM · 4/4']) {
    await expect(page.getByText(bpm)).toBeVisible()
    await tocarAlRitmo(page)
    await page.getByRole('button', { name: 'Empezar' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Superado' })).toBeVisible({ timeout: 30_000 })
    await page.getByRole('button', { name: 'Continuar' }).click()
  }

  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible()
  // Primera vez y sin encargo: 20 puntos. Las tres preguntas de oído, a la primera; los dos ritmos, superados al primer intento.
  await expect(page.locator('.recompensa')).toContainText('+20')
  await expect(page.locator('.recompensa')).toContainText('5 de 5')

  // Recargar la pantalla final enseña lo que consta, pero no vuelve a registrar la lección.
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible()
  await expect(page.locator('.recompensa')).toContainText('1 vez')
  await expect(page.locator('.recompensa')).toContainText('100 %')
  await expect(page.locator('.recompensa')).not.toContainText('+')

  await page.getByRole('button', { name: 'Volver al mundo' }).click()
  await expect(page).toHaveURL(/#\/mundo\/m00$/)
  await expect(page.getByRole('link', { name: /El tempo/ })).toContainText('Hecha')
  // Solo los 20 puntos de la primera vez: si la recarga hubiera contado, serían 25.
  await expect(page.getByRole('progressbar', { name: 'Experiencia para el nivel 2' })).toHaveAttribute('aria-valuenow', '20')
  await expect(page.getByRole('region', { name: 'Tu progreso' })).toContainText('20/50 XP')
  expect(errores).toEqual([])
})

test('una lección bloqueada lleva candado y no se abre por su dirección', async ({ page }) => {
  const errores = vigilarErrores(page)
  await page.goto('./#/mundo/m00')
  await expect(page.getByRole('link', { name: /El pulso/ })).toHaveAccessibleName(/la siguiente/)
  // «El tempo» no es un enlace: es una fila con candado.
  await expect(page.getByRole('link', { name: /El tempo/ })).toHaveCount(0)
  await expect(page.locator('.leccion-enlace--bloqueada').getByRole('img', { name: 'Bloqueada' })).toBeVisible()

  await page.goto('./#/leccion/m00.u01.l02/1')
  await expect(page.getByRole('heading', { name: 'Lección bloqueada' })).toBeVisible()
  await expect(page.getByText('Te toca «El pulso».')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continuar' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Volver al mundo' }).click()
  await expect(page).toHaveURL(/#\/mundo\/m00$/)

  // La pantalla final de una lección sin hacer lleva al principio, sin registrar nada.
  await page.goto('./#/leccion/m00.u01.l01/9')
  await expect(page).toHaveURL(/#\/leccion\/m00\.u01\.l01\/1$/)
  await expect(page.getByRole('heading', { name: 'Lección completada' })).toHaveCount(0)
  expect(errores).toEqual([])
})

test('un fallo se explica, hay pista y la pregunta vuelve a salir al final', async ({ page }) => {
  await sembrarProgreso(page, PULSO_HECHO)
  await page.goto('./#/leccion/m00.u01.l02/2')
  await page.getByRole('button', { name: 'Pista' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Pista' })).toContainText('Camina con dos dedos')

  // La primera pregunta («Lento») se falla a propósito.
  await page.getByRole('radio', { name: 'Rápido' }).click()
  await page.getByRole('button', { name: 'Comprobar' }).click()
  const fallo = page.getByRole('status').filter({ hasText: 'Fallo' })
  await expect(fallo).toContainText('La respuesta era «Lento»')
  await expect(fallo).toContainText('volverá a salir al final')
  await page.getByRole('button', { name: 'Siguiente pregunta' }).click()

  for (const respuesta of ['Rápido', 'Medio']) {
    await page.getByRole('radio', { name: respuesta }).click()
    await page.getByRole('button', { name: 'Comprobar' }).click()
    await page.getByRole('button', { name: 'Siguiente pregunta' }).click()
  }

  // Vuelve la fallada, ahora como cuarta de cuatro.
  await expect(page.getByText('Pregunta 4 de 4')).toBeVisible()
  await page.getByRole('radio', { name: 'Lento' }).click()
  await page.getByRole('button', { name: 'Comprobar' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Correcto' })).toBeVisible()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByRole('heading', { name: 'El tempo cuenta lo que pasa' })).toBeVisible()
})

test('un término del glosario abre su definición', async ({ page }) => {
  await sembrarProgreso(page, PULSO_HECHO)
  await page.goto('./#/leccion/m00.u01.l02/1')
  await page.getByRole('button', { name: 'pulso', exact: true }).click()
  const ventana = page.getByRole('dialog')
  await expect(ventana.getByRole('heading', { name: 'Pulso' })).toBeVisible()
  await expect(ventana).toContainText('Latido regular')
  await ventana.getByRole('button', { name: 'Cerrar' }).click()
  await expect(ventana).toBeHidden()
})

test('un ejercicio de ritmo sin toques se explica y se puede repetir', async ({ page }) => {
  await sembrarProgreso(page, PULSO_HECHO)
  test.setTimeout(60_000)
  const errores = vigilarErrores(page)
  await page.goto('./#/leccion/m00.u01.l02/5')
  await page.getByRole('button', { name: 'Pista' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Pista' })).toContainText('Relaja la mano')

  // Primer intento: no se toca nada.
  await page.getByRole('button', { name: 'Empezar' }).click()
  const fallo = page.getByRole('status').filter({ hasText: 'Todavía no' })
  await expect(fallo).toContainText('No ha llegado ningún toque', { timeout: 30_000 })
  await expect(page.getByRole('img', { name: /Patrón de 16 golpes/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Continuar|Seguir de todos modos/ })).toHaveCount(0)

  // Segundo intento, a tiempo.
  await tocarAlRitmo(page)
  await page.getByRole('button', { name: 'Repetir' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Superado' })).toContainText('16 de 16', { timeout: 30_000 })
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible()
  expect(errores).toEqual([])
})
