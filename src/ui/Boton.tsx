import type { ButtonHTMLAttributes, MouseEvent } from 'react'
import { sonar } from '../audio/audio.ts'
import type { SonidoDeInterfaz } from '../audio/sonidos.ts'
import { Icono } from './Icono.tsx'
import type { NombreDeIcono } from './iconos/nombres.ts'

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  variante?: 'primario' | 'secundario' | 'fantasma'
  /** Ocupa todo el ancho disponible. */
  bloque?: boolean
  icono?: NombreDeIcono
  /** Botón cuadrado con solo el icono. Exige `aria-label`. */
  soloIcono?: boolean
  /** Sonido al pulsar. `null` para que no suene (por ejemplo, si la acción ya produce música). */
  sonido?: SonidoDeInterfaz | null
}

export function Boton({ variante = 'secundario', bloque = false, icono, soloIcono = false, sonido = 'aceptar', className, children, onClick, ...resto }: Props) {
  const clases = ['boton']
  if (variante !== 'secundario') clases.push(`boton--${variante}`)
  if (bloque) clases.push('boton--bloque')
  if (soloIcono) clases.push('boton--icono')
  if (className) clases.push(className)
  const alPulsar = (evento: MouseEvent<HTMLButtonElement>): void => {
    if (sonido) sonar(sonido)
    onClick?.(evento)
  }
  return (
    <button type="button" className={clases.join(' ')} onClick={alPulsar} {...resto}>
      {icono && <Icono nombre={icono} />}
      {!soloIcono && children}
    </button>
  )
}
