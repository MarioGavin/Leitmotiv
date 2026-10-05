/**
 * Ayuda para las pruebas: monta una pieza a partir de taquigrafía, sin pasar
 * por el compilador de contenido.
 */
import type { IdInstrumento } from './instrumentos.ts'
import type { Pieza, Rol } from './pieza.ts'
import { leerAcordes, leerNotas } from './taquigrafia.ts'
import type { Compas } from './tiempo.ts'

export interface PistaDePrueba {
  rol: Rol
  instrumento?: IdInstrumento
  notas: string
  id?: string
  capa?: string
}

/** Pieza de prueba (en 4/4 salvo que se diga otra cosa) a partir de taquigrafía. */
export function piezaDePrueba(pistas: readonly PistaDePrueba[], extra: Partial<Pieza> & { acordesTexto?: string } = {}): Pieza {
  const compas: Compas = extra.compas ?? [4, 4]
  const compiladas = pistas.map((p) => {
    const instrumento = p.instrumento ?? 'piano'
    const leido = p.notas.trim() === '' ? { notas: [], compases: 0 } : leerNotas(p.notas, { compas, instrumento })
    return { pista: { id: p.id ?? p.rol, rol: p.rol, instrumento, notas: leido.notas, ...(p.capa === undefined ? {} : { capa: p.capa }) }, compases: leido.compases }
  })
  const { acordesTexto, ...resto } = extra
  const base: Pieza = {
    tempo: 100,
    compas,
    compases: Math.max(1, ...compiladas.map((c) => c.compases)),
    pistas: compiladas.map((c) => c.pista),
    ...resto,
  }
  if (acordesTexto) base.acordes = leerAcordes(acordesTexto, compas).acordes
  return base
}
