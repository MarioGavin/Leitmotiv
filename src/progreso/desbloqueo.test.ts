import { describe, expect, it } from 'vitest'
import type { IndiceDelCurso, ResumenDeLeccion, ResumenDeUnidad } from '../contenido/tipos.ts'
import { accesoDeLeccion, estadoDelCurso, siguienteLeccion } from './desbloqueo.ts'

function leccion(id: string): ResumenDeLeccion {
  return { id, titulo: id, resumen: '', minutos: 5, conceptos: [], pasos: ['teoria'], encargo: false }
}

function unidad(id: string, lecciones: number, borrador = false): ResumenDeUnidad {
  return { id, titulo: id, objetivo: '', borrador, lecciones: Array.from({ length: lecciones }, (_, i) => leccion(`${id}.l${String(i + 1).padStart(2, '0')}`)) }
}

const CURSO: IndiceDelCurso = {
  version: 'prueba',
  mundos: [
    { id: 'm00', titulo: 'Repaso', lema: '', descripcion: [], unidades: [unidad('m00.u01', 3), unidad('m00.u02', 2)] },
    { id: 'm01', titulo: 'Melodía', lema: '', descripcion: [], unidades: [unidad('m01.u01', 2, true), unidad('m01.u02', 0, true)] },
    { id: 'm02', titulo: 'Armonía', lema: '', descripcion: [], unidades: [] },
    { id: 'm03', titulo: 'Color', lema: '', descripcion: [], unidades: [unidad('m03.u01', 1)] },
  ],
}

const estado = (completadas: string[] = [], superadas: string[] = []) => estadoDelCurso(CURSO, new Set(completadas), new Set(superadas))
const accesos = (completadas: string[] = [], superadas: string[] = []) => estado(completadas, superadas).map((m) => `${m.id}:${m.acceso}`)
const lecciones = (completadas: string[], superadas: string[] = []) =>
  estado(completadas, superadas)
    .flatMap((m) => m.unidades)
    .flatMap((u) => u.lecciones)
    .filter((l) => l.acceso !== 'bloqueada')
    .map((l) => `${l.id}:${l.acceso}`)

const M00_U01 = ['m00.u01.l01', 'm00.u01.l02', 'm00.u01.l03']
const M00 = [...M00_U01, 'm00.u02.l01', 'm00.u02.l02']

describe('al empezar', () => {
  it('solo está abierta la primera lección del primer mundo', () => {
    expect(lecciones([])).toEqual(['m00.u01.l01:disponible'])
    expect(accesos()).toEqual(['m00:disponible', 'm01:bloqueado', 'm02:en-obras', 'm03:bloqueado'])
    expect(siguienteLeccion(estado())).toBe('m00.u01.l01')
  })

  it('cuenta las lecciones de cada mundo y de cada unidad', () => {
    const [m00] = estado(['m00.u01.l01'])
    expect(m00).toMatchObject({ hechas: 1, total: 5 })
    expect(m00?.unidades.map((u) => [u.hechas, u.total])).toEqual([
      [1, 3],
      [0, 2],
    ])
  })
})

describe('dentro de una unidad', () => {
  it('cada lección abre la siguiente', () => {
    expect(lecciones(['m00.u01.l01'])).toEqual(['m00.u01.l01:completada', 'm00.u01.l02:disponible'])
    expect(siguienteLeccion(estado(['m00.u01.l01']))).toBe('m00.u01.l02')
  })

  it('una lección completada sigue abierta aunque falte la anterior', () => {
    expect(lecciones(['m00.u01.l03'])).toEqual(['m00.u01.l01:disponible', 'm00.u01.l03:completada'])
  })
})

describe('entre unidades', () => {
  it('terminar una unidad abre la siguiente', () => {
    const [m00] = estado(M00_U01)
    expect(m00?.unidades.map((u) => u.acceso)).toEqual(['completado', 'disponible'])
    expect(siguienteLeccion(estado(M00_U01))).toBe('m00.u02.l01')
  })

  it('sin terminarla, la siguiente sigue cerrada', () => {
    const [m00] = estado(['m00.u01.l01', 'm00.u01.l02'])
    expect(m00?.unidades.map((u) => u.acceso)).toEqual(['disponible', 'bloqueado'])
    expect(accesoDeLeccion(estado(['m00.u01.l01', 'm00.u01.l02']), 'm00.u02.l01')).toBe('bloqueada')
  })
})

describe('entre mundos', () => {
  it('terminar un mundo abre el siguiente', () => {
    expect(accesos(M00)).toEqual(['m00:completado', 'm01:disponible', 'm02:en-obras', 'm03:bloqueado'])
    expect(siguienteLeccion(estado(M00))).toBe('m01.u01.l01')
  })

  it('una unidad en construcción no se da por completada, pero deja pasar cuando se han hecho sus lecciones', () => {
    const todo = [...M00, 'm01.u01.l01', 'm01.u01.l02']
    const [, m01, m02, m03] = estado(todo)
    expect(m01?.unidades.map((u) => u.acceso)).toEqual(['disponible', 'en-obras'])
    expect(m01?.acceso).toBe('disponible')
    // El mundo en obras no cierra el paso al que viene detrás.
    expect(m02?.acceso).toBe('en-obras')
    expect(m03?.acceso).toBe('disponible')
    expect(siguienteLeccion(estado(todo))).toBe('m03.u01.l01')
  })

  it('con todo hecho no queda nada por donde seguir', () => {
    expect(siguienteLeccion(estado([...M00, 'm01.u01.l01', 'm01.u01.l02', 'm03.u01.l01']))).toBeUndefined()
  })
})

describe('prueba de nivel', () => {
  it('una unidad dada por sabida cuenta como terminada y abre todas sus lecciones', () => {
    const resultado = estado([], ['m00.u01'])
    expect(resultado[0]?.unidades.map((u) => u.acceso)).toEqual(['completado', 'disponible'])
    expect(resultado[0]?.unidades[0]?.superada).toBe(true)
    expect(lecciones([], ['m00.u01'])).toEqual(['m00.u01.l01:disponible', 'm00.u01.l02:disponible', 'm00.u01.l03:disponible', 'm00.u02.l01:disponible'])
  })

  it('con todas las unidades de un mundo dadas por sabidas, se abre el siguiente', () => {
    expect(accesos([], ['m00.u01', 'm00.u02'])).toEqual(['m00:completado', 'm01:disponible', 'm02:en-obras', 'm03:bloqueado'])
  })

  it('una unidad sabida en un mundo cerrado no lo abre', () => {
    expect(accesos([], ['m01.u01'])).toEqual(['m00:disponible', 'm01:bloqueado', 'm02:en-obras', 'm03:bloqueado'])
    expect(accesoDeLeccion(estado([], ['m01.u01']), 'm01.u01.l01')).toBe('bloqueada')
  })
})

describe('consultas', () => {
  it('una lección que no está en el curso no tiene estado', () => {
    expect(accesoDeLeccion(estado(), 'm09.u09.l09')).toBeUndefined()
  })
})
