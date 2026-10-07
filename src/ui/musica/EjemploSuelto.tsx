import type { Manipulable } from '../../contenido/tipos.ts'
import type { Pieza } from '../../musica/pieza.ts'
import { BotonDeEscucha, EjemploSonoro } from './EjemploSonoro.tsx'
import { useReproductor } from './useReproductor.ts'

interface Props {
  pieza: Pieza
  manipulable?: readonly Manipulable[]
}

/**
 * Un ejemplo sonoro con su propio botón de escuchar debajo: para los sitios
 * donde no hay un pie con acciones (una ficha, la definición de un término).
 */
export function EjemploSuelto({ pieza, manipulable = ['tempo'] }: Props) {
  const reproduccion = useReproductor(pieza)
  return (
    <div className="pila pila--junta">
      <EjemploSonoro pieza={pieza} reproduccion={reproduccion} manipulable={manipulable} />
      <BotonDeEscucha reproduccion={reproduccion} />
    </div>
  )
}
