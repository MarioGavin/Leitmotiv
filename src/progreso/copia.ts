/**
 * Copia de seguridad: todo el progreso y los ajustes en un archivo JSON, para
 * guardarlo fuera del dispositivo o llevarlo a otro.
 *
 * Al leer una copia no se da nada por bueno: cada registro se comprueba y se
 * reconstruye solo con los campos que se conocen. Un archivo que no es una
 * copia, o que viene estropeado, se rechaza entero con un mensaje que lo dice.
 */
import { type ValoresDeAjustes, migrar } from '../app/ajustes.ts'
import { esIdInstrumento } from '../musica/instrumentos.ts'
import { type AcordeMarcado, type Nota, type Pieza, type Pista, ROLES, type Rol, type Seccion } from '../musica/pieza.ts'
import type { Borrador, DatosDeProgreso, DiaDeEstudio, EstadoFsrs, PiezaGuardada, RegistroDeLeccion, Tarjeta } from './tipos.ts'

export const FORMATO_DE_COPIA = 1

export interface CopiaDeSeguridad {
  app: 'leitmotiv'
  formato: number
  /** Cuándo se hizo (fecha ISO). */
  creada: string
  ajustes: ValoresDeAjustes
  progreso: {
    lecciones: RegistroDeLeccion[]
    tarjetas: Tarjeta[]
    diario: DiaDeEstudio[]
    superadas: string[]
    repertorio: PiezaGuardada[]
    borradores: Borrador[]
  }
}

/** El archivo no es una copia de seguridad válida. */
export class ErrorDeCopia extends Error {}

export function crearCopia(datos: DatosDeProgreso, ajustes: ValoresDeAjustes, ahora: Date): CopiaDeSeguridad {
  return {
    app: 'leitmotiv',
    formato: FORMATO_DE_COPIA,
    creada: ahora.toISOString(),
    ajustes,
    progreso: {
      lecciones: Object.values(datos.lecciones),
      tarjetas: Object.values(datos.tarjetas),
      diario: Object.values(datos.diario),
      superadas: datos.superadas,
      repertorio: datos.repertorio,
      borradores: Object.values(datos.borradores),
    },
  }
}

/** Nombre del archivo: «leitmotiv-copia-2026-10-05.json». */
export function nombreDeCopia(ahora: Date): string {
  const dos = (n: number): string => String(n).padStart(2, '0')
  return `leitmotiv-copia-${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}.json`
}

// ───────────────────────────── lectura ─────────────────────────────

type Objeto = Record<string, unknown>

function fallo(donde: string, que: string): never {
  throw new ErrorDeCopia(`La copia de seguridad está dañada: ${donde} ${que}.`)
}

function objeto(valor: unknown, donde: string): Objeto {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) fallo(donde, 'no tiene la forma esperada')
  return valor as Objeto
}

function lista(valor: unknown, donde: string): unknown[] {
  if (!Array.isArray(valor)) fallo(donde, 'debería ser una lista')
  return valor as unknown[]
}

function texto(valor: unknown, donde: string): string {
  if (typeof valor !== 'string' || valor === '') fallo(donde, 'debería ser un texto')
  return valor as string
}

function numero(valor: unknown, donde: string, min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY): number {
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < min || valor > max) fallo(donde, 'no es un número válido')
  return valor as number
}

function entero(valor: unknown, donde: string, min: number, max: number): number {
  const n = numero(valor, donde, min, max)
  if (!Number.isInteger(n)) fallo(donde, 'debería ser un número entero')
  return n
}

function fecha(valor: unknown, donde: string): string {
  const t = texto(valor, donde)
  if (Number.isNaN(Date.parse(t))) fallo(donde, 'no es una fecha')
  return t
}

function conForma(valor: unknown, patron: RegExp, donde: string): string {
  const t = texto(valor, donde)
  if (!patron.test(t)) fallo(donde, `no es válido («${t.slice(0, 40)}»)`)
  return t
}

const ID_DE_LECCION = /^m\d{2}\.u\d{2}\.l\d{2}$/
const ID_DE_UNIDAD = /^m\d{2}\.u\d{2}$/
const ID_DE_PASO = /^m\d{2}\.u\d{2}\.l\d{2}#\d+$/
const DIA = /^\d{4}-\d{2}-\d{2}$/

function leerNota(valor: unknown, donde: string): Nota {
  const o = objeto(valor, donde)
  return { t: entero(o.t, `${donde}.t`, 0, 10_000_000), d: entero(o.d, `${donde}.d`, 1, 10_000_000), n: entero(o.n, `${donde}.n`, 0, 127), v: entero(o.v, `${donde}.v`, 1, 127) }
}

