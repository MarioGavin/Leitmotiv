/**
 * Reproductor de piezas: programa las notas de una Pieza sobre el transporte
 * de Tone.js, con una voz y un canal por pista.
 *
 * Solo puede haber un reproductor activo por contexto, porque el transporte es
 * único. Funciona igual en tiempo real y en render offline.
 */
import { Channel, type Gain, Part } from 'tone'
import { INSTRUMENTOS, type IdInstrumento, type Instrumento } from '../musica/instrumentos.ts'
import { type Nota, type Pieza, type Rol, duracionEnTicks } from '../musica/pieza.ts'
import { PPQ, segundosATicks, ticksASegundos, ticksPorCompas, ticksPorPulso } from '../musica/tiempo.ts'
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

/** Nivel al que se lleva una capa apagada, en dB: por debajo de lo audible. */
const NIVEL_APAGADO_DB = -80

/**
 * El swing de una pieza va de 0 (recto) a 1 (tresillo: la corchea a contratiempo
 * cae en el segundo tercio del pulso). El transporte de Tone.js llega al
 * tresillo con la mitad de su escala, y con 1 se pasa de largo.
 */
const SWING_DE_TRESILLO = 0.5

export type EstadoDeReproduccion = 'parado' | 'sonando' | 'pausado'

/** Cuándo se aplica un cambio pedido mientras suena: ya, en el próximo pulso, en la próxima barra de compás o al acabar la sección. */
export type Cuando = 'inmediato' | 'tiempo' | 'compas' | 'seccion'

export interface OpcionesDeCambio {
  cuando?: Cuando
  /** Segundos que dura el fundido. */
  fundido?: number
}

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
  /** Sube o baja el nivel de una pista con un fundido. */
  fundir(pista: string, db: number, segundos: number): void
  /** Sustituye las notas de una pista sin parar la reproducción: es lo que permite editar mientras suena. */
  fijarNotas(pista: string, notas: readonly Nota[]): void
  /** Cambia el instrumento de una pista. La promesa se cumple cuando el nuevo ya está sonando. */
  fijarInstrumento(pista: string, instrumento: IdInstrumento): Promise<void>
  /**
   * Música adaptativa por capas: deja sonando las pistas de las capas indicadas
   * y apaga las de las demás. Las pistas sin capa suenan siempre.
   */
  fijarCapas(activas: readonly string[], opciones?: OpcionesDeCambio): void
  /**
   * Música adaptativa por secciones: salta a una sección y la repite. Sin
   * sección, vuelve a la pieza entera. El salto ocurre justo en la frontera pedida.
   */
  irASeccion(seccion: string | undefined, cuando?: Cuando): void
  /** Posición actual, en ticks desde el principio de la pieza. */
  posicion(): number
  /** Avisa cuando cambia el estado (también al llegar al final). Devuelve la función para dejar de escuchar. */
  alCambiar(oyente: (estado: EstadoDeReproduccion) => void): () => void
  liberar(): void
}

type Parte = Part<{ time: string; i: number; n: number; d: number; v: number }>

interface PistaSonora {
  id: string
  voz: Voz
  canal: Channel
  parte: Parte
  afinada: boolean
  /** Nivel de la pista cuando suena, en dB. */
  nivel: number
  capa: string | undefined
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
  const enBuclePorDefecto = opciones.bucle ?? pieza.bucle ?? false
  transporte.swing = Math.min(1, Math.max(0, pieza.swing ?? 0)) * SWING_DE_TRESILLO
  transporte.swingSubdivision = '8n'
  transporte.loop = enBuclePorDefecto
  transporte.setLoopPoints(0, `${total}i`)

  /** Programa las notas de una pista. La voz y la afinación se leen al sonar: pueden cambiar sobre la marcha. */
  const crearParte = (pista: Pick<PistaSonora, 'voz' | 'afinada'>, notas: readonly Nota[]): Parte => {
    // El reloj de Tone.js puede entregar dos veces un tick que cae justo en el borde entre dos
    // ventanas de planificación (ocurre a tempos «redondos», como 60 o 120). Sin esta guarda la
    // nota sonaría doble, 6 dB más fuerte. Se recuerda cuándo sonó cada nota por última vez.
    const ultimaVez = new Float64Array(notas.length).fill(-1)
    const parte: Parte = new Part({
      context: entorno.tone,
      callback: (tiempo, nota) => {
        if (Math.abs(tiempo - (ultimaVez[nota.i] ?? -1)) < 0.002) return
        ultimaVez[nota.i] = tiempo
        pista.voz.tocar(pista.afinada ? nota.n + transposicion : nota.n, tiempo, ticksASegundos(nota.d, tempo), nota.v)
      },
      events: notas.filter((n) => n.d > 0 && n.t >= 0 && n.t < total).map((n, indice) => ({ time: `${n.t}i`, i: indice, n: n.n, d: n.d, v: n.v })),
    })
    parte.start(0)
    return parte
  }

