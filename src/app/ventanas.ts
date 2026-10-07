/**
 * Ventanas emergentes que pueden abrirse desde cualquier pantalla (de momento,
 * la definición de un término del glosario) y si la pantalla actual ocupa toda
 * la pantalla, sin la navegación.
 */
import { useEffect } from 'react'
import { create } from 'zustand'

interface Ventanas {
  /** Identificador del término del glosario abierto, si lo hay. */
  glosario: string | undefined
  abrirGlosario: (id: string) => void
  cerrar: () => void
  /** Una pantalla con navegación la esconde mientras hace algo que pide toda la pantalla: una sesión de repaso, la prueba de nivel. */
  pantallaCompleta: boolean
  fijarPantallaCompleta: (completa: boolean) => void
}

export const useVentanas = create<Ventanas>((set) => ({
  glosario: undefined,
  abrirGlosario: (id) => set({ glosario: id }),
  cerrar: () => set({ glosario: undefined }),
  pantallaCompleta: false,
  fijarPantallaCompleta: (completa) => set({ pantallaCompleta: completa }),
}))

/** Esconde la navegación mientras el componente que lo pide está montado. */
export function usePantallaCompleta(): void {
  useEffect(() => {
    const { fijarPantallaCompleta } = useVentanas.getState()
    fijarPantallaCompleta(true)
    return () => fijarPantallaCompleta(false)
  }, [])
}
