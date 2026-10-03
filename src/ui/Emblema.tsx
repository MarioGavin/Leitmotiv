/**
 * El emblema de Leitmotiv: las cuatro notas del motivo (La, Mi, Si, Mi) como
 * se ven en un piano roll. Es el mismo motivo que suena en la interfaz.
 */

/** Altura de cada nota sobre la primera, en semitonos. */
const ALTURAS = [0, 7, 2, 7] as const

interface Props {
  /** Ancho en píxeles; el alto guarda la proporción 3:2. */
  ancho?: number
  titulo?: string
}

export function Emblema({ ancho = 96, titulo }: Props) {
  const accesible = titulo === undefined ? ({ 'aria-hidden': true } as const) : ({ role: 'img', 'aria-label': titulo } as const)
  return (
    <svg className="emblema" width={ancho} height={(ancho * 2) / 3} viewBox="0 0 48 32" shapeRendering="crispEdges" {...accesible}>
      {ALTURAS.map((altura, i) => (
        <rect key={i} className="emblema__nota" x={2 + i * 11} y={23 - altura * 3} width={11} height={6} />
      ))}
    </svg>
  )
}
