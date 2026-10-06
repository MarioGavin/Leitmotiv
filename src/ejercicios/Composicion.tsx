import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAjustes } from '../app/ajustes.ts'
import { sonar } from '../audio/audio.ts'
import type { PasoEncargo, PasoPianoRoll } from '../contenido/tipos.ts'
import type { Pieza } from '../musica/pieza.ts'
import { plantillaParaRequisitos } from '../musica/plantilla.ts'
import { type ResultadoDeRequisito, corregir, todoCumplido } from '../musica/requisitos.ts'
import { useProgreso } from '../progreso/progreso.ts'
import { Boton } from '../ui/Boton.tsx'
import { Dialogo } from '../ui/Dialogo.tsx'
import { Icono } from '../ui/Icono.tsx'
import { Marco } from '../ui/Marco.tsx'
import { ProsaVista } from '../ui/ProsaVista.tsx'
import { Ventana } from '../ui/Ventana.tsx'
import { EditorDePiano } from '../ui/musica/EditorDePiano.tsx'
import { type PropsDePaso, SIN_PREGUNTAS } from './tipos.ts'

/** Milisegundos sin tocar nada antes de guardar el borrador: guardar en cada nota sería escribir sin parar. */
const ESPERA_DEL_BORRADOR = 800

interface Props extends PropsDePaso<PasoPianoRoll | PasoEncargo> {
  /** Clave del borrador: el paso dentro de la lección, «m00.u01.l08#5». */
  clave: string
  /** Lección a la que pertenece. La pieza entregada de un encargo la lleva como origen. */
  leccion: string
  /** Pinta la pantalla de la lección (cabecera y avance) alrededor del enunciado. */
  envoltorio: (contenido: ReactNode) => ReactNode
}

