/**
 * Tabla de contraste del tema, en Markdown.
 *
 *   npx tsx scripts/diseno/contraste.ts
 *
 * Lee los colores de tema.css (los mismos que usa la app) y mide las parejas
 * declaradas en src/ui/contraste.ts. La salida es la tabla de DESIGN.md.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { leerColores, medir } from '../../src/ui/contraste.ts'

const RAIZ = path.resolve(import.meta.dirname, '../..')
const NOTA = 'Nota en el piano roll'

const esquemas = leerColores(readFileSync(path.join(RAIZ, 'src/ui/estilos/tema.css'), 'utf8'))
const oscuro = medir(esquemas.oscuro ?? {})
const claro = medir(esquemas.claro ?? {})
console.log('| Uso | Color | Sobre | Mínimo | Oscuro | Claro |')
console.log('| --- | --- | --- | ---: | ---: | ---: |')
// Las notas del piano roll son muchas filas iguales: se resumen en la peor de cada esquema.
for (const m of oscuro.filter((x) => x.uso !== NOTA)) {
  const c = claro.find((x) => x.sobre === m.sobre && x.fondo === m.fondo && x.uso === m.uso)
  console.log(`| ${m.uso} | \`--${m.sobre}\` | \`--${m.fondo}\` | ${m.minimo} | ${m.valor.toFixed(1)} | ${c ? c.valor.toFixed(1) : '—'} |`)
}
const peor = (lista: typeof oscuro): number => Math.min(...lista.filter((m) => m.uso === NOTA).map((m) => m.valor))
console.log(`| Nota en el piano roll (la peor de 21 combinaciones) | color de pista o su contorno | filas de la rejilla | 3 | ${peor(oscuro).toFixed(1)} | ${peor(claro).toFixed(1)} |`)
const fallos = [...oscuro, ...claro].filter((m) => !m.cumple)
if (fallos.length > 0) {
  console.error(`\n${fallos.length} parejas no cumplen.`)
  process.exitCode = 1
}
