import { type ReactNode, use, useMemo, useState } from 'react'
import { leerIndice, leerPrueba } from '../app/contenido.ts'
import { useEstadoDelCurso } from '../app/progreso.ts'
import { navegar } from '../app/rutas.ts'
import { usePantallaCompleta } from '../app/ventanas.ts'
import { sonar } from '../audio/audio.ts'
import type { BloqueDePrueba } from '../contenido/tipos.ts'
import { VistaDePaso } from '../ejercicios/VistaDePaso.tsx'
import type { ResultadoDePaso } from '../ejercicios/tipos.ts'
import type { Recompensa } from '../progreso/operaciones.ts'
import { useProgreso } from '../progreso/progreso.ts'
import { Avance } from '../ui/Avance.tsx'
import { Boton } from '../ui/Boton.tsx'
import { Cabecera } from '../ui/Cabecera.tsx'
import { Dialogo } from '../ui/Dialogo.tsx'
import { Icono } from '../ui/Icono.tsx'
import { Marco } from '../ui/Marco.tsx'

/** Cómo ha ido un bloque ya hecho. */
interface BloqueHecho {
  unidad: string
  aciertos: number
  total: number
  superado: boolean
}

function porcentaje(proporcion: number): string {
  return `${Math.round(proporcion * 100)} %`
}

interface PropsDeRecorrido {
  bloques: readonly BloqueDePrueba[]
  tituloDe: (unidad: string) => string
  alTerminar: (hechos: BloqueHecho[]) => void
  alSalir: () => void
}

/**
 * La prueba en marcha: los bloques uno tras otro, cada uno con sus ejercicios.
 * Tras cada bloque se dice si la unidad queda dada por sabida; al primero que
 * no se supera, la prueba termina, porque por ahí se empieza.
 */
function Recorrido({ bloques, tituloDe, alTerminar, alSalir }: PropsDeRecorrido) {
  usePantallaCompleta()
  const [bloque, setBloque] = useState(0)
  const [paso, setPaso] = useState(0)
  const [cuenta, setCuenta] = useState({ aciertos: 0, total: 0 })
  const [hechos, setHechos] = useState<BloqueHecho[]>([])
  const [balance, setBalance] = useState<BloqueHecho>()
  const actual = bloques[bloque]

  const terminarPaso = (resultado: ResultadoDePaso): void => {
    if (!actual) return
    const nueva = { aciertos: cuenta.aciertos + resultado.aciertos, total: cuenta.total + resultado.total }
    window.scrollTo(0, 0)
    if (paso + 1 < actual.pasos.length) {
      setCuenta(nueva)
      setPaso(paso + 1)
      return
    }
    // Un bloque sin nada que acertar (no debería haberlo) se da por superado.
    const proporcion = nueva.total > 0 ? nueva.aciertos / nueva.total : 1
    const hecho = { unidad: actual.unidad, ...nueva, superado: proporcion >= actual.aprobado }
    setHechos([...hechos, hecho])
    setBalance(hecho)
    sonar(hecho.superado ? 'acierto' : 'fallo')
  }

  const siguienteBloque = (): void => {
    setBalance(undefined)
    setBloque(bloque + 1)
    setPaso(0)
    setCuenta({ aciertos: 0, total: 0 })
    window.scrollTo(0, 0)
  }

  const envoltorio = (contenido: ReactNode): ReactNode => (
    <main className="pantalla pantalla--leccion">
      <Cabecera antes={<Boton variante="fantasma" soloIcono icono="cerrar" sonido="atras" aria-label="Salir de la prueba" onClick={alSalir} />}>
        <Avance total={actual?.pasos.length ?? 1} actual={balance ? (actual?.pasos.length ?? 1) : paso + 1} />
        <span className="cabecera__dato">
          {bloque + 1}/{bloques.length}
        </span>
      </Cabecera>
      <h1 className="solo-lectores">Prueba de nivel</h1>
      {actual && <p className="etiqueta repaso__concepto">Prueba de nivel · {tituloDe(actual.unidad)}</p>}
      {contenido}
    </main>
  )

  if (balance) {
    const quedan = bloque + 1 < bloques.length
    return envoltorio(
      <>
        <div className="pantalla__cuerpo pila">
          <Dialogo tipo={balance.superado ? 'acierto' : 'fallo'} rotulo={balance.superado ? 'Superada' : 'No superada'}>
            <div className="pila pila--junta">
              <p>
                <strong>{tituloDe(balance.unidad)}</strong> · {balance.aciertos} de {balance.total} a la primera
                {balance.total > 0 && ` (${porcentaje(balance.aciertos / balance.total)})`}.
              </p>
              <p>
                {balance.superado
                  ? 'Esta unidad queda dada por sabida: sus lecciones se abren y la siguiente unidad también.'
                  : `Hacía falta el ${porcentaje(actual?.aprobado ?? 0.8)}. Empieza por esta unidad: lo que ya sabes irá rápido.`}
              </p>
            </div>
          </Dialogo>
        </div>
        <div className="pie">
          <div className="pie__acciones">
            {balance.superado && quedan ? (
              <>
                <Boton onClick={() => alTerminar(hechos)}>Terminar aquí</Boton>
                <Boton className="crece" variante="primario" onClick={siguienteBloque}>
                  Seguir
                </Boton>
              </>
            ) : (
              <Boton variante="primario" bloque onClick={() => alTerminar(hechos)}>
                Ver el resultado
              </Boton>
            )}
          </div>
        </div>
      </>,
    )
  }

  const ejercicio = actual?.pasos[paso]
  if (!actual || !ejercicio) return null
  // La clave hace que cada ejercicio empiece de cero, aunque dos seguidos sean del mismo tipo.
  return <VistaDePaso key={`${bloque}-${paso}`} paso={ejercicio} clave={`prueba#${bloque + 1}.${paso + 1}`} leccion={actual.unidad} envoltorio={envoltorio} alTerminar={terminarPaso} />
}

