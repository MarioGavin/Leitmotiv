/**
 * Catálogo de instrumentos de Leitmotiv.
 *
 * Es la única fuente de verdad sobre qué instrumentos existen, su registro y
 * cómo se exportan a MIDI. Lo usan el motor de audio, los validadores de
 * contenido, el piano roll y la exportación MIDI. Los instrumentos de tipo
 * «muestras» se construyen con `npm run samples:build` (scripts/muestras).
 *
 * Las notas son números MIDI con Do central = Do4 = 60.
 */

export type FamiliaInstrumento = 'teclas' | 'cuerdas' | 'bajo' | 'percusion' | 'chip'

export interface PiezaPercusion {
  /** Tecla MIDI (mapa General MIDI de percusión, canal 10). */
  readonly tecla: number
  /** Nombre visible en la interfaz. */
  readonly nombre: string
  /** Nombre corto, para los rótulos de las líneas del piano roll. */
  readonly corto: string
}

interface InstrumentoComun {
  readonly nombre: string
  readonly familia: FamiliaInstrumento
  /** Registro que el instrumento puede tocar: [nota más grave, nota más aguda]. */
  readonly rango: readonly [number, number]
  /** Qué enseña o para qué sirve, en una frase. */
  readonly descripcion: string
}

export interface InstrumentoMuestreado extends InstrumentoComun {
  readonly tipo: 'muestras'
  /** Programa General MIDI (0–127) para la exportación. */
  readonly programaGM: number
  readonly percusion?: undefined
}

export interface InstrumentoSinte extends InstrumentoComun {
  readonly tipo: 'sinte'
  readonly programaGM: number
  readonly percusion?: undefined
  /** Máximo de notas simultáneas (los canales de un chip son monofónicos). */
  readonly polifonia: number
}

export interface InstrumentoPercusion extends InstrumentoComun {
  readonly tipo: 'muestras' | 'sinte'
  readonly programaGM?: undefined
  /** Piezas disponibles, por alias. El alias es lo que se escribe en el contenido. */
  readonly percusion: Readonly<Record<string, PiezaPercusion>>
}

export type Instrumento = InstrumentoMuestreado | InstrumentoSinte | InstrumentoPercusion

export const INSTRUMENTOS = {
  piano: {
    nombre: 'Piano de cola',
    familia: 'teclas',
    tipo: 'muestras',
    rango: [21, 108],
    programaGM: 0,
    descripcion: 'El instrumento de referencia para escuchar melodías y acordes con claridad.',
  },
  cuerdas: {
    nombre: 'Sección de cuerda',
    familia: 'cuerdas',
    tipo: 'muestras',
    rango: [28, 96],
    programaGM: 48,
    descripcion: 'Contrabajos, violonchelos y violines con notas sostenidas: el colchón armónico de la orquesta.',
  },
  'bajo-electrico': {
    nombre: 'Bajo eléctrico',
    familia: 'bajo',
    tipo: 'muestras',
    rango: [28, 67],
    programaGM: 33,
    descripcion: 'Bajo de cuatro cuerdas tocado con los dedos, para líneas de funk, pop y jazz.',
  },
  bateria: {
    nombre: 'Batería',
    familia: 'percusion',
    tipo: 'muestras',
    rango: [36, 53],
    descripcion: 'Batería acústica de jazz tocada con baquetas.',
    percusion: {
      bombo: { tecla: 36, nombre: 'Bombo', corto: 'Bombo' },
      aro: { tecla: 37, nombre: 'Golpe de aro', corto: 'Aro' },
      caja: { tecla: 38, nombre: 'Caja', corto: 'Caja' },
      charles: { tecla: 42, nombre: 'Charles cerrado', corto: 'Charles' },
      charles_pedal: { tecla: 44, nombre: 'Charles con pedal', corto: 'Pedal' },
      charles_abierto: { tecla: 46, nombre: 'Charles abierto', corto: 'Abierto' },
      tom_grave: { tecla: 45, nombre: 'Tom grave', corto: 'Tom gr.' },
      tom_agudo: { tecla: 50, nombre: 'Tom agudo', corto: 'Tom ag.' },
      crash: { tecla: 49, nombre: 'Plato crash', corto: 'Crash' },
      ride: { tecla: 51, nombre: 'Plato ride', corto: 'Ride' },
      campana: { tecla: 53, nombre: 'Campana del ride', corto: 'Campana' },
    },
  },
  'chip-pulso': {
    nombre: 'Onda de pulso (chip)',
    familia: 'chip',
    tipo: 'sinte',
    rango: [33, 108],
    programaGM: 80,
    polifonia: 1,
    descripcion: 'El canal melódico de las consolas de 8 bits: una onda cuadrada con ciclo de trabajo variable.',
  },
  'chip-triangulo': {
    nombre: 'Onda triangular (chip)',
    familia: 'chip',
    tipo: 'sinte',
    rango: [24, 96],
    programaGM: 81,
    polifonia: 1,
    descripcion: 'El canal que hacía de bajo en las consolas de 8 bits: suave y sin control de volumen.',
  },
} as const satisfies Record<string, Instrumento>

export type IdInstrumento = keyof typeof INSTRUMENTOS

export const IDS_INSTRUMENTOS = Object.keys(INSTRUMENTOS) as readonly IdInstrumento[]

export function esIdInstrumento(valor: string): valor is IdInstrumento {
  return Object.hasOwn(INSTRUMENTOS, valor)
}

export function instrumento(id: IdInstrumento): Instrumento {
  return INSTRUMENTOS[id]
}

/** Devuelve la tecla MIDI de una pieza de percusión, o `undefined` si el alias no existe. */
export function teclaDePercusion(id: IdInstrumento, alias: string): number | undefined {
  const inst: Instrumento = INSTRUMENTOS[id]
  return inst.percusion?.[alias]?.tecla
}

/** Alias de percusión que corresponde a una tecla MIDI. */
export function aliasDePercusion(id: IdInstrumento, tecla: number): string | undefined {
  const inst: Instrumento = INSTRUMENTOS[id]
  if (!inst.percusion) return undefined
  for (const [alias, pieza] of Object.entries(inst.percusion)) {
    if (pieza.tecla === tecla) return alias
  }
  return undefined
}
