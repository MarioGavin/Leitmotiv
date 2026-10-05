/**
 * Qué cambia en el progreso cuando el usuario termina algo. Son funciones
 * puras: reciben el progreso y devuelven los registros nuevos, sin tocar la
 * base de datos. Así se prueban sin navegador y el almacén solo tiene que
 * guardar lo que le dicen.
 */
import { XP, nivelDe, xpDeLeccion, xpTotal } from './experiencia.ts'
import { type Resultado, repasar } from './repaso.ts'
import { type DatosDeProgreso, type DiaDeEstudio, type RegistroDeLeccion, type Tarjeta, diaDe } from './tipos.ts'

/** Registros que hay que guardar (y fundir con lo que hay en memoria). */
export interface Cambios {
  lecciones?: RegistroDeLeccion[]
  tarjetas?: Tarjeta[]
  dias?: DiaDeEstudio[]
  superadas?: string[]
}

export interface Recompensa {
  /** Experiencia ganada. */
  xp: number
  nivelAntes: number
  nivelDespues: number
}

export interface LeccionTerminada {
  id: string
  /** Si la lección termina en un encargo de compositor. */
  conEncargo: boolean
  /** Cómo ha ido cada concepto practicado. */
  conceptos: Readonly<Record<string, Resultado>>
}

export interface RecompensaDeLeccion extends Recompensa {
  primeraVez: boolean
  aciertos: number
  total: number
}

function sumarAlDia(datos: DatosDeProgreso, ahora: Date, mas: Partial<Omit<DiaDeEstudio, 'dia'>>): DiaDeEstudio {
  const dia = diaDe(ahora)
  const previo = datos.diario[dia] ?? { dia, xp: 0, lecciones: 0, repasos: 0 }
  return { dia, xp: previo.xp + (mas.xp ?? 0), lecciones: previo.lecciones + (mas.lecciones ?? 0), repasos: previo.repasos + (mas.repasos ?? 0) }
}

function recompensa(datos: DatosDeProgreso, xp: number): Recompensa {
  const antes = xpTotal(datos.diario)
  return { xp, nivelAntes: nivelDe(antes).nivel, nivelDespues: nivelDe(antes + xp).nivel }
}

export function alCompletarLeccion(datos: DatosDeProgreso, leccion: LeccionTerminada, ahora: Date): { cambios: Cambios; recompensa: RecompensaDeLeccion } {
  const previo = datos.lecciones[leccion.id]
  const primeraVez = previo === undefined
  const resultados = Object.values(leccion.conceptos)
  const aciertos = resultados.reduce((s, r) => s + r.aciertos, 0)
  const total = resultados.reduce((s, r) => s + r.total, 0)
  // Una lección sin preguntas (solo teoría o solo componer) cuenta como hecha del todo.
  const proporcion = total > 0 ? aciertos / total : 1
  const momento = ahora.toISOString()
  const registro: RegistroDeLeccion = {
    id: leccion.id,
    completada: previo?.completada ?? momento,
    ultima: momento,
    veces: (previo?.veces ?? 0) + 1,
    mejor: Math.max(previo?.mejor ?? 0, proporcion),
  }
  const tarjetas = Object.entries(leccion.conceptos).map(([concepto, resultado]) => repasar(datos.tarjetas[concepto], concepto, resultado, ahora))
  const xp = xpDeLeccion(primeraVez, leccion.conEncargo)
  return {
    cambios: { lecciones: [registro], tarjetas, dias: [sumarAlDia(datos, ahora, { xp, lecciones: 1 })] },
    recompensa: { ...recompensa(datos, xp), primeraVez, aciertos, total },
  }
}

export interface ConceptoRepasado {
  concepto: string
  /** Ejercicio con el que se ha repasado: «m00.u01.l02#4». */
  paso: string
  resultado: Resultado
}

export function alRepasar(datos: DatosDeProgreso, repasados: readonly ConceptoRepasado[], ahora: Date): { cambios: Cambios; recompensa: Recompensa } {
  const tarjetas = repasados.map((r) => repasar(datos.tarjetas[r.concepto], r.concepto, r.resultado, ahora, r.paso))
  const xp = repasados.length * XP.repaso
  if (repasados.length === 0) return { cambios: {}, recompensa: recompensa(datos, 0) }
  return { cambios: { tarjetas, dias: [sumarAlDia(datos, ahora, { xp, repasos: repasados.length })] }, recompensa: recompensa(datos, xp) }
}

/** Unidades dadas por sabidas en la prueba de nivel. Las que ya lo estaban no vuelven a dar experiencia. */
export function alSuperarUnidades(datos: DatosDeProgreso, unidades: readonly string[], ahora: Date): { cambios: Cambios; recompensa: Recompensa } {
  const nuevas = [...new Set(unidades)].filter((u) => !datos.superadas.includes(u))
  if (nuevas.length === 0) return { cambios: {}, recompensa: recompensa(datos, 0) }
  const xp = nuevas.length * XP.unidadSuperada
  return { cambios: { superadas: [...datos.superadas, ...nuevas], dias: [sumarAlDia(datos, ahora, { xp })] }, recompensa: recompensa(datos, xp) }
}

/** Funde unos cambios con el progreso que hay en memoria. No modifica el original. */
export function aplicarCambios(datos: DatosDeProgreso, cambios: Cambios): DatosDeProgreso {
  const lecciones = { ...datos.lecciones }
  for (const registro of cambios.lecciones ?? []) lecciones[registro.id] = registro
  const tarjetas = { ...datos.tarjetas }
  for (const tarjeta of cambios.tarjetas ?? []) tarjetas[tarjeta.concepto] = tarjeta
  const diario = { ...datos.diario }
  for (const dia of cambios.dias ?? []) diario[dia.dia] = dia
  return { ...datos, lecciones, tarjetas, diario, superadas: cambios.superadas ?? datos.superadas }
}
