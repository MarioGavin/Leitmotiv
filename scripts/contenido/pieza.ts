/**
 * Compila una pieza escrita en YAML (taquigrafía) al formato de la app y la
 * somete a las comprobaciones musicales.
 */
import type { PiezaFuenteT } from '../../src/contenido/esquemas.ts'
import type { Hueco } from '../../src/contenido/tipos.ts'
import { comprobarPieza } from '../../src/musica/comprobaciones.ts'
import type { IdInstrumento } from '../../src/musica/instrumentos.ts'
import type { Pieza, Pista, Rol } from '../../src/musica/pieza.ts'
import { leerAcordes, leerNotas, leerRejilla } from '../../src/musica/taquigrafia.ts'
import { leerCompas } from '../../src/musica/tiempo.ts'
import { leerTonalidad } from '../../src/musica/tonalidad.ts'
import type { Contexto } from './contexto.ts'

export interface PiezaCompilada {
  pieza: Pieza
  huecosDeNotas: Array<Hueco & { pista: string }>
  huecosDeAcordes: Hueco[]
}

interface Opciones {
  /** Admite `?` en notas o acordes (ejercicios de construcción). */
  huecos?: boolean
  /** Admite pistas con `notas: ""` (plantillas que rellenará el usuario). */
  pistasVacias?: boolean
}

/**
 * Devuelve la pieza compilada, o `undefined` si la taquigrafía no se puede
 * leer. Los problemas quedan anotados en el contexto.
 */
export function compilarPieza(fuente: PiezaFuenteT, ctx: Contexto, opciones: Opciones = {}): PiezaCompilada | undefined {
  const compas = ctx.intentar('compas-no-valido', () => leerCompas(fuente.compas))
  if (!compas) return undefined
  const tonalidad = fuente.tonalidad ? ctx.en('tonalidad').intentar('tonalidad-no-valida', () => leerTonalidad(fuente.tonalidad ?? '')) : undefined
  if (fuente.tonalidad && !tonalidad) return undefined

  const pistas: Pista[] = []
  const huecosDeNotas: PiezaCompilada['huecosDeNotas'] = []
  const ids = new Set<string>()
  let legible = true

  for (const [i, pf] of fuente.pistas.entries()) {
    const id = pf.id ?? pf.rol
    const ctxPista = ctx.en(`pistas[${i}] (${id})`)
    if (ids.has(id)) ctxPista.error('pista-repetida', `Hay dos pistas con el identificador «${id}». Dale un \`id\` distinto a cada una.`)
    ids.add(id)
    const instrumento = pf.instrumento as IdInstrumento
    const pista: Pista = { id, rol: pf.rol as Rol, instrumento, notas: [] }
    if (pf.nombre !== undefined) pista.nombre = pf.nombre
    if (pf.volumen !== undefined) pista.volumen = pf.volumen
    if (pf.paneo !== undefined) pista.paneo = pf.paneo
    if (pf.capa !== undefined) pista.capa = pf.capa

    if (pf.rejilla) {
      const rejilla = pf.rejilla
      const notas = ctxPista.intentar('rejilla-no-valida', () => leerRejilla(rejilla, { compas, instrumento, compases: fuente.compases }))
      if (notas) pista.notas = notas
      else legible = false
    } else if ((pf.notas ?? '').trim() === '') {
      if (!opciones.pistasVacias) ctxPista.error('pista-vacia', 'La pista no tiene notas. Solo las plantillas de piano roll y de encargo admiten pistas vacías.')
    } else {
      const leido = ctxPista.intentar('notas-no-validas', () =>
        leerNotas(pf.notas ?? '', { compas, instrumento, ...(pf.matiz !== undefined ? { matiz: pf.matiz } : {}) }),
      )
      if (!leido) {
        legible = false
      } else {
        if (leido.compases !== fuente.compases) {
          ctxPista.error('compases-no-coinciden', `La pista tiene ${leido.compases} compases y la pieza declara ${fuente.compases}.`)
        }
        if (leido.huecos.length > 0 && !opciones.huecos) ctxPista.error('hueco-no-admitido', 'Esta pieza no puede tener huecos «?».')
        for (const h of leido.huecos) huecosDeNotas.push({ ...h, pista: id })
        pista.notas = leido.notas
      }
    }
    pistas.push(pista)
  }

  const pieza: Pieza = { tempo: fuente.tempo, compas, compases: fuente.compases, pistas }
  if (fuente.titulo !== undefined) pieza.titulo = fuente.titulo
  if (tonalidad) pieza.tonalidad = tonalidad.texto
  if (fuente.bucle !== undefined) pieza.bucle = fuente.bucle
  if (fuente.swing !== undefined) pieza.swing = fuente.swing
  if (fuente.secciones) {
    pieza.secciones = fuente.secciones.map((s) => (s.nombre === undefined ? { id: s.id, desde: s.desde, hasta: s.hasta } : { id: s.id, nombre: s.nombre, desde: s.desde, hasta: s.hasta }))
  }

  let huecosDeAcordes: Hueco[] = []
  if (fuente.acordes !== undefined) {
    const ctxAcordes = ctx.en('acordes')
    const leido = ctxAcordes.intentar('acordes-no-validos', () => leerAcordes(fuente.acordes ?? '', compas))
    if (!leido) {
      legible = false
    } else {
      if (leido.compases !== fuente.compases) {
        ctxAcordes.error('compases-no-coinciden', `La línea de acordes tiene ${leido.compases} compases y la pieza declara ${fuente.compases}.`)
      }
      if (leido.huecos.length > 0 && !opciones.huecos) ctxAcordes.error('hueco-no-admitido', 'Esta pieza no puede tener huecos «?» en los acordes.')
      pieza.acordes = leido.acordes
      huecosDeAcordes = leido.huecos
    }
  }

  if (!legible) return undefined
  ctx.anotar(comprobarPieza(pieza, { cromatismos: fuente.cromatismos ?? [] }))
  return { pieza, huecosDeNotas, huecosDeAcordes }
}
