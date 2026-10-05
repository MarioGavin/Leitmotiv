/**
 * Cuándo ha tocado el usuario, medido en el reloj del audio.
 *
 * Un toque llega con la hora del reloj de la página (la de `performance.now()`)
 * y lo que suena se programa en el reloj del audio. Para compararlos hace falta
 * una pareja de horas tomadas a la vez, una en cada reloj: la da
 * `getOutputTimestamp`, que además dice qué instante del audio está saliendo
 * por el altavoz, y no cuál se está calculando. Lo que quede de desfase (el
 * retardo del altavoz o de unos auriculares Bluetooth, el de la pantalla) lo
 * corrige la calibración, que el usuario hace tocando sobre un pulso.
 *
 * Este módulo no importa el motor: es aritmética y se prueba sin navegador.
 */

/** Dos horas tomadas en el mismo momento. */
export interface ParDeRelojes {
  /** Instante del audio que está sonando, en segundos del reloj de audio. */
  audio: number
  /** La misma hora en el reloj de la página, en milisegundos. */
  pagina: number
}

/** Lo que hace falta de un AudioContext para leer los dos relojes a la vez. */
export interface RelojDeAudio {
  readonly currentTime: number
  readonly outputLatency?: number
  readonly baseLatency?: number
  getOutputTimestamp?: () => { contextTime?: number; performanceTime?: number }
}

/** Lee los dos relojes a la vez. `ahora` es la hora de la página en este momento. */
export function leerRelojes(ctx: RelojDeAudio, ahora: number): ParDeRelojes {
  const marca = typeof ctx.getOutputTimestamp === 'function' ? ctx.getOutputTimestamp() : undefined
  const audio = marca?.contextTime
  const pagina = marca?.performanceTime
  // Algunos navegadores devuelven ceros hasta que el audio lleva un rato en marcha, o no tienen la función.
  if (audio !== undefined && pagina !== undefined && audio > 0 && pagina > 0) return { audio, pagina }
  return { audio: ctx.currentTime - (ctx.outputLatency ?? ctx.baseLatency ?? 0), pagina: ahora }
}

/**
 * Instante de un toque en el reloj de audio.
 * @param marca Hora del toque en el reloj de la página (`event.timeStamp`), en milisegundos.
 * @param latenciaMs Retardo calibrado: lo que tarda el usuario en oír un sonido desde que el reloj de audio dice que sale.
 */
export function instanteDelToque(relojes: ParDeRelojes, marca: number, latenciaMs: number): number {
  return relojes.audio + (marca - relojes.pagina) / 1000 - latenciaMs / 1000
}

/** Límites del retardo calibrado, en milisegundos. Fuera de ellos, la medida no es creíble. */
export const LATENCIA_MINIMA_MS = -100
export const LATENCIA_MAXIMA_MS = 500

export function acotarLatencia(ms: number): number {
  if (!Number.isFinite(ms)) return 0
  return Math.round(Math.min(LATENCIA_MAXIMA_MS, Math.max(LATENCIA_MINIMA_MS, ms)))
}
