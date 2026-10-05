import { Chord } from 'tonal'
import { describe, expect, it } from 'vitest'
import type { OidoAcorde, OidoCompas, OidoContorno, OidoEscala, OidoIntervalo, OidoProgresion, OidoTimbre } from '../contenido/tipos.ts'
import { INSTRUMENTOS } from './instrumentos.ts'
import { croma, cromaDeMidi, midiDe, semitonos } from './notas.ts'
import { azarConSemilla, generarPreguntas, llevarAlRegistro, nombreDeCalidad, patronDeCompas, repartir } from './oido.ts'
import type { Nota, Pieza, Pista } from './pieza.ts'
import { leerNotas } from './taquigrafia.ts'
import { PPQ, ticksPorCompas } from './tiempo.ts'
import { acordeDeGrado, leerTonalidad } from './tonalidad.ts'

const COMUN = { tipo: 'oido' as const, enunciado: [], pista: [], explicacion: [], concepto: 'prueba' }

const SEMILLAS = [1, 2, 3, 7, 42, 99, 2024, 31337]

function notasDe(pieza: Pieza): Nota[] {
  return pieza.pistas.flatMap((p) => p.notas)
}

function cromasDe(notas: readonly Nota[]): number[] {
  return [...new Set(notas.map((n) => cromaDeMidi(n.n)))].sort((a, b) => a - b)
}

function cabeEnLaPieza(pieza: Pieza): boolean {
  const fin = pieza.compases * ticksPorCompas(pieza.compas)
  return notasDe(pieza).every((n) => n.t >= 0 && n.d > 0 && n.t + n.d <= fin)
}

function enElInstrumento(pieza: Pieza): boolean {
  return pieza.pistas.every((p) => {
    const [min, max] = INSTRUMENTOS[p.instrumento].rango
    return p.notas.every((n) => n.n >= min && n.n <= max)
  })
}

describe('azar con semilla', () => {
  it('da siempre la misma serie con la misma semilla, y números entre 0 y 1', () => {
    const a = azarConSemilla(5)
    const b = azarConSemilla(5)
    const serie = Array.from({ length: 200 }, () => a())
    expect(Array.from({ length: 200 }, () => b())).toEqual(serie)
    expect(serie.every((x) => x >= 0 && x < 1)).toBe(true)
    // No es una serie degenerada: hay valores en las dos mitades.
    expect(serie.some((x) => x < 0.5) && serie.some((x) => x >= 0.5)).toBe(true)
  })

  it('con otra semilla, otra serie', () => {
    const a = azarConSemilla(1)
    const b = azarConSemilla(2)
    expect(Array.from({ length: 10 }, () => a())).not.toEqual(Array.from({ length: 10 }, () => b()))
  })
})

describe('reparto de las respuestas', () => {
  it('todas las respuestas salen las mismas veces cuando las rondas son múltiplo', () => {
    for (const semilla of SEMILLAS) {
      const reparto = repartir(azarConSemilla(semilla), 4, 12)
      expect(reparto).toHaveLength(12)
      for (let i = 0; i < 4; i++) expect(reparto.filter((r) => r === i)).toHaveLength(3)
    }
  })

  it('si no son múltiplo, ninguna sale más de una vez por encima de otra', () => {
    for (const semilla of SEMILLAS) {
      const reparto = repartir(azarConSemilla(semilla), 3, 5)
      const veces = [0, 1, 2].map((i) => reparto.filter((r) => r === i).length)
      expect(Math.max(...veces) - Math.min(...veces)).toBeLessThanOrEqual(1)
    }
  })

  it('nunca repite la misma respuesta dos veces seguidas', () => {
    for (let semilla = 0; semilla < 300; semilla++) {
      const reparto = repartir(azarConSemilla(semilla), 2 + (semilla % 4), 20)
      for (let i = 1; i < reparto.length; i++) expect(reparto[i]).not.toBe(reparto[i - 1])
    }
  })

  it('con una sola respuesta posible, la repite', () => {
    expect(repartir(azarConSemilla(1), 1, 3)).toEqual([0, 0, 0])
  })
})

