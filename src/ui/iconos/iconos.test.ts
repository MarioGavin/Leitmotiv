import { describe, expect, it } from 'vitest'
import { LADO, MAPAS_DE_BITS, trazadoDe } from '../direcciones/cartucho/iconos.ts'
import { FORMAS } from '../direcciones/vinilo/iconos.tsx'
import { NOMBRES_DE_ICONO } from './nombres.ts'

describe('iconos', () => {
  it('las dos direcciones dibujan exactamente los mismos iconos', () => {
    const esperados = [...NOMBRES_DE_ICONO].sort()
    expect(Object.keys(MAPAS_DE_BITS).sort()).toEqual(esperados)
    expect(Object.keys(FORMAS).sort()).toEqual(esperados)
  })

  it.each(NOMBRES_DE_ICONO)('el mapa de bits de «%s» mide 12 × 12 y solo usa «.» y «#»', (nombre) => {
    const filas = MAPAS_DE_BITS[nombre]
    expect(filas).toHaveLength(LADO)
    for (const fila of filas) expect(fila).toMatch(/^[.#]{12}$/)
    // Ningún icono está vacío.
    expect(filas.join('')).toContain('#')
  })

  it('convierte cada tira de píxeles en un rectángulo', () => {
    expect(trazadoDe(['##.#', '....', '.###'])).toBe('M0 0h2v1h-2zM3 0h1v1h-1zM1 2h3v1h-3z')
    expect(trazadoDe(['....'])).toBe('')
  })
})
