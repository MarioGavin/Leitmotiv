import { Rating } from 'ts-fsrs'
import { describe, expect, it } from 'vitest'
import type { Concepto, IndiceDelCurso, ResumenDeLeccion, TipoDePaso } from '../contenido/tipos.ts'
import { leerPaso, pendientes, proximoRepaso, sesionDeRepaso } from './agenda.ts'
import { diasEntre } from './racha.ts'
import { calificacionDe, repasar, sumar } from './repaso.ts'
import { type Tarjeta, diaDe } from './tipos.ts'

const dia = (n: number, hora = 10): Date => new Date(2026, 0, 1 + n, hora)
const BIEN = { aciertos: 3, total: 3 }
const REGULAR = { aciertos: 2, total: 3 }
const MAL = { aciertos: 0, total: 3 }
/** Días que faltan desde `desde` hasta que vuelve a tocar la tarjeta. */
const faltan = (t: Tarjeta, desde: Date): number => diasEntre(diaDe(desde), diaDe(new Date(t.fsrs.due)))

describe('calificación de un ejercicio', () => {
  it('todo bien es «bien»; con algún fallo, «difícil»; con más fallos que aciertos, «otra vez»', () => {
    expect(calificacionDe({ aciertos: 4, total: 4 })).toBe(Rating.Good)
    expect(calificacionDe({ aciertos: 3, total: 4 })).toBe(Rating.Hard)
    expect(calificacionDe({ aciertos: 2, total: 4 })).toBe(Rating.Hard)
    expect(calificacionDe({ aciertos: 1, total: 4 })).toBe(Rating.Again)
    expect(calificacionDe({ aciertos: 0, total: 1 })).toBe(Rating.Again)
  })

  it('un ejercicio sin preguntas se da por bien hecho', () => {
    expect(calificacionDe({ aciertos: 0, total: 0 })).toBe(Rating.Good)
  })

  it('los resultados de un mismo concepto se suman', () => {
    expect(sumar(undefined, { aciertos: 1, total: 2 })).toEqual({ aciertos: 1, total: 2 })
    expect(sumar({ aciertos: 1, total: 2 }, { aciertos: 3, total: 3 })).toEqual({ aciertos: 4, total: 5 })
  })
})

