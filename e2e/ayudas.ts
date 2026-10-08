import { type Page, expect } from '@playwright/test'
import { INSTRUMENTOS, type IdInstrumento, type Instrumento, ORDEN_DE_PERCUSION, teclaDePercusion } from '../src/musica/instrumentos.ts'
import { midiDe } from '../src/musica/notas.ts'
import { piezaDePrueba } from '../src/musica/piezas-de-prueba.ts'
import type { PiezaGuardada } from '../src/progreso/tipos.ts'

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
  /** Conceptos en el repaso espaciado, con el día en que les toca volver (fecha ISO). */
  tarjetas?: Readonly<Record<string, string>>
  /** Piezas de «Mi repertorio». */
  repertorio?: readonly PiezaGuardada[]
}

/** Una pieza de «Mi repertorio» con melodía (15 notas), bajo (8) y batería (16), en Re mayor a 104 BPM. */
export const PIEZA_GUARDADA: PiezaGuardada = {
  id: 'pradera',
  titulo: 'Tema de la pradera',
  creada: '2026-10-01T10:00:00.000Z',
  modificada: '2026-10-02T10:00:00.000Z',
  pieza: piezaDePrueba(
    [
      { rol: 'melodia', notas: 'A4:4 D5:4 F#5:4. E5:8 | D5:4 B4:4 A4:4 C#5:4 | D5:4. F#5:8 E5:4 D5:4 | B4:4 G4:4 A4:2' },
      { rol: 'bajo', instrumento: 'bajo-electrico', notas: 'D2:2 A2:2 | G2:2 A2:2 | B1:2 F#2:2 | G2:2 A2:2' },
      { rol: 'percusion', instrumento: 'bateria', notas: 'bombo:4 caja:4 bombo:4 caja:4 | % | % | %' },
    ],
    { titulo: 'Tema de la pradera', tempo: 104, tonalidad: 'D mayor', bucle: true },
  ),
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
    ({ lecciones, diario, tarjetas, repertorio }) => {
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
        for (const [concepto, due] of Object.entries(tarjetas)) {
          // Una tarjeta en repaso, vista por última vez tres días antes de que le toque volver: lo que guarda ts-fsrs.
          const ultima = new Date(Date.parse(due) - 3 * 86_400_000).toISOString()
          const fsrs = { due, stability: 3, difficulty: 5, elapsed_days: 0, scheduled_days: 3, learning_steps: 0, reps: 2, lapses: 0, state: 2, last_review: ultima }
          transaccion.objectStore('tarjetas').put({ concepto, fsrs })
        }
        for (const pieza of repertorio) transaccion.objectStore('repertorio').put(pieza)
      }
      apertura.onsuccess = () => apertura.result.close()
    },
    { lecciones: [...(progreso.lecciones ?? [])], diario: { ...progreso.diario }, tarjetas: { ...progreso.tarjetas }, repertorio: [...(progreso.repertorio ?? [])] },
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
  ['#/pianoroll/pradera', '.rollo'],
  ['#/ajustes', '.conmutador'],
  ['#/repertorio', '.repertorio__pieza'],
  ['#/diagnostico', '.instrumento-fila'],
  ['#/calibracion', '.pad'],
  ['#/repaso', '.repaso__lista'],
  ['#/glosario', '.glosario__fila'],
  ['#/ficha/intervalos', '.ficha-de-consulta__resumen'],
  ['#/prueba', '.pie .boton'],
]

/** Lo que hay que tener hecho para abrir todas las pantallas de `PANTALLAS`: «El pulso» completada, su concepto pendiente de repaso desde ayer y una pieza en el repertorio. */
export const PROGRESO_DE_PANTALLAS: ProgresoSembrado = {
  lecciones: ['m00.u01.l01'],
  tarjetas: { pulso: new Date(Date.now() - 86_400_000).toISOString() },
  repertorio: [PIEZA_GUARDADA],
}

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

/** Fila del piano roll en la que está una nota: las filas van de la nota más aguda del instrumento (fila 0) a la más grave. */
export function filaDeNota(nota: string, instrumento: IdInstrumento): number {
  const datos: Instrumento = INSTRUMENTOS[instrumento]
  return datos.rango[1] - midiDe(nota)
}

/** Fila del piano roll en la que está una pieza de la batería («bombo», «caja»…). */
export function filaDePercusion(pieza: string): number {
  return ORDEN_DE_PERCUSION.indexOf(teclaDePercusion('bateria', pieza) ?? -1)
}

/**
 * Escribe notas en una pista del piano roll con el teclado, como lo haría
 * quien no puede usar el dedo: elige la pista, lleva el cursor a la esquina de
 * arriba a la izquierda y, para cada nota, lo mueve con las flechas hasta su
 * casilla (en pasos de la rejilla, corcheas por defecto) y pulsa Intro. Las
 * notas nuevas duran lo que diga la figura elegida, corchea por defecto.
 */
export async function escribirEnElRollo(pagina: Page, pista: string, notas: ReadonlyArray<{ casilla: number; fila: number }>): Promise<void> {
  await pagina.getByRole('group', { name: 'Pista que se edita' }).getByRole('button', { name: pista }).click()
  const rejilla = pagina.getByRole('application')
  const antes = Number((/: (\d+) notas?\./.exec((await rejilla.getAttribute('aria-label')) ?? '') ?? [])[1] ?? 0)
  // El cursor puede venir de otra pista: diez saltos de una octava y 64 casillas a la izquierda lo dejan en la esquina.
  for (let i = 0; i < 10; i++) await rejilla.press('PageUp')
  for (let i = 0; i < 64; i++) await rejilla.press('ArrowLeft')
  let actual = { casilla: 0, fila: 0 }
  for (const nota of [...notas].sort((a, b) => a.casilla - b.casilla || a.fila - b.fila)) {
    const derecha = nota.casilla - actual.casilla
    const abajo = nota.fila - actual.fila
    for (let i = 0; i < Math.abs(derecha); i++) await rejilla.press(derecha > 0 ? 'ArrowRight' : 'ArrowLeft')
    for (let i = 0; i < Math.abs(abajo); i++) await rejilla.press(abajo > 0 ? 'ArrowDown' : 'ArrowUp')
    await rejilla.press('Enter')
    actual = nota
  }
  // Cada Intro en una casilla vacía ha puesto una nota: ninguna se ha perdido ni ha caído encima de otra.
  await expect(rejilla).toHaveAccessibleName(new RegExp(`: ${antes + notas.length} notas?\\.`))
}
