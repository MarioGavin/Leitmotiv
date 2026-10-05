import { describe, expect, it } from 'vitest'
import { midiDe } from './notas.ts'
import { acordeDeGrado, acordeDeNotas, alteracionesDe, armaduraDe, estaEnTonalidad, funcionDe, funcionesArmonicas, gradoDe, leerAcorde, leerTonalidad, tonalidadVisible } from './tonalidad.ts'

describe('tonalidades', () => {
  it('lee tónica y modo, con o sin tildes', () => {
    expect(leerTonalidad('D mayor').escala).toEqual(['D', 'E', 'F#', 'G', 'A', 'B', 'C#'])
    expect(leerTonalidad('A menor').escala).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G'])
    expect(leerTonalidad('D dórico').escala).toEqual(['D', 'E', 'F', 'G', 'A', 'B', 'C'])
    expect(leerTonalidad('D dorico').escala).toEqual(['D', 'E', 'F', 'G', 'A', 'B', 'C'])
    expect(leerTonalidad('E frigio').escala).toEqual(['E', 'F', 'G', 'A', 'B', 'C', 'D'])
    expect(leerTonalidad('F lidio').escala).toEqual(['F', 'G', 'A', 'B', 'C', 'D', 'E'])
    expect(leerTonalidad('G mixolidio').escala).toEqual(['G', 'A', 'B', 'C', 'D', 'E', 'F'])
    expect(leerTonalidad('Bb mayor').escala).toEqual(['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'])
    expect(leerTonalidad('A menor armónica').escala).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G#'])
    expect(leerTonalidad('C pentatónica mayor').escala).toEqual(['C', 'D', 'E', 'G', 'A'])
    expect(leerTonalidad('A pentatónica menor').escala).toEqual(['A', 'C', 'D', 'E', 'G'])
  })

  it('normaliza el texto de forma que se pueda volver a leer', () => {
    for (const t of ['D  mayor', 'A menor armonica', 'E Frigio', 'C blues', 'C tonos enteros', 'F# menor melódica']) {
      const leida = leerTonalidad(t)
      expect(leerTonalidad(leida.texto).texto, t).toBe(leida.texto)
    }
    expect(leerTonalidad('A menor armonica').texto).toBe('A menor armónica')
  })

  it('explica el fallo cuando no la reconoce', () => {
    expect(() => leerTonalidad('D')).toThrow(/Tonalidad no válida/)
    expect(() => leerTonalidad('H mayor')).toThrow(/Tonalidad no válida/)
    expect(() => leerTonalidad('D alegre')).toThrow(/Modos: mayor, menor/)
  })

  it('en menor admite el 6.º y el 7.º elevados, pero nada más', () => {
    const lam = leerTonalidad('A menor')
    expect(estaEnTonalidad(midiDe('G#4'), lam)).toBe(true)
    expect(estaEnTonalidad(midiDe('F#4'), lam)).toBe(true)
    expect(estaEnTonalidad(midiDe('C#4'), lam)).toBe(false)
    expect(estaEnTonalidad(midiDe('Bb3'), lam)).toBe(false)
    const re = leerTonalidad('D mayor')
    expect(estaEnTonalidad(midiDe('C#5'), re)).toBe(true)
    expect(estaEnTonalidad(midiDe('C5'), re)).toBe(false)
  })

  it('da el grado de cada nota', () => {
    const re = leerTonalidad('D mayor')
    expect(gradoDe(midiDe('D4'), re)).toBe(1)
    expect(gradoDe(midiDe('F#2'), re)).toBe(3)
    expect(gradoDe(midiDe('A5'), re)).toBe(5)
    expect(gradoDe(midiDe('C4'), re)).toBeUndefined()
  })

  it('elige sostenidos o bemoles según la tonalidad', () => {
    expect(alteracionesDe(leerTonalidad('D mayor'))).toBe('sostenidos')
    expect(alteracionesDe(leerTonalidad('F mayor'))).toBe('bemoles')
    expect(alteracionesDe(leerTonalidad('C menor'))).toBe('bemoles')
  })

  it('se muestra en la nomenclatura elegida', () => {
    expect(tonalidadVisible('D mayor', 'latina')).toBe('Re mayor')
    expect(tonalidadVisible('Bb mixolidio', 'latina')).toBe('Si♭ mixolidio')
    expect(tonalidadVisible('F# menor', 'anglosajona')).toBe('F♯ menor')
  })
})

