/**
 * Reproductor de piezas: programa las notas de una Pieza sobre el transporte
 * de Tone.js, con una voz y un canal por pista.
 *
 * Solo puede haber un reproductor activo por contexto, porque el transporte es
 * único. Funciona igual en tiempo real y en render offline.
 */
import { Channel, type Gain, Part } from 'tone'
import { INSTRUMENTOS, type Instrumento } from '../musica/instrumentos.ts'
import { type Pieza, type Rol, duracionEnTicks } from '../musica/pieza.ts'
import { PPQ, ticksASegundos } from '../musica/tiempo.ts'
import { type AvanceDeCarga, type EntornoDeAudio, type Voz, crearVoz } from './voces.ts'

/** Nivel de partida de cada papel en la mezcla, en dB. El de cada pista se suma a este. */
export const NIVEL_POR_ROL: Readonly<Record<Rol, number>> = {
  melodia: 0,
  contramelodia: -3,
  armonia: -5,
  colchon: -7,
  bajo: -1,
  percusion: -4,
  efecto: -6,
}

export type EstadoDeReproduccion = 'parado' | 'sonando' | 'pausado'

export interface Reproductor {
  readonly pieza: Pieza
  readonly estado: EstadoDeReproduccion
  /** `true` cuando otro reproductor ha ocupado el transporte: este ya no puede sonar y hay que preparar uno nuevo. */
  readonly liberado: boolean
  /** Empieza o continúa. `enTiempo` (segundos del reloj de audio) solo se usa en renders offline. */
  reproducir(enTiempo?: number): void
  pausar(): void
  detener(): void
  /** Cambia el tempo sobre la marcha (negras por minuto). */
  fijarTempo(tempo: number): void
  /** Transporta todas las pistas afinadas un número de semitonos. */
  fijarTransposicion(semitonos: number): void
  fijarBucle(bucle: boolean): void
  /** Silencia o recupera una pista. */
  silenciar(pista: string, silenciada: boolean): void
  /** Sube o baja el nivel de una pista con un fundido (para capas adaptativas). */
  fundir(pista: string, db: number, segundos: number): void
  /** Posición actual, en ticks desde el principio de la pieza. */
  posicion(): number
  /** Avisa cuando cambia el estado (también al llegar al final). Devuelve la función para dejar de escuchar. */
  alCambiar(oyente: (estado: EstadoDeReproduccion) => void): () => void
  liberar(): void
}

interface PistaSonora {
  id: string
  voz: Voz
  canal: Channel
  parte: Part<{ time: string; i: number; n: number; d: number; v: number }>
  afinada: boolean
  nivel: number
}

const activos = new WeakMap<object, Reproductor>()

export interface OpcionesDeReproductor {
  /** Se llama mientras se descargan las muestras: instrumento, cargadas, total. */
  alCargar?: (instrumento: string, cargadas: number, total: number) => void
  /** Ignora `pieza.bucle` y lo fuerza. */
  bucle?: boolean
}

/**
 * Prepara una pieza para sonar: descarga los instrumentos que falten y programa
 * las notas. Libera el reproductor anterior del mismo contexto, si lo había.
 */
