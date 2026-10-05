/**
 * Motor de audio en tiempo real. Este módulo (y todo lo que importa: Tone.js y
 * smplr) se carga aparte del paquete inicial; la interfaz lo usa a través de
 * audio.ts.
 *
 * Reglas que cumple:
 * - El audio solo arranca tras un gesto del usuario (`iniciar`).
 * - Si el sistema suspende el contexto (app en segundo plano, llamada…), se
 *   reanuda al volver o al siguiente toque.
 * - Un único AudioContext nativo compartido por Tone.js y smplr.
 */
import { Gain, Limiter, Meter, getContext, setContext } from 'tone'
import type { IdInstrumento } from '../musica/instrumentos.ts'
import type { Pieza } from '../musica/pieza.ts'
import type { PlanDeRitmo } from '../musica/ritmo.ts'
import { useAudio } from './estado.ts'
import { limpiarCachesAntiguas } from './muestras.ts'
import { NIVEL_INTERFAZ_DB, NIVEL_MUSICA_DB, UMBRAL_LIMITADOR_DB, dbAGanancia } from './niveles.ts'
import { instanteDelToque, leerRelojes } from './pulsacion.ts'
import { type OpcionesDeReproductor, type Reproductor, crearReproductor } from './reproductor.ts'
import { programarRitmo } from './ritmo.ts'
import { type EntornoDeAudio, type Voz, crearVoz } from './voces.ts'

interface Motor {
  entorno: EntornoDeAudio & { nativo: AudioContext }
  /** Bus de la música: pasa por el limitador. */
  musica: Gain
  /** Bus de los sonidos de interfaz y de respuesta inmediata: sin limitador, para no añadir retardo. */
  interfaz: Gain
  medidor: Meter
  voces: Map<IdInstrumento, Promise<Voz>>
}

let motor: Motor | undefined

function actualizarEstado(ctx: AudioContext): void {
  // Safari añade el estado «interrupted»; cualquier cosa que no sea «running» se trata como suspendido.
  useAudio.getState().fijarEstado(ctx.state === 'running' ? 'activo' : 'suspendido')
}

async function reanudar(ctx: AudioContext): Promise<void> {
  if (ctx.state === 'running' || ctx.state === 'closed') return
  try {
    await ctx.resume()
  } catch {
    // Hará falta un gesto: se reintenta en el siguiente toque.
  }
  actualizarEstado(ctx)
}

function vigilar(ctx: AudioContext): void {
  ctx.addEventListener('statechange', () => actualizarEstado(ctx))
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void reanudar(ctx)
    } else {
      // En segundo plano se para la reproducción y se suelta el audio del sistema para no gastar batería.
      getContext().transport.pause()
      void ctx.suspend().catch(() => undefined)
    }
  })
  window.addEventListener('pageshow', () => void reanudar(ctx))
  // Cualquier toque sirve para reanudar si el navegador exigía un gesto.
  const gesto = (): void => {
    if (ctx.state !== 'running') void reanudar(ctx)
  }
  document.addEventListener('pointerdown', gesto, { capture: true, passive: true })
  document.addEventListener('keydown', gesto, { capture: true })
}

/**
 * Arranca el audio. Hay que llamarlo desde un gesto del usuario (un toque o
 * una tecla). Llamarlo otra vez no hace nada, salvo reanudar si estaba suspendido.
 */
export async function iniciar(): Promise<void> {
  if (motor) {
    await reanudar(motor.entorno.nativo)
    return
  }
  const { fijarEstado } = useAudio.getState()
  fijarEstado('arrancando')
  try {
    const nativo = new AudioContext({ latencyHint: 'interactive' })
    // La reanudación se pide antes de cualquier espera, todavía dentro del gesto.
    const reanudado = nativo.resume()
    setContext(nativo)
    const tone = getContext()
    const salida = new Gain({ context: tone, gain: 1 }).toDestination()
    const limitador = new Limiter({ context: tone, threshold: UMBRAL_LIMITADOR_DB })
    const musica = new Gain({ context: tone, gain: dbAGanancia(NIVEL_MUSICA_DB) })
    const interfaz = new Gain({ context: tone, gain: dbAGanancia(NIVEL_INTERFAZ_DB) })
    const medidor = new Meter({ context: tone, smoothing: 0.6 })
    musica.chain(limitador, salida)
    interfaz.connect(salida)
    salida.connect(medidor)
    motor = { entorno: { tone, nativo, offline: false }, musica, interfaz, medidor, voces: new Map() }
    vigilar(nativo)
    await reanudado
    actualizarEstado(nativo)
    void limpiarCachesAntiguas()
  } catch (e) {
    fijarEstado('error', e instanceof Error ? e.message : String(e))
    throw e
  }
}

function exigir(): Motor {
  if (!motor) throw new Error('El audio no está iniciado: llama a iniciar() desde un gesto del usuario.')
  return motor
}

export function iniciado(): boolean {
  return motor !== undefined
}

