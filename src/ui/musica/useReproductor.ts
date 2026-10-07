/**
 * Reproducción de una pieza desde un componente: prepara el reproductor del
 * motor la primera vez que se pide sonar, sigue su estado y lo libera al salir.
 *
 * Si la pieza cambia pero sigue siendo «la misma» (mismas pistas, mismo compás,
 * misma duración), no se vuelve a preparar: las notas, los instrumentos, el
 * tempo y los silencios que hayan cambiado se le pasan al reproductor sobre la
 * marcha. Así se puede editar en el piano roll mientras suena.
 *
 * El transporte de audio es único, así que solo suena una pieza a la vez: si
 * otro componente empieza a reproducir la suya, esta se para sola.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { prepararPieza } from '../../audio/audio.ts'
import type { Cuando, OpcionesDeCambio, Reproductor } from '../../audio/reproductor.ts'
import { INSTRUMENTOS, type IdInstrumento, type Instrumento } from '../../musica/instrumentos.ts'
import type { Pieza, Pista } from '../../musica/pieza.ts'

export type EstadoDeTransporte = 'parado' | 'cargando' | 'sonando' | 'pausado' | 'error'

export interface ControlDeReproduccion {
  estado: EstadoDeTransporte
  /** Mensaje del último fallo, si `estado` es `error`. */
  error: string | undefined
  reproducir: () => void
  pausar: () => void
  detener: () => void
  /** Reproduce si está parada; la para si está sonando. */
  alternar: () => void
  fijarTempo: (tempo: number) => void
  fijarTransposicion: (semitonos: number) => void
  silenciar: (pista: string, silenciada: boolean) => void
  /** Cambia el instrumento de una pista, también mientras suena. */
  fijarInstrumento: (pista: string, instrumento: IdInstrumento) => void
  /** Deja sonando solo las capas indicadas (música adaptativa por capas). */
  fijarCapas: (activas: readonly string[], opciones?: OpcionesDeCambio) => void
  /** Salta a una sección y la repite; sin sección, vuelve a la pieza entera. */
  irASeccion: (seccion: string | undefined, cuando?: Cuando) => void
  /** Posición actual en ticks (0 si no hay nada preparado). Pensada para leerla en cada fotograma. */
  posicion: () => number
}

interface Opciones {
  /** Fuerza o impide la repetición, sin mirar `pieza.bucle`. */
  bucle?: boolean
}

function esPercusion(pista: Pista): boolean {
  return Boolean((INSTRUMENTOS[pista.instrumento] as Instrumento).percusion)
}

/** ¿Puede el reproductor de `a` pasar a tocar `b` sin prepararse de nuevo? */
function mismaEstructura(a: Pieza, b: Pieza): boolean {
  if (a.compas[0] !== b.compas[0] || a.compas[1] !== b.compas[1] || a.compases !== b.compases) return false
  if ((a.swing ?? 0) !== (b.swing ?? 0) || (a.bucle ?? false) !== (b.bucle ?? false) || a.secciones !== b.secciones) return false
  if (a.pistas.length !== b.pistas.length) return false
  return a.pistas.every((p, i) => {
    const q = b.pistas[i]
    return q !== undefined && p.id === q.id && p.rol === q.rol && p.capa === q.capa && (p.volumen ?? 0) === (q.volumen ?? 0) && (p.paneo ?? 0) === (q.paneo ?? 0) && esPercusion(p) === esPercusion(q)
  })
}

/** Lleva al reproductor de tocar `antes` a tocar `ahora`: solo lo que ha cambiado. */
function ponerAlDia(reproductor: Reproductor, antes: Pieza, ahora: Pieza): void {
  ahora.pistas.forEach((pista, i) => {
    const previa = antes.pistas[i]
    if (!previa) return
    if (pista.notas !== previa.notas) reproductor.fijarNotas(pista.id, pista.notas)
    if (pista.instrumento !== previa.instrumento) void reproductor.fijarInstrumento(pista.id, pista.instrumento).catch(() => undefined)
    if ((pista.silenciada ?? false) !== (previa.silenciada ?? false)) reproductor.silenciar(pista.id, pista.silenciada ?? false)
  })
  if (ahora.tempo !== antes.tempo) reproductor.fijarTempo(ahora.tempo)
}

