import abcjs from 'abcjs'
import { describe, expect, it } from 'vitest'
import { ErrorDePentagrama, cabeEnPentagrama, ortografiaDe, piezaAAbc } from './abc.ts'
import { azarConSemilla } from './oido.ts'
import type { Nota, Pieza } from './pieza.ts'
import { piezaDePrueba } from './piezas-de-prueba.ts'
import { ticksPorCompas } from './tiempo.ts'
import { leerTonalidad } from './tonalidad.ts'

// ───────────────────────────── lector de comprobación ─────────────────────────────
//
// Lee el ABC con el analizador de abcjs (el mismo que lo dibuja) y lo vuelve a
// convertir en notas aplicando las reglas de la escritura: armadura,
// alteraciones que duran hasta la barra, ligaduras y tresillos. Si lo que sale
// coincide con la pieza, lo escrito dice lo que suena.

interface AlturaLeida {
  pitch: number
  verticalPos: number
  accidental?: string
  startTie?: unknown
  endTie?: boolean
}

interface ElementoLeido {
  el_type: string
  duration?: number
  pitches?: AlturaLeida[]
  rest?: { type: string }
  startTriplet?: number
  tripletMultiplier?: number
  tripletR?: number
  chord?: Array<{ name: string }>
  type?: string
  startBeam?: boolean
  endBeam?: boolean
  decoration?: string[]
}

interface PentagramaLeido {
  clef: { type: string }
  key: { accidentals?: Array<{ acc: string; note: string }> }
  voices: ElementoLeido[][]
}

interface VozLeida {
  clave: string
  /** Alteraciones de la armadura, como «f+» o «b-». */
  armadura: string[]
  notas: Nota[]
  /** Silencios, como [inicio, duración, tipo]: «rest» se ve, «invisible» no. */
  silencios: Array<[number, number, string]>
  cifrado: Array<[number, string]>
  barras: string[]
  /** Duración total leída, en ticks. */
  duracion: number
  /** Lo que dura cada una de las voces del pentagrama. */
  duracionPorVoz: number[]
  /** Grupos de notas unidas por una barra, como lista de inicios. */
  barrados: number[][]
  adornos: Array<[number, string]>
}

const SEMITONOS = [0, 2, 4, 5, 7, 9, 11]
const LETRAS = 'cdefgab'
const ALTERACIONES: Record<string, number> = { sharp: 1, flat: -1, natural: 0, dblsharp: 2, dblflat: -2 }
const DESPLAZAMIENTO: Record<string, number> = { treble: 0, bass: 0, 'treble+8': 12, 'bass-8': -12 }
/** Tecla General MIDI de cada posición de la clave de percusión (posición y alteración). */
const TECLA_DE_PERCUSION: Record<string, number> = { x3: 36, s7: 37, x7: 38, x11: 42, x1: 44, x5: 45, s11: 46, x12: 49, x9: 50, x10: 51, s10: 53 }

function leerAbc(abc: string): VozLeida[] {
  const [tune] = abcjs.parseOnly(abc)
  if (!tune) throw new Error('abcjs no ha leído ninguna pieza')
  expect(tune.warnings).toBeUndefined()
  const lineas = (tune.lines as unknown as Array<{ staff?: PentagramaLeido[] }>).flatMap((l) => (l.staff ? [l.staff] : []))
  const cuantas = lineas[0]?.length ?? 0
  return Array.from({ length: cuantas }, (_, v) => {
    const primero = lineas[0]?.[v] as PentagramaLeido
    const clave = primero.clef.type
    const armaduraPorLetra = new Map<number, number>()
    for (const a of primero.key.accidentals ?? []) armaduraPorLetra.set(LETRAS.indexOf(a.note.toLowerCase()), ALTERACIONES[a.acc] ?? 0)
    const voz: VozLeida = {
      clave,
      armadura: (primero.key.accidentals ?? []).map((a) => `${a.note}${a.acc === 'sharp' ? '+' : '-'}`),
      notas: [],
      silencios: [],
      cifrado: [],
      barras: [],
      duracion: 0,
      duracionPorVoz: [],
      barrados: [],
      adornos: [],
    }
    const cuantasVoces = primero.voices.length
    for (let k = 0; k < cuantasVoces; k++) {
      // Cada voz del pentagrama lleva su propia cuenta del tiempo, de las alteraciones y de las ligaduras.
      let t = 0
      let vigentes = new Map<number, number>()
      const abiertas = new Map<number, Nota>()
      let multiplicador = 1
      let quedanEnTresillo = 0
      let barrado: number[] | undefined
      for (const linea of lineas) {
        const elementos = (linea[v] as PentagramaLeido).voices[k] ?? []
        for (const el of elementos) {
          if (el.el_type === 'bar') {
            if (k === 0) voz.barras.push(el.type ?? '')
            vigentes = new Map()
            continue
          }
          if (el.el_type !== 'note') continue
          if (el.startTriplet) {
            multiplicador = el.tripletMultiplier ?? 1
            quedanEnTresillo = el.tripletR ?? el.startTriplet
          }
          const d = Math.round((el.duration ?? 0) * (quedanEnTresillo > 0 ? multiplicador : 1) * 1920)
          if (quedanEnTresillo > 0) quedanEnTresillo--
          for (const acorde of el.chord ?? []) voz.cifrado.push([t, acorde.name])
          for (const adorno of el.decoration ?? []) voz.adornos.push([t, adorno])
          if (el.startBeam) barrado = []
          barrado?.push(t)
          if (el.endBeam && barrado) {
            voz.barrados.push(barrado)
            barrado = undefined
          }
          if (el.rest) voz.silencios.push([t, d, el.rest.type])
          for (const p of el.pitches ?? []) {
            if (clave === 'perc') {
              const tecla = TECLA_DE_PERCUSION[`${p.accidental ? p.accidental.charAt(0) : 'x'}${p.verticalPos}`]
              if (tecla === undefined) throw new Error(`Posición de percusión desconocida: ${p.verticalPos}`)
              voz.notas.push({ t, d, n: tecla, v: 0 })
              continue
            }
            const pendiente = abiertas.get(p.pitch)
            if (p.endTie) {
              // Una ligadura que acaba tiene que venir de una nota de la misma altura.
              if (!pendiente) throw new Error(`Ligadura sin principio en el tick ${t}`)
              pendiente.d += d
              if (!p.startTie) abiertas.delete(p.pitch)
              continue
            }
            const letra = ((p.pitch % 7) + 7) % 7
            if (p.accidental !== undefined) vigentes.set(p.pitch, ALTERACIONES[p.accidental] ?? 0)
            const alteracion = vigentes.get(p.pitch) ?? armaduraPorLetra.get(letra) ?? 0
            const midi = 12 * (5 + Math.floor(p.pitch / 7)) + (SEMITONOS[letra] as number) + alteracion + (DESPLAZAMIENTO[clave] ?? 0)
            const nota: Nota = { t, d, n: midi, v: 0 }
            voz.notas.push(nota)
            if (p.startTie) abiertas.set(p.pitch, nota)
          }
          t += d
        }
      }
      // Ninguna ligadura se queda sin cerrar.
      expect(abiertas.size).toBe(0)
      voz.duracionPorVoz.push(t)
    }
    voz.duracion = Math.max(0, ...voz.duracionPorVoz)
    return voz
  })
}

