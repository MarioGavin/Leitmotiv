import { useMemo, useState } from 'react'
import { useAjustes } from '../app/ajustes.ts'
import type { PasoOido, OidoPreguntas as PasoOidoPreguntas } from '../contenido/tipos.ts'
import { type PasoOidoGenerado, generarPreguntas } from '../musica/oido.ts'
import { ProsaEnLinea, ProsaVista } from '../ui/ProsaVista.tsx'
import { Cuestionario, type PreguntaDeCuestionario } from './Cuestionario.tsx'
import type { PropsDePaso } from './tipos.ts'

/** Ejercicio de oído con las preguntas escritas en la lección: suena un fragmento y hay que elegir la respuesta. */
function OidoEscrito({ paso, alTerminar }: PropsDePaso<PasoOidoPreguntas>) {
  const preguntas = useMemo(
    () =>
      paso.preguntas.map(
        (p): PreguntaDeCuestionario => ({
          pieza: p.pieza,
          opciones: p.opciones.map((opcion, i) => <ProsaEnLinea key={i} prosa={opcion} />),
          correcta: p.correcta,
          ...(p.explicacion ? { explicacion: <ProsaVista prosa={p.explicacion} /> } : {}),
        }),
      ),
    [paso],
  )
  return <Cuestionario enunciado={paso.enunciado} pista={paso.pista} explicacion={paso.explicacion} preguntas={preguntas} alTerminar={alTerminar} />
}

/**
 * Ejercicio de oído cuyas preguntas se generan al momento: intervalos,
 * acordes, progresiones, escalas, timbres, contornos y compases. Cada vez que
 * se entra salen preguntas distintas.
 */
function OidoGenerado({ paso, alTerminar }: PropsDePaso<PasoOidoGenerado>) {
  const nomenclatura = useAjustes((a) => a.nomenclatura)
  // Se generan una vez, al montar: volver a pintar no puede cambiar las preguntas a media tanda.
  const [preguntas] = useState(() =>
    generarPreguntas(paso, nomenclatura, Math.random).map(
      (p): PreguntaDeCuestionario => ({
        pieza: p.pieza,
        opciones: p.opciones,
        correcta: p.correcta,
        explicacion: <p>{p.explicacion}</p>,
      }),
    ),
  )
  return <Cuestionario enunciado={paso.enunciado} pista={paso.pista} explicacion={paso.explicacion} preguntas={preguntas} alTerminar={alTerminar} />
}

/** Ejercicio de oído, en cualquiera de sus modos. */
export function Oido({ paso, alTerminar }: PropsDePaso<PasoOido>) {
  if (paso.modo === 'preguntas') return <OidoEscrito paso={paso} alTerminar={alTerminar} />
  return <OidoGenerado paso={paso} alTerminar={alTerminar} />
}
