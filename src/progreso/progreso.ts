/**
 * El progreso del usuario, para la interfaz: lo que hay en memoria y las
 * acciones que lo cambian. Vive en el paquete inicial y pesa poco: la base de
 * datos (Dexie) y el repaso espaciado (FSRS) se descargan aparte, la primera
 * vez que se lee o se guarda algo.
 *
 * Si el dispositivo no deja guardar (hay navegadores que lo impiden en modo
 * privado), la app sigue funcionando con el progreso en memoria y lo avisa.
 */
import { create } from 'zustand'
import type { Pieza } from '../musica/pieza.ts'
import type * as Base from './base.ts'
import type * as Operaciones from './operaciones.ts'
import type { Cambios, ConceptoRepasado, LeccionTerminada, Recompensa, RecompensaDeLeccion } from './operaciones.ts'
import { type DatosDeProgreso, PROGRESO_VACIO, type PiezaGuardada } from './tipos.ts'

/** `sin-guardar`: se ha intentado leer o escribir y el dispositivo no ha dejado. */
export type CargaDelProgreso = 'sin-cargar' | 'cargando' | 'listo' | 'sin-guardar'

export interface PiezaParaGuardar {
  /** Si se da, sustituye a la pieza que ya tenía ese identificador. */
  id?: string
  titulo: string
  pieza: Pieza
  /** Lección de cuyo encargo sale. */
  origen?: string
}

interface Progreso extends DatosDeProgreso {
  carga: CargaDelProgreso
  /** Lee lo guardado. Llamarlo otra vez no hace nada. */
  cargar: () => Promise<void>
  completarLeccion: (leccion: LeccionTerminada) => Promise<RecompensaDeLeccion>
  registrarRepaso: (repasados: readonly ConceptoRepasado[]) => Promise<Recompensa>
  superarUnidades: (unidades: readonly string[]) => Promise<Recompensa>
  guardarPieza: (pieza: PiezaParaGuardar) => Promise<PiezaGuardada>
  borrarPieza: (id: string) => Promise<void>
  guardarBorrador: (id: string, pieza: Pieza) => Promise<void>
  borrarBorrador: (id: string) => Promise<void>
  /** Sustituye todo el progreso por otro: al restaurar una copia de seguridad o al borrar los datos. */
  restaurar: (datos: DatosDeProgreso) => Promise<void>
}

let base: Promise<typeof Base> | undefined
let operaciones: Promise<typeof Operaciones> | undefined
let lectura: Promise<void> | undefined
/** Las escrituras van de una en una, en el orden en que se piden. */
let cola: Promise<unknown> = Promise.resolve()
let persistenciaPedida = false

const cargarBase = (): Promise<typeof Base> => (base ??= import('./base.ts'))
const cargarOperaciones = (): Promise<typeof Operaciones> => (operaciones ??= import('./operaciones.ts'))

function identificador(): string {
  // `randomUUID` solo existe en páginas seguras (https o localhost); probando en el móvil por la wifi no lo es.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export const useProgreso = create<Progreso>((set, get) => {
  /** Hace una escritura en la base. Si falla, el cambio se queda en memoria y se avisa. */
  const escribir = (tarea: (db: typeof Base) => Promise<void>): Promise<void> => {
    const hecho = cola.then(async () => {
      try {
        await tarea(await cargarBase())
        // Con algo ya guardado, se pide al navegador (una vez) que no lo borre si anda corto de espacio.
        if (!persistenciaPedida && get().carga === 'listo') {
          persistenciaPedida = true
          void navigator.storage?.persist?.().catch(() => undefined)
        }
      } catch (error) {
        console.warn('No se ha podido guardar el progreso', error)
        set({ carga: 'sin-guardar' })
      }
    })
    cola = hecho
    return hecho
  }

  /** Calcula unos cambios sobre el progreso ya leído, los pone en memoria y los guarda. */
  const cambiar = async <R>(calcular: (ops: typeof Operaciones, datos: DatosDeProgreso, ahora: Date) => { cambios: Cambios; recompensa: R }): Promise<R> => {
    await get().cargar()
    const ops = await cargarOperaciones()
    const { cambios, recompensa } = calcular(ops, get(), new Date())
    set(ops.aplicarCambios(get(), cambios))
    await escribir((db) => db.guardarCambios(cambios))
    return recompensa
  }

  return {
    ...PROGRESO_VACIO,
    carga: 'sin-cargar',
    cargar: () => {
      lectura ??= (async () => {
        set({ carga: 'cargando' })
        try {
          const db = await cargarBase()
          set({ ...(await db.leerTodo()), carga: 'listo' })
        } catch (error) {
          console.warn('No se ha podido leer el progreso', error)
          set({ carga: 'sin-guardar' })
        }
      })()
      return lectura
    },
    completarLeccion: (leccion) => cambiar((ops, datos, ahora) => ops.alCompletarLeccion(datos, leccion, ahora)),
    registrarRepaso: (repasados) => cambiar((ops, datos, ahora) => ops.alRepasar(datos, repasados, ahora)),
    superarUnidades: (unidades) => cambiar((ops, datos, ahora) => ops.alSuperarUnidades(datos, unidades, ahora)),
    guardarPieza: async ({ id, titulo, pieza, origen }) => {
      await get().cargar()
      const ahora = new Date().toISOString()
      const previa = id === undefined ? undefined : get().repertorio.find((p) => p.id === id)
      const guardada: PiezaGuardada = { id: previa?.id ?? id ?? identificador(), titulo, pieza: { ...pieza, titulo }, creada: previa?.creada ?? ahora, modificada: ahora }
      const deDonde = origen ?? previa?.origen
      if (deDonde !== undefined) guardada.origen = deDonde
      // La que se acaba de tocar pasa a ser la primera.
      set({ repertorio: [guardada, ...get().repertorio.filter((p) => p.id !== guardada.id)] })
      await escribir((db) => db.guardarPieza(guardada))
      return guardada
    },
    borrarPieza: async (id) => {
      await get().cargar()
      set({ repertorio: get().repertorio.filter((p) => p.id !== id) })
      await escribir((db) => db.borrarPieza(id))
    },
    guardarBorrador: async (id, pieza) => {
      await get().cargar()
      const borrador = { id, pieza, modificada: new Date().toISOString() }
      set({ borradores: { ...get().borradores, [id]: borrador } })
      await escribir((db) => db.guardarBorrador(borrador))
    },
    borrarBorrador: async (id) => {
      await get().cargar()
      if (!Object.hasOwn(get().borradores, id)) return
      const { [id]: _borrado, ...resto } = get().borradores
      set({ borradores: resto })
      await escribir((db) => db.borrarBorrador(id))
    },
    restaurar: async (datos) => {
      await get().cargar()
      set({ ...datos })
      await escribir((db) => db.reemplazarTodo(datos))
    },
  }
})

/** Lee el progreso guardado (una sola vez). La promesa es siempre la misma y nunca falla: sirve para `use()`. */
export function cargarProgreso(): Promise<void> {
  return useProgreso.getState().cargar()
}

/** Deja el almacén como recién abierto. Solo para las pruebas. */
export function reiniciarProgreso(): void {
  lectura = undefined
  cola = Promise.resolve()
  useProgreso.setState({ ...PROGRESO_VACIO, carga: 'sin-cargar' })
}
