/**
 * Repaso espaciado con FSRS: cada concepto es una tarjeta y cada vez que se
 * practica se decide cuándo volverá a tocar. Cuanto mejor sale, más tarda.
 */
import { type Card, type Grade, Rating, createEmptyCard, fsrs } from 'ts-fsrs'
import type { EstadoFsrs, Tarjeta } from './tipos.ts'

/**
 * Sin pasos de minutos (aquí no se repasa dos veces en la misma sesión) y sin
 * la variación al azar de los intervalos, para que el mismo historial dé
 * siempre las mismas fechas. Un concepto no pasa más de medio año sin volver.
 */
const planificador = fsrs({ enable_fuzz: false, enable_short_term: false, request_retention: 0.9, maximum_interval: 180 })

export interface Resultado {
  aciertos: number
  total: number
}

/** Cómo ha ido un ejercicio, en la escala de FSRS: todo bien, «bien»; con fallos, «difícil»; más fallos que aciertos, «otra vez». */
export function calificacionDe({ aciertos, total }: Resultado): Grade {
  // Un ejercicio sin preguntas que acertar (componer algo que cumpla unos requisitos) se da por bien hecho al terminarlo.
  if (total <= 0) return Rating.Good
  const proporcion = aciertos / total
  if (proporcion >= 1) return Rating.Good
  return proporcion >= 0.5 ? Rating.Hard : Rating.Again
}

/** Junta los resultados de varios ejercicios del mismo concepto. */
export function sumar(a: Resultado | undefined, b: Resultado): Resultado {
  return a ? { aciertos: a.aciertos + b.aciertos, total: a.total + b.total } : { ...b }
}

function guardar(card: Card): EstadoFsrs {
  const estado: EstadoFsrs = {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
  }
  if (card.last_review) estado.last_review = card.last_review.toISOString()
  return estado
}

/**
 * Apunta que se ha practicado un concepto y devuelve su tarjeta con la nueva fecha.
 * @param tarjeta La tarjeta que había, o `undefined` si es la primera vez.
 * @param paso Ejercicio con el que se ha practicado, si viene de una sesión de repaso.
 */
export function repasar(tarjeta: Tarjeta | undefined, concepto: string, resultado: Resultado, ahora: Date, paso?: string): Tarjeta {
  const anterior = tarjeta ? tarjeta.fsrs : createEmptyCard(ahora)
  const { card } = planificador.next(anterior, ahora, calificacionDe(resultado))
  const nueva: Tarjeta = { concepto, fsrs: guardar(card) }
  const ultimoPaso = paso ?? tarjeta?.ultimoPaso
  if (ultimoPaso !== undefined) nueva.ultimoPaso = ultimoPaso
  return nueva
}