/** Voz compartida de un instrumento, para tocar notas sueltas (ejercicios, teclado). Se carga una vez. */
export function voz(id: IdInstrumento): Promise<Voz> {
  const m = exigir()
  let promesa = m.voces.get(id)
  if (!promesa) {
    const { fijarCarga } = useAudio.getState()
    fijarCarga(id, { fase: 'cargando', cargadas: 0, total: 0 })
    promesa = crearVoz(id, m.entorno, (cargadas, total) => fijarCarga(id, { fase: 'cargando', cargadas, total }))
      .then((v) => {
        v.salida.connect(m.musica)
        fijarCarga(id, { fase: 'listo' })
        return v
      })
      .catch((e: unknown) => {
        m.voces.delete(id)
        fijarCarga(id, { fase: 'error', mensaje: e instanceof Error ? e.message : String(e) })
        throw e
      })
    m.voces.set(id, promesa)
  }
  return promesa
}

export interface NotaSuelta {
  nota: number
  /** Segundos desde ahora. */
  en?: number
  /** Segundos. */
  duracion?: number
  /** De 1 a 127. */
  velocidad?: number
}

/** Toca una o varias notas de inmediato con la voz compartida del instrumento. */
export async function tocar(id: IdInstrumento, notas: readonly NotaSuelta[]): Promise<void> {
  const m = exigir()
  const v = await voz(id)
  // Un pequeño margen evita que la primera nota se pierda si el hilo de audio va justo.
  const ahora = m.entorno.nativo.currentTime + 0.03
  for (const n of notas) v.tocar(n.nota, ahora + (n.en ?? 0), n.duracion ?? 0.6, n.velocidad ?? 92)
}

/** Prepara una pieza para reproducirla por el bus de música. */
export function prepararPieza(pieza: Pieza, opciones?: OpcionesDeReproductor): Promise<Reproductor> {
  const m = exigir()
  return crearReproductor(pieza, m.entorno, m.musica, opciones)
}

export interface SesionDeRitmo {
  /** Instante del reloj de audio en el que empieza el plan. */
  readonly inicio: number
  /**
   * Segundos desde el principio del plan en los que ha caído un toque.
   * @param marca Hora del toque (`event.timeStamp`).
   * @param latenciaMs Retardo calibrado por el usuario.
   */
  instante(marca: number, latenciaMs: number): number
  /** Segundos del plan que el usuario lleva oídos. */
  transcurrido(latenciaMs: number): number
  /** Corta lo que suena y lo que quedaba por sonar. */
  detener(): void
}

/** Margen entre que se pide un ejercicio de ritmo y su primer sonido: lo que tarda el planificador en tenerlo todo en cola. */
const MARGEN_DE_RITMO = 0.3

/** Empieza un ejercicio de ritmo: programa la claqueta y el patrón y devuelve cómo situar los toques en su tiempo. */
export async function empezarRitmo(plan: PlanDeRitmo): Promise<SesionDeRitmo> {
  const m = exigir()
  // Solo suena una cosa a la vez: si había una pieza en marcha, se para.
  m.entorno.tone.transport.pause()
  const bateria = await voz('bateria')
  const ctx = m.entorno.nativo
  const inicio = ctx.currentTime + MARGEN_DE_RITMO
  programarRitmo(plan, bateria, inicio)
  const instante = (marca: number, latenciaMs: number): number => instanteDelToque(leerRelojes(ctx, performance.now()), marca, latenciaMs) - inicio
  return {
    inicio,
    instante,
    transcurrido: (latenciaMs) => instante(performance.now(), latenciaMs),
    detener: () => bateria.callar(),
  }
}

export function entorno(): Motor['entorno'] {
  return exigir().entorno
}

export function busDeInterfaz(): Gain {
  return exigir().interfaz
}

export interface Diagnostico {
  estado: string
  frecuenciaDeMuestreo: number
  /** Retardo propio del procesado, en ms. */
  latenciaBaseMs: number
  /** Retardo de salida que declara el dispositivo, en ms (0 si el navegador no lo informa). */
  latenciaDeSalidaMs: number
  /** Antelación con la que Tone.js programa los eventos, en ms. */
  antelacionMs: number
  relojDeAudio: number
  nivelDb: number
  vocesCargadas: string[]
}

export function diagnostico(): Diagnostico {
  const m = exigir()
  const ctx = m.entorno.nativo
  const nivel = m.medidor.getValue()
  return {
    estado: ctx.state,
    frecuenciaDeMuestreo: ctx.sampleRate,
    latenciaBaseMs: Math.round((ctx.baseLatency ?? 0) * 1000),
    latenciaDeSalidaMs: Math.round((ctx.outputLatency ?? 0) * 1000),
    antelacionMs: Math.round(m.entorno.tone.lookAhead * 1000),
    relojDeAudio: ctx.currentTime,
    nivelDb: typeof nivel === 'number' ? nivel : Math.max(...nivel),
    vocesCargadas: [...m.voces.keys()],
  }
}