function ListaDeRequisitos({ resultados }: { resultados: readonly ResultadoDeRequisito[] }) {
  return (
    <ul className="requisitos">
      {resultados.map((r, i) => (
        <li key={i} className={r.cumplido ? 'requisito requisito--cumplido' : 'requisito'}>
          <Icono nombre={r.cumplido ? 'acierto' : 'fallo'} titulo={r.cumplido ? 'Cumplido' : 'Falta'} />
          <div className="requisito__texto">
            <p className="requisito__titulo">{r.titulo}</p>
            <p className="suave">{r.detalle}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

/**
 * Los pasos en los que se compone: un piano roll con requisitos o un encargo
 * de compositor. Primero se lee lo que se pide; luego el editor ocupa la
 * pantalla entera, con la lista de requisitos a un toque, que se va cumpliendo
 * mientras se escribe. Lo escrito se guarda como borrador al momento, así que
 * salir de la lección no lo pierde. Un encargo entregado va a «Mi repertorio».
 */
export function Composicion({ paso, clave, leccion, envoltorio, alTerminar }: Props) {
  const nomenclatura = useAjustes((a) => a.nomenclatura)
  const borrador = useProgreso((p) => p.borradores[clave])
  const carga = useProgreso((p) => p.carga)
  const encargo = paso.tipo === 'encargo' ? paso : undefined
  const plantilla = useMemo(() => (paso.tipo === 'pianoroll' ? paso.plantilla : (paso.plantilla ?? plantillaParaRequisitos(paso.requisitos, paso.titulo))), [paso])
  const [pieza, setPieza] = useState<Pieza>()
  const [editando, setEditando] = useState(false)
  const [lista, setLista] = useState(false)
  const [pistaVisible, setPistaVisible] = useState(false)
  const [entregando, setEntregando] = useState(false)
  const pendiente = useRef<{ temporizador: number; pieza: Pieza }>(undefined)

  // El borrador se lee de la base: hasta entonces no se sabe si hay trabajo a medias.
  useEffect(() => {
    void useProgreso.getState().cargar()
  }, [])

  const actual = pieza ?? borrador?.pieza ?? plantilla
  const resultados = useMemo(() => corregir(actual, paso.requisitos, nomenclatura), [actual, paso.requisitos, nomenclatura])
  const cumplidos = resultados.filter((r) => r.cumplido).length
  const todo = todoCumplido(resultados)

  // Al cumplirse todo mientras se escribe, suena el acierto: se entera sin tener que abrir la lista.
  const antes = useRef(todo)
  useEffect(() => {
    if (todo && !antes.current && editando) sonar('acierto')
    antes.current = todo
  }, [todo, editando])

  const guardarYa = useCallback(() => {
    const espera = pendiente.current
    if (!espera) return
    window.clearTimeout(espera.temporizador)
    pendiente.current = undefined
    void useProgreso.getState().guardarBorrador(clave, espera.pieza)
  }, [clave])

  // Al salir de la pantalla no puede quedar un cambio sin guardar.
  useEffect(() => guardarYa, [guardarYa])

  const alCambiar = useCallback(
    (nueva: Pieza) => {
      setPieza(nueva)
      if (pendiente.current) window.clearTimeout(pendiente.current.temporizador)
      pendiente.current = { pieza: nueva, temporizador: window.setTimeout(guardarYa, ESPERA_DEL_BORRADOR) }
    },
    [guardarYa],
  )

  const entregar = async (): Promise<void> => {
    setEntregando(true)
    if (pendiente.current) window.clearTimeout(pendiente.current.temporizador)
    pendiente.current = undefined
    const progreso = useProgreso.getState()
    if (encargo) await progreso.guardarPieza({ titulo: encargo.titulo, pieza: actual, origen: leccion })
    await progreso.borrarBorrador(clave)
    alTerminar(SIN_PREGUNTAS)
  }

  const textoDeEntrega = encargo ? 'Entregar y guardar en Mi repertorio' : 'Continuar'

  if (editando) {
    return (
      <>
        <EditorDePiano
          inicial={actual}
          alCambiar={alCambiar}
          editables={paso.tipo === 'pianoroll' ? paso.editables : undefined}
          titulo={encargo?.titulo ?? 'Piano roll'}
          salida={{
            etiqueta: 'Volver al enunciado',
            accion: () => {
              guardarYa()
              setEditando(false)
            },
          }}
          despues={
            <Boton variante={todo ? 'primario' : 'secundario'} icono={todo ? 'acierto' : 'cursor'} aria-label={`Requisitos: ${cumplidos} de ${resultados.length} cumplidos`} onClick={() => setLista(true)}>
              {cumplidos}/{resultados.length}
            </Boton>
          }
          libre={encargo !== undefined}
        />
        <Ventana abierta={lista} alCerrar={() => setLista(false)} rotulo="Requisitos" titulo={todo ? 'Todo cumplido' : `${cumplidos} de ${resultados.length} cumplidos`} cerrar="Seguir editando">
          <ListaDeRequisitos resultados={resultados} />
          {todo ? (
            <>
              <Dialogo tipo="acierto" rotulo="Hecho">
                <ProsaVista prosa={paso.explicacion} />
              </Dialogo>
              <Boton variante="primario" bloque disabled={entregando} onClick={() => void entregar()}>
                {textoDeEntrega}
              </Boton>
            </>
          ) : (
            <Dialogo tipo="pista" rotulo="Pista">
              <ProsaVista prosa={paso.pista} />
            </Dialogo>
          )}
        </Ventana>
      </>
    )
  }

  return envoltorio(
    <>
      <div className="pantalla__cuerpo pila">
        <div className="enunciado">
          {paso.tipo === 'encargo' ? (
            <>
              <p className="etiqueta">Encargo{paso.cliente !== undefined ? ` · ${paso.cliente}` : ''}</p>
              <h2 className="enunciado__texto">{paso.titulo}</h2>
            </>
          ) : (
            <ProsaVista prosa={paso.enunciado} className="enunciado__texto" />
          )}
        </div>
        {encargo && (
          <Marco rotulo="El encargo">
            <ProsaVista prosa={encargo.brief} />
          </Marco>
        )}
        <Marco rotulo={`Requisitos · ${cumplidos} de ${resultados.length}`} relleno="ajustado">
          <ListaDeRequisitos resultados={resultados} />
        </Marco>
        {carga === 'sin-guardar' && (
          <p className="nota-al-pie" role="alert">
            Este dispositivo no deja guardar: si sales de la lección, perderás lo que hayas escrito.
          </p>
        )}
        <div className="respuesta">
          {pistaVisible && (
            <Dialogo tipo="pista" rotulo="Pista">
              <ProsaVista prosa={paso.pista} />
            </Dialogo>
          )}
        </div>
      </div>
      <div className="pie">
        <div className="pie__acciones">
          <Boton icono="pista" aria-expanded={pistaVisible} onClick={() => setPistaVisible(!pistaVisible)}>
            Pista
          </Boton>
          {todo ? (
            <>
              <Boton soloIcono icono="pianoroll" aria-label="Abrir el piano roll" onClick={() => setEditando(true)} />
              <Boton className="crece" variante="primario" disabled={entregando} onClick={() => void entregar()}>
                {textoDeEntrega}
              </Boton>
            </>
          ) : (
            <Boton className="crece" variante="primario" icono="pianoroll" onClick={() => setEditando(true)}>
              {borrador ? 'Seguir componiendo' : 'Abrir el piano roll'}
            </Boton>
          )}
        </div>
      </div>
    </>,
  )
}
