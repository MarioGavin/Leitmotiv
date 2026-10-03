/**
 * Genera las dos fuentes de signos de Leitmotiv: sostenido (♯), bemol (♭) y
 * becuadro (♮) y, en la de píxeles, los indicadores ordinales (ª y º).
 *
 *   npm run fonts:build
 *
 * Las fuentes de texto de la app no traen estos tres signos (o los dejan en
 * manos de la fuente del sistema, que cambia de un móvil a otro). Aquí se
 * dibujan a medida y se guardan en src/ui/fuentes:
 *
 *   leitmotiv-signos-pixel.otf  → de píxeles, a juego con la familia Jersey
 *   leitmotiv-signos.otf        → geométricos, para el resto de las tipografías
 *
 * Son dibujos propios: no derivan de ninguna otra fuente.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
// Node carga opentype.js como CommonJS: todo cuelga de la exportación por defecto.
// oxlint-disable-next-line import/default
import opentype from 'opentype.js'

// oxlint-disable-next-line import/no-named-as-default-member
const { Font, Glyph, Path } = opentype
type Path = InstanceType<typeof opentype.Path>
type Glyph = InstanceType<typeof opentype.Glyph>

const DESTINO = path.resolve(import.meta.dirname, '../../src/ui/fuentes')

const SOSTENIDO = 0x266f
const BEMOL = 0x266d
const BECUADRO = 0x266e
/** Indicadores ordinales («2.ª mayor», «1.º»): en Jersey son letras de tamaño normal; aquí, voladitas. */
const ORDINAL_FEMENINO = 0xaa
const ORDINAL_MASCULINO = 0xba

// ───────────────────────────── de píxeles ─────────────────────────────

/**
 * Mismas medidas que Jersey 10: 1400 unidades por em y píxeles de 75 unidades,
 * con diez píxeles de altura de mayúscula. Así casan a cualquier tamaño.
 */
const EM_PIXEL = 1400
const PIXEL = 75

const MAPAS: ReadonlyArray<readonly [nombre: string, codigo: number, filas: readonly string[]]> = [
  ['sostenido', SOSTENIDO, ['.#..#.', '.#..#.', '.#.###', '####..', '.#..#.', '.#..#.', '.#.###', '####..', '.#..#.', '.#..#.']],
  ['bemol', BEMOL, ['#....', '#....', '#....', '#....', '#.##.', '##..#', '#...#', '#..#.', '#.#..', '##...']],
  ['becuadro', BECUADRO, ['#....', '#....', '#.###', '###.#', '#...#', '#...#', '#.###', '###.#', '....#', '....#']],
  ['ordinalfemenino', ORDINAL_FEMENINO, ['.##.', '...#', '.###', '#..#', '.###', '....', '####', '....', '....', '....']],
  ['ordinalmasculino', ORDINAL_MASCULINO, ['.##.', '#..#', '#..#', '#..#', '.##.', '....', '####', '....', '....', '....']],
]

/** Un rectángulo por cada tira horizontal de píxeles, con la fila de abajo apoyada en la línea base. */
function trazadoDePixeles(filas: readonly string[]): Path {
  const trazado = new Path()
  filas.forEach((fila, i) => {
    const y = (filas.length - 1 - i) * PIXEL
    let x = 0
    while (x < fila.length) {
      if (fila[x] !== '#') {
        x++
        continue
      }
      let fin = x
      while (fila[fin] === '#') fin++
      rectangulo(trazado, x * PIXEL, y, fin * PIXEL, y + PIXEL)
      x = fin
    }
  })
  return trazado
}

// ───────────────────────────── geométricos ─────────────────────────────

const EM = 1000

function rectangulo(trazado: Path, x0: number, y0: number, x1: number, y1: number): void {
  poligono(trazado, [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ])
}

/** Polígono cerrado. Los puntos van en sentido antihorario (el de los contornos exteriores en CFF). */
function poligono(trazado: Path, puntos: ReadonlyArray<readonly [number, number]>): void {
  puntos.forEach(([x, y], i) => {
    if (i === 0) trazado.moveTo(x, y)
    else trazado.lineTo(x, y)
  })
  trazado.close()
}

function sostenido(): Path {
  const t = new Path()
  // Dos barras verticales finas y dos travesaños gruesos inclinados hacia arriba.
  rectangulo(t, 150, -150, 215, 700)
  rectangulo(t, 300, -110, 365, 740)
  poligono(t, [
    [50, 110],
    [465, 210],
    [465, 330],
    [50, 230],
  ])
  poligono(t, [
    [50, 370],
    [465, 470],
    [465, 590],
    [50, 490],
  ])
  return t
}

function bemol(): Path {
  const t = new Path()
  // El palo y, pegada a su pie, la panza: una gota con su hueco.
  rectangulo(t, 80, -20, 150, 760)
  t.moveTo(150, -20)
  t.quadraticCurveTo(430, 120, 430, 300)
  t.quadraticCurveTo(430, 450, 290, 450)
  t.quadraticCurveTo(200, 450, 150, 390)
  t.close()
  // Hueco: mismo dibujo más pequeño, en sentido contrario.
  t.moveTo(150, 90)
  t.lineTo(150, 320)
  t.quadraticCurveTo(200, 370, 270, 370)
  t.quadraticCurveTo(345, 370, 345, 290)
  t.quadraticCurveTo(345, 190, 150, 90)
  t.close()
  return t
}

function becuadro(): Path {
  const t = new Path()
  rectangulo(t, 90, 120, 155, 760)
  rectangulo(t, 325, -170, 390, 470)
  poligono(t, [
    [90, 120],
    [390, 200],
    [390, 310],
    [90, 230],
  ])
  poligono(t, [
    [90, 360],
    [390, 440],
    [390, 550],
    [90, 470],
  ])
  return t
}

// ───────────────────────────── salida ─────────────────────────────

function construir(familia: string, em: number, glifos: Glyph[]): Buffer {
  const vacio = new Glyph({ name: '.notdef', unicode: 0, advanceWidth: Math.round(em / 2), path: new Path() })
  const fuente = new Font({
    familyName: familia,
    styleName: 'Regular',
    unitsPerEm: em,
    ascender: Math.round(em * 0.8),
    descender: -Math.round(em * 0.2),
    designer: 'Leitmotiv',
    license: 'Dibujo original del proyecto Leitmotiv. Se distribuye con la misma licencia que el código.',
    glyphs: [vacio, ...glifos],
  })
  return Buffer.from(fuente.toArrayBuffer())
}

const pixel = construir(
  'Leitmotiv Signos Pixel',
  EM_PIXEL,
  MAPAS.map(([nombre, codigo, filas]) => new Glyph({ name: nombre, unicode: codigo, advanceWidth: ((filas[0]?.length ?? 5) + 1) * PIXEL, path: trazadoDePixeles(filas) })),
)

const lisa = construir('Leitmotiv Signos', EM, [
  new Glyph({ name: 'sostenido', unicode: SOSTENIDO, advanceWidth: 515, path: sostenido() }),
  new Glyph({ name: 'bemol', unicode: BEMOL, advanceWidth: 480, path: bemol() }),
  new Glyph({ name: 'becuadro', unicode: BECUADRO, advanceWidth: 480, path: becuadro() }),
])

mkdirSync(DESTINO, { recursive: true })
writeFileSync(path.join(DESTINO, 'leitmotiv-signos-pixel.otf'), pixel)
writeFileSync(path.join(DESTINO, 'leitmotiv-signos.otf'), lisa)
console.log(`Fuentes de signos escritas en src/ui/fuentes (${pixel.length} y ${lisa.length} bytes).`)
