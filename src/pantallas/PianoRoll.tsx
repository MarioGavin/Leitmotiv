import { use, useCallback, useEffect, useRef, useState } from 'react'
import { navegar } from '../app/rutas.ts'
import type { Pieza } from '../musica/pieza.ts'
import { piezaEnBlanco } from '../musica/plantilla.ts'
import { cargarProgreso, useProgreso } from '../progreso/progreso.ts'
import { Boton } from '../ui/Boton.tsx'
import { Cabecera } from '../ui/Cabecera.tsx'
import { EditorDePiano } from '../ui/musica/EditorDePiano.tsx'

/** Milisegundos sin tocar nada antes de guardar: guardar en cada nota sería escribir sin parar. */
const ESPERA_AL_GUARDAR = 800

/** Título de una pieza nueva hasta que se le ponga otro en las opciones. */
const TITULO_NUEVA = 'Pieza nueva'

interface PropsDeEditor {
  /** Pieza del repertorio que se abre; sin él, se empieza una nueva. */
  id: string | undefined
  /** Avisa de que la pieza nueva ya está en el repertorio, con su identificador. */
  alCrear: (id: string) => void
}

function Editor({ id, alCrear }: PropsDeEditor) {
  // Lo que había al abrir: los cambios posteriores del repertorio los ha hecho este mismo editor.
  const [guardada] = useState(() => (id === undefined ? undefined : useProgreso.getState().repertorio.find((p) => p.id === id)))
  const [inicial] = useState<Pieza>(() => guardada?.pieza ?? piezaEnBlanco({ titulo: TITULO_NUEVA }))
  const titulo = guardada?.titulo ?? TITULO_NUEVA
  const idGuardado = useRef(guardada?.id)
  const pendiente = useRef<{ temporizador: number; pieza: Pieza }>(undefined)
  // Las escrituras van de una en una: la primera de una pieza nueva le da su identificador a las siguientes.
  const cola = useRef<Promise<void>>(Promise.resolve())
  const montado = useRef(true)

  const guardarYa = useCallback(() => {
    const espera = pendiente.current
    if (!espera) return
    window.clearTimeout(espera.temporizador)
    pendiente.current = undefined
    cola.current = cola.current.then(async () => {
      const progreso = useProgreso.getState()
      const hecha = await progreso.guardarPieza({ ...(idGuardado.current === undefined ? {} : { id: idGuardado.current }), titulo: espera.pieza.titulo ?? titulo, pieza: espera.pieza })
      if (idGuardado.current === undefined) {
        idGuardado.current = hecha.id
        // Si se guarda al salir, ya no hay dirección que poner al día.
        if (montado.current) alCrear(hecha.id)
      }
    })
  }, [titulo, alCrear])

  // Al salir de la pantalla, o si el sistema esconde la app (en el móvil, cerrarla empieza así), no puede quedar nada sin guardar.
  useEffect(() => {
    montado.current = true
    const alEsconder = (): void => {
      if (document.visibilityState === 'hidden') guardarYa()
    }
    document.addEventListener('visibilitychange', alEsconder)
    window.addEventListener('pagehide', guardarYa)
    return () => {
      document.removeEventListener('visibilitychange', alEsconder)
      window.removeEventListener('pagehide', guardarYa)
      montado.current = false
      guardarYa()
    }
  }, [guardarYa])

  const alCambiar = useCallback(
    (nueva: Pieza) => {
      if (pendiente.current) window.clearTimeout(pendiente.current.temporizador)
      pendiente.current = { pieza: nueva, temporizador: window.setTimeout(guardarYa, ESPERA_AL_GUARDAR) }
    },
    [guardarYa],
  )

  if (id !== undefined && !guardada) {
    return (
      <main className="pantalla">
        <Cabecera titulo="Piano roll" antes={<Boton variante="fantasma" soloIcono icono="atras" sonido="atras" aria-label="Volver al repertorio" onClick={() => navegar({ pantalla: 'repertorio' })} />} />
        <div className="pantalla__cuerpo estado-vacio">
          <h2 className="titulo">Esta pieza no está</h2>
          <p>No se encuentra en tu repertorio: puede que la hayas borrado.</p>
          <Boton variante="primario" onClick={() => navegar({ pantalla: 'repertorio' })}>
            Volver al repertorio
          </Boton>
        </div>
      </main>
    )
  }

  return <EditorDePiano inicial={inicial} alCambiar={alCambiar} titulo={titulo} salida={{ etiqueta: 'Volver al repertorio', accion: () => navegar({ pantalla: 'repertorio' }) }} libre />
}

interface Props {
  id?: string | undefined
}

/**
 * El piano roll con una pieza de «Mi repertorio». Sin identificador, empieza
 * una pieza nueva, que entra en el repertorio con el primer cambio. Todo lo
 * que se edita se guarda solo, poco después de cada cambio y al salir.
 */
export function PianoRoll({ id }: Props) {
  use(cargarProgreso())
  // Al guardar por primera vez una pieza nueva, la dirección pasa a llevar su identificador; el editor sigue siendo el mismo.
  const [creada, setCreada] = useState<string>()
  const alCrear = useCallback((nuevo: string) => {
    setCreada(nuevo)
    navegar({ pantalla: 'pianoroll', id: nuevo }, { reemplazar: true })
  }, [])
  const abierta = id === undefined || id === creada ? 'nueva' : id
  return <Editor key={abierta} id={abierta === 'nueva' ? undefined : id} alCrear={alCrear} />
}
