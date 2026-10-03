import type { ReactNode } from 'react'

interface Props {
  titulo?: string
  /** Lo que va a la izquierda del título: normalmente, el botón de volver o cerrar. */
  antes?: ReactNode
  /** Lo que va a la derecha: datos o acciones. */
  despues?: ReactNode
  /** Contenido en lugar del título (por ejemplo, el avance de la lección). */
  children?: ReactNode
}

/** Cabecera de pantalla. Se queda fija arriba al desplazar. */
export function Cabecera({ titulo, antes, despues, children }: Props) {
  return (
    <header className="cabecera">
      {antes}
      {titulo !== undefined && <h1 className="cabecera__titulo">{titulo}</h1>}
      {children}
      {despues}
    </header>
  )
}
