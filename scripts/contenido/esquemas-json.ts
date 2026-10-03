/**
 * Genera los JSON Schema de los archivos de contenido a partir de los esquemas
 * zod. Sirven para que el editor autocomplete y marque errores mientras se
 * escribe una lección (ver .vscode/settings.json).
 *
 *   npm run content:schemas
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import * as z from 'zod'
import { ConceptosFuente, FichaFuente, GlosarioFuente, LeccionFuente, MundoFuente, PruebaDeNivelFuente, UnidadFuente } from '../../src/contenido/esquemas.ts'

const DESTINO = path.resolve(import.meta.dirname, '../../content/.esquemas')

export const ESQUEMAS = {
  leccion: LeccionFuente,
  unidad: UnidadFuente,
  mundo: MundoFuente,
  conceptos: ConceptosFuente,
  glosario: GlosarioFuente,
  ficha: FichaFuente,
  'prueba-de-nivel': PruebaDeNivelFuente,
} as const

export function generar(nombre: keyof typeof ESQUEMAS): string {
  // `io: input` describe lo que se escribe en el YAML: los campos con valor por defecto son opcionales.
  const esquema = z.toJSONSchema(ESQUEMAS[nombre], { io: 'input', unrepresentable: 'any' })
  return `${JSON.stringify(esquema, null, 2)}\n`
}

/**
 * ¿Se ha lanzado este archivo directamente (y no importado desde una prueba)?
 * Se comparan rutas del sistema, no URL: así funciona en Windows y en carpetas
 * con espacios en el nombre.
 */
function esElGuionPrincipal(): boolean {
  const lanzado = process.argv[1]
  if (!lanzado) return false
  const [a, b] = [path.resolve(lanzado), import.meta.filename]
  return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b
}

if (esElGuionPrincipal()) {
  mkdirSync(DESTINO, { recursive: true })
  for (const nombre of Object.keys(ESQUEMAS) as Array<keyof typeof ESQUEMAS>) {
    writeFileSync(path.join(DESTINO, `${nombre}.schema.json`), generar(nombre))
  }
  console.log(`Esquemas escritos en content/.esquemas (${Object.keys(ESQUEMAS).length}).`)
}
