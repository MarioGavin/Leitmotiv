/**
 * Render offline de una pieza: produce el audio más rápido que en tiempo real
 * y sin altavoces. Es la base de la verificación de audio (scripts/audio) y
 * servirá para exportar las piezas del usuario.
 */
import { Gain, Limiter, OfflineContext } from 'tone'
import type { IdInstrumento } from '../musica/instrumentos.ts'
import { type Nota, type Pieza, duracionEnTicks } from '../musica/pieza.ts'
import type { PlanDeRitmo } from '../musica/ritmo.ts'
import { ticksASegundos } from '../musica/tiempo.ts'
import { NIVEL_MUSICA_DB, UMBRAL_LIMITADOR_DB, dbAGanancia } from './niveles.ts'
import { type Cuando, type Reproductor, crearReproductor } from './reproductor.ts'
import { programarRitmo } from './ritmo.ts'
import { type EntornoDeAudio, crearVoz } from './voces.ts'

/** Algo que se le pide al reproductor durante un render, para comprobar sin altavoces lo que en la app ocurre al tocar. */
export type AccionDeGuion =
  | { tipo: 'capas'; activas: string[]; cuando?: Cuando; fundido?: number }
  | { tipo: 'seccion'; seccion?: string; cuando?: Cuando }
  | { tipo: 'notas'; pista: string; notas: Nota[] }
  | { tipo: 'instrumento'; pista: string; instrumento: IdInstrumento }
  | { tipo: 'tempo'; tempo: number }

export interface PasoDeGuion {
  /** Segundos desde el principio del render. */
  en: number
  accion: AccionDeGuion
}

export interface OpcionesDeRender {
  frecuenciaDeMuestreo?: number
  /** Segundos de más al final, para la cola de las últimas notas. */
  cola?: number
  /** Veces que suena la pieza si es un bucle (para comprobar la costura). */
  vueltas?: number
  /** Nivel del bus de música en dB. Por defecto, el mismo que en el motor en tiempo real. */
  nivelDb?: number
  /** Si es `false`, el render no pasa por el limitador: sirve para medir los picos reales. */
  limitador?: boolean
  /** Segundos que se renderizan, sin mirar lo que dura la pieza: un bucle sigue dando vueltas hasta entonces. */
  duracion?: number
  /** Acciones que se hacen antes de empezar a sonar. */
  antes?: AccionDeGuion[]
  /** Acciones que se hacen mientras suena. */
  guion?: PasoDeGuion[]
}

function ejecutar(reproductor: Reproductor, accion: AccionDeGuion): void {
  switch (accion.tipo) {
    case 'capas':
      reproductor.fijarCapas(accion.activas, { ...(accion.cuando ? { cuando: accion.cuando } : {}), ...(accion.fundido === undefined ? {} : { fundido: accion.fundido }) })
      break
    case 'seccion':
      reproductor.irASeccion(accion.seccion, accion.cuando)
      break
    case 'notas':
      reproductor.fijarNotas(accion.pista, accion.notas)
      break
    case 'instrumento':
      void reproductor.fijarInstrumento(accion.pista, accion.instrumento)
      break
    case 'tempo':
      reproductor.fijarTempo(accion.tempo)
      break
  }
}

function contextoOffline(segundos: number, sr: number): EntornoDeAudio & { tone: OfflineContext } {
  const nativo = new OfflineAudioContext(2, Math.ceil(segundos * sr), sr)
  const tone = new OfflineContext(nativo as unknown as ConstructorParameters<typeof OfflineContext>[0])
  return { tone, nativo, offline: true }
}

async function renderizar(tone: OfflineContext): Promise<AudioBuffer> {
  const buffer = (await tone.render()).get()
  if (!buffer) throw new Error('El render no ha producido audio.')
  return buffer
}

export async function renderizarPieza(pieza: Pieza, opciones: OpcionesDeRender = {}): Promise<AudioBuffer> {
  const sr = opciones.frecuenciaDeMuestreo ?? 48000
  const vueltas = Math.max(1, opciones.vueltas ?? 1)
  const duracionMusical = ticksASegundos(duracionEnTicks(pieza), pieza.tempo) * vueltas
  const total = opciones.duracion ?? duracionMusical + (opciones.cola ?? 1.5)
  const entorno = contextoOffline(total, sr)
  const { tone } = entorno

  const bus = new Gain({ context: tone, gain: dbAGanancia(opciones.nivelDb ?? NIVEL_MUSICA_DB) })
  if (opciones.limitador === false) {
    bus.toDestination()
  } else {
    bus.chain(new Limiter({ context: tone, threshold: UMBRAL_LIMITADOR_DB }), tone.destination)
  }

  const reproductor = await crearReproductor(pieza, entorno, bus, opciones.duracion === undefined ? { bucle: vueltas > 1 } : {})
  if (opciones.duracion === undefined && vueltas > 1) {
    // Al acabar la última vuelta se detiene, para que la cola sea solo la de las notas.
    tone.transport.schedule((tiempo) => tone.transport.stop(tiempo), duracionMusical)
  }
  for (const accion of opciones.antes ?? []) ejecutar(reproductor, accion)
  // El reloj del contexto offline también hace correr los temporizadores de Tone.js.
  for (const paso of opciones.guion ?? []) tone.setTimeout(() => ejecutar(reproductor, paso.accion), paso.en)
  reproductor.reproducir(0)
  const buffer = await renderizar(tone)
  reproductor.liberar()
  return buffer
}

/** Renderiza lo que suena en un ejercicio de ritmo. El plan empieza en el segundo `inicio`. */
export async function renderizarRitmo(plan: PlanDeRitmo, opciones: { frecuenciaDeMuestreo?: number; inicio?: number } = {}): Promise<AudioBuffer> {
  const inicio = opciones.inicio ?? 0.5
  const entorno = contextoOffline(inicio + plan.duracion + 1, opciones.frecuenciaDeMuestreo ?? 48000)
  const bateria = await crearVoz('bateria', entorno)
  bateria.salida.toDestination()
  programarRitmo(plan, bateria, inicio)
  const buffer = await renderizar(entorno.tone)
  bateria.liberar()
  return buffer
}

/** Codifica un AudioBuffer como WAV PCM de 16 bits. */
export function aWav(buffer: AudioBuffer): ArrayBuffer {
  const canales = buffer.numberOfChannels
  const muestras = buffer.length
  const bytes = new ArrayBuffer(44 + muestras * canales * 2)
  const v = new DataView(bytes)
  const texto = (pos: number, t: string): void => {
    for (let i = 0; i < t.length; i++) v.setUint8(pos + i, t.charCodeAt(i))
  }
  texto(0, 'RIFF')
  v.setUint32(4, 36 + muestras * canales * 2, true)
  texto(8, 'WAVE')
  texto(12, 'fmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true)
  v.setUint16(22, canales, true)
  v.setUint32(24, buffer.sampleRate, true)
  v.setUint32(28, buffer.sampleRate * canales * 2, true)
  v.setUint16(32, canales * 2, true)
  v.setUint16(34, 16, true)
  texto(36, 'data')
  v.setUint32(40, muestras * canales * 2, true)
  const datos = Array.from({ length: canales }, (_, c) => buffer.getChannelData(c))
  let pos = 44
  for (let i = 0; i < muestras; i++) {
    for (let c = 0; c < canales; c++) {
      const x = Math.max(-1, Math.min(1, datos[c]?.[i] ?? 0))
      v.setInt16(pos, x < 0 ? x * 0x8000 : x * 0x7fff, true)
      pos += 2
    }
  }
  return bytes
}
