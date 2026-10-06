import type { ReactNode } from 'react'
import type { Paso } from '../contenido/tipos.ts'
import { Analisis } from './Analisis.tsx'
import { Capas } from './Capas.tsx'
import { Composicion } from './Composicion.tsx'
import { Construccion } from './Construccion.tsx'
import { Oido } from './Oido.tsx'
import { PasoDeTeoria } from './PasoDeTeoria.tsx'
import { Ritmo } from './Ritmo.tsx'
import { type ResultadoDePaso, SIN_PREGUNTAS } from './tipos.ts'

interface Props {
  paso: Paso
  /** El paso dentro de la lección, «m00.u01.l08#5»: identifica su borrador. */
  clave: string
  leccion: string
  /** Pinta la pantalla de la lección alrededor del paso. Los pasos de componer solo la usan para el enunciado. */
  envoltorio: (contenido: ReactNode) => ReactNode
  alTerminar: (resultado: ResultadoDePaso) => void
}

/** Elige el componente de cada tipo de paso. */
export function VistaDePaso({ paso, clave, leccion, envoltorio, alTerminar }: Props) {
  switch (paso.tipo) {
    case 'teoria':
      return envoltorio(<PasoDeTeoria paso={paso} alTerminar={() => alTerminar(SIN_PREGUNTAS)} />)
    case 'oido':
      return envoltorio(<Oido paso={paso} alTerminar={alTerminar} />)
    case 'ritmo':
      return envoltorio(<Ritmo paso={paso} alTerminar={alTerminar} />)
    case 'construccion':
      return envoltorio(<Construccion paso={paso} alTerminar={alTerminar} />)
    case 'analisis':
      return envoltorio(<Analisis paso={paso} alTerminar={alTerminar} />)
    case 'capas':
      return envoltorio(<Capas paso={paso} alTerminar={alTerminar} />)
    case 'pianoroll':
    case 'encargo':
      return <Composicion paso={paso} clave={clave} leccion={leccion} envoltorio={envoltorio} alTerminar={alTerminar} />
  }
}
