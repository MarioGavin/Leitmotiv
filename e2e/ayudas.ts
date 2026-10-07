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

export interface ProgresoSembrado {
  /** Lecciones que constan como completadas. */
  lecciones?: readonly string[]
  /** Experiencia ganada cada día, con el día como «2026-10-07». */
  diario?: Readonly<Record<string, number>>
}

/**
 * Deja un progreso guardado antes de que arranque la app: escribe en IndexedDB
 * las mismas tablas que declara `src/progreso/base.ts` (Dexie guarda su
 * versión 1 como la 10 de IndexedDB). Solo surte efecto si la base no existe
 * todavía, así que hay que llamarla antes de abrir la primera página; al
 * recargar no vuelve a escribir nada. Vale para una página o para un contexto entero.
 */
export async function sembrarProgreso(pagina: Pick<Page, 'addInitScript'>, progreso: ProgresoSembrado): Promise<void> {
  await pagina.addInitScript(
    ({ lecciones, diario }) => {
      const apertura = indexedDB.open('leitmotiv', 10)
      apertura.onupgradeneeded = () => {
        const db = apertura.result
        const claves = { lecciones: 'id', tarjetas: 'concepto', diario: 'dia', repertorio: 'id', borradores: 'id', datos: 'clave' }
        for (const [tabla, clave] of Object.entries(claves)) db.createObjectStore(tabla, { keyPath: clave })
        const transaccion = apertura.transaction
        if (!transaccion) return
        const momento = new Date().toISOString()
        for (const id of lecciones) transaccion.objectStore('lecciones').put({ id, completada: momento, ultima: momento, veces: 1, mejor: 1 })
        for (const [dia, xp] of Object.entries(diario)) transaccion.objectStore('diario').put({ dia, xp, lecciones: 1, repasos: 0 })
      }
      apertura.onsuccess = () => apertura.result.close()
    },
    { lecciones: [...(progreso.lecciones ?? [])], diario: { ...progreso.diario } },
  )
}

/** Las claves de una tabla de la base del progreso, leídas en el navegador. */
export function clavesDe(pagina: Page, tabla: string): Promise<string[]> {
  return pagina.evaluate(
    (nombre) =>
      new Promise<string[]>((resolver, rechazar) => {
        const apertura = indexedDB.open('leitmotiv')
        apertura.onerror = () => rechazar(apertura.error)
        apertura.onsuccess = () => {
          const peticion = apertura.result.transaction(nombre).objectStore(nombre).getAllKeys()
          peticion.onsuccess = () => {
            apertura.result.close()
            resolver(peticion.result.map(String))
          }
          peticion.onerror = () => rechazar(peticion.error)
        }
      }),
    tabla,
  )
}

/** El día de hoy en la hora de la máquina, como lo escribe la app: «2026-10-07». */
export function hoy(): string {
  const ahora = new Date()
  const dos = (n: number): string => String(n).padStart(2, '0')
  return `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}`
}

/** Los dos esquemas de color. */
export const ESQUEMAS = ['oscuro', 'claro'] as const

/**
 * Cada pantalla, con un selector que solo existe cuando ha terminado de cargar.
 * Las de la lección «El tempo» (m00.u01.l02) necesitan «El pulso» completada: ver `PROGRESO_DE_PANTALLAS`.
 */
export const PANTALLAS: ReadonlyArray<readonly [ruta: string, lista: string]> = [
  ['#/mapa', '[data-nodo]'],
  ['#/mundo/m00', '.leccion-enlace'],
  ['#/leccion/m00.u01.l02/1', '.pie .boton'],
  ['#/leccion/m00.u01.l02/2', '.opcion'],
  ['#/leccion/m00.u01.l02/4', '.pad'],
  ['#/pianoroll', '.rollo'],
  ['#/ajustes', '.conmutador'],
  ['#/repertorio', '.pantalla__cuerpo .boton'],
  ['#/diagnostico', '.instrumento-fila'],
  ['#/calibracion', '.pad'],
]

/** Lo que hay que tener hecho para abrir todas las pantallas de `PANTALLAS`. */
export const PROGRESO_DE_PANTALLAS: ProgresoSembrado = { lecciones: ['m00.u01.l01'] }

/** Deja elegido un esquema de color antes de que la app arranque. */
export async function elegirEsquema(pagina: Page, esquema: string): Promise<void> {
  await pagina.addInitScript((e) => {
    localStorage.setItem('leitmotiv-ajustes', JSON.stringify({ state: { esquema: e, nomenclatura: 'latina', sonidosDeInterfaz: true, timbre: 'chip', latenciaMs: 0 }, version: 3 }))
  }, esquema)
}

/**
 * Prepara la página para tocar al ritmo en el próximo ejercicio que empiece:
 * cuando el ejercicio publica en `leitmotiv:ritmo` cuándo va cada golpe, se
 * pulsa el pad en esos instantes. Hay que llamarla antes de tocar «Empezar».
 * Con `retrasoMs`, cada toque llega ese tiempo tarde, como si el sonido tardara en oírse.
 */
export async function tocarAlRitmo(pagina: Page, retrasoMs = 0): Promise<void> {
  await pagina.evaluate((retraso) => {
    document.addEventListener(
      'leitmotiv:ritmo',
      (evento) => {
        const { instantes } = (evento as CustomEvent<{ instantes: number[] }>).detail
        const pad = document.querySelector('.pad')
        for (const instante of instantes) {
          setTimeout(() => pad?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })), instante + retraso - performance.now())
        }
      },
      { once: true },
    )
  }, retrasoMs)
}

/** El retardo calibrado que hay guardado en los ajustes. */
export function latenciaGuardada(pagina: Page): Promise<number> {
  return pagina.evaluate(() => (JSON.parse(localStorage.getItem('leitmotiv-ajustes') ?? '{}') as { state?: { latenciaMs?: number } }).state?.latenciaMs ?? 0)
}