describe('preguntas de intervalo', () => {
  const paso: OidoIntervalo = {
    ...COMUN,
    modo: 'intervalo',
    intervalos: ['3m', '3M', '5P', '8P'],
    direcciones: ['ascendente', 'descendente', 'armonico'],
    registro: [midiDe('C3'), midiDe('C5')],
    instrumento: 'piano',
    rondas: 8,
  }

  it('la opción marcada como correcta es el intervalo que suena', () => {
    for (const semilla of SEMILLAS) {
      const preguntas = generarPreguntas(paso, 'latina', azarConSemilla(semilla))
      expect(preguntas).toHaveLength(8)
      for (const p of preguntas) {
        const [a, b] = notasDe(p.pieza)
        expect(notasDe(p.pieza)).toHaveLength(2)
        expect(Math.abs((a as Nota).n - (b as Nota).n)).toBe(semitonos(paso.intervalos[p.correcta] as string))
        expect(p.opciones).toEqual(['3.ª menor', '3.ª mayor', '5.ª justa', 'Octava justa'])
      }
    }
  })

  it('las dos notas caben en el registro pedido y en la pieza', () => {
    for (const semilla of SEMILLAS) {
      for (const p of generarPreguntas(paso, 'latina', azarConSemilla(semilla))) {
        for (const n of notasDe(p.pieza)) {
          expect(n.n).toBeGreaterThanOrEqual(paso.registro[0])
          expect(n.n).toBeLessThanOrEqual(paso.registro[1])
        }
        expect(cabeEnLaPieza(p.pieza)).toBe(true)
      }
    }
  })

  it('respeta la dirección: ascendente, descendente o las dos a la vez', () => {
    const direccion = (d: OidoIntervalo['direcciones'][number]) => generarPreguntas({ ...paso, direcciones: [d] }, 'latina', azarConSemilla(11))
    for (const p of direccion('ascendente')) {
      const [a, b] = notasDe(p.pieza) as [Nota, Nota]
      expect(a.t).toBeLessThan(b.t)
      expect(a.n).toBeLessThan(b.n)
      expect(p.explicacion).toContain('ascendente')
    }
    for (const p of direccion('descendente')) {
      const [a, b] = notasDe(p.pieza) as [Nota, Nota]
      expect(a.t).toBeLessThan(b.t)
      expect(a.n).toBeGreaterThan(b.n)
      expect(p.explicacion).toContain('descendente')
    }
    for (const p of direccion('armonico')) {
      const [a, b] = notasDe(p.pieza) as [Nota, Nota]
      expect(a.t).toBe(b.t)
      expect(p.explicacion).toContain('a la vez')
    }
  })

  it('reparte las respuestas y usa las tres direcciones', () => {
    const preguntas = generarPreguntas({ ...paso, rondas: 24 }, 'latina', azarConSemilla(3))
    for (let i = 0; i < 4; i++) expect(preguntas.filter((p) => p.correcta === i)).toHaveLength(6)
    const simultaneas = preguntas.filter((p) => notasDe(p.pieza).every((n) => n.t === 0)).length
    expect(simultaneas).toBeGreaterThan(0)
    expect(simultaneas).toBeLessThan(24)
  })

  it('con el mismo azar, las mismas preguntas', () => {
    expect(generarPreguntas(paso, 'latina', azarConSemilla(9))).toEqual(generarPreguntas(paso, 'latina', azarConSemilla(9)))
    expect(generarPreguntas(paso, 'latina', azarConSemilla(9))).not.toEqual(generarPreguntas(paso, 'latina', azarConSemilla(10)))
  })

  it('la explicación nombra las notas en la nomenclatura elegida y sin dobles alteraciones', () => {
    const tritono: OidoIntervalo = { ...paso, intervalos: ['4A', '5d'], direcciones: ['ascendente'], rondas: 40 }
    for (const p of generarPreguntas(tritono, 'latina', azarConSemilla(4))) {
      expect(p.explicacion).toMatch(/^De (Do|Re|Mi|Fa|Sol|La|Si)[♯♭]?\d a (Do|Re|Mi|Fa|Sol|La|Si)[♯♭]?\d: una (4\.ª aumentada|5\.ª disminuida) ascendente, 6 semitonos\.$/)
    }
    const [primera] = generarPreguntas({ ...paso, direcciones: ['ascendente'] }, 'anglosajona', azarConSemilla(4))
    expect(primera?.explicacion).toMatch(/^De [A-G][♯♭]?\d a [A-G][♯♭]?\d: /)
  })

  it('con un registro más estrecho que el intervalo, parte de la nota más grave', () => {
    const estrecho: OidoIntervalo = { ...paso, intervalos: ['8P', '5P'], registro: [60, 64], direcciones: ['ascendente'] }
    for (const p of generarPreguntas(estrecho, 'latina', azarConSemilla(1))) {
      const graves = Math.min(...notasDe(p.pieza).map((n) => n.n))
      expect(graves).toBeGreaterThanOrEqual(60)
      expect(graves).toBeLessThanOrEqual(64)
      expect(enElInstrumento(p.pieza)).toBe(true)
    }
  })
})