  const pistas: PistaSonora[] = pieza.pistas.map((pista, i) => {
    const voz = voces[i] as Voz
    const instrumento: Instrumento = INSTRUMENTOS[pista.instrumento]
    const nivel = NIVEL_POR_ROL[pista.rol] + (pista.volumen ?? 0)
    // channelCount 2: sin esto, Tone.js mezcla la entrada a mono antes de panear y se pierden 3 dB.
    const canal = new Channel({ context: entorno.tone, volume: nivel, pan: pista.paneo ?? 0, mute: pista.silenciada ?? false, channelCount: 2 })
    voz.salida.connect(canal)
    canal.connect(destino)
    const sonora: Omit<PistaSonora, 'parte'> = { id: pista.id, voz, canal, afinada: !instrumento.percusion, nivel, capa: pista.capa }
    return Object.assign(sonora, { parte: crearParte(sonora, pista.notas) })
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

  /** Voces sustituidas al cambiar de instrumento, pendientes de liberar. */
  const retiradas: Voz[] = []

  const callarTodo = (): void => {
    for (const p of pistas) p.voz.callar()
  }

  // ── Cambios cuantizados: capas y secciones ──

  const porCompas = ticksPorCompas(pieza.compas)
  const porPulso = ticksPorPulso(pieza.compas)

  interface Tramo {
    desde: number
    hasta: number
    enBucle: boolean
  }
  /** Lo que se está repitiendo: la pieza entera o una sección. */
  let tramo: Tramo = { desde: 0, hasta: total, enBucle: enBuclePorDefecto }
  /** Tramo al que se saltará en cuanto el transporte dé la vuelta. */
  let tramoPendiente: Tramo | undefined
  /** Tick en el que el transporte dará la vuelta, si está en bucle: el final del tramo o la frontera de un salto pedido. */
  let finDeVuelta = total
  /** Cambio de capas que espera su frontera. `enLaVuelta`: se aplicará justo al dar la vuelta. */
  let capasPendientes: { id: number; tick: number; enLaVuelta: boolean; aplicar: (tiempo?: number) => void } | undefined

  /** Próximo tick en el que puede aplicarse un cambio. Deja margen para lo que el reloj ya ha programado por adelantado. */
  const proximaFrontera = (cuando: Cuando): number => {
    const margen = Math.ceil(segundosATicks(entorno.tone.lookAhead + 0.05, tempo))
    const ahora = transporte.ticks
    if (cuando === 'inmediato') return ahora + margen
    if (cuando === 'seccion') {
      if (transporte.loop) return finDeVuelta
      // Sin bucle, la frontera es el final de la sección en la que se está (o de la pieza).
      const actual = (pieza.secciones ?? []).find((x) => ahora >= (x.desde - 1) * porCompas && ahora < x.hasta * porCompas)
      return actual ? actual.hasta * porCompas : total
    }
    const paso = cuando === 'tiempo' ? porPulso : porCompas
    let frontera = (Math.floor(ahora / paso) + 1) * paso
    if (frontera - ahora < margen) frontera += paso
    return frontera
  }

  const programarCapas = (tick: number, enLaVuelta: boolean, aplicar: (tiempo?: number) => void): void => {
    if (capasPendientes) transporte.clear(capasPendientes.id)
    const id = transporte.scheduleOnce((tiempo) => {
      capasPendientes = undefined
      aplicar(tiempo)
    }, `${tick}i`)
    capasPendientes = { id, tick, enLaVuelta, aplicar }
  }

  /** Deja el transporte, parado, al principio del tramo en vigor (o del pendiente, que pasa a estarlo). */
  const asentarTramo = (): void => {
    if (tramoPendiente) tramo = tramoPendiente
    tramoPendiente = undefined
    finDeVuelta = tramo.hasta
    transporte.setLoopPoints(`${tramo.desde}i`, `${tramo.hasta}i`)
    transporte.loop = tramo.enBucle
    transporte.ticks = tramo.desde
  }

  // Al dar la vuelta, el tramo que se repite pasa a ser aquel al que se acaba de saltar.
  const alDarLaVuelta = (): void => {
    if (!tramoPendiente) return
    tramo = tramoPendiente
    tramoPendiente = undefined
    finDeVuelta = tramo.hasta
    transporte.loopEnd = `${tramo.hasta}i`
    transporte.loop = tramo.enBucle
  }
  transporte.on('loopStart', alDarLaVuelta)

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
      // Un cambio de capas que esperaba su frontera se aplica ya: al volver a sonar tiene que estar hecho.
      if (capasPendientes) {
        transporte.clear(capasPendientes.id)
        capasPendientes.aplicar()
        capasPendientes = undefined
      }
      if (tramoPendiente || tramo.desde > 0) asentarTramo()
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
    fijarNotas(id, notas) {
      const p = pistas.find((x) => x.id === id)
      if (!p || liberado) return
      p.parte.dispose()
      p.parte = crearParte(p, notas)
    },
    async fijarInstrumento(id, instrumento) {
      const p = pistas.find((x) => x.id === id)
      if (!p || liberado) return
      const nueva = await crearVoz(instrumento, entorno, opciones.alCargar ? (c, t) => opciones.alCargar?.(instrumento, c, t) : undefined)
      if (liberado) {
        nueva.liberar()
        return
      }
      nueva.salida.connect(p.canal)
      const anterior = p.voz
      p.voz = nueva
      p.afinada = !(INSTRUMENTOS[instrumento] as Instrumento).percusion
      // La voz anterior se calla con su fundido y se libera al final: desconectarla ahora cortaría en seco lo que le queda por sonar.
      anterior.callar()
      retiradas.push(anterior)
    },
    fijarCapas(activas, { cuando = 'compas', fundido = 0.4 } = {}) {
      if (liberado) return
      const aplicar = (tiempo?: number): void => {
        for (const p of pistas) {
          if (p.capa === undefined) continue
          p.canal.volume.rampTo(activas.includes(p.capa) ? p.nivel : NIVEL_APAGADO_DB, Math.max(0.01, fundido), tiempo)
        }
      }
      if (capasPendientes) transporte.clear(capasPendientes.id)
      capasPendientes = undefined
      if (estado !== 'sonando') {
        aplicar()
        return
      }
      const frontera = proximaFrontera(cuando)
      if (!transporte.loop && frontera >= total) {
        aplicar()
        return
      }
      // Al tick en el que el transporte da la vuelta no se llega nunca: el cambio se hace en el primero de la vuelta.
      const enLaVuelta = transporte.loop && frontera >= finDeVuelta
      programarCapas(enLaVuelta ? (tramoPendiente ?? tramo).desde : frontera, enLaVuelta, aplicar)
    },
    irASeccion(id, cuando = 'compas') {
      if (liberado) return
      const seccion = id === undefined ? undefined : (pieza.secciones ?? []).find((x) => x.id === id)
      if (id !== undefined && !seccion) return
      const nuevoTramo: Tramo = seccion ? { desde: (seccion.desde - 1) * porCompas, hasta: seccion.hasta * porCompas, enBucle: true } : { desde: 0, hasta: total, enBucle: enBuclePorDefecto }
      tramoPendiente = nuevoTramo
      if (estado !== 'sonando') {
        asentarTramo()
        return
      }
      // El salto lo da el propio bucle del transporte, que vuelve atrás en el tick exacto:
      // se le dice dónde acabar (la frontera) y adónde volver (el principio de la sección).
      const frontera = Math.min(proximaFrontera(cuando), transporte.loop ? finDeVuelta : total)
      finDeVuelta = frontera
      transporte.loopStart = `${nuevoTramo.desde}i`
      transporte.loopEnd = `${frontera}i`
      transporte.loop = true
      // Un cambio de capas que iba a ocurrir en esa frontera o después se hace al llegar a la sección.
      if (capasPendientes && (capasPendientes.enLaVuelta || capasPendientes.tick >= frontera)) programarCapas(nuevoTramo.desde, true, capasPendientes.aplicar)
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
      transporte.off('loopStart', alDarLaVuelta)
      transporte.stop()
      transporte.cancel(0)
      for (const voz of retiradas) voz.liberar()
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