const orden = (a: Nota, b: Nota): number => a.t - b.t || a.n - b.n
const sinIntensidad = (notas: readonly Nota[]): Nota[] => notas.map((n) => ({ ...n, v: 0 })).sort(orden)

/** Comprueba que cada voz escrita dice exactamente las notas de su pista. */
function comprobarIdaYVuelta(pieza: Pieza, abc = piezaAAbc(pieza)): VozLeida[] {
  const voces = leerAbc(abc)
  expect(voces).toHaveLength(pieza.pistas.length)
  const total = pieza.compases * ticksPorCompas(pieza.compas)
  pieza.pistas.forEach((pista, i) => {
    const voz = voces[i] as VozLeida
    // Todas las voces del pentagrama llenan la pieza entera.
    for (const duracion of voz.duracionPorVoz) expect(duracion).toBe(total)
    if (voz.clave === 'perc') {
      expect(voz.notas.map((n) => [n.t, n.n]).sort()).toEqual(pista.notas.map((n) => [n.t, n.n]).sort())
    } else {
      expect(sinIntensidad(voz.notas)).toEqual(sinIntensidad(pista.notas))
    }
    expect(voz.barras.length).toBe(pieza.compases)
  })
  return voces
}

// ───────────────────────────── pruebas ─────────────────────────────

