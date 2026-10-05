// Función que el arnés (arnes.ts) expone a Playwright en la página de verificación.
import type { OpcionesDeRender } from '../../src/audio/offline.ts'
import type { Pieza } from '../../src/musica/pieza.ts'
import type { PlanDeRitmo } from '../../src/musica/ritmo.ts'

declare global {
  interface Window {
    /** Renderiza una pieza offline y devuelve el WAV en base64. */
    renderizar: (pieza: Pieza, opciones?: OpcionesDeRender) => Promise<string>
    /** Renderiza lo que suena en un ejercicio de ritmo y devuelve el WAV en base64. */
    renderizarRitmo: (plan: PlanDeRitmo, opciones?: { inicio?: number }) => Promise<string>
  }
}
