import { type ReactNode, useEffect, useRef, useState } from 'react'
import { audioActivo, sonar } from '../audio/audio.ts'
import type { Prosa } from '../contenido/tipos.ts'
import type { Pieza } from '../musica/pieza.ts'
import { Boton } from '../ui/Boton.tsx'
import { Dialogo } from '../ui/Dialogo.tsx'
import { Marco } from '../ui/Marco.tsx'
import { Opciones } from '../ui/Opciones.tsx'
import { ProsaVista } from '../ui/ProsaVista.tsx'
import { AvisoDeSonido, BotonDeEscucha } from '../ui/musica/EjemploSonoro.tsx'
import { useReproductor } from '../ui/musica/useReproductor.ts'
import type { FaseDeCuestionario as Fase, MomentoDeCuestionario, ResultadoDePaso } from './tipos.ts'

export interface PreguntaDeCuestionario {
  /** Texto de la pregunta, si cada una tiene el suyo. */
  texto?: ReactNode
  /** Lo que suena con la pregunta. Si la hay, se oye sola al aparecer. */
  pieza?: Pieza
  opciones: ReactNode[]
  /** Posición de la opción correcta (o de las correctas, si valen varias). */
  correcta: number | readonly number[]
  /** Explicación propia de la pregunta: se muestra antes que la del paso. */
  explicacion?: ReactNode
  /** Por qué es correcta o no cada opción: se muestra el de la elegida. */
  porque?: ReactNode[]
}

interface Props {
  enunciado: Prosa
  pista: Prosa
  explicacion: Prosa
  preguntas: readonly PreguntaDeCuestionario[]
  alTerminar: (resultado: ResultadoDePaso) => void
  /** Lo que acompaña a la pregunta encima de las respuestas: la pieza a la vista, una mezcla que suena… */
  apoyo?: ReactNode
  /** Avisa de por dónde va el cuestionario, para que quien pinta el apoyo lo ponga al día. */
  alCambiar?: (momento: MomentoDeCuestionario) => void
  /** Nombre del grupo de respuestas para lectores de pantalla. */
  etiqueta?: string
  /** Baraja las opciones de cada pregunta al empezar, para que la correcta no esté siempre en el mismo sitio. */
  barajar?: boolean
}

function esCorrecta(pregunta: PreguntaDeCuestionario, opcion: number): boolean {
  return typeof pregunta.correcta === 'number' ? pregunta.correcta === opcion : pregunta.correcta.includes(opcion)
}

/**
 * La mecánica que comparten todos los ejercicios de elegir una respuesta:
 * se marca una opción, se comprueba, se explica y se sigue. Hay pista antes de
 * responder, explicación después, y la pregunta fallada vuelve a salir una vez
 * al final. El resultado cuenta lo acertado a la primera.
 */
