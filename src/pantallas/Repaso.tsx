import { type ReactNode, Suspense, use, useMemo, useState } from 'react'
import { leerConceptos, leerIndice, leerLeccion } from '../app/contenido.ts'
import { navegar } from '../app/rutas.ts'
import { usePantallaCompleta } from '../app/ventanas.ts'
import { sonar } from '../audio/audio.ts'
import type { Concepto, Leccion, Paso } from '../contenido/tipos.ts'
import { VistaDePaso } from '../ejercicios/VistaDePaso.tsx'
import type { ResultadoDePaso } from '../ejercicios/tipos.ts'
import { type EjercicioDeRepaso, leerPaso, proximoRepaso, sesionDeRepaso } from '../progreso/agenda.ts'
import type { ConceptoRepasado, Recompensa } from '../progreso/operaciones.ts'
import { cargarProgreso, useProgreso } from '../progreso/progreso.ts'
import { Avance } from '../ui/Avance.tsx'
import { Boton } from '../ui/Boton.tsx'
import { Cabecera } from '../ui/Cabecera.tsx'
import { Icono } from '../ui/Icono.tsx'
import { Marco } from '../ui/Marco.tsx'

/** Minutos que se calculan por ejercicio de repaso, para anunciar cuánto dura la sesión. */
const MINUTOS_POR_EJERCICIO = 1
/** Conceptos de un repaso adelantado: uno corto, porque nada corre prisa. */
const REPASO_ADELANTADO = 4

function fechaDe(fecha: Date): string {
  return fecha.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
}

interface EjercicioListo extends EjercicioDeRepaso {
  datos: Paso
}

/** Una sesión en marcha: un ejercicio tras otro y, al final, lo que se ha ganado. */
function Sesion({ ejercicios, lecciones, conceptos, alSalir }: { ejercicios: readonly EjercicioDeRepaso[]; lecciones: Promise<Leccion[]>; conceptos: readonly Concepto[]; alSalir: () => void }) {
  usePantallaCompleta()
  const leidas = use(lecciones)
  // Los pasos se buscan en las lecciones ya descargadas. Si alguno ya no existe (el curso ha cambiado), se salta.
  const listos = useMemo(
    () =>
      ejercicios.flatMap((e): EjercicioListo[] => {
        const donde = leerPaso(e.paso)
        const datos = donde ? leidas.find((l) => l.id === donde.leccion)?.pasos[donde.indice] : undefined
        return datos ? [{ ...e, datos }] : []
      }),
    [ejercicios, leidas],
  )
  const [actual, setActual] = useState(0)
  const [hechos, setHechos] = useState<ConceptoRepasado[]>([])
  const [recompensa, setRecompensa] = useState<Recompensa>()
  const [fallo, setFallo] = useState(false)
  const nombreDe = (id: string): string => conceptos.find((c) => c.id === id)?.nombre ?? id

  const terminar = (resultado: ResultadoDePaso): void => {
    const ejercicio = listos[actual]
    if (!ejercicio) return
    const todos = [...hechos, { concepto: ejercicio.concepto, paso: ejercicio.paso, resultado }]
    setHechos(todos)
    window.scrollTo(0, 0)
    if (actual + 1 < listos.length) {
      setActual(actual + 1)
      return
    }
    setActual(listos.length)
    sonar('completar')
    useProgreso
      .getState()
      .registrarRepaso(todos)
      .then(setRecompensa)
      .catch((error: unknown) => {
        console.warn('No se ha podido registrar el repaso', error)
        setFallo(true)
      })
  }

  const ejercicio = listos[actual]
  const envoltorio = (contenido: ReactNode): ReactNode => (
    <main className="pantalla pantalla--leccion">
      <Cabecera antes={<Boton variante="fantasma" soloIcono icono="cerrar" sonido="atras" aria-label="Salir del repaso" onClick={alSalir} />}>
        <Avance total={listos.length} actual={Math.min(actual + 1, listos.length)} />
        <span className="cabecera__dato" aria-hidden="true">
          {Math.min(actual + 1, listos.length)}/{listos.length}
        </span>
      </Cabecera>
      <h1 className="solo-lectores">Repaso</h1>
      {ejercicio && <p className="etiqueta repaso__concepto">Repasas: {nombreDe(ejercicio.concepto)}</p>}
      {contenido}
    </main>
  )

  if (ejercicio) {
    // La clave hace que cada ejercicio empiece de cero, aunque dos seguidos sean del mismo tipo.
    return <VistaDePaso key={actual} paso={ejercicio.datos} clave={ejercicio.paso} leccion={leerPaso(ejercicio.paso)?.leccion ?? ''} envoltorio={envoltorio} alTerminar={terminar} />
  }

  return envoltorio(
    <>
      <div className="pantalla__cuerpo leccion-completada">
        <h2 className="titulo">Repaso hecho</h2>
        {listos.length === 0 ? (
          <p>Los ejercicios de este repaso ya no están en el curso. Vuelve otro día.</p>
        ) : (
          <Marco rotulo="Resultado">
            <div className="pila pila--junta">
              <ul className="repaso__lista">
                {hechos.map((h) => {
                  const bien = h.resultado.total === 0 || h.resultado.aciertos === h.resultado.total
                  return (
                    <li key={h.concepto} className={bien ? 'repaso__fila repaso__fila--bien' : 'repaso__fila'}>
                      <Icono nombre={bien ? 'acierto' : 'fallo'} />
                      <span className="crece">{nombreDe(h.concepto)}</span>
                      <span className="etiqueta">{bien ? 'A la primera' : 'Con fallos: volverá antes'}</span>
                    </li>
                  )
                })}
              </ul>
              {recompensa && (
                <dl className="recompensa">
                  <dt>Experiencia</dt>
                  <dd className="dato">+{recompensa.xp}</dd>
                </dl>
              )}
              {recompensa && recompensa.nivelDespues > recompensa.nivelAntes && (
                <p>
                  <strong>Subes al nivel {recompensa.nivelDespues}.</strong>
                </p>
              )}
            </div>
          </Marco>
        )}
        {fallo && (
          <p className="nota-al-pie" role="alert">
            No se ha podido guardar el repaso: este dispositivo no deja guardar el progreso.
          </p>
        )}
      </div>
      <div className="pie">
        <Boton variante="primario" bloque sonido="atras" onClick={alSalir}>
          Terminar
        </Boton>
      </div>
    </>,
  )
}