function leerPista(valor: unknown, donde: string): Pista {
  const o = objeto(valor, donde)
  const instrumento = texto(o.instrumento, `${donde}.instrumento`)
  if (!esIdInstrumento(instrumento)) fallo(`${donde}.instrumento`, `nombra un instrumento que no existe («${instrumento.slice(0, 40)}»)`)
  const rol = texto(o.rol, `${donde}.rol`)
  if (!(ROLES as readonly string[]).includes(rol)) fallo(`${donde}.rol`, 'no es un papel conocido')
  const pista: Pista = {
    id: texto(o.id, `${donde}.id`),
    rol: rol as Rol,
    instrumento,
    notas: lista(o.notas, `${donde}.notas`).map((n, i) => leerNota(n, `${donde}.notas[${i}]`)),
  }
  if (o.nombre !== undefined) pista.nombre = texto(o.nombre, `${donde}.nombre`)
  if (o.volumen !== undefined) pista.volumen = numero(o.volumen, `${donde}.volumen`, -60, 24)
  if (o.paneo !== undefined) pista.paneo = numero(o.paneo, `${donde}.paneo`, -1, 1)
  if (o.capa !== undefined) pista.capa = texto(o.capa, `${donde}.capa`)
  if (o.silenciada !== undefined) pista.silenciada = o.silenciada === true
  return pista
}

function leerPieza(valor: unknown, donde: string): Pieza {
  const o = objeto(valor, donde)
  const compas = lista(o.compas, `${donde}.compas`)
  const denominador = entero(compas[1], `${donde}.compas`, 1, 32)
  if (compas.length !== 2 || ![1, 2, 4, 8, 16, 32].includes(denominador)) fallo(`${donde}.compas`, 'no es un compás')
  const pieza: Pieza = {
    tempo: numero(o.tempo, `${donde}.tempo`, 30, 300),
    compas: [entero(compas[0], `${donde}.compas`, 1, 32), denominador],
    compases: entero(o.compases, `${donde}.compases`, 1, 512),
    pistas: lista(o.pistas, `${donde}.pistas`).map((p, i) => leerPista(p, `${donde}.pistas[${i}]`)),
  }
  if (new Set(pieza.pistas.map((p) => p.id)).size !== pieza.pistas.length) fallo(`${donde}.pistas`, 'tiene dos pistas con el mismo identificador')
  if (o.titulo !== undefined) pieza.titulo = texto(o.titulo, `${donde}.titulo`)
  if (o.tonalidad !== undefined) pieza.tonalidad = texto(o.tonalidad, `${donde}.tonalidad`)
  if (o.bucle !== undefined) pieza.bucle = o.bucle === true
  if (o.swing !== undefined) pieza.swing = numero(o.swing, `${donde}.swing`, 0, 1)
  if (o.acordes !== undefined) {
    pieza.acordes = lista(o.acordes, `${donde}.acordes`).map((a, i): AcordeMarcado => {
      const acorde = objeto(a, `${donde}.acordes[${i}]`)
      return { t: entero(acorde.t, `${donde}.acordes[${i}].t`, 0, 10_000_000), d: entero(acorde.d, `${donde}.acordes[${i}].d`, 1, 10_000_000), simbolo: texto(acorde.simbolo, `${donde}.acordes[${i}].simbolo`) }
    })
  }
  if (o.secciones !== undefined) {
    pieza.secciones = lista(o.secciones, `${donde}.secciones`).map((s, i): Seccion => {
      const seccion = objeto(s, `${donde}.secciones[${i}]`)
      const leida: Seccion = { id: texto(seccion.id, `${donde}.secciones[${i}].id`), desde: entero(seccion.desde, `${donde}.secciones[${i}].desde`, 1, 512), hasta: entero(seccion.hasta, `${donde}.secciones[${i}].hasta`, 1, 512) }
      if (seccion.nombre !== undefined) leida.nombre = texto(seccion.nombre, `${donde}.secciones[${i}].nombre`)
      return leida
    })
  }
  return pieza
}

function leerFsrs(valor: unknown, donde: string): EstadoFsrs {
  const o = objeto(valor, donde)
  const estado: EstadoFsrs = {
    due: fecha(o.due, `${donde}.due`),
    stability: numero(o.stability, `${donde}.stability`, 0),
    difficulty: numero(o.difficulty, `${donde}.difficulty`, 0),
    elapsed_days: numero(o.elapsed_days, `${donde}.elapsed_days`, 0),
    scheduled_days: numero(o.scheduled_days, `${donde}.scheduled_days`, 0),
    learning_steps: numero(o.learning_steps, `${donde}.learning_steps`, 0),
    reps: entero(o.reps, `${donde}.reps`, 0, 1_000_000),
    lapses: entero(o.lapses, `${donde}.lapses`, 0, 1_000_000),
    state: entero(o.state, `${donde}.state`, 0, 3),
  }
  if (o.last_review !== undefined && o.last_review !== null) estado.last_review = fecha(o.last_review, `${donde}.last_review`)
  return estado
}

function sinRepetir<T>(registros: readonly T[], clave: (r: T) => string, donde: string): Record<string, T> {
  const salida: Record<string, T> = {}
  for (const registro of registros) {
    const id = clave(registro)
    if (Object.hasOwn(salida, id)) fallo(donde, `tiene dos registros de «${id}»`)
    salida[id] = registro
  }
  return salida
}

