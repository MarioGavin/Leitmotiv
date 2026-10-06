import { useMemo, useState } from 'react'
import type { PasoAnalisis } from '../contenido/tipos.ts'
import { ticksPorCompas } from '../musica/tiempo.ts'
import { ProsaEnLinea, ProsaVista } from '../ui/ProsaVista.tsx'
import { Audicion } from '../ui/musica/Audicion.tsx'
import { Cuestionario, type PreguntaDeCuestionario } from './Cuestionario.tsx'
import { MOMENTO_INICIAL, type PropsDePaso } from './tipos.ts'

/**
 * Ejercicio de análisis: una pieza a la vista, que se puede escuchar las veces
 * que haga falta, y unas preguntas sobre ella. Si la pregunta se refiere a un
 * compás, ese compás se destaca.
 */
export function Analisis({ paso, alTerminar }: PropsDePaso<PasoAnalisis>) {
  const preguntas = useMemo(
    () =>
      paso.preguntas.map(
        (p): PreguntaDeCuestionario => ({
          texto: <ProsaVista prosa={p.pregunta} />,
          opciones: p.opciones.map((opcion, i) => <ProsaEnLinea key={i} prosa={opcion} />),
          correcta: p.correcta,
          ...(p.explicacion ? { explicacion: <ProsaVista prosa={p.explicacion} /> } : {}),
        }),
      ),
    [paso],
  )
  const [momento, setMomento] = useState(MOMENTO_INICIAL)
  const porCompas = ticksPorCompas(paso.pieza.compas)
  const compas = paso.preguntas[momento.indice]?.compas
  return (
    <Cuestionario
      enunciado={paso.enunciado}
      pista={paso.pista}
      explicacion={paso.explicacion}
      preguntas={preguntas}
      alTerminar={alTerminar}
      alCambiar={setMomento}
      apoyo={<Audicion pieza={paso.pieza} resaltado={compas === undefined ? undefined : { t: (compas - 1) * porCompas, d: porCompas }} />}
    />
  )
}