describe('preguntas de acorde', () => {
  const paso: OidoAcorde = {
    ...COMUN,
    modo: 'acorde',
    calidades: ['M', 'm', 'dim', 'aug', 'maj7', 'm7', '7', 'sus4'],
    presentacion: 'bloque',
    inversiones: false,
    registro: [midiDe('C3'), midiDe('C4')],
    instrumento: 'piano',
    rondas: 16,
  }

  /** Clases de nota del tipo de acorde, contadas desde su fundamental. */
  function forma(calidad: string): number[] {
    return Chord.getChord(calidad, 'C')
      .notes.map(croma)
      .sort((a, b) => a - b)
  }

  it('suenan exactamente las notas del tipo de acorde marcado como correcto', () => {
    for (const semilla of SEMILLAS) {
      for (const p of generarPreguntas(paso, 'latina', azarConSemilla(semilla))) {
        const notas = notasDe(p.pieza)
        const fundamental = Math.min(...notas.map((n) => n.n))
        const relativas = [...new Set(notas.map((n) => cromaDeMidi(n.n - fundamental)))].sort((a, b) => a - b)
        expect(relativas).toEqual(forma(paso.calidades[p.correcta] as string))
        expect(fundamental).toBeGreaterThanOrEqual(paso.registro[0])
        expect(fundamental).toBeLessThanOrEqual(paso.registro[1])
        expect(enElInstrumento(p.pieza)).toBe(true)
        expect(cabeEnLaPieza(p.pieza)).toBe(true)
      }
    }
  })

  it('en bloque suenan todas a la vez; en arpegio, de una en una y de grave a agudo', () => {
    for (const p of generarPreguntas(paso, 'latina', azarConSemilla(5))) {
      expect(notasDe(p.pieza).every((n) => n.t === 0)).toBe(true)
    }
    for (const p of generarPreguntas({ ...paso, presentacion: 'arpegio' }, 'latina', azarConSemilla(5))) {
      const notas = notasDe(p.pieza)
      for (let i = 1; i < notas.length; i++) {
        expect((notas[i] as Nota).t).toBe((notas[i - 1] as Nota).t + PPQ)
        expect((notas[i] as Nota).n).toBeGreaterThan((notas[i - 1] as Nota).n)
      }
      expect(cabeEnLaPieza(p.pieza)).toBe(true)
    }
  })

  it('en «ambos», primero el arpegio y después el acorde entero', () => {
    for (const p of generarPreguntas({ ...paso, presentacion: 'ambos' }, 'latina', azarConSemilla(5))) {
      const notas = notasDe(p.pieza)
      const mitad = notas.length / 2
      const arpegio = notas.slice(0, mitad)
      const bloque = notas.slice(mitad)
      expect(new Set(arpegio.map((n) => n.t)).size).toBe(mitad)
      expect(new Set(bloque.map((n) => n.t)).size).toBe(1)
      expect((bloque[0] as Nota).t).toBeGreaterThan(Math.max(...arpegio.map((n) => n.t)))
      expect(bloque.map((n) => n.n)).toEqual(arpegio.map((n) => n.n))
      expect(cabeEnLaPieza(p.pieza)).toBe(true)
    }
  })

  it('con inversiones cambia el bajo, pero no las notas del acorde', () => {
    const conInversiones: OidoAcorde = { ...paso, calidades: ['M', 'm', 'maj7', 'm7'], inversiones: true, rondas: 40 }
    const bajos = new Set<string>()
    for (const p of generarPreguntas(conInversiones, 'latina', azarConSemilla(8))) {
      const notas = notasDe(p.pieza)
      const calidad = conInversiones.calidades[p.correcta] as string
      // Alguna de las notas es la fundamental: desde ella, el acorde tiene la forma esperada.
      const formas = notas.map((raiz) => [...new Set(notas.map((n) => cromaDeMidi(n.n - raiz.n)))].sort((a, b) => a - b))
      expect(formas).toContainEqual(forma(calidad))
      expect(enElInstrumento(p.pieza)).toBe(true)
      bajos.add(/inversión/.test(p.explicacion) ? 'invertido' : 'fundamental')
    }
    expect(bajos).toEqual(new Set(['invertido', 'fundamental']))
  })

  it('si al invertir se sale del instrumento, baja una octava', () => {
    const arriba: OidoAcorde = { ...paso, calidades: ['maj7', 'm7'], inversiones: true, registro: [94, 94], rondas: 30 }
    for (const p of generarPreguntas(arriba, 'latina', azarConSemilla(2))) expect(enElInstrumento(p.pieza)).toBe(true)
  })

  it('explica qué acorde era, con sus notas', () => {
    const fijo: OidoAcorde = { ...paso, calidades: ['M', 'm7'], registro: [60, 60], rondas: 2 }
    const explicaciones = generarPreguntas(fijo, 'latina', azarConSemilla(1)).map((p) => p.explicacion)
    expect(explicaciones.toSorted()).toEqual(['Era C: Do, Mi, Sol.', 'Era Cm7: Do, Mi♭, Sol, Si♭.'])
    const sostenido: OidoAcorde = { ...paso, calidades: ['M', 'm'], registro: [66, 66], rondas: 2 }
    expect(generarPreguntas(sostenido, 'anglosajona', azarConSemilla(1)).map((p) => p.explicacion).toSorted()).toEqual(['Era F♯: F♯, A♯, C♯.', 'Era F♯m: F♯, A, C♯.'])
  })

  it('da nombre a los tipos de acorde habituales y deja el cifrado en los demás', () => {
    expect(nombreDeCalidad('M')).toBe('Mayor')
    expect(nombreDeCalidad('m7b5')).toBe('Semidisminuido (m7♭5)')
    expect(nombreDeCalidad('7b9')).toBe('7♭9')
    expect(generarPreguntas(paso, 'latina', azarConSemilla(1))[0]?.opciones).toEqual([
      'Mayor',
      'Menor',
      'Disminuido',
      'Aumentado',
      'Mayor con séptima mayor (maj7)',
      'Menor con séptima (m7)',
      'Séptima de dominante (7)',
      'Suspendido de cuarta (sus4)',
    ])
  })
})

