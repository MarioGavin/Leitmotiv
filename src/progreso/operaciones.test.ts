import { describe, expect, it } from 'vitest'
import { XP } from './experiencia.ts'
import { type LeccionTerminada, alCompletarLeccion, alRepasar, alSuperarUnidades, aplicarCambios } from './operaciones.ts'
import { diasEntre } from './racha.ts'
import { type DatosDeProgreso, PROGRESO_VACIO, diaDe } from './tipos.ts'

const dia = (n: number, hora = 10): Date => new Date(2026, 9, 1 + n, hora)
const LECCION: LeccionTerminada = { id: 'm00.u01.l01', conEncargo: false, conceptos: { pulso: { aciertos: 3, total: 3 }, tempo: { aciertos: 1, total: 2 } } }

/** Completa una lección y devuelve el progreso resultante. */
function completar(datos: DatosDeProgreso, leccion: LeccionTerminada, cuando: Date) {
  const { cambios, recompensa } = alCompletarLeccion(datos, leccion, cuando)
  return { datos: aplicarCambios(datos, cambios), recompensa }
}

describe('al completar una lección', () => {
  it('la primera vez queda registrada, da experiencia y abre una tarjeta por concepto', () => {
    const { datos, recompensa } = completar(PROGRESO_VACIO, LECCION, dia(0))
    expect(datos.lecciones['m00.u01.l01']).toEqual({ id: 'm00.u01.l01', completada: dia(0).toISOString(), ultima: dia(0).toISOString(), veces: 1, mejor: 0.8 })
    expect(recompensa).toEqual({ xp: XP.leccion, nivelAntes: 1, nivelDespues: 1, primeraVez: true, aciertos: 4, total: 5 })
    expect(Object.keys(datos.tarjetas).sort()).toEqual(['pulso', 'tempo'])
    expect(datos.diario[diaDe(dia(0))]).toEqual({ dia: diaDe(dia(0)), xp: XP.leccion, lecciones: 1, repasos: 0 })
  })

  it('lo que salió con fallos vuelve antes que lo que salió bien', () => {
    const { datos } = completar(PROGRESO_VACIO, LECCION, dia(0))
    const falta = (concepto: string): number => diasEntre(diaDe(dia(0)), diaDe(new Date(datos.tarjetas[concepto]?.fsrs.due ?? 0)))
    expect(falta('tempo')).toBeLessThan(falta('pulso'))
  })

  it('una lección con encargo da más experiencia', () => {
    expect(completar(PROGRESO_VACIO, { ...LECCION, conEncargo: true }, dia(0)).recompensa.xp).toBe(XP.leccion + XP.encargo)
  })

  it('repetirla da menos experiencia, conserva la primera fecha y se queda con la mejor nota', () => {
    const primera = completar(PROGRESO_VACIO, LECCION, dia(0))
    const peor = { ...LECCION, conceptos: { pulso: { aciertos: 1, total: 3 }, tempo: { aciertos: 0, total: 2 } } }
    const segunda = completar(primera.datos, peor, dia(1))
    expect(segunda.recompensa).toMatchObject({ xp: XP.repeticion, primeraVez: false })
    expect(segunda.datos.lecciones['m00.u01.l01']).toEqual({ id: 'm00.u01.l01', completada: dia(0).toISOString(), ultima: dia(1).toISOString(), veces: 2, mejor: 0.8 })
    const mejor = { ...LECCION, conceptos: { pulso: { aciertos: 3, total: 3 }, tempo: { aciertos: 2, total: 2 } } }
    expect(completar(segunda.datos, mejor, dia(2)).datos.lecciones['m00.u01.l01']?.mejor).toBe(1)
  })

  it('una lección sin preguntas cuenta como hecha del todo', () => {
    const { datos, recompensa } = completar(PROGRESO_VACIO, { ...LECCION, conceptos: {} }, dia(0))
    expect(datos.lecciones['m00.u01.l01']?.mejor).toBe(1)
    expect(recompensa).toMatchObject({ aciertos: 0, total: 0 })
    expect(datos.tarjetas).toEqual({})
  })

  it('la experiencia de un mismo día se acumula, y la de días distintos va aparte', () => {
    let datos = completar(PROGRESO_VACIO, LECCION, dia(0)).datos
    datos = completar(datos, { ...LECCION, id: 'm00.u01.l02' }, dia(0, 18)).datos
    datos = completar(datos, { ...LECCION, id: 'm00.u01.l03' }, dia(1)).datos
    expect(datos.diario[diaDe(dia(0))]).toMatchObject({ xp: 2 * XP.leccion, lecciones: 2 })
    expect(datos.diario[diaDe(dia(1))]).toMatchObject({ xp: XP.leccion, lecciones: 1 })
  })

  it('avisa cuando se sube de nivel', () => {
    let datos = PROGRESO_VACIO
    const niveles: Array<[number, number]> = []
    for (let i = 0; i < 4; i++) {
      const resultado = completar(datos, { ...LECCION, id: `m00.u01.l0${i + 1}` }, dia(i))
      datos = resultado.datos
      niveles.push([resultado.recompensa.nivelAntes, resultado.recompensa.nivelDespues])
    }
    // Con 20 puntos por lección, el nivel 2 (50 puntos) llega en la tercera.
    expect(niveles).toEqual([
      [1, 1],
      [1, 1],
      [1, 2],
      [2, 2],
    ])
  })

  it('no modifica el progreso que recibe', () => {
    const copia = structuredClone(PROGRESO_VACIO)
    completar(PROGRESO_VACIO, LECCION, dia(0))
    expect(PROGRESO_VACIO).toEqual(copia)
  })
})

