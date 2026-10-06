import { type ReactNode, useEffect, useId, useRef } from 'react'
import { Boton } from './Boton.tsx'
import { Marco } from './Marco.tsx'

interface Props {
  abierta: boolean
  alCerrar: () => void
  /** Rótulo del marco: de qué va la ventana. */
  rotulo: string
  /** Título, si hace falta además del rótulo. */
  titulo?: string
  /** Texto del botón de cerrar. */
  cerrar?: string
  children: ReactNode
}

/**
 * Ventana que sube desde abajo sobre la pantalla actual: opciones, una
 * definición, una confirmación. Se cierra con su botón, con Escape o tocando
 * fuera.
 */
export function Ventana({ abierta, alCerrar, rotulo, titulo, cerrar = 'Cerrar', children }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const idDeTitulo = useId()

  useEffect(() => {
    const elemento = dialogo.current
    if (!elemento) return
    if (abierta && !elemento.open) elemento.showModal()
    if (!abierta && elemento.open) elemento.close()
  }, [abierta])

  return (
    // El toque en el telón es un atajo para cerrar; con teclado, <dialog> ya se cierra con Escape y hay un botón.
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={dialogo}
      className="ventana"
      aria-labelledby={idDeTitulo}
      onClose={alCerrar}
      onClick={(evento) => {
        if (evento.target === dialogo.current) alCerrar()
      }}
    >
      {abierta && (
        <Marco rotulo={rotulo} className="ventana__marco">
          <div className="pila">
            <h2 className={titulo === undefined ? 'solo-lectores' : 'subtitulo'} id={idDeTitulo}>
              {titulo ?? rotulo}
            </h2>
            {children}
            <Boton bloque sonido="atras" onClick={alCerrar}>
              {cerrar}
            </Boton>
          </div>
        </Marco>
      )}
    </dialog>
  )
}
