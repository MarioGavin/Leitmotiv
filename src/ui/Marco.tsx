import type { HTMLAttributes, ReactNode } from 'react'

type Etiqueta = 'div' | 'section' | 'article' | 'aside' | 'ul' | 'ol' | 'form'

interface Props extends HTMLAttributes<HTMLElement> {
  /** Elemento HTML que se pinta. Por defecto, `div`. */
  como?: Etiqueta
  /** `hundido` es el fondo rebajado de las superficies donde se trabaja (rejillas, ejemplos). */
  variante?: 'normal' | 'hundido'
  relleno?: 'normal' | 'ajustado' | 'ninguno'
  /** Sin sombra: para un marco dentro de otro. */
  plano?: boolean
  /** Rótulo sobre el borde superior, como la etiqueta con el nombre de quien habla. */
  rotulo?: ReactNode
}

/** Panel con marco: la ventana de los menús de un RPG. Es el contenedor básico de la interfaz. */
export function Marco({ como = 'div', variante = 'normal', relleno = 'normal', plano = false, rotulo, className, children, ...resto }: Props) {
  const clases = ['marco']
  if (variante === 'hundido') clases.push('marco--hundido')
  if (relleno === 'ajustado') clases.push('marco--ajustado')
  if (relleno === 'ninguno') clases.push('marco--sin-relleno')
  if (plano) clases.push('marco--plano')
  if (rotulo !== undefined) clases.push('marco--rotulado')
  if (className) clases.push(className)
  const Elemento = como
  return (
    <Elemento className={clases.join(' ')} {...resto}>
      {rotulo !== undefined && <span className="marco__rotulo">{rotulo}</span>}
      {children}
    </Elemento>
  )
}
