/**
 * Nombres de notas e intervalos.
 *
 * Por dentro todo usa la notación científica anglosajona (C4, F#5, Bb3) y
 * números MIDI con Do central = C4 = 60, que es lo que entiende Tonal. La
 * nomenclatura latina (Do, Re, Mi…) es solo una capa de presentación.
 */
import { Interval, Note } from 'tonal'

/** Cómo se muestran las notas al usuario. */
export type Nomenclatura = 'latina' | 'anglosajona'

const PATRON_NOTA = /^([A-G])(#{1,2}|b{1,2})?(-?\d)$/
const PATRON_CLASE = /^([A-G])(#{1,2}|b{1,2})?$/

const LATINAS: Readonly<Record<string, string>> = { C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' }

export function esNota(texto: string): boolean {
  return PATRON_NOTA.test(texto)
}

export function esClaseDeNota(texto: string): boolean {
  return PATRON_CLASE.test(texto)
}

/** «C4» → 60. Lanza un error si el texto no es una nota con octava. */
export function midiDe(nota: string): number {
  const midi = PATRON_NOTA.test(nota) ? Note.midi(nota) : null
  if (midi === null || midi < 0 || midi > 127) throw new Error(`Nota no válida: «${nota}». Escribe la letra, la alteración y la octava: C4, F#5, Bb3.`)
  return midi
}

/** 61 → «C#4» (o «Db4» si se piden bemoles). */
export function notaDeMidi(midi: number, alteraciones: 'sostenidos' | 'bemoles' = 'sostenidos'): string {
  return alteraciones === 'sostenidos' ? Note.fromMidiSharps(midi) : Note.fromMidi(midi)
}

/** Clase de nota (0–11): Do = 0, Do♯ = 1… */
export function croma(notaOClase: string): number {
  const c = Note.chroma(notaOClase)
  if (c === undefined || Number.isNaN(c)) throw new Error(`Nota no válida: «${notaOClase}».`)
  return c
}

export function cromaDeMidi(midi: number): number {
  return ((midi % 12) + 12) % 12
}

/**
 * Nombre para mostrar: «F#5» → «Fa♯5» en nomenclatura latina, «F♯5» en
 * anglosajona. Acepta notas con o sin octava.
 */
export function nombreVisible(notaOClase: string, nomenclatura: Nomenclatura, opciones: { octava?: boolean } = {}): string {
  const m = PATRON_NOTA.exec(notaOClase) ?? PATRON_CLASE.exec(notaOClase)
  if (!m) return notaOClase
  const letra = m[1] ?? ''
  const alteracion = (m[2] ?? '').replaceAll('#', '♯').replaceAll('b', '♭')
  const octava = opciones.octava === false ? '' : (m[3] ?? '')
  const base = nomenclatura === 'latina' ? (LATINAS[letra] ?? letra) : letra
  return `${base}${alteracion}${octava}`
}

/**
 * Cifrado de acorde para mostrar. El cifrado americano se deja tal cual (solo
 * se embellecen las alteraciones); en nomenclatura latina no se traduce la
 * fundamental porque «Cmaj7» es como se escribe en cualquier partitura o DAW.
 */
export function cifradoVisible(simbolo: string): string {
  return simbolo.replace(/([A-G])(#|b)/g, (_, letra: string, alt: string) => `${letra}${alt === '#' ? '♯' : '♭'}`)
}

// ───────────────────────────── intervalos ─────────────────────────────

const CALIDADES: Readonly<Record<string, string>> = { P: 'justa', M: 'mayor', m: 'menor', A: 'aumentada', d: 'disminuida' }
const ORDINALES_F = ['', 'unísono', '2.ª', '3.ª', '4.ª', '5.ª', '6.ª', '7.ª', '8.ª', '9.ª', '10.ª', '11.ª', '12.ª', '13.ª']

/**
 * En castellano los intervalos justos se abrevian con J (4J, 5J, 8J); Tonal
 * usa P. Esta función admite las dos formas y devuelve la de Tonal.
 */
export function normalizarIntervalo(texto: string): string {
  const limpio = texto.trim().replace(/^(-?\d+)J$/, '$1P')
  const i = Interval.get(limpio)
  // Tonal da por buenos «5M» o «4m»; una quinta o una cuarta no pueden ser mayores ni menores.
  const calidadImposible = i.type === 'perfectable' && (i.q === 'M' || i.q === 'm')
  if (i.empty || calidadImposible || i.semitones === null || i.semitones === undefined || (i.num ?? 0) === 0) {
    throw new Error(`Intervalo no válido: «${texto}». Ejemplos: 2m, 3M, 4J, 5J, 7m, 8J.`)
  }
  return i.name
}

/** «3M» → «3.ª mayor»; «5P» → «5.ª justa»; «4A» → «4.ª aumentada». */
export function nombreDeIntervalo(intervalo: string): string {
  const i = Interval.get(normalizarIntervalo(intervalo))
  const num = Math.abs(i.num ?? 0)
  if (num === 1 && i.q === 'P') return 'unísono'
  if (num === 8 && i.q === 'P') return 'octava justa'
  const ordinal = ORDINALES_F[num] ?? `${num}.ª`
  return `${ordinal} ${CALIDADES[i.q ?? ''] ?? ''}`.trim()
}

/** Semitonos de un intervalo (siempre positivo). */
export function semitonos(intervalo: string): number {
  return Math.abs(Interval.semitones(normalizarIntervalo(intervalo)) ?? 0)
}

/** Intervalo entre dos notas, de la más grave a la más aguda: («C4», «E4») → «3M». */
export function intervaloEntre(a: string, b: string): string {
  const [grave, aguda] = midiDe(a) <= midiDe(b) ? [a, b] : [b, a]
  return Interval.distance(grave, aguda)
}

/** Transporta una nota un intervalo hacia arriba (o hacia abajo si `descendente`). */
export function transportar(nota: string, intervalo: string, descendente = false): string {
  const nombre = normalizarIntervalo(intervalo)
  const resultado = Note.transpose(nota, descendente ? `-${nombre}` : nombre)
  if (!resultado) throw new Error(`No se puede transportar «${nota}» un intervalo de «${intervalo}».`)
  return resultado
}
