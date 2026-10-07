import { Suspense, lazy, use, useEffect, useRef } from 'react'
import { leerGlosario } from '../app/contenido.ts'
import { useVentanas } from '../app/ventanas.ts'
import { Boton } from './Boton.tsx'
import { Marco } from './Marco.tsx'
import { ProsaVista } from './ProsaVista.tsx'

// El ejemplo sonoro arrastra el reproductor y la vista de la pieza: se descarga la primera vez que se abre un término que lo tiene.
const EjemploSuelto = lazy(() => import('./musica/EjemploSuelto.tsx').then((m) => ({ default: m.EjemploSuelto })))

function Definicion({ id }: { id: string }) {
  const glosario = use(leerGlosario())
  const abrir = useVentanas((v) => v.abrirGlosario)
  const termino = glosario.find((t) => t.id === id)
  if (!termino) return <p>Este término no está en el glosario.</p>
  const relacionados = termino.ver.flatMap((otro) => glosario.find((t) => t.id === otro) ?? [])
  return (
    <div className="pila">
      <h2 className="subtitulo" id="ventana-glosario-titulo">
        {termino.termino}
      </h2>
      <ProsaVista prosa={termino.definicion} />
      {termino.ejemplo && (
        <Suspense fallback={<p className="suave">Cargando el ejemplo…</p>}>
          <EjemploSuelto key={termino.id} pieza={termino.ejemplo} />
        </Suspense>
      )}
      {relacionados.length > 0 && (
        <p className="suave">
          Ver también:{' '}
          {relacionados.map((otro, i) => (
            <span key={otro.id}>
              {i > 0 && ', '}
              <button type="button" className="termino" onClick={() => abrir(otro.id)}>
                {otro.termino.toLowerCase()}
              </button>
            </span>
          ))}
        </p>
      )}
    </div>
  )
}

/** Definición de un término del glosario, en una ventana sobre la pantalla actual. */
export function VentanaDeGlosario() {
  const id = useVentanas((v) => v.glosario)
  const cerrar = useVentanas((v) => v.cerrar)
  const dialogo = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const elemento = dialogo.current
    if (!elemento) return
    if (id !== undefined && !elemento.open) elemento.showModal()
    if (id === undefined && elemento.open) elemento.close()
  }, [id])

  return (
    // El toque en el telón es un atajo para cerrar; con teclado, <dialog> ya se cierra con Escape y hay un botón «Cerrar».
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={dialogo}
      className="ventana"
      aria-labelledby="ventana-glosario-titulo"
      onClose={cerrar}
      onClick={(evento) => {
        // Un toque fuera de la ventana (sobre el telón) la cierra.
        if (evento.target === dialogo.current) cerrar()
      }}
    >
      {id !== undefined && (
        <Marco rotulo="Glosario" className="ventana__marco">
          <div className="pila">
            <Suspense fallback={<p className="suave">Cargando…</p>}>
              <Definicion id={id} />
            </Suspense>
            <Boton bloque sonido="atras" onClick={cerrar}>
              Cerrar
            </Boton>
          </div>
        </Marco>
      )}
    </dialog>
  )
}