describe('armadura de una tonalidad', () => {
  const de = (texto: string) => armaduraDe(leerTonalidad(texto))

  it('mayores y menores', () => {
    expect(de('C mayor')).toEqual({ alteraciones: 0, menor: false, relativaMayor: 'C' })
    expect(de('E mayor')).toEqual({ alteraciones: 4, menor: false, relativaMayor: 'E' })
    expect(de('Ab mayor')).toEqual({ alteraciones: -4, menor: false, relativaMayor: 'Ab' })
    expect(de('F# menor')).toEqual({ alteraciones: 3, menor: true, relativaMayor: 'A' })
    expect(de('F menor')).toEqual({ alteraciones: -4, menor: true, relativaMayor: 'Ab' })
    // La armónica y la melódica se escriben con la armadura de la menor natural.
    expect(de('A menor armonica')).toEqual({ alteraciones: 0, menor: true, relativaMayor: 'C' })
    expect(de('D menor melodica')).toEqual({ alteraciones: -1, menor: true, relativaMayor: 'F' })
  })

  it('los modos llevan la armadura de su relativo mayor', () => {
    expect(de('D dorico')).toEqual({ alteraciones: 0, menor: true, relativaMayor: 'C' })
    expect(de('E frigio')).toEqual({ alteraciones: 0, menor: true, relativaMayor: 'C' })
    expect(de('F lidio')).toEqual({ alteraciones: 0, menor: false, relativaMayor: 'C' })
    expect(de('G mixolidio')).toEqual({ alteraciones: 0, menor: false, relativaMayor: 'C' })
    expect(de('A mixolidio')).toEqual({ alteraciones: 2, menor: false, relativaMayor: 'D' })
    expect(de('B locrio')).toEqual({ alteraciones: 0, menor: true, relativaMayor: 'C' })
    expect(de('C jonico')).toEqual({ alteraciones: 0, menor: false, relativaMayor: 'C' })
    expect(de('G eolico')).toEqual({ alteraciones: -2, menor: true, relativaMayor: 'Bb' })
  })

  it('las escalas que salen de una mayor o de una menor llevan la armadura de esta', () => {
    expect(de('C pentatonica mayor')).toEqual({ alteraciones: 0, menor: false, relativaMayor: 'C' })
    expect(de('E pentatonica menor')).toEqual({ alteraciones: 1, menor: true, relativaMayor: 'G' })
    expect(de('A blues')).toEqual({ alteraciones: 0, menor: true, relativaMayor: 'C' })
    // El frigio dominante tiene la tercera mayor, pero se escribe con la armadura del frigio.
    expect(de('E frigio dominante')).toEqual({ alteraciones: 0, menor: false, relativaMayor: 'C' })
  })

  it('no hay armadura para las escalas simétricas ni para más de siete alteraciones', () => {
    expect(de('C tonos enteros')).toBeUndefined()
    expect(de('D cromatica')).toBeUndefined()
    expect(de('G# mayor')).toBeUndefined()
    expect(de('Fb menor')).toBeUndefined()
  })
})

describe('acordes', () => {
  it('lee el cifrado americano', () => {
    expect(leerAcorde('C').notas).toEqual(['C', 'E', 'G'])
    expect(leerAcorde('Am').notas).toEqual(['A', 'C', 'E'])
    expect(leerAcorde('G7').notas).toEqual(['G', 'B', 'D', 'F'])
    expect(leerAcorde('Fmaj7').notas).toEqual(['F', 'A', 'C', 'E'])
    expect(leerAcorde('Bm7b5').notas).toEqual(['B', 'D', 'F', 'A'])
    expect(leerAcorde('Bdim').notas).toEqual(['B', 'D', 'F'])
  })

  it('entiende los acordes con bajo', () => {
    const a = leerAcorde('D/F#')
    expect(a.fundamental).toBe('D')
    expect(a.bajo).toBe('F#')
    expect(leerAcorde('D').bajo).toBeUndefined()
  })

  it('rechaza lo que no es un acorde', () => {
    expect(() => leerAcorde('Hmaj7')).toThrow(/Acorde no reconocido/)
    expect(() => leerAcorde('acorde')).toThrow(/Acorde no reconocido/)
  })

  it('reconoce el acorde que forman unas notas', () => {
    expect(acordeDeNotas(['D3', 'F#3', 'A3'].map(midiDe))).toBe('D')
    expect(acordeDeNotas(['A3', 'C4', 'E4'].map(midiDe))).toBe('Am')
    expect(acordeDeNotas(['C3', 'E3', 'G3', 'Bb3'].map(midiDe))).toBe('C7')
    expect(acordeDeNotas(['C3', 'E3', 'G3', 'C4', 'E4'].map(midiDe))).toBe('C')
    expect(acordeDeNotas([60])).toBeUndefined()
  })
})