export async function crearReproductor(pieza: Pieza, entorno: EntornoDeAudio, destino: Gain, opciones: OpcionesDeReproductor = {}): Promise<Reproductor> {
  activos.get(entorno.tone)?.liberar()

  const transporte = entorno.tone.transport
  const total = duracionEnTicks(pieza)
  let tempo = pieza.tempo
  let transposicion = 0
  let estado: EstadoDeReproduccion = 'parado'
  let liberado = false
  const oyentes = new Set<(estado: EstadoDeReproduccion) => void>()

  const voces = await Promise.all(
    pieza.pistas.map((pista) => {
      const avance: AvanceDeCarga | undefined = opciones.alCargar ? (c, t) => opciones.alCargar?.(pista.instrumento, c, t) : undefined
      return crearVoz(pista.instrumento, entorno, avance)
    }),
  )

  transporte.stop()
  transporte.cancel(0)
  transporte.PPQ = PPQ
  transporte.bpm.value = tempo
  transporte.timeSignature = [pieza.compas[0], pieza.compas[1]]
  transporte.swing = pieza.swing ?? 0
  transporte.swingSubdivision = '8n'
  transporte.loop = opciones.bucle ?? pieza.bucle ?? false
  transporte.setLoopPoints(0, `${total}i`)

  const pistas: PistaSonora[] = pieza.pistas.map((pista, i) => {
    const voz = voces[i] as Voz
    const instrumento: Instrumento = INSTRUMENTOS[pista.instrumento]
    const afinada = !instrumento.percusion
    const nivel = NIVEL_POR_ROL[pista.rol] + (pista.volumen ?? 0)
    // channelCount 2: sin esto, Tone.js mezcla la entrada a mono antes de panear y se pierden 3 dB.
    const canal = new Channel({ context: entorno.tone, volume: nivel, pan: pista.paneo ?? 0, mute: pista.silenciada ?? false, channelCount: 2 })
    voz.salida.connect(canal)
    canal.connect(destino)
    // El reloj de Tone.js puede entregar dos veces un tick que cae justo en el borde entre dos
    // ventanas de planificación (ocurre a tempos «redondos», como 60 o 120). Sin esta guarda la
    // nota sonaría doble, 6 dB más fuerte. Se recuerda cuándo sonó cada nota por última vez.
    const ultimaVez = new Float64Array(pista.notas.length).fill(-1)
    const parte = new Part({
      context: entorno.tone,
      callback: (tiempo, nota) => {
        if (Math.abs(tiempo - (ultimaVez[nota.i] ?? -1)) < 0.002) return
        ultimaVez[nota.i] = tiempo
        voz.tocar(afinada ? nota.n + transposicion : nota.n, tiempo, ticksASegundos(nota.d, tempo), nota.v)
      },
      events: pista.notas.map((n, indice) => ({ time: `${n.t}i`, i: indice, n: n.n, d: n.d, v: n.v })),
    })
    parte.start(0)
    return { id: pista.id, voz, canal, parte, afinada, nivel }
  })

  const cambiar = (nuevo: EstadoDeReproduccion): void => {
    if (estado === nuevo) return
    estado = nuevo
    for (const oyente of oyentes) oyente(nuevo)
  }

  // Final de una pieza que no se repite: se para sola, dejando sonar la cola de las últimas notas.
  transporte.schedule((tiempo) => {
    if (transporte.loop) return
    transporte.stop(tiempo + 0.05)
    if (entorno.offline) return
    entorno.tone.draw.schedule(() => cambiar('parado'), tiempo)
  }, `${total}i`)

  const callarTodo = (): void => {
    for (const p of pistas) p.voz.callar()
  }

  const reproductor: Reproductor = {
    pieza,
    get estado() {
      return estado
    },
    get liberado() {
      return liberado
    },
    reproducir(enTiempo) {
      if (liberado) return
      transporte.start(enTiempo)
      cambiar('sonando')
    },
    pausar() {
      if (liberado || estado !== 'sonando') return
      transporte.pause()
      callarTodo()
      cambiar('pausado')
    },
    detener() {
      if (liberado) return
      transporte.stop()
      callarTodo()
      cambiar('parado')
    },
    fijarTempo(nuevo) {
      tempo = Math.min(300, Math.max(30, nuevo))
      transporte.bpm.value = tempo
    },
    fijarTransposicion(semitonos) {
      transposicion = Math.round(semitonos)
    },
    fijarBucle(bucle) {
      transporte.loop = bucle
    },
    silenciar(id, silenciada) {
      const p = pistas.find((x) => x.id === id)
      if (p) p.canal.mute = silenciada
    },
    fundir(id, db, segundos) {
      const p = pistas.find((x) => x.id === id)
      if (p) p.canal.volume.rampTo(p.nivel + db, segundos)
    },
    posicion() {
      return transporte.ticks
    },
    alCambiar(oyente) {
      oyentes.add(oyente)
      return () => oyentes.delete(oyente)
    },
    liberar() {
      if (liberado) return
      liberado = true
      transporte.stop()
      transporte.cancel(0)
      for (const p of pistas) {
        p.parte.dispose()
        p.voz.liberar()
        p.canal.dispose()
      }
      // Quien lo estuviera mostrando (un botón de reproducir, un cabezal) tiene que enterarse de que ha parado.
      cambiar('parado')
      oyentes.clear()
      if (activos.get(entorno.tone) === reproductor) activos.delete(entorno.tone)
    },
  }
  activos.set(entorno.tone, reproductor)
  return reproductor
}
