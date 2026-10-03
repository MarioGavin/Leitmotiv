/**
 * Tonalidades, escalas y acordes. Toda la teoría sale de Tonal; aquí solo está
 * la traducción entre cómo se escribe en el contenido («D mayor», «A dórico»,
 * «ii», «V7») y lo que Tonal entiende.
 */
import { Chord, Key, Note, RomanNumeral, Scale } from 'tonal'
import { type Nomenclatura, croma, cromaDeMidi, esClaseDeNota, nombreVisible } from './notas.ts'

// ───────────────────────────── modos ─────────────────────────────

interface DefModo {
  /** Nombre del tipo de escala en Tonal. */
  readonly tonal: string
  /** Nombre que se muestra al usuario. */
  readonly nombre: string
  /** Familia: decide qué alteraciones «de paso» se admiten y cómo se calcula la armonía. */
  readonly familia: 'mayor' | 'menor' | 'modal' | 'otra'
}

/** Modos admitidos en el contenido. La clave es como se escribe (sin tildes, en minúsculas). */
const MODOS: Readonly<Record<string, DefModo>> = {
  mayor: { tonal: 'major', nombre: 'mayor', familia: 'mayor' },
  menor: { tonal: 'minor', nombre: 'menor', familia: 'menor' },
  'menor armonica': { tonal: 'harmonic minor', nombre: 'menor armónica', familia: 'menor' },
  'menor melodica': { tonal: 'melodic minor', nombre: 'menor melódica', familia: 'menor' },
  jonico: { tonal: 'ionian', nombre: 'jónico', familia: 'modal' },
  dorico: { tonal: 'dorian', nombre: 'dórico', familia: 'modal' },
  frigio: { tonal: 'phrygian', nombre: 'frigio', familia: 'modal' },
  lidio: { tonal: 'lydian', nombre: 'lidio', familia: 'modal' },
  mixolidio: { tonal: 'mixolydian', nombre: 'mixolidio', familia: 'modal' },
  eolico: { tonal: 'aeolian', nombre: 'eólico', familia: 'modal' },
  locrio: { tonal: 'locrian', nombre: 'locrio', familia: 'modal' },
  'pentatonica mayor': { tonal: 'major pentatonic', nombre: 'pentatónica mayor', familia: 'otra' },
  'pentatonica menor': { tonal: 'minor pentatonic', nombre: 'pentatónica menor', familia: 'otra' },
  blues: { tonal: 'blues', nombre: 'blues', familia: 'otra' },
  'frigio dominante': { tonal: 'phrygian dominant', nombre: 'frigio dominante', familia: 'otra' },
  'tonos enteros': { tonal: 'whole tone', nombre: 'tonos enteros', familia: 'otra' },
  cromatica: { tonal: 'chromatic', nombre: 'cromática', familia: 'otra' },
}

