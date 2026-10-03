import type { ReactNode } from 'react'
import { sonar } from '../audio/audio.ts'
import { Marco } from './Marco.tsx'

interface Props<T extends string> {
  etiqueta: string
  opciones: ReadonlyArray<{ valor: T; texto: ReactNode }>
  valor: T
  alCambiar: (valor: T) => void
}

/** Elige una entre pocas opciones que caben en una fila. */
export function Conmutador<T extends string>({ etiqueta, opciones, valor, alCambiar }: Props<T>) {
  return (
    <Marco relleno="ninguno" plano role="group" aria-label={etiqueta}>
      <div className="conmutador">
        {opciones.map((opcion) => (
          <button
            key={opcion.valor}
            type="button"
            className="conmutador__opcion"
            aria-pressed={opcion.valor === valor}
            onClick={() => {
              if (opcion.valor === valor) return
              sonar('cursor')
              alCambiar(opcion.valor)
            }}
          >
            {opcion.texto}
          </button>
        ))}
      </div>
    </Marco>
  )
}
