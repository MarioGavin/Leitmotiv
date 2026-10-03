import { type Page, expect } from '@playwright/test'

/** Recoge los errores de la página (excepciones y `console.error`) para comprobar al final que no ha habido ninguno. */
export function vigilarErrores(pagina: Page): string[] {
  const errores: string[] = []
  pagina.on('pageerror', (error) => errores.push(error.message))
  pagina.on('console', (mensaje) => {
    if (mensaje.type() === 'error') errores.push(mensaje.text())
  })
  return errores
}

/** Entra en la app por la pantalla de título, que es además el gesto que arranca el audio. */
export async function entrar(pagina: Page): Promise<void> {
  await pagina.goto('./')
  await pagina.getByRole('button', { name: 'Empezar' }).click()
  await expect(pagina.getByRole('button', { name: /Mundo 0: Repaso exprés/ })).toBeVisible()
}

/** Va al diagnóstico de audio por dentro de la app (sin recargar, para no perder el audio ya arrancado). */
export async function abrirDiagnostico(pagina: Page): Promise<void> {
  await pagina.getByRole('link', { name: 'Ajustes' }).click()
  await pagina.getByRole('button', { name: 'Diagnóstico de audio' }).click()
  await expect(pagina.getByRole('heading', { name: 'Diagnóstico' })).toBeVisible()
}

/** Las dos direcciones visuales, mientras convivan. */
export const DIRECCIONES = ['cartucho', 'vinilo'] as const

/** Cada pantalla, con un selector que solo existe cuando ha terminado de cargar. */
export const PANTALLAS: ReadonlyArray<readonly [ruta: string, lista: string]> = [
  ['#/mapa', '[data-nodo]'],
  ['#/mundo/m00', '.leccion-enlace'],
  ['#/leccion/m00.u01.l02/1', '.pie .boton'],
  ['#/leccion/m00.u01.l02/2', '.opcion'],
  ['#/pianoroll', '.rollo'],
  ['#/ajustes', '.conmutador'],
  ['#/repertorio', '.pantalla__cuerpo .boton'],
  ['#/diagnostico', '.instrumento-fila'],
]

/** Deja elegida una dirección visual antes de que la app arranque. */
export async function elegirDireccion(pagina: Page, direccion: string): Promise<void> {
  await pagina.addInitScript((d) => {
    localStorage.setItem('leitmotiv-ajustes', JSON.stringify({ state: { direccion: d, esquema: 'oscuro', nomenclatura: 'latina', sonidosDeInterfaz: true }, version: 1 }))
  }, direccion)
}
