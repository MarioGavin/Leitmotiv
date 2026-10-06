import { describe, expect, it } from 'vitest'
import { type Limites, PASOS_DE_HISTORIAL, deshacer, estirarNota, hacer, historialDe, moverNota, notaEn, ponerNota, quitarNota, rehacer } from './edicion.ts'
import type { Nota } from './pieza.ts'

const LIMITES: Limites = { total: 3840, rango: [48, 84] }
const UNA_VOZ: Limites = { ...LIMITES, polifonia: 1 }
const nota = (t: number, d: number, n: number): Nota => ({ t, d, n, v: 96 })
const breve = (notas: readonly Nota[]): Array<[number, number, number]> => notas.map((x) => [x.t, x.d, x.n])

describe('poner una nota', () => {
  it('la añade en su sitio y dice dónde ha quedado', () => {
    const base = [nota(0, 480, 60), nota(960, 480, 64)]
    const { notas, indice } = ponerNota(base, nota(480, 480, 62), LIMITES)
    expect(breve(notas)).toEqual([
      [0, 480, 60],
      [480, 480, 62],
      [960, 480, 64],
    ])
    expect(indice).toBe(1)
    expect(base).toHaveLength(2)
  })

  it('si choca con la siguiente de su altura, se acorta hasta ella', () => {
    const { notas } = ponerNota([nota(960, 480, 60)], nota(480, 1920, 60), LIMITES)
    expect(breve(notas)).toEqual([
      [480, 480, 60],
      [960, 480, 60],
    ])
  })

  it('las notas de otra altura no le estorban: se pueden formar acordes', () => {
    const { notas } = ponerNota([nota(0, 960, 60)], nota(0, 960, 64), LIMITES)
    expect(breve(notas)).toEqual([
      [0, 960, 60],
      [0, 960, 64],
    ])
  })

  it('no se sale de la pieza', () => {
    expect(breve(ponerNota([], nota(3600, 960, 60), LIMITES).notas)).toEqual([[3600, 240, 60]])
  })

  it('donde ya suena una nota de su altura no se pone nada', () => {
    const base = [nota(0, 960, 60)]
    expect(ponerNota(base, nota(480, 480, 60), LIMITES)).toEqual({ notas: base, indice: undefined })
  })

  it('fuera de la pieza o del registro del instrumento no se pone nada', () => {
    for (const fuera of [nota(-480, 480, 60), nota(3840, 480, 60), nota(0, 480, 47), nota(0, 480, 85), nota(0, 0, 60)]) {
      expect(ponerNota([], fuera, LIMITES)).toEqual({ notas: [], indice: undefined })
    }
  })

  it('en un instrumento de una voz, se acorta ante cualquier nota y no entra donde ya suena otra', () => {
    const base = [nota(960, 480, 67)]
    expect(breve(ponerNota(base, nota(480, 960, 60), UNA_VOZ).notas)).toEqual([
      [480, 480, 60],
      [960, 480, 67],
    ])
    expect(ponerNota(base, nota(1200, 240, 60), UNA_VOZ).indice).toBeUndefined()
  })
})

describe('buscar y quitar', () => {
  const base = [nota(0, 480, 60), nota(480, 960, 62)]

  it('encuentra la nota que suena en un instante y una altura', () => {
    expect(notaEn(base, 0, 60)).toBe(0)
    expect(notaEn(base, 479, 60)).toBe(0)
    expect(notaEn(base, 480, 60)).toBe(-1)
    expect(notaEn(base, 1000, 62)).toBe(1)
    expect(notaEn(base, 1000, 63)).toBe(-1)
  })

  it('quita la nota pedida y solo esa', () => {
    expect(breve(quitarNota(base, 0).notas)).toEqual([[480, 960, 62]])
    expect(quitarNota(base, 9).notas).toEqual(base)
  })
})

