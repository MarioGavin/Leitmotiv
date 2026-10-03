/**
 * Ajustes del usuario que afectan a toda la app: aspecto, nomenclatura y
 * sonidos de interfaz.
 *
 * Se guardan en localStorage (y no en IndexedDB, como el progreso) porque hay
 * que leerlos de forma síncrona antes de pintar la primera pantalla: lo hace
 * el script de index.html, con la misma clave. La copia de seguridad en JSON
 * los incluye junto al progreso.
 */
import { useSyncExternalStore } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Nomenclatura } from '../musica/notas.ts'

/** Dirección visual. En la Parada 1 se elige una; hasta entonces conviven las dos. */
export type DireccionVisual = 'cartucho' | 'vinilo'
export type Esquema = 'sistema' | 'oscuro' | 'claro'
export type EsquemaResuelto = 'oscuro' | 'claro'

export const CLAVE_AJUSTES = 'leitmotiv-ajustes'

interface Ajustes {
  direccion: DireccionVisual
  esquema: Esquema
  /** Cómo se nombran las notas: Do–Re–Mi o C–D–E. */
  nomenclatura: Nomenclatura
  sonidosDeInterfaz: boolean
  fijar: (cambios: Partial<Omit<Ajustes, 'fijar'>>) => void
}

export const useAjustes = create<Ajustes>()(
  persist(
    (set) => ({
      direccion: 'cartucho',
      esquema: 'sistema',
      nomenclatura: 'latina',
      sonidosDeInterfaz: true,
      fijar: (cambios) => set(cambios),
    }),
    {
      name: CLAVE_AJUSTES,
      version: 1,
      partialize: ({ direccion, esquema, nomenclatura, sonidosDeInterfaz }) => ({ direccion, esquema, nomenclatura, sonidosDeInterfaz }),
    },
  ),
)

const consultaClaro = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: light)') : undefined

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
