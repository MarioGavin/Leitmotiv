/**
 * Lectura del contenido compilado (public/content). Cada archivo se pide una
 * sola vez por sesión; sin conexión lo sirve el service worker.
 *
 * Las funciones devuelven siempre la misma promesa para el mismo recurso, así
 * que pueden usarse con `use()` de React dentro de un límite de suspense.
 */
import type { BloqueDePrueba, Concepto, Ficha, IndiceDelCurso, Leccion, TerminoDeGlosario } from '../contenido/tipos.ts'

const BASE = `${import.meta.env.BASE_URL}content`
const memoria = new Map<string, Promise<unknown>>()

function leer<T>(ruta: string): Promise<T> {
  let promesa = memoria.get(ruta) as Promise<T> | undefined
  if (!promesa) {
    promesa = fetch(`${BASE}/${ruta}`).then((respuesta) => {
      if (!respuesta.ok) throw new Error(`No se ha podido leer «${ruta}» (${respuesta.status}).`)
      return respuesta.json() as Promise<T>
    })
    // Si falla, se olvida para que el siguiente intento vuelva a pedirlo.
    promesa.catch(() => memoria.delete(ruta))
    memoria.set(ruta, promesa)
  }
  return promesa
}

export function leerIndice(): Promise<IndiceDelCurso> {
  return leer('indice.json')
}

export function leerLeccion(id: string): Promise<Leccion> {
  return leer(`lecciones/${id}.json`)
}

export function leerGlosario(): Promise<TerminoDeGlosario[]> {
  return leer('glosario.json')
}

export function leerConceptos(): Promise<Concepto[]> {
  return leer('conceptos.json')
}

export function leerFichas(): Promise<Ficha[]> {
  return leer('fichas.json')
}

export function leerPrueba(): Promise<BloqueDePrueba[]> {
  return leer('prueba-de-nivel.json')
}
