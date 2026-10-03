import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Boton } from '../ui/Boton.tsx'
import { Marco } from '../ui/Marco.tsx'

/** Tiempo que se ve el aviso de «ya funciona sin conexión», en ms. */
const DURACION_DEL_AVISO = 6000

/**
 * Avisos de la app instalada: que ya funciona sin conexión y que hay una
 * versión nueva.
 *
 * - El primero es una nota breve que se va sola y no intercepta toques.
 * - La versión nueva nunca se aplica sola: recargar en mitad de algo haría
 *   perderlo, así que lo decide el usuario.
 *
 * El componente está siempre montado (es quien registra el service worker),
 * pero solo se deja ver en las pantallas con navegación: nunca dentro de una
 * lección ni en el piano roll.
 */
export function Avisos({ visible }: { visible: boolean }) {
  const {
    needRefresh: [hayVersionNueva, setHayVersionNueva],
    offlineReady: [listaSinConexion, setListaSinConexion],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error: unknown) {
      console.warn('No se ha podido registrar el service worker', error)
    },
  })

  useEffect(() => {
    if (!listaSinConexion || !visible) return
    const reloj = window.setTimeout(() => setListaSinConexion(false), DURACION_DEL_AVISO)
    return () => window.clearTimeout(reloj)
  }, [listaSinConexion, visible, setListaSinConexion])

  if (!visible) return null

  if (hayVersionNueva) {
    return (
      <div className="avisos">
        <Marco relleno="ajustado" rotulo="Versión nueva" role="status">
          <div className="pila pila--junta">
            <p>Hay una versión nueva de Leitmotiv. Se aplica al recargar.</p>
            <div className="pie__acciones">
              <Boton variante="primario" className="crece" onClick={() => void updateServiceWorker(true)}>
                Recargar ahora
              </Boton>
              <Boton sonido="atras" onClick={() => setHayVersionNueva(false)}>
                Luego
              </Boton>
            </div>
          </div>
        </Marco>
      </div>
    )
  }

  if (listaSinConexion) {
    return (
      <div className="avisos avisos--nota">
        <Marco relleno="ajustado" rotulo="Sin conexión" role="status">
          <p>Leitmotiv ya puede abrirse sin conexión.</p>
        </Marco>
      </div>
    )
  }

  return null
}
