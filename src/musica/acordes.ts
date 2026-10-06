/**
 * Cómo se colocan en el teclado las notas de un acorde. La teoría (qué notas
 * tiene cada acorde) sale de Tonal; esto solo decide en qué octava suena cada una.
 */
import { croma, cromaDeMidi } from './notas.ts'

/** Apila las notas de un acorde por encima de su fundamental: cada una, la primera con ese nombre que queda más arriba de la anterior. */
export function apilar(fundamental: number, clases: readonly string[]): number[] {
  const salida: number[] = []
  let anterior = fundamental - 1
  for (const clase of clases) {
    let midi = anterior + 1
    while (cromaDeMidi(midi) !== croma(clase)) midi++
    salida.push(midi)
    anterior = midi
  }
  return salida
}

/** Coloca las notas de un acorde en posición cerrada dentro de la octava que empieza en `desde`: así los enlaces entre acordes son suaves. */
export function enPosicionCerrada(clases: readonly string[], desde: number): number[] {
  return clases
    .map((clase) => {
      let midi = desde
      while (cromaDeMidi(midi) !== croma(clase)) midi++
      return midi
    })
    .sort((a, b) => a - b)
}
