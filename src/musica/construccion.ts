/**
 * Lo que suena en los ejercicios de construcción guiada: la pieza del
 * ejercicio con la opción elegida puesta en su hueco, para poder oírla antes
 * de responder.
 */
import { enPosicionCerrada } from './acordes.ts'
import { INSTRUMENTOS, type Instrumento } from './instrumentos.ts'
import { type Nomenclatura, croma, cromaDeMidi, nombreVisible, notaDeMidi } from './notas.ts'
import { type Nota, type Pieza, type Pista, notasEnTramo, ordenarNotas } from './pieza.ts'
import { nombreDeFigura } from './tiempo.ts'
import { alteracionesDe, leerAcorde, leerTonalidad } from './tonalidad.ts'

/** Identificador de la pista que se añade para oír el acorde elegido cuando la pieza no tiene ninguna de armonía. */
export const PISTA_DE_ACORDE = 'acorde-elegido'

const VELOCIDAD_DE_ACORDE = 76

/** La pieza con unas notas más en una de sus pistas: el fragmento elegido para el hueco de la melodía. */
export function conFragmento(pieza: Pieza, pista: string, notas: readonly Nota[]): Pieza {
  if (notas.length === 0) return pieza
  return { ...pieza, pistas: pieza.pistas.map((p) => (p.id === pista ? { ...p, notas: ordenarNotas([...p.notas, ...notas]) } : p)) }
}

/**
 * El texto de cada opción de un ejercicio de completar la melodía: sus notas
 * por nombre y en el orden en que suenan («Fa♯5 – Mi5»; las simultáneas, unidas
 * con «+»). Si dos opciones se leerían igual porque solo cambia el ritmo, todas
 * dicen además la figura de cada nota y los silencios hasta el final del hueco
 * («Do5 negra – silencio de negra»).
 */
export function nombrarFragmentos(opciones: ReadonlyArray<readonly Nota[]>, hueco: { t: number; d: number }, pieza: Pieza, nomenclatura: Nomenclatura): string[] {
  let alteraciones: 'sostenidos' | 'bemoles' = 'sostenidos'
  try {
    if (pieza.tonalidad) alteraciones = alteracionesDe(leerTonalidad(pieza.tonalidad))
  } catch {
    alteraciones = 'sostenidos'
  }
  const golpesDe = (notas: readonly Nota[]): Array<{ t: number; d: number; nombre: string }> => {
    const porInicio = new Map<number, Nota[]>()
    for (const nota of notas) porInicio.set(nota.t, [...(porInicio.get(nota.t) ?? []), nota])
    return [...porInicio.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([t, juntas]) => ({
        t,
        d: Math.max(...juntas.map((n) => n.d)),
        nombre: juntas
          .map((n) => n.n)
          .sort((a, b) => a - b)
          .map((n) => nombreVisible(notaDeMidi(n, alteraciones), nomenclatura))
          .join('+'),
      }))
  }
  const solas = opciones.map((notas) => golpesDe(notas).map((g) => g.nombre).join(' – '))
  if (new Set(solas).size === solas.length) return solas
  const figura = (ticks: number): string => nombreDeFigura(ticks) ?? ''
  return opciones.map((notas) => {
    const partes: string[] = []
    let ahora = hueco.t
    for (const golpe of golpesDe(notas)) {
      if (golpe.t > ahora) partes.push(`silencio de ${figura(golpe.t - ahora)}`.trim())
      partes.push(`${golpe.nombre} ${figura(golpe.d)}`.trim())
      ahora = Math.max(ahora, golpe.t + golpe.d)
    }
    if (hueco.t + hueco.d > ahora) partes.push(`silencio de ${figura(hueco.t + hueco.d - ahora)}`.trim())
    return partes.join(' – ')
  })
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
