/**
 * Un texto del contenido pasado a texto plano, con las notas en la
 * nomenclatura elegida: para buscar en él y para mostrarlo donde no caben
 * botones (dentro de un enlace, por ejemplo).
 */
import type { NodoEnLinea, Prosa } from '../contenido/tipos.ts'
import { type Nomenclatura, cifradoVisible, nombreDeIntervalo, nombreVisible } from '../musica/notas.ts'
import { tonalidadVisible } from '../musica/tonalidad.ts'

function enLinea(nodos: readonly NodoEnLinea[], nomenclatura: Nomenclatura): string {
  return nodos
    .map((nodo) => {
      switch (nodo.t) {
        case 'texto':
          return nodo.v
        case 'fuerte':
        case 'enfasis':
        case 'glosario':
          return enLinea(nodo.h, nomenclatura)
        case 'nota':
          return nombreVisible(nodo.v, nomenclatura)
        case 'acorde':
          return cifradoVisible(nodo.v)
        case 'tonalidad':
          return tonalidadVisible(nodo.v, nomenclatura)
        case 'intervalo':
          return nombreDeIntervalo(nodo.v)
        case 'grado':
          return nodo.v
        case 'salto':
          return ' '
      }
    })
    .join('')
}

export function textoDeProsa(prosa: Prosa, nomenclatura: Nomenclatura): string {
  return prosa
    .map((bloque) => (bloque.t === 'p' ? enLinea(bloque.h, nomenclatura) : bloque.items.map((item) => enLinea(item, nomenclatura)).join('; ')))
    .join(' ')
}

/** Texto en minúsculas y sin tildes, para comparar al buscar: «compás» y «COMPAS» se encuentran igual. */
export function paraBuscar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}
