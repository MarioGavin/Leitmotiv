/**
 * Ventanas emergentes que pueden abrirse desde cualquier pantalla. De momento
 * solo hay una: la definición de un término del glosario.
 */
import { create } from 'zustand'

interface Ventanas {
  /** Identificador del término del glosario abierto, si lo hay. */
  glosario: string | undefined
  abrirGlosario: (id: string) => void
  cerrar: () => void
}

export const useVentanas = create<Ventanas>((set) => ({
  glosario: undefined,
  abrirGlosario: (id) => set({ glosario: id }),
  cerrar: () => set({ glosario: undefined }),
}))