describe('al repasar', () => {
  const base = completar(PROGRESO_VACIO, LECCION, dia(0)).datos

  it('reprograma cada concepto, recuerda con qué ejercicio y da experiencia por cada uno', () => {
    const { cambios, recompensa } = alRepasar(
      base,
      [
        { concepto: 'pulso', paso: 'm00.u01.l01#2', resultado: { aciertos: 1, total: 1 } },
        { concepto: 'tempo', paso: 'm00.u01.l01#4', resultado: { aciertos: 0, total: 1 } },
      ],
      dia(3),
    )
    const datos = aplicarCambios(base, cambios)
    expect(recompensa.xp).toBe(2 * XP.repaso)
    expect(datos.tarjetas.pulso).toMatchObject({ ultimoPaso: 'm00.u01.l01#2' })
    expect(datos.tarjetas.pulso?.fsrs.reps).toBe(2)
    expect(datos.diario[diaDe(dia(3))]).toEqual({ dia: diaDe(dia(3)), xp: 2 * XP.repaso, lecciones: 0, repasos: 2 })
  })

  it('un repaso vacío no cambia nada', () => {
    expect(alRepasar(base, [], dia(3))).toEqual({ cambios: {}, recompensa: { xp: 0, nivelAntes: 1, nivelDespues: 1 } })
  })
})

describe('al superar unidades en la prueba de nivel', () => {
  it('quedan apuntadas y dan experiencia una sola vez', () => {
    const primera = alSuperarUnidades(PROGRESO_VACIO, ['m00.u01', 'm00.u02'], dia(0))
    const datos = aplicarCambios(PROGRESO_VACIO, primera.cambios)
    expect(datos.superadas).toEqual(['m00.u01', 'm00.u02'])
    expect(primera.recompensa.xp).toBe(2 * XP.unidadSuperada)
    const segunda = alSuperarUnidades(datos, ['m00.u02', 'm00.u03', 'm00.u03'], dia(1))
    expect(aplicarCambios(datos, segunda.cambios).superadas).toEqual(['m00.u01', 'm00.u02', 'm00.u03'])
    expect(segunda.recompensa.xp).toBe(XP.unidadSuperada)
    expect(alSuperarUnidades(datos, ['m00.u01'], dia(1))).toEqual({ cambios: {}, recompensa: { xp: 0, nivelAntes: 1, nivelDespues: 1 } })
  })
})