describe('preguntas de progresión', () => {
  const paso: OidoProgresion = {
    ...COMUN,
    modo: 'progresion',
    tonalidades: ['G mayor'],
    progresiones: [
      ['I', 'IV', 'V', 'I'],
      ['I', 'vi', 'IV', 'V'],
      ['ii', 'V', 'I', 'I'],
    ],
    tempo: 84,
    instrumento: 'piano',
    rondas: 6,
  }

  it('en cada compás suenan las notas del acorde de su grado, con la fundamental en el bajo', () => {
    const tonalidad = leerTonalidad('G mayor')
    for (const semilla of SEMILLAS) {
      for (const p of generarPreguntas(paso, 'latina', azarConSemilla(semilla))) {
        const grados = paso.progresiones[p.correcta] as string[]
        expect(p.pieza.compases).toBe(grados.length)
        grados.forEach((grado, i) => {
          const acorde = acordeDeGrado(tonalidad, grado)
          const enCompas = notasDe(p.pieza).filter((n) => n.t === i * PPQ * 4)
          expect(cromasDe(enCompas)).toEqual([...acorde.cromas].sort((a, b) => a - b))
          const bajo = enCompas.reduce((a, b) => (a.n < b.n ? a : b))
          expect(cromaDeMidi(bajo.n)).toBe(croma(acorde.fundamental))
        })
        expect(cabeEnLaPieza(p.pieza)).toBe(true)
        expect(enElInstrumento(p.pieza)).toBe(true)
        expect(p.pieza.tempo).toBe(84)
      }
    }
  })

  it('escribe las opciones en grados y la explicación en acordes', () => {
    const preguntas = generarPreguntas(paso, 'latina', azarConSemilla(1))
    expect(preguntas[0]?.opciones).toEqual(['I – IV – V – I', 'I – vi – IV – V', 'ii – V – I – I'])
    const explicaciones = new Set(preguntas.map((p) => p.explicacion))
    expect(explicaciones).toEqual(new Set(['En Sol mayor: G – C – D – G.', 'En Sol mayor: G – Em – C – D.', 'En Sol mayor: Am – D – G – G.']))
  })

  it('cambia de tonalidad entre preguntas si hay varias', () => {
    const varias: OidoProgresion = { ...paso, tonalidades: ['C mayor', 'F mayor', 'Bb mayor', 'D mayor'], rondas: 30 }
    const vistas = new Set(generarPreguntas(varias, 'latina', azarConSemilla(6)).map((p) => /^En (\S+ \S+):/.exec(p.explicacion)?.[1]))
    expect(vistas).toEqual(new Set(['Do mayor', 'Fa mayor', 'Si♭ mayor', 'Re mayor']))
  })

  it('en un instrumento de registro corto, no se sale de él', () => {
    for (const p of generarPreguntas({ ...paso, instrumento: 'bajo-electrico', tonalidades: ['E menor', 'C mayor'] }, 'latina', azarConSemilla(3))) {
      expect(enElInstrumento(p.pieza)).toBe(true)
    }
  })
})

