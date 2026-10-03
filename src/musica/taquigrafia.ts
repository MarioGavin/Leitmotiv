/**
 * Taquigrafía musical: la forma compacta en que se escriben las notas en los
 * archivos de contenido. Se convierte a notas con tiempos en ticks al compilar.
 *
 *   "A4:4 D5:4 F#5:4. E5:8 | D5:4 B4:4 A4:2"
 *
 * Cada evento es `qué:figura`. Las barras `|` separan compases y se comprueba
 * que cada compás esté completo. Ver CONTENT_GUIDE.md para la referencia entera.
 */
import { INSTRUMENTOS, type IdInstrumento, type Instrumento } from './instrumentos.ts'
import { midiDe } from './notas.ts'
import type { AcordeMarcado, Nota } from './pieza.ts'
import { leerAcorde } from './tonalidad.ts'
import { type Compas, leerFigura, ticksPorCompas } from './tiempo.ts'

/** Velocidad MIDI de cada matiz. */
export const MATICES: Readonly<Record<string, number>> = { pp: 40, p: 56, mp: 72, mf: 88, f: 104, ff: 120 }
export const MATIZ_POR_DEFECTO = 'mf'
const ACENTO = 16

export class ErrorDeTaquigrafia extends Error {
  override readonly name = 'ErrorDeTaquigrafia'
}

export interface Hueco {
  t: number
  d: number
}

export interface ResultadoNotas {
  notas: Nota[]
  /** Tramos marcados con `?` para que los rellene el usuario (ejercicios de completar). */
  huecos: Hueco[]
  /** Número de compases escritos. */
  compases: number
}

interface OpcionesNotas {
  compas: Compas
  instrumento: IdInstrumento
  /** Matiz inicial: pp, p, mp, mf, f o ff. */
  matiz?: string
  /** Si es `false`, no se exige que el último compás esté completo (fragmentos para rellenar huecos). */
  compasesCompletos?: boolean
}

/** Separa por espacios, pero mantiene juntos los acordes entre corchetes: `[C4 E4 G4]:2`. */
function trocear(texto: string): string[] {
  const trozos: string[] = []
  let actual = ''
  let dentro = 0
  for (const c of texto) {
    if (c === '[') dentro++
    if (c === ']') dentro = Math.max(0, dentro - 1)
    if (dentro === 0 && (c === '|' || /\s/.test(c))) {
      if (actual) trozos.push(actual)
      actual = ''
      if (c === '|') trozos.push('|')
    } else {
      actual += c
    }
  }
  if (dentro > 0) throw new ErrorDeTaquigrafia(`Falta cerrar un corchete en «${texto.trim()}».`)
  if (actual) trozos.push(actual)
  return trozos
}

function alturaDe(simbolo: string, instrumento: Instrumento, id: IdInstrumento): number {
  if (instrumento.percusion) {
    const pieza = instrumento.percusion[simbolo]
    if (!pieza) {
      throw new ErrorDeTaquigrafia(
        `«${simbolo}» no es una pieza de «${id}». Piezas disponibles: ${Object.keys(instrumento.percusion).join(', ')}.`,
      )
    }
    return pieza.tecla
  }
  try {
    return midiDe(simbolo)
  } catch (e) {
    throw new ErrorDeTaquigrafia((e as Error).message)
  }
}

/**
 * Convierte la taquigrafía de una pista en notas.
 *
 * - `C4:4`  nota y figura (1 redonda, 2 blanca, 4 negra, 8 corchea, 16, 32; `.` puntillo; `t` tresillo)
 * - `[C4 E4 G4]:2`  varias notas a la vez
 * - `r:4`  silencio
 * - `C4:2~ | C4:2`  ligadura: une la nota con la siguiente de la misma altura
 * - `C4:4>`  acento
 * - `!p` `!f`  cambia el matiz desde ese punto
 * - `%`  repite el compás anterior
 * - `?:2`  hueco que rellenará el usuario
 */
