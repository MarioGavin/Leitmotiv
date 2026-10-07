import { type Page, expect, test } from '@playwright/test'
import { entrar, vigilarErrores } from './ayudas.ts'
import { ID_DE_PRUEBA } from './leccion-de-prueba.ts'

const prosa = (texto: string) => [{ t: 'p', h: [{ t: 'texto', v: texto }] }]

/**
 * Ninguna lección escrita lleva todavía pasos de oído generados: la prueba
 * sirve una lección propia en lugar de la real, ya en la forma compilada.
 */
const LECCION = {
  id: ID_DE_PRUEBA,
  titulo: 'Oído generado',
  conceptos: ['tempo'],
  pasos: [
    {
      tipo: 'oido',
      modo: 'intervalo',
      enunciado: prosa('¿Qué intervalo suena?'),
      pista: prosa('Canta las dos notas.'),
      explicacion: prosa('La tercera mayor es más luminosa que la menor.'),
      concepto: 'tempo',
      intervalos: ['3m', '3M', '5P'],
      direcciones: ['ascendente', 'armonico'],
      registro: [48, 72],
      instrumento: 'piano',
      rondas: 2,
    },
    {
      tipo: 'oido',
      modo: 'acorde',
      enunciado: prosa('¿Qué acorde suena?'),
      pista: prosa('Fíjate en si suena alegre o triste.'),
      explicacion: prosa('El mayor y el menor solo se distinguen por la tercera.'),
      concepto: 'tempo',
      calidades: ['M', 'm', 'dim'],
      presentacion: 'ambos',
      inversiones: false,
      registro: [48, 67],
      instrumento: 'piano',
      rondas: 2,
    },
  ],
}

// El service worker serviría la lección real sin pasar por `page.route`.
test.use({ serviceWorkers: 'block' })

/** Responde la pregunta en pantalla con la primera opción y comprueba que se corrige. */
async function responder(pagina: Page): Promise<'acierto' | 'fallo'> {
  await pagina.getByRole('radio').first().click()
  await pagina.getByRole('button', { name: 'Comprobar' }).click()
  const acierto = pagina.getByRole('status').filter({ hasText: 'Correcto' })
  const fallo = pagina.getByRole('status').filter({ hasText: 'Fallo' })
  await expect(acierto.or(fallo)).toBeVisible()
  if (await fallo.isVisible()) {
    // El fallo dice cuál era la respuesta, qué ha sonado y por qué.
    await expect(fallo).toContainText('La respuesta era «')
    return 'fallo'
  }
  return 'acierto'
}

test('los pasos de oído generados suenan, corrigen y explican', async ({ page }) => {
  const errores = vigilarErrores(page)
  await page.route(`**/lecciones/${ID_DE_PRUEBA}.json`, (ruta) => ruta.fulfill({ json: LECCION }))
  await entrar(page)
  await page.goto(`./#/leccion/${ID_DE_PRUEBA}/1`)

  for (const titulo of ['¿Qué intervalo suena?', '¿Qué acorde suena?']) {
    await expect(page.getByText(titulo)).toBeVisible()
    await expect(page.getByRole('button', { name: /Escuchar|Parar|Cargando/ })).toBeVisible()
    await page.getByRole('button', { name: 'Pista' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Pista' })).toBeVisible()

    // Dos rondas; cada fallo añade una al final. Se responde hasta que el paso termina.
    for (let vuelta = 0; vuelta < 6; vuelta++) {
      await responder(page)
      const continuar = page.getByRole('button', { name: 'Continuar' })
      if (await continuar.isVisible()) {
        await continuar.click()
        break
      }
      await page.getByRole('button', { name: 'Siguiente pregunta' }).click()
    }
  }

  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible()
  expect(errores).toEqual([])
})
