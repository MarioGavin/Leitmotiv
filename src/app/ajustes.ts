/**
 * Ajustes del usuario que afectan a toda la app: esquema de color,
 * nomenclatura y sonidos de interfaz.
 *
 * Se guardan en localStorage (y no en IndexedDB, como el progreso) porque hay
 * que leerlos de forma síncrona antes de pintar la primera pantalla: lo hace
 * el script de index.html, con la misma clave. La copia de seguridad en JSON
 * los incluye junto al progreso.
 */
import { useSyncExternalStore } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { acotarLatencia } from '../audio/pulsacion.ts'
import type { TimbreDeInterfaz } from '../audio/sonidos.ts'
import type { Nomenclatura } from '../musica/notas.ts'

export type Esquema = 'sistema' | 'oscuro' | 'claro'
export type EsquemaResuelto = 'oscuro' | 'claro'

export const CLAVE_AJUSTES = 'leitmotiv-ajustes'
/** Versión de la forma guardada. Si cambia, hay que revisar `migrar` y el script de index.html. */
export const VERSION_DE_AJUSTES = 3

export interface ValoresDeAjustes {
  esquema: Esquema
  /** Cómo se nombran las notas: Do–Re–Mi o C–D–E. */
  nomenclatura: Nomenclatura
  sonidosDeInterfaz: boolean
  /** Con qué suena la interfaz: el pitido de una consola de 8 bits o una campana. */
  timbre: TimbreDeInterfaz
  /**
   * Retardo del sonido medido en la calibración, en milisegundos: lo que tarda
   * el usuario en oír algo desde que el reloj de audio dice que sale. Se resta
   * a sus toques en los ejercicios de ritmo.
   */
  latenciaMs: number
}

interface Ajustes extends ValoresDeAjustes {
  fijar: (cambios: Partial<ValoresDeAjustes>) => void
}

export const AJUSTES_INICIALES: ValoresDeAjustes = {
  esquema: 'sistema',
  nomenclatura: 'latina',
  sonidosDeInterfaz: true,
  timbre: 'chip',
  latenciaMs: 0,
}

/**
 * Lee unos ajustes guardados por cualquier versión anterior (o venidos de una
 * copia de seguridad) y se queda solo con lo que sigue valiendo. La versión 1
 * guardaba además una «dirección visual», de la que se hereda el timbre; el
 * retardo calibrado llegó en la 3.
 */
export function migrar(guardado: unknown): ValoresDeAjustes {
  const g = (typeof guardado === 'object' && guardado !== null ? guardado : {}) as Record<string, unknown>
  return {
    esquema: g.esquema === 'oscuro' || g.esquema === 'claro' || g.esquema === 'sistema' ? g.esquema : AJUSTES_INICIALES.esquema,
    nomenclatura: g.nomenclatura === 'anglosajona' || g.nomenclatura === 'latina' ? g.nomenclatura : AJUSTES_INICIALES.nomenclatura,
    sonidosDeInterfaz: typeof g.sonidosDeInterfaz === 'boolean' ? g.sonidosDeInterfaz : AJUSTES_INICIALES.sonidosDeInterfaz,
    timbre: g.timbre === 'chip' || g.timbre === 'campana' ? g.timbre : g.direccion === 'vinilo' ? 'campana' : AJUSTES_INICIALES.timbre,
    latenciaMs: typeof g.latenciaMs === 'number' ? acotarLatencia(g.latenciaMs) : AJUSTES_INICIALES.latenciaMs,
  }
}

export const useAjustes = create<Ajustes>()(
  persist(
    (set) => ({
      ...AJUSTES_INICIALES,
      fijar: (cambios) => set(cambios),
    }),
    {
      name: CLAVE_AJUSTES,
      version: VERSION_DE_AJUSTES,
      migrate: (guardado) => migrar(guardado),
      partialize: ({ esquema, nomenclatura, sonidosDeInterfaz, timbre, latenciaMs }) => ({ esquema, nomenclatura, sonidosDeInterfaz, timbre, latenciaMs }),
    },
  ),
)

/** Los ajustes de ahora, sin las funciones del almacén: lo que va a una copia de seguridad. */
export function valoresActuales(): ValoresDeAjustes {
  const { esquema, nomenclatura, sonidosDeInterfaz, timbre, latenciaMs } = useAjustes.getState()
  return { esquema, nomenclatura, sonidosDeInterfaz, timbre, latenciaMs }
}

const consultaClaro =typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: light)') : undefined

/** Avisa cuando el sistema cambia entre claro y oscuro. Devuelve la función para dejar de escuchar. */
export function alCambiarEsquemaDelSistema(oyente: () => void): () => void {
  consultaClaro?.addEventListener('change', oyente)
  return () => consultaClaro?.removeEventListener('change', oyente)
}

/** El esquema que se está aplicando de verdad: «sistema» ya resuelto a claro u oscuro. */
export function useEsquemaResuelto(): EsquemaResuelto {
  const esquema = useAjustes((a) => a.esquema)
  const sistemaClaro = useSyncExternalStore(alCambiarEsquemaDelSistema, () => consultaClaro?.matches ?? false)
  if (esquema !== 'sistema') return esquema
  return sistemaClaro ? 'claro' : 'oscuro'
}