describe('preguntas de escala', () => {
  const paso: OidoEscala = {
    ...COMUN,
    modo: 'escala',
    escalas: ['mayor', 'menor', 'dórico', 'pentatónica menor', 'menor armónica'],
    tonicas: ['C', 'D', 'F', 'G', 'A', 'Bb', 'F#'],
    presentacion: 'escala',
    instrumento: 'piano',
    rondas: 10,
  }

  it('suenan las notas de la escala marcada como correcta, de tónica a tónica', () => {
    for (const semilla of SEMILLAS) {
      for (const p of generarPreguntas(paso, 'latina', azarConSemilla(semilla))) {
        const notas = notasDe(p.pieza)
        const tonica = (notas[0] as Nota).n
        const tonalidad = leerTonalidad(`C ${paso.escalas[p.correcta] as string}`)
        const relativas = [...new Set(notas.map((n) => cromaDeMidi(n.n - tonica)))].sort((a, b) => a - b)
        expect(relativas).toEqual([...tonalidad.cromas].sort((a, b) => a - b))
        // Sube una octava y vuelve a la tónica.
        expect(Math.max(...notas.map((n) => n.n))).toBe(tonica + 12)
        expect((notas.at(-1) as Nota).n).toBe(tonica)
        expect(notas).toHaveLength(tonalidad.escala.length * 2 + 1)
        expect(cabeEnLaPieza(p.pieza)).toBe(true)
        expect(enElInstrumento(p.pieza)).toBe(true)
      }
    }
  })

  it('la tónica queda cerca del Do central', () => {
    for (const p of generarPreguntas({ ...paso, rondas: 40 }, 'latina', azarConSemilla(12))) {
      const tonica = (notasDe(p.pieza)[0] as Nota).n
      expect(tonica).toBeGreaterThanOrEqual(54)
      expect(tonica).toBeLessThanOrEqual(65)
    }
  })

  it('como melodía pasa por todos los grados, empieza y acaba en la tónica y no se solapa', () => {
    for (const p of generarPreguntas({ ...paso, presentacion: 'melodia' }, 'latina', azarConSemilla(13))) {
      const notas = notasDe(p.pieza)
      const tonica = (notas[0] as Nota).n
      const tonalidad = leerTonalidad(`C ${paso.escalas[p.correcta] as string}`)
      const relativas = [...new Set(notas.map((n) => cromaDeMidi(n.n - tonica)))].sort((a, b) => a - b)
      expect(relativas).toEqual([...tonalidad.cromas].sort((a, b) => a - b))
      expect((notas.at(-1) as Nota).n).toBe(tonica)
      for (let i = 1; i < notas.length; i++) expect((notas[i] as Nota).t).toBe((notas[i - 1] as Nota).t + (notas[i - 1] as Nota).d)
      expect(cabeEnLaPieza(p.pieza)).toBe(true)
    }
  })

  it('en un instrumento grave, la escala entera cabe en su registro', () => {
    for (const p of generarPreguntas({ ...paso, instrumento: 'bajo-electrico' }, 'latina', azarConSemilla(14))) {
      expect(enElInstrumento(p.pieza)).toBe(true)
    }
  })

  it('las opciones llevan mayúscula y la explicación, el nombre de la escala y sus notas', () => {
    const fijo: OidoEscala = { ...paso, escalas: ['dórico', 'mayor'], tonicas: ['D'], rondas: 2 }
    const preguntas = generarPreguntas(fijo, 'latina', azarConSemilla(1))
    expect(preguntas[0]?.opciones).toEqual(['Dórico', 'Mayor'])
    expect(preguntas.map((p) => p.explicacion).toSorted()).toEqual(['Era Re dórico: Re, Mi, Fa, Sol, La, Si, Do.', 'Era Re mayor: Re, Mi, Fa♯, Sol, La, Si, Do♯.'])
  })
})

