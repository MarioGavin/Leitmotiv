import { useEffect, useMemo, useRef, useState } from 'react'
import { useAjustes } from '../app/ajustes.ts'
import { sonar } from '../audio/audio.ts'
import type { ConstruccionAcorde, ConstruccionMelodia, ConstruccionSecciones, PasoConstruccion } from '../contenido/tipos.ts'
import { conAcorde, conFragmento } from '../musica/construccion.ts'
import { cifradoVisible, nombreVisible, notaDeMidi } from '../musica/notas.ts'
import type { Nota, Pieza } from '../musica/pieza.ts'
import { barajarSecciones, ordenCorrecto, piezaDeSeccion, reordenar } from '../musica/secciones.ts'
import { alteracionesDe, leerTonalidad } from '../musica/tonalidad.ts'
import { Boton } from '../ui/Boton.tsx'
import { Dialogo } from '../ui/Dialogo.tsx'
import { Marco } from '../ui/Marco.tsx'
import { ProsaVista } from '../ui/ProsaVista.tsx'
import { Audicion } from '../ui/musica/Audicion.tsx'
import { AvisoDeSonido } from '../ui/musica/EjemploSonoro.tsx'
import { VistaDePieza } from '../ui/musica/VistaDePieza.tsx'
import { useReproductor } from '../ui/musica/useReproductor.ts'
import { Cuestionario, type PreguntaDeCuestionario } from './Cuestionario.tsx'
import { MOMENTO_INICIAL, type PropsDePaso } from './tipos.ts'

/** Las notas de un fragmento, por su nombre y en el orden en que suenan: «Fa♯5 – Mi5». Las simultáneas van unidas con «+». */
function nombrarNotas(notas: readonly Nota[], pieza: Pieza, nomenclatura: 'latina' | 'anglosajona'): string {
  let alteraciones: 'sostenidos' | 'bemoles' = 'sostenidos'
  try {
    if (pieza.tonalidad) alteraciones = alteracionesDe(leerTonalidad(pieza.tonalidad))
  } catch {
    alteraciones = 'sostenidos'
  }
  const porInicio = new Map<number, number[]>()
  for (const nota of notas) porInicio.set(nota.t, [...(porInicio.get(nota.t) ?? []), nota.n])
  return [...porInicio.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, alturas]) =>
      alturas
        .sort((a, b) => a - b)
        .map((n) => nombreVisible(notaDeMidi(n, alteraciones), nomenclatura))
        .join('+'),
    )
    .join(' – ')
}

/**
 * Construcción guiada con un hueco: falta un fragmento de la melodía o un
 * acorde y hay que elegir cuál encaja. Al marcar una opción se ve en la pieza
 * y se puede escuchar cómo queda antes de responder.
 */
function ElegirParaElHueco({ paso, alTerminar }: PropsDePaso<ConstruccionMelodia | ConstruccionAcorde>) {
  const nomenclatura = useAjustes((a) => a.nomenclatura)
  const [momento, setMomento] = useState(MOMENTO_INICIAL)
  const preguntas = useMemo((): PreguntaDeCuestionario[] => {
    const opciones = paso.modo === 'completar-melodia' ? paso.opciones.map((o) => nombrarNotas(o.notas, paso.pieza, nomenclatura)) : paso.opciones.map((o) => cifradoVisible(o.acorde))
    return [
      {
        opciones,
        correcta: paso.opciones.flatMap((o, i) => (o.correcta ? [i] : [])),
        porque: paso.opciones.map((o, i) => <ProsaVista key={i} prosa={o.porque} />),
      },
    ]
  }, [paso, nomenclatura])
  const pieza = useMemo(() => {
    const elegida = momento.eleccion
    if (paso.modo === 'completar-melodia') return conFragmento(paso.pieza, paso.hueco.pista, elegida === undefined ? [] : (paso.opciones[elegida]?.notas ?? []))
    return conAcorde(paso.pieza, paso.hueco, elegida === undefined ? undefined : paso.opciones[elegida]?.acorde)
  }, [paso, momento.eleccion])
  return (
    <Cuestionario
      enunciado={paso.enunciado}
      pista={paso.pista}
      explicacion={paso.explicacion}
      preguntas={preguntas}
      alTerminar={alTerminar}
      alCambiar={setMomento}
      barajar
      etiqueta={paso.modo === 'completar-melodia' ? 'Fragmentos para el hueco' : 'Acordes para el hueco'}
      apoyo={<Audicion pieza={pieza} resaltado={paso.hueco} bucle={false} />}
    />
  )
}