export function leerNotas(texto: string, opciones: OpcionesNotas): ResultadoNotas {
  const instrumento: Instrumento = INSTRUMENTOS[opciones.instrumento]
  const porCompas = ticksPorCompas(opciones.compas)
  const notas: Nota[] = []
  const huecos: Hueco[] = []
  let velocidad = MATICES[opciones.matiz ?? MATIZ_POR_DEFECTO]
  if (velocidad === undefined) throw new ErrorDeTaquigrafia(`Matiz no válido: «${opciones.matiz}». Usa pp, p, mp, mf, f o ff.`)

  let compas = 0
  let enCompas = 0
  /** Notas del compás en curso y del anterior, para poder repetir con `%`. */
  let actuales: Nota[] = []
  let huecosActuales: Hueco[] = []
  let anteriores: Nota[] | undefined
  /** Notas que esperan una ligadura, por altura. */
  const ligadas = new Map<number, Nota>()
  let repeticion = false

  const cerrarCompas = (obligatorio: boolean): void => {
    if (repeticion) {
      if (!anteriores) throw new ErrorDeTaquigrafia(`El compás ${compas + 1} usa «%» pero no hay compás anterior que repetir.`)
      const base = compas * porCompas
      actuales = anteriores.map((n) => ({ ...n, t: base + (n.t % porCompas) }))
      enCompas = porCompas
    }
    if (enCompas !== porCompas && (obligatorio || enCompas > porCompas)) {
      const que = enCompas < porCompas ? 'le faltan' : 'le sobran'
      throw new ErrorDeTaquigrafia(
        `El compás ${compas + 1} está mal medido: ${que} ${Math.abs(porCompas - enCompas)} ticks (una negra son 480). Dura ${enCompas} y debería durar ${porCompas}.`,
      )
    }
    notas.push(...actuales)
    huecos.push(...huecosActuales)
    anteriores = actuales
    actuales = []
    huecosActuales = []
    enCompas = 0
    repeticion = false
    compas++
  }

  const trozos = trocear(texto)
  for (const trozo of trozos) {
    if (trozo === '|') {
      cerrarCompas(true)
      continue
    }
    if (trozo === '%') {
      if (enCompas > 0) throw new ErrorDeTaquigrafia(`«%» debe ocupar un compás entero (compás ${compas + 1}).`)
      repeticion = true
      continue
    }
    if (repeticion) throw new ErrorDeTaquigrafia(`«%» debe ocupar un compás entero (compás ${compas + 1}).`)
    if (trozo.startsWith('!')) {
      const v = MATICES[trozo.slice(1)]
      if (v === undefined) throw new ErrorDeTaquigrafia(`Matiz no válido: «${trozo}». Usa !pp, !p, !mp, !mf, !f o !ff.`)
      velocidad = v
      continue
    }
    const m = /^(\[[^\]]+\]|[^:\s]+):([0-9.t]+)(~?)(>?)$/.exec(trozo)
    if (!m) {
      throw new ErrorDeTaquigrafia(`No entiendo «${trozo}» en el compás ${compas + 1}. Cada evento se escribe como nota:figura, por ejemplo C4:4.`)
    }
    const [, que = '', figura = '', ligadura = '', acento = ''] = m
    let d: number
    try {
      d = leerFigura(figura)
    } catch (e) {
      throw new ErrorDeTaquigrafia(`${(e as Error).message} (compás ${compas + 1})`)
    }
    const t = compas * porCompas + enCompas
    if ((que === 'r' || que === '?') && ligadas.size > 0) {
      throw new ErrorDeTaquigrafia(`En el compás ${compas + 1} hay una ligadura «~» que no llega a una nota de la misma altura.`)
    }
    if (que === 'r') {
      // Silencio: solo avanza el tiempo.
    } else if (que === '?') {
      huecosActuales.push({ t, d })
    } else {
      const simbolos = que.startsWith('[') ? que.slice(1, -1).trim().split(/\s+/) : [que]
      const v = Math.min(127, velocidad + (acento ? ACENTO : 0))
      const nuevasLigadas = new Map<number, Nota>()
      for (const simbolo of simbolos) {
        const n = alturaDe(simbolo, instrumento, opciones.instrumento)
        const previa = ligadas.get(n)
        let nota: Nota
        if (previa) {
          previa.d += d
          nota = previa
        } else {
          nota = { t, d, n, v }
          actuales.push(nota)
        }
        if (ligadura) nuevasLigadas.set(n, nota)
      }
      const sobrantes = [...ligadas.keys()].filter((n) => !simbolos.some((s) => alturaDe(s, instrumento, opciones.instrumento) === n))
      if (sobrantes.length > 0) {
        throw new ErrorDeTaquigrafia(`En el compás ${compas + 1} hay una ligadura «~» que no llega a una nota de la misma altura.`)
      }
      ligadas.clear()
      for (const [n, nota] of nuevasLigadas) ligadas.set(n, nota)
    }
    enCompas += d
    if (enCompas > porCompas) cerrarCompas(true)
  }
  if (repeticion || enCompas > 0) cerrarCompas(opciones.compasesCompletos !== false)
  if (ligadas.size > 0) throw new ErrorDeTaquigrafia('La última nota tiene una ligadura «~» que no llega a ninguna parte.')
  notas.sort((a, b) => a.t - b.t || a.n - b.n)
  return { notas, huecos, compases: compas }
}

/**
 * Lee un fragmento suelto (sin barras de compás ni ligaduras): lo que rellena un
 * hueco en un ejercicio. Los tiempos empiezan en 0.
 */