/** Lee el texto de una copia de seguridad. Lanza `ErrorDeCopia` si no lo es o está dañada. */
export function leerCopia(contenido: string): { ajustes: ValoresDeAjustes; datos: DatosDeProgreso; creada: string } {
  let leido: unknown
  try {
    leido = JSON.parse(contenido)
  } catch {
    throw new ErrorDeCopia('Ese archivo no es una copia de seguridad de Leitmotiv.')
  }
  if (typeof leido !== 'object' || leido === null || (leido as Objeto).app !== 'leitmotiv') throw new ErrorDeCopia('Ese archivo no es una copia de seguridad de Leitmotiv.')
  const copia = leido as Objeto
  if (typeof copia.formato !== 'number' || copia.formato > FORMATO_DE_COPIA) {
    throw new ErrorDeCopia('Esta copia la hizo una versión más nueva de Leitmotiv. Actualiza la app y vuelve a intentarlo.')
  }
  const progreso = objeto(copia.progreso, 'el progreso')

  const lecciones = lista(progreso.lecciones, 'la lista de lecciones').map((valor, i): RegistroDeLeccion => {
    const donde = `la lección ${i + 1}`
    const o = objeto(valor, donde)
    return {
      id: conForma(o.id, ID_DE_LECCION, `${donde} (id)`),
      completada: fecha(o.completada, `${donde} (completada)`),
      ultima: fecha(o.ultima, `${donde} (ultima)`),
      veces: entero(o.veces, `${donde} (veces)`, 1, 1_000_000),
      mejor: numero(o.mejor, `${donde} (mejor)`, 0, 1),
    }
  })
  const tarjetas = lista(progreso.tarjetas, 'la lista de repasos').map((valor, i): Tarjeta => {
    const donde = `el repaso ${i + 1}`
    const o = objeto(valor, donde)
    const tarjeta: Tarjeta = { concepto: texto(o.concepto, `${donde} (concepto)`), fsrs: leerFsrs(o.fsrs, `${donde} (fsrs)`) }
    if (o.ultimoPaso !== undefined) tarjeta.ultimoPaso = conForma(o.ultimoPaso, ID_DE_PASO, `${donde} (ultimoPaso)`)
    return tarjeta
  })
  const diario = lista(progreso.diario, 'el diario').map((valor, i): DiaDeEstudio => {
    const donde = `el día ${i + 1} del diario`
    const o = objeto(valor, donde)
    return {
      dia: conForma(o.dia, DIA, `${donde} (dia)`),
      xp: entero(o.xp, `${donde} (xp)`, 0, 10_000_000),
      lecciones: entero(o.lecciones, `${donde} (lecciones)`, 0, 100_000),
      repasos: entero(o.repasos, `${donde} (repasos)`, 0, 100_000),
    }
  })
  const superadas = lista(progreso.superadas, 'la lista de unidades superadas').map((valor, i) => conForma(valor, ID_DE_UNIDAD, `la unidad superada ${i + 1}`))
  const repertorio = lista(progreso.repertorio, 'el repertorio').map((valor, i): PiezaGuardada => {
    const donde = `la pieza ${i + 1} del repertorio`
    const o = objeto(valor, donde)
    const pieza: PiezaGuardada = {
      id: texto(o.id, `${donde} (id)`),
      titulo: texto(o.titulo, `${donde} (titulo)`),
      pieza: leerPieza(o.pieza, donde),
      creada: fecha(o.creada, `${donde} (creada)`),
      modificada: fecha(o.modificada, `${donde} (modificada)`),
    }
    if (o.origen !== undefined) pieza.origen = conForma(o.origen, ID_DE_LECCION, `${donde} (origen)`)
    return pieza
  })
  const borradores = lista(progreso.borradores, 'la lista de borradores').map((valor, i): Borrador => {
    const donde = `el borrador ${i + 1}`
    const o = objeto(valor, donde)
    return { id: conForma(o.id, ID_DE_PASO, `${donde} (id)`), pieza: leerPieza(o.pieza, donde), modificada: fecha(o.modificada, `${donde} (modificada)`) }
  })
  if (new Set(repertorio.map((p) => p.id)).size !== repertorio.length) fallo('el repertorio', 'tiene dos piezas con el mismo identificador')

  return {
    // Los ajustes pasan por el mismo filtro que los guardados por versiones anteriores de la app.
    ajustes: migrar(copia.ajustes),
    creada: typeof copia.creada === 'string' && !Number.isNaN(Date.parse(copia.creada)) ? copia.creada : new Date(0).toISOString(),
    datos: {
      lecciones: sinRepetir(lecciones, (l) => l.id, 'la lista de lecciones'),
      tarjetas: sinRepetir(tarjetas, (t) => t.concepto, 'la lista de repasos'),
      diario: sinRepetir(diario, (d) => d.dia, 'el diario'),
      superadas: [...new Set(superadas)],
      repertorio: repertorio.sort((a, b) => b.modificada.localeCompare(a.modificada)),
      borradores: sinRepetir(borradores, (b) => b.id, 'la lista de borradores'),
    },
  }
}
