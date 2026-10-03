interface Props {
  /** Número de pasos. */
  total: number
  /** Paso actual, desde 1. Uno más que `total` pinta todos los tramos como hechos. */
  actual: number
  etiqueta?: string
}

/** Avance por tramos: uno por paso de la lección. */
export function Avance({ total, actual, etiqueta = 'Avance de la lección' }: Props) {
  return (
    <div className="avance" role="progressbar" aria-label={etiqueta} aria-valuemin={1} aria-valuemax={total} aria-valuenow={Math.min(actual, total)} aria-valuetext={actual > total ? 'Completada' : `Paso ${actual} de ${total}`}>
      {Array.from({ length: total }, (_, i) => {
        const estado = i + 1 < actual ? ' avance__tramo--hecho' : i + 1 === actual ? ' avance__tramo--actual' : ''
        return <span key={i} className={`avance__tramo${estado}`} />
      })}
    </div>
  )
}
