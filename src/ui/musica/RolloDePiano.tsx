import { type MouseEvent, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useAjustes } from '../../app/ajustes.ts'
import { INSTRUMENTOS, type Instrumento, aliasDePercusion } from '../../musica/instrumentos.ts'
import { cifradoVisible, croma, cromaDeMidi, nombreVisible, notaDeMidi } from '../../musica/notas.ts'
import { type Nota, type Pieza, type Pista, duracionEnTicks } from '../../musica/pieza.ts'
import { ticksPorCompas, ticksPorTiempo } from '../../musica/tiempo.ts'
import { type Tonalidad, alteracionesDe, estaEnTonalidad, leerTonalidad } from '../../musica/tonalidad.ts'

interface Props {
  pieza: Pieza
  /** Identificador de la pista que se edita. Las demás pistas afinadas se ven de fondo. */
  pista: string
  /** Paso de la rejilla, en ticks: a esto se ajustan las notas nuevas. */
  paso: number
  /** Duración de las notas nuevas, en ticks. */
  figura: number
  /** Se llama con las notas de la pista editada tras añadir o quitar una. `tocada` es la nota recién puesta, para hacerla sonar. */
  alCambiar: (notas: Nota[], tocada?: Nota) => void
  /** Posición del cabezal en ticks. Se consulta en cada fotograma mientras `sonando`. */
  posicion: () => number
  sonando: boolean
}

/** Alto de una fila y ancho de un paso de rejilla, en px: lo bastante grandes para acertar con el dedo. */
const ALTO_FILA = 28
const ANCHO_PASO = 28
/** Filas que se ven por encima y por debajo de las notas escritas. */
const HOLGURA = 7
const FILAS_MINIMAS = 20
/** Piezas de la batería, de arriba abajo. */
const ORDEN_DE_PERCUSION = [49, 51, 53, 46, 42, 44, 50, 45, 38, 37, 36]
const VELOCIDAD_NUEVA = 96

interface Fila {
  nota: number
  nombre: string
  /** La nota pertenece a la tonalidad de la pieza (siempre `true` en percusión o sin tonalidad). */
  enEscala: boolean
  tonica: boolean
}

function filasDe(pista: Pista, pieza: Pieza, nomenclatura: 'latina' | 'anglosajona'): Fila[] {
  const instrumento: Instrumento = INSTRUMENTOS[pista.instrumento]
  if (instrumento.percusion) {
    return ORDEN_DE_PERCUSION.flatMap((tecla) => {
      const alias = aliasDePercusion(pista.instrumento, tecla)
      const parte = alias ? instrumento.percusion?.[alias] : undefined
      return parte ? [{ nota: tecla, nombre: parte.corto, enEscala: true, tonica: false }] : []
    })
  }
  let tonalidad: Tonalidad | undefined
  try {
    tonalidad = pieza.tonalidad ? leerTonalidad(pieza.tonalidad) : undefined
  } catch {
    tonalidad = undefined
  }
  const alteraciones = tonalidad ? alteracionesDe(tonalidad) : 'sostenidos'
  const cromaDeTonica = tonalidad ? croma(tonalidad.tonica) : undefined
  const [minimo, maximo] = instrumento.rango
  const alturas = pista.notas.map((n) => n.n)
  // Sin notas todavía, la rejilla se abre en el centro del registro del instrumento.
  const centro = Math.round((minimo + maximo) / 2)
  let grave = Math.max(minimo, (alturas.length > 0 ? Math.min(...alturas) : centro) - HOLGURA)
  let aguda = Math.min(maximo, (alturas.length > 0 ? Math.max(...alturas) : centro) + HOLGURA)
  while (aguda - grave + 1 < FILAS_MINIMAS && (grave > minimo || aguda < maximo)) {
    if (aguda < maximo) aguda++
    if (aguda - grave + 1 < FILAS_MINIMAS && grave > minimo) grave--
  }
  const filas: Fila[] = []
  for (let nota = aguda; nota >= grave; nota--) {
    filas.push({
      nota,
      nombre: nombreVisible(notaDeMidi(nota, alteraciones), nomenclatura),
      enEscala: tonalidad ? estaEnTonalidad(nota, tonalidad) : true,
      tonica: cromaDeTonica !== undefined && cromaDeMidi(nota) === cromaDeTonica,
    })
  }
  return filas
}

