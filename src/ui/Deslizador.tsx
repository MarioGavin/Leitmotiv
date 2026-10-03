import { type ReactNode, useId } from 'react'

interface Props {
  etiqueta: ReactNode
  valor: number
  min: number
  max: number
  paso?: number
  /** Texto del valor («84 BPM»). */
  lectura: string
  alCambiar: (valor: number) => void
}

export function Deslizador({ etiqueta, valor, min, max, paso = 1, lectura, alCambiar }: Props) {
  const id = useId()
  return (
    <div className="deslizador">
      <label className="etiqueta" htmlFor={id}>
        {etiqueta}
      </label>
      <input id={id} type="range" min={min} max={max} step={paso} value={valor} aria-valuetext={lectura} onChange={(e) => alCambiar(Number(e.currentTarget.value))} />
      <output className="deslizador__valor" htmlFor={id}>
        {lectura}
      </output>
    </div>
  )
}
