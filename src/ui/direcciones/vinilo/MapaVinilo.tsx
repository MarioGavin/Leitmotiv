import type { PropsDeMapa } from '../../mapa/nodos.ts'

/** Separación vertical entre estaciones, en px. */
const PASO = 92
const ARRIBA = 64
/** Las dos columnas por las que baja la línea. */
const COLUMNAS = [44, 84] as const

/** En qué columna cae cada estación: la línea cambia de carril cada tres paradas. */
function columnaDe(indice: number): number {
  return COLUMNAS[Math.floor(indice / 3) % 2] as number
}

/**
 * Mapa del curso como el plano de una línea de metro: una estación por mundo,
 * el número grande como en un andén y el nombre a su derecha.
 */
export function MapaVinilo({ nodos, elegido, alElegir }: PropsDeMapa) {
  const alto = ARRIBA + (nodos.length - 1) * PASO + 96
  const puntos = nodos.map((_, i) => ({ x: columnaDe(i), y: ARRIBA + i * PASO }))
  // El tramo recorrido llega hasta el último mundo abierto.
  const ultimoAbierto = nodos.reduce((ultimo, nodo, i) => (nodo.estado === 'abierto' ? i : ultimo), 0)

  const trazo = (hasta: number): string =>
    puntos
      .slice(0, hasta + 1)
      .map((p, i) => {
        if (i === 0) return `M${p.x} ${p.y}`
        const anterior = puntos[i - 1] as { x: number; y: number }
        if (anterior.x === p.x) return `L${p.x} ${p.y}`
        // Cambio de carril: baja recto, cruza en diagonal a 45° y sigue recto.
        const salto = Math.abs(p.x - anterior.x)
        const medio = (anterior.y + p.y) / 2
        return `L${anterior.x} ${medio - salto / 2}L${p.x} ${medio + salto / 2}L${p.x} ${p.y}`
      })
      .join('')

  return (
    <div className="mapa-vinilo" style={{ height: alto }}>
      <svg className="mapa-vinilo__linea" width="140" height={alto} viewBox={`0 0 140 ${alto}`} aria-hidden="true">
        <path className="mapa-vinilo__via" d={trazo(puntos.length - 1)} />
        <path className="mapa-vinilo__recorrido" d={`${trazo(ultimoAbierto)}v24`} />
      </svg>
      <ol className="mapa-vinilo__estaciones">
        {nodos.map((nodo, i) => {
          const punto = puntos[i] as { x: number; y: number }
          const marcado = nodo.id === elegido
          return (
            <li key={nodo.id} className={`estacion estacion--${nodo.estado}`} style={{ top: punto.y }}>
              <button type="button" className="estacion__boton" aria-pressed={marcado} data-nodo={nodo.id} style={{ paddingLeft: punto.x - 18 }} onClick={() => alElegir(nodo.id)}>
                <span className="estacion__punto" aria-hidden="true" />
                <span className="estacion__numero" aria-hidden="true">
                  {nodo.final ? 'F' : nodo.numero.padStart(2, '0')}
                </span>
                <span className="estacion__nombre">
                  <span className="solo-lectores">{nodo.final ? '' : `Mundo ${nodo.numero}: `}</span>
                  {nodo.titulo}
                  {nodo.estado === 'en-obras' && <span className="solo-lectores"> (en construcción)</span>}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
