import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Boton } from './Boton.tsx'
import { Marco } from './Marco.tsx'

interface Props {
  children: ReactNode
}

interface Estado {
  error: Error | undefined
}

/**
 * Límite de errores de una pantalla: si algo falla al pintar o al cargar
 * contenido, se explica qué ha pasado y se ofrece reintentar, en vez de dejar
 * la app en blanco.
 */
export class Limite extends Component<Props, Estado> {
  override state: Estado = { error: undefined }

  static getDerivedStateFromError(error: unknown): Estado {
    return { error: error instanceof Error ? error : new Error(String(error)) }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Error en una pantalla', error, info.componentStack)
  }

  override render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children
    const sinConexion = typeof navigator !== 'undefined' && navigator.onLine === false
    return (
      <main className="pantalla">
        <div className="pantalla__cuerpo estado-vacio">
          <Marco rotulo="Algo ha fallado">
            <div className="pila">
              <p>{sinConexion ? 'No hay conexión y esta parte aún no estaba guardada en el dispositivo.' : 'No se ha podido cargar esta pantalla.'}</p>
              <p className="suave">{error.message}</p>
              <Boton variante="primario" onClick={() => this.setState({ error: undefined })}>
                Reintentar
              </Boton>
            </div>
          </Marco>
        </div>
      </main>
    )
  }
}