describe('preguntas de timbre', () => {
  const frase = leerNotas('C4:4 E4:4 G4:4 C5:4 | B4:2 G4:2', { compas: [4, 4], instrumento: 'piano' })
  const paso: OidoTimbre = {
    ...COMUN,
    modo: 'timbre',
    instrumentos: ['piano', 'cuerdas', 'bajo-electrico', 'chip-pulso'],
    frase: frase.notas,
    tempo: 96,
    compas: [4, 4],
    compases: frase.compases,
    rondas: 8,
  }

  it('toca la misma frase con el instrumento marcado como correcto, dentro de su registro', () => {
    for (const semilla of SEMILLAS) {
      for (const p of generarPreguntas(paso, 'latina', azarConSemilla(semilla))) {
        const pista = p.pieza.pistas[0] as Pista
        expect(pista.instrumento).toBe(paso.instrumentos[p.correcta])
        expect(enElInstrumento(p.pieza)).toBe(true)
        const salto = (pista.notas[0] as Nota).n - (frase.notas[0] as Nota).n
        expect(Math.abs(salto % 12)).toBe(0)
        expect(pista.notas).toEqual(frase.notas.map((n) => ({ ...n, n: n.n + salto })))
        expect(p.pieza.compases).toBe(2)
        expect(p.pieza.tempo).toBe(96)
      }
    }
  })

  it('las opciones son los nombres de los instrumentos', () => {
    const [primera] = generarPreguntas(paso, 'latina', azarConSemilla(1))
    expect(primera?.opciones).toEqual(['Piano de cola', 'Sección de cuerda', 'Bajo eléctrico', 'Onda de pulso (chip)'])
    expect(primera?.explicacion).toMatch(/^Era (piano de cola|sección de cuerda|bajo eléctrico|onda de pulso \(chip\))\. \S/)
  })
})

describe('llevar una frase al registro de un instrumento', () => {
  const frase = (...alturas: number[]): Nota[] => alturas.map((n, i) => ({ t: i * PPQ, d: PPQ, n, v: 90 }))

  it('baja por octavas lo que no cabe', () => {
    // El bajo eléctrico llega hasta Sol4 (67): una frase de Do4 a Do5 baja al menos una octava.
    const llevada = llevarAlRegistro(frase(60, 64, 67, 72), 'bajo-electrico')
    expect(llevada.map((n) => n.n)).toEqual([36, 40, 43, 48])
  })

  it('conserva los tiempos, las duraciones y la intensidad', () => {
    const original = frase(60, 62)
    const llevada = llevarAlRegistro(original, 'bajo-electrico')
    expect(llevada.map(({ t, d, v }) => ({ t, d, v }))).toEqual(original.map(({ t, d, v }) => ({ t, d, v })))
  })

  it('acerca la frase al centro del registro', () => {
    // El piano va de 21 a 108 (centro, 64,5): una frase muy grave sube.
    expect(llevarAlRegistro(frase(24, 28), 'piano').map((n) => n.n)).toEqual([60, 64])
    expect(llevarAlRegistro(frase(60, 64), 'piano').map((n) => n.n)).toEqual([60, 64])
  })
})

