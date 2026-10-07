/**
 * Recorre /content, valida cada archivo contra su esquema, compila las
 * lecciones y aplica las reglas de conjunto (ocho lecciones por unidad, encargo
 * final, conceptos y términos existentes…).
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import YAML from 'yaml'
import type * as z from 'zod'
import {
  ConceptosFuente,
  FichaFuente,
  GlosarioFuente,
  LeccionFuente,
  MundoFuente,
  PruebaDeNivelFuente,
  UnidadFuente,
} from '../../src/contenido/esquemas.ts'
import type {
  BloqueDePrueba,
  Concepto,
  Ficha,
  IndiceDelCurso,
  Leccion,
  ResumenDeLeccion,
  ResumenDeMundo,
  ResumenDeUnidad,
  TerminoDeGlosario,
} from '../../src/contenido/tipos.ts'
import { Contexto, type Entorno, type HallazgoDeContenido } from './contexto.ts'
import { compilarPaso } from './pasos.ts'
import { compilarPieza } from './pieza.ts'

export interface CursoCompilado {
  indice: IndiceDelCurso
  lecciones: Leccion[]
  conceptos: Concepto[]
  glosario: TerminoDeGlosario[]
  fichas: Ficha[]
  prueba: BloqueDePrueba[]
  hallazgos: HallazgoDeContenido[]
}

/** Mínimo de lecciones de una unidad publicada. */
export const LECCIONES_POR_UNIDAD = 8

function rutaDeCampo(camino: ReadonlyArray<PropertyKey>): string {
  return camino.map((p) => (typeof p === 'number' ? `[${p}]` : String(p))).join('.').replaceAll('.[', '[')
}

/** Lee un YAML y lo valida contra su esquema. Los fallos se anotan con la ruta del campo. */
function cargar<T extends z.ZodType>(archivo: string, esquema: T, ctx: Contexto): z.output<T> | undefined {
  let crudo: unknown
  try {
    crudo = YAML.parse(readFileSync(archivo, 'utf8'))
  } catch (e) {
    ctx.error('yaml-no-valido', `No se puede leer el YAML: ${(e as Error).message.split('\n')[0]}`)
    return undefined
  }
  const r = esquema.safeParse(crudo)
  if (r.success) return r.data
  for (const problema of r.error.issues) {
    const donde = rutaDeCampo(problema.path)
    ctx.entorno.hallazgos.push({ nivel: 'error', codigo: 'esquema', mensaje: problema.message, donde: donde ? `${ctx.ruta} › ${donde}` : ctx.ruta })
  }
  return undefined
}

function subcarpetas(dir: string, patron: RegExp): Array<{ id: string; ruta: string; nombre: string }> {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((n) => statSync(path.join(dir, n)).isDirectory())
    .sort()
    .flatMap((nombre) => {
      const m = patron.exec(nombre)
      return m?.[1] ? [{ id: m[1], ruta: path.join(dir, nombre), nombre }] : []
    })
}

