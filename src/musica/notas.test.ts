import { describe, expect, it } from 'vitest'
import { cifradoVisible, croma, cromaDeMidi, esClaseDeNota, esNota, intervaloEntre, midiDe, nombreDeIntervalo, nombreVisible, normalizarIntervalo, notaDeMidi, semitonos, transportar } from './notas.ts'

describe('notas', () => {
  it('convierte entre nombres y números MIDI con Do central = C4 = 60', () => {
    expect(midiDe('C4')).toBe(60)
    expect(midiDe('A4')).toBe(69)
    expect(midiDe('A0')).toBe(21)
    expect(midiDe('C8')).toBe(108)
    expect(midiDe('F#3')).toBe(54)
    expect(midiDe('Bb3')).toBe(58)
    expect(midiDe('C-1')).toBe(0)
    expect(notaDeMidi(61)).toBe('C#4')
    expect(notaDeMidi(61, 'bemoles')).toBe('Db4')
  })

  it('ida y vuelta para todo el teclado', () => {
    for (let m = 21; m <= 108; m++) expect(midiDe(notaDeMidi(m))).toBe(m)
  })

  it('rechaza nombres mal escritos', () => {
    for (const mala of ['H4', 'C', 'Do4', 'c4', 'C#', '4C', 'C44']) expect(() => midiDe(mala), mala).toThrow(/Nota no válida/)
  })

  it('distingue notas con octava de clases de nota', () => {
    expect(esNota('C4')).toBe(true)
    expect(esNota('C')).toBe(false)
    expect(esClaseDeNota('Bb')).toBe(true)
    expect(esClaseDeNota('Bb3')).toBe(false)
  })

  it('calcula la clase de nota', () => {
    expect(croma('C')).toBe(0)
    expect(croma('F#')).toBe(6)
    expect(croma('Bb3')).toBe(10)
    expect(cromaDeMidi(60)).toBe(0)
    expect(cromaDeMidi(71)).toBe(11)
  })

  it('muestra los nombres en las dos nomenclaturas', () => {
    expect(nombreVisible('C4', 'latina')).toBe('Do4')
    expect(nombreVisible('F#5', 'latina')).toBe('Fa♯5')
    expect(nombreVisible('Bb3', 'latina')).toBe('Si♭3')
    expect(nombreVisible('G', 'latina')).toBe('Sol')
    expect(nombreVisible('F#5', 'anglosajona')).toBe('F♯5')
    expect(nombreVisible('A4', 'latina', { octava: false })).toBe('La')
  })

  it('embellece el cifrado sin traducir la fundamental', () => {
    expect(cifradoVisible('Bbmaj7')).toBe('B♭maj7')
    expect(cifradoVisible('F#m7b5')).toBe('F♯m7b5')
    expect(cifradoVisible('D/F#')).toBe('D/F♯')
    expect(cifradoVisible('C')).toBe('C')
  })
})

describe('intervalos', () => {
  it('admite la J castellana de «justa» y la P de Tonal', () => {
    expect(normalizarIntervalo('5J')).toBe('5P')
    expect(normalizarIntervalo('4J')).toBe('4P')
    expect(normalizarIntervalo('8J')).toBe('8P')
    expect(normalizarIntervalo('5P')).toBe('5P')
    expect(normalizarIntervalo('3m')).toBe('3m')
    expect(() => normalizarIntervalo('5M')).toThrow(/Intervalo no válido/)
    expect(() => normalizarIntervalo('tercera')).toThrow(/Intervalo no válido/)
  })

  it('nombra los intervalos en castellano', () => {
    expect(nombreDeIntervalo('2m')).toBe('2.ª menor')
    expect(nombreDeIntervalo('3M')).toBe('3.ª mayor')
    expect(nombreDeIntervalo('4J')).toBe('4.ª justa')
    expect(nombreDeIntervalo('4A')).toBe('4.ª aumentada')
    expect(nombreDeIntervalo('5d')).toBe('5.ª disminuida')
    expect(nombreDeIntervalo('8J')).toBe('octava justa')
    expect(nombreDeIntervalo('1P')).toBe('unísono')
  })

  it('cuenta semitonos', () => {
    const esperado: Record<string, number> = { '2m': 1, '2M': 2, '3m': 3, '3M': 4, '4J': 5, '4A': 6, '5d': 6, '5J': 7, '6m': 8, '6M': 9, '7m': 10, '7M': 11, '8J': 12 }
    for (const [i, s] of Object.entries(esperado)) expect(semitonos(i), i).toBe(s)
  })

  it('mide el intervalo entre dos notas sin importar el orden', () => {
    expect(intervaloEntre('C4', 'E4')).toBe('3M')
    expect(intervaloEntre('E4', 'C4')).toBe('3M')
    expect(intervaloEntre('A3', 'E4')).toBe('5P')
    expect(intervaloEntre('B3', 'F4')).toBe('5d')
  })

  it('transporta notas hacia arriba y hacia abajo', () => {
    expect(transportar('C4', '3M')).toBe('E4')
    expect(transportar('C4', '5J')).toBe('G4')
    expect(transportar('C4', '3m', true)).toBe('A3')
    expect(transportar('F#4', '4J')).toBe('B4')
  })
})
