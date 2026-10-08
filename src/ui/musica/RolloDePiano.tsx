import { type KeyboardEvent, type PointerEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useAjustes } from '../../app/ajustes.ts'
import { type Edicion, type Limites, estirarNota, moverNota, notaEn, ponerNota, quitarNota } from '../../musica/edicion.ts'
import { INSTRUMENTOS, type Instrumento, ORDEN_DE_PERCUSION, aliasDePercusion } from '../../musica/instrumentos.ts'
import { cifradoVisible, croma, cromaDeMidi, nombreVisible, notaDeMidi } from '../../musica/notas.ts'
import { type Nota, type Pieza, type Pista, duracionEnTicks } from '../../musica/pieza.ts'
import { nombreDeFigura, posicionLegible, ticksPorCompas, ticksPorTiempo } from '../../musica/tiempo.ts'
import { type Tonalidad, alteracionesDe, estaEnTonalidad, leerTonalidad } from '../../musica/tonalidad.ts'

export type Herramienta = 'lapiz' | 'goma'

interface Props {
  pieza: Pieza
  /** Identificador de la pista que se ve en primer plano. Las demás pistas afinadas se ven de fondo. */
  pista: string
  /** Si esa pista se puede editar. Si no, solo se mira. */
  editable: boolean
  /** Paso de la rejilla, en ticks: a esto se ajustan las notas. */
  paso: number
  /** Duración de las notas nuevas, en ticks. */
  figura: number
  /** Ancho de un paso de rejilla, en px. */
  ancho: number
  herramienta: Herramienta
  /** Posición, en las notas de la pista, de la nota elegida. */
  seleccion: number | undefined
  alSeleccionar: (indice: number | undefined) => void
  /** Se llama con el resultado de una edición. `tocada` es la nota que conviene hacer sonar. */
  alEditar: (edicion: Edicion, tocada?: Nota) => void
  /** Posición del cabezal en ticks. Se consulta en cada fotograma mientras `sonando`. */
  posicion: () => number
  sonando: boolean
}

/** Alto de una fila, en px: lo bastante para acertar con el dedo. */
const ALTO_FILA = 28
const VELOCIDAD_NUEVA = 96
/** Píxeles que tiene que moverse el dedo para que un toque pase a ser un arrastre. */
const UMBRAL_DE_ARRASTRE = 6
/** Ancho del asa con la que se estira la nota elegida, en px. */
const ANCHO_DE_ASA = 18

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
  // Todo el registro del instrumento, siempre: si las filas dependieran de lo escrito, la rejilla saltaría bajo el dedo al poner una nota.
  const [grave, aguda] = instrumento.rango
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

/** Lo que se está haciendo con el dedo sobre una nota. */
interface Gesto {
  puntero: number
  tipo: 'nota' | 'asa'
  indice: number
  x: number
  y: number
  /** Notas de la pista al empezar: los movimientos se calculan siempre desde ellas. */
  origen: readonly Nota[]
  arrastrando: boolean
}

/**
 * Piano roll: la rejilla donde se escribe la música. El tiempo corre hacia la
 * derecha y cada fila es una nota (o una pieza de la batería).
 *
 * Con el lápiz, tocar una casilla vacía pone una nota y tocar una nota la
 * elige; la nota elegida se arrastra para moverla y se estira por su asa. Con
 * la goma, tocar una nota la borra. La rejilla se desplaza con el dedo en las
 * dos direcciones, y con el teclado se recorre casilla a casilla.
 */
