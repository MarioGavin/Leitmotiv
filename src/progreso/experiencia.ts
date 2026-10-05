/**
 * Experiencia y nivel. Es una gamificación sobria: la experiencia solo sube,
 * se gana por terminar cosas y no por acertar más o más deprisa.
 */
import type { DiaDeEstudio } from './tipos.ts'

/** Experiencia por cada cosa que se termina. */
export const XP = {
  /** Completar una lección por primera vez. */
  leccion: 20,
  /** Lo que suma, además, que la lección termine en un encargo de compositor. */
  encargo: 20,
  /** Volver a completar una lección ya hecha. */
  repeticion: 5,
  /** Cada concepto repasado en una sesión de repaso. */
  repaso: 3,
  /** Cada unidad dada por sabida en la prueba de nivel. */
  unidadSuperada: 10,
} as const

/** Experiencia total necesaria para llegar a un nivel (el 1 es el de partida). Cada nivel cuesta 30 puntos más que el anterior. */
export function xpParaNivel(nivel: number): number {
  const n = Math.max(1, Math.floor(nivel))
  return (n - 1) * (50 + 15 * (n - 2))
}

export interface Nivel {
  nivel: number
  /** Experiencia ganada dentro de este nivel. */
  enNivel: number
  /** Experiencia que hace falta dentro de este nivel para pasar al siguiente. */
  paraElSiguiente: number
}

export function nivelDe(xp: number): Nivel {
  const total = Math.max(0, Math.floor(xp))
  let nivel = 1
  while (xpParaNivel(nivel + 1) <= total) nivel++
  const base = xpParaNivel(nivel)
  return { nivel, enNivel: total - base, paraElSiguiente: xpParaNivel(nivel + 1) - base }
}

/** Experiencia total: la suma de la de todos los días. */
export function xpTotal(diario: Readonly<Record<string, DiaDeEstudio>>): number {
  return Object.values(diario).reduce((suma, dia) => suma + dia.xp, 0)
}

/** Experiencia que da completar una lección. */
export function xpDeLeccion(primeraVez: boolean, conEncargo: boolean): number {
  if (!primeraVez) return XP.repeticion
  return XP.leccion + (conEncargo ? XP.encargo : 0)
}
