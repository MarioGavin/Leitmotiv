import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PasoCapas } from '../contenido/tipos.ts'
import { Marco } from '../ui/Marco.tsx'
import { ProsaVista } from '../ui/ProsaVista.tsx'
import { AvisoDeSonido, BotonDeEscucha } from '../ui/musica/EjemploSonoro.tsx'
import { VistaDePieza } from '../ui/musica/VistaDePieza.tsx'
import { useReproductor } from '../ui/musica/useReproductor.ts'
import { Cuestionario, type PreguntaDeCuestionario } from './Cuestionario.tsx'
import type { MomentoDeCuestionario, PropsDePaso } from './tipos.ts'

const CUANDO: Readonly<Record<PasoCapas['transicion']['cuando'], string>> = {
  inmediato: 'en el acto',
  tiempo: 'en el siguiente pulso',
  compas: 'al empezar el siguiente compás',
  seccion: 'al acabar la sección',
}

/**
 * Mezcla por capas: una música que cambia según lo que pasa en el juego. Cada
 * respuesta es un estado de juego; al marcarla, la música pasa a ese estado
 * (entran y salen capas, o cambia la sección que se repite), así que se
 * responde escuchando.
 */
export function Capas({ paso, alTerminar }: PropsDePaso<PasoCapas>) {
  // Suena el último estado que se haya marcado; al principio, el primero.
  const [sonando, setSonando] = useState(0)
  const alCambiar = useCallback((momento: MomentoDeCuestionario) => {
    if (momento.eleccion !== undefined) setSonando(momento.eleccion)
  }, [])
  const reproduccion = useReproductor(paso.pieza, { bucle: true })
  const { fijarCapas, irASeccion } = reproduccion
  const estado = paso.estados[sonando]
  const conSecciones = paso.estados.some((e) => e.seccion !== undefined)

  useEffect(() => {
    if (!estado) return
    fijarCapas(estado.capas, { cuando: paso.transicion.cuando, fundido: paso.transicion.fundido })
    if (conSecciones) irASeccion(estado.seccion, paso.transicion.cuando)
  }, [estado, conSecciones, fijarCapas, irASeccion, paso.transicion])

  const preguntas = useMemo(
    () =>
      paso.situaciones.map(
        (situacion): PreguntaDeCuestionario => ({
          texto: <ProsaVista prosa={situacion.texto} />,
          opciones: paso.estados.map((e) => e.nombre),
          correcta: Math.max(
            0,
            paso.estados.findIndex((e) => e.id === situacion.estado),
          ),
          explicacion: <ProsaVista prosa={situacion.porque} />,
        }),
      ),
    [paso],
  )

  const apagadas = useMemo(() => new Set(paso.pieza.pistas.filter((p) => p.capa !== undefined && !estado?.capas.includes(p.capa)).map((p) => p.id)), [paso.pieza, estado])

  return (
    <Cuestionario
      enunciado={paso.enunciado}
      pista={paso.pista}
      explicacion={paso.explicacion}
      preguntas={preguntas}
      alTerminar={alTerminar}
      alCambiar={alCambiar}
      etiqueta="Estados de juego"
      apoyo={
        <div className="pila pila--junta">
          <Marco variante="hundido" relleno="ninguno" plano>
            <VistaDePieza pieza={paso.pieza} posicion={reproduccion.posicion} sonando={reproduccion.estado === 'sonando'} apagadas={apagadas} />
          </Marco>
          <ul className="capas" aria-label={`Capas que suenan en «${estado?.nombre ?? ''}»`}>
            {Object.entries(paso.capas).map(([id, nombre]) => {
              const suena = estado?.capas.includes(id) ?? false
              return (
                <li key={id} className={suena ? 'capa capa--suena' : 'capa'}>
                  <span className="capa__luz" aria-hidden="true" />
                  {nombre}
                  <span className="solo-lectores">{suena ? ': suena' : ': callada'}</span>
                </li>
              )
            })}
          </ul>
          <BotonDeEscucha reproduccion={reproduccion} className="escucha" icono="escuchar" />
          <AvisoDeSonido reproduccion={reproduccion} />
          <p className="suave nota-al-pie">
            Marca una respuesta para oír ese estado. El cambio entra {CUANDO[paso.transicion.cuando]}
            {conSecciones && estado?.seccion !== undefined ? ', y la música pasa a repetir su sección' : ''}.
          </p>
        </div>
      }
    />
  )
}
