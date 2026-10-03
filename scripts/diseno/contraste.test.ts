import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { contraste, leerColores, luminancia, medir } from '../../src/ui/contraste.ts'

const DIRECCIONES = ['cartucho', 'vinilo'] as const
const ESQUEMAS = ['oscuro', 'claro'] as const

function cssDe(direccion: string): string {
  return readFileSync(path.resolve(import.meta.dirname, `../../src/ui/direcciones/${direccion}/${direccion}.css`), 'utf8')
}

describe('contraste', () => {
  it('calcula la luminancia y el contraste de WCAG', () => {
    expect(luminancia('#000000')).toBe(0)
    expect(luminancia('#ffffff')).toBeCloseTo(1, 5)
    expect(contraste('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contraste('#ffffff', '#000000')).toBeCloseTo(21, 5)
    // Gris medio de referencia: #767676 sobre blanco es el límite clásico de AA (4,54).
    expect(contraste('#767676', '#ffffff')).toBeCloseTo(4.54, 2)
  })

  it('rechaza colores que no son #rrggbb', () => {
    expect(() => luminancia('rojo')).toThrow(/Color no válido/)
    expect(() => luminancia('#fff')).toThrow(/Color no válido/)
  })

  it('lee los colores de cada esquema e ignora las reglas de componentes', () => {
    const css = `
      :root[data-direccion='x'][data-esquema='oscuro'] { --fondo: #000000; --tinta: #FFFFFF; }
      [data-direccion='x'][data-esquema='oscuro'] { --extra: #123456; }
      [data-direccion='x'][data-esquema='oscuro'] .boton { --fondo: #ff0000; }
      :root[data-direccion='y'][data-esquema='oscuro'] { --fondo: #111111; }
    `
    expect(leerColores(css, 'x')).toEqual({ oscuro: { fondo: '#000000', tinta: '#ffffff', extra: '#123456' } })
  })
})

describe.each(DIRECCIONES)('colores de la dirección «%s»', (direccion) => {
  const esquemas = leerColores(cssDe(direccion), direccion)

  it('define los dos esquemas', () => {
    expect(Object.keys(esquemas).sort()).toEqual(['claro', 'oscuro'])
  })

  it('define las mismas variables en claro y en oscuro', () => {
    expect(Object.keys(esquemas.claro ?? {}).sort()).toEqual(Object.keys(esquemas.oscuro ?? {}).sort())
  })

  it.each(ESQUEMAS)('cumple el contraste AA en el esquema %s', (esquema) => {
    const medidas = medir(esquemas[esquema] ?? {}, direccion)
    const fallos = medidas.filter((m) => !m.cumple).map((m) => `${m.sobre} sobre ${m.fondo}: ${m.valor.toFixed(2)} (mínimo ${m.minimo}) — ${m.uso}`)
    expect(fallos).toEqual([])
  })
})