describe('programación de un concepto', () => {
  it('la primera vez que sale bien, vuelve a los pocos días', () => {
    const tarjeta = repasar(undefined, 'pulso', BIEN, dia(0))
    expect(tarjeta.concepto).toBe('pulso')
    expect(faltan(tarjeta, dia(0))).toBe(3)
    expect(tarjeta.fsrs.reps).toBe(1)
  })

  it('cada acierto aleja el siguiente repaso', () => {
    let tarjeta = repasar(undefined, 'pulso', BIEN, dia(0))
    const esperas: number[] = []
    for (let i = 0; i < 4; i++) {
      const hoy = new Date(tarjeta.fsrs.due)
      tarjeta = repasar(tarjeta, 'pulso', BIEN, hoy)
      esperas.push(faltan(tarjeta, hoy))
    }
    for (let i = 1; i < esperas.length; i++) expect(esperas[i]).toBeGreaterThan(esperas[i - 1] as number)
  })

  it('ningún concepto pasa más de medio año sin volver', () => {
    let tarjeta = repasar(undefined, 'pulso', BIEN, dia(0))
    for (let i = 0; i < 12; i++) {
      const hoy = new Date(tarjeta.fsrs.due)
      tarjeta = repasar(tarjeta, 'pulso', BIEN, hoy)
      // FSRS deja el «bien» un día por encima del tope, que es donde se queda el «difícil».
      expect(faltan(tarjeta, hoy)).toBeLessThanOrEqual(181)
    }
    expect(tarjeta.fsrs.scheduled_days).toBe(181)
  })

  it('un fallo lo trae de vuelta al día siguiente y cuenta como olvido', () => {
    const sabida = repasar(repasar(undefined, 'pulso', BIEN, dia(0)), 'pulso', BIEN, dia(3))
    expect(faltan(sabida, dia(3))).toBeGreaterThan(7)
    const fallada = repasar(sabida, 'pulso', MAL, dia(20))
    expect(faltan(fallada, dia(20))).toBeLessThanOrEqual(2)
    expect(fallada.fsrs.lapses).toBe(1)
  })

  it('con fallos sueltos vuelve antes que si sale todo bien', () => {
    const bien = repasar(repasar(undefined, 'pulso', BIEN, dia(0)), 'pulso', BIEN, dia(3))
    const regular = repasar(repasar(undefined, 'pulso', BIEN, dia(0)), 'pulso', REGULAR, dia(3))
    expect(faltan(regular, dia(3))).toBeLessThan(faltan(bien, dia(3)))
  })

  it('la tarjeta guardada es JSON puro y se puede seguir repasando después de guardarla', () => {
    const tarjeta = repasar(undefined, 'pulso', BIEN, dia(0), 'm00.u01.l01#3')
    const guardada = JSON.parse(JSON.stringify(tarjeta)) as Tarjeta
    expect(guardada).toEqual(tarjeta)
    const despues = repasar(guardada, 'pulso', BIEN, dia(3))
    expect(despues.fsrs.reps).toBe(2)
    // Si no viene de un repaso, conserva el último ejercicio con el que se repasó.
    expect(despues.ultimoPaso).toBe('m00.u01.l01#3')
    expect(repasar(guardada, 'pulso', BIEN, dia(3), 'm00.u01.l02#2').ultimoPaso).toBe('m00.u01.l02#2')
  })

  it('con el mismo historial, las mismas fechas', () => {
    const una = repasar(repasar(undefined, 'pulso', BIEN, dia(0)), 'pulso', REGULAR, dia(4))
    const otra = repasar(repasar(undefined, 'pulso', BIEN, dia(0)), 'pulso', REGULAR, dia(4))
    expect(una).toEqual(otra)
  })
})

describe('qué toca hoy', () => {
  const tarjetas: Record<string, Tarjeta> = {
    pulso: repasar(undefined, 'pulso', BIEN, dia(0)),
    compas: repasar(undefined, 'compas', MAL, dia(0)),
    tempo: repasar(repasar(undefined, 'tempo', BIEN, dia(0)), 'tempo', BIEN, dia(3)),
  }

  it('lo que vence hoy, aunque sea a última hora, y lo atrasado; primero lo más atrasado', () => {
    expect(pendientes(tarjetas, dia(0)).map((t) => t.concepto)).toEqual([])
    expect(pendientes(tarjetas, dia(1, 7)).map((t) => t.concepto)).toEqual(['compas'])
    expect(pendientes(tarjetas, dia(3, 7)).map((t) => t.concepto)).toEqual(['compas', 'pulso'])
    expect(pendientes(tarjetas, dia(60)).map((t) => t.concepto)).toEqual(['compas', 'pulso', 'tempo'])
  })

  it('si hoy no toca nada, dice cuándo toca lo próximo', () => {
    expect(diaDe(proximoRepaso(tarjetas, dia(0)) as Date)).toBe(diaDe(dia(1)))
    expect(proximoRepaso(tarjetas, dia(90))).toBeUndefined()
    expect(proximoRepaso({}, dia(0))).toBeUndefined()
  })
})

