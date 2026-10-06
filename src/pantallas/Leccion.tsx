import { use, useEffect } from 'react'
import { leerLeccion } from '../app/contenido.ts'
import { navegar } from '../app/rutas.ts'
import { sonar } from '../audio/audio.ts'
import type { Paso } from '../contenido/tipos.ts'
import { Analisis } from '../ejercicios/Analisis.tsx'
import { Capas } from '../ejercicios/Capas.tsx'
import { Construccion } from '../ejercicios/Construccion.tsx'
import { Oido } from '../ejercicios/Oido.tsx'
import { PasoDeTeoria } from '../ejercicios/PasoDeTeoria.tsx'
import { PasoPendiente } from '../ejercicios/PasoPendiente.tsx'
import { Ritmo } from '../ejercicios/Ritmo.tsx'
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

function vistaDe(paso: Paso, alTerminar: () => void) {
  if (paso.tipo === 'teoria') return <PasoDeTeoria paso={paso} alTerminar={alTerminar} />
  // El resultado del paso todavía no se guarda: el progreso se enlaza con la lección en el paso B5.
  if (paso.tipo === 'oido') return <Oido paso={paso} alTerminar={() => alTerminar()} />
  if (paso.tipo === 'ritmo') return <Ritmo paso={paso} alTerminar={() => alTerminar()} />
  if (paso.tipo === 'construccion') return <Construccion paso={paso} alTerminar={() => alTerminar()} />
  if (paso.tipo === 'analisis') return <Analisis paso={paso} alTerminar={() => alTerminar()} />
  if (paso.tipo === 'capas') return <Capas paso={paso} alTerminar={() => alTerminar()} />
  return <PasoPendiente paso={paso} alTerminar={alTerminar} />
}

function Completada({ titulo, alSalir }: { titulo: string; alSalir: () => void }) {
  useEffect(() => {
    sonar('completar')
  }, [])
  return (
    <>
      <div className="pantalla__cuerpo leccion-completada">
        <Emblema ancho={96} />
        <h2 className="titulo">Lección completada</h2>
        <p className="suave">{titulo}</p>
        <Marco rotulo="Tramo A">
          <p>El registro del progreso, la experiencia y el repaso espaciado se construyen en el Tramo B: de momento, esta lección no queda guardada.</p>
        </Marco>
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

  const salir = (): void => navegar({ pantalla: 'mundo', id: mundo }, { reemplazar: true })
  // Los pasos no se apilan en el historial: «atrás» sale de la lección en vez de retroceder un paso.
  const siguiente = (): void => {
    // El paso nuevo se empieza a leer desde arriba.
    window.scrollTo(0, 0)
    navegar({ pantalla: 'leccion', id, paso: numero + 1 }, { reemplazar: true })
  }

  return (
    <main className="pantalla pantalla--leccion" key={numero}>
      <Cabecera antes={<Boton variante="fantasma" soloIcono icono="cerrar" sonido="atras" aria-label="Salir de la lección" onClick={salir} />}>
        <Avance total={total} actual={numero} />
        <span className="cabecera__dato" aria-hidden="true">
          {Math.min(numero, total)}/{total}
        </span>
      </Cabecera>
      <h1 className="solo-lectores">{leccion.titulo}</h1>
      {actual ? vistaDe(actual, siguiente) : <Completada titulo={leccion.titulo} alSalir={salir} />}
    </main>
  )
}
