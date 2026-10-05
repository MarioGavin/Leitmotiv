/**
 * Lo que suena en un ejercicio de ritmo: la claqueta y el patrón, programados
 * de una vez sobre el reloj de audio. No pasa por el transporte: los instantes
 * del plan son segundos exactos y así se pueden comparar con los toques.
 */
import { teclaDePercusion } from '../musica/instrumentos.ts'
import type { PlanDeRitmo } from '../musica/ritmo.ts'
import type { Voz } from './voces.ts'

/** Con qué fuerza suena cada cosa (velocidad MIDI). La claqueta, más floja que el patrón, para que no lo tape. */
const FUERZA = { claquetaFuerte: 118, claqueta: 78, patronFuerte: 124, patron: 100 } as const

/**
 * Programa un plan de ritmo en una voz de batería. La claqueta suena con el
 * golpe de aro y el patrón con la caja: los dos se oyen bien en el altavoz de
 * un móvil, que apenas reproduce un bombo.
 * @param inicio Instante del reloj de audio en el que empieza el plan.
 */
export function programarRitmo(plan: PlanDeRitmo, voz: Voz, inicio: number): void {
  const aro = teclaDePercusion('bateria', 'aro') ?? 37
  const caja = teclaDePercusion('bateria', 'caja') ?? 38
  for (const golpe of plan.claqueta) voz.tocar(aro, inicio + golpe.t, 0.1, golpe.fuerte ? FUERZA.claquetaFuerte : FUERZA.claqueta)
  for (const golpe of plan.patron) voz.tocar(caja, inicio + golpe.t, 0.1, golpe.fuerte ? FUERZA.patronFuerte : FUERZA.patron)
}
