/**
 * Edición de las notas de una pista en el piano roll. Funciones puras: reciben
 * las notas y devuelven otras, sin modificar las que reciben.
 *
 * Dos reglas valen para todo: una nota nunca se sale de la pieza, y dos notas
 * de la misma altura nunca se pisan (en un instrumento de una sola voz, como
 * los de chip, no se pisan dos notas cualesquiera). Lo que rompería una regla
 * no se hace: la nota nueva se acorta, la que se estira se frena y la que se
 * mueve se queda donde estaba. Editar nunca borra otra nota.
 */
import type { Nota } from './pieza.ts'

export interface Limites {
  /** Duración de la pieza, en ticks. */
  total: number
  /** Nota más grave y más aguda que admite el instrumento. */
  rango: readonly [number, number]
  /** Notas simultáneas que admite el instrumento. Sin límite si no se indica. */
  polifonia?: number | undefined
}

export interface Edicion {
  notas: Nota[]
  /** Posición, en `notas`, de la nota que se ha tocado; `undefined` si no se ha hecho nada o se ha borrado. */
  indice: number | undefined
}

function ordenar(notas: Nota[], tocada?: Nota): Edicion {
  const ordenadas = [...notas].sort((a, b) => a.t - b.t || a.n - b.n)
  return { notas: ordenadas, indice: tocada === undefined ? undefined : ordenadas.indexOf(tocada) }
}

/** ¿Se estorban estas dos notas? Solo si coinciden en el tiempo y, salvo en un instrumento de una voz, en la altura. */
function sePisan(a: Nota, b: Nota, limites: Limites): boolean {
  if (a.t >= b.t + b.d || b.t >= a.t + a.d) return false
  return limites.polifonia === 1 || a.n === b.n
}

/** Posición de la nota que suena en un instante y una altura, o −1 si no hay ninguna. */
export function notaEn(notas: readonly Nota[], t: number, n: number): number {
  return notas.findIndex((nota) => nota.n === n && nota.t <= t && t < nota.t + nota.d)
}

/**
 * Pone una nota. Si choca con la siguiente, se acorta hasta donde empieza
 * esa. Si el sitio donde empieza ya está ocupado, no se pone.
 */
export function ponerNota(notas: readonly Nota[], nueva: Nota, limites: Limites): Edicion {
  const sinCambios: Edicion = { notas: [...notas], indice: undefined }
  if (nueva.t < 0 || nueva.t >= limites.total || nueva.n < limites.rango[0] || nueva.n > limites.rango[1] || nueva.d <= 0) return sinCambios
  let fin = Math.min(nueva.t + nueva.d, limites.total)
  for (const otra of notas) {
    if (limites.polifonia !== 1 && otra.n !== nueva.n) continue
    // Ya suena algo ahí: no hay sitio.
    if (otra.t <= nueva.t && nueva.t < otra.t + otra.d) return sinCambios
    if (otra.t > nueva.t) fin = Math.min(fin, otra.t)
  }
  const puesta: Nota = { ...nueva, d: fin - nueva.t }
  return ordenar([...notas, puesta], puesta)
}

export function quitarNota(notas: readonly Nota[], indice: number): Edicion {
  return { notas: notas.filter((_, i) => i !== indice), indice: undefined }
}

/** Mueve una nota a otro instante y otra altura. Si allí chocaría con otra o se saldría de la pieza o del instrumento, no se mueve. */
export function moverNota(notas: readonly Nota[], indice: number, destino: { t: number; n: number }, limites: Limites): Edicion {
  const nota = notas[indice]
  if (!nota) return { notas: [...notas], indice: undefined }
  const movida: Nota = { ...nota, t: destino.t, n: destino.n }
  const cabe = movida.t >= 0 && movida.t + movida.d <= limites.total && movida.n >= limites.rango[0] && movida.n <= limites.rango[1]
  if (!cabe || notas.some((otra, i) => i !== indice && sePisan(movida, otra, limites))) return { notas: [...notas], indice }
  return ordenar(
    notas.map((otra, i) => (i === indice ? movida : otra)),
    movida,
  )
}

/** Cambia la duración de una nota. Se frena en la siguiente nota con la que chocaría y en el final de la pieza; nunca baja de `minimo`. */
export function estirarNota(notas: readonly Nota[], indice: number, duracion: number, minimo: number, limites: Limites): Edicion {
  const nota = notas[indice]
  if (!nota) return { notas: [...notas], indice: undefined }
  let tope = limites.total - nota.t
  for (const [i, otra] of notas.entries()) {
    if (i === indice || otra.t <= nota.t) continue
    if (limites.polifonia === 1 || otra.n === nota.n) tope = Math.min(tope, otra.t - nota.t)
  }
  const estirada: Nota = { ...nota, d: Math.max(Math.min(minimo, tope), Math.min(duracion, tope)) }
  return ordenar(
    notas.map((otra, i) => (i === indice ? estirada : otra)),
    estirada,
  )
}

// ───────────────────────────── deshacer ─────────────────────────────

export interface Historial<T> {
  pasado: readonly T[]
  presente: T
  futuro: readonly T[]
}

/** Pasos que se pueden deshacer, como mucho. */
export const PASOS_DE_HISTORIAL = 100

export function historialDe<T>(presente: T): Historial<T> {
  return { pasado: [], presente, futuro: [] }
}

/** Apunta un estado nuevo. Lo que se había deshecho deja de poder rehacerse. */
export function hacer<T>(historial: Historial<T>, nuevo: T): Historial<T> {
  if (nuevo === historial.presente) return historial
  return { pasado: [...historial.pasado, historial.presente].slice(-PASOS_DE_HISTORIAL), presente: nuevo, futuro: [] }
}

export function deshacer<T>(historial: Historial<T>): Historial<T> {
  const anterior = historial.pasado.at(-1)
  if (anterior === undefined) return historial
  return { pasado: historial.pasado.slice(0, -1), presente: anterior, futuro: [historial.presente, ...historial.futuro] }
}

export function rehacer<T>(historial: Historial<T>): Historial<T> {
  const [siguiente, ...resto] = historial.futuro
  if (siguiente === undefined) return historial
  return { pasado: [...historial.pasado, historial.presente], presente: siguiente, futuro: resto }
}
