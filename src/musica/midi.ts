/**
 * Exportación de una pieza a un archivo MIDI estándar (formato 1), para
 * seguir trabajándola en un secuenciador o en un editor de partituras.
 *
 * El archivo lleva el tempo, el compás, la armadura y una pista por cada pista
 * de la pieza, con su nombre y su programa General MIDI; la percusión va al
 * canal 10. Los ticks pasan tal cual: el archivo usa también 480 por negra.
 * El swing no se escribe: es una forma de tocar, y el secuenciador tiene la suya.
 *
 * La librería (@tonejs/midi) se descarga solo al exportar.
 */
import type { Midi } from '@tonejs/midi'
import { INSTRUMENTOS, type Instrumento } from './instrumentos.ts'
import { NOMBRES_ROL, type Pieza, duracionEnTicks } from './pieza.ts'
import { PPQ } from './tiempo.ts'
import { type Armadura, armaduraDe, leerTonalidad } from './tonalidad.ts'

type ClaseMidi = typeof Midi

async function cargarLibreria(): Promise<ClaseMidi> {
  // El paquete es CommonJS: según quién lo importe (Node o el empaquetador), `Midi` llega como exportación con nombre o dentro de `default`.
  const modulo = (await import('@tonejs/midi')) as { Midi?: ClaseMidi; default?: { Midi?: ClaseMidi } }
  const clase = modulo.Midi ?? modulo.default?.Midi
  if (!clase) throw new Error('No se ha podido cargar el exportador de MIDI.')
  return clase
}

/** Canal de percusión de General MIDI (el 10, contando desde 1). */
const CANAL_DE_PERCUSION = 9

const SUSTITUTOS: Readonly<Record<string, string>> = { '…': '...', '’': "'", '‘': "'", '“': '"', '”': '"', '–': '-', '—': '-', '♯': '#', '♭': 'b' }

/** Los textos de un archivo MIDI se escriben con un byte por letra: lo que no cabe en Latin-1 se sustituye. */
function textoMidi(texto: string): string {
  return [...texto].map((letra) => SUSTITUTOS[letra] ?? ((letra.codePointAt(0) ?? 0) <= 0xff ? letra : '?')).join('')
}

/**
 * La librería escribe mal la armadura (suma 7 al índice de la tonalidad en vez
 * de restarlo), así que el byte se corrige en el archivo ya escrito. El evento
 * es «FF 59 02 alteraciones modo» y está en la primera pista, después del
 * título; `desde` salta el título para no confundirlo con su texto.
 */
function corregirArmadura(archivo: Uint8Array, armadura: Armadura, desde: number): void {
  for (let i = desde; i + 4 < archivo.length; i++) {
    if (archivo[i] === 0xff && archivo[i + 1] === 0x59 && archivo[i + 2] === 0x02) {
      // Complemento a dos: −2 se escribe 0xFE.
      archivo[i + 3] = armadura.alteraciones & 0xff
      archivo[i + 4] = armadura.menor ? 1 : 0
      return
    }
  }
  throw new Error('No se ha encontrado la armadura en el archivo MIDI.')
}

/** Convierte una pieza en los bytes de un archivo MIDI. */
export async function piezaAMidi(pieza: Pieza): Promise<Uint8Array> {
  const Clase = await cargarLibreria()
  const midi = new Clase()
  if (midi.header.ppq !== PPQ) throw new Error(`El exportador de MIDI trabaja a ${midi.header.ppq} ticks por negra y la app, a ${PPQ}.`)
  const titulo = textoMidi(pieza.titulo ?? 'Leitmotiv').slice(0, 200)
  midi.header.name = titulo
  midi.header.tempos.push({ ticks: 0, bpm: pieza.tempo })
  midi.header.timeSignatures.push({ ticks: 0, timeSignature: [pieza.compas[0], pieza.compas[1]] })
  const armadura = pieza.tonalidad === undefined ? undefined : armaduraDe(leerTonalidad(pieza.tonalidad))
  if (armadura) midi.header.keySignatures.push({ ticks: 0, key: 'C', scale: armadura.menor ? 'minor' : 'major' })
  // Un marcador en el último tick: sin él, el archivo acabaría en la última nota y un bucle con silencio final quedaría más corto.
  midi.header.meta.push({ type: 'marker', text: 'Fin', ticks: duracionEnTicks(pieza) })
  midi.header.update()

  let canalLibre = 0
  for (const pista of pieza.pistas) {
    const instrumento: Instrumento = INSTRUMENTOS[pista.instrumento]
    const salida = midi.addTrack()
    salida.name = textoMidi(pista.nombre ?? NOMBRES_ROL[pista.rol])
    if (instrumento.percusion) {
      salida.channel = CANAL_DE_PERCUSION
    } else {
      if (canalLibre === CANAL_DE_PERCUSION) canalLibre++
      // Dieciséis canales: con más pistas afinadas que canales, las últimas comparten el 16.
      salida.channel = Math.min(canalLibre++, 15)
      salida.instrument.number = instrumento.programaGM
    }
    for (const nota of pista.notas) {
      if (nota.d <= 0) continue
      const velocidad = Math.min(127, Math.max(1, Math.round(nota.v)))
      // La librería guarda la velocidad entre 0 y 1 y la escribe redondeando hacia abajo: el medio punto evita perder una unidad.
      salida.addNote({ midi: Math.min(127, Math.max(0, Math.round(nota.n))), ticks: Math.max(0, Math.round(nota.t)), durationTicks: Math.round(nota.d), velocity: (velocidad + 0.5) / 127 })
    }
  }

  const archivo = midi.toArray()
  // Cabecera (14 bytes), cabecera de la primera pista (8) y el evento del título: delta, FF 03, longitud (uno o dos bytes) y texto.
  if (armadura) corregirArmadura(archivo, armadura, 22 + 3 + (titulo.length < 0x80 ? 1 : 2) + titulo.length)
  return archivo
}

/** Nombre de archivo para una pieza: «Marcha del héroe» → «marcha-del-heroe.mid». */
export function nombreDeArchivoMidi(titulo: string | undefined): string {
  const base = (titulo ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return `${base === '' ? 'pieza' : base}.mid`
}
