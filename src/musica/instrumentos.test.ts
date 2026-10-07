import { describe, expect, it } from 'vitest'
import { instrumentosQueCaben } from './instrumentos.ts'

describe('instrumentos que caben', () => {
  it('una melodía de una voz en registro medio la puede tocar cualquier instrumento afinado', () => {
    expect(instrumentosQueCaben([60, 64, 67], 1)).toEqual(['piano', 'cuerdas', 'bajo-electrico', 'chip-pulso', 'chip-triangulo'])
  })

  it('fuera del registro de un instrumento, ese no vale', () => {
    // Do6 está por encima del bajo eléctrico, que llega a Sol4.
    expect(instrumentosQueCaben([60, 84], 1)).toEqual(['piano', 'cuerdas', 'chip-pulso', 'chip-triangulo'])
    // Do1 solo lo tiene el piano.
    expect(instrumentosQueCaben([24], 1)).toEqual(['piano', 'chip-triangulo'])
  })

  it('unos acordes no los toca un chip de una sola voz', () => {
    expect(instrumentosQueCaben([60, 64, 67], 3)).toEqual(['piano', 'cuerdas', 'bajo-electrico'])
  })

  it('nunca ofrece la batería', () => {
    expect(instrumentosQueCaben([38], 1)).not.toContain('bateria')
  })
})
