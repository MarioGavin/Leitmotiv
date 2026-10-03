import type { Paso } from '../contenido/tipos.ts'
import { Boton } from '../ui/Boton.tsx'
import { Marco } from '../ui/Marco.tsx'
import { ProsaVista } from '../ui/ProsaVista.tsx'

interface Props {
  paso: Paso
  alTerminar: () => void
}

const NOMBRES: Readonly<Record<Paso['tipo'], string>> = {
  teoria: 'teoría',
  oido: 'oído',
  ritmo: 'ritmo',
  construccion: 'construcción guiada',
  pianoroll: 'piano roll',
  analisis: 'análisis',
  capas: 'mezcla por capas',
  encargo: 'encargo de compositor',
}

/**
 * Paso cuyo tipo de ejercicio todavía no está construido. Muestra el enunciado
 * real y deja saltarlo, sin fingir que funciona. Desaparece al acabar el Tramo B.
 */
export function PasoPendiente({ paso, alTerminar }: Props) {
  return (
    <>
      <div className="pantalla__cuerpo pila">
        {'enunciado' in paso && <ProsaVista prosa={paso.enunciado} className="enunciado__texto" />}
        <Marco rotulo="En construcción">
          <p>
            Este paso es un ejercicio de <strong>{NOMBRES[paso.tipo]}</strong>. Ese tipo de ejercicio se construye en el Tramo B, después de elegir la dirección
            visual.
          </p>
        </Marco>
      </div>
      <div className="pie">
        <Boton variante="primario" bloque onClick={alTerminar}>
          Saltar este paso
        </Boton>
      </div>
    </>
  )
}
