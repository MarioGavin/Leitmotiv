import { type CSSProperties, useEffect, useMemo, useRef } from 'react'
import { INSTRUMENTOS, type Instrumento, aliasDePercusion } from '../../musica/instrumentos.ts'
import { NOMBRES_ROL, type Pieza, type Pista, type Rol } from '../../musica/pieza.ts'
import { PPQ, ticksPorCompas, ticksPorPulso } from '../../musica/tiempo.ts'

interface Props {
  pieza: Pieza
  /** Posición del cabezal en ticks. Se consulta en cada fotograma mientras `sonando`. */
  posicion?: () => number
  sonando?: boolean
  /** Identificadores de las pistas silenciadas: sus filas se ven apagadas. */
  apagadas?: ReadonlySet<string>
}

/** Orden de las piezas de la batería de arriba abajo: platos, charles, toms, caja y bombo. */
const ORDEN_DE_PERCUSION = [49, 51, 53, 46, 42, 44, 50, 45, 38, 37, 36]

interface Fila {
  clave: string
  nombre: string
  rol: Rol
  pista: string
  /** Para la percusión, la tecla de la pieza del kit; para lo afinado, todas las notas de la pista. */
  tecla: number | undefined
}

function esPercusion(pista: Pista): boolean {
  const instrumento: Instrumento = INSTRUMENTOS[pista.instrumento]
  return Boolean(instrumento.percusion)
}

/** El paso más largo (negra, corchea o semicorchea) en el que caen todos los golpes. */
function pasoDe(pieza: Pieza): number {
  const inicios = pieza.pistas.flatMap((p) => p.notas.map((n) => n.t))
  for (const paso of [PPQ, PPQ / 2, PPQ / 4]) if (inicios.every((t) => t % paso === 0)) return paso
  return PPQ / 4
}

/**
 * Una pieza como la rejilla de una caja de ritmos: una fila por pieza de la
 * batería y otra por cada pista afinada, una casilla por paso y un compás por
 * bloque. Se ve dónde cae cada golpe, no qué nota es. Mientras suena, la
 * columna del paso actual se marca.
 */
export function RejillaDePasos({ pieza, posicion, sonando = false, apagadas }: Props) {
  const caja = useRef<HTMLDivElement>(null)

  const plano = useMemo(() => {
    const paso = pasoDe(pieza)
    const porCompas = ticksPorCompas(pieza.compas)
    const pasosPorCompas = Math.max(1, Math.round(porCompas / paso))
    const pasosPorPulso = Math.max(1, Math.round(ticksPorPulso(pieza.compas) / paso))
    const filas: Fila[] = []
    for (const pista of pieza.pistas.filter(esPercusion)) {
      const teclas = [...new Set(pista.notas.map((n) => n.n))].sort((a, b) => ORDEN_DE_PERCUSION.indexOf(a) - ORDEN_DE_PERCUSION.indexOf(b))
      for (const tecla of teclas) {
        const alias = aliasDePercusion(pista.instrumento, tecla)
        const instrumento: Instrumento = INSTRUMENTOS[pista.instrumento]
        filas.push({ clave: `${pista.id}-${tecla}`, nombre: (alias ? instrumento.percusion?.[alias]?.corto : undefined) ?? String(tecla), rol: pista.rol, pista: pista.id, tecla })
      }
    }
    for (const pista of pieza.pistas.filter((p) => !esPercusion(p) && p.notas.length > 0)) {
      filas.push({ clave: pista.id, nombre: pista.nombre ?? NOMBRES_ROL[pista.rol], rol: pista.rol, pista: pista.id, tecla: undefined })
    }
    // Qué casillas llevan golpe: por fila, el conjunto de pasos (desde el principio de la pieza).
    const golpes = new Map<string, Set<number>>()
    for (const fila of filas) {
      const pista = pieza.pistas.find((p) => p.id === fila.pista)
      golpes.set(fila.clave, new Set((pista?.notas ?? []).filter((n) => fila.tecla === undefined || n.n === fila.tecla).map((n) => Math.floor(n.t / paso))))
    }
    return { paso, pasosPorCompas, pasosPorPulso, filas, golpes }
  }, [pieza])

  // La columna que suena se marca tocando las clases directamente: 60 veces por segundo no pasan por React.
  useEffect(() => {
    const elemento = caja.current
    if (!elemento) return
    const columnas = new Map<number, HTMLElement[]>()
    for (const casilla of elemento.querySelectorAll<HTMLElement>('[data-paso]')) {
      const indice = Number(casilla.dataset.paso)
      columnas.set(indice, [...(columnas.get(indice) ?? []), casilla])
    }
    let anterior = -1
    const marcar = (indice: number): void => {
      if (indice === anterior) return
      for (const c of columnas.get(anterior) ?? []) c.classList.remove('pasos__casilla--actual')
      for (const c of columnas.get(indice) ?? []) c.classList.add('pasos__casilla--actual')
      anterior = indice
    }
    if (!sonando || !posicion) {
      marcar(-1)
      return
    }
    let cuadro = 0
    const mover = (): void => {
      marcar(Math.floor(posicion() / plano.paso))
      cuadro = requestAnimationFrame(mover)
    }
    mover()
    return () => {
      cancelAnimationFrame(cuadro)
      marcar(-1)
    }
  }, [sonando, posicion, plano])

  if (plano.filas.length === 0) return <p className="vista-pieza__vacia suave">Esta pieza no tiene notas todavía.</p>

  const { pasosPorCompas, pasosPorPulso, filas, golpes } = plano
  const totalDeGolpes = [...golpes.values()].reduce((s, g) => s + g.size, 0)
  return (
    <div
      className="pasos"
      ref={caja}
      role="img"
      aria-label={`Rejilla de pasos de ${pieza.compases} ${pieza.compases === 1 ? 'compás' : 'compases'}: ${filas.map((f) => f.nombre.toLowerCase()).join(', ')}, con ${totalDeGolpes} golpes.`}
    >
      {Array.from({ length: pieza.compases }, (_, compas) => (
        <div key={compas} className="pasos__compas" style={{ '--_pasos': pasosPorCompas } as CSSProperties}>
          {filas.map((fila) => (
            <div key={fila.clave} className={`pasos__fila${apagadas?.has(fila.pista) ? ' pasos__fila--apagada' : ''}`} style={{ '--_color': `var(--pista-${fila.rol})` } as CSSProperties}>
              <span className="pasos__nombre" aria-hidden="true">
                {fila.nombre}
              </span>
              {Array.from({ length: pasosPorCompas }, (_vacio, k) => {
                const indice = compas * pasosPorCompas + k
                const clases = ['pasos__casilla']
                if (k % pasosPorPulso === 0) clases.push('pasos__casilla--pulso')
                if (golpes.get(fila.clave)?.has(indice)) clases.push('pasos__casilla--golpe')
                return <span key={k} data-paso={indice} className={clases.join(' ')} />
              })}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
