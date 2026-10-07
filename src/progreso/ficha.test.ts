import { describe, expect, it } from 'vitest'
import { fichaDelJugador } from './ficha.ts'
import type { DiaDeEstudio } from './tipos.ts'

function dia(fecha: string, xp: number, lecciones = 1): DiaDeEstudio {
  return { dia: fecha, xp, lecciones, repasos: 0 }
}

describe('ficha del jugador', () => {
  it('sin nada hecho: nivel 1, sin experiencia y sin racha', () => {
    expect(fichaDelJugador({}, '2026-10-07')).toEqual({
      xp: 0,
      nivel: { nivel: 1, enNivel: 0, paraElSiguiente: 50 },
      racha: { dias: 0, mejor: 0, hoy: false },
    })
  })

  it('suma la experiencia de todos los días y saca de ella el nivel', () => {
    const diario = { '2026-10-05': dia('2026-10-05', 40), '2026-10-06': dia('2026-10-06', 20) }
    const ficha = fichaDelJugador(diario, '2026-10-07')
    expect(ficha.xp).toBe(60)
    expect(ficha.nivel).toEqual({ nivel: 2, enNivel: 10, paraElSiguiente: 80 })
  })

  it('la racha cuenta los días estudiados y dice si hoy ya se ha estudiado', () => {
    const diario = { '2026-10-06': dia('2026-10-06', 20), '2026-10-07': dia('2026-10-07', 5) }
    expect(fichaDelJugador(diario, '2026-10-07').racha).toEqual({ dias: 2, mejor: 2, hoy: true })
    expect(fichaDelJugador(diario, '2026-10-08').racha).toMatchObject({ dias: 2, hoy: false })
  })

  it('un día guardado sin nada hecho no cuenta para la racha', () => {
    const diario = { '2026-10-06': dia('2026-10-06', 20), '2026-10-07': dia('2026-10-07', 0, 0) }
    expect(fichaDelJugador(diario, '2026-10-07').racha).toMatchObject({ dias: 1, hoy: false })
  })
})