/**
 * Prueba de nivel: para quien ya sabe algo de música, un bloque de ejercicios
 * por unidad. Superar un bloque da su unidad por sabida (superarUnidades) y
 * abre sus lecciones. Se saltan los bloques de lo que ya está hecho.
 */
export function Prueba() {
  const prueba = use(leerPrueba())
  const indice = use(leerIndice())
  const estado = useEstadoDelCurso()
  const [enMarcha, setEnMarcha] = useState(false)
  const [resultado, setResultado] = useState<{ hechos: BloqueHecho[]; recompensa: Recompensa | undefined; fallo: boolean }>()

  const titulos = useMemo(() => new Map(indice.mundos.flatMap((m) => m.unidades.map((u) => [u.id, u.titulo] as const))), [indice])
  const tituloDe = (unidad: string): string => titulos.get(unidad) ?? unidad
  // Lo terminado (o ya dado por sabido) no se vuelve a examinar. Se fija al empezar: superar un bloque no cambia la lista en marcha.
  const terminadas = useMemo(() => new Set(estado.flatMap((m) => m.unidades).filter((u) => u.acceso === 'completado' || u.superada).map((u) => u.id)), [estado])
  const [pendientes, setPendientes] = useState<BloqueDePrueba[]>([])
  const porHacer = prueba.filter((b) => !terminadas.has(b.unidad) && b.pasos.length > 0)

  const empezar = (): void => {
    setPendientes(porHacer)
    setResultado(undefined)
    setEnMarcha(true)
  }

  const terminar = (hechos: BloqueHecho[]): void => {
    setEnMarcha(false)
    const superadas = hechos.filter((h) => h.superado).map((h) => h.unidad)
    setResultado({ hechos, recompensa: undefined, fallo: false })
    if (superadas.length === 0) return
    sonar('completar')
    useProgreso
      .getState()
      .superarUnidades(superadas)
      .then((recompensa) => setResultado({ hechos, recompensa, fallo: false }))
      .catch((error: unknown) => {
        console.warn('No se ha podido guardar la prueba de nivel', error)
        setResultado({ hechos, recompensa: undefined, fallo: true })
      })
  }

  if (enMarcha) return <Recorrido bloques={pendientes} tituloDe={tituloDe} alTerminar={terminar} alSalir={() => setEnMarcha(false)} />

  const salir = <Boton variante="fantasma" soloIcono icono="atras" sonido="atras" aria-label="Volver al mapa" onClick={() => navegar({ pantalla: 'mapa' })} />

  if (resultado) {
    const superadas = resultado.hechos.filter((h) => h.superado)
    return (
      <main className="pantalla">
        <Cabecera titulo="Prueba de nivel" antes={salir} />
        <div className="pantalla__cuerpo pila pila--amplia">
          <Marco rotulo="Resultado">
            <div className="pila pila--junta">
              <ul className="repaso__lista">
                {resultado.hechos.map((h) => (
                  <li key={h.unidad} className={h.superado ? 'repaso__fila repaso__fila--bien' : 'repaso__fila'}>
                    <Icono nombre={h.superado ? 'acierto' : 'fallo'} />
                    <span className="crece">{tituloDe(h.unidad)}</span>
                    <span className="etiqueta">{h.superado ? 'Dada por sabida' : 'Por aquí empiezas'}</span>
                  </li>
                ))}
              </ul>
              {resultado.recompensa && (
                <dl className="recompensa">
                  <dt>Experiencia</dt>
                  <dd className="dato">+{resultado.recompensa.xp}</dd>
                </dl>
              )}
              {superadas.length === 0 && <p>Ninguna unidad dada por sabida: empieza por el principio. Las primeras lecciones irán rápido.</p>}
            </div>
          </Marco>
          {resultado.fallo && (
            <p className="nota-al-pie" role="alert">
              No se ha podido guardar el resultado: este dispositivo no deja guardar el progreso.
            </p>
          )}
        </div>
        <div className="pie">
          <Boton variante="primario" bloque icono="mapa" onClick={() => navegar({ pantalla: 'mapa' })}>
            Ir al mapa
          </Boton>
        </div>
      </main>
    )
  }

  return (
    <main className="pantalla">
      <Cabecera titulo="Prueba de nivel" antes={salir} />
      <div className="pantalla__cuerpo pila pila--amplia">
        {prueba.length === 0 ? (
          <div className="estado-vacio">
            <h2 className="titulo">La prueba aún no está lista</h2>
            <p>Llegará con el contenido del curso. Mientras, empieza por la primera lección: si ya sabes lo que cuenta, irá rápido.</p>
          </div>
        ) : porHacer.length === 0 ? (
          <div className="estado-vacio">
            <Icono nombre="acierto" lado={48} className="repaso__icono" />
            <h2 className="titulo">Nada que examinar</h2>
            <p>Todas las unidades de la prueba están ya hechas o dadas por sabidas.</p>
          </div>
        ) : (
          <Marco rotulo="Antes de empezar">
            <div className="pila">
              <p>Si ya sabes algo de música, sáltate lo que dominas. Hay un bloque de ejercicios por unidad: si lo superas, la unidad queda dada por sabida y se abren sus lecciones.</p>
              <p className="suave">Al primer bloque que no superes, la prueba termina: por ahí empiezas. Puedes salir cuando quieras sin que cuente nada.</p>
              <ol className="repaso__lista">
                {porHacer.map((b) => (
                  <li key={b.unidad} className="repaso__fila">
                    <Icono nombre="estrella" />
                    <span className="crece">{tituloDe(b.unidad)}</span>
                    <span className="etiqueta">
                      {b.pasos.length} {b.pasos.length === 1 ? 'ejercicio' : 'ejercicios'}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </Marco>
        )}
      </div>
      <div className="pie">
        {porHacer.length > 0 ? (
          <Boton variante="primario" bloque icono="reproducir" onClick={empezar}>
            Empezar la prueba
          </Boton>
        ) : (
          <Boton variante="primario" bloque icono="mapa" onClick={() => navegar({ pantalla: 'mapa' })}>
            Ir al mapa
          </Boton>
        )}
      </div>
    </main>
  )
}
