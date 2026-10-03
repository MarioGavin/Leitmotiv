/**
 * Sonidos de interfaz, sintetizados al momento. No hay archivos de audio.
 *
 * Todos salen del mismo motivo de cuatro notas, el de la propia app: las
 * letras L, E, T y M de «Leitmotiv» leídas como notas (La, Mi, Si —Ti— y Mi).
 * Son cuartas y quintas, así que no chocan con ninguna tonalidad.
 */
import { busDeInterfaz, entorno, iniciado } from './motor.ts'
import { type Envolvente, frecuenciaDe, ondaDePulso, programarNota } from './nativo.ts'
import { dbAGanancia } from './niveles.ts'

export type SonidoDeInterfaz = 'inicio' | 'cursor' | 'aceptar' | 'atras' | 'acierto' | 'fallo' | 'completar'

/** Timbre de los sonidos: lo fija la dirección visual. */
export type TimbreDeInterfaz = 'chip' | 'campana'

/** El motivo: La4, Mi5, Si4, Mi5. */
export const MOTIVO = [69, 76, 71, 76] as const

type Evento = readonly [nota: number, en: number, duracion: number, fuerza: number]

const PARTITURAS: Readonly<Record<SonidoDeInterfaz, readonly Evento[]>> = {
  // El motivo tal cual, al entrar en la app.
  inicio: [
    [69, 0, 0.13, 0.8],
    [76, 0.14, 0.13, 0.85],
    [71, 0.28, 0.13, 0.85],
    [76, 0.42, 0.42, 0.9],
  ],
  cursor: [[88, 0, 0.03, 0.35]],
  aceptar: [
    [71, 0, 0.06, 0.7],
    [76, 0.06, 0.1, 0.8],
  ],
  atras: [
    [76, 0, 0.06, 0.6],
    [71, 0.06, 0.1, 0.6],
  ],
  acierto: [
    [69, 0, 0.07, 0.75],
    [76, 0.07, 0.07, 0.8],
    [71, 0.14, 0.07, 0.8],
    [76, 0.21, 0.07, 0.85],
    [81, 0.28, 0.2, 0.9],
  ],
  fallo: [
    [59, 0, 0.11, 0.7],
    [58, 0.12, 0.2, 0.7],
  ],
  completar: [
    [69, 0, 0.16, 0.8],
    [76, 0.16, 0.16, 0.85],
    [71, 0.32, 0.16, 0.85],
    [76, 0.48, 0.32, 0.9],
    [81, 0.8, 0.16, 0.85],
    [88, 0.96, 0.5, 0.95],
  ],
}

interface Timbre {
  /** Nivel en el máximo de la envolvente, en dB. */
  nivelDb: number
  envolvente: Envolvente
  /** Crea los osciladores de una nota de la frecuencia dada, conectados a `entrada`. */
  fuente: (ctx: BaseAudioContext, frecuencia: number, entrada: AudioNode) => OscillatorNode[]
}

const TIMBRES: Readonly<Record<TimbreDeInterfaz, Timbre>> = {
  // Onda de pulso al 25 %: el pitido de una consola de 8 bits.
  chip: {
    nivelDb: -10,
    envolvente: { ataque: 0.001, caida: 0.03, sostenido: 0.7, relajacion: 0.02 },
    fuente: (ctx, frecuencia, entrada) => {
      const oscilador = ctx.createOscillator()
      oscilador.setPeriodicWave(ondaDePulso(ctx, 0.25))
      oscilador.frequency.value = frecuencia
      oscilador.connect(entrada)
      return [oscilador]
    },
  },
  // Síntesis FM de dos operadores: una campanita, con el brillo de un piano eléctrico.
  campana: {
    nivelDb: -4,
    envolvente: { ataque: 0.002, caida: 0.18, sostenido: 0.12, relajacion: 0.18 },
    fuente: (ctx, frecuencia, entrada) => {
      const portadora = ctx.createOscillator()
      portadora.frequency.value = frecuencia
      const moduladora = ctx.createOscillator()
      moduladora.frequency.value = frecuencia * 3
      const indice = ctx.createGain()
      indice.gain.value = frecuencia * 2.2
      moduladora.connect(indice)
      indice.connect(portadora.frequency)
      portadora.connect(entrada)
      return [portadora, moduladora]
    },
  },
}

let timbreActual: TimbreDeInterfaz = 'chip'

export function fijarTimbre(timbre: TimbreDeInterfaz): void {
  timbreActual = timbre
}

/** Hace sonar un sonido de interfaz. Si el audio aún no está iniciado o está suspendido, no hace nada. */
export function sonar(sonido: SonidoDeInterfaz): void {
  if (!iniciado()) return
  const { nativo } = entorno()
  if (nativo.state !== 'running') return
  const timbre = TIMBRES[timbreActual]
  // Los nodos nativos se conectan a la entrada (también nativa) del bus de Tone.js.
  const destino = busDeInterfaz().input as unknown as AudioNode
  const ahora = nativo.currentTime + 0.005
  for (const [nota, en, duracion, fuerza] of PARTITURAS[sonido]) {
    const frecuencia = frecuenciaDe(nota)
    programarNota({
      ctx: nativo,
      destino,
      fuente: (entrada) => timbre.fuente(nativo, frecuencia, entrada),
      tiempo: ahora + en,
      duracion,
      nivel: dbAGanancia(timbre.nivelDb) * fuerza,
      envolvente: timbre.envolvente,
    })
  }
}
