import type { ReactNode } from 'react'
import { useAjustes } from '../app/ajustes.ts'
import { useVentanas } from '../app/ventanas.ts'
import type { NodoEnLinea, Prosa } from '../contenido/tipos.ts'
import { type Nomenclatura, cifradoVisible, nombreDeIntervalo, nombreVisible } from '../musica/notas.ts'
import { tonalidadVisible } from '../musica/tonalidad.ts'

function enLinea(nodos: readonly NodoEnLinea[], nomenclatura: Nomenclatura, abrirGlosario: (id: string) => void): ReactNode[] {
  return nodos.map((nodo, i) => {
    switch (nodo.t) {
      case 'texto':
        return nodo.v
      case 'fuerte':
        return <strong key={i}>{enLinea(nodo.h, nomenclatura, abrirGlosario)}</strong>
      case 'enfasis':
        return <em key={i}>{enLinea(nodo.h, nomenclatura, abrirGlosario)}</em>
      case 'nota':
        return (
          <span key={i} className="musical">
            {nombreVisible(nodo.v, nomenclatura)}
          </span>
        )
      case 'acorde':
        return (
          <span key={i} className="musical">
            {cifradoVisible(nodo.v)}
          </span>
        )
      case 'tonalidad':
        return (
          <span key={i} className="musical">
            {tonalidadVisible(nodo.v, nomenclatura)}
          </span>
        )
      case 'intervalo':
        return (
          <span key={i} className="musical">
            {nombreDeIntervalo(nodo.v)}
          </span>
        )
      case 'grado':
        return (
          <span key={i} className="musical">
            {nodo.v}
          </span>
        )
      case 'glosario':
        return (
          <button key={i} type="button" className="termino" onClick={() => abrirGlosario(nodo.id)}>
            {enLinea(nodo.h, nomenclatura, abrirGlosario)}
          </button>
        )
      case 'salto':
        return <br key={i} />
    }
  })
}

interface Props {
  prosa: Prosa
  className?: string
}

/**
 * Pinta un texto del contenido. Las notas se muestran en la nomenclatura que
 * haya elegido el usuario y los términos del glosario abren su definición.
 */
export function ProsaVista({ prosa, className }: Props) {
  const nomenclatura = useAjustes((a) => a.nomenclatura)
  const abrirGlosario = useVentanas((v) => v.abrirGlosario)
  return (
    <div className={className ? `prosa ${className}` : 'prosa'}>
      {prosa.map((bloque, i) => {
        if (bloque.t === 'p') return <p key={i}>{enLinea(bloque.h, nomenclatura, abrirGlosario)}</p>
        const Lista = bloque.ordenada ? 'ol' : 'ul'
        return (
          <Lista key={i}>
            {bloque.items.map((item, k) => (
              <li key={k}>{enLinea(item, nomenclatura, abrirGlosario)}</li>
            ))}
          </Lista>
        )
      })}
    </div>
  )
}

/**
 * Un texto del contenido en una sola línea, sin párrafos: para opciones de
 * respuesta, rótulos y otros textos cortos.
 */
export function ProsaEnLinea({ prosa }: { prosa: Prosa }) {
  const nomenclatura = useAjustes((a) => a.nomenclatura)
  const abrirGlosario = useVentanas((v) => v.abrirGlosario)
  return (
    <>
      {prosa.map((bloque, i) => (
        <span key={i}>
          {i > 0 && ' '}
          {bloque.t === 'p' ? enLinea(bloque.h, nomenclatura, abrirGlosario) : bloque.items.map((item, k) => <span key={k}>{enLinea(item, nomenclatura, abrirGlosario)} </span>)}
        </span>
      ))}
    </>
  )
}
