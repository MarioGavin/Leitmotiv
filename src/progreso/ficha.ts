/**
 * La ficha del jugador: nivel, experiencia y racha, calculados a partir del
 * diario. Es lo que enseñan el título, el mapa y cada mundo.
 */
import { type Nivel, nivelDe, xpTotal } from './experiencia.ts'
import { type Racha, rachaDe } from './racha.ts'
import type { DiaDeEstudio } from './tipos.ts'

export interface Ficha {
  /** Experiencia total. */
  xp: number
  nivel: Nivel
  racha: Racha
}

/** @param hoy El día de hoy, como «2026-10-05». */
export function fichaDelJugador(diario: Readonly<Record<string, DiaDeEstudio>>, hoy: string): Ficha {
  const xp = xpTotal(diario)
  // Un día sin nada hecho (no debería guardarse, pero una copia de seguridad puede traerlo) no cuenta para la racha.
  const dias = Object.values(diario)
    .filter((d) => d.xp > 0 || d.lecciones > 0 || d.repasos > 0)
    .map((d) => d.dia)
  return { xp, nivel: nivelDe(xp), racha: rachaDe(dias, hoy) }
}
