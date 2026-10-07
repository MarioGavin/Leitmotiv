import { use, useEffect, useMemo, useState } from 'react'
import { leerIndice } from '../app/contenido.ts'
import { useEstadoDelCurso, useFicha } from '../app/progreso.ts'
import { navegar } from '../app/rutas.ts'
import { sonar } from '../audio/audio.ts'
import { siguienteLeccion } from '../progreso/desbloqueo.ts'
import { Boton } from '../ui/Boton.tsx'
import { FichaDelJugador } from '../ui/FichaDelJugador.tsx'
import { Marco } from '../ui/Marco.tsx'
import { MapaDelMundo } from '../ui/mapa/MapaDelMundo.tsx'
import { type NodoDelCurso, nodosDelCurso, sePuedeEntrar } from '../ui/mapa/nodos.ts'

function plural(cantidad: number, uno: string, varios: string): string {
  return `${cantidad} ${cantidad === 1 ? uno : varios}`
}

/** Lo que dice la ventana de abajo de cada mundo, según cómo esté. */
function situacion(nodo: NodoDelCurso): string {
  switch (nodo.estado) {
    case 'abierto':
      return `${plural(nodo.unidades, 'unidad', 'unidades')} · ${nodo.hechas} de ${plural(nodo.lecciones, 'lección hecha', 'lecciones hechas')}`
    case 'completado':
      return `Completado: ${plural(nodo.lecciones, 'lección', 'lecciones')}`
    case 'bloqueado':
      return 'Termina el mundo anterior para abrirlo'
    case 'en-obras':
      return 'En construcción'
  }
}

/** Mapa del curso: un punto por mundo. Al elegir uno, la ventana de abajo dice qué hay y deja entrar. */
export function Mapa() {
  const indice = use(leerIndice())
  const estado = useEstadoDelCurso()
  const ficha = useFicha()
  const nodos = useMemo(() => nodosDelCurso(indice, estado), [indice, estado])
  // Al entrar, el cursor está en el mundo por donde se sigue.
  const [elegido, setElegido] = useState(() => {
    const porDondeSeguir = siguienteLeccion(estado)?.slice(0, 3)
    return porDondeSeguir ?? nodos.find((n) => sePuedeEntrar(n))?.id ?? nodos[0]?.id ?? ''
  })
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
      <div className="mapa__ficha">
        <FichaDelJugador ficha={ficha} />
      </div>
      <MapaDelMundo nodos={nodos} elegido={elegido} alElegir={elegir} />
      {nodo && (
        <div className="mapa__detalle" aria-live="polite">
          <Marco relleno="ajustado" rotulo={nodo.final ? 'Final del camino' : `Mundo ${nodo.numero}`}>
            <div className="pila pila--junta">
              <h2 className="subtitulo">{nodo.titulo}</h2>
              <p className="mapa__lema">{nodo.lema}</p>
              <div className="fila fila--separada">
                <p className={sePuedeEntrar(nodo) ? 'dato' : 'dato suave'}>{situacion(nodo)}</p>
                <Boton variante="primario" disabled={!sePuedeEntrar(nodo)} onClick={() => navegar({ pantalla: 'mundo', id: nodo.id })}>
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
