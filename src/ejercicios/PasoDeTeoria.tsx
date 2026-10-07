import type { PasoTeoria } from '../contenido/tipos.ts'
import { Boton } from '../ui/Boton.tsx'
import { Marco } from '../ui/Marco.tsx'
import { ProsaVista } from '../ui/ProsaVista.tsx'
import { BotonDeEscucha, EjemploSonoro } from '../ui/musica/EjemploSonoro.tsx'
import { useReproductor } from '../ui/musica/useReproductor.ts'

interface Props {
  paso: PasoTeoria
  alTerminar: () => void
}

/**
 * Paso de teoría: un texto corto y, casi siempre, un ejemplo que se oye y se
 * manipula. El botón de escuchar va abajo, junto al de continuar, para que
 * esté siempre a mano aunque el texto sea largo.
 */
export function PasoDeTeoria({ paso, alTerminar }: Props) {
  const reproduccion = useReproductor(paso.ejemplo)
  return (
    <>
      <div className="pantalla__cuerpo pila">
        <Marco>
          <div className="pila">
            {paso.titulo !== undefined && <h2 className="subtitulo">{paso.titulo}</h2>}
            <ProsaVista prosa={paso.texto} />
          </div>
        </Marco>
        {paso.ejemplo && <EjemploSonoro pieza={paso.ejemplo} reproduccion={reproduccion} manipulable={paso.manipulable} vista={paso.vista} />}
      </div>
      <div className="pie">
        <div className="pie__acciones">
          {paso.ejemplo && <BotonDeEscucha reproduccion={reproduccion} />}
          <Boton className="crece" variante="primario" onClick={alTerminar}>
            Continuar
          </Boton>
        </div>
      </div>
    </>
  )
}
