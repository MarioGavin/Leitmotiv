import { useEffect, useMemo, useRef } from 'react'
import { useAjustes } from '../../app/ajustes.ts'
import { INSTRUMENTOS, type Instrumento } from '../../musica/instrumentos.ts'
import { cromaDeMidi, nombreVisible, notaDeMidi } from '../../musica/notas.ts'
import type { Pieza, Pista, Rol } from '../../musica/pieza.ts'

interface Props {
  pieza: Pieza
  /** Posición del cabezal en ticks. Se consulta en cada fotograma mientras `sonando`. */
  posicion?: () => number
  sonando?: boolean
  /** Identificadores de las pistas silenciadas: sus notas no se marcan. */
  apagadas?: ReadonlySet<string>
}

/** Las teclas negras, por su croma. */
const NEGRAS = new Set([1, 3, 6, 8, 10])
/** Octavas que se dibujan como poco: con menos, un teclado no parece un teclado. */
const OCTAVAS_MINIMAS = 2
/** Ancho de una tecla blanca y de una negra, y alto de cada una, en unidades del dibujo. */
const BLANCA = 10
const NEGRA = 6
const ALTO = 48
const ALTO_NEGRA = 30

function esPercusion(pista: Pista): boolean {
  const instrumento: Instrumento = INSTRUMENTOS[pista.instrumento]
  return Boolean(instrumento.percusion)
}

interface Tecla {
  nota: number
  negra: boolean
  x: number
  /** Papel de la primera pista que toca esta nota, si alguna la toca. */
  rol: Rol | undefined
}

/**
 * Una pieza vista sobre un teclado: se marcan las teclas que usa y, mientras
 * suena, se encienden las que están sonando, con el color de su pista. Va bien
 * para acordes y escalas, donde importa qué teclas y no cuándo. La percusión
 * no sale.
 */
export function TecladoDePieza({ pieza, posicion, sonando = false, apagadas }: Props) {
  const nomenclatura = useAjustes((a) => a.nomenclatura)
  const caja = useRef<SVGSVGElement>(null)

  const plano = useMemo(() => {
    const afinadas = pieza.pistas.filter((p) => !esPercusion(p))
    const notas = afinadas.flatMap((p) => p.notas.map((n) => n.n))
    if (notas.length === 0) return undefined
    // De un Do a un Si, octavas enteras.
    const desde = Math.floor(Math.min(...notas) / 12) * 12
    let hasta = Math.floor(Math.max(...notas) / 12) * 12 + 11
    while (hasta - desde + 1 < OCTAVAS_MINIMAS * 12) hasta += 12
    const rolDe = new Map<number, Rol>()
    for (const pista of afinadas) for (const n of pista.notas) if (!rolDe.has(n.n)) rolDe.set(n.n, pista.rol)
    const teclas: Tecla[] = []
    let blancas = 0
    for (let nota = desde; nota <= hasta; nota++) {
      const negra = NEGRAS.has(cromaDeMidi(nota))
      // Una negra va a caballo entre la blanca anterior y la siguiente.
      teclas.push({ nota, negra, x: negra ? blancas * BLANCA - NEGRA / 2 : blancas * BLANCA, rol: rolDe.get(nota) })
      if (!negra) blancas++
    }
    return { teclas, ancho: blancas * BLANCA, afinadas }
  }, [pieza])

  // Las teclas que suenan se encienden tocando el dibujo directamente: 60 veces por segundo no pasan por React.
  useEffect(() => {
    const svg = caja.current
    if (!svg || !plano) return
    const porNota = new Map<number, SVGRectElement>()
    for (const rect of svg.querySelectorAll<SVGRectElement>('[data-nota]')) porNota.set(Number(rect.dataset.nota), rect)
    const encendidas = new Set<number>()
    const apagar = (): void => {
      for (const nota of encendidas) {
        const rect = porNota.get(nota)
        rect?.classList.remove('teclado__tecla--suena')
        rect?.style.removeProperty('--_suena')
      }
      encendidas.clear()
    }
    if (!sonando || !posicion) {
      apagar()
      return
    }
    let cuadro = 0
    const mirar = (): void => {
      const t = posicion()
      const ahora = new Map<number, Rol>()
      for (const pista of plano.afinadas) {
        if (apagadas?.has(pista.id)) continue
        for (const n of pista.notas) if (n.t <= t && t < n.t + n.d && !ahora.has(n.n)) ahora.set(n.n, pista.rol)
      }
      for (const nota of [...encendidas]) {
        if (ahora.has(nota)) continue
        porNota.get(nota)?.classList.remove('teclado__tecla--suena')
        encendidas.delete(nota)
      }
      for (const [nota, rol] of ahora) {
        if (encendidas.has(nota)) continue
        const rect = porNota.get(nota)
        rect?.classList.add('teclado__tecla--suena')
        rect?.style.setProperty('--_suena', `var(--pista-${rol})`)
        encendidas.add(nota)
      }
      cuadro = requestAnimationFrame(mirar)
    }
    mirar()
    return () => {
      cancelAnimationFrame(cuadro)
      apagar()
    }
  }, [sonando, posicion, plano, apagadas])

  if (!plano) return <p className="vista-pieza__vacia suave">Esta pieza no tiene notas que se toquen en un teclado.</p>

  const usadas = plano.teclas.filter((t) => t.rol !== undefined).map((t) => nombreVisible(notaDeMidi(t.nota), nomenclatura))
  // Primero las blancas y encima las negras, que las tapan en parte.
  const orden = [...plano.teclas.filter((t) => !t.negra), ...plano.teclas.filter((t) => t.negra)]
  return (
    <div className="teclado">
      <svg ref={caja} viewBox={`-1 -1 ${plano.ancho + 2} ${ALTO + 2}`} width="100%" role="img" aria-label={`Teclado. Notas de la pieza: ${usadas.join(', ')}.`}>
        {orden.map((tecla) => {
          const ancho = tecla.negra ? NEGRA : BLANCA
          const alto = tecla.negra ? ALTO_NEGRA : ALTO
          return (
            <g key={tecla.nota}>
              <rect data-nota={tecla.nota} className={`teclado__tecla teclado__tecla--${tecla.negra ? 'negra' : 'blanca'}`} x={tecla.x} y={0} width={ancho} height={alto} />
              {tecla.rol !== undefined && (
                <rect className="teclado__marca" x={tecla.x + ancho / 2 - 2} y={alto - 7} width={4} height={4} style={{ fill: `var(--pista-${tecla.rol})` }} />
              )}
            </g>
          )
        })}
      </svg>
      <div className="teclado__nombres" aria-hidden="true">
        {plano.teclas
          .filter((t) => cromaDeMidi(t.nota) === 0)
          .map((t) => (
            <span key={t.nota} style={{ left: `${(t.x / plano.ancho) * 100}%` }}>
              {nombreVisible(notaDeMidi(t.nota), nomenclatura)}
            </span>
          ))}
      </div>
    </div>
  )
}
