import { useEffect, useMemo, useRef } from 'react'
import { useAjustes } from '../../app/ajustes.ts'
import { INSTRUMENTOS, type Instrumento, aliasDePercusion } from '../../musica/instrumentos.ts'
import { cifradoVisible, croma, cromaDeMidi, nombreVisible, notaDeMidi } from '../../musica/notas.ts'
import { type Pieza, type Pista, duracionEnTicks } from '../../musica/pieza.ts'
import { ticksPorCompas, ticksPorTiempo } from '../../musica/tiempo.ts'
import { alteracionesDe, leerTonalidad } from '../../musica/tonalidad.ts'

interface Props {
  pieza: Pieza
  /** Posición del cabezal en ticks. Se consulta en cada fotograma mientras `sonando`. */
  posicion?: () => number
  sonando?: boolean
  /** Identificadores de las pistas silenciadas: se dibujan atenuadas. */
  apagadas?: ReadonlySet<string>
  /** Tramo que se destaca: el hueco de un ejercicio, el compás por el que se pregunta. */
  resaltado?: { t: number; d: number } | undefined
}

/** Orden de las piezas de la batería de arriba abajo: platos, charles, toms, caja y bombo. */
const ORDEN_DE_PERCUSION = [49, 51, 53, 46, 42, 44, 50, 45, 38, 37, 36]

/** Alto de una línea de percusión, en filas de altura, como poco. */
const ALTO_DE_LINEA = 2
/** Alto mínimo de una línea de percusión en px: lo que ocupa su rótulo, para que dos rótulos seguidos no se pisen. */
const ALTO_DE_ROTULO = 15
/** Menos filas que estas y una melodía de dos notas ocuparía toda la ventana. */
const FILAS_MINIMAS = 8
/** Altura que se intenta dar a la vista entera, en px. */
const ALTO_OBJETIVO = 176

function esPercusion(pista: Pista): boolean {
  const instrumento: Instrumento = INSTRUMENTOS[pista.instrumento]
  return Boolean(instrumento.percusion)
}

/**
 * Vista de una pieza como piano roll en miniatura: toda la pieza de un vistazo,
 * sin desplazamiento. El tiempo va de izquierda a derecha; la altura, de abajo
 * arriba; la percusión, en líneas aparte debajo. A la izquierda se rotulan la
 * tónica (o los Do, si la pieza no declara tonalidad) y las piezas de la
 * batería. No se edita: para eso está el piano roll completo.
 */
