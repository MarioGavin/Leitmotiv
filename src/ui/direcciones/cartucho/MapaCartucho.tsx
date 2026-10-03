import { useEffect, useMemo, useRef } from 'react'
import { useEsquemaResuelto } from '../../../app/ajustes.ts'
import type { PropsDeMapa } from '../../mapa/nodos.ts'
import { Icono } from '../../Icono.tsx'
import { ANCHO, type EdificioDeNodo, TESELA, pintarMapa, trazarPlano } from './mapa-pixel.ts'

/** Cada píxel lógico del mapa son 2 px de CSS, como en el resto de la dirección. */
const ESCALA = 2
const PASO = TESELA * ESCALA

/** Mapa del mundo en píxeles: un lienzo pintado por código y, encima, un botón por mundo. */
export function MapaCartucho({ nodos, elegido, alElegir }: PropsDeMapa) {
  const lienzo = useRef<HTMLCanvasElement>(null)
  const esquema = useEsquemaResuelto()
  const plano = useMemo(() => trazarPlano(nodos.length), [nodos.length])

  useEffect(() => {
    const ctx = lienzo.current?.getContext('2d')
    if (!ctx) return
    const edificios: EdificioDeNodo[] = nodos.map((nodo) => (nodo.final ? 'castillo' : nodo.estado === 'abierto' ? 'casa' : 'cartel'))
    pintarMapa(ctx, plano, esquema === 'oscuro' ? 'noche' : 'dia', edificios)
  }, [plano, esquema, nodos])

  return (
    <div className="mapa-cartucho">
      <div className="mapa-cartucho__plano" style={{ width: ANCHO * PASO, height: plano.alto * PASO }}>
        <canvas ref={lienzo} className="mapa-cartucho__lienzo" width={ANCHO * TESELA} height={plano.alto * TESELA} aria-hidden="true" />
        <ol className="mapa-cartucho__nodos">
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