/** Lecciones que hay que descargar para unos ejercicios, todas a la vez. */
function leccionesDe(ejercicios: readonly EjercicioDeRepaso[]): Promise<Leccion[]> {
  const ids = [...new Set(ejercicios.flatMap((e) => leerPaso(e.paso)?.leccion ?? []))]
  return Promise.all(ids.map((id) => leerLeccion(id)))
}

/**
 * Repaso espaciado: cada día, los conceptos que tocan según FSRS, cada uno con
 * un ejercicio de una lección ya hecha. Si hoy no toca nada, lo dice y deja
 * repasar igualmente lo que antes vaya a tocar.
 */
export function Repaso() {
  const indice = use(leerIndice())
  const conceptos = use(leerConceptos())
  use(cargarProgreso())
  const tarjetas = useProgreso((p) => p.tarjetas)
  const lecciones = useProgreso((p) => p.lecciones)
  const [ahora] = useState(() => new Date())
  const [sesion, setSesion] = useState<{ ejercicios: EjercicioDeRepaso[]; lecciones: Promise<Leccion[]> }>()

  // La elección al azar del ejercicio de cada concepto se hace una vez al abrir la pantalla.
  const [azar] = useState(() => {
    const semilla = Math.random()
    return () => semilla
  })
  const propuestas = useMemo(() => {
    const datos = { tarjetas, conceptos, indice, completadas: new Set(Object.keys(lecciones)), ahora, azar }
    return { hoy: sesionDeRepaso(datos), igualmente: sesionDeRepaso({ ...datos, aunqueNoToque: true }) }
  }, [tarjetas, conceptos, indice, lecciones, ahora, azar])

  const empezar = (ejercicios: EjercicioDeRepaso[]): void => setSesion({ ejercicios, lecciones: leccionesDe(ejercicios) })

  if (sesion) {
    return (
      <Suspense
        fallback={
          <main className="pantalla">
            <div className="pantalla__cuerpo estado-vacio">
              <p className="etiqueta" role="status">
                Preparando el repaso…
              </p>
            </div>
          </main>
        }
      >
        <Sesion ejercicios={sesion.ejercicios} lecciones={sesion.lecciones} conceptos={conceptos} alSalir={() => setSesion(undefined)} />
      </Suspense>
    )
  }

  const { hoy, igualmente } = propuestas
  const nombres = hoy.map((e) => conceptos.find((c) => c.id === e.concepto)?.nombre ?? e.concepto)
  const proximo = proximoRepaso(tarjetas, ahora)
  const sinTarjetas = Object.keys(tarjetas).length === 0
  let accion: ReactNode = null
  if (hoy.length > 0) {
    accion = (
      <Boton variante="primario" bloque icono="reproducir" onClick={() => empezar(hoy)}>
        Empezar
      </Boton>
    )
  } else if (sinTarjetas) {
    accion = (
      <Boton variante="primario" bloque icono="mapa" onClick={() => navegar({ pantalla: 'mapa' })}>
        Ir al mapa
      </Boton>
    )
  } else if (igualmente.length > 0) {
    accion = (
      <Boton bloque icono="repaso" onClick={() => empezar(igualmente.slice(0, REPASO_ADELANTADO))}>
        Repasar igualmente
      </Boton>
    )
  }

  return (
    <main className="pantalla">
      <Cabecera titulo="Repaso" />
      <div className="pantalla__cuerpo pila pila--amplia">
        {hoy.length > 0 ? (
          <Marco rotulo="Repaso de hoy">
            <div className="pila">
              <p>
                {hoy.length === 1 ? 'Toca repasar un concepto' : `Tocan ${hoy.length} conceptos`}, unos {Math.max(2, hoy.length * MINUTOS_POR_EJERCICIO)} minutos. Lo que sale mal vuelve antes; lo que sale bien tarda más en volver.
              </p>
              <ul className="repaso__lista">
                {nombres.map((nombre, i) => (
                  <li key={hoy[i]?.concepto ?? nombre} className="repaso__fila">
                    <Icono nombre="repaso" />
                    <span className="crece">{nombre}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Marco>
        ) : sinTarjetas ? (
          <div className="estado-vacio">
            <Icono nombre="repaso" lado={48} className="repaso__icono" />
            <h2 className="titulo">Aún no hay nada que repasar</h2>
            <p>Cada lección que completes deja aquí sus conceptos. El repaso te los devuelve justo cuando empiezas a olvidarlos.</p>
          </div>
        ) : (
          <div className="estado-vacio">
            <Icono nombre="acierto" lado={48} className="repaso__icono" />
            <h2 className="titulo">Hoy no toca repasar nada</h2>
            <p>{proximo ? `El próximo repaso, el ${fechaDe(proximo)}.` : 'Lo que has estudiado está fresco.'}</p>
            {igualmente.length > 0 && <p className="suave">Si quieres, puedes repasar ya lo que antes va a tocar. Contará como un repaso adelantado.</p>}
          </div>
        )}
      </div>
      {accion && <div className="pie">{accion}</div>}
    </main>
  )
}