describe('grados', () => {
  it('construye los acordes de una tonalidad mayor', () => {
    const c = leerTonalidad('C mayor')
    expect(acordeDeGrado(c, 'I').simbolo).toBe('C')
    expect(acordeDeGrado(c, 'ii').simbolo).toBe('Dm')
    expect(acordeDeGrado(c, 'iii').simbolo).toBe('Em')
    expect(acordeDeGrado(c, 'IV').notas).toEqual(['F', 'A', 'C'])
    expect(acordeDeGrado(c, 'V7').simbolo).toBe('G7')
    expect(acordeDeGrado(c, 'vi').simbolo).toBe('Am')
    expect(acordeDeGrado(c, 'vii°').notas).toEqual(['B', 'D', 'F'])
    expect(acordeDeGrado(c, 'bVII').notas).toEqual(['Bb', 'D', 'F'])
    expect(acordeDeGrado(c, 'Imaj7').notas).toEqual(['C', 'E', 'G', 'B'])
    expect(acordeDeGrado(c, 'ii7').notas).toEqual(['D', 'F', 'A', 'C'])
    expect(acordeDeGrado(c, 'iiø').notas).toEqual(['D', 'F', 'Ab', 'C'])
  })

  it('transporta con la ortografía correcta en otras tonalidades', () => {
    expect(acordeDeGrado(leerTonalidad('D mayor'), 'V').notas).toEqual(['A', 'C#', 'E'])
    expect(acordeDeGrado(leerTonalidad('Bb mayor'), 'IV').notas).toEqual(['Eb', 'G', 'Bb'])
    expect(acordeDeGrado(leerTonalidad('A menor'), 'iv').notas).toEqual(['D', 'F', 'A'])
    expect(acordeDeGrado(leerTonalidad('A menor'), 'V').notas).toEqual(['E', 'G#', 'B'])
  })

  it('rechaza grados mal escritos', () => {
    expect(() => acordeDeGrado(leerTonalidad('C mayor'), 'VIII')).toThrow(/Grado no válido/)
    expect(() => acordeDeGrado(leerTonalidad('C mayor'), 'x')).toThrow(/Grado no válido/)
    expect(() => acordeDeGrado(leerTonalidad('C mayor'), 'Vx')).toThrow(/Grado no válido/)
    expect(() => acordeDeGrado(leerTonalidad('C mayor'), 'IX')).toThrow(/Grado no válido/)
  })

  it('asigna la función armónica a cada acorde diatónico', () => {
    const c = leerTonalidad('C mayor')
    expect(funcionesArmonicas(c).map((f) => `${f.acorde}:${f.funcion}`)).toEqual(['C:T', 'Dm:S', 'Em:T', 'F:S', 'G:D', 'Am:T', 'Bdim:D'])
    expect(funcionDe('G7', c)).toBe('D')
    expect(funcionDe('F', c)).toBe('S')
    expect(funcionDe('Am', c)).toBe('T')
    expect(funcionDe('Bb', c)).toBeUndefined()
    // En menor, el V mayor (de la escala armónica) es el dominante habitual.
    expect(funcionDe('E', leerTonalidad('A menor'))).toBe('D')
    expect(funcionDe('Dm', leerTonalidad('A menor'))).toBe('S')
    expect(funcionesArmonicas(leerTonalidad('D dórico'))).toEqual([])
  })
})
