/**
 * Secciones de una pieza: recortarlas, cambiarlas de orden y saber cuándo dos
 * suenan igual. Lo usa el ejercicio de ordenar secciones.
 */
import type { AcordeMarcado, Nota, Pieza, Seccion } from './pieza.ts'
import { ticksPorCompas } from './tiempo.ts'

function tramoDe(pieza: Pieza, seccion: Seccion): { desde: number; hasta: number } {
  const porCompas = ticksPorCompas(pieza.compas)
  return { desde: (seccion.desde - 1) * porCompas, hasta: seccion.hasta * porCompas }
}

/** Notas que suenan en un tramo, recortadas a él y contadas desde su principio. */
function recortar(notas: readonly Nota[], desde: number, hasta: number): Nota[] {
  return notas
    .filter((n) => n.t < hasta && n.t + n.d > desde)
    .map((n) => {
      const inicio = Math.max(n.t, desde)
      return { ...n, t: inicio - desde, d: Math.min(n.t + n.d, hasta) - inicio }
    })
}

function recortarAcordes(acordes: readonly AcordeMarcado[], desde: number, hasta: number): AcordeMarcado[] {
  return acordes
    .filter((a) => a.t < hasta && a.t + a.d > desde)
    .map((a) => {
      const inicio = Math.max(a.t, desde)
      return { ...a, t: inicio - desde, d: Math.min(a.t + a.d, hasta) - inicio }
    })
}

/** Una sección como pieza suelta, para oírla sola. */
export function piezaDeSeccion(pieza: Pieza, seccion: Seccion): Pieza {
  const { desde, hasta } = tramoDe(pieza, seccion)
  const { secciones: _secciones, acordes, bucle: _bucle, ...resto } = pieza
  const suelta: Pieza = { ...resto, compases: seccion.hasta - seccion.desde + 1, pistas: pieza.pistas.map((p) => ({ ...p, notas: recortar(p.notas, desde, hasta) })) }
  if (acordes) suelta.acordes = recortarAcordes(acordes, desde, hasta)
  return suelta
}

/** La pieza con sus secciones en otro orden. `orden` son identificadores de sección; las que no existan se ignoran. */
export function reordenar(pieza: Pieza, orden: readonly string[]): Pieza {
  const porCompas = ticksPorCompas(pieza.compas)
  const elegidas = orden.flatMap((id) => (pieza.secciones ?? []).find((s) => s.id === id) ?? [])
  const pistas = pieza.pistas.map((p) => ({ ...p, notas: [] as Nota[] }))
  const acordes: AcordeMarcado[] = []
  const secciones: Seccion[] = []
  let compas = 0
  for (const seccion of elegidas) {
    const { desde, hasta } = tramoDe(pieza, seccion)
    const largo = seccion.hasta - seccion.desde + 1
    pieza.pistas.forEach((p, i) => {
      for (const n of recortar(p.notas, desde, hasta)) pistas[i]?.notas.push({ ...n, t: n.t + compas * porCompas })
    })
    for (const a of recortarAcordes(pieza.acordes ?? [], desde, hasta)) acordes.push({ ...a, t: a.t + compas * porCompas })
    secciones.push({ ...seccion, desde: compas + 1, hasta: compas + largo })
    compas += largo
  }
  const { bucle: _bucle, ...resto } = pieza
  const salida: Pieza = { ...resto, compases: Math.max(1, compas), pistas, secciones }
  if (pieza.acordes) salida.acordes = acordes
  return salida
}

/** Huella de lo que suena en una sección: dos secciones con la misma huella son indistinguibles al oído. */
export function huellaDeSeccion(pieza: Pieza, seccion: Seccion): string {
  const { desde, hasta } = tramoDe(pieza, seccion)
  return pieza.pistas
    .map((p) =>
      recortar(p.notas, desde, hasta)
        .map((n) => `${n.t}:${n.d}:${n.n}`)
        .sort()
        .join(','),
    )
    .join('|')
}

/** ¿Suena esta ordenación igual que la pieza original? Dos secciones idénticas pueden intercambiarse. */
export function ordenCorrecto(pieza: Pieza, orden: readonly string[]): boolean {
  const secciones = pieza.secciones ?? []
  if (orden.length !== secciones.length) return false
  return secciones.every((original, i) => {
    const puesta = secciones.find((s) => s.id === orden[i])
    return puesta !== undefined && huellaDeSeccion(pieza, puesta) === huellaDeSeccion(pieza, original)
  })
}

/** Las secciones en un orden al azar que no sea ya el correcto (salvo que todas suenen igual). */
export function barajarSecciones(pieza: Pieza, azar: () => number): string[] {
  const ids = (pieza.secciones ?? []).map((s) => s.id)
  for (let intento = 0; intento < 20; intento++) {
    const orden = [...ids]
    for (let i = orden.length - 1; i > 0; i--) {
      const k = Math.floor(azar() * (i + 1))
      ;[orden[i], orden[k]] = [orden[k] as string, orden[i] as string]
    }
    if (!ordenCorrecto(pieza, orden)) return orden
  }
  // Tras varios intentos sigue saliendo el correcto: se gira una posición, que casi siempre lo cambia.
  return [...ids.slice(1), ...ids.slice(0, 1)]
}