describe('mover una nota', () => {
  const base = [nota(0, 480, 60), nota(960, 480, 60), nota(960, 480, 64)]

  it('la lleva a otro instante y otra altura, conservando la duración', () => {
    const { notas, indice } = moverNota(base, 0, { t: 1920, n: 67 }, LIMITES)
    expect(breve(notas)).toEqual([
      [960, 480, 60],
      [960, 480, 64],
      [1920, 480, 67],
    ])
    expect(indice).toBe(2)
  })

  it('si chocaría con otra de su altura, se queda donde estaba', () => {
    expect(moverNota(base, 0, { t: 720, n: 60 }, LIMITES)).toEqual({ notas: base, indice: 0 })
    // Con otra altura al lado no pasa nada.
    expect(moverNota(base, 0, { t: 960, n: 62 }, LIMITES).indice).toBe(1)
  })

  it('no se sale de la pieza ni del registro', () => {
    expect(moverNota(base, 0, { t: 3600, n: 60 }, LIMITES)).toEqual({ notas: base, indice: 0 })
    expect(moverNota(base, 0, { t: -240, n: 60 }, LIMITES)).toEqual({ notas: base, indice: 0 })
    expect(moverNota(base, 0, { t: 0, n: 90 }, LIMITES)).toEqual({ notas: base, indice: 0 })
  })

  it('en un instrumento de una voz no puede acabar encima de otra nota, sea cual sea', () => {
    const linea = [nota(0, 480, 60), nota(960, 480, 67)]
    expect(moverNota(linea, 0, { t: 960, n: 72 }, UNA_VOZ)).toEqual({ notas: linea, indice: 0 })
    expect(moverNota(linea, 0, { t: 480, n: 72 }, UNA_VOZ).indice).toBe(0)
  })

  it('una posición que no existe no cambia nada', () => {
    expect(moverNota(base, 7, { t: 0, n: 60 }, LIMITES)).toEqual({ notas: base, indice: undefined })
  })
})

describe('cambiar la duración', () => {
  const base = [nota(0, 480, 60), nota(1440, 480, 60), nota(960, 480, 64)]

  it('alarga y acorta', () => {
    expect(estirarNota(base, 0, 960, 240, LIMITES).notas[0]?.d).toBe(960)
    expect(estirarNota(base, 0, 240, 240, LIMITES).notas[0]?.d).toBe(240)
  })

  it('se frena en la siguiente nota de su altura, no en las de otra', () => {
    expect(estirarNota(base, 0, 3000, 240, LIMITES).notas[0]?.d).toBe(1440)
  })

  it('se frena en el final de la pieza', () => {
    const { notas, indice } = estirarNota(base, 1, 9000, 240, LIMITES)
    expect(notas[indice ?? -1]).toMatchObject({ t: 1440, d: 2400 })
  })

  it('no baja del mínimo', () => {
    expect(estirarNota(base, 0, 0, 240, LIMITES).notas[0]?.d).toBe(240)
    expect(estirarNota(base, 0, -500, 120, LIMITES).notas[0]?.d).toBe(120)
  })

  it('en un instrumento de una voz se frena en cualquier nota', () => {
    expect(estirarNota(base, 0, 3000, 240, UNA_VOZ).notas[0]?.d).toBe(960)
  })
})

describe('deshacer y rehacer', () => {
  it('vuelve atrás y adelante por los estados', () => {
    let h = historialDe('a')
    h = hacer(h, 'b')
    h = hacer(h, 'c')
    expect(h.presente).toBe('c')
    h = deshacer(h)
    expect(h.presente).toBe('b')
    h = deshacer(h)
    expect(h.presente).toBe('a')
    expect(deshacer(h)).toBe(h)
    h = rehacer(h)
    expect(h.presente).toBe('b')
    h = rehacer(rehacer(h))
    expect(h.presente).toBe('c')
    expect(rehacer(h)).toBe(h)
  })

  it('hacer algo nuevo después de deshacer descarta lo que se podía rehacer', () => {
    let h = hacer(hacer(historialDe('a'), 'b'), 'c')
    h = hacer(deshacer(h), 'd')
    expect(h).toEqual({ pasado: ['a', 'b'], presente: 'd', futuro: [] })
  })

  it('apuntar el mismo estado no añade un paso', () => {
    const h = historialDe('a')
    expect(hacer(h, 'a')).toBe(h)
  })

  it('no guarda más pasos que el límite', () => {
    let h = historialDe(0)
    for (let i = 1; i <= PASOS_DE_HISTORIAL + 50; i++) h = hacer(h, i)
    expect(h.pasado).toHaveLength(PASOS_DE_HISTORIAL)
    expect(h.pasado[0]).toBe(50)
  })
})