describe('pieza a ABC: lo básico', () => {
  it('escribe la cabecera, una voz por pista y un compás por barra', () => {
    const pieza = piezaDePrueba([{ rol: 'melodia', notas: 'A4:4 D5:4 F#5:4. E5:8 | D5:4 B4:4 A4:2' }], { tempo: 104, tonalidad: 'D mayor' })
    expect(piezaAAbc(pieza)).toBe(['X:1', 'M:4/4', 'L:1/32', 'Q:1/4=104', 'K:D', 'V:1 clef=treble', '[V:1] A8 d8 f12e4 | d8 B8 A16 |]', ''].join('\n'))
    comprobarIdaYVuelta(pieza)
  })

  it('las corcheas y semicorcheas de un mismo pulso van unidas por la barra; las de pulsos distintos, no', () => {
    const pieza = piezaDePrueba([{ rol: 'melodia', notas: 'C4:8 D4:8 E4:16 F4:16 G4:16 A4:16 B4:8 C5:8 D5:4' }])
    const [voz] = comprobarIdaYVuelta(pieza)
    expect(voz?.barrados).toEqual([
      [0, 240],
      [480, 600, 720, 840],
      [960, 1200],
    ])
  })

  it('en un compás compuesto el pulso es la negra con puntillo', () => {
    const pieza = piezaDePrueba([{ rol: 'melodia', notas: 'C4:8 D4:8 E4:8 F4:4 G4:8 | A4:2. ' }], { compas: [6, 8] })
    expect(piezaAAbc(pieza)).toContain('[V:1] C4D4E4 F8G4 | A24 |]')
    const [voz] = comprobarIdaYVuelta(pieza)
    expect(voz?.barrados).toEqual([[0, 240, 480]])
  })

  it('un compás vacío es un silencio que lo llena, y una pista sin notas también se escribe', () => {
    const pieza = piezaDePrueba([
      { rol: 'melodia', notas: 'C4:1 | r:1 | r:2 C4:2' },
      { rol: 'bajo', instrumento: 'bajo-electrico', notas: '' },
    ])
    const abc = piezaAAbc(pieza)
    expect(abc).toContain('[V:1] C32 | z32 | z16 C16 |]')
    expect(abc).toContain('V:2 clef=bass')
    expect(abc).toContain('[V:2] z32 | z32 | z32 |]')
    comprobarIdaYVuelta(pieza)
  })

  it('respeta otros compases: 3/4, 2/4, 5/4, 12/8', () => {
    for (const [compas, notas] of [
      [[3, 4], 'C4:2. | C4:4 r:2 | r:2.'],
      [[2, 4], 'C4:2 | C4:8 r:8 r:4'],
      [[5, 4], 'C4:1 D4:4 | r:1 r:4'],
      [[12, 8], 'C4:1. | C4:4. D4:4. E4:2.'],
    ] as const) {
      const pieza = piezaDePrueba([{ rol: 'melodia', notas }], { compas })
      expect(piezaAAbc(pieza)).toContain(`M:${compas[0]}/${compas[1]}`)
      comprobarIdaYVuelta(pieza)
    }
  })

  it('reparte los compases en sistemas', () => {
    const pieza = piezaDePrueba([
      { rol: 'melodia', notas: 'C4:1 | D4:1 | E4:1 | F4:1 | G4:1' },
      { rol: 'bajo', instrumento: 'bajo-electrico', notas: 'C2:1 | % | % | % | %' },
    ])
    const lineas = piezaAAbc(pieza, { compasesPorLinea: 2 }).trim().split('\n').slice(-6)
    expect(lineas).toEqual(['[V:1] C32 | D32 |', '[V:2] C,,32 | C,,32 |', '[V:1] E32 | F32 |', '[V:2] C,,32 | C,,32 |', '[V:1] G32 |]', '[V:2] C,,32 |]'])
    comprobarIdaYVuelta(pieza, piezaAAbc(pieza, { compasesPorLinea: 2 }))
  })

  it('un bucle lleva barras de repetición', () => {
    const pieza = piezaDePrueba([{ rol: 'melodia', notas: 'C4:1 | D4:1' }], { bucle: true })
    expect(piezaAAbc(pieza)).toContain('[V:1]|: C32 | D32 :|')
    const [voz] = leerAbc(piezaAAbc(pieza))
    expect(voz?.barras).toEqual(['bar_left_repeat', 'bar_thin', 'bar_right_repeat'])
    expect(sinIntensidad(voz?.notas ?? [])).toEqual(sinIntensidad(pieza.pistas[0]?.notas ?? []))
  })

  it('se puede escribir solo una pista, y quitar el tempo', () => {
    const pieza = piezaDePrueba([
      { rol: 'melodia', notas: 'C5:1' },
      { rol: 'bajo', instrumento: 'bajo-electrico', notas: 'C2:1' },
    ])
    const abc = piezaAAbc(pieza, { pistas: ['bajo'], tempo: false })
    expect(abc).not.toContain('Q:')
    expect(abc).not.toContain('V:2')
    expect(leerAbc(abc)).toHaveLength(1)
    expect(() => piezaAAbc(pieza, { pistas: ['no-existe'] })).toThrow(ErrorDePentagrama)
  })
})

