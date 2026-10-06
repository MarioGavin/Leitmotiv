import { useEffect, useRef } from 'react'
import type { PasoRitmo } from '../../contenido/tipos.ts'
import { ticksPorCompas, ticksPorPulso } from '../../musica/tiempo.ts'
import { Icono } from '../Icono.tsx'

type Patron = Pick<PasoRitmo, 'compas' | 'paso' | 'golpes' | 'acentos' | 'duracion'>

interface Props {
  patron: Patron
  /** No enseña dónde van los golpes: el patrón hay que sacarlo de oído. */
  oculto?: boolean
  /**
   * Cómo ha ido cada golpe: su desviación en milisegundos (negativa, adelantado)
   * o `null` si no se ha tocado. Con marcas, la rejilla enseña el resultado.
   */
  marcas?: ReadonlyArray<number | null>
  /** Desviación, en milisegundos, a partir de la cual un acierto se rotula como adelantado o atrasado. */
  holgura?: number
  /** Posición dentro del patrón, en ticks, mientras suena. Se consulta en cada fotograma. */
  posicion?: () => number | undefined
  sonando?: boolean
  /** Rótulo encima de la rejilla. */
  rotulo?: string
}

/**
 * Un patrón rítmico a la vista: una casilla por figura de la rejilla, un
 * compás por fila y los pulsos separados. Los golpes son casillas llenas; los
 * acentos, más grandes.
 */
export function RejillaDeRitmo({ patron, oculto = false, marcas, holgura = 40, posicion, sonando = false, rotulo }: Props) {
  const caja = useRef<HTMLDivElement>(null)
  const porCompas = ticksPorCompas(patron.compas)
  const porPulso = ticksPorPulso(patron.compas)
  const casillasPorCompas = Math.round(porCompas / patron.paso)
  const compases = Math.round(patron.duracion / porCompas)
  const casillasPorPulso = Math.max(1, Math.round(porPulso / patron.paso))

  // La casilla que suena se marca tocando la clase directamente: 60 veces por segundo no pasan por React.
  useEffect(() => {
    const elemento = caja.current
    if (!elemento) return
    const casillas = elemento.querySelectorAll<HTMLElement>('.casilla')
    let anterior = -1
    const marcar = (indice: number): void => {
      if (indice === anterior) return
      casillas[anterior]?.classList.remove('casilla--actual')
      casillas[indice]?.classList.add('casilla--actual')
      anterior = indice
    }
    if (!sonando || !posicion) {
      marcar(-1)
      return
    }
    let cuadro = 0
    const mover = (): void => {
      const t = posicion()
      marcar(t === undefined || t < 0 ? -1 : Math.floor(t / patron.paso))
      cuadro = requestAnimationFrame(mover)
    }
    mover()
    return () => {
      cancelAnimationFrame(cuadro)
      marcar(-1)
    }
  }, [sonando, posicion, patron.paso])

  const golpeEn = new Map(patron.golpes.map((t, i) => [Math.round(t / patron.paso), i]))
  const descripcion = oculto
    ? `Patrón de ${compases} ${compases === 1 ? 'compás' : 'compases'}: tienes que sacarlo de oído.`
    : `Patrón de ${patron.golpes.length} ${patron.golpes.length === 1 ? 'golpe' : 'golpes'} en ${compases} ${compases === 1 ? 'compás' : 'compases'} de ${patron.compas[0]}/${patron.compas[1]}.`

  return (
    <div className="ritmo" ref={caja} role="img" aria-label={rotulo ? `${rotulo}. ${descripcion}` : descripcion}>
      {rotulo !== undefined && <p className="etiqueta">{rotulo}</p>}
      {Array.from({ length: compases }, (_, compas) => (
        <div key={compas} className="ritmo__compas" style={{ gridTemplateColumns: `repeat(${casillasPorCompas}, minmax(0, 1fr))` }}>
          {Array.from({ length: casillasPorCompas }, (_vacio, k) => {
            const indice = compas * casillasPorCompas + k
            const golpe = golpeEn.get(indice)
            const clases = ['casilla']
            if (k % casillasPorPulso === 0) clases.push('casilla--pulso')
            let marca: 'acierto' | 'fallo' | undefined
            let sentido = ''
            if (golpe !== undefined && !oculto) clases.push(patron.acentos[golpe] ? 'casilla--acento' : 'casilla--golpe')
            if (golpe !== undefined && marcas) {
              const desviacion = marcas[golpe]
              marca = desviacion === null || desviacion === undefined ? 'fallo' : 'acierto'
              clases.push(`casilla--${marca}`)
              if (typeof desviacion === 'number' && Math.abs(desviacion) > holgura) sentido = desviacion < 0 ? 'casilla--antes' : 'casilla--despues'
              if (sentido) clases.push(sentido)
            }
            return (
              <span key={k} className={clases.join(' ')}>
                {marca && <Icono nombre={marca} />}
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
}
