/**
 * Voces: cada instrumento del catálogo convertido en algo que suena.
 *
 * Los instrumentos muestreados usan smplr con nuestras propias muestras
 * (public/samples); los de chip se sintetizan con osciladores nativos de Web
 * Audio (nativo.ts). Todas las voces
 * comparten la misma interfaz y funcionan igual en tiempo real y en un render
 * offline (que es como se verifica el audio sin altavoces).
 */
import { SampleLoader, Sampler, Scheduler, type SmplrPreset } from 'smplr'
import { type BaseContext, Gain } from 'tone'
import { INSTRUMENTOS, type IdInstrumento, type Instrumento } from '../musica/instrumentos.ts'
import { almacenDeMuestras, leerArchivoDeInstrumento, urlDeMuestras } from './muestras.ts'
import { type Envolvente, type NotaNativa, frecuenciaDe, ondaDePulso, programarNota } from './nativo.ts'
import { dbAGanancia } from './niveles.ts'

export interface EntornoDeAudio {
  /** Contexto de Tone.js (tiempo real u offline). */
  readonly tone: BaseContext
  /** AudioContext nativo sobre el que corren Tone.js y smplr. */
  readonly nativo: BaseAudioContext
  readonly offline: boolean
}

export interface Voz {
  readonly id: IdInstrumento
  /** Salida de la voz: se conecta al canal de su pista. */
  readonly salida: Gain
  /**
   * Programa una nota.
   * @param nota Número MIDI (o tecla del kit en percusión).
   * @param tiempo Instante de inicio, en segundos del reloj de audio.
   * @param duracion Segundos que se mantiene pulsada.
   * @param velocidad De 1 a 127.
   */
  tocar(nota: number, tiempo: number, duracion: number, velocidad: number): void
  /** Corta todo lo que esté sonando. */
  callar(): void
  liberar(): void
}

export type AvanceDeCarga = (cargadas: number, total: number) => void

const cargadores = new WeakMap<BaseAudioContext, ReturnType<typeof SampleLoader>>()

/** Un cargador por contexto: dos pistas con el mismo instrumento comparten las muestras ya decodificadas. */
function cargadorDe(nativo: BaseAudioContext): ReturnType<typeof SampleLoader> {
  let cargador = cargadores.get(nativo)
  if (!cargador) {
    cargador = SampleLoader(nativo, { storage: almacenDeMuestras })
    cargadores.set(nativo, cargador)
  }
  return cargador
}

async function crearVozMuestreada(id: IdInstrumento, entorno: EntornoDeAudio, alAvanzar?: AvanceDeCarga): Promise<Voz> {
  const instrumento: Instrumento = INSTRUMENTOS[id]
  const archivo = await leerArchivoDeInstrumento(id)
  const preset = {
    ...archivo.preset,
    samples: { baseUrl: `${urlDeMuestras()}/${id}`, formats: archivo.preset.samples.formats },
  } as unknown as SmplrPreset
  const salida = new Gain({ context: entorno.tone, gain: 1 })
  const sampler = Sampler(entorno.nativo, {
    preset,
    // smplr trabaja con nodos nativos; la entrada de un Gain de Tone.js lo es.
    destination: salida.input as unknown as AudioNode,
    loader: cargadorDe(entorno.nativo),
    // 127 = sin atenuación: los niveles se ajustan en el canal de cada pista.
    volume: 127,
    ...(alAvanzar ? { onLoadProgress: ({ loaded, total }: { loaded: number; total: number }) => alAvanzar(loaded, total) } : {}),
    // En un render offline el reloj no avanza hasta que empieza el render:
    // hay que programar todas las notas de inmediato, sin cola de espera.
    ...(entorno.offline ? { scheduler: Scheduler(entorno.nativo, { lookaheadMs: 1e12 }) } : {}),
  })
  await sampler.ready
  const esPercusion = Boolean(instrumento.percusion)
  return {
    id,
    salida,
    tocar(nota, tiempo, duracion, velocidad) {
      // La percusión suena entera: un plato no se corta porque la nota escrita sea corta.
      sampler.start(esPercusion ? { note: nota, velocity: velocidad, time: tiempo } : { note: nota, velocity: velocidad, time: tiempo, duration: duracion })
    },
    callar() {
      sampler.stop()
    },
    liberar() {
      sampler.dispose()
      salida.dispose()
    },
  }
}

interface AjusteDeChip {
  /** Ciclo de trabajo de la onda de pulso (0,25 = 25 %), o `triangulo`. */
  onda: number | 'triangulo'
  /** Nivel de la voz en dB. */
  nivel: number
  /** El canal triangular de una consola de 8 bits no tiene control de volumen. */
  velocidadFija: boolean
}

const CHIPS: Partial<Record<IdInstrumento, AjusteDeChip>> = {
  'chip-pulso': { onda: 0.25, nivel: -15, velocidadFija: false },
  'chip-triangulo': { onda: 'triangulo', nivel: -9, velocidadFija: true },
}

/** Envolvente casi cuadrada, como la de un chip: entra y sale sin rampa audible. */
const ENVOLVENTE_DE_CHIP: Envolvente = { ataque: 0.002, caida: 0.02, sostenido: 0.9, relajacion: 0.012 }

function crearVozDeChip(id: IdInstrumento, ajuste: AjusteDeChip, entorno: EntornoDeAudio): Voz {
  const salida = new Gain({ context: entorno.tone, gain: 1 })
  // Los osciladores son nodos nativos; la entrada de un Gain de Tone.js también lo es.
  const destino = salida.input as unknown as AudioNode
  const ctx = entorno.nativo
  const sonando = new Set<NotaNativa>()
  return {
    id,
    salida,
    tocar(nota, tiempo, duracion, velocidad) {
      const programada = programarNota({
        ctx,
        destino,
        fuente: (entrada) => {
          const oscilador = ctx.createOscillator()
          if (ajuste.onda === 'triangulo') oscilador.type = 'triangle'
          else oscilador.setPeriodicWave(ondaDePulso(ctx, ajuste.onda))
          oscilador.frequency.value = frecuenciaDe(nota)
          oscilador.connect(entrada)
          return [oscilador]
        },
        tiempo,
        // Se suelta un poco antes para que dos notas seguidas iguales se oigan separadas.
        duracion: Math.max(0.02, duracion - 0.012),
        nivel: dbAGanancia(ajuste.nivel) * (ajuste.velocidadFija ? 0.8 : velocidad / 127),
        envolvente: ENVOLVENTE_DE_CHIP,
        alAcabar: () => sonando.delete(programada),
      })
      sonando.add(programada)
    },
    callar() {
      for (const programada of sonando) programada.cortar()
      sonando.clear()
    },
    liberar() {
      for (const programada of sonando) programada.cortar()
      sonando.clear()
      salida.dispose()
    },
  }
}

/** Crea la voz de un instrumento. Si es muestreado, descarga (o lee de la caché) sus muestras. */
export async function crearVoz(id: IdInstrumento, entorno: EntornoDeAudio, alAvanzar?: AvanceDeCarga): Promise<Voz> {
  const chip = CHIPS[id]
  if (chip) return crearVozDeChip(id, chip, entorno)
  return crearVozMuestreada(id, entorno, alAvanzar)
}