export function RolloDePiano({ pieza, pista: idDePista, editable, paso, figura, ancho, herramienta, seleccion, alSeleccionar, alEditar, posicion, sonando }: Props) {
  const nomenclatura = useAjustes((a) => a.nomenclatura)
  const contenedor = useRef<HTMLDivElement>(null)
  const cabezal = useRef<HTMLDivElement>(null)
  const gesto = useRef<Gesto | undefined>(undefined)
  /** Dónde se ha apoyado el dedo: un toque solo cuenta si se levanta casi en el mismo sitio. */
  const apoyo = useRef<{ puntero: number; x: number; y: number } | undefined>(undefined)
  /** Notas de la pista mientras dura un arrastre: lo que se ve antes de soltar. */
  const [provisional, setProvisional] = useState<Edicion>()
  /** Casilla en la que está el cursor del teclado. */
  const [cursor, setCursor] = useState<{ t: number; fila: number }>()
  const [anuncio, setAnuncio] = useState('')

  const pista = pieza.pistas.find((p) => p.id === idDePista) ?? pieza.pistas[0]
  const total = duracionEnTicks(pieza)
  const pxPorTick = ancho / paso
  const anchoTotal = total * pxPorTick
  const filas = useMemo(() => (pista ? filasDe(pista, pieza, nomenclatura) : []), [pista, pieza, nomenclatura])
  const alto = filas.length * ALTO_FILA
  const indiceDeFila = useMemo(() => new Map(filas.map((f, i) => [f.nota, i])), [filas])
  const instrumento: Instrumento | undefined = pista ? INSTRUMENTOS[pista.instrumento] : undefined
  const esPercusion = Boolean(instrumento?.percusion)
  const limites = useMemo(
    (): Limites => ({
      total,
      // En percusión valen las teclas del kit: el «rango» son la más grave y la más aguda de sus filas.
      rango: instrumento ? (instrumento.percusion ? [Math.min(...filas.map((f) => f.nota)), Math.max(...filas.map((f) => f.nota))] : instrumento.rango) : [0, 127],
      polifonia: instrumento && 'polifonia' in instrumento ? instrumento.polifonia : undefined,
    }),
    [total, instrumento, filas],
  )

  // Al cambiar de pista, la rejilla se centra en vertical sobre sus notas; si aún no tiene, sobre las de las demás
  // pistas afinadas o, a falta de ellas, hacia el centro del registro que le toca (más grave para un bajo).
  useLayoutEffect(() => {
    const caja = contenedor.current
    if (!caja || !pista) return
    let alturas = pista.notas.map((n) => n.n)
    if (alturas.length === 0 && !esPercusion && pista.rol !== 'bajo') {
      alturas = pieza.pistas.filter((p) => p.rol !== 'bajo' && !(INSTRUMENTOS[p.instrumento] as Instrumento).percusion).flatMap((p) => p.notas.map((n) => n.n))
    }
    if (alturas.length === 0 && !esPercusion) alturas = [Math.min(Math.max(pista.rol === 'bajo' ? 40 : 64, limites.rango[0]), limites.rango[1])]
    const indices = alturas.flatMap((n) => indiceDeFila.get(n) ?? [])
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
      const x = Math.min(anchoTotal, posicion() * pxPorTick)
      linea.style.transform = `translateX(${x}px)`
      // Ancho de rejilla a la vista: el del contenedor menos la columna fija de nombres.
      const aLaVista = caja.clientWidth - (linea.parentElement?.offsetLeft ?? 0)
      if (x > caja.scrollLeft + aLaVista - 48 || x < caja.scrollLeft) caja.scrollLeft = Math.max(0, x - 32)
      cuadro = requestAnimationFrame(mover)
    }
    mover()
    return () => cancelAnimationFrame(cuadro)
  }, [sonando, posicion, pxPorTick, anchoTotal])

  if (!pista || !instrumento) return null
  const notas = provisional?.notas ?? pista.notas
  const elegida = provisional ? provisional.indice : seleccion
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

  const describir = (nota: Nota): string => {
    const lugar = posicionLegible(nota.t, pieza.compas)
    const nombre = filas[indiceDeFila.get(nota.n) ?? -1]?.nombre ?? String(nota.n)
    const figuraDeLaNota = esPercusion ? '' : `, ${nombreDeFigura(nota.d) ?? `${nota.d} ticks`}`
    return `${nombre}, compás ${lugar.compas}, tiempo ${lugar.tiempo}${lugar.resto > 0 ? ' y fracción' : ''}${figuraDeLaNota}`
  }

  /** La casilla (instante y fila) que hay bajo un punto de la pantalla. */
  const casillaEn = (evento: { clientX: number; clientY: number; currentTarget: Element }): { t: number; fila: number } | undefined => {
    const caja = evento.currentTarget.getBoundingClientRect()
    const fila = Math.floor((evento.clientY - caja.top) / ALTO_FILA)
    const t = Math.floor((evento.clientX - caja.left) / pxPorTick / paso) * paso
    if (fila < 0 || fila >= filas.length || t < 0 || t >= total) return undefined
    return { t, fila }
  }

  const nuevaNota = (t: number, n: number): Nota => ({ t, d: esPercusion ? Math.min(paso, figura) : figura, n, v: VELOCIDAD_NUEVA })

  /** Lo que hace un toque (o Intro, con el teclado) en una casilla. */
  const actuarEn = (t: number, fila: number): void => {
    const altura = filas[fila]?.nota
    if (altura === undefined || !editable) return
    const encima = notaEn(pista.notas, t, altura)
    if (herramienta === 'goma') {
      if (encima >= 0) {
        setAnuncio(`Borrada: ${describir(pista.notas[encima] as Nota)}`)
        alEditar(quitarNota(pista.notas, encima))
      }
      return
    }
    if (encima >= 0) {
      alSeleccionar(encima === seleccion ? undefined : encima)
      setAnuncio(encima === seleccion ? 'Nota suelta' : `Elegida: ${describir(pista.notas[encima] as Nota)}`)
      return
    }
    const edicion = ponerNota(pista.notas, nuevaNota(t, altura), limites)
    if (edicion.indice === undefined) return
    const puesta = edicion.notas[edicion.indice] as Nota
    setAnuncio(`Puesta: ${describir(puesta)}`)
    alEditar(edicion, puesta)
  }

  const alBajar = (evento: PointerEvent<SVGSVGElement>): void => {
    if (!editable || (evento.pointerType === 'mouse' && evento.button !== 0)) return
    apoyo.current = { puntero: evento.pointerId, x: evento.clientX, y: evento.clientY }
    const blanco = evento.target as SVGElement
    const sobreAsa = blanco.dataset.asa !== undefined
    const indice = sobreAsa ? seleccion : blanco.dataset.nota === undefined ? undefined : Number(blanco.dataset.nota)
    if (indice === undefined || herramienta === 'goma') return
    // Sobre una nota (o su asa) el gesto es nuestro: se captura el puntero para seguirlo aunque salga de ella.
    gesto.current = { puntero: evento.pointerId, tipo: sobreAsa ? 'asa' : 'nota', indice, x: evento.clientX, y: evento.clientY, origen: pista.notas, arrastrando: false }
    evento.currentTarget.setPointerCapture(evento.pointerId)
  }

  const alMover = (evento: PointerEvent<SVGSVGElement>): void => {
    const actual = gesto.current
    if (!actual || actual.puntero !== evento.pointerId) return
    const dx = evento.clientX - actual.x
    const dy = evento.clientY - actual.y
    if (!actual.arrastrando && Math.hypot(dx, dy) < UMBRAL_DE_ARRASTRE) return
    actual.arrastrando = true
    const nota = actual.origen[actual.indice]
    if (!nota) return
    if (actual.tipo === 'asa') {
      setProvisional(estirarNota(actual.origen, actual.indice, Math.round((nota.d + dx / pxPorTick) / paso) * paso, paso, limites))
      return
    }
    const fila = (indiceDeFila.get(nota.n) ?? 0) + Math.round(dy / ALTO_FILA)
    const altura = filas[Math.max(0, Math.min(filas.length - 1, fila))]?.nota ?? nota.n
    const t = Math.max(0, Math.round((nota.t + dx / pxPorTick) / paso) * paso)
    setProvisional(moverNota(actual.origen, actual.indice, { t, n: altura }, limites))
  }

  const alSoltar = (evento: PointerEvent<SVGSVGElement>): void => {
    const actual = gesto.current
    if (actual && actual.puntero === evento.pointerId) {
      gesto.current = undefined
      if (actual.arrastrando) {
        // Un arrastre es un solo paso del historial, se haya pasado por las casillas que se haya pasado.
        if (provisional && provisional.notas.some((n, i) => n !== actual.origen[i])) {
          const movida = provisional.indice === undefined ? undefined : provisional.notas[provisional.indice]
          if (movida) setAnuncio(`${actual.tipo === 'asa' ? 'Estirada' : 'Movida'}: ${describir(movida)}`)
          alEditar(provisional, actual.tipo === 'nota' ? movida : undefined)
        }
        setProvisional(undefined)
        return
      }
      if (actual.tipo === 'asa') return
    }
    const inicio = apoyo.current
    apoyo.current = undefined
    // Si el dedo se ha desplazado (o no se apoyó aquí), no era un toque.
    if (!inicio || inicio.puntero !== evento.pointerId || Math.hypot(evento.clientX - inicio.x, evento.clientY - inicio.y) >= UMBRAL_DE_ARRASTRE) return
    const casilla = casillaEn(evento)
    if (casilla) actuarEn(casilla.t, casilla.fila)
  }

  // El navegador cancela el gesto cuando decide que el dedo está desplazando la rejilla.
  const alCancelar = (): void => {
    gesto.current = undefined
    apoyo.current = undefined
    setProvisional(undefined)
  }

  /** Deja el cursor del teclado a la vista. */
  const mostrar = (t: number, fila: number): void => {
    const caja = contenedor.current
    if (!caja) return
    const x = t * pxPorTick
    const y = fila * ALTO_FILA
    const margenIzquierdo = caja.clientWidth - (cabezal.current?.parentElement?.clientWidth ?? caja.clientWidth)
    if (x < caja.scrollLeft) caja.scrollLeft = x
    else if (x + ancho > caja.scrollLeft + caja.clientWidth - Math.max(56, margenIzquierdo)) caja.scrollLeft = x + ancho - caja.clientWidth + 72
    if (y < caja.scrollTop) caja.scrollTop = y
    else if (y + ALTO_FILA > caja.scrollTop + caja.clientHeight - 48) caja.scrollTop = y + ALTO_FILA - caja.clientHeight + 56
  }

  const alTeclear = (evento: KeyboardEvent<HTMLDivElement>): void => {
    const centro = Math.floor(filas.length / 2)
    const actual = cursor ?? { t: 0, fila: centro }
    const saltos: Record<string, [number, number]> = { ArrowLeft: [-paso, 0], ArrowRight: [paso, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], PageUp: [0, -12], PageDown: [0, 12] }
    const salto = saltos[evento.key]
    if (salto) {
      evento.preventDefault()
      // Con Alt, las flechas mueven la nota elegida en vez del cursor.
      if (evento.altKey && seleccion !== undefined && editable) {
        const nota = pista.notas[seleccion]
        if (!nota) return
        const fila = Math.max(0, Math.min(filas.length - 1, (indiceDeFila.get(nota.n) ?? 0) + Math.sign(salto[1])))
        const edicion = moverNota(pista.notas, seleccion, { t: nota.t + salto[0], n: filas[fila]?.nota ?? nota.n }, limites)
        const movida = edicion.indice === undefined ? undefined : edicion.notas[edicion.indice]
        if (movida && movida !== nota) {
          setAnuncio(`Movida: ${describir(movida)}`)
          alEditar(edicion, movida)
          setCursor({ t: movida.t, fila })
          mostrar(movida.t, fila)
        }
        return
      }
      const nuevo = { t: Math.max(0, Math.min(total - paso, actual.t + salto[0])), fila: Math.max(0, Math.min(filas.length - 1, actual.fila + salto[1])) }
      setCursor(nuevo)
      mostrar(nuevo.t, nuevo.fila)
      const altura = filas[nuevo.fila]?.nota
      const encima = altura === undefined ? -1 : notaEn(pista.notas, nuevo.t, altura)
      const lugar = posicionLegible(nuevo.t, pieza.compas)
      setAnuncio(encima >= 0 ? describir(pista.notas[encima] as Nota) : `${filas[nuevo.fila]?.nombre ?? ''}, compás ${lugar.compas}, tiempo ${lugar.tiempo}: vacío`)
      return
    }
    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault()
      setCursor(actual)
      actuarEn(actual.t, actual.fila)
      return
    }
    if (!editable) return
    if (evento.key === 'Delete' || evento.key === 'Backspace') {
      const altura = filas[actual.fila]?.nota
      const indice = seleccion ?? (altura === undefined ? -1 : notaEn(pista.notas, actual.t, altura))
      if (indice === undefined || indice < 0 || !pista.notas[indice]) return
      evento.preventDefault()
      setAnuncio(`Borrada: ${describir(pista.notas[indice] as Nota)}`)
      alEditar(quitarNota(pista.notas, indice))
      return
    }
    if ((evento.key === '+' || evento.key === '-') && seleccion !== undefined && !esPercusion) {
      const nota = pista.notas[seleccion]
      if (!nota) return
      evento.preventDefault()
      const edicion = estirarNota(pista.notas, seleccion, nota.d + (evento.key === '+' ? paso : -paso), paso, limites)
      const estirada = edicion.indice === undefined ? undefined : edicion.notas[edicion.indice]
      if (estirada && estirada.d !== nota.d) {
        setAnuncio(`Duración: ${nombreDeFigura(estirada.d) ?? `${estirada.d} ticks`}`)
        alEditar(edicion)
      }
      return
    }
    if (evento.key === 'Escape' && seleccion !== undefined) {
      alSeleccionar(undefined)
      setAnuncio('Nota suelta')
    }
  }

  const notaElegida = elegida === undefined ? undefined : notas[elegida]
  const filaElegida = notaElegida ? indiceDeFila.get(notaElegida.n) : undefined

  return (
    <div className="rollo" ref={contenedor}>
      <div className="rollo__esquina" aria-hidden="true" />
      <div className="rollo__regla" style={{ width: anchoTotal }} aria-hidden="true">
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
      {/* La rejilla es una zona de trabajo con sus propias teclas (flechas, Intro, Suprimir): por eso lleva el papel
          «application», recibe el foco y escucha el teclado, aunque el analizador no lo cuente como elemento interactivo. */}
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        className={`rollo__lienzo rollo__lienzo--${editable ? herramienta : 'lectura'}`}
        style={{ width: anchoTotal, height: alto }}
        role="application"
        aria-roledescription="rejilla de piano roll"
        aria-label={`Rejilla de ${instrumento.nombre}: ${pista.notas.length} ${pista.notas.length === 1 ? 'nota' : 'notas'}.${editable ? ' Flechas para moverte, Intro para poner o elegir una nota, Suprimir para borrarla, más y menos para cambiar su duración y Alt con flechas para moverla.' : ' Esta pista no se puede editar.'}`}
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        onKeyDown={alTeclear}
      >
        <svg width={anchoTotal} height={alto} viewBox={`0 0 ${anchoTotal} ${alto}`} aria-hidden="true" onPointerDown={alBajar} onPointerMove={alMover} onPointerUp={alSoltar} onPointerCancel={alCancelar}>
          {filas.map((fila, i) => (
            <rect
              key={fila.nota}
              className={fila.tonica ? 'rollo__fila rollo__fila--tonica' : !fila.enEscala || (esPercusion && i % 2 === 1) ? 'rollo__fila rollo__fila--oscura' : 'rollo__fila'}
              x={0}
              y={i * ALTO_FILA}
              width={anchoTotal}
              height={ALTO_FILA}
            />
          ))}
          {filas.map((fila, i) => (
            <line key={`h-${fila.nota}`} className="rollo__linea" x1={0} x2={anchoTotal} y1={(i + 1) * ALTO_FILA} y2={(i + 1) * ALTO_FILA} />
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
            {notas.map((nota, i) => {
              const fila = indiceDeFila.get(nota.n)
              if (fila === undefined) return null
              // La percusión no tiene duración: cada golpe ocupa una casilla.
              const largo = esPercusion ? ancho : nota.d * pxPorTick
              return <rect key={i} data-nota={i} className={i === elegida ? 'rollo__nota rollo__nota--elegida' : 'rollo__nota'} x={nota.t * pxPorTick + 1} y={fila * ALTO_FILA + 3} width={Math.max(6, largo - 2)} height={ALTO_FILA - 6} />
            })}
          </g>
          {notaElegida && filaElegida !== undefined && editable && !esPercusion && (
            <rect data-asa="" className="rollo__asa" x={(notaElegida.t + notaElegida.d) * pxPorTick - ANCHO_DE_ASA / 2} y={filaElegida * ALTO_FILA - 4} width={ANCHO_DE_ASA} height={ALTO_FILA + 8} />
          )}
          {cursor && <rect className="rollo__cursor" x={cursor.t * pxPorTick + 1} y={cursor.fila * ALTO_FILA + 1} width={ancho - 2} height={ALTO_FILA - 2} />}
        </svg>
        <div ref={cabezal} className="rollo__cabezal" aria-hidden="true" />
      </div>
      <p className="solo-lectores" role="status" aria-live="polite">
        {anuncio}
      </p>
    </div>
  )
}