export function VistaDePieza({ pieza, posicion, sonando = false, apagadas, resaltado }: Props) {
  const cabezal = useRef<HTMLDivElement>(null)
  const nomenclatura = useAjustes((a) => a.nomenclatura)

  const plano = useMemo(() => {
    const total = duracionEnTicks(pieza)
    const afinadas = pieza.pistas.filter((p) => !esPercusion(p))
    const percusiones = pieza.pistas.filter(esPercusion)
    let grave = Number.POSITIVE_INFINITY
    let aguda = Number.NEGATIVE_INFINITY
    for (const pista of afinadas) {
      for (const nota of pista.notas) {
        if (nota.n < grave) grave = nota.n
        if (nota.n > aguda) aguda = nota.n
      }
    }
    const hayAfinadas = grave <= aguda
    if (hayAfinadas) {
      grave -= 1
      aguda += 1
      while (aguda - grave + 1 < FILAS_MINIMAS) {
        aguda += 1
        if (aguda - grave + 1 < FILAS_MINIMAS) grave -= 1
      }
    }
    const filas = hayAfinadas ? aguda - grave + 1 : 0
    const teclas = [...new Set(percusiones.flatMap((p) => p.notas.map((n) => n.n)))].sort((a, b) => ORDEN_DE_PERCUSION.indexOf(a) - ORDEN_DE_PERCUSION.indexOf(b))
    const separacion = hayAfinadas && teclas.length > 0 ? 1 : 0
    const inicioDePercusion = filas + separacion
    // Cuantas más filas, más finas, hasta un límite: la vista entera ronda siempre la misma altura.
    const altoDeFila = Math.max(4, Math.min(12, Math.floor(ALTO_OBJETIVO / Math.max(1, inicioDePercusion + teclas.length * ALTO_DE_LINEA))))
    // Con filas finas, cada línea de percusión ocupa más filas: su rótulo tiene que caber.
    const altoDeLinea = Math.max(ALTO_DE_LINEA, Math.ceil(ALTO_DE_ROTULO / altoDeFila))
    const unidades = inicioDePercusion + teclas.length * altoDeLinea

    // Filas que se rotulan: las de la tónica si hay tonalidad; si no, los Do.
    let cromaRotulada = 0
    let alteraciones: 'sostenidos' | 'bemoles' = 'sostenidos'
    let hayTonica = false
    if (pieza.tonalidad) {
      try {
        const tonalidad = leerTonalidad(pieza.tonalidad)
        cromaRotulada = croma(tonalidad.tonica)
        alteraciones = alteracionesDe(tonalidad)
        hayTonica = true
      } catch {
        hayTonica = false
      }
    }
    const rotuladas: number[] = []
    if (hayAfinadas) {
      for (let nota = grave; nota <= aguda; nota++) if (cromaDeMidi(nota) === cromaRotulada) rotuladas.push(nota)
    }
    return { total, afinadas, percusiones, grave, aguda, filas, teclas, inicioDePercusion, unidades, altoDeFila, altoDeLinea, rotuladas, alteraciones, hayTonica }
  }, [pieza])

  // El cabezal se mueve tocando el estilo directamente: 60 veces por segundo no pasan por React.
  useEffect(() => {
    const elemento = cabezal.current
    if (!elemento) return
    if (!sonando || !posicion) {
      elemento.style.opacity = '0'
      return
    }
    elemento.style.opacity = '1'
    let cuadro = 0
    const mover = (): void => {
      elemento.style.left = `${Math.min(100, (posicion() / plano.total) * 100)}%`
      cuadro = requestAnimationFrame(mover)
    }
    mover()
    return () => cancelAnimationFrame(cuadro)
  }, [sonando, posicion, plano.total])

  const { total, afinadas, percusiones, aguda, filas, teclas, inicioDePercusion, unidades, altoDeFila, altoDeLinea, rotuladas, alteraciones, hayTonica } = plano
  const porTiempo = ticksPorTiempo(pieza.compas)
  const porCompas = ticksPorCompas(pieza.compas)
  const lineas: number[] = []
  for (let t = 0; t <= total; t += porTiempo) lineas.push(t)
  // Entre dos notas seguidas queda un respiro, para que no se lean como una sola.
  const respiro = total / 220
  const nombreDeTecla = (tecla: number): string | undefined => {
    const pista = percusiones.find((p) => p.notas.some((n) => n.n === tecla))
    if (!pista) return undefined
    const alias = aliasDePercusion(pista.instrumento, tecla)
    const instrumento: Instrumento = INSTRUMENTOS[pista.instrumento]
    return alias ? instrumento.percusion?.[alias]?.corto : undefined
  }

  if (filas === 0 && teclas.length === 0 && !resaltado) return <p className="vista-pieza__vacia suave">Esta pieza no tiene notas todavía.</p>

  return (
    <div className="vista-pieza">
      {pieza.acordes && pieza.acordes.length > 0 && (
        <div className="vista-pieza__acordes" aria-hidden="true">
          {pieza.acordes.map((acorde) => (
            <span key={acorde.t} style={{ left: `${(acorde.t / total) * 100}%` }}>
              {cifradoVisible(acorde.simbolo)}
            </span>
          ))}
        </div>
      )}
      <div className="vista-pieza__margen" style={{ height: unidades * altoDeFila }} aria-hidden="true">
        {rotuladas.map((nota) => (
          <span key={nota} className={hayTonica ? 'vista-pieza__nombre vista-pieza__nombre--tonica' : 'vista-pieza__nombre'} style={{ top: (aguda - nota + 0.5) * altoDeFila }}>
            {nombreVisible(notaDeMidi(nota, alteraciones), nomenclatura)}
          </span>
        ))}
        {teclas.map((tecla, i) => (
          <span key={tecla} className="vista-pieza__nombre" style={{ top: (inicioDePercusion + (i + 0.5) * altoDeLinea) * altoDeFila }}>
            {nombreDeTecla(tecla)}
          </span>
        ))}
      </div>
      <div className="vista-pieza__rejilla" style={{ height: unidades * altoDeFila }}>
        <svg viewBox={`0 0 ${total} ${unidades}`} preserveAspectRatio="none" width="100%" height="100%" role="img" aria-label={descripcionDe(pieza)}>
          {rotuladas.map((nota) => (
            <rect key={`fila-${nota}`} className="vista-pieza__tonica" x={0} y={aguda - nota} width={total} height={1} />
          ))}
          {teclas.map((tecla, i) => (
            <rect key={`linea-${tecla}`} className="vista-pieza__linea-percusion" x={0} y={inicioDePercusion + i * altoDeLinea + 0.15} width={total} height={altoDeLinea - 0.3} />
          ))}
          {resaltado && <rect className="vista-pieza__resaltado" x={resaltado.t} y={0} width={resaltado.d} height={unidades} />}
          {lineas.map((t) => (
            <line key={`t-${t}`} className={t % porCompas === 0 ? 'vista-pieza__compas' : 'vista-pieza__tiempo'} x1={t} x2={t} y1={0} y2={unidades} />
          ))}
          {afinadas.map((pista) => (
            <g key={pista.id} className={`vista-pieza__pista${apagadas?.has(pista.id) ? ' vista-pieza__pista--apagada' : ''}`} style={{ fill: `var(--pista-${pista.rol})` }}>
              {pista.notas.map((nota, i) => (
                <rect key={i} x={nota.t + respiro / 2} y={aguda - nota.n} width={Math.max(respiro, nota.d - respiro)} height={1} />
              ))}
            </g>
          ))}
          {percusiones.map((pista) => (
            <g key={pista.id} className={`vista-pieza__pista${apagadas?.has(pista.id) ? ' vista-pieza__pista--apagada' : ''}`} style={{ fill: `var(--pista-${pista.rol})` }}>
              {pista.notas.map((nota, i) => (
                <rect
                  key={i}
                  x={nota.t + respiro / 2}
                  y={inicioDePercusion + teclas.indexOf(nota.n) * altoDeLinea + 0.4}
                  width={Math.max(respiro * 2, Math.min(nota.d, porTiempo / 4) - respiro)}
                  height={altoDeLinea - 0.8}
                />
              ))}
            </g>
          ))}
        </svg>
        <div ref={cabezal} className="vista-pieza__cabezal" aria-hidden="true" />
      </div>
    </div>
  )
}

/** Descripción para lectores de pantalla: qué suena y cuánto dura. */
function descripcionDe(pieza: Pieza): string {
  const pistas = pieza.pistas.map((p) => INSTRUMENTOS[p.instrumento].nombre.toLowerCase())
  const compases = `${pieza.compases} ${pieza.compases === 1 ? 'compás' : 'compases'}`
  return `Ejemplo de ${compases} con ${pistas.join(', ')}.`
}
