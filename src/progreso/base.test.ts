import { Dexie } from 'dexie'
import { IDBKeyRange, indexedDB } from 'fake-indexeddb'
import { afterEach, describe, expect, it } from 'vitest'
import { piezaDePrueba } from '../musica/piezas-de-prueba.ts'
import { NOMBRE_DE_LA_BASE, borrarBorrador, borrarPieza, cerrar, guardarBorrador, guardarCambios, guardarPieza, leerTodo, reemplazarTodo } from './base.ts'
import { alCompletarLeccion, alSuperarUnidades, aplicarCambios } from './operaciones.ts'
import { type DatosDeProgreso, PROGRESO_VACIO, type PiezaGuardada } from './tipos.ts'

// En Node no hay IndexedDB: se le da a Dexie una de mentira, en memoria.
Dexie.dependencies.indexedDB = indexedDB
Dexie.dependencies.IDBKeyRange = IDBKeyRange

afterEach(async () => {
  cerrar()
  await Dexie.delete(NOMBRE_DE_LA_BASE)
})

const AHORA = new Date(2026, 9, 5, 10)
const PIEZA = piezaDePrueba([{ rol: 'melodia', notas: 'C4:4 E4:4 G4:2' }], { titulo: 'Arpegio' })

function guardada(id: string, modificada: string): PiezaGuardada {
  return { id, titulo: `Pieza ${id}`, pieza: PIEZA, creada: '2026-10-01T10:00:00.000Z', modificada }
}

describe('base de datos del progreso', () => {
  it('recién creada está vacía', async () => {
    expect(await leerTodo()).toEqual(PROGRESO_VACIO)
  })

  it('lo que se guarda se vuelve a leer igual, también después de cerrar', async () => {
    const leccion = alCompletarLeccion(PROGRESO_VACIO, { id: 'm00.u01.l01', conEncargo: false, conceptos: { pulso: { aciertos: 2, total: 2 } } }, AHORA)
    let esperado: DatosDeProgreso = aplicarCambios(PROGRESO_VACIO, leccion.cambios)
    await guardarCambios(leccion.cambios)
    const unidades = alSuperarUnidades(esperado, ['m00.u02'], AHORA)
    esperado = aplicarCambios(esperado, unidades.cambios)
    await guardarCambios(unidades.cambios)
    cerrar()
    expect(await leerTodo()).toEqual(esperado)
  })

  it('guardar otra vez la misma lección la sustituye, no la duplica', async () => {
    const una = alCompletarLeccion(PROGRESO_VACIO, { id: 'm00.u01.l01', conEncargo: false, conceptos: {} }, AHORA)
    await guardarCambios(una.cambios)
    const otra = alCompletarLeccion(aplicarCambios(PROGRESO_VACIO, una.cambios), { id: 'm00.u01.l01', conEncargo: false, conceptos: {} }, AHORA)
    await guardarCambios(otra.cambios)
    const leido = await leerTodo()
    expect(Object.keys(leido.lecciones)).toEqual(['m00.u01.l01'])
    expect(leido.lecciones['m00.u01.l01']?.veces).toBe(2)
  })

  it('el repertorio se lee con lo último que se tocó primero, y se puede borrar una pieza', async () => {
    await guardarPieza(guardada('a', '2026-10-02T10:00:00.000Z'))
    await guardarPieza(guardada('b', '2026-10-04T10:00:00.000Z'))
    await guardarPieza(guardada('c', '2026-10-03T10:00:00.000Z'))
    expect((await leerTodo()).repertorio.map((p) => p.id)).toEqual(['b', 'c', 'a'])
    await borrarPieza('b')
    const leido = await leerTodo()
    expect(leido.repertorio.map((p) => p.id)).toEqual(['c', 'a'])
    expect(leido.repertorio[0]?.pieza).toEqual(PIEZA)
  })

  it('los borradores se guardan por paso y se sustituyen', async () => {
    await guardarBorrador({ id: 'm00.u01.l08#5', pieza: PIEZA, modificada: '2026-10-05T10:00:00.000Z' })
    await guardarBorrador({ id: 'm00.u01.l08#5', pieza: { ...PIEZA, tempo: 140 }, modificada: '2026-10-05T10:05:00.000Z' })
    expect((await leerTodo()).borradores['m00.u01.l08#5']?.pieza.tempo).toBe(140)
    await borrarBorrador('m00.u01.l08#5')
    expect((await leerTodo()).borradores).toEqual({})
  })

  it('restaurar una copia sustituye todo lo que había', async () => {
    await guardarPieza(guardada('vieja', '2026-10-02T10:00:00.000Z'))
    await guardarCambios({ superadas: ['m00.u01'] })
    const leccion = alCompletarLeccion(PROGRESO_VACIO, { id: 'm00.u02.l01', conEncargo: true, conceptos: { intervalos: { aciertos: 1, total: 2 } } }, AHORA)
    const copia: DatosDeProgreso = {
      ...aplicarCambios(PROGRESO_VACIO, leccion.cambios),
      repertorio: [guardada('nueva', '2026-10-05T10:00:00.000Z')],
      borradores: { 'm00.u02.l08#3': { id: 'm00.u02.l08#3', pieza: PIEZA, modificada: '2026-10-05T10:00:00.000Z' } },
    }
    await reemplazarTodo(copia)
    expect(await leerTodo()).toEqual(copia)
    await reemplazarTodo(PROGRESO_VACIO)
    expect(await leerTodo()).toEqual(PROGRESO_VACIO)
  })
})
