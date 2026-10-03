/**
 * Rutas de la app. Van en el fragmento de la URL (#/mapa), así funcionan en
 * GitHub Pages sin configurar nada en el servidor y sin conexión.
 */
import { useMemo, useSyncExternalStore } from 'react'

export type Ruta =
  | { pantalla: 'titulo' }
  | { pantalla: 'mapa' }
  /** Las unidades y lecciones de un mundo. */
  | { pantalla: 'mundo'; id: string }
  /** `paso` empieza en 1. */
  | { pantalla: 'leccion'; id: string; paso: number }
  | { pantalla: 'pianoroll' }
  | { pantalla: 'repaso' }
  | { pantalla: 'repertorio' }
  | { pantalla: 'glosario' }
  | { pantalla: 'ajustes' }
  | { pantalla: 'diagnostico' }
  | { pantalla: 'muestrario' }

export type Pantalla = Ruta['pantalla']

const SIMPLES: ReadonlySet<string> = new Set(['mapa', 'pianoroll', 'repaso', 'repertorio', 'glosario', 'ajustes', 'diagnostico', 'muestrario'])

export function leerRuta(hash: string): Ruta {
  const partes = hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  const [primera, segunda, tercera] = partes
  if (primera === undefined) return { pantalla: 'titulo' }
  if (primera === 'mundo' && segunda && /^m\d{2}$/.test(segunda)) return { pantalla: 'mundo', id: segunda }
  if (primera === 'leccion' && segunda && /^m\d{2}\.u\d{2}\.l\d{2}$/.test(segunda)) {
    const paso = Number(tercera)
    return { pantalla: 'leccion', id: segunda, paso: Number.isInteger(paso) && paso >= 1 ? paso : 1 }
  }
  if (SIMPLES.has(primera)) return { pantalla: primera } as Ruta
  return { pantalla: 'mapa' }
}

export function escribirRuta(ruta: Ruta): string {
  switch (ruta.pantalla) {
    case 'titulo':
      return '#/'
    case 'mundo':
      return `#/mundo/${ruta.id}`
    case 'leccion':
      return `#/leccion/${ruta.id}/${ruta.paso}`
    default:
      return `#/${ruta.pantalla}`
  }
}

function suscribir(oyente: () => void): () => void {
  window.addEventListener('hashchange', oyente)
  return () => window.removeEventListener('hashchange', oyente)
}

/** La ruta actual. El componente se vuelve a pintar cuando cambia. */
export function useRuta(): Ruta {
  const hash = useSyncExternalStore(suscribir, () => window.location.hash)
  return useMemo(() => leerRuta(hash), [hash])
}

/** Cambia de pantalla. Con `reemplazar`, la pantalla actual no queda en el historial. */
export function navegar(ruta: Ruta, opciones: { reemplazar?: boolean } = {}): void {
  const destino = escribirRuta(ruta)
  if (opciones.reemplazar) {
    window.history.replaceState(null, '', destino)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  } else {
    window.location.hash = destino
  }
}
