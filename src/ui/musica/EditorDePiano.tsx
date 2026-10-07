import { type CSSProperties, type ReactNode, Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAjustes } from '../../app/ajustes.ts'
import { descargarMidi } from '../../app/descargas.ts'
import { sonar, tocarNotas } from '../../audio/audio.ts'
import { type Edicion, type Historial, deshacer, estirarNota, hacer, historialDe, quitarNota, rehacer } from '../../musica/edicion.ts'
import { IDS_INSTRUMENTOS, INSTRUMENTOS, type IdInstrumento, type Instrumento } from '../../musica/instrumentos.ts'
import { NOMBRES_ROL, type Nota, type Pieza, duracionEnTicks } from '../../musica/pieza.ts'
import { PPQ, nombreDeFigura, ticksASegundos } from '../../musica/tiempo.ts'
import { tonalidadVisible } from '../../musica/tonalidad.ts'
import { Boton } from '../Boton.tsx'
import { Cabecera } from '../Cabecera.tsx'
import { Conmutador } from '../Conmutador.tsx'
import { Icono } from '../Icono.tsx'
import { Marco } from '../Marco.tsx'
import { Ventana } from '../Ventana.tsx'
import { AvisoDeSonido } from './EjemploSonoro.tsx'
import { type Herramienta, RolloDePiano } from './RolloDePiano.tsx'
import { useReproductor } from './useReproductor.ts'

const Pentagrama = lazy(() => import('./Pentagrama.tsx').then((m) => ({ default: m.Pentagrama })))

/** Pasos de rejilla que se pueden elegir, en ticks. */
const REJILLAS = [
  { valor: String(PPQ), texto: '1/4' },
  { valor: String(PPQ / 2), texto: '1/8' },
  { valor: String(PPQ / 4), texto: '1/16' },
] as const

/** Duraciones de las notas nuevas, en ticks. */
const FIGURAS = [
  { valor: String(PPQ * 4), texto: '1' },
  { valor: String(PPQ * 2), texto: '1/2' },
  { valor: String(PPQ), texto: '1/4' },
  { valor: String(PPQ / 2), texto: '1/8' },
  { valor: String(PPQ / 4), texto: '1/16' },
] as const

/** Anchos de un paso de rejilla, en px, de más alejado a más cercano. */
const ZOOMS = [18, 28, 40] as const

const TEMPO_MINIMO = 40
const TEMPO_MAXIMO = 220

interface Props {
  /** La pieza con la que se abre. Los cambios posteriores de esta propiedad no se miran: el editor lleva la suya. */
  inicial: Pieza
  /** Se llama con la pieza entera después de cada cambio. */
  alCambiar: (pieza: Pieza) => void
  /** Pistas que se pueden editar, por su `id`. Por defecto, todas. */
  editables?: readonly string[] | undefined
  titulo: string
  /** Texto del botón de volver y qué hace. */
  salida: { etiqueta: string; accion: () => void }
  /** Lo que va a la derecha de la cabecera: el botón de comprobar un ejercicio, por ejemplo. */
  despues?: ReactNode
  /** Una pieza propia (se le puede cambiar el título, el tempo y los instrumentos) o la de un ejercicio (solo las notas). */
  libre?: boolean
}

type NotasPorPista = Readonly<Record<string, readonly Nota[]>>

/** Lo que no pasa por el historial de deshacer: el tempo, el bucle y, por pista, el instrumento y el silencio. */
interface Arreglo {
  tempo: number
  bucle: boolean
  titulo: string | undefined
  instrumentos: Readonly<Record<string, IdInstrumento>>
  silenciadas: ReadonlySet<string>
}

/**
 * El piano roll completo: la rejilla de una pista en primer plano, con lápiz y
 * goma, deshacer, tres niveles de ampliación, reproducción en bucle mientras
 * se edita, vista de pentagrama y exportación a MIDI.
 */
