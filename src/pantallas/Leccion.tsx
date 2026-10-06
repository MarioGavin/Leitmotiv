import { type ReactNode, use, useEffect, useRef, useState } from 'react'
import { leerLeccion } from '../app/contenido.ts'
import { navegar } from '../app/rutas.ts'
import { sonar } from '../audio/audio.ts'
import type { Leccion as DatosDeLeccion } from '../contenido/tipos.ts'
import { VistaDePaso } from '../ejercicios/VistaDePaso.tsx'
import type { ResultadoDePaso } from '../ejercicios/tipos.ts'
import type { RecompensaDeLeccion } from '../progreso/operaciones.ts'
import { useProgreso } from '../progreso/progreso.ts'
import { Avance } from '../ui/Avance.tsx'
import { Boton } from '../ui/Boton.tsx'
import { Cabecera } from '../ui/Cabecera.tsx'
import { Emblema } from '../ui/Emblema.tsx'
import { Marco } from '../ui/Marco.tsx'

interface Props {
  /** «m00.u01.l02». */
  id: string
  /** Paso que se muestra, desde 1. Uno más que el último es la pantalla de lección completada. */
  paso: number
}

type Resultados = Record<string, ResultadoDePaso>

function Completada({ leccion, resultados, alSalir }: { leccion: DatosDeLeccion; resultados: Readonly<Resultados>; alSalir: () => void }) {
  const [recompensa, setRecompensa] = useState<RecompensaDeLeccion>()
  const [fallo, setFallo] = useState(false)
  const carga = useProgreso((p) => p.carga)
  // En modo estricto los efectos se ejecutan dos veces: la lección no puede contarse dos.
  const registrada = useRef(false)

  useEffect(() => {
    sonar('completar')
    if (registrada.current) return
    registrada.current = true
    useProgreso
      .getState()
      .completarLeccion({ id: leccion.id, conEncargo: leccion.pasos.some((p) => p.tipo === 'encargo'), conceptos: resultados })
      .then(setRecompensa)
      .catch((error: unknown) => {
        console.warn('No se ha podido registrar la lección', error)
        setFallo(true)
      })
  }, [leccion, resultados])

  return (
    <>
      <div className="pantalla__cuerpo leccion-completada">
        <Emblema ancho={96} />
        <h2 className="titulo">Lección completada</h2>
        <p className="suave">{leccion.titulo}</p>
        {recompensa ? (
          <Marco rotulo="Recompensa">
            <div className="pila pila--junta">
              <dl className="recompensa">
                <dt>Experiencia</dt>
                <dd className="dato">+{recompensa.xp}</dd>
                {recompensa.total > 0 && (
                  <>
                    <dt>A la primera</dt>
                    <dd className="dato">
                      {recompensa.aciertos} de {recompensa.total}
                    </dd>
                  </>
                )}
              </dl>
              {recompensa.nivelDespues > recompensa.nivelAntes && (
                <p>
                  <strong>Subes al nivel {recompensa.nivelDespues}.</strong>
                </p>
              )}
              {!recompensa.primeraVez && <p className="suave">Ya la habías completado: repetirla da menos experiencia, pero refuerza el repaso.</p>}
            </div>
          </Marco>
        ) : (
          !fallo && (
            <p className="etiqueta" role="status">
              Guardando…
            </p>
          )
        )}
        {(fallo || carga === 'sin-guardar') && (
          <p className="nota-al-pie" role="alert">
            Este dispositivo no deja guardar el progreso: se perderá al cerrar la app.
          </p>
        )}
      </div>
      <div className="pie">
        <Boton variante="primario" bloque sonido="atras" onClick={alSalir}>
          Volver al mundo
        </Boton>
      </div>
    </>
  )
}

/** Una lección en marcha: un paso cada vez, con el avance arriba y las acciones abajo. */
export function Leccion({ id, paso }: Props) {
  const leccion = use(leerLeccion(id))
  const total = leccion.pasos.length
  const numero = Math.min(paso, total + 1)
  const actual = leccion.pasos[numero - 1]
  const mundo = id.slice(0, 3)
  // Cómo va cada concepto en esta pasada. Vive mientras la lección está abierta: si se recarga a medias, la cuenta empieza de cero.
  const [resultados, setResultados] = useState<Resultados>({})

  const salir = (): void => navegar({ pantalla: 'mundo', id: mundo }, { reemplazar: true })
  // Los pasos no se apilan en el historial: «atrás» sale de la lección en vez de retroceder un paso.
  const siguiente = (resultado: ResultadoDePaso): void => {
    if (actual && resultado.total > 0) {
      // La teoría no lleva concepto propio; el resto de los pasos, sí (el compilador pone el de la lección si no lo dice).
      const concepto = 'concepto' in actual ? actual.concepto : leccion.conceptos[0]
      if (concepto !== undefined) {
        setResultados((anteriores) => {
          const previo = anteriores[concepto] ?? { aciertos: 0, total: 0 }
          return { ...anteriores, [concepto]: { aciertos: previo.aciertos + resultado.aciertos, total: previo.total + resultado.total } }
        })
      }
    }
    // El paso nuevo se empieza a leer desde arriba.
    window.scrollTo(0, 0)
    navegar({ pantalla: 'leccion', id, paso: numero + 1 }, { reemplazar: true })
  }

  const envoltorio = (contenido: ReactNode): ReactNode => (
    <main className="pantalla pantalla--leccion">
      <Cabecera antes={<Boton variante="fantasma" soloIcono icono="cerrar" sonido="atras" aria-label="Salir de la lección" onClick={salir} />}>
        <Avance total={total} actual={numero} />
        <span className="cabecera__dato" aria-hidden="true">
          {Math.min(numero, total)}/{total}
        </span>
      </Cabecera>
      <h1 className="solo-lectores">{leccion.titulo}</h1>
      {contenido}
    </main>
  )

  if (!actual) return envoltorio(<Completada leccion={leccion} resultados={resultados} alSalir={salir} />)
  // La clave hace que cada paso empiece de cero, aunque dos seguidos sean del mismo tipo.
  return <VistaDePaso key={numero} paso={actual} clave={`${id}#${numero}`} leccion={id} envoltorio={envoltorio} alTerminar={siguiente} />
}
