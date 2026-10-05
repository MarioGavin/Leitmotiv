import paquete from '@tonejs/midi'
import { describe, expect, it } from 'vitest'
import { nombreDeArchivoMidi, piezaAMidi } from './midi.ts'
import type { Pieza } from './pieza.ts'
import { piezaDePrueba } from './piezas-de-prueba.ts'

const { Midi } = paquete

/** Exporta la pieza y la vuelve a leer con la misma librería: lo que sale es lo que hay en el archivo. */
async function idaYVuelta(pieza: Pieza) {
  const archivo = await piezaAMidi(pieza)
  return { archivo, leido: new Midi(archivo) }
}

const TEMA: Pieza = piezaDePrueba(
  [
    { rol: 'melodia', instrumento: 'chip-pulso', notas: 'D5:4 F#5:8 A5:8 D6:2 | A5:4 F#5:4 D5:2' },
    { rol: 'bajo', instrumento: 'bajo-electrico', notas: 'D2:2 A2:2 | D2:1' },
    { rol: 'armonia', instrumento: 'cuerdas', notas: '[D4 F#4 A4]:1 | [D4 F#4 A4]:1' },
  ],
  { titulo: 'Fanfarria de prueba', tempo: 132, tonalidad: 'D mayor' },
)

describe('exportación a MIDI', () => {
  it('escribe un archivo de formato 1 a 480 ticks por negra, con una pista de dirección y una por pista', async () => {
    const { archivo } = await idaYVuelta(TEMA)
    expect(String.fromCharCode(...archivo.slice(0, 4))).toBe('MThd')
    const vista = new DataView(archivo.buffer, archivo.byteOffset, archivo.byteLength)
    expect(vista.getUint16(8)).toBe(1)
    expect(vista.getUint16(10)).toBe(TEMA.pistas.length + 1)
    expect(vista.getUint16(12)).toBe(480)
  })

  it('conserva el título, el tempo y el compás', async () => {
    const { leido } = await idaYVuelta({ ...TEMA, compas: [6, 8], compases: 3 })
    expect(leido.header.name).toBe('Fanfarria de prueba')
    expect(leido.header.tempos).toHaveLength(1)
    expect(leido.header.tempos[0]?.bpm).toBeCloseTo(132, 3)
    expect(leido.header.timeSignatures.map((c) => c.timeSignature)).toEqual([[6, 8]])
  })

  it('conserva cada nota: altura, inicio, duración e intensidad', async () => {
    const { leido } = await idaYVuelta(TEMA)
    expect(leido.tracks).toHaveLength(TEMA.pistas.length)
    TEMA.pistas.forEach((pista, i) => {
      const notas = (leido.tracks[i]?.notes ?? []).map((n) => ({ t: n.ticks, d: n.durationTicks, n: n.midi, v: Math.round(n.velocity * 127) }))
      const orden = (a: { t: number; n: number }, b: { t: number; n: number }): number => a.t - b.t || a.n - b.n
      expect(notas.sort(orden)).toEqual([...pista.notas].sort(orden))
    })
  })

  it('no pierde una unidad de intensidad en ninguna velocidad', async () => {
    const todas: Pieza = {
      tempo: 120,
      compas: [4, 4],
      compases: 32,
      pistas: [{ id: 'melodia', rol: 'melodia', instrumento: 'piano', notas: Array.from({ length: 127 }, (_, i) => ({ t: i * 120, d: 120, n: 60, v: i + 1 })) }],
    }
    const { leido } = await idaYVuelta(todas)
    expect(leido.tracks[0]?.notes.map((n) => Math.round(n.velocity * 127))).toEqual(Array.from({ length: 127 }, (_, i) => i + 1))
  })

  it('da a cada pista su nombre, su programa General MIDI y un canal propio', async () => {
    const { leido } = await idaYVuelta({ ...TEMA, pistas: TEMA.pistas.map((p, i) => (i === 0 ? { ...p, nombre: 'Tema del héroe' } : p)) })
    expect(leido.tracks.map((t) => t.name)).toEqual(['Tema del héroe', 'Bajo', 'Armonía'])
    expect(leido.tracks.map((t) => t.instrument.number)).toEqual([80, 33, 48])
    expect(leido.tracks.map((t) => t.channel)).toEqual([0, 1, 2])
  })

  it('manda la percusión al canal 10 y no lo usa para nada más', async () => {
    const pistas = Array.from({ length: 11 }, (_, i) => ({ rol: 'melodia' as const, id: `m${i}`, notas: 'C4:1' }))
    const pieza = piezaDePrueba([{ rol: 'percusion', instrumento: 'bateria', notas: 'bombo:4 caja:4 bombo:4 caja:4' }, ...pistas])
    const { leido } = await idaYVuelta(pieza)
    expect(leido.tracks[0]?.channel).toBe(9)
    expect(leido.tracks[0]?.instrument.percussion).toBe(true)
    expect(leido.tracks[0]?.notes.map((n) => n.midi)).toEqual([36, 38, 36, 38])
    expect(leido.tracks.slice(1).map((t) => t.channel)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11])
  })

  it('escribe la armadura de la tonalidad', async () => {
    const armadura = async (tonalidad: string) => (await idaYVuelta({ ...TEMA, tonalidad })).leido.header.keySignatures
    // La librería nombra la armadura por su tonalidad mayor: dos sostenidos son «D».
    expect(await armadura('D mayor')).toEqual([{ key: 'D', scale: 'major', ticks: 0 }])
    expect(await armadura('B menor')).toEqual([{ key: 'D', scale: 'minor', ticks: 0 }])
    expect(await armadura('Bb mayor')).toEqual([{ key: 'Bb', scale: 'major', ticks: 0 }])
    expect(await armadura('C menor')).toEqual([{ key: 'Eb', scale: 'minor', ticks: 0 }])
    expect(await armadura('D dorico')).toEqual([{ key: 'C', scale: 'minor', ticks: 0 }])
    expect(await armadura('C# mayor')).toEqual([{ key: 'C#', scale: 'major', ticks: 0 }])
    expect(await armadura('Ab menor')).toEqual([{ key: 'Cb', scale: 'minor', ticks: 0 }])
  })

  it('en el archivo, la armadura va como número de alteraciones con signo', async () => {
    const bytes = async (tonalidad: string): Promise<number[]> => {
      const archivo = await piezaAMidi({ ...TEMA, tonalidad })
      const i = archivo.findIndex((b, k) => b === 0xff && archivo[k + 1] === 0x59 && archivo[k + 2] === 0x02)
      return [...archivo.slice(i + 3, i + 5)]
    }
    expect(await bytes('D mayor')).toEqual([2, 0])
    expect(await bytes('G menor')).toEqual([0xfe, 1])
    expect(await bytes('C mayor')).toEqual([0, 0])
  })

  it('sin tonalidad, o con una escala sin armadura, no escribe ninguna', async () => {
    const { tonalidad: _sin, ...sinTonalidad } = TEMA
    expect((await idaYVuelta(sinTonalidad)).leido.header.keySignatures).toEqual([])
    expect((await idaYVuelta({ ...TEMA, tonalidad: 'C tonos enteros' })).leido.header.keySignatures).toEqual([])
    // Una pentatónica se escribe con la armadura de la escala de la que sale.
    expect((await idaYVuelta({ ...TEMA, tonalidad: 'E pentatonica menor' })).leido.header.keySignatures).toEqual([{ key: 'G', scale: 'minor', ticks: 0 }])
  })

  it('un título que acaba como el evento de armadura no despista a la corrección', async () => {
    // «ÿY» seguido del carácter 2 son justo los bytes FF 59 02 con los que empieza el evento de armadura.
    const { leido } = await idaYVuelta({ ...TEMA, titulo: 'Raro ÿY\u0002xx', tonalidad: 'A mayor' })
    expect(leido.header.name).toBe('Raro ÿY\u0002xx')
    expect(leido.header.keySignatures).toEqual([{ key: 'A', scale: 'major', ticks: 0 }])
  })

  it('marca el final de la pieza aunque acabe en silencio', async () => {
    const conSilencio = piezaDePrueba([{ rol: 'melodia', notas: 'C4:4 r:2. | r:1 | r:1 | r:1' }], { bucle: true })
    const { leido } = await idaYVuelta(conSilencio)
    expect(leido.header.meta).toEqual([{ type: 'marker', text: 'Fin', ticks: 4 * 1920 }])
  })

  it('escribe con un byte por letra: las tildes se conservan y lo que no cabe se sustituye', async () => {
    const { leido } = await idaYVuelta({ ...TEMA, titulo: 'Canción del año… «bis» ♯1 ☺' })
    expect(leido.header.name).toBe('Canción del año... «bis» #1 ?')
  })

  it('descarta las notas sin duración y deja dentro de rango lo que se salga', async () => {
    const rara: Pieza = {
      tempo: 100,
      compas: [4, 4],
      compases: 1,
      pistas: [
        {
          id: 'melodia',
          rol: 'melodia',
          instrumento: 'piano',
          notas: [
            { t: 0, d: 0, n: 60, v: 90 },
            { t: 0, d: 240, n: 62, v: 300 },
            { t: 240, d: 240, n: 64, v: 0 },
          ],
        },
      ],
    }
    const { leido } = await idaYVuelta(rara)
    expect(leido.tracks[0]?.notes.map((n) => [n.midi, Math.round(n.velocity * 127)])).toEqual([
      [62, 127],
      [64, 1],
    ])
  })

  it('una pieza sin pistas da un archivo válido con solo la pista de dirección', async () => {
    const { leido } = await idaYVuelta({ tempo: 90, compas: [3, 4], compases: 2, pistas: [] })
    expect(leido.tracks).toEqual([])
    expect(leido.header.tempos[0]?.bpm).toBeCloseTo(90, 3)
  })
})

describe('nombre del archivo MIDI', () => {
  it('quita tildes, espacios y signos', () => {
    expect(nombreDeArchivoMidi('Marcha del héroe')).toBe('marcha-del-heroe.mid')
    expect(nombreDeArchivoMidi('  ¡Tema nº 2: «Combate»!  ')).toBe('tema-n-2-combate.mid')
    expect(nombreDeArchivoMidi('Canción del año')).toBe('cancion-del-ano.mid')
  })

  it('sin título, o con uno que se queda en nada, usa un nombre genérico', () => {
    expect(nombreDeArchivoMidi(undefined)).toBe('pieza.mid')
    expect(nombreDeArchivoMidi('¿?')).toBe('pieza.mid')
  })

  it('acorta los títulos muy largos', () => {
    expect(nombreDeArchivoMidi('a'.repeat(200))).toBe(`${'a'.repeat(60)}.mid`)
  })
})
