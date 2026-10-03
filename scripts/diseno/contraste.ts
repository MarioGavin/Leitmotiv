/**
 * Tabla de contraste de las dos direcciones visuales, en Markdown.
 *
 *   npx tsx scripts/diseno/contraste.ts
 *
 * Lee los colores de los CSS (los mismos que usa la app) y mide las parejas
 * declaradas en src/ui/contraste.ts. La salida es la tabla de DESIGN.md.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { leerColores, medir } from '../../src/ui/contraste.ts'

const RAIZ = path.resolve(import.meta.dirname, '../..')

for (const direccion of ['cartucho', 'vinilo']) {
  const css = readFileSync(path.join(RAIZ, `src/ui/direcciones/${direccion}/${direccion}.css`), 'utf8')
  const esquemas = leerColores(css, direccion)
  const oscuro = medir(esquemas.oscuro ?? {}, direccion)
  const claro = medir(esquemas.claro ?? {}, direccion)
  console.log(`\n### ${direccion[0]?.toUpperCase()}${direccion.slice(1)}\n`)
  console.log('| Uso | Color | Sobre | Mínimo | Oscuro | Claro |')
  console.log('| --- | --- | --- | ---: | ---: | ---: |')
  // Las notas del piano roll son muchas filas iguales: se resumen en la peor de cada esquema.
  const texto = oscuro.filter((m) => m.uso !== 'Nota en el piano roll')
  for (const m of texto) {
    const c = claro.find((x) => x.sobre === m.sobre && x.fondo === m.fondo && x.uso === m.uso)
    console.log(`| ${m.uso} | \`--${m.sobre}\` | \`--${m.fondo}\` | ${m.minimo} | ${m.valor.toFixed(1)} | ${c ? c.valor.toFixed(1) : '—'} |`)
  }
  const peor = (lista: typeof oscuro): number => Math.min(...lista.filter((m) => m.uso === 'Nota en el piano roll').map((m) => m.valor))
  console.log(`| Nota en el piano roll (la peor de 21 combinaciones) | color de pista o su contorno | filas de la rejilla | 3 | ${peor(oscuro).toFixed(1)} | ${peor(claro).toFixed(1)} |`)
  const fallos = [...oscuro, ...claro].filter((m) => !m.cumple)
  if (fallos.length > 0) {
    console.error(`\n${fallos.length} parejas no cumplen en ${direccion}.`)
    process.exitCode = 1
  }
}
