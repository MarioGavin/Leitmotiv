/**
 * Estado del audio visible para la interfaz. Vive en el paquete inicial y no
 * importa Tone.js: el motor (motor.ts) se carga aparte y escribe aquí.
 */
import { create } from 'zustand'
import type { IdInstrumento } from '../musica/instrumentos.ts'

export type EstadoDelAudio =
  /** Aún no ha habido un gesto del usuario: el navegador no deja sonar nada. */
  | 'apagado'
  | 'arrancando'
  | 'activo'
  /** El sistema ha parado el audio (app en segundo plano, llamada…) y hace falta reanudarlo. */
  | 'suspendido'
  | 'error'

export type CargaDeInstrumento = { fase: 'cargando'; cargadas: number; total: number } | { fase: 'listo' } | { fase: 'error'; mensaje: string }

interface AudioVisible {
  estado: EstadoDelAudio
  error: string | undefined
  cargas: Partial<Record<IdInstrumento, CargaDeInstrumento>>
  fijarEstado: (estado: EstadoDelAudio, error?: string) => void
  fijarCarga: (id: IdInstrumento, carga: CargaDeInstrumento) => void
}

export const useAudio = create<AudioVisible>((set) => ({
  estado: 'apagado',
  error: undefined,
  cargas: {},
  fijarEstado: (estado, error) => set({ estado, error }),
  fijarCarga: (id, carga) => set((s) => ({ cargas: { ...s.cargas, [id]: carga } })),
}))
