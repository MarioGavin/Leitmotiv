// Función que el arnés (arnes.ts) expone a Playwright en la página de verificación.
import type { OpcionesDeRender } from '../../src/audio/offline.ts'
import type { Pieza } from '../../src/musica/pieza.ts'

declare global {
  interface Window {
    /** Renderiza una pieza offline y devuelve el WAV en base64. */
    renderizar: (pieza: Pieza, opciones?: OpcionesDeRender) => Promise<string>
  }
}
