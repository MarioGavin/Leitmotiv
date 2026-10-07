import { expect, test } from '@playwright/test'
import { vigilarErrores } from './ayudas.ts'
import { FICHA_DE_PRUEBA as FICHA } from './leccion-de-prueba.ts'

// El service worker serviría el contenido real sin pasar por `page.route`.
test.use({ serviceWorkers: 'block' })

test('el glosario lista, busca y abre los términos, con su ejemplo sonoro', async ({ page }) => {
  const errores = vigilarErrores(page)
  await page.route('**/content/fichas.json', (ruta) => ruta.fulfill({ json: [] }))
  await page.goto('./#/glosario')

  // De la A a la Z.
  const terminos = page.getByRole('region', { name: 'Términos' }).locator('.leccion-enlace__titulo')
  await expect(terminos).toHaveText(['BPM', 'Bucle', 'Compás', 'Pulso', 'Tempo'])
  // Sin fichas, no hay sección de fichas.
  await expect(page.getByRole('region', { name: 'Fichas' })).toHaveCount(0)

  // Se busca sin tildes, por el nombre o por la definición.
  const buscador = page.getByRole('searchbox', { name: 'Buscar' })
  await buscador.fill('compas')
  await expect(terminos).toHaveText(['Compás'])
  await buscador.fill('velocidad')
  await expect(terminos).toHaveText(['Tempo'])
  await buscador.fill('xilófono')
  await expect(page.getByText('Nada coincide con «xilófono».')).toBeVisible()
  await buscador.fill('')

  // Un término con ejemplo: se abre en la ventana, que lo hace sonar.
  await page.getByRole('button', { name: /^Con ejemplo sonoro Bucle/ }).click()
  const ventana = page.getByRole('dialog')
  await expect(ventana.getByRole('heading', { name: 'Bucle' })).toBeVisible()
  await ventana.getByRole('button', { name: 'Escuchar' }).click()
  await expect(ventana.getByRole('button', { name: 'Parar' })).toBeVisible({ timeout: 20_000 })
  await ventana.getByRole('button', { name: 'Parar' }).click()
  // «Ver también» lleva a otro término en la misma ventana.
  await ventana.getByRole('button', { name: 'compás' }).click()
  await expect(ventana.getByRole('heading', { name: 'Compás' })).toBeVisible()
  await ventana.getByRole('button', { name: 'Cerrar' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(errores).toEqual([])
})

test('una ficha se abre desde el glosario y suena su ejemplo', async ({ page }) => {
  const errores = vigilarErrores(page)
  await page.route('**/content/fichas.json', (ruta) => ruta.fulfill({ json: [FICHA] }))
  await page.goto('./#/glosario')

  const fichas = page.getByRole('region', { name: 'Fichas' })
  await expect(fichas).toContainText('Cómo se agrupan los pulsos en los compases más usados.')
  await fichas.getByRole('link', { name: /Compases de un vistazo/ }).click()

  await expect(page.getByRole('heading', { name: 'Compases de un vistazo' })).toBeVisible()
  // La navegación sigue marcando el glosario.
  await expect(page.getByRole('link', { name: 'Glosario' })).toHaveAttribute('aria-current', 'page')
  const bloque = page.getByRole('region', { name: 'Cuatro por cuatro' })
  await bloque.getByRole('button', { name: 'Escuchar' }).click()
  await expect(bloque.getByRole('button', { name: 'Parar' })).toBeVisible({ timeout: 20_000 })
  // Un bloque sin ejemplo no lleva botón de escuchar.
  await expect(page.getByRole('region', { name: 'Tres por cuatro' }).getByRole('button', { name: 'Escuchar' })).toHaveCount(0)
  // Los términos del texto abren su definición.
  await page.getByRole('button', { name: 'pulsos', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Pulso' })).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Cerrar' }).click()

  await page.getByRole('button', { name: 'Volver al glosario' }).click()
  await expect(page.getByRole('heading', { name: 'Glosario' })).toBeVisible()
  expect(errores).toEqual([])
})

test('una ficha que no existe lo dice', async ({ page }) => {
  await page.goto('./#/ficha/no-existe')
  await expect(page.getByRole('heading', { name: 'Esta ficha no está' })).toBeVisible()
  await page.getByRole('button', { name: 'Volver al glosario' }).click()
  await expect(page.getByRole('heading', { name: 'Glosario' })).toBeVisible()
})