export function EditorDePiano({ inicial, alCambiar, editables, titulo, salida, despues, libre = false }: Props) {
  const nomenclatura = useAjustes((a) => a.nomenclatura)
  const [base] = useState(inicial)
  const [historial, setHistorial] = useState<Historial<NotasPorPista>>(() => historialDe(Object.fromEntries(inicial.pistas.map((p) => [p.id, p.notas]))))
  const [arreglo, setArreglo] = useState<Arreglo>(() => ({
    tempo: inicial.tempo,
    bucle: inicial.bucle ?? true,
    titulo: inicial.titulo,
    instrumentos: Object.fromEntries(inicial.pistas.map((p) => [p.id, p.instrumento])),
    silenciadas: new Set(inicial.pistas.filter((p) => p.silenciada).map((p) => p.id)),
  }))
  const primeraEditable = inicial.pistas.find((p) => !editables || editables.includes(p.id)) ?? inicial.pistas[0]
  const [idDePista, setIdDePista] = useState(primeraEditable?.id ?? '')
  const [paso, setPaso] = useState(PPQ / 2)
  const [figura, setFigura] = useState(PPQ / 2)
  const [zoom, setZoom] = useState(1)
  const [herramienta, setHerramienta] = useState<Herramienta>('lapiz')
  const [seleccion, setSeleccion] = useState<number>()
  const [ventana, setVentana] = useState<'opciones' | 'pentagrama'>()
  const [exportando, setExportando] = useState(false)

  const pieza = useMemo((): Pieza => {
    const { titulo: _titulo, bucle: _bucle, ...resto } = base
    const montada: Pieza = {
      ...resto,
      tempo: arreglo.tempo,
      pistas: base.pistas.map((p) => {
        const { silenciada: _silenciada, ...pista } = p
        return {
          ...pista,
          instrumento: arreglo.instrumentos[p.id] ?? p.instrumento,
          // Se conserva la misma lista mientras no cambie: así el reproductor sabe qué pista hay que poner al día.
          notas: (historial.presente[p.id] ?? p.notas) as Nota[],
          ...(arreglo.silenciadas.has(p.id) ? { silenciada: true } : {}),
        }
      }),
    }
    if (arreglo.titulo !== undefined) montada.titulo = arreglo.titulo
    if (arreglo.bucle) montada.bucle = true
    return montada
  }, [base, historial.presente, arreglo])

  // Quien abre el editor se entera de cada cambio (para guardarlo), pero no de la pieza con la que se abre.
  const avisada = useRef(pieza)
  useEffect(() => {
    if (pieza === avisada.current) return
    avisada.current = pieza
    alCambiar(pieza)
  }, [pieza, alCambiar])

  const reproduccion = useReproductor(pieza, { bucle: arreglo.bucle })
  const sonando = reproduccion.estado === 'sonando'
  const cargando = reproduccion.estado === 'cargando'
  const pista = pieza.pistas.find((p) => p.id === idDePista) ?? pieza.pistas[0]
  const editable = pista !== undefined && (!editables || editables.includes(pista.id))
  const instrumento: Instrumento | undefined = pista ? INSTRUMENTOS[pista.instrumento] : undefined
  const esPercusion = Boolean(instrumento?.percusion)
  const notaElegida = seleccion === undefined ? undefined : pista?.notas[seleccion]

  const editar = useCallback(
    (edicion: Edicion, tocada?: Nota) => {
      if (!pista) return
      setHistorial((h) => hacer(h, { ...h.presente, [pista.id]: edicion.notas }))
      setSeleccion(edicion.indice)
      if (tocada && !sonando) {
        const duracion = esPercusion ? 0.3 : Math.min(0.6, ticksASegundos(tocada.d, arreglo.tempo))
        void tocarNotas(pista.instrumento, [{ nota: tocada.n, duracion, velocidad: tocada.v }]).catch(() => undefined)
      }
    },
    [pista, sonando, esPercusion, arreglo.tempo],
  )

  const volverAtras = useCallback(() => {
    setSeleccion(undefined)
    setHistorial(deshacer)
  }, [])
  const volverAdelante = useCallback(() => {
    setSeleccion(undefined)
    setHistorial(rehacer)
  }, [])

  // Ctrl+Z y Ctrl+Y (o Ctrl+Mayús+Z), como en cualquier editor.
  useEffect(() => {
    const alTeclear = (evento: KeyboardEvent): void => {
      if (!(evento.ctrlKey || evento.metaKey) || evento.altKey) return
      const tecla = evento.key.toLowerCase()
      if (tecla === 'z' && !evento.shiftKey) {
        evento.preventDefault()
        volverAtras()
      } else if (tecla === 'y' || (tecla === 'z' && evento.shiftKey)) {
        evento.preventDefault()
        volverAdelante()
      }
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [volverAtras, volverAdelante])

  const cambiarDePista = (id: string): void => {
    setIdDePista(id)
    setSeleccion(undefined)
  }

  const cambiarTempo = (nuevo: number): void => setArreglo((a) => ({ ...a, tempo: Math.max(TEMPO_MINIMO, Math.min(TEMPO_MAXIMO, nuevo)) }))

  const estirar = (pasos: number): void => {
    if (!pista || seleccion === undefined || !notaElegida) return
    editar(estirarNota(pista.notas, seleccion, notaElegida.d + pasos * paso, paso, { total: duracionEnTicks(pieza), rango: instrumento?.rango ?? [0, 127], polifonia: instrumento && 'polifonia' in instrumento ? instrumento.polifonia : undefined }))
  }

  const exportar = async (): Promise<void> => {
    setExportando(true)
    try {
      await descargarMidi(pieza, titulo)
      sonar('aceptar')
    } catch (error) {
      console.warn('No se ha podido exportar a MIDI', error)
      sonar('fallo')
    } finally {
      setExportando(false)
    }
  }

  // Instrumentos por los que se puede cambiar el de la pista: los de su misma clase en cuyo registro caben sus notas.
  const candidatos = useMemo(() => {
    if (!pista || esPercusion) return []
    const alturas = pista.notas.map((n) => n.n)
    const [grave, aguda] = alturas.length > 0 ? [Math.min(...alturas), Math.max(...alturas)] : [60, 60]
    return IDS_INSTRUMENTOS.filter((id) => {
      const otro: Instrumento = INSTRUMENTOS[id]
      return !otro.percusion && otro.rango[0] <= grave && otro.rango[1] >= aguda
    })
  }, [pista, esPercusion])

  if (!pista || !instrumento) return null

  return (
    <main className="pantalla pantalla--pianoroll">
      <Cabecera
        titulo={arreglo.titulo ?? titulo}
        antes={<Boton variante="fantasma" soloIcono icono="atras" sonido="atras" aria-label={salida.etiqueta} onClick={salida.accion} />}
        despues={despues ?? (pieza.tonalidad !== undefined && <span className="cabecera__dato">{tonalidadVisible(pieza.tonalidad, nomenclatura)}</span>)}
      />
      <div className="pianoroll__pistas" role="group" aria-label="Pista que se edita">
        {pieza.pistas.map((p) => {
          const cerrada = editables !== undefined && !editables.includes(p.id)
          return (
            <button key={p.id} type="button" className="pista-chip pista-chip--pestana" aria-pressed={p.id === pista.id} style={{ '--_color': `var(--pista-${p.rol})` } as CSSProperties} onClick={() => cambiarDePista(p.id)}>
              <span className="pista-chip__color" />
              {p.nombre ?? NOMBRES_ROL[p.rol]}
              {cerrada && <Icono nombre="candado" titulo="No se puede editar" />}
            </button>
          )
        })}
      </div>
      <Marco variante="hundido" relleno="ninguno" className="pianoroll__marco">
        <RolloDePiano
          pieza={pieza}
          pista={pista.id}
          editable={editable}
          paso={paso}
          figura={figura}
          ancho={ZOOMS[zoom] ?? 28}
          herramienta={herramienta}
          seleccion={seleccion}
          alSeleccionar={setSeleccion}
          alEditar={editar}
          posicion={reproduccion.posicion}
          sonando={sonando}
        />
      </Marco>
      <div className="pianoroll__controles">
        <AvisoDeSonido reproduccion={reproduccion} />
        {!editable && <p className="nota-al-pie suave">Esta pista viene dada: se puede escuchar y mirar, pero no editar.</p>}
        {notaElegida && editable ? (
          <div className="pianoroll__fila" role="group" aria-label="Nota elegida">
            <span className="etiqueta crece">{esPercusion ? 'Golpe elegido' : `Nota elegida · ${nombreDeFigura(notaElegida.d) ?? 'duración libre'}`}</span>
            {!esPercusion && <Boton soloIcono icono="menos" sonido="cursor" aria-label="Acortar la nota" onClick={() => estirar(-1)} />}
            {!esPercusion && <Boton soloIcono icono="mas" sonido="cursor" aria-label="Alargar la nota" onClick={() => estirar(1)} />}
            <Boton soloIcono icono="papelera" sonido="atras" aria-label="Borrar la nota" onClick={() => seleccion !== undefined && editar(quitarNota(pista.notas, seleccion))} />
          </div>
        ) : (
          editable && (
            <div className="pianoroll__fila">
              <span className="etiqueta">{esPercusion ? 'Paso' : 'Figura'}</span>
              <div className="crece">
                {esPercusion ? (
                  <Conmutador etiqueta="Paso de la rejilla" valor={String(paso)} alCambiar={(valor) => setPaso(Number(valor))} opciones={REJILLAS} />
                ) : (
                  <Conmutador etiqueta="Figura de las notas nuevas" valor={String(figura)} alCambiar={(valor) => setFigura(Number(valor))} opciones={FIGURAS} />
                )}
              </div>
            </div>
          )
        )}
        <div className="pianoroll__fila">
          <Boton variante="primario" soloIcono icono={sonando || cargando ? 'detener' : 'reproducir'} sonido={null} aria-label={sonando || cargando ? 'Parar' : 'Reproducir'} onClick={reproduccion.alternar} />
          <Boton soloIcono icono="deshacer" sonido="cursor" aria-label="Deshacer" disabled={historial.pasado.length === 0} onClick={volverAtras} />
          <Boton soloIcono icono="rehacer" sonido="cursor" aria-label="Rehacer" disabled={historial.futuro.length === 0} onClick={volverAdelante} />
          <span className="crece" />
          {editable && (
            <Boton
              soloIcono
              icono={herramienta === 'lapiz' ? 'lapiz' : 'goma'}
              sonido="cursor"
              aria-label={herramienta === 'lapiz' ? 'Lápiz: toca para cambiar a la goma' : 'Goma: toca para cambiar al lápiz'}
              aria-pressed={herramienta === 'goma'}
              className={herramienta === 'goma' ? 'boton--activo' : undefined}
              onClick={() => {
                setHerramienta(herramienta === 'lapiz' ? 'goma' : 'lapiz')
                setSeleccion(undefined)
              }}
            />
          )}
          <Boton soloIcono icono="ajustes" aria-label="Opciones de la pieza" onClick={() => setVentana('opciones')} />
        </div>
      </div>

      <Ventana abierta={ventana === 'opciones'} alCerrar={() => setVentana(undefined)} rotulo="Opciones">
        <div className="pila">
          {libre && (
            <label className="pila pila--junta">
              <span className="etiqueta">Título</span>
              <input
                className="campo"
                type="text"
                maxLength={60}
                value={arreglo.titulo ?? ''}
                placeholder={titulo}
                onChange={(evento) => {
                  const nuevo = evento.target.value
                  setArreglo((a) => ({ ...a, titulo: nuevo.trim() === '' ? undefined : nuevo }))
                }}
              />
            </label>
          )}
          <div className="pianoroll__fila">
            <span className="etiqueta crece">Tempo</span>
            <Boton soloIcono icono="menos" sonido="cursor" aria-label="Bajar el tempo" onClick={() => cambiarTempo(arreglo.tempo - 4)} />
            <output className="pianoroll__tempo" aria-label="Tempo">
              <span className="dato">{arreglo.tempo}</span>
              <span className="etiqueta">BPM</span>
            </output>
            <Boton soloIcono icono="mas" sonido="cursor" aria-label="Subir el tempo" onClick={() => cambiarTempo(arreglo.tempo + 4)} />
          </div>
          <div className="pila pila--junta">
            <span className="etiqueta">Rejilla</span>
            <Conmutador etiqueta="Paso de la rejilla" valor={String(paso)} alCambiar={(valor) => setPaso(Number(valor))} opciones={REJILLAS} />
          </div>
          <div className="pila pila--junta">
            <span className="etiqueta">Ampliación</span>
            <Conmutador
              etiqueta="Ampliación de la rejilla"
              valor={String(zoom)}
              alCambiar={(valor) => setZoom(Number(valor))}
              opciones={[
                { valor: '0', texto: 'Lejos' },
                { valor: '1', texto: 'Normal' },
                { valor: '2', texto: 'Cerca' },
              ]}
            />
          </div>
          <div className="pianoroll__fila">
            <Boton className="crece" icono="bucle" sonido="cursor" aria-pressed={arreglo.bucle} onClick={() => setArreglo((a) => ({ ...a, bucle: !a.bucle }))}>
              {arreglo.bucle ? 'En bucle' : 'Sin bucle'}
            </Boton>
            <Boton
              className="crece"
              icono={arreglo.silenciadas.has(pista.id) ? 'silencio' : 'escuchar'}
              sonido="cursor"
              aria-pressed={arreglo.silenciadas.has(pista.id)}
              onClick={() =>
                setArreglo((a) => {
                  const silenciadas = new Set(a.silenciadas)
                  if (!silenciadas.delete(pista.id)) silenciadas.add(pista.id)
                  return { ...a, silenciadas }
                })
              }
            >
              {arreglo.silenciadas.has(pista.id) ? 'Pista callada' : 'Pista sonando'}
            </Boton>
          </div>
          {libre && candidatos.length > 1 && (
            <div className="pila pila--junta">
              <span className="etiqueta">Instrumento de «{pista.nombre ?? NOMBRES_ROL[pista.rol]}»</span>
              <div className="instrumentos" role="group" aria-label="Instrumento de la pista">
                {candidatos.map((id) => (
                  <button key={id} type="button" className="pista-chip" aria-pressed={id === pista.instrumento} onClick={() => setArreglo((a) => ({ ...a, instrumentos: { ...a.instrumentos, [pista.id]: id } }))}>
                    <span className="pista-chip__color" style={{ '--_color': `var(--pista-${pista.rol})` } as CSSProperties} />
                    {INSTRUMENTOS[id].nombre}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="pianoroll__fila">
            <Boton className="crece" icono="pentagrama" onClick={() => setVentana('pentagrama')}>
              Pentagrama
            </Boton>
            <Boton className="crece" icono="descargar" sonido={null} disabled={exportando} onClick={() => void exportar()}>
              {exportando ? 'Exportando…' : 'Exportar MIDI'}
            </Boton>
          </div>
        </div>
      </Ventana>

      <Ventana abierta={ventana === 'pentagrama'} alCerrar={() => setVentana(undefined)} rotulo="Pentagrama">
        <Suspense fallback={<p className="suave">Cargando…</p>}>{ventana === 'pentagrama' && <Pentagrama pieza={pieza} />}</Suspense>
      </Ventana>
    </main>
  )
}
