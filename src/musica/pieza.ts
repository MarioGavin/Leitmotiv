/**
 * Formato único de pieza.
 *
 * Lo usan los ejemplos de las lecciones, los ejercicios, las piezas que
 * compone el usuario en el piano roll y la exportación MIDI. Es JSON puro:
 * tiempos en ticks (480 por negra), notas en números MIDI.
 */
import type { IdInstrumento } from './instrumentos.ts'
import { type Compas, ticksPorCompas } from './tiempo.ts'

export interface Nota {
  /** Inicio, en ticks desde el principio de la pieza. */
  t: number
  /** Duración, en ticks. */
  d: number
  /** Nota MIDI (60 = Do central). En percusión, la tecla de la pieza del kit. */
  n: number
  /** Velocidad MIDI, de 1 a 127. */
  v: number
}

export const ROLES = ['melodia', 'contramelodia', 'armonia', 'colchon', 'bajo', 'percusion', 'efecto'] as const
export type Rol = (typeof ROLES)[number]

export const NOMBRES_ROL: Readonly<Record<Rol, string>> = {
  melodia: 'Melodía',
  contramelodia: 'Contramelodía',
  armonia: 'Armonía',
  colchon: 'Colchón',
  bajo: 'Bajo',
  percusion: 'Percusión',
  efecto: 'Efecto',
}

export interface Pista {
  /** Identificador único dentro de la pieza. */
  id: string
  nombre?: string
  rol: Rol
  instrumento: IdInstrumento
  /** Ajuste de volumen en dB (0 = sin cambio). */
  volumen?: number
  /** De −1 (izquierda) a 1 (derecha). */
  paneo?: number
  /** Capa a la que pertenece, para música adaptativa por capas verticales. */
  capa?: string
  silenciada?: boolean
  notas: Nota[]
}

export interface AcordeMarcado {
  t: number
  d: number
  /** Cifrado americano: «Cmaj7», «D/F#». */
  simbolo: string
}

export interface Seccion {
  id: string
  nombre?: string
  /** Primer compás de la sección (desde 1). */
  desde: number
  /** Último compás de la sección, incluido. */
  hasta: number
}

export interface Pieza {
  titulo?: string
  /** Negras por minuto. */
  tempo: number
  compas: Compas
  /** «D mayor», «A menor», «E frigio»… */
  tonalidad?: string
  /** Longitud en compases. */
  compases: number
  /** Si la pieza está pensada para repetirse sin fin. */
  bucle?: boolean
  /** Cantidad de swing, de 0 (recto) a 1 (tresillo). */
  swing?: number
  pistas: Pista[]
  acordes?: AcordeMarcado[]
  secciones?: Seccion[]
}

/** Duración total de la pieza, en ticks. */
export function duracionEnTicks(pieza: Pick<Pieza, 'compas' | 'compases'>): number {
  return ticksPorCompas(pieza.compas) * pieza.compases
}

/** Todas las notas de una pista que suenan (aunque sea en parte) dentro de un tramo [desde, hasta). */
export function notasEnTramo(pista: Pick<Pista, 'notas'>, desde: number, hasta: number): Nota[] {
  return pista.notas.filter((n) => n.t < hasta && n.t + n.d > desde)
}

/** Ordena las notas por inicio y, a igualdad, de grave a aguda. No modifica el original. */
export function ordenarNotas(notas: readonly Nota[]): Nota[] {
  return [...notas].sort((a, b) => a.t - b.t || a.n - b.n)
}

/** Máximo número de notas que suenan a la vez en una pista. */
export function polifoniaMaxima(notas: readonly Nota[]): number {
  const eventos: Array<[number, number]> = []
  for (const n of notas) {
    eventos.push([n.t, 1], [n.t + n.d, -1])
  }
  // Los finales van antes que los inicios en el mismo instante: dos notas seguidas no se solapan.
  eventos.sort((a, b) => a[0] - b[0] || a[1] - b[1])
  let actual = 0
  let maximo = 0
  for (const [, delta] of eventos) {
    actual += delta
    if (actual > maximo) maximo = actual
  }
  return maximo
}
