import { type KeyboardEvent, type PointerEvent, type ReactNode, useRef } from 'react'

interface Props {
  /** Si los toques cuentan ahora mismo. */
  activo: boolean
  /** Se llama con la hora del toque (`event.timeStamp`). */
  alTocar: (marca: number) => void
  children: ReactNode
}

/**
 * El botón grande con el que se marca el ritmo. Cuenta el instante en que el
 * dedo toca la pantalla (no el de levantarlo) y admite también la barra
 * espaciadora y la tecla Intro.
 */
export function PadDeToques({ activo, alTocar, children }: Props) {
  const boton = useRef<HTMLButtonElement>(null)

  const golpe = (marca: number): void => {
    if (!activo) return
    alTocar(marca)
    // El destello se dispara tocando la clase directamente: un toque no puede esperar a que React vuelva a pintar.
    const elemento = boton.current
    if (!elemento) return
    elemento.classList.remove('pad--golpe')
    // Leer una medida obliga al navegador a reiniciar la animación.
    void elemento.offsetWidth
    elemento.classList.add('pad--golpe')
  }

  const alPulsar = (evento: PointerEvent<HTMLButtonElement>): void => {
    // Sin esto, mantener el dedo abre el menú contextual o selecciona el texto.
    evento.preventDefault()
    golpe(evento.timeStamp)
  }

  const alTeclear = (evento: KeyboardEvent<HTMLButtonElement>): void => {
    if (evento.key !== ' ' && evento.key !== 'Enter') return
    evento.preventDefault()
    if (!evento.repeat) golpe(evento.timeStamp)
  }

  return (
    <button ref={boton} type="button" className="pad" aria-disabled={!activo || undefined} onPointerDown={alPulsar} onKeyDown={alTeclear} onContextMenu={(e) => e.preventDefault()}>
      {children}
    </button>
  )
}
