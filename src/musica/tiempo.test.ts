import { describe, expect, it } from 'vitest'
import { PPQ, escribirCompas, leerCompas, leerFigura, nombreDeFigura, posicionLegible, segundosATicks, ticksASegundos, ticksPorCompas, ticksPorTiempo } from './tiempo.ts'

describe('compases', () => {
  it('lee los compases habituales', () => {
    expect(leerCompas('4/4')).toEqual([4, 4])
    expect(leerCompas('6/8')).toEqual([6, 8])
    expect(leerCompas(' 3/4 ')).toEqual([3, 4])
    expect(escribirCompas([7, 8])).toBe('7/8')
  })

  it('rechaza lo que no es un compás', () => {
    for (const malo of ['4', '4/3', '0/4', 'cuatro/cuatro', '4/4/4', '33/4']) {
      expect(() => leerCompas(malo), malo).toThrow(/Compás no válido/)
    }
  })

  it('calcula la duración del compás y de su unidad', () => {
    expect(ticksPorCompas([4, 4])).toBe(4 * PPQ)
    expect(ticksPorCompas([3, 4])).toBe(3 * PPQ)
    expect(ticksPorCompas([6, 8])).toBe(3 * PPQ)
    expect(ticksPorCompas([5, 4])).toBe(5 * PPQ)
    expect(ticksPorCompas([7, 8])).toBe(3.5 * PPQ)
    expect(ticksPorTiempo([6, 8])).toBe(PPQ / 2)
    expect(ticksPorTiempo([2, 2])).toBe(PPQ * 2)
  })
})

describe('figuras', () => {
  it('convierte figuras en ticks', () => {
    expect(leerFigura('1')).toBe(1920)
    expect(leerFigura('2')).toBe(960)
    expect(leerFigura('4')).toBe(480)
    expect(leerFigura('8')).toBe(240)
    expect(leerFigura('16')).toBe(120)
    expect(leerFigura('32')).toBe(60)
  })

  it('aplica puntillo, doble puntillo y tresillo', () => {
    expect(leerFigura('4.')).toBe(720)
    expect(leerFigura('2.')).toBe(1440)
    expect(leerFigura('4..')).toBe(840)
    expect(leerFigura('8t')).toBe(160)
    expect(leerFigura('4t')).toBe(320)
    expect(leerFigura('16t')).toBe(80)
  })

  it('tres figuras de tresillo ocupan lo que dos normales', () => {
    expect(leerFigura('8t') * 3).toBe(leerFigura('8') * 2)
    expect(leerFigura('4t') * 3).toBe(leerFigura('4') * 2)
  })

  it('rechaza figuras inexistentes', () => {
    for (const mala of ['3', '5', '64', '4t.', 'negra', '']) expect(() => leerFigura(mala), mala).toThrow(/Figura no válida/)
  })

  it('nombra las figuras en castellano', () => {
    expect(nombreDeFigura(480)).toBe('negra')
    expect(nombreDeFigura(720)).toBe('negra con puntillo')
    expect(nombreDeFigura(160)).toBe('corchea de tresillo')
    expect(nombreDeFigura(1920)).toBe('redonda')
    expect(nombreDeFigura(100)).toBeUndefined()
  })
})

describe('posiciones y segundos', () => {
  it('traduce ticks a compás y tiempo', () => {
    expect(posicionLegible(0, [4, 4])).toEqual({ compas: 1, tiempo: 1, resto: 0 })
    expect(posicionLegible(480 * 5 + 120, [4, 4])).toEqual({ compas: 2, tiempo: 2, resto: 120 })
    expect(posicionLegible(240 * 7, [6, 8])).toEqual({ compas: 2, tiempo: 2, resto: 0 })
  })

  it('convierte entre ticks y segundos', () => {
    expect(ticksASegundos(480, 60)).toBe(1)
    expect(ticksASegundos(480, 120)).toBe(0.5)
    expect(ticksASegundos(1920, 120)).toBe(2)
    expect(segundosATicks(2, 120)).toBe(1920)
    expect(segundosATicks(ticksASegundos(777, 93), 93)).toBeCloseTo(777, 6)
  })
})