describe('preguntas de contorno', () => {
  const paso: OidoContorno = {
    ...COMUN,
    modo: 'contorno',
    intervalos: ['2M', '3M', '5P'],
    incluirIgual: true,
    registro: [midiDe('C4'), midiDe('C5')],
    instrumento: 'piano',
    rondas: 9,
  }

  it('«Sube», «Baja» y «Se queda igual» corresponden a lo que suena', () => {
    for (const semilla of SEMILLAS) {
      const preguntas = generarPreguntas(paso, 'latina', azarConSemilla(semilla))
      for (const p of preguntas) {
        expect(p.opciones).toEqual(['Sube', 'Baja', 'Se queda igual'])
        const [a, b] = notasDe(p.pieza) as [Nota, Nota]
        expect(a.t).toBeLessThan(b.t)
        expect(Math.sign(b.n - a.n)).toBe([1, -1, 0][p.correcta])
        if (p.correcta !== 2) expect([2, 4, 7]).toContain(Math.abs(b.n - a.n))
        for (const n of [a, b]) {
          expect(n.n).toBeGreaterThanOrEqual(paso.registro[0])
          expect(n.n).toBeLessThanOrEqual(paso.registro[1])
        }
      }
      for (let i = 0; i < 3; i++) expect(preguntas.filter((p) => p.correcta === i)).toHaveLength(3)
    }
  })

  it('sin `incluirIgual` solo hay dos opciones y nunca suenan dos notas iguales', () => {
    for (const p of generarPreguntas({ ...paso, incluirIgual: false, rondas: 20 }, 'latina', azarConSemilla(2))) {
      expect(p.opciones).toEqual(['Sube', 'Baja'])
      const [a, b] = notasDe(p.pieza) as [Nota, Nota]
      expect(a.n).not.toBe(b.n)
    }
  })

  it('explica qué ha pasado', () => {
    const explicaciones = generarPreguntas(paso, 'latina', azarConSemilla(3)).map((p) => p.explicacion)
    expect(explicaciones.some((e) => /^De \S+ a \S+: sube una (2\.ª mayor|3\.ª mayor|5\.ª justa)\.$/.test(e))).toBe(true)
    expect(explicaciones.some((e) => /^De \S+ a \S+: baja una (2\.ª mayor|3\.ª mayor|5\.ª justa)\.$/.test(e))).toBe(true)
    expect(explicaciones.some((e) => /^Era dos veces la misma nota, \S+\.$/.test(e))).toBe(true)
  })
})

describe('preguntas de compás', () => {
  const paso: OidoCompas = {
    ...COMUN,
    modo: 'compas',
    compases: [
      [2, 4],
      [3, 4],
      [4, 4],
      [6, 8],
    ],
    tempo: 100,
    rondas: 8,
  }

  it('la batería suena en el compás marcado como correcto, con el bombo solo en el primer tiempo', () => {
    for (const semilla of SEMILLAS) {
      for (const p of generarPreguntas(paso, 'latina', azarConSemilla(semilla))) {
        expect(p.opciones).toEqual(['2/4', '3/4', '4/4', '6/8'])
        expect(p.pieza.compas).toEqual(paso.compases[p.correcta])
        expect(p.pieza.compases).toBe(4)
        const porCompas = ticksPorCompas(p.pieza.compas)
        const bombos = notasDe(p.pieza).filter((n) => n.n === 36)
        expect(bombos.map((n) => n.t)).toEqual([0, 1, 2, 3].map((c) => c * porCompas))
        const charles = notasDe(p.pieza).filter((n) => n.n === 42)
        expect(charles).toHaveLength(4 * p.pieza.compas[0])
        expect(p.pieza.pistas[0]?.instrumento).toBe('bateria')
        expect(cabeEnLaPieza(p.pieza)).toBe(true)
        expect(enElInstrumento(p.pieza)).toBe(true)
      }
    }
  })

  it('el primer tiempo es el más fuerte y el 6/8 se parte en dos grupos de tres', () => {
    const seis = patronDeCompas([6, 8], 1)
    const charles = seis.filter((n) => n.n === 42)
    expect(charles.map((n) => n.t)).toEqual([0, 240, 480, 720, 960, 1200])
    expect(charles.map((n) => n.v)).toEqual([100, 64, 64, 80, 64, 64])
    expect(seis.filter((n) => n.n === 37).map((n) => n.t)).toEqual([720])
    const tres = patronDeCompas([3, 4], 2)
    expect(tres.filter((n) => n.n === 37)).toEqual([])
    expect(tres.filter((n) => n.n === 36).map((n) => n.t)).toEqual([0, 1440])
    const cuatro = patronDeCompas([4, 4], 1)
    expect(cuatro.filter((n) => n.n === 37).map((n) => n.t)).toEqual([960])
  })

  it('la explicación dice cada cuántos pulsos vuelve el bombo', () => {
    const explicaciones = new Set(generarPreguntas(paso, 'latina', azarConSemilla(1)).map((p) => p.explicacion))
    expect(explicaciones).toContain('El bombo vuelve cada 3 pulsos: es un 3/4.')
    expect(explicaciones).toContain('El bombo vuelve cada 6 pulsos rápidos agrupados de tres en tres: es un 6/8.')
  })
})
