/**
 * Una sesión de tocar al ritmo: hace sonar un plan (claqueta y patrón), recoge
 * los toques del usuario en el reloj del plan y avisa al acabar. La usan el
 * ejercicio de ritmo y la calibración del retardo.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { empezarRitmo } from '../audio/audio.ts'
import { useAudio } from '../audio/estado.ts'
import type { SesionDeRitmo } from '../audio/motor.ts'
import type { PlanDeRitmo } from '../musica/ritmo.ts'

export type EstadoDePulsaciones = 'parado' | 'cargando' | 'sonando'

/** Segundos que se sigue escuchando después del último instante del plan, por si el último toque llega tarde. */
const COLA = 0.35

export interface Pulsaciones {
  estado: EstadoDePulsaciones
  /** Por qué no ha podido empezar o se ha interrumpido, si ha pasado. */
  aviso: string | undefined
  empezar: () => void
  parar: () => void
  /** Apunta un toque. `marca` es la hora del evento (`event.timeStamp`). */
  tocar: (marca: number) => void
  /** Segundos del plan que el usuario lleva oídos, o `undefined` si no está sonando. Para leerlo en cada fotograma. */
  transcurrido: () => number | undefined
}

/**
 * @param latenciaMs Retardo calibrado que se resta a los toques.
 * @param alAcabar Se llama con los toques (segundos desde el principio del plan) cuando el plan termina.
 */
export function usePulsaciones(plan: PlanDeRitmo, latenciaMs: number, alAcabar: (toques: number[]) => void): Pulsaciones {
  const [estado, setEstado] = useState<EstadoDePulsaciones>('parado')
  const [aviso, setAviso] = useState<string>()
  const sesion = useRef<SesionDeRitmo | undefined>(undefined)
  const toques = useRef<number[]>([])
  const turno = useRef(0)
  const audio = useAudio((a) => a.estado)
  // Las últimas versiones de lo que cambia entre pintadas, para leerlas desde el bucle de fotogramas.
  const actual = useRef({ latenciaMs, alAcabar })
  useEffect(() => {
    actual.current = { latenciaMs, alAcabar }
  }, [latenciaMs, alAcabar])

  const parar = useCallback(() => {
    turno.current++
    sesion.current?.detener()
    sesion.current = undefined
    setEstado('parado')
  }, [])

  const empezar = useCallback(() => {
    const mio = ++turno.current
    toques.current = []
    setAviso(undefined)
    setEstado('cargando')
    empezarRitmo(plan)
      .then((nueva) => {
        if (mio !== turno.current) {
          nueva.detener()
          return
        }
        sesion.current = nueva
        setEstado('sonando')
        // Para las pruebas automáticas: cuándo, en el reloj de la página, hay que tocar cada golpe.
        const cero = performance.now() - nueva.transcurrido(actual.current.latenciaMs) * 1000
        document.dispatchEvent(new CustomEvent('leitmotiv:ritmo', { detail: { instantes: plan.esperados.map((g) => cero + g.t * 1000) } }))
      })
      .catch(() => {
        if (mio !== turno.current) return
        setAviso(navigator.onLine ? 'No se ha podido cargar el sonido. Vuelve a intentarlo.' : 'Hace falta conexión la primera vez que se usa la batería.')
        setEstado('parado')
      })
  }, [plan])

  // Mientras suena, se vigila cuándo acaba el plan.
  useEffect(() => {
    if (estado !== 'sonando') return
    let cuadro = 0
    const mirar = (): void => {
      const activa = sesion.current
      if (!activa) return
      if (activa.transcurrido(actual.current.latenciaMs) >= plan.duracion + COLA) {
        turno.current++
        sesion.current = undefined
        setEstado('parado')
        actual.current.alAcabar(toques.current)
        return
      }
      cuadro = requestAnimationFrame(mirar)
    }
    cuadro = requestAnimationFrame(mirar)
    return () => cancelAnimationFrame(cuadro)
  }, [estado, plan])

  // Si el sistema corta el audio a media sesión (una llamada, la app en segundo plano), se interrumpe.
  useEffect(() => {
    if (audio === 'suspendido' && sesion.current) {
      parar()
      setAviso('Se ha interrumpido el sonido. Vuelve a empezar.')
    }
  }, [audio, parar])

  // Al salir de la pantalla no puede quedar nada sonando.
  useEffect(() => parar, [parar])

  const tocar = useCallback((marca: number) => {
    const activa = sesion.current
    if (activa) toques.current.push(activa.instante(marca, actual.current.latenciaMs))
  }, [])

  const transcurrido = useCallback(() => sesion.current?.transcurrido(actual.current.latenciaMs), [])

  return { estado, aviso, empezar, parar, tocar, transcurrido }
}