/**
 * Piano roll: la rejilla donde se escribe la música. El tiempo corre hacia la
 * derecha y cada fila es una nota (o una pieza de la batería). Tocar una
 * casilla vacía pone una nota; tocar una nota la quita. Se desplaza con el
 * dedo en las dos direcciones; los nombres de las notas y los compases se
 * quedan fijos en los bordes.
 */
export function RolloDePiano({ pieza, pista: idDePista, paso, figura, alCambiar, posicion, sonando }: Props) {
  const nomenclatura = useAjustes((a) => a.nomenclatura)
  const contenedor = useRef<HTMLDivElement>(null)
  const cabezal = useRef<HTMLDivElement>(null)
  const pista = pieza.pistas.find((p) => p.id === idDePista) ?? pieza.pistas[0]
  const total = duracionEnTicks(pieza)
  const pxPorTick = ANCHO_PASO / paso
  const ancho = total * pxPorTick
  const filas = useMemo(() => (pista ? filasDe(pista, pieza, nomenclatura) : []), [pista, pieza, nomenclatura])
  const alto = filas.length * ALTO_FILA
  const indiceDeFila = useMemo(() => new Map(filas.map((f, i) => [f.nota, i])), [filas])

  // Al cambiar de pista, la rejilla se centra en vertical sobre sus notas.
  useLayoutEffect(() => {
    const caja = contenedor.current
    if (!caja || !pista) return
    const indices = pista.notas.flatMap((n) => indiceDeFila.get(n.n) ?? [])
    const medio = indices.length > 0 ? (Math.min(...indices) + Math.max(...indices) + 1) / 2 : filas.length / 2
    caja.scrollTop = Math.max(0, medio * ALTO_FILA - caja.clientHeight / 2)
    // Solo al cambiar de pista: al editar, la rejilla no debe saltar.
    // oxlint-disable-next-line react/exhaustive-deps
  }, [idDePista])

  // El cabezal se mueve tocando el estilo directamente y arrastra la vista cuando se sale de ella.
  useEffect(() => {
    const linea = cabezal.current
    const caja = contenedor.current
    if (!linea || !caja) return
    if (!sonando) {
      linea.style.opacity = '0'
      return
    }
    linea.style.opacity = '1'
    let cuadro = 0
    const mover = (): void => {
      const x = Math.min(ancho, posicion() * pxPorTick)
      linea.style.transform = `translateX(${x}px)`
      // Ancho de rejilla a la vista: el del contenedor menos la columna fija de nombres.
      const aLaVista = caja.clientWidth - (linea.parentElement?.offsetLeft ?? 0)
      if (x > caja.scrollLeft + aLaVista - 48 || x < caja.scrollLeft) caja.scrollLeft = Math.max(0, x - 32)
      cuadro = requestAnimationFrame(mover)
    }
    mover()
    return () => cancelAnimationFrame(cuadro)
  }, [sonando, posicion, pxPorTick, ancho])

  if (!pista) return null
  const instrumento: Instrumento = INSTRUMENTOS[pista.instrumento]
  const esPercusion = Boolean(instrumento.percusion)
  const porTiempo = ticksPorTiempo(pieza.compas)
  const porCompas = ticksPorCompas(pieza.compas)
  const lineas: number[] = []
  for (let t = 0; t <= total; t += paso) lineas.push(t)
  const compases = Array.from({ length: pieza.compases }, (_, i) => i)
  const fantasmas = esPercusion
    ? []
    : pieza.pistas.filter((p) => {
        const otro: Instrumento = INSTRUMENTOS[p.instrumento]
        return p.id !== pista.id && !otro.percusion
      })

  const alTocar = (evento: MouseEvent<SVGSVGElement>): void => {
    const caja = evento.currentTarget.getBoundingClientRect()
    const fila = filas[Math.floor((evento.clientY - caja.top) / ALTO_FILA)]
    if (!fila) return
    const t = Math.floor((evento.clientX - caja.left) / pxPorTick / paso) * paso
    if (t < 0 || t >= total) return
    const encima = pista.notas.find((n) => n.n === fila.nota && n.t <= t && t < n.t + n.d)
    if (encima) {
      alCambiar(pista.notas.filter((n) => n !== encima))
      return
    }
    // La nota nueva no pisa a la siguiente de su misma altura ni se sale de la pieza.
    const siguiente = pista.notas.filter((n) => n.n === fila.nota && n.t > t).reduce((minimo, n) => Math.min(minimo, n.t), total)
    const nueva: Nota = { t, d: Math.min(figura, siguiente - t), n: fila.nota, v: VELOCIDAD_NUEVA }
    alCambiar([...pista.notas, nueva], nueva)
  }

  return (
    <div className="rollo" ref={contenedor}>
      <div className="rollo__esquina" aria-hidden="true" />
      <div className="rollo__regla" style={{ width: ancho }} aria-hidden="true">
        {compases.map((i) => (
          <span key={i} className="rollo__compas" style={{ left: i * porCompas * pxPorTick }}>
            {i + 1}
          </span>
        ))}
        {pieza.acordes?.map((acorde) => (
          <span key={acorde.t} className="rollo__acorde" style={{ left: acorde.t * pxPorTick }}>
            {cifradoVisible(acorde.simbolo)}
          </span>
        ))}
      </div>
      <div className="rollo__teclas" style={{ height: alto }} aria-hidden="true">
        {filas.map((fila) => (
          <span key={fila.nota} className={`rollo__tecla${fila.tonica ? ' rollo__tecla--tonica' : ''}${fila.enEscala ? '' : ' rollo__tecla--ajena'}`} style={{ height: ALTO_FILA }}>
            {fila.nombre}
          </span>
        ))}
      </div>
      <div className="rollo__lienzo" style={{ width: ancho, height: alto }}>
        {/* La rejilla se edita con el dedo. La edición con teclado (cursor de casilla y Intro) está pendiente: ver HANDOFF.md. */}
        {/* oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
        <svg
          width={ancho}
          height={alto}
          viewBox={`0 0 ${ancho} ${alto}`}
          role="img"
          aria-label={`Rejilla de ${instrumento.nombre}: ${pista.notas.length} ${pista.notas.length === 1 ? 'nota' : 'notas'}. Toca una casilla para poner una nota y toca una nota para quitarla.`}
          onClick={alTocar}
        >
          {filas.map((fila, i) => (
            <rect
              key={fila.nota}
              className={fila.tonica ? 'rollo__fila rollo__fila--tonica' : !fila.enEscala || (esPercusion && i % 2 === 1) ? 'rollo__fila rollo__fila--oscura' : 'rollo__fila'}
              x={0}
              y={i * ALTO_FILA}
              width={ancho}
              height={ALTO_FILA}
            />
          ))}
          {filas.map((fila, i) => (
            <line key={`h-${fila.nota}`} className="rollo__linea" x1={0} x2={ancho} y1={(i + 1) * ALTO_FILA} y2={(i + 1) * ALTO_FILA} />
          ))}
          {lineas.map((t) => (
            <line
              key={`v-${t}`}
              className={t % porCompas === 0 ? 'rollo__linea rollo__linea--compas' : t % porTiempo === 0 ? 'rollo__linea rollo__linea--tiempo' : 'rollo__linea'}
              x1={t * pxPorTick}
              x2={t * pxPorTick}
              y1={0}
              y2={alto}
            />
          ))}
          {fantasmas.map((otra) => (
            <g key={otra.id} className="rollo__fantasma" style={{ fill: `var(--pista-${otra.rol})` }}>
              {otra.notas.map((nota, i) => {
                const fila = indiceDeFila.get(nota.n)
                return fila === undefined ? null : <rect key={i} x={nota.t * pxPorTick + 1} y={fila * ALTO_FILA + 9} width={Math.max(4, nota.d * pxPorTick - 2)} height={ALTO_FILA - 18} />
              })}
            </g>
          ))}
          <g className="rollo__notas" style={{ fill: `var(--pista-${pista.rol})` }}>
            {pista.notas.map((nota, i) => {
              const fila = indiceDeFila.get(nota.n)
              if (fila === undefined) return null
              // La percusión no tiene duración: cada golpe ocupa una casilla.
              const largo = esPercusion ? ANCHO_PASO : nota.d * pxPorTick
              return <rect key={i} x={nota.t * pxPorTick + 1} y={fila * ALTO_FILA + 3} width={Math.max(6, largo - 2)} height={ALTO_FILA - 6} />
            })}
          </g>
        </svg>
        <div ref={cabezal} className="rollo__cabezal" aria-hidden="true" />
      </div>
    </div>
  )
}
