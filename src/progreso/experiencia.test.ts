import { describe, expect, it } from 'vitest'
import { XP, nivelDe, xpDeLeccion, xpParaNivel, xpTotal } from './experiencia.ts'

describe('niveles', () => {
  it('cada nivel cuesta 30 puntos más que el anterior, empezando por 50', () => {
    expect([1, 2, 3, 4, 5].map(xpParaNivel)).toEqual([0, 50, 130, 240, 380])
    for (let n = 2; n < 40; n++) expect(xpParaNivel(n + 1) - xpParaNivel(n) - (xpParaNivel(n) - xpParaNivel(n - 1))).toBe(30)
  })

  it('el nivel sale de la experiencia total', () => {
    expect(nivelDe(0)).toEqual({ nivel: 1, enNivel: 0, paraElSiguiente: 50 })
    expect(nivelDe(49)).toEqual({ nivel: 1, enNivel: 49, paraElSiguiente: 50 })
    expect(nivelDe(50)).toEqual({ nivel: 2, enNivel: 0, paraElSiguiente: 80 })
    expect(nivelDe(129)).toEqual({ nivel: 2, enNivel: 79, paraElSiguiente: 80 })
    expect(nivelDe(130).nivel).toBe(3)
    expect(nivelDe(8740).nivel).toBe(24)
  })

  it('una experiencia imposible no rompe nada', () => {
    expect(nivelDe(-5).nivel).toBe(1)
    expect(nivelDe(12.9)).toEqual({ nivel: 1, enNivel: 12, paraElSiguiente: 50 })
    expect(xpParaNivel(0)).toBe(0)
  })

  it('el nivel nunca baja al ganar experiencia', () => {
    let anterior = 1
    for (let xp = 0; xp < 3000; xp += 7) {
      const { nivel, enNivel, paraElSiguiente } = nivelDe(xp)
      expect(nivel).toBeGreaterThanOrEqual(anterior)
      expect(enNivel).toBeLessThan(paraElSiguiente)
      anterior = nivel
    }
  })
})

describe('experiencia', () => {
  it('una lección nueva da más que repetirla, y un encargo suma', () => {
    expect(xpDeLeccion(true, false)).toBe(XP.leccion)
    expect(xpDeLeccion(true, true)).toBe(XP.leccion + XP.encargo)
    expect(xpDeLeccion(false, true)).toBe(XP.repeticion)
    expect(XP.repeticion).toBeLessThan(XP.leccion)
  })

  it('el total es la suma de los días', () => {
    expect(xpTotal({})).toBe(0)
    expect(xpTotal({ '2026-10-01': { dia: '2026-10-01', xp: 40, lecciones: 2, repasos: 0 }, '2026-10-03': { dia: '2026-10-03', xp: 9, lecciones: 0, repasos: 3 } })).toBe(49)
  })
})
