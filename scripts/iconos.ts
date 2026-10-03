/**
 * Genera los iconos de la app instalada y el favicon.
 *
 *   npm run icons:build
 *
 * El dibujo es el emblema de Leitmotiv: las cuatro notas del motivo (La, Mi,
 * Si, Mi) como se ven en un piano roll. Escribe public/favicon.svg y los PNG
 * de public/icons que declara el manifiesto (vite.config.ts).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const PUBLICO = path.resolve(import.meta.dirname, '../public')

const FONDO = '#0c1226'
const NOTA = '#f7b733'
/** Altura de cada nota sobre la primera, en semitonos (las mismas que en src/ui/Emblema.tsx). */
const ALTURAS = [0, 7, 2, 7]

/**
 * El emblema en un lienzo de 512 × 512. `escala` encoge el dibujo hacia el
 * centro: los iconos «maskable» deben caber en el círculo central del 80 %.
 */
function emblema(escala: number): string {
  const ancho = 88
  const alto = 48
  const notas = ALTURAS.map((altura, i) => `<rect x="${80 + i * ancho}" y="${316 - altura * 24}" width="${ancho}" height="${alto}" fill="${NOTA}"/>`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" shape-rendering="crispEdges"><rect width="512" height="512" fill="${FONDO}"/><g transform="translate(256 256) scale(${escala}) translate(-256 -256)">${notas}</g></svg>`
}

mkdirSync(path.join(PUBLICO, 'icons'), { recursive: true })
writeFileSync(path.join(PUBLICO, 'favicon.svg'), `${emblema(1)}\n`)

const salidas: ReadonlyArray<readonly [archivo: string, lado: number, escala: number]> = [
  ['icono-192.png', 192, 1],
  ['icono-512.png', 512, 1],
  ['icono-maskable-512.png', 512, 0.72],
]
for (const [archivo, lado, escala] of salidas) {
  await sharp(Buffer.from(emblema(escala))).resize(lado, lado).png({ compressionLevel: 9 }).toFile(path.join(PUBLICO, 'icons', archivo))
}
console.log(`Iconos escritos en public/icons y public/favicon.svg (${salidas.length} PNG).`)
