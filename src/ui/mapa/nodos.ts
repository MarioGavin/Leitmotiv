import type { IndiceDelCurso } from '../../contenido/tipos.ts'
import type { Acceso, EstadoDeMundo } from '../../progreso/desbloqueo.ts'

/** Un punto del mapa del curso: un mundo o el proyecto final. */
export interface NodoDelCurso {
  /** «m00»… o «final». */
  id: string
  /** Lo que se lee en la insignia: «0»… «10» o «F». */
  numero: string
  titulo: string
  lema: string
  /**
   * `abierto`: se puede entrar y queda algo por hacer. `completado`: todo hecho (se puede volver).
   * `bloqueado`: hay que terminar antes el mundo anterior. `en-obras`: todavía sin contenido.
   */
  estado: EstadoDeNodo
  final: boolean
  unidades: number
  lecciones: number
  /** Lecciones completadas. */
  hechas: number
}

export type EstadoDeNodo = 'abierto' | 'completado' | 'bloqueado' | 'en-obras'

const ESTADO_DE_NODO: Readonly<Record<Acceso, EstadoDeNodo>> = { disponible: 'abierto', completado: 'completado', bloqueado: 'bloqueado', 'en-obras': 'en-obras' }

/** ¿Se puede entrar en el mundo? */
export function sePuedeEntrar(nodo: NodoDelCurso): boolean {
  return nodo.estado === 'abierto' || nodo.estado === 'completado'
}

export interface PropsDeMapa {
  nodos: readonly NodoDelCurso[]
  /** Identificador del nodo elegido. */
  elegido: string
  alElegir: (id: string) => void
}

/**
 * Los nodos del mapa: un mundo por nodo y, al final del camino, el proyecto final.
 *
 * @param estado Lo abierto y lo hecho (`estadoDelCurso`). Sin él, todo mundo con lecciones está abierto.
 */
export function nodosDelCurso(indice: IndiceDelCurso, estado?: readonly EstadoDeMundo[]): NodoDelCurso[] {
  const mundos: NodoDelCurso[] = indice.mundos.map((mundo) => {
    const lecciones = mundo.unidades.reduce((suma, unidad) => suma + unidad.lecciones.length, 0)
    const delMundo = estado?.find((e) => e.id === mundo.id)
    return {
      id: mundo.id,
      numero: String(Number(mundo.id.slice(1))),
      titulo: mundo.titulo,
      lema: mundo.lema,
      estado: delMundo ? ESTADO_DE_NODO[delMundo.acceso] : lecciones > 0 ? 'abierto' : 'en-obras',
      final: false,
      unidades: mundo.unidades.length,
      lecciones,
      hechas: delMundo?.hechas ?? 0,
    }
  })
  return [
    ...mundos,
    {
      id: 'final',
      numero: 'F',
      titulo: 'Proyecto final',
      lema: 'La banda sonora completa de un juego pequeño.',
      estado: 'en-obras',
      final: true,
      unidades: 0,
      lecciones: 0,
      hechas: 0,
    },
  ]
}
