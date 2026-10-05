/**
 * Lógica del ejercicio de ritmo: qué suena y cuándo (el plan) y cómo se puntúan
 * los toques del usuario. Sin audio ni interfaz: solo tiempos, en segundos.
 */
import type { PasoRitmo } from '../contenido/tipos.ts'
import { ticksASegundos, ticksPorCompas, ticksPorTiempo } from './tiempo.ts'

export type Tolerancia = PasoRitmo['tolerancia']

/** Margen a cada lado del golpe dentro del cual un toque cuenta como acierto, en milisegundos. */
export const VENTANA_MS: Readonly<Record<Tolerancia, number>> = { amplia: 150, normal: 110, estricta: 70 }

export interface Golpe {
  /** Segundos desde el principio del plan. */
  t: number
  /** Golpe acentuado (o primer tiempo del compás, en la claqueta). */
  fuerte: boolean
}

export interface Tramo {
  desde: number
  hasta: number
  /** `claqueta`: cuenta previa · `escucha`: suena el patrón y el usuario no toca · `toca`: el turno del usuario. */
  tipo: 'claqueta' | 'escucha' | 'toca'
}

export interface PlanDeRitmo {
  /** Duración total, en segundos. */
  duracion: number
  /** Segundos que dura un tiempo del compás. */
  tiempo: number
  /** Clics de claqueta. */
  claqueta: Golpe[]
  /** Golpes del patrón que suenan (de referencia o de ejemplo). */
  patron: Golpe[]
  /** Golpes que tiene que dar el usuario. */
  esperados: Golpe[]
  tramos: Tramo[]
}

type DatosDePlan = Pick<PasoRitmo, 'modo' | 'tempo' | 'compas' | 'golpes' | 'acentos' | 'duracion' | 'cuentaAtras' | 'repeticiones' | 'guia'>

/**
 * Convierte un paso de ritmo en la lista de lo que suena y de lo que se espera
 * del usuario, con sus instantes.
 *
 * - `seguir`: cuenta previa y, después, el usuario toca el patrón las veces que se pida.
 * - `eco`: tras la cuenta previa se alternan una vuelta de escucha (suena el patrón) y una del usuario.
 * - `leer`: como `seguir`, pero el patrón no suena nunca: se toca leyéndolo.
 *
 * Mientras toca el usuario suena la guía que indique el paso.
 */
export function planDeRitmo(paso: DatosDePlan): PlanDeRitmo {
  const s = (ticks: number): number => ticksASegundos(ticks, paso.tempo)
  const porCompas = ticksPorCompas(paso.compas)
  const porTiempo = ticksPorTiempo(paso.compas)
  const claqueta: Golpe[] = []
  const patron: Golpe[] = []
  const esperados: Golpe[] = []
  const tramos: Tramo[] = []

  const clics = (desde: number, hasta: number, soloPrimero: boolean): void => {
    for (let t = desde; t < hasta; t += porTiempo) {
      const primero = (t - desde) % porCompas === 0
      if (soloPrimero && !primero) continue
      claqueta.push({ t: s(t), fuerte: primero })
    }
  }
  const golpesEn = (inicio: number): Golpe[] => paso.golpes.map((g, i) => ({ t: s(inicio + g), fuerte: paso.acentos[i] ?? false }))

  let cursor = 0
  const cuenta = paso.cuentaAtras * porCompas
  clics(0, cuenta, false)
  tramos.push({ desde: 0, hasta: s(cuenta), tipo: 'claqueta' })
  cursor = cuenta

  for (let vuelta = 0; vuelta < paso.repeticiones; vuelta++) {
    if (paso.modo === 'eco') {
      patron.push(...golpesEn(cursor))
      clics(cursor, cursor + paso.duracion, false)
      tramos.push({ desde: s(cursor), hasta: s(cursor + paso.duracion), tipo: 'escucha' })
      cursor += paso.duracion
    }
    esperados.push(...golpesEn(cursor))
    if (paso.guia === 'patron') patron.push(...golpesEn(cursor))
    else if (paso.guia === 'claqueta') clics(cursor, cursor + paso.duracion, false)
    else if (paso.guia === 'compas') clics(cursor, cursor + paso.duracion, true)
    tramos.push({ desde: s(cursor), hasta: s(cursor + paso.duracion), tipo: 'toca' })
    cursor += paso.duracion
  }

  // Los tramos seguidos del mismo tipo se funden en uno.
  const fundidos: Tramo[] = []
  for (const tramo of tramos) {
    const anterior = fundidos[fundidos.length - 1]
    if (anterior && anterior.tipo === tramo.tipo) anterior.hasta = tramo.hasta
    else fundidos.push({ ...tramo })
  }
  return { duracion: s(cursor), tiempo: s(porTiempo), claqueta, patron, esperados, tramos: fundidos }
}