function sinTildes(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function modosDisponibles(): string[] {
  return Object.values(MODOS).map((m) => m.nombre)
}

// ───────────────────────────── tonalidad ─────────────────────────────

export interface Tonalidad {
  /** Tal como se escribió, normalizada: «D mayor». */
  readonly texto: string
  /** Tónica como clase de nota: «D», «Bb». */
  readonly tonica: string
  readonly modo: DefModo
  /** Notas de la escala, desde la tónica. */
  readonly escala: readonly string[]
  /** Clases de nota (0–11) de la escala. */
  readonly cromas: ReadonlySet<number>
  /**
   * Clases de nota que se dan por buenas al comprobar una pieza. En las
   * tonalidades menores incluye el 6.º y el 7.º grado elevados (menor melódica
   * y armónica), que aparecen constantemente sin que la pieza cambie de tonalidad.
   */
  readonly cromasAdmitidas: ReadonlySet<number>
}

/** «D mayor», «A menor», «E frigio», «Bb mixolidio»… Lanza un error con la lista de modos si no la reconoce. */
export function leerTonalidad(texto: string): Tonalidad {
  const limpio = texto.trim().replace(/\s+/g, ' ')
  const espacio = limpio.indexOf(' ')
  const tonica = espacio < 0 ? limpio : limpio.slice(0, espacio)
  const clave = sinTildes(espacio < 0 ? '' : limpio.slice(espacio + 1)).toLowerCase()
  const modo = MODOS[clave]
  if (!esClaseDeNota(tonica) || !modo) {
    throw new Error(
      `Tonalidad no válida: «${texto}». Escribe la tónica y el modo, por ejemplo «D mayor» o «A menor». Modos: ${modosDisponibles().join(', ')}.`,
    )
  }
  const escala = Scale.get(`${tonica} ${modo.tonal}`).notes
  if (escala.length === 0) throw new Error(`Tonal no conoce la escala «${tonica} ${modo.tonal}».`)
  const cromas = new Set(escala.map(croma))
  const admitidas = new Set(cromas)
  if (modo.familia === 'menor') {
    for (const variante of ['minor', 'harmonic minor', 'melodic minor']) {
      for (const n of Scale.get(`${tonica} ${variante}`).notes) admitidas.add(croma(n))
    }
  }
  return { texto: `${tonica} ${modo.nombre}`, tonica, modo, escala, cromas, cromasAdmitidas: admitidas }
}

/** «D mayor» → «Re mayor» (latina) o «D mayor» (anglosajona), con las alteraciones bien escritas. */
export function tonalidadVisible(texto: string, nomenclatura: Nomenclatura): string {
  const t = leerTonalidad(texto)
  return `${nombreVisible(t.tonica, nomenclatura)} ${t.modo.nombre}`
}

/** ¿Pertenece esta nota MIDI a la tonalidad (contando las alteraciones admitidas)? */
export function estaEnTonalidad(midi: number, tonalidad: Tonalidad): boolean {
  return tonalidad.cromasAdmitidas.has(cromaDeMidi(midi))
}

/** Grado de la escala (1–7) de una nota MIDI, o `undefined` si no es de la escala. */
export function gradoDe(midi: number, tonalidad: Tonalidad): number | undefined {
  const c = cromaDeMidi(midi)
  const i = tonalidad.escala.findIndex((n) => croma(n) === c)
  return i < 0 ? undefined : i + 1
}

/** ¿Conviene escribir esta tonalidad con sostenidos o con bemoles? */
export function alteracionesDe(tonalidad: Tonalidad): 'sostenidos' | 'bemoles' {
  return tonalidad.escala.some((n) => n.includes('b')) ? 'bemoles' : 'sostenidos'
}

// ───────────────────────────── acordes ─────────────────────────────

export interface Acorde {
  /** Cifrado normalizado: «Cmaj7», «D/F#». */
  readonly simbolo: string
  readonly fundamental: string
  /** Bajo, si es un acorde con bajo distinto de la fundamental. */
  readonly bajo: string | undefined
  /** Notas del acorde como clases de nota, desde la fundamental. */
  readonly notas: readonly string[]
  readonly cromas: ReadonlySet<number>
  /** Calidad según Tonal: «Major», «Minor», «Diminished», «Augmented» o «Unknown». */
  readonly calidad: string
}

/** Lee un cifrado americano. Lanza un error si Tonal no lo reconoce. */
export function leerAcorde(simbolo: string): Acorde {
  const c = Chord.get(simbolo.trim())
  if (c.empty || !c.tonic) throw new Error(`Acorde no reconocido: «${simbolo}». Usa cifrado americano: C, Am, G7, Fmaj7, Bm7b5, D/F#.`)
  const notas = c.notes
  return {
    simbolo: c.symbol,
    fundamental: c.tonic,
    bajo: c.bass ? c.bass : undefined,
    notas,
    cromas: new Set([...notas, ...(c.bass ? [c.bass] : [])].map(croma)),
    calidad: c.quality,
  }
}

/**
 * Acorde que forman unas notas MIDI, en cifrado americano. Devuelve el
 * candidato en estado fundamental si lo hay; si no, el primero que proponga Tonal.
 */
export function acordeDeNotas(midis: readonly number[]): string | undefined {
  const orden = [...new Set(midis)].sort((a, b) => a - b)
  if (orden.length < 2) return undefined
  const nombres: string[] = []
  const vistas = new Set<number>()
  for (const m of orden) {
    const c = cromaDeMidi(m)
    if (vistas.has(c)) continue
    vistas.add(c)
    nombres.push(NOMBRES_CROMA[c] ?? 'C')
  }
  const candidatos = Chord.detect(nombres)
  if (candidatos.length === 0) return undefined
  const sinBajo = candidatos.find((c) => !c.includes('/'))
  // Tonal llama «DM» a la tríada mayor; el cifrado habitual es «D».
  return (sinBajo ?? candidatos[0] ?? '').replace(/^([A-G][#b]?)M($|\/)/, '$1$2')
}

const NOMBRES_CROMA = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const

// ───────────────────────────── grados ─────────────────────────────

/**
 * Convierte un grado en cifra romana en un acorde de la tonalidad.
 *
 * Se escribe como en armonía clásica: mayúscula para acordes mayores (I, IV, V),
 * minúscula para menores (ii, iii, vi), «°» para disminuidos (vii°), «ø» para
 * semidisminuidos (iiø7), «+» para aumentados y una «b» o «#» delante para
 * grados alterados (bVII, #iv°). Detrás puede ir la extensión: V7, Imaj7, ii7.
 */
export function acordeDeGrado(tonalidad: Tonalidad, grado: string): Acorde {
  const m = /^([b#]?)(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(°|ø|\+)?(.*)$/.exec(grado.trim())
  if (!m) throw new Error(`Grado no válido: «${grado}». Ejemplos: I, ii, IV, V7, vi, vii°, bVII.`)
  const [, alteracion = '', romano = '', marca = '', extension = ''] = m
  const esMenor = romano === romano.toLowerCase()
  const rn = RomanNumeral.get(`${alteracion}${romano.toUpperCase()}`)
  if (rn.empty || rn.interval === undefined) throw new Error(`Grado no válido: «${grado}».`)
  const fundamental = transponerClase(tonalidad.tonica, rn.interval)
  let tipo: string
  if (marca === '°') tipo = extension === '7' ? 'dim7' : `dim${extension}`
  else if (marca === 'ø') tipo = 'm7b5'
  else if (marca === '+') tipo = `aug${extension}`
  else if (esMenor) tipo = extension === 'maj7' ? 'mMaj7' : `m${extension}`
  else tipo = extension
  const error = new Error(`Grado no válido: «${grado}». Ejemplos: I, ii, IV, V7, vi, vii°, bVII.`)
  let acorde: Acorde
  try {
    acorde = leerAcorde(`${fundamental}${tipo}`)
  } catch {
    throw error
  }
  // Tonal interpreta «Gx» como Sol doble sostenido: si la fundamental cambia, la extensión no era tal.
  if (acorde.fundamental !== fundamental) throw error
  return acorde
}

function transponerClase(tonica: string, intervalo: string): string {
  const resultado = Note.transpose(tonica, intervalo)
  if (!resultado) throw new Error(`No se puede transportar «${tonica}» un intervalo «${intervalo}».`)
  return resultado
}

export type FuncionArmonica = 'T' | 'S' | 'D'

/**
 * Función armónica (tónica, subdominante o dominante) de cada acorde diatónico
 * de una tonalidad mayor o menor. En menor se incluyen también los acordes de
 * la escala armónica, porque el V mayor es el dominante habitual.
 */
export function funcionesArmonicas(tonalidad: Tonalidad): ReadonlyArray<{ acorde: string; funcion: FuncionArmonica }> {
  const fuentes =
    tonalidad.modo.familia === 'mayor'
      ? [Key.majorKey(tonalidad.tonica)]
      : tonalidad.modo.familia === 'menor'
        ? [Key.minorKey(tonalidad.tonica).natural, Key.minorKey(tonalidad.tonica).harmonic]
        : []
  const salida: Array<{ acorde: string; funcion: FuncionArmonica }> = []
  for (const k of fuentes) {
    k.triads.forEach((acorde, i) => {
      if (salida.some((s) => s.acorde === acorde)) return
      const f = k.chordsHarmonicFunction[i] ?? 'T'
      salida.push({ acorde, funcion: f === 'SD' ? 'S' : f === 'D' ? 'D' : 'T' })
    })
  }
  return salida
}

/** Función armónica de un acorde dentro de una tonalidad, o `undefined` si no es diatónico. */
export function funcionDe(simbolo: string, tonalidad: Tonalidad): FuncionArmonica | undefined {
  const triada = new Set(leerAcorde(simbolo).notas.slice(0, 3).map(croma))
  for (const { acorde, funcion } of funcionesArmonicas(tonalidad)) {
    const diatonica = new Set(leerAcorde(acorde).notas.map(croma))
    if (diatonica.size === triada.size && [...triada].every((c) => diatonica.has(c))) return funcion
  }
  return undefined
}
