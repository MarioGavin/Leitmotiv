import { use } from 'react'
import { leerGlosario } from '../app/contenido.ts'
import { navegar } from '../app/rutas.ts'
import { Cabecera } from '../ui/Cabecera.tsx'
import { EditorDePiano } from '../ui/musica/EditorDePiano.tsx'

/** Término del glosario cuyo ejemplo se abre como pieza de prueba. */
const PIEZA_DE_PRUEBA = 'bucle'

/**
 * Piano roll. Mientras no exista el repertorio (paso B6 del Tramo B) abre una
 * pieza de prueba, el ejemplo de «bucle» del glosario, y lo editado no se guarda.
 */
export function PianoRoll() {
  const glosario = use(leerGlosario())
  const ejemplo = glosario.find((t) => t.id === PIEZA_DE_PRUEBA)?.ejemplo
  if (!ejemplo) {
    return (
      <main className="pantalla">
        <Cabecera titulo="Piano roll" />
        <div className="pantalla__cuerpo">
          <p>No se ha encontrado la pieza de prueba.</p>
        </div>
      </main>
    )
  }
  return (
    <EditorDePiano
      inicial={ejemplo}
      alCambiar={() => undefined}
      titulo={ejemplo.titulo ?? 'Pieza de prueba'}
      salida={{ etiqueta: 'Volver al repertorio', accion: () => navegar({ pantalla: 'repertorio' }) }}
      libre
    />
  )
}