export function leerFragmento(texto: string, opciones: { instrumento: IdInstrumento; matiz?: string }): { notas: Nota[]; duracion: number } {
  const instrumento: Instrumento = INSTRUMENTOS[opciones.instrumento]
  let velocidad = MATICES[opciones.matiz ?? MATIZ_POR_DEFECTO] ?? 88
  const notas: Nota[] = []
  let t = 0
  for (const trozo of trocear(texto)) {
    if (trozo === '|') throw new ErrorDeTaquigrafia('Un fragmento no lleva barras de compás.')
    if (trozo.startsWith('!')) {
      const v = MATICES[trozo.slice(1)]
      if (v === undefined) throw new ErrorDeTaquigrafia(`Matiz no válido: «${trozo}».`)
      velocidad = v
      continue
    }
    const m = /^(\[[^\]]+\]|[^:\s]+):([0-9.t]+)(>?)$/.exec(trozo)
    if (!m) throw new ErrorDeTaquigrafia(`No entiendo «${trozo}». Cada evento se escribe como nota:figura, por ejemplo C4:4.`)
    const [, que = '', figura = '', acento = ''] = m
    const d = leerFigura(figura)
    if (que === '?') throw new ErrorDeTaquigrafia('Un fragmento no puede tener huecos.')
    if (que !== 'r') {
      const simbolos = que.startsWith('[') ? que.slice(1, -1).trim().split(/\s+/) : [que]
      for (const simbolo of simbolos) {
        notas.push({ t, d, n: alturaDe(simbolo, instrumento, opciones.instrumento), v: Math.min(127, velocidad + (acento ? ACENTO : 0)) })
      }
    }
    t += d
  }
  if (t === 0) throw new ErrorDeTaquigrafia('El fragmento está vacío.')
  return { notas, duracion: t }
}

/** Duración total, en ticks, de un fragmento de taquigrafía (sin exigir compases completos). */
export function duracionDeFragmento(texto: string, instrumento: IdInstrumento): number {
  let total = 0
  for (const trozo of trocear(texto)) {
    if (trozo === '|' || trozo.startsWith('!')) continue
    const m = /^(\[[^\]]+\]|[^:\s]+):([0-9.t]+)(~?)(>?)$/.exec(trozo)
    if (!m) throw new ErrorDeTaquigrafia(`No entiendo «${trozo}». Cada evento se escribe como nota:figura, por ejemplo C4:4.`)
    const que = m[1] ?? ''
    if (que !== 'r' && que !== '?') {
      const simbolos = que.startsWith('[') ? que.slice(1, -1).trim().split(/\s+/) : [que]
      for (const s of simbolos) alturaDe(s, INSTRUMENTOS[instrumento], instrumento)
    }
    total += leerFigura(m[2] ?? '')
  }
  return total
}

// ───────────────────────────── rejilla de percusión ─────────────────────────────

export interface Rejilla {
  /** Figura de cada casilla: «16» semicorcheas, «8» corcheas, «8t» corcheas de tresillo… */
  paso: string
  /** Una línea por pieza del kit: `x` golpe, `X` acento, `o` golpe flojo, `.` silencio. */
  lineas: Readonly<Record<string, string>>
}

const VELOCIDAD_CASILLA: Readonly<Record<string, number>> = { x: 100, X: 122, o: 62 }

/**
 * Convierte una rejilla de percusión en notas. Cada línea se repite hasta
 * llenar los compases pedidos; su longitud debe ser un número entero de compases.
 */
export function leerRejilla(rejilla: Rejilla, opciones: { compas: Compas; instrumento: IdInstrumento; compases: number }): Nota[] {
  const instrumento: Instrumento = INSTRUMENTOS[opciones.instrumento]
  if (!instrumento.percusion) throw new ErrorDeTaquigrafia(`La rejilla solo sirve para percusión, y «${opciones.instrumento}» no lo es.`)
  const paso = leerFigura(rejilla.paso)
  const porCompas = ticksPorCompas(opciones.compas)
  if (porCompas % paso !== 0) {
    throw new ErrorDeTaquigrafia(`Un compás no se divide en un número entero de casillas de «${rejilla.paso}».`)
  }
  const casillasPorCompas = porCompas / paso
  const notas: Nota[] = []
  for (const [alias, lineaCruda] of Object.entries(rejilla.lineas)) {
    const tecla = alturaDe(alias, instrumento, opciones.instrumento)
    const linea = lineaCruda.replace(/[|\s]/g, '')
    if (!/^[xXo.-]+$/.test(linea)) throw new ErrorDeTaquigrafia(`La línea «${alias}» de la rejilla solo puede tener x, X, o y puntos.`)
    if (linea.length % casillasPorCompas !== 0) {
      throw new ErrorDeTaquigrafia(
        `La línea «${alias}» tiene ${linea.length} casillas y cada compás tiene ${casillasPorCompas}: debe ocupar compases enteros.`,
      )
    }
    const compasesDeLinea = linea.length / casillasPorCompas
    if (opciones.compases % compasesDeLinea !== 0) {
      throw new ErrorDeTaquigrafia(`La línea «${alias}» dura ${compasesDeLinea} compases y no cabe un número entero de veces en ${opciones.compases}.`)
    }
    const total = casillasPorCompas * opciones.compases
    for (let i = 0; i < total; i++) {
      const v = VELOCIDAD_CASILLA[linea[i % linea.length] ?? '.']
      if (v !== undefined) notas.push({ t: i * paso, d: paso, n: tecla, v })
    }
  }
  notas.sort((a, b) => a.t - b.t || a.n - b.n)
  return notas
}

