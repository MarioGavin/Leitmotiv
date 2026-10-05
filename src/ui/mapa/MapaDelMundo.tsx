import { useEffect, useMemo, useRef } from 'react'
import { Icono } from '../Icono.tsx'
import { ANCHO, type EdificioDeNodo, TESELA, pintarMapa, trazarPlano } from './mapa-pixel.ts'
import type { PropsDeMapa } from './nodos.ts'

/** Cada píxel lógico del mapa son 2 px de CSS, como en los marcos. */
const ESCALA = 2
const PASO = TESELA * ESCALA

/** Mapa del mundo en píxeles: un lienzo pintado por código y, encima, un botón por mundo. */
export function MapaDelMundo({ nodos, elegido, alElegir }: PropsDeMapa) {
  const lienzo = useRef<HTMLCanvasElement>(null)
  const plano = useMemo(() => trazarPlano(nodos.length), [nodos.length])

  useEffect(() => {
    const ctx = lienzo.current?.getContext('2d')
    if (!ctx) return
    const edificios: EdificioDeNodo[] = nodos.map((nodo) => (nodo.final ? 'castillo' : nodo.estado === 'abierto' ? 'casa' : 'cartel'))
    pintarMapa(ctx, plano, edificios)
  }, [plano, nodos])

  return (
    <div className="mapa-mundo">
      <div className="mapa-mundo__plano" style={{ width: ANCHO * PASO, height: plano.alto * PASO }}>
        <canvas ref={lienzo} className="mapa-mundo__lienzo" width={ANCHO * TESELA} height={plano.alto * TESELA} aria-hidden="true" />
        <ol className="mapa-mundo__nodos">
          {nodos.map((nodo, i) => {
            const lugar = plano.nodos[i]
            if (!lugar) return null
            const marcado = nodo.id === elegido
            const clases = ['nodo-pixel', `nodo-pixel--${nodo.estado}`, lugar.x < ANCHO / 2 ? 'nodo-pixel--derecha' : 'nodo-pixel--izquierda']
            return (
              <li key={nodo.id} className={clases.join(' ')} style={{ left: lugar.x * PASO + PASO / 2, top: lugar.y * PASO + PASO / 2 }}>
                <button type="button" className="nodo-pixel__boton" aria-pressed={marcado} data-nodo={nodo.id} onClick={() => alElegir(nodo.id)}>
                  <span className="nodo-pixel__insignia" aria-hidden="true">
                    {nodo.numero}
                  </span>
                  <span className="nodo-pixel__nombre">
                    <span className="solo-lectores">{nodo.final ? '' : `Mundo ${nodo.numero}: `}</span>
                    {nodo.titulo}
                    {nodo.estado === 'en-obras' && <span className="solo-lectores"> (en construcción)</span>}
                  </span>
                  {marcado && <Icono nombre="cursor" className="nodo-pixel__cursor" />}
                </button>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
