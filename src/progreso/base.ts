/**
 * Base de datos del progreso: IndexedDB, con Dexie. Este módulo se descarga
 * aparte del paquete inicial, la primera vez que hace falta leer o guardar.
 *
 * Todo lo que entra y sale es JSON puro (tipos.ts): la base no sabe nada de
 * reglas, solo guarda.
 */
import { Dexie, type EntityTable } from 'dexie'
import type { Cambios } from './operaciones.ts'
import type { Borrador, DatosDeProgreso, DiaDeEstudio, PiezaGuardada, RegistroDeLeccion, Tarjeta } from './tipos.ts'

/** Datos sueltos, por clave. Hoy solo hay uno: las unidades dadas por sabidas. */
interface Dato {
  clave: string
  valor: unknown
}

type Base = Dexie & {
  lecciones: EntityTable<RegistroDeLeccion, 'id'>
  tarjetas: EntityTable<Tarjeta, 'concepto'>
  diario: EntityTable<DiaDeEstudio, 'dia'>
  repertorio: EntityTable<PiezaGuardada, 'id'>
  borradores: EntityTable<Borrador, 'id'>
  datos: EntityTable<Dato, 'clave'>
}

export const NOMBRE_DE_LA_BASE = 'leitmotiv'

let base: Base | undefined

function abrir(): Base {
  if (!base) {
    const nueva = new Dexie(NOMBRE_DE_LA_BASE) as Base
    // Solo se declaran las claves: el resto de cada registro se guarda tal cual.
    nueva.version(1).stores({ lecciones: 'id', tarjetas: 'concepto', diario: 'dia', repertorio: 'id', borradores: 'id', datos: 'clave' })
    base = nueva
  }
  return base
}

function porClave<T, K extends keyof T>(registros: readonly T[], clave: K): Record<string, T> {
  return Object.fromEntries(registros.map((r) => [String(r[clave]), r]))
}

/** Lee todo el progreso guardado. */
export async function leerTodo(): Promise<DatosDeProgreso> {
  const db = abrir()
  const [lecciones, tarjetas, diario, repertorio, borradores, superadas] = await Promise.all([
    db.lecciones.toArray(),
    db.tarjetas.toArray(),
    db.diario.toArray(),
    db.repertorio.toArray(),
    db.borradores.toArray(),
    db.datos.get('superadas'),
  ])
  return {
    lecciones: porClave(lecciones, 'id'),
    tarjetas: porClave(tarjetas, 'concepto'),
    diario: porClave(diario, 'dia'),
    superadas: Array.isArray(superadas?.valor) ? superadas.valor.filter((x): x is string => typeof x === 'string') : [],
    // Lo último que se tocó, primero.
    repertorio: repertorio.sort((a, b) => b.modificada.localeCompare(a.modificada)),
    borradores: porClave(borradores, 'id'),
  }
}

/** Guarda unos cambios de una vez: o entran todos o no entra ninguno. */
export async function guardarCambios(cambios: Cambios): Promise<void> {
  const db = abrir()
  await db.transaction('rw', [db.lecciones, db.tarjetas, db.diario, db.datos], async () => {
    if (cambios.lecciones?.length) await db.lecciones.bulkPut(cambios.lecciones)
    if (cambios.tarjetas?.length) await db.tarjetas.bulkPut(cambios.tarjetas)
    if (cambios.dias?.length) await db.diario.bulkPut(cambios.dias)
    if (cambios.superadas) await db.datos.put({ clave: 'superadas', valor: cambios.superadas })
  })
}

export async function guardarPieza(pieza: PiezaGuardada): Promise<void> {
  await abrir().repertorio.put(pieza)
}

export async function borrarPieza(id: string): Promise<void> {
  await abrir().repertorio.delete(id)
}

export async function guardarBorrador(borrador: Borrador): Promise<void> {
  await abrir().borradores.put(borrador)
}

export async function borrarBorrador(id: string): Promise<void> {
  await abrir().borradores.delete(id)
}

/** Sustituye todo lo guardado por otro progreso (al restaurar una copia de seguridad o al borrar los datos). */
export async function reemplazarTodo(datos: DatosDeProgreso): Promise<void> {
  const db = abrir()
  await db.transaction('rw', [db.lecciones, db.tarjetas, db.diario, db.repertorio, db.borradores, db.datos], async () => {
    await Promise.all([db.lecciones.clear(), db.tarjetas.clear(), db.diario.clear(), db.repertorio.clear(), db.borradores.clear(), db.datos.clear()])
    await db.lecciones.bulkPut(Object.values(datos.lecciones))
    await db.tarjetas.bulkPut(Object.values(datos.tarjetas))
    await db.diario.bulkPut(Object.values(datos.diario))
    await db.repertorio.bulkPut(datos.repertorio)
    await db.borradores.bulkPut(Object.values(datos.borradores))
    await db.datos.put({ clave: 'superadas', valor: datos.superadas })
  })
}

/** Cierra la base (para las pruebas, y antes de borrarla). */
export function cerrar(): void {
  base?.close()
  base = undefined
}