describe('pieza a ABC: figuras y ligaduras', () => {
  it('una nota que cruza la barra de compás se liga', () => {
    const pieza = piezaDePrueba([{ rol: 'melodia', notas: 'C4:2. D4:4~ | D4:2 r:2' }])
    expect(piezaAAbc(pieza)).toContain('[V:1] C24 D8- | D16 z16 |]')
    comprobarIdaYVuelta(pieza)
  })

  it('una duración que no es una figura se parte en figuras ligadas', () => {
    // Negra más semicorchea, y blanca más corchea.
    const pieza: Pieza = { tempo: 100, compas: [4, 4], compases: 1, pistas: [{ id: 'm', rol: 'melodia', instrumento: 'piano', notas: [{ t: 0, d: 600, n: 60, v: 90 }, { t: 720, d: 1200, n: 62, v: 90 }] }] }
    expect(piezaAAbc(pieza)).toContain('[V:1] C8- C2z2D4- D16 |]')
    comprobarIdaYVuelta(pieza)
  })

  it('una síncopa se escribe dejando ver el pulso', () => {
    const pieza = piezaDePrueba([{ rol: 'melodia', notas: 'C4:8 D4:4 E4:4 F4:4 G4:8' }])
    expect(piezaAAbc(pieza)).toContain('[V:1] C4D4- D4E4- E4F4- F4G4 |]')
    comprobarIdaYVuelta(pieza)
  })

  it('las notas repetidas no se ligan', () => {
    const pieza = piezaDePrueba([{ rol: 'melodia', notas: 'C4:4 C4:4 C4:2' }])
    expect(piezaAAbc(pieza)).toContain('[V:1] C8 C8 C16 |]')
    comprobarIdaYVuelta(pieza)
  })

  it('una nota larga debajo de otras cortas se escribe en acordes ligados', () => {
    const pieza: Pieza = {
      tempo: 100,
      compas: [4, 4],
      compases: 1,
      pistas: [
        {
          id: 'm',
          rol: 'melodia',
          instrumento: 'piano',
          notas: [
            { t: 0, d: 1920, n: 60, v: 90 },
            { t: 0, d: 480, n: 64, v: 90 },
            { t: 480, d: 480, n: 65, v: 90 },
            { t: 960, d: 960, n: 67, v: 90 },
          ],
        },
      ],
    }
    const abc = piezaAAbc(pieza)
    // Dos voces en el mismo pentagrama: arriba la melodía, abajo la nota larga.
    expect(abc).toContain('%%score (1 2)\nV:1 clef=treble\nV:2 clef=treble\n')
    expect(abc).toContain('[V:1] E8 F8 G16 |]')
    expect(abc).toContain('[V:2] C32 |]')
    expect(comprobarIdaYVuelta(pieza)).toHaveLength(1)
  })

  it('la capa más aguda va primero aunque la grave entre antes, y la que calla lo hace sin silencios visibles', () => {
    const pieza: Pieza = {
      tempo: 100,
      compas: [4, 4],
      compases: 2,
      pistas: [
        {
          id: 'm',
          rol: 'melodia',
          instrumento: 'piano',
          notas: [
            { t: 0, d: 1920, n: 48, v: 90 },
            { t: 480, d: 480, n: 72, v: 90 },
            { t: 960, d: 960, n: 74, v: 90 },
            { t: 1920, d: 1920, n: 76, v: 90 },
          ],
        },
      ],
    }
    const abc = piezaAAbc(pieza)
    expect(abc).toContain("[V:1] z8 c8 d16 | e32 |]")
    expect(abc).toContain('[V:2] C,32 | x32 |]')
    const [voz] = comprobarIdaYVuelta(pieza)
    expect(voz?.silencios).toEqual([
      [0, 480, 'rest'],
      [1920, 1920, 'invisible'],
    ])
  })

  it('un acorde partido en varias figuras liga todas sus notas', () => {
    const pieza = piezaDePrueba([{ rol: 'armonia', notas: '[C4 E4 G4]:2.~ [C4 E4 G4]:4~ | [C4 E4 G4]:1' }])
    expect(piezaAAbc(pieza)).toContain('[V:1] [CEG]32- | [CEG]32 |]')
    expect(piezaAAbc(pieza)).not.toContain('%%score')
    comprobarIdaYVuelta(pieza)
  })

  it('una pista sin solapamientos no se reparte en capas, y las demás pistas conservan su pentagrama', () => {
    const pieza: Pieza = {
      tempo: 100,
      compas: [4, 4],
      compases: 1,
      pistas: [
        { id: 'a', rol: 'melodia', instrumento: 'piano', notas: [{ t: 0, d: 1920, n: 72, v: 90 }] },
        { id: 'b', rol: 'armonia', instrumento: 'piano', notas: [{ t: 0, d: 1920, n: 60, v: 90 }, { t: 960, d: 960, n: 64, v: 90 }] },
        { id: 'c', rol: 'bajo', instrumento: 'bajo-electrico', notas: [{ t: 0, d: 1920, n: 36, v: 90 }] },
      ],
    }
    expect(piezaAAbc(pieza)).toContain('%%score 1 (2 3) 4\n')
    expect(comprobarIdaYVuelta(pieza)).toHaveLength(3)
  })

  it('escribe figuras con doble puntillo y fusas', () => {
    const pieza = piezaDePrueba([{ rol: 'melodia', notas: 'C4:4.. D4:16 E4:32 F4:32 G4:16 A4:8 B4:4' }])
    comprobarIdaYVuelta(pieza)
  })

  it('recorta lo que se sale de la pieza y no escribe las notas sin duración', () => {
    const pieza: Pieza = {
      tempo: 100,
      compas: [4, 4],
      compases: 1,
      pistas: [{ id: 'm', rol: 'melodia', instrumento: 'piano', notas: [{ t: 0, d: 0, n: 72, v: 90 }, { t: 960, d: 4000, n: 60, v: 90 }, { t: 5000, d: 480, n: 64, v: 90 }] }],
    }
    expect(piezaAAbc(pieza)).toContain('[V:1] z16 C16 |]')
  })
})