export function Cuestionario({ enunciado, pista, explicacion, preguntas, alTerminar, apoyo, alCambiar, etiqueta = 'Respuestas', barajar = false }: Props) {
  // Orden en el que se muestran las opciones de cada pregunta. La elección se guarda siempre como posición original.
  const [orden] = useState(() =>
    preguntas.map((pregunta) => {
      const posiciones = pregunta.opciones.map((_, i) => i)
      if (!barajar) return posiciones
      for (let i = posiciones.length - 1; i > 0; i--) {
        const k = Math.floor(Math.random() * (i + 1))
        ;[posiciones[i], posiciones[k]] = [posiciones[k] as number, posiciones[i] as number]
      }
      return posiciones
    }),
  )
  // Cola de preguntas pendientes: las falladas se añaden otra vez al final (una sola vez cada una).
  const [cola, setCola] = useState(() => preguntas.map((_, i) => i))
  const [turno, setTurno] = useState(0)
  const [falladas, setFalladas] = useState<ReadonlySet<number>>(() => new Set())
  const [eleccion, setEleccion] = useState<number>()
  const [fase, setFase] = useState<Fase>('pregunta')
  const [pistaVisible, setPistaVisible] = useState(false)
  const respuesta = useRef<HTMLDivElement>(null)

  const indice = cola[turno] ?? 0
  const pregunta = preguntas[indice]
  const reproduccion = useReproductor(pregunta?.pieza, { bucle: false })
  const { reproducir } = reproduccion
  const conSonido = pregunta?.pieza !== undefined

  // Cada pregunta suena sola al aparecer, si el audio ya está en marcha.
  useEffect(() => {
    if (conSonido && audioActivo()) reproducir()
    // `turno` no se usa dentro, pero es lo que dispara el efecto: una pregunta repetida seguida también debe sonar.
    // oxlint-disable-next-line react/exhaustive-deps
  }, [reproducir, turno, conSonido])

  useEffect(() => {
    alCambiar?.({ indice, eleccion, fase })
  }, [alCambiar, indice, eleccion, fase])

  // La pista y la corrección aparecen debajo de las opciones: se traen a la vista.
  useEffect(() => {
    if (fase !== 'pregunta' || pistaVisible) respuesta.current?.scrollIntoView({ block: 'nearest' })
  }, [fase, pistaVisible])

  if (!pregunta) return null
  // Una pregunta fallada por primera vez vuelve a salir: aún no es la última.
  const volvera = fase === 'fallo' && cola.filter((i) => i === indice).length === 1
  const ultima = turno >= cola.length - 1 && !volvera

  const comprobar = (): void => {
    if (eleccion === undefined) return
    reproduccion.detener()
    setPistaVisible(false)
    if (esCorrecta(pregunta, eleccion)) {
      sonar('acierto')
      setFase('acierto')
    } else {
      sonar('fallo')
      setFase('fallo')
      setFalladas(new Set(falladas).add(indice))
    }
  }

  const seguir = (): void => {
    const pendientes = volvera ? [...cola, indice] : cola
    if (volvera) setCola(pendientes)
    if (turno >= pendientes.length - 1) {
      alTerminar({ aciertos: preguntas.length - falladas.size, total: preguntas.length })
      return
    }
    setTurno(turno + 1)
    setEleccion(undefined)
    setFase('pregunta')
  }

  const primeraCorrecta = typeof pregunta.correcta === 'number' ? pregunta.correcta : (pregunta.correcta[0] ?? 0)
  const porque = eleccion === undefined ? undefined : pregunta.porque?.[eleccion]

  return (
    <>
      <div className="pantalla__cuerpo pila">
        <div className="enunciado">
          <ProsaVista prosa={enunciado} className="enunciado__texto" />
          {cola.length > 1 && (
            <p className="etiqueta">
              Pregunta {turno + 1} de {cola.length}
            </p>
          )}
        </div>
        {conSonido && <BotonDeEscucha reproduccion={reproduccion} className="escucha" icono="escuchar" />}
        {conSonido && <AvisoDeSonido reproduccion={reproduccion} />}
        {apoyo}
        {pregunta.texto !== undefined && <div className="pregunta">{pregunta.texto}</div>}
        <Marco relleno="ninguno">
          <Opciones
            etiqueta={etiqueta}
            valor={eleccion}
            alElegir={setEleccion}
            bloqueadas={fase !== 'pregunta'}
            opciones={(orden[indice] ?? []).map((i) => ({
              valor: i,
              contenido: pregunta.opciones[i],
              // Tras comprobar se marca la correcta (la elegida, si lo era) y, si se ha fallado, también la elegida.
              ...(fase !== 'pregunta' && (fase === 'acierto' ? i === eleccion : i === primeraCorrecta) ? { estado: 'correcta' as const } : {}),
              ...(fase === 'fallo' && i === eleccion ? { estado: 'incorrecta' as const } : {}),
            }))}
          />
        </Marco>
        <div className="respuesta" ref={respuesta}>
          {pistaVisible && fase === 'pregunta' && (
            <Dialogo tipo="pista" rotulo="Pista">
              <ProsaVista prosa={pista} />
            </Dialogo>
          )}
          {fase === 'acierto' && (
            <Dialogo tipo="acierto" rotulo="Correcto">
              <div className="pila pila--junta">
                {porque}
                {pregunta.explicacion}
                {porque === undefined && pregunta.explicacion === undefined && <ProsaVista prosa={explicacion} />}
              </div>
            </Dialogo>
          )}
          {fase === 'fallo' && (
            <Dialogo tipo="fallo" rotulo="Fallo">
              <div className="pila pila--junta">
                {porque}
                <p>
                  La respuesta era <strong>«{pregunta.opciones[primeraCorrecta]}»</strong>.
                </p>
                {pregunta.explicacion}
                <ProsaVista prosa={explicacion} />
                {volvera && <p className="suave nota-al-pie">Esta pregunta volverá a salir al final.</p>}
              </div>
            </Dialogo>
          )}
        </div>
      </div>
      <div className="pie">
        <div className="pie__acciones">
          {fase === 'pregunta' ? (
            <>
              <Boton icono="pista" aria-expanded={pistaVisible} onClick={() => setPistaVisible(!pistaVisible)}>
                Pista
              </Boton>
              <Boton className="crece" variante="primario" sonido={null} disabled={eleccion === undefined} onClick={comprobar}>
                Comprobar
              </Boton>
            </>
          ) : (
            <Boton variante="primario" bloque onClick={seguir}>
              {ultima ? 'Continuar' : 'Siguiente pregunta'}
            </Boton>
          )}
        </div>
      </div>
    </>
  )
}
