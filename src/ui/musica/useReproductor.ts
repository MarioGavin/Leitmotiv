/**
 * Reproducción de una pieza desde un componente: prepara el reproductor del
 * motor la primera vez que se pide sonar, sigue su estado y lo libera al salir.
 *
 * El transporte de audio es único, así que solo suena una pieza a la vez: si
 * otro componente empieza a reproducir la suya, esta se para sola.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { prepararPieza } from '../../audio/audio.ts'
import type { Reproductor } from '../../audio/reproductor.ts'
import type { Pieza } from '../../musica/pieza.ts'

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
  /** Posición actual en ticks (0 si no hay nada preparado). Pensada para leerla en cada fotograma. */
  posicion: () => number
}

interface Opciones {
  /** Fuerza o impide la repetición, sin mirar `pieza.bucle`. */
  bucle?: boolean
}

export function useReproductor(pieza: Pieza | undefined, opciones: Opciones = {}): ControlDeReproduccion {
  const [estado, setEstado] = useState<EstadoDeTransporte>('parado')
  const [error, setError] = useState<string>()
  const reproductor = useRef<Reproductor | undefined>(undefined)
  const peticion = useRef(0)
  const tempo = useRef<number | undefined>(undefined)
  const transposicion = useRef(0)
  const silencios = useRef(new Map<string, boolean>())
  const { bucle } = opciones

  // Al cambiar de pieza o al desmontar se suelta el reproductor y se olvidan los ajustes de la anterior.
  // Las referencias se leen a propósito en el momento de limpiar (guardan el último valor, no un nodo del DOM),
  // y `pieza` no se usa dentro: es lo que dispara la limpieza.
  /* oxlint-disable react/exhaustive-deps */
  useEffect(() => {
    return () => {
      peticion.current++
      reproductor.current?.liberar()
      reproductor.current = undefined
      tempo.current = undefined
      transposicion.current = 0
      silencios.current.clear()
      setEstado('parado')
    }
  }, [pieza])
  /* oxlint-enable react/exhaustive-deps */

  const reproducir = useCallback(() => {
    if (!pieza) return
    const actual = reproductor.current
    if (actual && !actual.liberado) {
      actual.reproducir()
      return
    }
    const turno = ++peticion.current
    setEstado('cargando')
    setError(undefined)
    prepararPieza(pieza, bucle === undefined ? {} : { bucle })
      .then((nuevo) => {
        if (turno !== peticion.current) {
          // Mientras se cargaba, la pieza cambió o el componente se desmontó.
          nuevo.liberar()
          return
        }
        reproductor.current = nuevo
        nuevo.alCambiar((e) => setEstado(e))
        if (tempo.current !== undefined) nuevo.fijarTempo(tempo.current)
        nuevo.fijarTransposicion(transposicion.current)
        for (const [id, silenciada] of silencios.current) nuevo.silenciar(id, silenciada)
        nuevo.reproducir()
      })
      .catch((e: unknown) => {
        if (turno !== peticion.current) return
        setError(e instanceof Error ? e.message : String(e))
        setEstado('error')
      })
  }, [pieza, bucle])

  const pausar = useCallback(() => reproductor.current?.pausar(), [])
  const detener = useCallback(() => {
    // Si aún estaba cargando, la carga en curso se descarta.
    if (!reproductor.current || reproductor.current.liberado) {
      peticion.current++
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

  const posicion = useCallback(() => {
    const actual = reproductor.current
    return actual && !actual.liberado ? actual.posicion() : 0
  }, [])

  return useMemo(
    () => ({ estado, error, reproducir, pausar, detener, alternar, fijarTempo, fijarTransposicion, silenciar, posicion }),
    [estado, error, reproducir, pausar, detener, alternar, fijarTempo, fijarTransposicion, silenciar, posicion],
  )
}
