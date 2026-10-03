/**
 * Descarga y caché de las muestras de audio.
 *
 * Cada instrumento se baja la primera vez que se usa y queda guardado en
 * Cache Storage, así que después funciona sin conexión. El service worker no
 * interviene: es la propia app la que guarda y lee, y por eso funciona igual en
 * desarrollo, antes de que el service worker tome el control y sin él.
 */
import type { IdInstrumento } from '../musica/instrumentos.ts'

/** Si cambia el formato de las muestras, se sube la versión y la caché antigua se borra. */
export const NOMBRE_CACHE = 'leitmotiv-muestras-v1'

/** Forma de public/samples/<id>/instrumento.json (lo escribe scripts/muestras/construir.ts). */
export interface ArchivoDeInstrumento {
  id: IdInstrumento
  version: 1
  fuente: string
  licencia: string
  bytes: number
  archivos: string[]
  preset: {
    samples: { formats: string[] }
    defaults?: Record<string, number | boolean>
    groups: Array<Record<string, unknown> & { regions: Array<Record<string, unknown> & { sample: string }> }>
    aliases?: Record<string, number>
  }
}

export interface IndiceDeMuestras {
  version: 1
  instrumentos: Record<string, { bytes: number; archivos: string[]; licencia: string; fuente: string }>
}

export function urlDeMuestras(): string {
  return `${import.meta.env.BASE_URL}samples`
}

function hayCache(): boolean {
  return typeof caches !== 'undefined'
}

/**
 * Pide un recurso mirando primero en la caché. Si no está, lo descarga y lo
 * guarda. Sin Cache Storage (contexto no seguro) se comporta como `fetch`.
 */
export async function pedirConCache(url: string): Promise<Response> {
  if (!hayCache()) return fetch(url)
  const cache = await caches.open(NOMBRE_CACHE)
  const guardada = await cache.match(url)
  if (guardada) return guardada
  const respuesta = await fetch(url)
  if (respuesta.ok) {
    try {
      await cache.put(url, respuesta.clone())
    } catch (e) {
      // Sin espacio o en modo privado: se sigue sin guardar.
      console.warn('No se ha podido guardar en caché', url, e)
    }
  }
  return respuesta
}

/** Almacén con la forma que espera smplr (`storage`). */
export const almacenDeMuestras = { fetch: pedirConCache }

export async function leerArchivoDeInstrumento(id: IdInstrumento): Promise<ArchivoDeInstrumento> {
  const respuesta = await pedirConCache(`${urlDeMuestras()}/${id}/instrumento.json`)
  if (!respuesta.ok) throw new Error(`No se ha podido descargar el instrumento «${id}» (${respuesta.status}).`)
  return (await respuesta.json()) as ArchivoDeInstrumento
}

export async function leerIndiceDeMuestras(): Promise<IndiceDeMuestras> {
  // El índice no se guarda en la caché de muestras: lo sirve la carcasa (precargado por el service worker).
  const respuesta = await fetch(`${urlDeMuestras()}/indice.json`)
  if (!respuesta.ok) throw new Error(`No se ha podido leer el índice de muestras (${respuesta.status}).`)
  return (await respuesta.json()) as IndiceDeMuestras
}

function urlsDe(id: string, archivos: readonly string[]): string[] {
  return [`${urlDeMuestras()}/${id}/instrumento.json`, ...archivos.map((a) => `${urlDeMuestras()}/${id}/${a}`)]
}

/** ¿Están ya en el dispositivo todas las muestras de un instrumento? */
export async function instrumentoDescargado(id: string, archivos: readonly string[]): Promise<boolean> {
  if (!hayCache()) return false
  const cache = await caches.open(NOMBRE_CACHE)
  for (const url of urlsDe(id, archivos)) {
    if (!(await cache.match(url))) return false
  }
  return true
}

/** Descarga un instrumento entero para usarlo sin conexión. */
export async function descargarInstrumento(id: string, archivos: readonly string[], alAvanzar?: (hechas: number, total: number) => void): Promise<void> {
  const urls = urlsDe(id, archivos)
  let hechas = 0
  for (const url of urls) {
    const respuesta = await pedirConCache(url)
    if (!respuesta.ok) throw new Error(`No se ha podido descargar ${url} (${respuesta.status}).`)
    alAvanzar?.(++hechas, urls.length)
  }
}

/**
 * Guarda en segundo plano los instrumentos que todavía no estén en el
 * dispositivo, para que la app suene sin conexión desde la primera sesión.
 * No hace nada sin conexión, sin Cache Storage o si el usuario ha pedido
 * ahorrar datos.
 */
export async function guardarSonidosEnSegundoPlano(): Promise<void> {
  if (!hayCache() || navigator.onLine === false) return
  const conexion = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  if (conexion?.saveData) return
  const indice = await leerIndiceDeMuestras()
  for (const [id, datos] of Object.entries(indice.instrumentos)) {
    if (await instrumentoDescargado(id, datos.archivos)) continue
    await descargarInstrumento(id, datos.archivos)
  }
}

export async function vaciarCacheDeMuestras(): Promise<void> {
  if (hayCache()) await caches.delete(NOMBRE_CACHE)
}

/** Borra las cachés de muestras de versiones anteriores. */
export async function limpiarCachesAntiguas(): Promise<void> {
  if (!hayCache()) return
  for (const nombre of await caches.keys()) {
    if (nombre.startsWith('leitmotiv-muestras-') && nombre !== NOMBRE_CACHE) await caches.delete(nombre)
  }
}