describe('pieza a ABC: tresillos', () => {
  it('escribe un tresillo de corcheas', () => {
    const pieza = piezaDePrueba([{ rol: 'melodia', notas: 'C4:8t D4:8t E4:8t F4:4 G4:2' }])
    expect(piezaAAbc(pieza)).toContain('[V:1] (3:2:3C4D4E4 F8 G16 |]')
    comprobarIdaYVuelta(pieza)
  })

  it('negra y corchea de tresillo, y un silencio dentro', () => {
    const pieza = piezaDePrueba([{ rol: 'melodia', notas: 'C4:4t D4:8t r:8t E4:8t F4:8t G4:2' }])
    expect(piezaAAbc(pieza)).toContain('[V:1] (3:2:2C8D4 (3:2:3z4E4F4 G16 |]')
    comprobarIdaYVuelta(pieza)
  })

  it('tresillos de negra y de semicorchea', () => {
    const pieza = piezaDePrueba([{ rol: 'melodia', notas: 'C4:4t D4:4t E4:4t F4:16t G4:16t A4:16t B4:8 C5:4' }])
    expect(piezaAAbc(pieza)).toContain('[V:1] (3:2:3C8D8E8 (3:2:3F2G2A2 B4 c8 |]')
    comprobarIdaYVuelta(pieza)
  })

  it('una nota que sale ligada de un tresillo', () => {
    const pieza: Pieza = { tempo: 100, compas: [4, 4], compases: 1, pistas: [{ id: 'm', rol: 'melodia', instrumento: 'piano', notas: [{ t: 0, d: 160, n: 60, v: 90 }, { t: 160, d: 160, n: 62, v: 90 }, { t: 320, d: 640, n: 64, v: 90 }, { t: 960, d: 960, n: 65, v: 90 }] }] }
    expect(piezaAAbc(pieza)).toContain('[V:1] (3:2:3C4D4E4- E8 F16 |]')
    comprobarIdaYVuelta(pieza)
  })

  it('elige el grupo más amplio que explica el ritmo: un tercio y dos tercios de blanca son un tresillo de negras', () => {
    const pieza: Pieza = { tempo: 100, compas: [4, 4], compases: 1, pistas: [{ id: 'm', rol: 'melodia', instrumento: 'piano', notas: [{ t: 0, d: 320, n: 60, v: 90 }, { t: 320, d: 640, n: 62, v: 90 }, { t: 960, d: 960, n: 64, v: 90 }] }] }
    expect(piezaAAbc(pieza)).toContain('[V:1] (3:2:2C8D16 E16 |]')
    comprobarIdaYVuelta(pieza)
  })

  it('un grupo de tresillo no se monta a caballo de dos pulsos: se escribe por pulsos, con ligaduras', () => {
    // Tres negras de tresillo que empiezan en el segundo tiempo de un 4/4.
    const cruzado: Pieza = { tempo: 100, compas: [4, 4], compases: 1, pistas: [{ id: 'm', rol: 'melodia', instrumento: 'piano', notas: [480, 800, 1120].map((t, i) => ({ t, d: 320, n: 60 + i * 2, v: 90 })) }] }
    expect(piezaAAbc(cruzado)).toContain('[V:1] z8 (3:2:2C8D4- (3:2:2D4E8 z8 |]')
    comprobarIdaYVuelta(cruzado)
  })

  it('ni de dos compases', () => {
    // En 3/4, un tresillo de negras cabe en los dos primeros tiempos...
    const dentro: Pieza = { tempo: 100, compas: [3, 4], compases: 1, pistas: [{ id: 'm', rol: 'melodia', instrumento: 'piano', notas: [0, 320, 640].map((t) => ({ t, d: 320, n: 60, v: 90 })) }] }
    expect(piezaAAbc(dentro)).toContain('[V:1] (3:2:3C8C8C8 z8 |]')
    comprobarIdaYVuelta(dentro)
    // ...y, si empieza en el tercero, se parte en la barra.
    const fuera: Pieza = { tempo: 100, compas: [3, 4], compases: 2, pistas: [{ id: 'm', rol: 'melodia', instrumento: 'piano', notas: [960, 1280, 1600].map((t, i) => ({ t, d: 320, n: 60 + i * 2, v: 90 })) }] }
    expect(piezaAAbc(fuera)).toContain('[V:1] z16 (3:2:2C8D4- | (3:2:2D4E8 z16 |]')
    comprobarIdaYVuelta(fuera)
  })

  it('lo que no cae ni en fusas ni en tercios no se escribe', () => {
    const quintillo: Pieza = { tempo: 100, compas: [4, 4], compases: 1, pistas: [{ id: 'm', rol: 'melodia', instrumento: 'piano', notas: [0, 96, 192, 288, 384].map((t) => ({ t, d: 96, n: 60, v: 90 })) }] }
    expect(() => piezaAAbc(quintillo)).toThrow(ErrorDePentagrama)
    expect(() => piezaAAbc(quintillo)).toThrow('En el compás 1 hay una figura que el pentagrama no sabe escribir.')
    expect(cabeEnPentagrama(quintillo)).toBe(false)
    // Un corte en un tercio y otro que no cae en ninguna rejilla, tampoco.
    const mezcla: Pieza = { ...quintillo, pistas: [{ id: 'm', rol: 'melodia', instrumento: 'piano', notas: [{ t: 0, d: 160, n: 60, v: 90 }, { t: 200, d: 120, n: 62, v: 90 }] }] }
    expect(cabeEnPentagrama(mezcla)).toBe(false)
    expect(cabeEnPentagrama(piezaDePrueba([{ rol: 'melodia', notas: 'C4:8t D4:8t E4:8t F4:4 G4:2' }]))).toBe(true)
  })
})

