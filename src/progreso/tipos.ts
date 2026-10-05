/**
 * Lo que se guarda del progreso del usuario. Todo es JSON puro: es lo que va a
 * IndexedDB y lo que viaja en la copia de seguridad.
 */
import type { Pieza } from '../musica/pieza.ts'

export interface RegistroDeLeccion {
  /** «m00.u01.l02». */
  id: string
  /** Cuándo se completó por primera vez (fecha ISO). */
  completada: string
  /** Cuándo se completó por última vez. */
  ultima: string
  /** Veces que se ha completado. */
  veces: number
  /** Mejor proporción de aciertos, de 0 a 1. */
  mejor: number
}

/** Estado de una tarjeta de FSRS, con las fechas como texto ISO. Es lo que devuelve ts-fsrs al pasar por JSON. */
export interface EstadoFsrs {
  due: string
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  learning_steps: number
  reps: number
  lapses: number
  state: number
  last_review?: string
}

/** Un concepto en el repaso espaciado. */
export interface Tarjeta {
  concepto: string
  fsrs: EstadoFsrs
  /** Paso con el que se repasó la última vez («m00.u01.l02#4»), para no repetir siempre el mismo. */
  ultimoPaso?: string
}

/** Una pieza de «Mi repertorio». */
export interface PiezaGuardada {
  id: string
  titulo: string
  pieza: Pieza
  /** Lección de cuyo encargo sale, si sale de uno. */
  origen?: string
  creada: string
  modificada: string
}

/** Trabajo a medias en un piano roll de una lección, para no perderlo al salir. La clave es el paso: «m00.u01.l08#5». */
export interface Borrador {
  id: string
  pieza: Pieza
  modificada: string
}

/** Lo hecho en un día. */
export interface DiaDeEstudio {
  /** «2026-10-05», en la hora del dispositivo. */
  dia: string
  xp: number
  lecciones: number
  repasos: number
}

/** Todo el progreso, tal como se tiene en memoria. */
export interface DatosDeProgreso {
  lecciones: Record<string, RegistroDeLeccion>
  tarjetas: Record<string, Tarjeta>
  diario: Record<string, DiaDeEstudio>
  /** Unidades dadas por sabidas en la prueba de nivel. */
  superadas: string[]
  repertorio: PiezaGuardada[]
  borradores: Record<string, Borrador>
}

export const PROGRESO_VACIO: DatosDeProgreso = { lecciones: {}, tarjetas: {}, diario: {}, superadas: [], repertorio: [], borradores: {} }

/** Día de una fecha en la hora del dispositivo: «2026-10-05». */
export function diaDe(fecha: Date): string {
  const dos = (n: number): string => String(n).padStart(2, '0')
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`
}
