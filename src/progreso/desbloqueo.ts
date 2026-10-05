/**
 * Qué se puede abrir y qué está hecho, a partir del índice del curso y de las
 * lecciones completadas.
 *
 * - Dentro de una unidad, las lecciones se abren en orden.
 * - Dentro de un mundo, las unidades se abren en orden: cada una, al terminar la anterior.
 * - Un mundo se abre al terminar el anterior.
 * - La prueba de nivel da unidades por sabidas: cuentan como terminadas y dejan todas sus lecciones abiertas.
 * - Lo que aún no tiene lecciones está «en obras» y no cierra el paso a nadie.
 */
import type { IndiceDelCurso, ResumenDeLeccion, ResumenDeMundo, ResumenDeUnidad } from '../contenido/tipos.ts'

export type Acceso = 'bloqueado' | 'disponible' | 'completado' | 'en-obras'
export type AccesoDeLeccion = 'bloqueada' | 'disponible' | 'completada'

export interface EstadoDeLeccion {
  id: string
  acceso: AccesoDeLeccion
}

export interface EstadoDeUnidad {
  id: string
  acceso: Acceso
  /** Dada por sabida en la prueba de nivel. */
  superada: boolean
  /** Lecciones completadas. */
  hechas: number
  total: number
  lecciones: EstadoDeLeccion[]
}

export interface EstadoDeMundo {
  id: string
  acceso: Acceso
  hechas: number
  total: number
  unidades: EstadoDeUnidad[]
}

/** ¿Deja pasar a lo siguiente? Una unidad en construcción deja pasar cuando se han hecho las lecciones que tiene. */
function terminada(unidad: EstadoDeUnidad): boolean {
  return unidad.superada || (unidad.total > 0 && unidad.hechas === unidad.total)
}

function estadoDeUnidad(unidad: ResumenDeUnidad, abierta: boolean, completadas: ReadonlySet<string>, superadas: ReadonlySet<string>): EstadoDeUnidad {
  const superada = superadas.has(unidad.id)
  const total = unidad.lecciones.length
  const hechas = unidad.lecciones.filter((l) => completadas.has(l.id)).length
  const lecciones = unidad.lecciones.map((leccion: ResumenDeLeccion, i): EstadoDeLeccion => {
    if (completadas.has(leccion.id)) return { id: leccion.id, acceso: 'completada' }
    const anterior = unidad.lecciones[i - 1]
    const enOrden = i === 0 || (anterior !== undefined && completadas.has(anterior.id))
    return { id: leccion.id, acceso: abierta && (enOrden || superada) ? 'disponible' : 'bloqueada' }
  })
  let acceso: Acceso
  if (total === 0) acceso = 'en-obras'
  // Lo hecho, hecho está; lo dado por sabido solo vale donde ya se podía entrar.
  else if ((!unidad.borrador && hechas === total) || (superada && abierta)) acceso = 'completado'
  else acceso = abierta ? 'disponible' : 'bloqueado'
  return { id: unidad.id, acceso, superada, hechas, total, lecciones }
}

function estadoDeMundo(mundo: ResumenDeMundo, abierto: boolean, completadas: ReadonlySet<string>, superadas: ReadonlySet<string>): EstadoDeMundo {
  const unidades: EstadoDeUnidad[] = []
  // La primera unidad con lecciones está abierta si lo está el mundo; cada una de las siguientes, al terminar la anterior.
  let abiertaLaSiguiente = abierto
  for (const unidad of mundo.unidades) {
    const estado = estadoDeUnidad(unidad, abiertaLaSiguiente, completadas, superadas)
    unidades.push(estado)
    if (estado.total > 0) abiertaLaSiguiente = abierto && terminada(estado)
  }
  const conLecciones = unidades.filter((u) => u.total > 0)
  let acceso: Acceso
  if (conLecciones.length === 0) acceso = 'en-obras'
  else if (conLecciones.every((u) => u.acceso === 'completado')) acceso = 'completado'
  else acceso = abierto ? 'disponible' : 'bloqueado'
  return { id: mundo.id, acceso, hechas: unidades.reduce((s, u) => s + u.hechas, 0), total: unidades.reduce((s, u) => s + u.total, 0), unidades }
}

/** Estado de todo el curso: un elemento por mundo, en el orden del índice. */
export function estadoDelCurso(indice: IndiceDelCurso, completadas: ReadonlySet<string>, superadas: ReadonlySet<string>): EstadoDeMundo[] {
  const mundos: EstadoDeMundo[] = []
  let abiertoElSiguiente = true
  for (const mundo of indice.mundos) {
    const estado = estadoDeMundo(mundo, abiertoElSiguiente, completadas, superadas)
    mundos.push(estado)
    const conLecciones = estado.unidades.filter((u) => u.total > 0)
    // Un mundo en obras no cierra el paso; uno con lecciones lo abre cuando se terminan todas sus unidades.
    if (conLecciones.length > 0) abiertoElSiguiente = abiertoElSiguiente && conLecciones.every(terminada)
  }
  return mundos
}

/** La primera lección disponible que aún no se ha hecho, en el orden del curso: por donde seguir. */
export function siguienteLeccion(estado: readonly EstadoDeMundo[]): string | undefined {
  for (const mundo of estado) {
    for (const unidad of mundo.unidades) {
      const leccion = unidad.lecciones.find((l) => l.acceso === 'disponible')
      if (leccion) return leccion.id
    }
  }
  return undefined
}

/** Estado de una lección concreta, o `undefined` si no está en el curso. */
export function accesoDeLeccion(estado: readonly EstadoDeMundo[], id: string): AccesoDeLeccion | undefined {
  for (const mundo of estado) {
    for (const unidad of mundo.unidades) {
      const leccion = unidad.lecciones.find((l) => l.id === id)
      if (leccion) return leccion.acceso
    }
  }
  return undefined
}
