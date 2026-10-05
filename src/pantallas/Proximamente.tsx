import type { ReactNode } from 'react'
import { Cabecera } from '../ui/Cabecera.tsx'
import { Marco } from '../ui/Marco.tsx'

interface Props {
  titulo: string
  /** Qué habrá en esta sección cuando esté construida. */
  descripcion: string
  /** Lo que ya se puede probar de esta sección, si hay algo. */
  children?: ReactNode
}

/** Sección que todavía no está construida. Dice qué habrá y cuándo llega, sin fingir que funciona. */
export function Proximamente({ titulo, descripcion, children }: Props) {
  return (
    <main className="pantalla">
      <Cabecera titulo={titulo} />
      <div className="pantalla__cuerpo pila pila--amplia">
        <Marco rotulo="En construcción">
          <div className="pila">
            <p>{descripcion}</p>
            <p className="suave">Esta sección se construye en el Tramo B de la Fase 1.</p>
          </div>
        </Marco>
        {children}
      </div>
    </main>
  )
}
