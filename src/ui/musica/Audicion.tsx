import type { Pieza } from '../../musica/pieza.ts'
import { Marco } from '../Marco.tsx'
import { AvisoDeSonido, BotonDeEscucha } from './EjemploSonoro.tsx'
import { VistaDePieza } from './VistaDePieza.tsx'
import { useReproductor } from './useReproductor.ts'

interface Props {
  pieza: Pieza
  /** Tramo que se destaca en la vista. */
  resaltado?: { t: number; d: number } | undefined
  /** Fuerza o impide la repetición, sin mirar `pieza.bucle`. */
  bucle?: boolean
}

/**
 * Una pieza a la vista con su botón de escuchar: lo que acompaña a las
 * preguntas de los ejercicios. Si la pieza cambia sin dejar de ser la misma
 * (se elige otra opción para el hueco), sigue sonando con el cambio hecho.
 */
export function Audicion({ pieza, resaltado, bucle }: Props) {
  const reproduccion = useReproductor(pieza, bucle === undefined ? {} : { bucle })
  return (
    <div className="pila pila--junta">
      <Marco variante="hundido" relleno="ninguno" plano>
        <VistaDePieza pieza={pieza} posicion={reproduccion.posicion} sonando={reproduccion.estado === 'sonando'} resaltado={resaltado} />
      </Marco>
      <BotonDeEscucha reproduccion={reproduccion} className="escucha" icono="escuchar" />
      <AvisoDeSonido reproduccion={reproduccion} />
    </div>
  )
}