export function compilarCurso(raiz: string): CursoCompilado {
  const entorno: Entorno = { hallazgos: [] }
  const relativo = (archivo: string): string => path.relative(raiz, archivo).split(path.sep).join('/')
  const ctxDe = (archivo: string): Contexto => new Contexto(entorno, relativo(archivo))

  // ── Glosario y conceptos: se cargan antes porque los textos enlazan a ellos ──
  const archivoGlosario = path.join(raiz, 'glosario.yaml')
  const glosarioFuente = existsSync(archivoGlosario) ? cargar(archivoGlosario, GlosarioFuente, ctxDe(archivoGlosario)) : undefined
  const terminos = new Map<string, string>()
  for (const [id, t] of Object.entries(glosarioFuente ?? {})) terminos.set(id, t.termino)
  entorno.glosario = terminos

  const archivoConceptos = path.join(raiz, 'conceptos.yaml')
  const conceptosFuente = existsSync(archivoConceptos) ? cargar(archivoConceptos, ConceptosFuente, ctxDe(archivoConceptos)) : undefined
  if (!existsSync(archivoConceptos)) entorno.hallazgos.push({ nivel: 'error', codigo: 'falta-archivo', mensaje: 'Falta conceptos.yaml.', donde: 'conceptos.yaml' })
  entorno.conceptos = new Set(Object.keys(conceptosFuente ?? {}))

  const glosario: TerminoDeGlosario[] = []
  for (const [id, t] of Object.entries(glosarioFuente ?? {})) {
    const c = ctxDe(archivoGlosario).en(id)
    const termino: TerminoDeGlosario = { id, termino: t.termino, definicion: c.prosa('definicion', t.definicion), ver: t.ver ?? [] }
    for (const otro of termino.ver) {
      if (!terminos.has(otro)) c.error('termino-desconocido', `\`ver\` apunta a «${otro}», que no está en el glosario.`)
    }
    if (t.ejemplo) {
      const compilada = compilarPieza(t.ejemplo, c.en('ejemplo'))
      if (compilada) termino.ejemplo = compilada.pieza
    }
    glosario.push(termino)
  }

  // ── Mundos, unidades y lecciones ──
  const lecciones: Leccion[] = []
  const mundos: ResumenDeMundo[] = []
  const pasosPorConcepto = new Map<string, string[]>()

  for (const m of subcarpetas(path.join(raiz, 'mundos'), /^(m\d{2})(-[a-z0-9-]+)?$/)) {
    const archivoMundo = path.join(m.ruta, 'mundo.yaml')
    if (!existsSync(archivoMundo)) {
      entorno.hallazgos.push({ nivel: 'error', codigo: 'falta-archivo', mensaje: 'Falta mundo.yaml.', donde: relativo(m.ruta) })
      continue
    }
    const ctxMundo = ctxDe(archivoMundo)
    const mundo = cargar(archivoMundo, MundoFuente, ctxMundo)
    if (!mundo) continue
    const unidades: ResumenDeUnidad[] = []

    for (const u of subcarpetas(m.ruta, /^(u\d{2})(-[a-z0-9-]+)?$/)) {
      const archivoUnidad = path.join(u.ruta, 'unidad.yaml')
      if (!existsSync(archivoUnidad)) {
        entorno.hallazgos.push({ nivel: 'error', codigo: 'falta-archivo', mensaje: 'Falta unidad.yaml.', donde: relativo(u.ruta) })
        continue
      }
      const ctxUnidad = ctxDe(archivoUnidad)
      const unidad = cargar(archivoUnidad, UnidadFuente, ctxUnidad)
      if (!unidad) continue
      const idUnidad = `${m.id}.${u.id}`
      const resumenes: ResumenDeLeccion[] = []

      const archivos = readdirSync(u.ruta)
        .filter((n) => /^l\d{2}(-[a-z0-9-]+)?\.ya?ml$/.test(n))
        .sort()
      for (const nombre of archivos) {
        const archivo = path.join(u.ruta, nombre)
        const idLeccion = `${idUnidad}.${nombre.slice(0, 3)}`
        const ctxLeccion = ctxDe(archivo)
        const fuente = cargar(archivo, LeccionFuente, ctxLeccion)
        if (!fuente) continue
        if (lecciones.some((l) => l.id === idLeccion)) ctxLeccion.error('leccion-repetida', `Ya hay otra lección con el número ${nombre.slice(0, 3)} en esta unidad.`)
        for (const c of fuente.conceptos) ctxLeccion.en('conceptos').concepto(c)
        const conceptoPorDefecto = fuente.conceptos[0] ?? ''
        const leccion: Leccion = { id: idLeccion, titulo: fuente.titulo, resumen: fuente.resumen, minutos: fuente.minutos, conceptos: fuente.conceptos, pasos: [] }
        let teoriaSeguida = 0
        for (const [i, paso] of fuente.pasos.entries()) {
          const ctxPaso = ctxLeccion.en(`pasos[${i}] (${paso.tipo})`)
          const compilado = compilarPaso(paso, ctxPaso, conceptoPorDefecto)
          teoriaSeguida = paso.tipo === 'teoria' ? teoriaSeguida + 1 : 0
          if (teoriaSeguida === 3) ctxPaso.aviso('demasiada-teoria', 'Hay tres pasos de teoría seguidos: intercala un ejercicio.')
          if (!compilado) continue
          if (compilado.tipo !== 'teoria') {
            const lista = pasosPorConcepto.get(compilado.concepto) ?? []
            // El número del paso cuenta desde 1, como en la dirección de la lección y en los borradores: es el que va a entrar.
            lista.push(`${idLeccion}#${leccion.pasos.length + 1}`)
            pasosPorConcepto.set(compilado.concepto, lista)
          }
          leccion.pasos.push(compilado)
        }
        if (!fuente.pasos.some((p) => p.tipo !== 'teoria')) ctxLeccion.error('leccion-sin-ejercicios', 'La lección no tiene ningún ejercicio.')
        if (fuente.minutos < 5 || fuente.minutos > 10) ctxLeccion.aviso('duracion-fuera', `Las sesiones deben durar de 5 a 10 minutos y esta declara ${fuente.minutos}.`)
        const encargos = fuente.pasos.filter((p) => p.tipo === 'encargo').length
        if (encargos > 1) ctxLeccion.error('varios-encargos', 'Una lección no puede tener más de un encargo.')
        if (encargos === 1 && fuente.pasos[fuente.pasos.length - 1]?.tipo !== 'encargo') ctxLeccion.error('encargo-no-final', 'El encargo debe ser el último paso de la lección.')
        lecciones.push(leccion)
        resumenes.push({
          id: idLeccion,
          titulo: fuente.titulo,
          resumen: fuente.resumen,
          minutos: fuente.minutos,
          conceptos: fuente.conceptos,
          pasos: fuente.pasos.map((p) => p.tipo),
          encargo: encargos === 1,
        })
      }

      if (unidad.estado === 'publicada') {
        if (resumenes.length < LECCIONES_POR_UNIDAD) {
          ctxUnidad.error('unidad-corta', `La unidad tiene ${resumenes.length} lecciones y una unidad publicada necesita al menos ${LECCIONES_POR_UNIDAD}. Mientras se escribe, márcala con \`estado: borrador\`.`)
        }
        if (!resumenes[resumenes.length - 1]?.encargo) ctxUnidad.error('unidad-sin-encargo', 'La última lección de la unidad debe terminar en un encargo de compositor.')
      }
      unidades.push({ id: idUnidad, titulo: unidad.titulo, objetivo: unidad.objetivo, borrador: unidad.estado === 'borrador', lecciones: resumenes })
    }
    mundos.push({ id: m.id, titulo: mundo.titulo, lema: mundo.lema, descripcion: ctxMundo.prosa('descripcion', mundo.descripcion), unidades })
  }

  // ── Conceptos, con los pasos que los entrenan ──
  const conceptos: Concepto[] = []
  for (const [id, c] of Object.entries(conceptosFuente ?? {})) {
    const ctx = ctxDe(archivoConceptos).en(id)
    const pasos = pasosPorConcepto.get(id) ?? []
    if (pasos.length === 0) ctx.aviso('concepto-sin-practica', 'Ningún ejercicio entrena este concepto: no podrá entrar en el repaso.')
    conceptos.push({ id, nombre: c.nombre, definicion: ctx.prosa('definicion', c.definicion), pasos })
  }

  // ── Fichas de referencia ──
  const fichas: Ficha[] = []
  const dirFichas = path.join(raiz, 'fichas')
  if (existsSync(dirFichas)) {
    for (const nombre of readdirSync(dirFichas).filter((n) => /^[a-z0-9-]+\.ya?ml$/.test(n)).sort()) {
      const archivo = path.join(dirFichas, nombre)
      const ctx = ctxDe(archivo)
      const f = cargar(archivo, FichaFuente, ctx)
      if (!f) continue
      fichas.push({
        id: nombre.replace(/\.ya?ml$/, ''),
        titulo: f.titulo,
        resumen: ctx.prosa('resumen', f.resumen),
        bloques: f.bloques.map((b, i) => {
          const cb = ctx.en(`bloques[${i}]`)
          const bloque: Ficha['bloques'][number] = { titulo: b.titulo, texto: cb.prosa('texto', b.texto) }
          if (b.ejemplo) {
            const compilada = compilarPieza(b.ejemplo, cb.en('ejemplo'))
            if (compilada) bloque.ejemplo = compilada.pieza
          }
          return bloque
        }),
      })
    }
  }

  // ── Prueba de nivel ──
  const prueba: BloqueDePrueba[] = []
  const archivoPrueba = path.join(raiz, 'prueba-de-nivel.yaml')
  if (existsSync(archivoPrueba)) {
    const ctx = ctxDe(archivoPrueba)
    const bloques = cargar(archivoPrueba, PruebaDeNivelFuente, ctx)
    const idsDeUnidad = new Set(mundos.flatMap((m) => m.unidades.map((u) => u.id)))
    for (const [i, b] of (bloques ?? []).entries()) {
      const cb = ctx.en(`[${i}] (${b.unidad})`)
      if (!idsDeUnidad.has(b.unidad)) cb.error('unidad-desconocida', `La unidad «${b.unidad}» no existe.`)
      const pasos: BloqueDePrueba['pasos'] = []
      for (const [k, paso] of b.pasos.entries()) {
        const concepto = paso.concepto
        const cp = cb.en(`pasos[${k}] (${paso.tipo})`)
        if (!concepto) {
          cp.error('paso-sin-concepto', 'Los pasos de la prueba de nivel deben indicar su `concepto`.')
          continue
        }
        const compilado = compilarPaso(paso, cp, concepto)
        if (compilado && compilado.tipo !== 'teoria' && compilado.tipo !== 'encargo' && compilado.tipo !== 'pianoroll' && compilado.tipo !== 'capas') pasos.push(compilado)
      }
      prueba.push({ unidad: b.unidad, aprobado: b.aprobado, pasos })
    }
  }

  const huella = createHash('sha256')
  huella.update(JSON.stringify({ mundos, lecciones, conceptos, glosario, fichas, prueba }))
  return {
    indice: { version: huella.digest('hex').slice(0, 12), mundos },
    lecciones,
    conceptos,
    glosario,
    fichas,
    prueba,
    hallazgos: entorno.hallazgos,
  }
}
