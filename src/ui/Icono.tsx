import { useAjustes } from '../app/ajustes.ts'
import { LADO, trazadoDeIcono } from './direcciones/cartucho/iconos.ts'
import { FORMAS } from './direcciones/vinilo/iconos.tsx'
import type { NombreDeIcono } from './iconos/nombres.ts'

interface Props {
  nombre: NombreDeIcono
  /** Lado en píxeles. En «Cartucho» conviene un múltiplo de 12. */
  lado?: number
  /** Texto para lectores de pantalla. Sin él, el icono es decorativo. */
  titulo?: string
  className?: string
}

/** Icono propio de la dirección visual activa. Toma el color del texto. */
export function Icono({ nombre, lado, titulo, className }: Props) {
  const direccion = useAjustes((a) => a.direccion)
  const clase = className ? `icono ${className}` : 'icono'
  const estilo = lado === undefined ? undefined : { width: lado, height: lado }
  const accesible = titulo === undefined ? ({ 'aria-hidden': true } as const) : ({ role: 'img', 'aria-label': titulo } as const)
  if (direccion === 'cartucho') {
    return (
      <svg className={clase} style={estilo} viewBox={`0 0 ${LADO} ${LADO}`} {...accesible}>
        <path d={trazadoDeIcono(nombre)} />
      </svg>
    )
  }
  return (
    <svg className={clase} style={estilo} viewBox="0 0 24 24" {...accesible}>
      {FORMAS[nombre]}
    </svg>
  )
}
