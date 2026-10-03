import { useEffect, useRef, useState } from 'react'
import { audioActivo, sonar } from '../audio/audio.ts'
import type { OidoPreguntas as PasoOidoPreguntas } from '../contenido/tipos.ts'
import { Boton } from '../ui/Boton.tsx'
import { Dialogo } from '../ui/Dialogo.tsx'
import { Marco } from '../ui/Marco.tsx'
import { Opciones } from '../ui/Opciones.tsx'
import { ProsaEnLinea, ProsaVista } from '../ui/ProsaVista.tsx'
import { AvisoDeSonido, BotonDeEscucha } from '../ui/musica/EjemploSonoro.tsx'
import { useReproductor } from '../ui/musica/useReproductor.ts'

interface Props {
  paso: PasoOidoPreguntas
  alTerminar: () => void
}

type Fase = 'pregunta' | 'acierto' | 'fallo'

/**
 * Ejercicio de oído con preguntas: suena un fragmento y hay que elegir la
 * respuesta. La pregunta fallada vuelve a salir al final de la tanda.
 */
export function OidoPreguntas({ paso, alTerminar }: Props) {
  // Cola de preguntas pendientes: las falladas se añaden otra vez al final (una sola vez cada una).
  const [cola, setCola] = useState(() => paso.preguntas.map((_, i) => i))
  const [turno, setTurno] = useState(0)
  const [repetidas, setRepetidas] = useState<ReadonlySet<number>>(() => new Set())
  const [eleccion, setEleccion] = useState<number>()
  const [fase, setFase] = useState<Fase>('pregunta')
  const [pistaVisible, setPistaVisible] = useState(false)
  const respuesta = useRef<HTMLDivElement>(null)

  const indice = cola[turno] ?? 0
  const pregunta = paso.preguntas[indice]
  const reproduccion = useReproductor(pregunta?.pieza, { bucle: false })
  const { reproducir } = reproduccion

  // Cada pregunta suena sola al aparecer, si el audio ya está en marcha.
  useEffect(() => {
    if (audioActivo()) reproducir()
    // `turno` no se usa dentro, pero es lo que dispara el efecto: una pregunta repetida seguida también debe sonar.
    // oxlint-disable-next-line react/exhaustive-deps
  }, [reproducir, turno])

  // La pista y la corrección aparecen debajo de las opciones: se traen a la vista.
  useEffect(() => {
    if (fase !== 'pregunta' || pistaVisible) respuesta.current?.scrollIntoView({ block: 'nearest' })
  }, [fase, pistaVisible])

  if (!pregunta) return null
  const ultima = turno >= cola.length - 1 && !(fase === 'fallo' && !repetidas.has(indice))

  const comprobar = (): void => {
    if (eleccion === undefined) return
    reproduccion.detener()
    setPistaVisible(false)
    if (eleccion === pregunta.correcta) {
      sonar('acierto')
      setFase('acierto')
    } else {
      sonar('fallo')
      setFase('fallo')
    }
  }

  const seguir = (): void => {
    let pendientes = cola
    if (fase === 'fallo' && !repetidas.has(indice)) {
      pendientes = [...cola, indice]
      setCola(pendientes)
      setRepetidas(new Set(repetidas).add(indice))
    }
    if (turno >= pendientes.length - 1) {
      alTerminar()
      return
    }
    setTurno(turno + 1)
    setEleccion(undefined)
    setFase('pregunta')
  }

  const correcta = pregunta.opciones[pregunta.correcta]

  return (
    <>
      <div className="pantalla__cuerpo pila">
        <div className="enunciado">
          <ProsaVista prosa={paso.enunciado} className="enunciado__texto" />
          {cola.length > 1 && (
            <p className="etiqueta">
              Pregunta {turno + 1} de {cola.length}
            </p>
          )}
        </div>
        <BotonDeEscucha reproduccion={reproduccion} className="escucha" icono="escuchar" />
        <AvisoDeSonido reproduccion={reproduccion} />
        <Marco relleno="ninguno">
          <Opciones
            etiqueta="Respuestas"
            valor={eleccion}
            alElegir={setEleccion}
            bloqueadas={fase !== 'pregunta'}
            opciones={pregunta.opciones.map((opcion, i) => ({
              valor: i,
              contenido: <ProsaEnLinea prosa={opcion} />,
              ...(fase !== 'pregunta' && i === pregunta.correcta ? { estado: 'correcta' as const } : {}),
              ...(fase === 'fallo' && i === eleccion ? { estado: 'incorrecta' as const } : {}),
            }))}
          />
        </Marco>
        <div className="respuesta" ref={respuesta}>
          {pistaVisible && fase === 'pregunta' && (
            <Dialogo tipo="pista" rotulo="Pista">
              <ProsaVista prosa={paso.pista} />
            </Dialogo>
          )}
          {fase === 'acierto' && (
            <Dialogo tipo="acierto" rotulo="Correcto">
              <ProsaVista prosa={pregunta.explicacion ?? paso.explicacion} />
            </Dialogo>
          )}
          {fase === 'fallo' && (
            <Dialogo tipo="fallo" rotulo="Fallo">
              <div className="pila pila--junta">
                {correcta && (
                  <p>
                    La respuesta era <strong>«{<ProsaEnLinea prosa={correcta} />}»</strong>.
                  </p>
                )}
                {pregunta.explicacion && <ProsaVista prosa={pregunta.explicacion} />}
                <ProsaVista prosa={paso.explicacion} />
                {!repetidas.has(indice) && <p className="suave nota-al-pie">Esta pregunta volverá a salir al final.</p>}
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