export interface ResultadoDeRitmo {
  /** Por cada golpe esperado, cuánto se ha desviado su toque en milisegundos (negativo: adelantado), o `null` si no lo ha habido. */
  desviaciones: Array<number | null>
  aciertos: number
  /** Golpes esperados sin ningún toque cerca. */
  perdidos: number
  /** Toques que no corresponden a ningún golpe. */
  sobrantes: number
  /** Media de las desviaciones de los aciertos, en milisegundos. Negativa: tiende a adelantarse. */
  sesgo: number
  /** Desviación típica de los aciertos, en milisegundos: lo regular que ha sido. */
  dispersion: number
  /** Proporción de golpes acertados, de 0 a 1. */
  precision: number
  aprobado: boolean
  /** Lo más útil que se le puede decir al usuario sobre cómo ha ido. */
  diagnostico: 'bien' | 'adelantado' | 'atrasado' | 'irregular' | 'faltan' | 'sobran' | 'sin-toques'
}

/** Proporción de golpes que hay que acertar para aprobar. */
export const PRECISION_MINIMA = 0.8

/**
 * Puntúa unos toques contra los golpes esperados. Los dos van en segundos y en
 * el mismo reloj; a los toques ya se les ha restado la latencia calibrada.
 *
 * Cada golpe se empareja con el toque libre más cercano dentro de la ventana de
 * tolerancia. Si los golpes están muy juntos, la ventana se estrecha para que
 * un toque nunca pueda valer para dos.
 */
export function puntuarRitmo(esperados: readonly number[], toques: readonly number[], tolerancia: Tolerancia): ResultadoDeRitmo {
  const golpes = [...esperados].sort((a, b) => a - b)
  const libres = [...toques].sort((a, b) => a - b)
  let separacion = Number.POSITIVE_INFINITY
  for (let i = 1; i < golpes.length; i++) separacion = Math.min(separacion, (golpes[i] as number) - (golpes[i - 1] as number))
  const ventana = Math.min(VENTANA_MS[tolerancia] / 1000, separacion * 0.45)

  const desviaciones: Array<number | null> = []
  for (const golpe of golpes) {
    let mejor = -1
    for (let i = 0; i < libres.length; i++) {
      const distancia = Math.abs((libres[i] as number) - golpe)
      if (distancia <= ventana && (mejor < 0 || distancia < Math.abs((libres[mejor] as number) - golpe))) mejor = i
    }
    if (mejor < 0) {
      desviaciones.push(null)
    } else {
      desviaciones.push(((libres[mejor] as number) - golpe) * 1000)
      libres.splice(mejor, 1)
    }
  }

  const acertadas = desviaciones.filter((d): d is number => d !== null)
  const aciertos = acertadas.length
  const perdidos = golpes.length - aciertos
  const sobrantes = libres.length
  const sesgo = aciertos > 0 ? acertadas.reduce((suma, d) => suma + d, 0) / aciertos : 0
  const dispersion = aciertos > 1 ? Math.sqrt(acertadas.reduce((suma, d) => suma + (d - sesgo) ** 2, 0) / aciertos) : 0
  const precision = golpes.length > 0 ? aciertos / golpes.length : 0
  const demasiados = sobrantes > Math.ceil(golpes.length * 0.25)
  const aprobado = precision >= PRECISION_MINIMA && !demasiados

  let diagnostico: ResultadoDeRitmo['diagnostico']
  const limite = (ventana * 1000) / 2
  if (toques.length === 0) diagnostico = 'sin-toques'
  else if (demasiados) diagnostico = 'sobran'
  else if (!aprobado) diagnostico = Math.abs(sesgo) > limite ? (sesgo < 0 ? 'adelantado' : 'atrasado') : 'faltan'
  else if (Math.abs(sesgo) > limite) diagnostico = sesgo < 0 ? 'adelantado' : 'atrasado'
  else if (dispersion > limite) diagnostico = 'irregular'
  else diagnostico = 'bien'

  return { desviaciones, aciertos, perdidos, sobrantes, sesgo, dispersion, precision, aprobado, diagnostico }
}

/** Mediana de las desviaciones de unos toques respecto a sus golpes: lo que mide la calibración de latencia. */
export function latenciaMedida(esperados: readonly number[], toques: readonly number[]): number | undefined {
  // Ventana muy amplia: la latencia que se quiere medir puede ser grande (auriculares Bluetooth).
  const desviaciones: number[] = []
  for (const toque of toques) {
    let mejor: number | undefined
    for (const golpe of esperados) {
      const d = (toque - golpe) * 1000
      if (mejor === undefined || Math.abs(d) < Math.abs(mejor)) mejor = d
    }
    if (mejor !== undefined && Math.abs(mejor) < 400) desviaciones.push(mejor)
  }
  if (desviaciones.length < 4) return undefined
  desviaciones.sort((a, b) => a - b)
  const medio = Math.floor(desviaciones.length / 2)
  const mediana = desviaciones.length % 2 === 1 ? (desviaciones[medio] as number) : ((desviaciones[medio - 1] as number) + (desviaciones[medio] as number)) / 2
  return Math.round(mediana)
}
