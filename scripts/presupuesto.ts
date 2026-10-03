/**
 * Presupuesto de la carga inicial.
 *
 *   npm run size        (después de `npm run build`)
 *
 * La carga inicial es el JavaScript que el navegador descarga antes de pintar
 * la primera pantalla: el script de entrada de dist/index.html y los trozos que
 * este importa de forma estática (los que Vite precarga con `modulepreload`).
 * No puede pasar de 300 KB comprimidos con gzip, sin contar las muestras de
 * audio. Lo demás (motor de audio, pantallas pesadas) se descarga después y se
 * lista solo para verlo.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { gzipSync } from 'node:zlib'

const RAIZ = path.resolve(import.meta.dirname, '..')
const DIST = path.join(RAIZ, 'dist')
/** Límite de la carga inicial, en bytes comprimidos. */
const LIMITE = 300_000

if (!existsSync(path.join(DIST, 'index.html'))) {
  console.error('No existe dist/index.html. Ejecuta antes `npm run build`.')
  process.exit(1)
}

function comprimido(archivo: string): number {
  return gzipSync(readFileSync(archivo), { level: 9 }).length
}

function kb(bytes: number): string {
  return `${(bytes / 1000).toFixed(1).padStart(7)} KB`
}

const html = readFileSync(path.join(DIST, 'index.html'), 'utf8')
// Las rutas del HTML llevan la base de despliegue delante; lo que importa es el nombre dentro de assets/.
const referencias = [...html.matchAll(/<(?:script|link)\b[^>]*>/g)]
  .map((m) => m[0])
  .filter((etiqueta) => /<script\b[^>]*type="module"/.test(etiqueta) || /rel="modulepreload"/.test(etiqueta))
  .flatMap((etiqueta) => /(?:src|href)="[^"]*?(assets\/[^"]+\.js)"/.exec(etiqueta)?.[1] ?? [])
const iniciales = [...new Set(referencias)]

if (iniciales.length === 0) {
  console.error('No se ha encontrado el script de entrada en dist/index.html.')
  process.exit(1)
}

const todos = readdirSync(path.join(DIST, 'assets'))
  .filter((nombre) => nombre.endsWith('.js'))
  .map((nombre) => `assets/${nombre}`)
const medidas = todos.map((archivo) => ({ archivo, bytes: comprimido(path.join(DIST, archivo)), inicial: iniciales.includes(archivo) })).sort((a, b) => b.bytes - a.bytes)
const totalInicial = medidas.filter((m) => m.inicial).reduce((suma, m) => suma + m.bytes, 0)
const totalDiferido = medidas.filter((m) => !m.inicial).reduce((suma, m) => suma + m.bytes, 0)
const css = readdirSync(path.join(DIST, 'assets'))
  .filter((nombre) => nombre.endsWith('.css'))
  .reduce((suma, nombre) => suma + comprimido(path.join(DIST, 'assets', nombre)), 0)

console.log('Carga inicial (JavaScript, gzip):')
for (const m of medidas.filter((x) => x.inicial)) console.log(`  ${kb(m.bytes)}  ${m.archivo}`)
console.log(`  ${kb(totalInicial)}  TOTAL (límite: ${LIMITE / 1000} KB)`)
console.log('\nSe descarga después, cuando hace falta:')
for (const m of medidas.filter((x) => !x.inicial)) console.log(`  ${kb(m.bytes)}  ${m.archivo}`)
console.log(`  ${kb(totalDiferido)}  total diferido`)
console.log(`\nHojas de estilo (gzip): ${kb(css).trim()}`)

mkdirSync(path.join(RAIZ, 'informes'), { recursive: true })
writeFileSync(
  path.join(RAIZ, 'informes/presupuesto.json'),
  `${JSON.stringify({ limite: LIMITE, inicial: totalInicial, diferido: totalDiferido, css, archivos: medidas.map((m) => ({ ...m, archivo: m.archivo.replace(/-[\w-]{8}\.js$/, '.js') })) }, null, 2)}\n`,
)

if (totalInicial > LIMITE) {
  console.error(`\nLa carga inicial pasa del presupuesto por ${kb(totalInicial - LIMITE).trim()}. Mueve código a un import() dinámico.`)
  process.exit(1)
}
console.log(`\nDentro del presupuesto: queda un ${Math.round((1 - totalInicial / LIMITE) * 100)} % de margen.`)