export function useReproductor(pieza: Pieza | undefined, opciones: Opciones = {}): ControlDeReproduccion {
  const [estado, setEstado] = useState<EstadoDeTransporte>('parado')
  const [error, setError] = useState<string>()
  const reproductor = useRef<Reproductor | undefined>(undefined)
  /** Pieza que toca (o está cargando) el reproductor. */
  const sonando = useRef<Pieza | undefined>(undefined)
  /** Última pieza recibida: puede ir por delante de la que se está cargando. */
  const ultima = useRef<Pieza | undefined>(pieza)
  const peticion = useRef(0)
  const tempo = useRef<number | undefined>(undefined)
  const transposicion = useRef(0)
  const silencios = useRef(new Map<string, boolean>())
  const instrumentos = useRef(new Map<string, IdInstrumento>())
  const capas = useRef<readonly string[] | undefined>(undefined)
  const seccion = useRef<string | undefined>(undefined)
  const { bucle } = opciones

  const soltar = useCallback(() => {
    peticion.current++
    reproductor.current?.liberar()
    reproductor.current = undefined
    sonando.current = undefined
  }, [])

  useEffect(() => {
    const anterior = ultima.current
    ultima.current = pieza
    if (anterior === pieza) return
    if (anterior && pieza && mismaEstructura(anterior, pieza)) {
      // Sigue siendo la misma pieza: se pone al día sin dejar de sonar. Si aún se está cargando, se hará al acabar.
      const actual = reproductor.current
      if (actual && !actual.liberado && sonando.current) {
        ponerAlDia(actual, sonando.current, pieza)
        sonando.current = pieza
      }
      return
    }
    // Es otra pieza: se suelta el reproductor y se olvidan los ajustes de la anterior.
    soltar()
    tempo.current = undefined
    transposicion.current = 0
    silencios.current.clear()
    instrumentos.current.clear()
    capas.current = undefined
    seccion.current = undefined
    setEstado('parado')
  }, [pieza, soltar])

  useEffect(() => soltar, [soltar])

  const reproducir = useCallback(() => {
    const paraSonar = ultima.current
    if (!paraSonar) return
    const actual = reproductor.current
    if (actual && !actual.liberado) {
      actual.reproducir()
      return
    }
    const turno = ++peticion.current
    sonando.current = paraSonar
    setEstado('cargando')
    setError(undefined)
    // Los instrumentos cambiados antes de sonar se cargan ya cambiados: así no suena un instante el de antes.
    const conInstrumentos =
      instrumentos.current.size === 0
        ? paraSonar
        : {
            ...paraSonar,
            pistas: paraSonar.pistas.map((p) => {
              const otro = instrumentos.current.get(p.id)
              return otro === undefined ? p : { ...p, instrumento: otro }
            }),
          }
    prepararPieza(conInstrumentos, bucle === undefined ? {} : { bucle })
      .then((nuevo) => {
        if (turno !== peticion.current) {
          // Mientras se cargaba, la pieza cambió o el componente se desmontó.
          nuevo.liberar()
          return
        }
        reproductor.current = nuevo
        nuevo.alCambiar((e) => setEstado(e))
        // La pieza ha podido cambiar (sin dejar de ser la misma) mientras se descargaban las muestras.
        if (ultima.current && ultima.current !== paraSonar) {
          ponerAlDia(nuevo, paraSonar, ultima.current)
          sonando.current = ultima.current
        }
        if (tempo.current !== undefined) nuevo.fijarTempo(tempo.current)
        nuevo.fijarTransposicion(transposicion.current)
        for (const [id, silenciada] of silencios.current) nuevo.silenciar(id, silenciada)
        if (seccion.current !== undefined) nuevo.irASeccion(seccion.current)
        if (capas.current) nuevo.fijarCapas(capas.current, { cuando: 'inmediato', fundido: 0.01 })
        nuevo.reproducir()
      })
      .catch((e: unknown) => {
        if (turno !== peticion.current) return
        sonando.current = undefined
        setError(e instanceof Error ? e.message : String(e))
        setEstado('error')
      })
  }, [bucle])

  const pausar = useCallback(() => reproductor.current?.pausar(), [])
  const detener = useCallback(() => {
    // Si aún estaba cargando, la carga en curso se descarta.
    if (!reproductor.current || reproductor.current.liberado) {
      peticion.current++
      sonando.current = undefined
      setEstado('parado')
      return
    }
    reproductor.current.detener()
  }, [])

  const alternar = useCallback(() => {
    if (estado === 'sonando' || estado === 'cargando') detener()
    else reproducir()
  }, [estado, detener, reproducir])

  const fijarTempo = useCallback((nuevo: number) => {
    tempo.current = nuevo
    reproductor.current?.fijarTempo(nuevo)
  }, [])

  const fijarTransposicion = useCallback((semitonos: number) => {
    transposicion.current = semitonos
    reproductor.current?.fijarTransposicion(semitonos)
  }, [])

  const silenciar = useCallback((pista: string, silenciada: boolean) => {
    silencios.current.set(pista, silenciada)
    reproductor.current?.silenciar(pista, silenciada)
  }, [])

  const fijarInstrumento = useCallback((pista: string, instrumento: IdInstrumento) => {
    instrumentos.current.set(pista, instrumento)
    void reproductor.current?.fijarInstrumento(pista, instrumento).catch(() => undefined)
  }, [])

  const fijarCapas = useCallback((activas: readonly string[], cambio?: OpcionesDeCambio) => {
    capas.current = activas
    reproductor.current?.fijarCapas(activas, cambio)
  }, [])

  const irASeccion = useCallback((id: string | undefined, cuando?: Cuando) => {
    seccion.current = id
    reproductor.current?.irASeccion(id, cuando)
  }, [])

  const posicion = useCallback(() => {
    const actual = reproductor.current
    return actual && !actual.liberado ? actual.posicion() : 0
  }, [])

  return useMemo(
    () => ({ estado, error, reproducir, pausar, detener, alternar, fijarTempo, fijarTransposicion, silenciar, fijarInstrumento, fijarCapas, irASeccion, posicion }),
    [estado, error, reproducir, pausar, detener, alternar, fijarTempo, fijarTransposicion, silenciar, fijarInstrumento, fijarCapas, irASeccion, posicion],
  )
}
