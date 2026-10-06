import { useEffect, useMemo, useRef, useState } from 'react'
import { ErrorDePentagrama, piezaAAbc } from '../../musica/abc.ts'
import type { Pieza } from '../../musica/pieza.ts'
import { ticksPorCompas } from '../../musica/tiempo.ts'

interface Props {
  pieza: Pieza
  /** Pistas que se escriben, por su `id`. Por defecto, todas. */
  pistas?: readonly string[]
}

/** Más notas que estas en un compás y ya no caben dos compases por línea en un móvil. */
const NOTAS_PARA_UN_COMPAS_POR_LINEA = 8

/** Cuántos compases caben por línea: depende del ancho y de lo cargado que vaya el compás más denso. */
function compasesPorLinea(pieza: Pieza, ancho: number): number {
  const porCompas = ticksPorCompas(pieza.compas)
  let masDenso = 0
  for (let c = 0; c < pieza.compases; c++) {
    const inicios = new Set<number>()
    for (const pista of pieza.pistas) for (const n of pista.notas) if (n.t >= c * porCompas && n.t < (c + 1) * porCompas) inicios.add(n.t)
    masDenso = Math.max(masDenso, inicios.size)
  }
  const porAncho = Math.max(1, Math.floor(ancho / (masDenso > NOTAS_PARA_UN_COMPAS_POR_LINEA ? 300 : 170)))
  return Math.min(4, porAncho)
}

/**
 * Una pieza escrita en pentagrama. Es una vista de lectura: la música se
 * escribe en el piano roll. La librería que la dibuja (abcjs) se descarga la
 * primera vez que se abre una.
 */
export function Pentagrama({ pieza, pistas }: Props) {
  const caja = useRef<HTMLDivElement>(null)
  const [ancho, setAncho] = useState(0)
  const [fallo, setFallo] = useState<string>()

  useEffect(() => {
    const elemento = caja.current
    if (!elemento) return
    const medir = (): void => setAncho(Math.floor(elemento.clientWidth))
    medir()
    const observador = new ResizeObserver(medir)
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [])

  const escrita = useMemo((): { abc: string } | { error: string } | undefined => {
    if (ancho === 0) return undefined
    try {
      return { abc: piezaAAbc(pieza, { compasesPorLinea: compasesPorLinea(pieza, ancho), ...(pistas ? { pistas } : {}) }) }
    } catch (error) {
      if (error instanceof ErrorDePentagrama) return { error: error.message }
      throw error
    }
  }, [pieza, pistas, ancho])

  useEffect(() => {
    const elemento = caja.current
    if (!elemento || !escrita || 'error' in escrita) return
    let vigente = true
    import('abcjs')
      .then((modulo) => {
        if (!vigente) return
        const abcjs = 'default' in modulo ? modulo.default : modulo
        abcjs.renderAbc(elemento, escrita.abc, {
          add_classes: true,
          staffwidth: Math.max(160, ancho - 24),
          paddingleft: 8,
          paddingright: 8,
          paddingtop: 8,
          paddingbottom: 8,
          // Sin esto, abcjs fija el ancho del dibujo a 740 px y en el móvil se saldría de la pantalla.
          responsive: 'resize',
        })
        setFallo(undefined)
      })
      .catch(() => {
        if (vigente) setFallo(navigator.onLine ? 'No se ha podido dibujar el pentagrama.' : 'Hace falta conexión la primera vez que se abre un pentagrama.')
      })
    return () => {
      vigente = false
    }
  }, [escrita, ancho])

  const mensaje = escrita && 'error' in escrita ? `${escrita.error} Mírala en el piano roll.` : fallo
  return (
    <div className="pentagrama">
      <div ref={caja} className="pentagrama__dibujo" role="img" aria-label="La pieza escrita en pentagrama" hidden={mensaje !== undefined} />
      {mensaje !== undefined && (
        <p className="suave nota-al-pie" role="status">
          {mensaje}
        </p>
      )}
    </div>
  )
}
