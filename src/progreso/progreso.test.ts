import { Dexie } from 'dexie'
import { IDBKeyRange, indexedDB } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { piezaDePrueba } from '../musica/piezas-de-prueba.ts'
import { NOMBRE_DE_LA_BASE, cerrar, leerTodo } from './base.ts'
import { XP, xpTotal } from './experiencia.ts'
import { reiniciarProgreso, useProgreso } from './progreso.ts'
import { type DatosDeProgreso, PROGRESO_VACIO } from './tipos.ts'

const PIEZA = piezaDePrueba([{ rol: 'melodia', notas: 'C4:4 E4:4 G4:2' }])
const LECCION = { id: 'm00.u01.l01', conEncargo: false, conceptos: { pulso: { aciertos: 2, total: 2 } } }

/** Los datos del almacén, sin sus acciones ni el estado de carga. */
function datos(): DatosDeProgreso {
  const { lecciones, tarjetas, diario, superadas, repertorio, borradores } = useProgreso.getState()
  return { lecciones, tarjetas, diario, superadas, repertorio, borradores }
}

function conBase(): void {
  Dexie.dependencies.indexedDB = indexedDB
  Dexie.dependencies.IDBKeyRange = IDBKeyRange
}

beforeEach(() => {
  conBase()
  reiniciarProgreso()
})

afterEach(async () => {
  conBase()
  cerrar()
  await Dexie.delete(NOMBRE_DE_LA_BASE)
  vi.restoreAllMocks()
})

describe('almacén del progreso', () => {
  it('empieza sin cargar y, al cargar, queda listo', async () => {
    expect(useProgreso.getState().carga).toBe('sin-cargar')
    await useProgreso.getState().cargar()
    expect(useProgreso.getState().carga).toBe('listo')
    expect(datos()).toEqual(PROGRESO_VACIO)
  })

  it('completar una lección la deja en memoria y guardada', async () => {
    const recompensa = await useProgreso.getState().completarLeccion(LECCION)
    expect(recompensa).toMatchObject({ xp: XP.leccion, primeraVez: true })
    expect(useProgreso.getState().lecciones['m00.u01.l01']?.veces).toBe(1)
    expect(await leerTodo()).toEqual(datos())
  })

  it('lo guardado se recupera al abrir de nuevo', async () => {
    await useProgreso.getState().completarLeccion(LECCION)
    await useProgreso.getState().superarUnidades(['m00.u02'])
    const antes = datos()
    cerrar()
    reiniciarProgreso()
    expect(datos()).toEqual(PROGRESO_VACIO)
    await useProgreso.getState().cargar()
    expect(datos()).toEqual(antes)
    expect(xpTotal(useProgreso.getState().diario)).toBe(XP.leccion + XP.unidadSuperada)
  })

  it('dos acciones seguidas no se pisan', async () => {
    const { completarLeccion } = useProgreso.getState()
    await Promise.all([completarLeccion(LECCION), completarLeccion({ ...LECCION, id: 'm00.u01.l02' }), completarLeccion({ ...LECCION, id: 'm00.u01.l03' })])
    expect(Object.keys(useProgreso.getState().lecciones).sort()).toEqual(['m00.u01.l01', 'm00.u01.l02', 'm00.u01.l03'])
    expect(xpTotal(useProgreso.getState().diario)).toBe(3 * XP.leccion)
    expect(await leerTodo()).toEqual(datos())
  })

  it('una sesión de repaso reprograma los conceptos y da experiencia', async () => {
    await useProgreso.getState().completarLeccion(LECCION)
    const recompensa = await useProgreso.getState().registrarRepaso([{ concepto: 'pulso', paso: 'm00.u01.l01#2', resultado: { aciertos: 1, total: 1 } }])
    expect(recompensa.xp).toBe(XP.repaso)
    expect(useProgreso.getState().tarjetas.pulso).toMatchObject({ ultimoPaso: 'm00.u01.l01#2' })
    expect(await leerTodo()).toEqual(datos())
  })

  it('guarda piezas en el repertorio, las actualiza conservando su origen y las borra', async () => {
    const { guardarPieza, borrarPieza } = useProgreso.getState()
    const primera = await guardarPieza({ titulo: 'Marcha', pieza: PIEZA, origen: 'm00.u01.l08' })
    const segunda = await guardarPieza({ titulo: 'Nana', pieza: PIEZA })
    expect(primera.id).not.toBe(segunda.id)
    expect(primera.pieza.titulo).toBe('Marcha')
    expect(useProgreso.getState().repertorio.map((p) => p.titulo)).toEqual(['Nana', 'Marcha'])
    const cambiada = await guardarPieza({ id: primera.id, titulo: 'Marcha lenta', pieza: { ...PIEZA, tempo: 70 } })
    expect(cambiada).toMatchObject({ id: primera.id, origen: 'm00.u01.l08', creada: primera.creada })
    expect(useProgreso.getState().repertorio.map((p) => p.titulo)).toEqual(['Marcha lenta', 'Nana'])
    await borrarPieza(segunda.id)
    expect(useProgreso.getState().repertorio.map((p) => p.titulo)).toEqual(['Marcha lenta'])
    expect((await leerTodo()).repertorio).toEqual(useProgreso.getState().repertorio)
  })

  it('guarda y borra el borrador de un paso', async () => {
    const { guardarBorrador, borrarBorrador } = useProgreso.getState()
    await guardarBorrador('m00.u01.l08#5', PIEZA)
    expect(useProgreso.getState().borradores['m00.u01.l08#5']?.pieza).toEqual(PIEZA)
    expect((await leerTodo()).borradores['m00.u01.l08#5']?.pieza).toEqual(PIEZA)
    await borrarBorrador('m00.u01.l08#5')
    await borrarBorrador('no-existe')
    expect(useProgreso.getState().borradores).toEqual({})
    expect((await leerTodo()).borradores).toEqual({})
  })

  it('restaurar sustituye todo, en memoria y en la base', async () => {
    await useProgreso.getState().completarLeccion(LECCION)
    const copia: DatosDeProgreso = { ...PROGRESO_VACIO, superadas: ['m00.u03'] }
    await useProgreso.getState().restaurar(copia)
    expect(datos()).toEqual(copia)
    expect(await leerTodo()).toEqual(copia)
  })
})

describe('cuando el dispositivo no deja guardar', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    // Sin IndexedDB, como en algunos navegadores en modo privado.
    Dexie.dependencies.indexedDB = undefined as never
  })

  it('lo avisa y sigue funcionando con el progreso en memoria', async () => {
    await useProgreso.getState().cargar()
    expect(useProgreso.getState().carga).toBe('sin-guardar')
    const recompensa = await useProgreso.getState().completarLeccion(LECCION)
    expect(recompensa.xp).toBe(XP.leccion)
    expect(useProgreso.getState().lecciones['m00.u01.l01']?.veces).toBe(1)
    const pieza = await useProgreso.getState().guardarPieza({ titulo: 'Marcha', pieza: PIEZA })
    expect(useProgreso.getState().repertorio).toEqual([pieza])
    expect(useProgreso.getState().carga).toBe('sin-guardar')
  })
})
