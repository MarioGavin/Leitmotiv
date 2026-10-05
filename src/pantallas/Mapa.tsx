import { use, useEffect, useMemo, useState } from 'react'
import { leerIndice } from '../app/contenido.ts'
import { navegar } from '../app/rutas.ts'
import { sonar } from '../audio/audio.ts'
import { Boton } from '../ui/Boton.tsx'
import { Marco } from '../ui/Marco.tsx'
import { MapaDelMundo } from '../ui/mapa/MapaDelMundo.tsx'
import { nodosDelCurso } from '../ui/mapa/nodos.ts'

function plural(cantidad: number, uno: string, varios: string): string {
  return `${cantidad} ${cantidad === 1 ? uno : varios}`
}

/** Mapa del curso: un punto por mundo. Al elegir uno, la ventana de abajo dice qué hay y deja entrar. */
export function Mapa() {
  const indice = use(leerIndice())
  const nodos = useMemo(() => nodosDelCurso(indice), [indice])
  const [elegido, setElegido] = useState(() => nodos.find((n) => n.estado === 'abierto')?.id ?? nodos[0]?.id ?? '')
  const nodo = nodos.find((n) => n.id === elegido) ?? nodos[0]

  // Al entrar, el mundo elegido queda a la vista.
  useEffect(() => {
    document.querySelector(`[data-nodo="${elegido}"]`)?.scrollIntoView({ block: 'center' })
    // Solo al montar: después es el usuario quien se mueve por el mapa.
    // oxlint-disable-next-line react/exhaustive-deps
  }, [])

  const elegir = (id: string): void => {
    if (id === elegido) return
    sonar('cursor')
    setElegido(id)
  }

  return (
    <main className="pantalla pantalla--mapa">
      <h1 className="solo-lectores">Mapa del curso</h1>
      <MapaDelMundo nodos={nodos} elegido={elegido} alElegir={elegir} />
      {nodo && (
        <div className="mapa__detalle" aria-live="polite">
          <Marco relleno="ajustado" rotulo={nodo.final ? 'Final del camino' : `Mundo ${nodo.numero}`}>
            <div className="pila pila--junta">
              <h2 className="subtitulo">{nodo.titulo}</h2>
              <p className="mapa__lema">{nodo.lema}</p>
              <div className="fila fila--separada">
                {nodo.estado === 'abierto' ? (
                  <p className="dato">
                    {plural(nodo.unidades, 'unidad', 'unidades')}, {plural(nodo.lecciones, 'lección', 'lecciones')}
                  </p>
                ) : (
                  <p className="dato suave">En construcción</p>
                )}
                <Boton variante="primario" disabled={nodo.estado !== 'abierto'} onClick={() => navegar({ pantalla: 'mundo', id: nodo.id })}>
                  Entrar
                </Boton>
              </div>
            </div>
          </Marco>
        </div>
      )}
    </main>
  )
}