/** Lee un patrón rítmico de una sola línea («x...x.x.») y devuelve los instantes de cada golpe, en ticks. */
export function leerPatronRitmico(patron: string, paso: string, compas: Compas): { golpes: number[]; acentos: boolean[]; duracion: number } {
  const linea = patron.replace(/[|\s]/g, '')
  if (!/^[xXo.-]+$/.test(linea)) throw new ErrorDeTaquigrafia('El patrón solo puede tener x, X, o y puntos.')
  const ticksPaso = leerFigura(paso)
  const porCompas = ticksPorCompas(compas)
  if ((linea.length * ticksPaso) % porCompas !== 0) {
    throw new ErrorDeTaquigrafia(`El patrón tiene ${linea.length} casillas de «${paso}» y no ocupa compases enteros de ${compas[0]}/${compas[1]}.`)
  }
  const golpes: number[] = []
  const acentos: boolean[] = []
  for (const [i, c] of [...linea].entries()) {
    if (c === 'x' || c === 'X' || c === 'o') {
      golpes.push(i * ticksPaso)
      acentos.push(c === 'X')
    }
  }
  if (golpes.length === 0) throw new ErrorDeTaquigrafia('El patrón no tiene ningún golpe.')
  return { golpes, acentos, duracion: linea.length * ticksPaso }
}

// ───────────────────────────── acordes ─────────────────────────────

/**
 * Lee la línea de acordes de una pieza: `"D:1 | G:2 A:2 | % | Bm:2 A7:2"`.
 * `-` indica un tramo sin acorde. `?` deja un hueco (ejercicios de elegir acorde).
 */
export function leerAcordes(texto: string, compas: Compas): { acordes: AcordeMarcado[]; huecos: Hueco[]; compases: number } {
  const porCompas = ticksPorCompas(compas)
  const acordes: AcordeMarcado[] = []
  const huecos: Hueco[] = []
  let numero = 0
  let enCompas = 0
  let actuales: AcordeMarcado[] = []
  let anteriores: AcordeMarcado[] | undefined
  let repeticion = false

  const cerrar = (): void => {
    if (repeticion) {
      if (!anteriores) throw new ErrorDeTaquigrafia(`El compás ${numero + 1} de acordes usa «%» pero no hay compás anterior.`)
      const base = numero * porCompas
      actuales = anteriores.map((a) => ({ ...a, t: base + (a.t % porCompas) }))
      enCompas = porCompas
    }
    if (enCompas !== porCompas) {
      throw new ErrorDeTaquigrafia(`El compás ${numero + 1} de acordes dura ${enCompas} ticks y debería durar ${porCompas}.`)
    }
    acordes.push(...actuales)
    anteriores = actuales
    actuales = []
    enCompas = 0
    repeticion = false
    numero++
  }

  for (const trozo of trocear(texto)) {
    if (trozo === '|') {
      cerrar()
      continue
    }
    if (trozo === '%') {
      repeticion = true
      continue
    }
    const sep = trozo.lastIndexOf(':')
    if (sep < 0) throw new ErrorDeTaquigrafia(`No entiendo el acorde «${trozo}». Se escribe como acorde:figura, por ejemplo G7:2.`)
    const simbolo = trozo.slice(0, sep)
    const d = leerFigura(trozo.slice(sep + 1))
    const t = numero * porCompas + enCompas
    if (simbolo === '?') huecos.push({ t, d })
    else if (simbolo !== '-') {
      try {
        actuales.push({ t, d, simbolo: leerAcorde(simbolo).simbolo })
      } catch (e) {
        throw new ErrorDeTaquigrafia(`${(e as Error).message} (compás ${numero + 1} de acordes)`)
      }
    }
    enCompas += d
  }
  if (repeticion || enCompas > 0) cerrar()
  return { acordes, huecos, compases: numero }
}
