/**
 * Compila y comprueba el contenido.
 *
 *   npm run content:build    → valida y escribe public/content
 *   npm run content:check    → solo valida (lo que corre en CI)
 *
 * Opciones: --comprobar (no escribe), --estricto (los avisos también fallan).
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { compilarCurso } from './curso.ts'

const RAIZ = path.resolve(import.meta.dirname, '../..')
const ORIGEN = path.join(RAIZ, 'content')
const DESTINO = path.join(RAIZ, 'public/content')

const soloComprobar = process.argv.includes('--comprobar')
const estricto = process.argv.includes('--estricto')

const curso = compilarCurso(ORIGEN)
const errores = curso.hallazgos.filter((h) => h.nivel === 'error')
const avisos = curso.hallazgos.filter((h) => h.nivel === 'aviso')

const porArchivo = new Map<string, typeof curso.hallazgos>()
for (const h of curso.hallazgos) {
  const archivo = h.donde.split(' › ')[0] ?? h.donde
  porArchivo.set(archivo, [...(porArchivo.get(archivo) ?? []), h])
}
for (const [archivo, lista] of porArchivo) {
  console.log(`\ncontent/${archivo}`)
  for (const h of lista) {
    const resto = h.donde.split(' › ').slice(1).join(' › ')
    console.log(`  ${h.nivel === 'error' ? 'ERROR' : 'aviso'} [${h.codigo}] ${resto ? `${resto}: ` : ''}${h.mensaje}`)
  }
}

const nLecciones = curso.lecciones.length
const nPasos = curso.lecciones.reduce((s, l) => s + l.pasos.length, 0)
const nUnidades = curso.indice.mundos.reduce((s, m) => s + m.unidades.length, 0)
console.log(
  `\nContenido: ${curso.indice.mundos.length} mundos, ${nUnidades} unidades, ${nLecciones} lecciones, ${nPasos} pasos, ${curso.conceptos.length} conceptos, ${curso.glosario.length} términos. ` +
    `${errores.length} errores, ${avisos.length} avisos.`,
)

if (errores.length > 0 || (estricto && avisos.length > 0)) {
  console.error(errores.length > 0 ? 'El contenido tiene errores: no se publica.' : 'Modo estricto: hay avisos sin resolver.')
  process.exit(1)
}

if (!soloComprobar) {
  rmSync(DESTINO, { recursive: true, force: true })
  mkdirSync(path.join(DESTINO, 'lecciones'), { recursive: true })
  const escribir = (nombre: string, datos: unknown): void => writeFileSync(path.join(DESTINO, nombre), JSON.stringify(datos))
  escribir('indice.json', curso.indice)
  escribir('conceptos.json', curso.conceptos)
  escribir('glosario.json', curso.glosario)
  escribir('fichas.json', curso.fichas)
  escribir('prueba-de-nivel.json', curso.prueba)
  for (const leccion of curso.lecciones) escribir(`lecciones/${leccion.id}.json`, leccion)
  console.log(`Escrito en public/content (versión ${curso.indice.version}).`)
}
