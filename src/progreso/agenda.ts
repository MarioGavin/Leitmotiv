/**
 * Qué toca repasar y con qué ejercicio. No programa nada (eso es repaso.ts,
 * con FSRS): solo lee las fechas de las tarjetas, así que no arrastra ninguna
 * librería y puede usarse desde cualquier pantalla.
 */
import type { Concepto, IndiceDelCurso, TipoDePaso } from '../contenido/tipos.ts'
import type { Tarjeta } from './tipos.ts'

/** Conceptos que se repasan, como mucho, en una sesión: de cinco a diez minutos. */
export const REPASOS_POR_SESION = 8

/** Tipos de paso que sirven como ejercicio suelto de repaso. */
const REPASABLES: ReadonlySet<TipoDePaso> = new Set(['oido', 'ritmo', 'construccion', 'analisis', 'capas'])

/** Último instante del día de una fecha, en la hora del dispositivo. */
function finDelDia(fecha: Date): number {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 23, 59, 59, 999).getTime()
}

/** Tarjetas que tocan hoy o están atrasadas, de la más atrasada a la más reciente. */
export function pendientes(tarjetas: Readonly<Record<string, Tarjeta>>, ahora: Date): Tarjeta[] {
  const limite = finDelDia(ahora)
  return Object.values(tarjetas)
    .filter((t) => Date.parse(t.fsrs.due) <= limite)
    .sort((a, b) => Date.parse(a.fsrs.due) - Date.parse(b.fsrs.due) || a.concepto.localeCompare(b.concepto))
}

/** Cuándo toca el próximo repaso, si hoy no hay ninguno pendiente. */
export function proximoRepaso(tarjetas: Readonly<Record<string, Tarjeta>>, ahora: Date): Date | undefined {
  const limite = finDelDia(ahora)
  const futuras = Object.values(tarjetas)
    .map((t) => Date.parse(t.fsrs.due))
    .filter((d) => d > limite)
  return futuras.length === 0 ? undefined : new Date(Math.min(...futuras))
}

export interface EjercicioDeRepaso {
  concepto: string
  /** Paso con el que se repasa: «m00.u01.l02#4» (lección y número de paso desde 1). */
  paso: string
}

/** «m00.u01.l02#4» → lección y posición (desde 0), o `undefined` si no tiene esa forma. */
export function leerPaso(paso: string): { leccion: string; indice: number } | undefined {
  const m = /^(m\d{2}\.u\d{2}\.l\d{2})#(\d+)$/.exec(paso)
  if (!m) return undefined
  return { leccion: m[1] as string, indice: Number(m[2]) - 1 }
}

interface DatosDeSesion {
  tarjetas: Readonly<Record<string, Tarjeta>>
  conceptos: readonly Concepto[]
  indice: IndiceDelCurso
  /** Lecciones completadas: solo se repasa con ejercicios que el usuario ya ha visto. */
  completadas: ReadonlySet<string>
  ahora: Date
  /** Número al azar en [0, 1). */
  azar: () => number
  /** Si no hay nada pendiente, repasa igualmente lo que antes vaya a tocar. */
  aunqueNoToque?: boolean
  limite?: number
}

/**
 * Monta una sesión de repaso: los conceptos pendientes, cada uno con un
 * ejercicio de una lección ya completada. Si un concepto tiene varios
 * ejercicios, no repite el de la última vez.
 */
export function sesionDeRepaso({ tarjetas, conceptos, indice, completadas, ahora, azar, aunqueNoToque = false, limite = REPASOS_POR_SESION }: DatosDeSesion): EjercicioDeRepaso[] {
  const tipos = new Map<string, readonly TipoDePaso[]>()
  for (const mundo of indice.mundos) for (const unidad of mundo.unidades) for (const leccion of unidad.lecciones) tipos.set(leccion.id, leccion.pasos)
  const pasosDe = new Map(conceptos.map((c) => [c.id, c.pasos]))

  let candidatas = pendientes(tarjetas, ahora)
  if (candidatas.length === 0 && aunqueNoToque) {
    candidatas = Object.values(tarjetas).sort((a, b) => Date.parse(a.fsrs.due) - Date.parse(b.fsrs.due) || a.concepto.localeCompare(b.concepto))
  }

  const sesion: EjercicioDeRepaso[] = []
  for (const tarjeta of candidatas) {
    if (sesion.length >= limite) break
    const posibles = (pasosDe.get(tarjeta.concepto) ?? []).filter((paso) => {
      const leido = leerPaso(paso)
      if (!leido || !completadas.has(leido.leccion)) return false
      const tipo = tipos.get(leido.leccion)?.[leido.indice]
      return tipo !== undefined && REPASABLES.has(tipo)
    })
    if (posibles.length === 0) continue
    const distintos = posibles.length > 1 ? posibles.filter((paso) => paso !== tarjeta.ultimoPaso) : posibles
    sesion.push({ concepto: tarjeta.concepto, paso: distintos[Math.floor(azar() * distintos.length)] as string })
  }
  return sesion
}
