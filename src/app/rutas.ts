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
  /** El piano roll con una pieza del repertorio. Sin `id`, la pantalla manda al repertorio. */
  | { pantalla: 'pianoroll'; id?: string }
  | { pantalla: 'repaso' }
  | { pantalla: 'repertorio' }
  | { pantalla: 'glosario' }
  /** Una ficha de consulta rápida. */
  | { pantalla: 'ficha'; id: string }
  /** La prueba de nivel, para saltarse lo que ya se sabe. */
  | { pantalla: 'prueba' }
  /** Calibración del retardo del sonido. */
  | { pantalla: 'calibracion' }
  | { pantalla: 'ajustes' }
  | { pantalla: 'diagnostico' }
  | { pantalla: 'muestrario' }

export type Pantalla = Ruta['pantalla']

const SIMPLES: ReadonlySet<string> = new Set(['mapa', 'pianoroll', 'repaso', 'repertorio', 'glosario', 'prueba', 'calibracion', 'ajustes', 'diagnostico', 'muestrario'])

/** Identificadores que pueden ir en una ruta: letras, cifras y guiones. */
const IDENTIFICADOR = /^[a-z0-9][a-z0-9-]{0,63}$/i

export function leerRuta(hash: string): Ruta {
  const partes = hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  const [primera, segunda, tercera] = partes
  if (primera === undefined) return { pantalla: 'titulo' }
  if (primera === 'mundo' && segunda && /^m\d{2}$/.test(segunda)) return { pantalla: 'mundo', id: segunda }
  if (primera === 'leccion' && segunda && /^m\d{2}\.u\d{2}\.l\d{2}$/.test(segunda)) {
    const paso = Number(tercera)
    return { pantalla: 'leccion', id: segunda, paso: Number.isInteger(paso) && paso >= 1 ? paso : 1 }
  }
  if (primera === 'ficha' && segunda && IDENTIFICADOR.test(segunda)) return { pantalla: 'ficha', id: segunda }
  if (primera === 'pianoroll' && segunda && IDENTIFICADOR.test(segunda)) return { pantalla: 'pianoroll', id: segunda }
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
    case 'ficha':
      return `#/ficha/${ruta.id}`
    case 'pianoroll':
      return ruta.id === undefined ? '#/pianoroll' : `#/pianoroll/${ruta.id}`
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

/** Si se ha llegado a la pantalla actual desde otra de la app: entonces «volver» puede tirar del historial. */
let hayAnterior = false
/** Mientras se sustituye la pantalla actual: ese cambio no deja nada a lo que volver. */
let reemplazando = false
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    if (!reemplazando) hayAnterior = true
  })
}

/** Cambia de pantalla. Con `reemplazar`, la pantalla actual no queda en el historial. */
export function navegar(ruta: Ruta, opciones: { reemplazar?: boolean } = {}): void {
  const destino = escribirRuta(ruta)
  if (opciones.reemplazar) {
    window.history.replaceState(null, '', destino)
    reemplazando = true
    try {
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    } finally {
      reemplazando = false
    }
  } else {
    window.location.hash = destino
  }
}

/**
 * Vuelve a la pantalla de la que se venía (la calibración, al ejercicio que la
 * pidió). Si se ha entrado directamente por la dirección, no hay a dónde volver
 * dentro de la app y se va a `sinHistorial`.
 */
export function volver(sinHistorial: Ruta): void {
  if (hayAnterior) window.history.back()
  else navegar(sinHistorial, { reemplazar: true })
}
