import { expect, test } from '@playwright/test'
import { vigilarErrores } from './ayudas.ts'

test('se completa una lección de principio a fin', async ({ page }) => {
  const errores = vigilarErrores(page)
  await page.goto('./#/mundo/m00')
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

  // Pasos 4 y 5: ejercicios de ritmo, que en el Tramo A todavía se saltan.
  await page.getByRole('button', { name: 'Saltar este paso' }).click()
  await page.getByRole('button', { name: 'Saltar este paso' }).click()

  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible()
  await page.getByRole('button', { name: 'Volver al mundo' }).click()
  await expect(page).toHaveURL(/#\/mundo\/m00$/)
  expect(errores).toEqual([])
})

test('un fallo se explica, hay pista y la pregunta vuelve a salir al final', async ({ page }) => {
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
  await page.goto('./#/leccion/m00.u01.l02/1')
  await page.getByRole('button', { name: 'pulso', exact: true }).click()
  const ventana = page.getByRole('dialog')
  await expect(ventana.getByRole('heading', { name: 'Pulso' })).toBeVisible()
  await expect(ventana).toContainText('Latido regular')
  await ventana.getByRole('button', { name: 'Cerrar' }).click()
  await expect(ventana).toBeHidden()
})
