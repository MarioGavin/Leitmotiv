/**
 * Tiempo musical. Todo se mide en ticks enteros: 480 por negra (el estándar de
 * los archivos MIDI), así no hay errores de redondeo con tresillos ni puntillos.
 */

/** Ticks por negra. */
export const PPQ = 480

/** Compás como [numerador, denominador]: [6, 8] es un 6/8. */
export type Compas = readonly [number, number]

const DENOMINADORES = [1, 2, 4, 8, 16, 32] as const

/** «4/4», «6/8»… → [4, 4], [6, 8]. Lanza un error si no es un compás válido. */
export function leerCompas(texto: string): Compas {
  const m = /^(\d{1,2})\/(\d{1,2})$/.exec(texto.trim())
  const num = Number(m?.[1])
  const den = Number(m?.[2])
  if (!m || num < 1 || num > 32 || !DENOMINADORES.includes(den as (typeof DENOMINADORES)[number])) {
    throw new Error(`Compás no válido: «${texto}». Usa la forma 4/4, 3/4, 6/8…`)
  }
  return [num, den]
}

export function escribirCompas([num, den]: Compas): string {
  return `${num}/${den}`
}

/** Duración de un compás completo, en ticks. */
export function ticksPorCompas([num, den]: Compas): number {
  return (num * PPQ * 4) / den
}

/** Duración en ticks de la unidad del compás (la figura que indica el denominador). */
export function ticksPorTiempo([, den]: Compas): number {
  return (PPQ * 4) / den
}

/** ¿Es un compás compuesto (6/8, 9/8, 12/8)? Sus tiempos se agrupan de tres en tres. */
export function esCompasCompuesto([num, den]: Compas): boolean {
  return den >= 8 && num % 3 === 0 && num > 3
}

/** Duración del pulso, en ticks: la unidad del compás o, en los compuestos, tres unidades (en un 6/8, la negra con puntillo). */
export function ticksPorPulso(compas: Compas): number {
  return ticksPorTiempo(compas) * (esCompasCompuesto(compas) ? 3 : 1)
}

/**
 * Lee una figura escrita como número: 1 redonda, 2 blanca, 4 negra, 8 corchea,
 * 16 semicorchea, 32 fusa. Un punto añade la mitad («4.»); una «t» la convierte
 * en figura de tresillo («8t»: tres ocupan lo que dos).
 */
export function leerFigura(texto: string): number {
  const m = /^(1|2|4|8|16|32)(\.{0,2})(t?)$/.exec(texto)
  if (!m) throw new Error(`Figura no válida: «${texto}». Usa 1, 2, 4, 8, 16 o 32, con «.» para el puntillo y «t» para el tresillo.`)
  let ticks = (PPQ * 4) / Number(m[1])
  const puntos = (m[2] ?? '').length
  if (puntos === 1) ticks *= 1.5
  if (puntos === 2) ticks *= 1.75
  if (m[3] === 't') ticks = (ticks * 2) / 3
  if (!Number.isInteger(ticks)) throw new Error(`La figura «${texto}» no cabe en la rejilla de ${PPQ} ticks por negra.`)
  return ticks
}

const NOMBRES_FIGURA: ReadonlyArray<readonly [number, string]> = [
  [PPQ * 4, 'redonda'],
  [PPQ * 2, 'blanca'],
  [PPQ, 'negra'],
  [PPQ / 2, 'corchea'],
  [PPQ / 4, 'semicorchea'],
  [PPQ / 8, 'fusa'],
]

/** Nombre en castellano de una duración («negra con puntillo», «corchea de tresillo»), o `undefined` si no es una figura simple. */
export function nombreDeFigura(ticks: number): string | undefined {
  for (const [base, nombre] of NOMBRES_FIGURA) {
    if (ticks === base) return nombre
    if (ticks === base * 1.5) return `${nombre} con puntillo`
    if (ticks === (base * 2) / 3) return `${nombre} de tresillo`
  }
  return undefined
}

/** Posición «compás:tiempo» (ambos desde 1) de un instante en ticks. */
export function posicionLegible(ticks: number, compas: Compas): { compas: number; tiempo: number; resto: number } {
  const porCompas = ticksPorCompas(compas)
  const porTiempo = ticksPorTiempo(compas)
  const enCompas = ticks % porCompas
  return {
    compas: Math.floor(ticks / porCompas) + 1,
    tiempo: Math.floor(enCompas / porTiempo) + 1,
    resto: enCompas % porTiempo,
  }
}

/** Segundos que dura un número de ticks a un tempo dado (negras por minuto). */
export function ticksASegundos(ticks: number, tempo: number): number {
  return (ticks / PPQ) * (60 / tempo)
}

export function segundosATicks(segundos: number, tempo: number): number {
  return (segundos * tempo * PPQ) / 60
}
