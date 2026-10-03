import type { ReactNode } from 'react'
import { Marco } from './Marco.tsx'

interface Props {
  /** Qué clase de mensaje es: cambia el color del rótulo. */
  tipo: 'pista' | 'acierto' | 'fallo' | 'neutro'
  /** Quién «habla»: «Pista», «Correcto», «Casi»… */
  rotulo: string
  children: ReactNode
}

/**
 * Caja de texto de la parte baja de la pantalla, como la de los diálogos de un
 * RPG. Da las pistas y explica los aciertos y los fallos.
 */
export function Dialogo({ tipo, rotulo, children }: Props) {
  return (
    <Marco className={`dialogo dialogo--${tipo}`} rotulo={rotulo} role="status">
      <div className="dialogo__texto">{children}</div>
    </Marco>
  )
}
