import type { Ficha } from '../progreso/ficha.ts'
import { Icono } from './Icono.tsx'
import { Marco } from './Marco.tsx'

interface Props {
  ficha: Ficha
  className?: string
}

/**
 * Nivel, experiencia y racha, como la ficha de estado de un menú de RPG. Sobria:
 * cifras y una barra, sin medallas ni avisos. La barra lleva siempre al lado su
 * cifra, que es lo que se lee; el relleno solo la acompaña.
 */
export function FichaDelJugador({ ficha, className }: Props) {
  const { nivel, enNivel, paraElSiguiente } = ficha.nivel
  const { dias, hoy } = ficha.racha
  const lleno = paraElSiguiente > 0 ? Math.min(100, (enNivel / paraElSiguiente) * 100) : 0
  return (
    <Marco como="section" relleno="ajustado" aria-label="Tu progreso" className={className ? `ficha ${className}` : 'ficha'}>
      <p className="ficha__nivel">
        <span className="etiqueta">Nivel</span>
        <span className="ficha__cifra">{nivel}</span>
      </p>
      <div className="ficha__experiencia">
        <span
          className="ficha__barra"
          role="progressbar"
          aria-label={`Experiencia para el nivel ${nivel + 1}`}
          aria-valuemin={0}
          aria-valuemax={paraElSiguiente}
          aria-valuenow={enNivel}
        >
          <span className="ficha__relleno" style={{ width: `${lleno}%` }} />
        </span>
        <span className="dato ficha__xp">
          {enNivel}/{paraElSiguiente} XP
        </span>
      </div>
      <p className={hoy ? 'ficha__racha ficha__racha--hoy' : 'ficha__racha'}>
        <Icono nombre="llama" />
        <span className="etiqueta">Racha</span>
        <span className="dato">
          {dias} {dias === 1 ? 'día' : 'días'}
        </span>
      </p>
    </Marco>
  )
}