describe('sesión de repaso', () => {
  const leccion = (id: string, pasos: TipoDePaso[]): ResumenDeLeccion => ({ id, titulo: id, resumen: '', minutos: 5, conceptos: [], pasos, encargo: false })
  const indice: IndiceDelCurso = {
    version: 'prueba',
    mundos: [
      {
        id: 'm00',
        titulo: '',
        lema: '',
        descripcion: [],
        unidades: [
          {
            id: 'm00.u01',
            titulo: '',
            objetivo: '',
            borrador: false,
            lecciones: [leccion('m00.u01.l01', ['teoria', 'oido', 'ritmo']), leccion('m00.u01.l02', ['teoria', 'oido', 'pianoroll']), leccion('m00.u01.l03', ['oido'])],
          },
        ],
      },
    ],
  }
  const concepto = (id: string, pasos: string[]): Concepto => ({ id, nombre: id, definicion: [], pasos })
  const conceptos = [
    concepto('pulso', ['m00.u01.l01#2', 'm00.u01.l01#3', 'm00.u01.l03#1']),
    concepto('compas', ['m00.u01.l02#2']),
    concepto('escritura', ['m00.u01.l02#3']),
    concepto('tempo', ['m00.u01.l03#1']),
  ]
  const tarjetas: Record<string, Tarjeta> = Object.fromEntries(['pulso', 'compas', 'escritura', 'tempo'].map((c, i) => [c, repasar(undefined, c, BIEN, dia(0, 8 + i))]))
  const base = { tarjetas, conceptos, indice, ahora: dia(5), azar: () => 0 }

  it('lee la referencia a un paso', () => {
    expect(leerPaso('m00.u01.l02#4')).toEqual({ leccion: 'm00.u01.l02', indice: 3 })
    expect(leerPaso('m00.u01.l02')).toBeUndefined()
    expect(leerPaso('lo que sea')).toBeUndefined()
  })

  it('solo usa ejercicios de lecciones ya completadas y de tipos que se pueden repasar sueltos', () => {
    const sesion = sesionDeRepaso({ ...base, completadas: new Set(['m00.u01.l01', 'm00.u01.l02']) })
    // «escritura» solo se entrena en un piano roll y «tempo», en una lección sin hacer: no entran.
    expect(sesion).toEqual([
      { concepto: 'pulso', paso: 'm00.u01.l01#2' },
      { concepto: 'compas', paso: 'm00.u01.l02#2' },
    ])
  })

  it('sin lecciones completadas no hay con qué repasar', () => {
    expect(sesionDeRepaso({ ...base, completadas: new Set() })).toEqual([])
  })

  it('no repite el ejercicio de la última vez si hay otro', () => {
    const conMemoria = { ...tarjetas, pulso: { ...(tarjetas.pulso as Tarjeta), ultimoPaso: 'm00.u01.l01#2' } }
    const sesion = sesionDeRepaso({ ...base, tarjetas: conMemoria, completadas: new Set(['m00.u01.l01']) })
    expect(sesion).toEqual([{ concepto: 'pulso', paso: 'm00.u01.l01#3' }])
    // Con un solo ejercicio posible, se repite.
    const unico = { ...tarjetas, compas: { ...(tarjetas.compas as Tarjeta), ultimoPaso: 'm00.u01.l02#2' } }
    expect(sesionDeRepaso({ ...base, tarjetas: unico, completadas: new Set(['m00.u01.l02']) })).toEqual([{ concepto: 'compas', paso: 'm00.u01.l02#2' }])
  })

  it('elige al azar entre los ejercicios posibles', () => {
    const todas = new Set(['m00.u01.l01', 'm00.u01.l02', 'm00.u01.l03'])
    const pasos = new Set([0, 0.4, 0.7, 0.99].map((x) => sesionDeRepaso({ ...base, azar: () => x, completadas: todas })[0]?.paso))
    expect(pasos).toEqual(new Set(['m00.u01.l01#2', 'm00.u01.l01#3', 'm00.u01.l03#1']))
  })

  it('no pasa del límite por sesión, y empieza por lo más atrasado', () => {
    const todas = new Set(['m00.u01.l01', 'm00.u01.l02', 'm00.u01.l03'])
    expect(sesionDeRepaso({ ...base, completadas: todas, limite: 2 }).map((e) => e.concepto)).toEqual(['pulso', 'compas'])
  })

  it('si no toca nada, solo propone algo cuando se le pide', () => {
    const todas = new Set(['m00.u01.l01', 'm00.u01.l02', 'm00.u01.l03'])
    expect(sesionDeRepaso({ ...base, ahora: dia(1), completadas: todas })).toEqual([])
    expect(sesionDeRepaso({ ...base, ahora: dia(1), completadas: todas, aunqueNoToque: true }).map((e) => e.concepto)).toEqual(['pulso', 'compas', 'tempo'])
  })
})
