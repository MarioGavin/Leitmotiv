/**
 * La entrada de una pantalla, con Motion. Este módulo (y Motion con él) se
 * descarga aparte, cuando la app está ociosa: no entra en la carga inicial.
 */
import type { ReactNode } from 'react'
import { LazyMotion, domAnimation, m, useReducedMotion } from 'motion/react'

/** Lo mismo que `--dur` y `--curva` en base.css: 160 ms, con arranque rápido y frenada suave. */
const TRANSICION = { duration: 0.16, ease: [0.2, 0.9, 0.3, 1] } as const

/** Un solo movimiento por pantalla: aparece y sube 6 px. Con «reducir movimiento», aparece sin más. */
export function Entrada({ children }: { children: ReactNode }) {
  const quieta = useReducedMotion() === true
  return (
    <LazyMotion features={domAnimation} strict>
      <m.div className="entrada" initial={quieta ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={TRANSICION}>
        {children}
      </m.div>
    </LazyMotion>
  )
}