type Escucha = { que: 'todo' } | { que: 'seccion'; id: string }

/**
 * Construcción guiada con las secciones desordenadas: hay que ponerlas en el
 * orden en que suenan en la pieza. Cada fragmento se puede escuchar suelto, y
 * el conjunto, en el orden que se lleve puesto.
 */
function OrdenarSecciones({ paso, alTerminar }: PropsDePaso<ConstruccionSecciones>) {
  const [orden, setOrden] = useState(() => barajarSecciones(paso.pieza, Math.random))
  // Los fragmentos se numeran según salen barajados: el número no dice nada de su sitio.
  const [numeros] = useState(() => new Map(orden.map((id, i) => [id, i + 1])))
  const [escucha, setEscucha] = useState<Escucha>({ que: 'todo' })
  const [peticion, setPeticion] = useState(0)
  const [intentos, setIntentos] = useState(0)
  const [fase, setFase] = useState<'ordenando' | 'fallo' | 'acierto'>('ordenando')
  const [pistaVisible, setPistaVisible] = useState(false)
  const respuesta = useRef<HTMLDivElement>(null)

  const pieza = useMemo(() => {
    if (escucha.que === 'todo') return reordenar(paso.pieza, orden)
    const seccion = (paso.pieza.secciones ?? []).find((s) => s.id === escucha.id)
    return seccion ? piezaDeSeccion(paso.pieza, seccion) : reordenar(paso.pieza, orden)
  }, [paso.pieza, orden, escucha])
  const reproduccion = useReproductor(pieza, { bucle: false })
  const { reproducir, detener } = reproduccion

  // Se pide sonar después de cambiar lo que hay que oír: para entonces el reproductor ya tiene la pieza nueva.
  useEffect(() => {
    if (peticion > 0) reproducir()
  }, [peticion, reproducir])

  useEffect(() => {
    if (fase !== 'ordenando' || pistaVisible) respuesta.current?.scrollIntoView({ block: 'nearest' })
  }, [fase, pistaVisible])

  const escuchar = (nueva: Escucha): void => {
    const laMisma = nueva.que === escucha.que && (nueva.que === 'todo' || (escucha.que === 'seccion' && nueva.id === escucha.id))
    if (laMisma && (reproduccion.estado === 'sonando' || reproduccion.estado === 'cargando')) {
      detener()
      return
    }
    setEscucha(nueva)
    setPeticion((n) => n + 1)
  }

  const mover = (posicion: number, salto: -1 | 1): void => {
    const destino = posicion + salto
    if (destino < 0 || destino >= orden.length) return
    const nuevo = [...orden]
    ;[nuevo[posicion], nuevo[destino]] = [nuevo[destino] as string, nuevo[posicion] as string]
    detener()
    sonar('cursor')
    setOrden(nuevo)
    setEscucha({ que: 'todo' })
    setFase('ordenando')
  }

  const comprobar = (): void => {
    detener()
    setPistaVisible(false)
    setIntentos(intentos + 1)
    if (ordenCorrecto(paso.pieza, orden)) {
      sonar('acierto')
      setFase('acierto')
    } else {
      sonar('fallo')
      setFase('fallo')
    }
  }

  const sonandoAhora = reproduccion.estado === 'sonando' || reproduccion.estado === 'cargando'
  const enSuSitio = (paso.pieza.secciones ?? []).filter((s, i) => {
    const puesta = (paso.pieza.secciones ?? []).find((x) => x.id === orden[i])
    return puesta !== undefined && ordenCorrecto({ ...paso.pieza, secciones: [s] }, [puesta.id])
  }).length

  return (
    <>
      <div className="pantalla__cuerpo pila">
        <div className="enunciado">
          <ProsaVista prosa={paso.enunciado} className="enunciado__texto" />
        </div>
        <Marco variante="hundido" relleno="ninguno" plano>
          <VistaDePieza pieza={pieza} posicion={reproduccion.posicion} sonando={reproduccion.estado === 'sonando'} />
        </Marco>
        <AvisoDeSonido reproduccion={reproduccion} />
        <Marco relleno="ninguno">
          <ol className="orden" aria-label="Fragmentos, en el orden en que sonarán">
            {orden.map((id, i) => {
              const suena = sonandoAhora && escucha.que === 'seccion' && escucha.id === id
              return (
                <li key={id} className="orden__fila">
                  <span className="orden__puesto" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className="orden__nombre">Fragmento {numeros.get(id)}</span>
                  <Boton soloIcono icono={suena ? 'detener' : 'escuchar'} sonido={null} aria-label={suena ? `Parar el fragmento ${numeros.get(id)}` : `Escuchar el fragmento ${numeros.get(id)}`} onClick={() => escuchar({ que: 'seccion', id })} />
                  <Boton soloIcono icono="subir" sonido={null} disabled={i === 0 || fase === 'acierto'} aria-label={`Subir el fragmento ${numeros.get(id)}`} onClick={() => mover(i, -1)} />
                  <Boton soloIcono icono="bajar" sonido={null} disabled={i === orden.length - 1 || fase === 'acierto'} aria-label={`Bajar el fragmento ${numeros.get(id)}`} onClick={() => mover(i, 1)} />
                </li>
              )
            })}
          </ol>
        </Marco>
        <div className="respuesta" ref={respuesta}>
          {pistaVisible && fase === 'ordenando' && (
            <Dialogo tipo="pista" rotulo="Pista">
              <ProsaVista prosa={paso.pista} />
            </Dialogo>
          )}
          {fase === 'fallo' && (
            <Dialogo tipo="fallo" rotulo="Todavía no">
              <p>
                {enSuSitio === 0 ? 'Ningún fragmento está en su sitio.' : enSuSitio === 1 ? 'Hay un fragmento en su sitio.' : `Hay ${enSuSitio} fragmentos en su sitio.`} Escucha cómo queda y vuelve a probar.
              </p>
            </Dialogo>
          )}
          {fase === 'acierto' && (
            <Dialogo tipo="acierto" rotulo="Correcto">
              <ProsaVista prosa={paso.explicacion} />
            </Dialogo>
          )}
        </div>
      </div>
      <div className="pie">
        <div className="pie__acciones">
          {fase === 'acierto' ? (
            // Acertar a la primera cuenta entero; cada intento de más, menos.
            <Boton variante="primario" bloque onClick={() => alTerminar({ aciertos: 1, total: intentos })}>
              Continuar
            </Boton>
          ) : (
            <>
              <Boton icono="pista" aria-label="Pista" aria-expanded={pistaVisible} soloIcono onClick={() => setPistaVisible(!pistaVisible)} />
              <Boton icono={sonandoAhora && escucha.que === 'todo' ? 'detener' : 'reproducir'} sonido={null} onClick={() => escuchar({ que: 'todo' })}>
                {sonandoAhora && escucha.que === 'todo' ? 'Parar' : 'Escuchar'}
              </Boton>
              <Boton className="crece" variante="primario" sonido={null} onClick={comprobar}>
                Comprobar
              </Boton>
            </>
          )}
        </div>
      </div>
    </>
  )
}

/** Ejercicio de construcción guiada, en cualquiera de sus modos. */
export function Construccion({ paso, alTerminar }: PropsDePaso<PasoConstruccion>) {
  if (paso.modo === 'ordenar-secciones') return <OrdenarSecciones paso={paso} alTerminar={alTerminar} />
  return <ElegirParaElHueco paso={paso} alTerminar={alTerminar} />
}
