import { use } from 'react'
import { leerIndice } from '../app/contenido.ts'
import { useEstadoDelCurso, useFicha } from '../app/progreso.ts'
import { navegar } from '../app/rutas.ts'
import { sonar } from '../audio/audio.ts'
import type { ResumenDeLeccion } from '../contenido/tipos.ts'
import { type AccesoDeLeccion, type EstadoDeUnidad, siguienteLeccion } from '../progreso/desbloqueo.ts'
import { Boton } from '../ui/Boton.tsx'
import { Cabecera } from '../ui/Cabecera.tsx'
import { FichaDelJugador } from '../ui/FichaDelJugador.tsx'
import { Icono } from '../ui/Icono.tsx'
import { Marco } from '../ui/Marco.tsx'
import { ProsaVista } from '../ui/ProsaVista.tsx'

interface Props {
  /** «m00». */
  id: string
}

/** Cómo va una unidad, en una línea. */
function situacionDeUnidad(unidad: EstadoDeUnidad | undefined): string | undefined {
  if (!unidad || unidad.total === 0) return undefined
  if (unidad.acceso === 'bloqueado') return 'Termina la unidad anterior para abrirla.'
  if (unidad.superada && unidad.hechas < unidad.total) return 'Dada por sabida en la prueba de nivel.'
  return `${unidad.hechas} de ${unidad.total} hechas`
}

interface PropsDeFila {
  leccion: ResumenDeLeccion
  numero: number
  acceso: AccesoDeLeccion
  /** Es la siguiente que toca en el curso. */
  siguiente: boolean
}

/** Una lección de la lista: un enlace si se puede abrir; si no, una fila apagada con candado. */
function FilaDeLeccion({ leccion, numero, acceso, siguiente }: PropsDeFila) {
  const texto = (
    <>
      <span className="leccion-enlace__numero" aria-hidden="true">
        {numero}
      </span>
      <span className="leccion-enlace__texto">
        <span className="leccion-enlace__titulo">{leccion.titulo}</span>
        <span className="leccion-enlace__resumen">{leccion.resumen}</span>
      </span>
    </>
  )

  if (acceso === 'bloqueada') {
    return (
      <div className="leccion-enlace leccion-enlace--bloqueada">
        {texto}
        <span className="leccion-enlace__duracion">{leccion.minutos} min</span>
        <Icono nombre="candado" titulo="Bloqueada" />
      </div>
    )
  }

  const clases = ['leccion-enlace']
  if (acceso === 'completada') clases.push('leccion-enlace--hecha')
  if (siguiente) clases.push('leccion-enlace--siguiente')
  return (
    <a className={clases.join(' ')} href={`#/leccion/${leccion.id}/1`} onClick={() => sonar('aceptar')}>
      {texto}
      {acceso === 'completada' ? (
        <>
          <span className="leccion-enlace__duracion">Hecha</span>
          <Icono nombre="acierto" />
        </>
      ) : (
        <>
          <span className="leccion-enlace__duracion">
            {leccion.minutos} min{siguiente && <span className="solo-lectores">, la siguiente</span>}
          </span>
          <Icono nombre={siguiente ? 'cursor' : 'adelante'} />
        </>
      )}
    </a>
  )
}

/** Un mundo por dentro: sus unidades y, en cada una, la lista de lecciones. */
export function Mundo({ id }: Props) {
  const indice = use(leerIndice())
  const estado = useEstadoDelCurso()
  const ficha = useFicha()
  const mundo = indice.mundos.find((m) => m.id === id)
  const delMundo = estado.find((m) => m.id === id)
  const siguiente = siguienteLeccion(estado)
  const volver = <Boton variante="fantasma" soloIcono icono="atras" sonido="atras" aria-label="Volver al mapa" onClick={() => navegar({ pantalla: 'mapa' })} />

  if (!mundo) {
    return (
      <main className="pantalla">
        <Cabecera titulo="Mundo desconocido" antes={volver} />
        <div className="pantalla__cuerpo">
          <p>Este mundo no existe. Vuelve al mapa y elige otro.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="pantalla">
      <Cabecera titulo={mundo.titulo} antes={volver} />
      <div className="pantalla__cuerpo pila pila--amplia">
        <FichaDelJugador ficha={ficha} />
        {delMundo?.acceso === 'bloqueado' && <p className="nota-al-pie">Este mundo se abre al terminar el anterior.</p>}
        <ProsaVista prosa={mundo.descripcion} />
        {mundo.unidades.map((unidad, i) => {
          const deUnidad = delMundo?.unidades.find((u) => u.id === unidad.id)
          const situacion = situacionDeUnidad(deUnidad)
          return (
            <Marco key={unidad.id} como="section" relleno="ninguno" rotulo={`Unidad ${i + 1}`} aria-label={unidad.titulo}>
              <div className="unidad__cabecera">
                <h2 className="subtitulo">{unidad.titulo}</h2>
                <p className="suave nota-al-pie">{unidad.objetivo}</p>
                {situacion !== undefined && <p className="etiqueta unidad__situacion">{situacion}</p>}
              </div>
              {unidad.lecciones.length === 0 ? (
                <p className="unidad__vacia suave">Sin lecciones todavía.</p>
              ) : (
                <ol className="lecciones">
                  {unidad.lecciones.map((leccion, k) => (
                    <li key={leccion.id}>
                      <FilaDeLeccion
                        leccion={leccion}
                        numero={k + 1}
                        acceso={deUnidad?.lecciones.find((l) => l.id === leccion.id)?.acceso ?? 'disponible'}
                        siguiente={leccion.id === siguiente}
                      />
                    </li>
                  ))}
                </ol>
              )}
              {unidad.borrador && unidad.lecciones.length > 0 && (
                <p className="unidad__vacia suave">Unidad en construcción: faltan {8 - unidad.lecciones.length} lecciones.</p>
              )}
            </Marco>
          )
        })}
      </div>
    </main>
  )
}
