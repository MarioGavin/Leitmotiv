/** Cómo ha ido un paso: de cuántas cosas que había que acertar, cuántas han salido a la primera. */
export interface ResultadoDePaso {
  aciertos: number
  total: number
}

/** Resultado de un paso en el que no hay nada que acertar (teoría, componer). */
export const SIN_PREGUNTAS: ResultadoDePaso = { aciertos: 0, total: 0 }

export interface PropsDePaso<P> {
  paso: P
  /** Se llama una sola vez, cuando el usuario da el paso por terminado. */
  alTerminar: (resultado: ResultadoDePaso) => void
}

export type FaseDeCuestionario = 'pregunta' | 'acierto' | 'fallo'

/** Por dónde va un cuestionario: lo necesita quien pinta lo que acompaña a la pregunta. */
export interface MomentoDeCuestionario {
  /** Posición de la pregunta en la lista original. */
  indice: number
  /** Opción marcada ahora mismo, si hay alguna. */
  eleccion: number | undefined
  fase: FaseDeCuestionario
}

export const MOMENTO_INICIAL: MomentoDeCuestionario = { indice: 0, eleccion: undefined, fase: 'pregunta' }
