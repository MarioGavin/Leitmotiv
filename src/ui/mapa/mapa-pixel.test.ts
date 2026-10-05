import { describe, expect, it } from 'vitest'
import { ANCHO, trazarPlano } from './mapa-pixel.ts'

describe('plano del mapa del mundo', () => {
  const NODOS = 12
  const plano = trazarPlano(NODOS)
  const en = (x: number, y: number): number => y * plano.ancho + x

  it('tiene un nodo por mundo, todos dentro del mapa y en orden hacia abajo', () => {
    expect(plano.nodos).toHaveLength(NODOS)
    plano.nodos.forEach((nodo, i) => {
      expect(nodo.x).toBeGreaterThanOrEqual(4)
      expect(nodo.x).toBeLessThan(ANCHO - 4)
      expect(nodo.y).toBeGreaterThan(0)
      expect(nodo.y).toBeLessThan(plano.alto)
      if (i > 0) expect(nodo.y).toBeGreaterThan((plano.nodos[i - 1] as { y: number }).y)
    })
  })

  it('los nodos caben en una pantalla de 360 px (22 teselas centrales)', () => {
    const margen = (ANCHO - 22) / 2
    for (const nodo of plano.nodos) {
      expect(nodo.x).toBeGreaterThanOrEqual(margen + 1)
      expect(nodo.x).toBeLessThanOrEqual(ANCHO - margen - 2)
    }
  })

  it('el camino une todos los nodos sin cortes', () => {
    const inicio = plano.nodos[0] as { x: number; y: number }
    const visitadas = new Set<number>([en(inicio.x, inicio.y)])
    const cola = [[inicio.x, inicio.y]]
    while (cola.length > 0) {
      const [x, y] = cola.pop() as [number, number]
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const xx = x + dx
        const yy = y + dy
        if (xx < 0 || yy < 0 || xx >= plano.ancho || yy >= plano.alto) continue
        if (plano.camino[en(xx, yy)] && !visitadas.has(en(xx, yy))) {
          visitadas.add(en(xx, yy))
          cola.push([xx, yy])
        }
      }
    }
    for (const nodo of plano.nodos) expect(visitadas.has(en(nodo.x, nodo.y))).toBe(true)
  })

  it('cada nodo está en tierra firme y sin adornos encima', () => {
    for (const nodo of plano.nodos) {
      expect(plano.tierra[en(nodo.x, nodo.y)]).toBe(1)
      expect(plano.adorno[en(nodo.x, nodo.y)]).toBe(0)
    }
  })

  it('no hay adornos sobre el camino ni en el agua', () => {
    for (let i = 0; i < plano.adorno.length; i++) {
      if (plano.adorno[i] === 0) continue
      expect(plano.camino[i]).toBe(0)
      expect(plano.tierra[i]).toBe(1)
    }
  })

  it('es determinista: el mismo mapa en todos los dispositivos', () => {
    const otro = trazarPlano(NODOS)
    expect(Array.from(otro.tierra)).toEqual(Array.from(plano.tierra))
    expect(Array.from(otro.adorno)).toEqual(Array.from(plano.adorno))
    expect(otro.nodos).toEqual(plano.nodos)
  })

  it('crece con el número de nodos', () => {
    expect(trazarPlano(4).alto).toBeLessThan(plano.alto)
    expect(trazarPlano(4).nodos).toHaveLength(4)
  })
})