describe('pieza a ABC: tonalidad y alteraciones', () => {
  it('la armadura es la de la tonalidad, y la de su relativo mayor en menores y modos', () => {
    const armadura = (tonalidad: string): string[] => leerAbc(piezaAAbc(piezaDePrueba([{ rol: 'melodia', notas: 'C4:1' }], { tonalidad })))[0]?.armadura ?? []
    expect(armadura('D mayor')).toEqual(['f+', 'c+'])
    expect(armadura('B menor')).toEqual(['f+', 'c+'])
    expect(armadura('E dorico')).toEqual(['f+', 'c+'])
    expect(armadura('Bb mayor')).toEqual(['B-', 'e-'])
    expect(armadura('C mayor')).toEqual([])
    expect(armadura('C tonos enteros')).toEqual([])
  })

  it('las notas de la armadura no llevan alteración; las demás, sí, y dura hasta la barra', () => {
    const pieza = piezaDePrueba([{ rol: 'melodia', notas: 'F#4:4 F4:4 F4:4 F#4:4 | F4:4 F#4:4 C#5:4 C5:4' }], { tonalidad: 'D mayor' })
    expect(piezaAAbc(pieza)).toContain('[V:1] F8 =F8 F8 ^F8 | =F8 ^F8 c8 =c8 |]')
    comprobarIdaYVuelta(pieza)
  })

  it('una alteración vale solo para su octava', () => {
    const pieza = piezaDePrueba([{ rol: 'melodia', notas: 'F4:4 F5:4 F4:4 F5:4' }], { tonalidad: 'D mayor' })
    expect(piezaAAbc(pieza)).toContain('[V:1] =F8 =f8 F8 f8 |]')
    comprobarIdaYVuelta(pieza)
  })

  it('una nota ligada desde el compás anterior no repite la alteración, y la siguiente igual sí', () => {
    const pieza = piezaDePrueba([{ rol: 'melodia', notas: 'C4:2. Bb4:4~ | Bb4:4 Bb4:4 B4:2' }], { tonalidad: 'C mayor' })
    expect(piezaAAbc(pieza)).toContain('[V:1] C24 _B8- | B8 _B8 =B16 |]')
    comprobarIdaYVuelta(pieza)
  })

  it('en menor, la sensible y el sexto grado elevado se escriben como grados alterados', () => {
    const pieza = piezaDePrueba([{ rol: 'melodia', notas: 'G4:4 F#4:4 E4:4 Eb4:4 | Ab4:4 C#5:4 B4:4 Bb4:4' }], { tonalidad: 'G menor' })
    expect(piezaAAbc(pieza)).toContain('[V:1] G8 ^F8 =E8 _E8 | _A8 ^c8 =B8 _B8 |]')
    comprobarIdaYVuelta(pieza)
  })

  it('sin tonalidad escribe como en Do mayor', () => {
    const pieza = piezaDePrueba([{ rol: 'melodia', notas: 'C4:4 C#4:4 Eb4:4 F#4:4 | G#4:4 Bb4:4 B4:2' }])
    expect(piezaAAbc(pieza)).toContain('K:C\n')
    expect(piezaAAbc(pieza)).toContain('[V:1] C8 ^C8 _E8 ^F8 | ^G8 _B8 =B16 |]')
    comprobarIdaYVuelta(pieza)
  })

  it('escribe bien todas las tonalidades mayores y menores, con sus notas de paso', () => {
    const cromatica = Array.from({ length: 13 }, (_, i) => i)
    for (const tonica of ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb']) {
      for (const modo of ['mayor', 'menor', 'dorico', 'mixolidio', 'frigio', 'lidio', 'menor armonica', 'pentatonica menor', 'blues']) {
        let tonalidad: string
        try {
          tonalidad = leerTonalidad(`${tonica} ${modo}`).texto
        } catch {
          continue
        }
        const notas: Nota[] = [...cromatica, ...cromatica.toReversed()].map((s, i) => ({ t: i * 240, d: 240, n: 60 + s, v: 90 }))
        const pieza: Pieza = { tempo: 100, compas: [4, 4], compases: 4, tonalidad, pistas: [{ id: 'm', rol: 'melodia', instrumento: 'piano', notas }] }
        comprobarIdaYVuelta(pieza)
      }
    }
  })

  it('la ortografía sigue a la escala y evita las dobles alteraciones en las notas de paso', () => {
    expect(ortografiaDe(leerTonalidad('G menor'))).toEqual(['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'])
    expect(ortografiaDe(leerTonalidad('D mayor'))).toEqual(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'])
    // En Fa♯ mayor, el cuarto grado elevado es Si♯; el primero y el quinto elevados serían dobles sostenidos y se escriben Sol y Re.
    expect(ortografiaDe(leerTonalidad('F# mayor'))).toEqual(['B#', 'C#', 'D', 'D#', 'E', 'E#', 'F#', 'G', 'G#', 'A', 'A#', 'B'])
    expect(ortografiaDe(leerTonalidad('Db mayor'))).toEqual(['C', 'Db', 'D', 'Eb', 'Fb', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'Cb'])
    expect(ortografiaDe(undefined)).toEqual(['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'])
  })
})

describe('pieza a ABC: claves', () => {
  const clave = (notas: string, rol: 'melodia' | 'bajo' = 'melodia', instrumento: 'piano' | 'bajo-electrico' | 'chip-pulso' = 'piano'): string => {
    const pieza = piezaDePrueba([{ rol, instrumento, notas }])
    const [voz] = comprobarIdaYVuelta(pieza)
    return voz?.clave ?? ''
  }

  it('elige la clave en la que la pista se sale menos del pentagrama', () => {
    expect(clave('C4:4 E4:4 G4:4 C5:4')).toBe('treble')
    expect(clave('C2:4 G2:4 C3:4 E3:4')).toBe('bass')
    expect(clave('C6:4 G6:4 C7:4 E7:4', 'melodia', 'chip-pulso')).toBe('treble+8')
    expect(clave('E1:4 A1:4 D2:4 G1:4', 'bajo', 'bajo-electrico')).toBe('bass-8')
  })

  it('a igualdad, la de sol; para un bajo, la de fa', () => {
    expect(clave('A3:4 C4:4 E4:4 C4:4')).toBe('treble')
    expect(clave('A3:4 C4:4 E4:4 C4:4', 'bajo')).toBe('bass')
  })

  it('en las claves con un 8, lo escrito va una octava más cerca del pentagrama', () => {
    const grave = piezaDePrueba([{ rol: 'bajo', instrumento: 'bajo-electrico', notas: 'E1:1' }])
    expect(piezaAAbc(grave)).toContain('V:1 clef=bass-8')
    // Mi1 suena; se escribe Mi2.
    expect(piezaAAbc(grave)).toContain('[V:1] E,,32 |]')
    const aguda = piezaDePrueba([{ rol: 'melodia', instrumento: 'chip-pulso', notas: 'C7:1' }])
    expect(piezaAAbc(aguda)).toContain("[V:1] c'32 |]")
  })
})

describe('pieza a ABC: percusión', () => {
  it('escribe la batería en su clave, con su mapa de cabezas y sin armadura', () => {
    const pieza = piezaDePrueba(
      [
        { rol: 'melodia', notas: 'D4:1' },
        { rol: 'percusion', instrumento: 'bateria', notas: 'bombo:4 charles:8 charles:8 caja:4 charles:8 charles:8' },
      ],
      { tonalidad: 'D mayor' },
    )
    const abc = piezaAAbc(pieza)
    expect(abc).toContain('%%percmap F 36\n')
    expect(abc).toContain('%%percmap g 42 x\n')
    expect(abc).toContain('V:2 clef=perc')
    expect(abc).toContain('[V:2][K:C] F8 g4g4 c8 g4g4 |]')
    const voces = comprobarIdaYVuelta(pieza)
    expect(voces[0]?.armadura).toEqual(['f+', 'c+'])
    expect(voces[1]?.armadura).toEqual([])
  })

  it('una pieza sin percusión no lleva mapa de cabezas', () => {
    expect(piezaAAbc(piezaDePrueba([{ rol: 'melodia', notas: 'D4:1' }]))).not.toContain('percmap')
  })

  it('cada golpe dura hasta el siguiente o hasta el final de su pulso, y los que coinciden forman un acorde', () => {
    const pieza: Pieza = {
      tempo: 100,
      compas: [4, 4],
      compases: 1,
      pistas: [
        {
          id: 'p',
          rol: 'percusion',
          instrumento: 'bateria',
          // Golpes cortísimos: lo que se escribe no depende de su duración.
          notas: [
            { t: 0, d: 30, n: 36, v: 100 },
            { t: 0, d: 30, n: 42, v: 100 },
            { t: 360, d: 30, n: 36, v: 100 },
            { t: 480, d: 30, n: 38, v: 100 },
            { t: 480, d: 30, n: 46, v: 100 },
            { t: 1200, d: 30, n: 37, v: 100 },
          ],
        },
      ],
    }
    const abc = piezaAAbc(pieza)
    expect(abc).toContain('[V:1][K:C] [Fg]6F2 !open![c^g]8 z4^c4 z8 |]')
    const [voz] = comprobarIdaYVuelta(pieza)
    expect(voz?.adornos).toEqual([[480, 'open']])
  })

  it('un golpe que no cabe en una sola figura se completa con silencio, no con ligadura', () => {
    const pieza: Pieza = { tempo: 100, compas: [4, 4], compases: 1, pistas: [{ id: 'p', rol: 'percusion', instrumento: 'bateria', notas: [{ t: 60, d: 30, n: 38, v: 100 }] }] }
    expect(piezaAAbc(pieza)).toContain('[V:1][K:C] zc6z z24 |]')
    comprobarIdaYVuelta(pieza)
  })

  it('escribe un ritmo atresillado de charles', () => {
    const pieza = piezaDePrueba([{ rol: 'percusion', instrumento: 'bateria', notas: 'charles:8t charles:8t charles:8t bombo:4 caja:2' }])
    expect(piezaAAbc(pieza)).toContain('[V:1][K:C] (3:2:3g4g4g4 F8 c8 z8 |]')
    comprobarIdaYVuelta(pieza)
  })

  it('todas las piezas de la batería tienen su sitio', () => {
    const teclas = [36, 37, 38, 42, 44, 45, 46, 49, 50, 51, 53]
    const pieza: Pieza = { tempo: 100, compas: [4, 4], compases: 3, pistas: [{ id: 'p', rol: 'percusion', instrumento: 'bateria', notas: teclas.map((n, i) => ({ t: i * 480, d: 120, n, v: 100 })) }] }
    comprobarIdaYVuelta(pieza)
  })
})

describe('pieza a ABC: cifrado', () => {
  it('escribe los acordes sobre la primera voz afinada, cada uno en su sitio', () => {
    const pieza = piezaDePrueba(
      [
        { rol: 'percusion', instrumento: 'bateria', notas: 'bombo:1 | bombo:1' },
        { rol: 'melodia', notas: 'A4:1 | B4:2 C#5:2' },
        { rol: 'bajo', instrumento: 'bajo-electrico', notas: 'D2:1 | G2:2 A2:2' },
      ],
      { tonalidad: 'D mayor', acordesTexto: 'D:1 | G:2 A7:2' },
    )
    const voces = comprobarIdaYVuelta(pieza)
    expect(voces.map((v) => v.cifrado)).toEqual([
      [],
      [
        [0, 'D'],
        [1920, 'G'],
        [2880, 'A7'],
      ],
      [],
    ])
  })

  it('si el acorde cambia en mitad de una nota, la nota se parte y se liga', () => {
    const pieza = piezaDePrueba([{ rol: 'melodia', notas: 'A4:1' }], { tonalidad: 'D mayor', acordesTexto: 'D:2 F#m:2' })
    expect(piezaAAbc(pieza)).toContain('[V:1] "D"A16- "F#m"A16 |]')
    comprobarIdaYVuelta(pieza)
  })

  it('se puede pedir sin cifrado', () => {
    const pieza = piezaDePrueba([{ rol: 'melodia', notas: 'A4:1' }], { tonalidad: 'D mayor', acordesTexto: 'D:2 F#m:2' })
    expect(piezaAAbc(pieza, { acordes: false })).toContain('[V:1] A32 |]')
  })
})

describe('pieza a ABC: piezas al azar', () => {
  /** Monta una pista con notas de duraciones y alturas al azar sobre una rejilla, con polifonía. */
  function pistaAlAzar(semilla: number, rejilla: number, total: number): Nota[] {
    const azar = azarConSemilla(semilla)
    const notas: Nota[] = []
    const voces = 1 + Math.floor(azar() * 3)
    for (let v = 0; v < voces; v++) {
      let t = Math.floor(azar() * 4) * rejilla
      while (t < total) {
        const d = (1 + Math.floor(azar() * 9)) * rejilla
        const n = 48 + v * 12 + Math.floor(azar() * 12)
        // Dos notas de la misma altura no se pisan: el lector no podría distinguirlas.
        if (!notas.some((o) => o.n === n && o.t < t + d && o.t + o.d > t)) notas.push({ t, d: Math.min(d, total - t), n, v: 90 })
        t += d + Math.floor(azar() * 3) * rejilla
      }
    }
    return notas
  }

  it('cualquier pista sobre la rejilla de semicorcheas se lee tal como se escribió', () => {
    for (let semilla = 1; semilla <= 60; semilla++) {
      const compas = ([[4, 4], [3, 4], [6, 8], [2, 4], [5, 4], [12, 8], [7, 8]] as const)[semilla % 7] as readonly [number, number]
      const compases = 3
      const total = compases * ticksPorCompas(compas)
      const tonalidad = ['C mayor', 'D mayor', 'G menor', 'Eb mayor', 'F# menor', 'A dorico'][semilla % 6] as string
      const pieza: Pieza = { tempo: 100, compas, compases, tonalidad, pistas: [{ id: 'a', rol: 'melodia', instrumento: 'piano', notas: pistaAlAzar(semilla, 120, total) }] }
      comprobarIdaYVuelta(pieza)
      comprobarIdaYVuelta(pieza, piezaAAbc(pieza, { compasesPorLinea: 2 }))
    }
  })

  it('y sobre la de fusas', () => {
    for (let semilla = 100; semilla <= 130; semilla++) {
      const pieza: Pieza = { tempo: 100, compas: [4, 4], compases: 2, pistas: [{ id: 'a', rol: 'melodia', instrumento: 'piano', notas: pistaAlAzar(semilla, 60, 3840) }] }
      comprobarIdaYVuelta(pieza)
    }
  })

  it('y con pulsos atresillados mezclados con pulsos normales', () => {
    for (let semilla = 200; semilla <= 240; semilla++) {
      const azar = azarConSemilla(semilla)
      const notas: Nota[] = []
      for (let pulso = 0; pulso < 12; pulso++) {
        const inicio = pulso * 480
        const partes = azar() < 0.5 ? [160, 160, 160] : azar() < 0.5 ? [240, 240] : [120, 120, 240]
        let t = inicio
        for (const d of partes) {
          if (azar() < 0.8) notas.push({ t, d, n: 60 + Math.floor(azar() * 12), v: 90 })
          t += d
        }
      }
      const pieza: Pieza = { tempo: 100, compas: [4, 4], compases: 3, tonalidad: 'C mayor', pistas: [{ id: 'a', rol: 'melodia', instrumento: 'piano', notas }] }
      comprobarIdaYVuelta(pieza)
    }
  })
})
