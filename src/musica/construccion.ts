/**
 * Lo que suena en los ejercicios de construcción guiada: la pieza del
 * ejercicio con la opción elegida puesta en su hueco, para poder oírla antes
 * de responder.
 */
import { enPosicionCerrada } from './acordes.ts'
import { INSTRUMENTOS, type Instrumento } from './instrumentos.ts'
import { croma, cromaDeMidi } from './notas.ts'
import { type Nota, type Pieza, type Pista, notasEnTramo, ordenarNotas } from './pieza.ts'
import { leerAcorde } from './tonalidad.ts'

/** Identificador de la pista que se añade para oír el acorde elegido cuando la pieza no tiene ninguna de armonía. */
export const PISTA_DE_ACORDE = 'acorde-elegido'

const VELOCIDAD_DE_ACORDE = 76

/** La pieza con unas notas más en una de sus pistas: el fragmento elegido para el hueco de la melodía. */
export function conFragmento(pieza: Pieza, pista: string, notas: readonly Nota[]): Pieza {
  if (notas.length === 0) return pieza
  return { ...pieza, pistas: pieza.pistas.map((p) => (p.id === pista ? { ...p, notas: ordenarNotas([...p.notas, ...notas]) } : p)) }
}

function esArmonia(pista: Pista): boolean {
  const instrumento: Instrumento = INSTRUMENTOS[pista.instrumento]
  return (pista.rol === 'armonia' || pista.rol === 'colchon') && !instrumento.percusion
}

/**
 * La pieza de un ejercicio de elegir acorde, preparada para oír una opción. El
 * acorde suena en la pista de armonía (si no hay ninguna, se añade una de
 * piano) y, si el bajo calla en el hueco, también toca su fundamental. Sin
 * símbolo devuelve la pieza con el hueco vacío, pero ya con la pista añadida:
 * así elegir una opción no cambia las pistas y no hay que preparar el sonido otra vez.
 */
export function conAcorde(pieza: Pieza, hueco: { t: number; d: number }, simbolo: string | undefined): Pieza {
  const pistas = pieza.pistas.some(esArmonia) ? pieza.pistas : [...pieza.pistas, { id: PISTA_DE_ACORDE, rol: 'armonia' as const, instrumento: 'piano' as const, notas: [] }]
  if (simbolo === undefined) return pistas === pieza.pistas ? pieza : { ...pieza, pistas }
  const acorde = leerAcorde(simbolo)
  const armonia = pistas.find(esArmonia) as Pista
  // El acorde se coloca en el registro en el que ya toca esa pista; si está vacía, alrededor del Do central.
  const [grave, aguda] = INSTRUMENTOS[armonia.instrumento].rango
  const alturas = armonia.notas.map((n) => n.n)
  const centro = alturas.length > 0 ? alturas.reduce((s, n) => s + n, 0) / alturas.length : 62
  const desde = Math.min(Math.max(grave, Math.round(centro) - 6), aguda - 12)
  const notasDelAcorde = enPosicionCerrada(acorde.notas, desde).map((n): Nota => ({ t: hueco.t, d: hueco.d, n, v: VELOCIDAD_DE_ACORDE }))
  const bajo = pistas.find((p) => p.rol === 'bajo')
  const bajoCallado = bajo !== undefined && notasEnTramo(bajo, hueco.t, hueco.t + hueco.d).length === 0
  let notaDelBajo: Nota | undefined
  if (bajo && bajoCallado) {
    const [bajoGrave, bajoAgudo] = INSTRUMENTOS[bajo.instrumento].rango
    const referencia = bajo.notas.length > 0 ? bajo.notas.reduce((s, n) => s + n.n, 0) / bajo.notas.length : 40
    // La fundamental (o el bajo del cifrado, si lo indica) más cercana a donde ya toca el bajo.
    const objetivo = croma(acorde.bajo ?? acorde.fundamental)
    let mejor: number | undefined
    for (let n = bajoGrave; n <= bajoAgudo; n++) {
      if (cromaDeMidi(n) !== objetivo) continue
      if (mejor === undefined || Math.abs(n - referencia) < Math.abs(mejor - referencia)) mejor = n
    }
    if (mejor !== undefined) notaDelBajo = { t: hueco.t, d: hueco.d, n: mejor, v: 88 }
  }
  return {
    ...pieza,
    acordes: [...(pieza.acordes ?? []), { t: hueco.t, d: hueco.d, simbolo: acorde.simbolo }].sort((a, b) => a.t - b.t),
    pistas: pistas.map((p) => {
      if (p === armonia) return { ...p, notas: ordenarNotas([...p.notas, ...notasDelAcorde]) }
      if (p === bajo && notaDelBajo) return { ...p, notas: ordenarNotas([...p.notas, notaDelBajo]) }
      return p
    }),
  }
}
