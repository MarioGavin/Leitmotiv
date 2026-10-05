import { LADO, trazadoDeIcono } from './iconos/dibujos.ts'
import type { NombreDeIcono } from './iconos/nombres.ts'

interface Props {
  nombre: NombreDeIcono
  /** Lado en píxeles. Conviene un múltiplo de 12, para que cada píxel del dibujo sea entero. */
  lado?: number
  /** Texto para lectores de pantalla. Sin él, el icono es decorativo. */
  titulo?: string
  className?: string
}

/** Icono propio, de mapa de bits. Toma el color del texto. */
export function Icono({ nombre, lado, titulo, className }: Props) {
  const clase = className ? `icono ${className}` : 'icono'
  const estilo = lado === undefined ? undefined : { width: lado, height: lado }
  const accesible = titulo === undefined ? ({ 'aria-hidden': true } as const) : ({ role: 'img', 'aria-label': titulo } as const)
  return (
    <svg className={clase} style={estilo} viewBox={`0 0 ${LADO} ${LADO}`} {...accesible}>
      <path d={trazadoDeIcono(nombre)} />
    </svg>
  )
}
