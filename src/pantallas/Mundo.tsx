import { use } from 'react'
import { leerIndice } from '../app/contenido.ts'
import { navegar } from '../app/rutas.ts'
import { sonar } from '../audio/audio.ts'
import { Boton } from '../ui/Boton.tsx'
import { Cabecera } from '../ui/Cabecera.tsx'
import { Icono } from '../ui/Icono.tsx'
import { Marco } from '../ui/Marco.tsx'
import { ProsaVista } from '../ui/ProsaVista.tsx'

interface Props {
  /** «m00». */
  id: string
}

/** Un mundo por dentro: sus unidades y, en cada una, la lista de lecciones. */
export function Mundo({ id }: Props) {
  const indice = use(leerIndice())
  const mundo = indice.mundos.find((m) => m.id === id)
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
        <ProsaVista prosa={mundo.descripcion} />
        {mundo.unidades.map((unidad, i) => (
          <Marco key={unidad.id} como="section" relleno="ninguno" rotulo={`Unidad ${i + 1}`} aria-label={unidad.titulo}>
            <div className="unidad__cabecera">
              <h2 className="subtitulo">{unidad.titulo}</h2>
              <p className="suave nota-al-pie">{unidad.objetivo}</p>
            </div>
            {unidad.lecciones.length === 0 ? (
              <p className="unidad__vacia suave">Sin lecciones todavía.</p>
            ) : (
              <ol className="lecciones">
                {unidad.lecciones.map((leccion, k) => (
                  <li key={leccion.id}>
                    <a
                      className="leccion-enlace"
                      href={`#/leccion/${leccion.id}/1`}
                      onClick={() => {
                        sonar('aceptar')
                      }}
                    >
                      <span className="leccion-enlace__numero" aria-hidden="true">
                        {k + 1}
                      </span>
                      <span className="leccion-enlace__texto">
                        <span className="leccion-enlace__titulo">{leccion.titulo}</span>
                        <span className="leccion-enlace__resumen">{leccion.resumen}</span>
                      </span>
                      <span className="leccion-enlace__duracion">{leccion.minutos} min</span>
                      <Icono nombre="adelante" />
                    </a>
                  </li>
                ))}
              </ol>
            )}
            {unidad.borrador && unidad.lecciones.length > 0 && (
              <p className="unidad__vacia suave">Unidad en construcción: faltan {8 - unidad.lecciones.length} lecciones.</p>
            )}
          </Marco>
        ))}
      </div>
    </main>
  )
}
