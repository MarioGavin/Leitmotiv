import type { IndiceDelCurso } from '../../contenido/tipos.ts'

/** Un punto del mapa del curso: un mundo o el proyecto final. */
export interface NodoDelCurso {
  /** «m00»… o «final». */
  id: string
  /** Lo que se lee en la insignia: «0»… «10» o «F». */
  numero: string
  titulo: string
  lema: string
  /** `abierto`: tiene lecciones y se puede entrar. `en-obras`: todavía sin contenido. */
  estado: 'abierto' | 'en-obras'
  final: boolean
  unidades: number
  lecciones: number
}

export interface PropsDeMapa {
  nodos: readonly NodoDelCurso[]
  /** Identificador del nodo elegido. */
  elegido: string
  alElegir: (id: string) => void
}

/** Los nodos del mapa: un mundo por nodo y, al final del camino, el proyecto final. */
export function nodosDelCurso(indice: IndiceDelCurso): NodoDelCurso[] {
  const mundos: NodoDelCurso[] = indice.mundos.map((mundo) => {
    const lecciones = mundo.unidades.reduce((suma, unidad) => suma + unidad.lecciones.length, 0)
    return {
      id: mundo.id,
      numero: String(Number(mundo.id.slice(1))),
      titulo: mundo.titulo,
      lema: mundo.lema,
      estado: lecciones > 0 ? 'abierto' : 'en-obras',
      final: false,
      unidades: mundo.unidades.length,
      lecciones,
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
    },
  ]
}
