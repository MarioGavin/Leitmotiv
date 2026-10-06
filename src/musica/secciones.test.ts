import { describe, expect, it } from 'vitest'
import { azarConSemilla } from './oido.ts'
import type { Pieza } from './pieza.ts'
import { piezaDePrueba } from './piezas-de-prueba.ts'
import { barajarSecciones, huellaDeSeccion, ordenCorrecto, piezaDeSeccion, reordenar } from './secciones.ts'

const PIEZA: Pieza = piezaDePrueba(
  [
    { rol: 'melodia', notas: 'C4:1 | D4:1 | E4:2. F4:4~ | F4:2 G4:2 | C4:1 | D4:1' },
    { rol: 'bajo', instrumento: 'bajo-electrico', notas: 'C2:1 | % | E2:1 | G2:1 | C2:1 | %' },
  ],
  {
    bucle: true,
    acordesTexto: 'C:1 | % | Em:1 | G:1 | C:1 | %',
    secciones: [
      { id: 'a', nombre: 'Tema', desde: 1, hasta: 2 },
      { id: 'b', nombre: 'Puente', desde: 3, hasta: 4 },
      { id: 'a2', nombre: 'Vuelta', desde: 5, hasta: 6 },
    ],
  },
)
const [A, B, A2] = PIEZA.secciones ?? []

describe('una sección como pieza suelta', () => {
  it('se queda con sus compases, contados desde cero', () => {
    const suelta = piezaDeSeccion(PIEZA, B!)
    expect(suelta.compases).toBe(2)
    // La nota ligada sobre la barra sigue entera dentro de la sección.
    expect(suelta.pistas[0]?.notas.map((n) => [n.t, n.d, n.n])).toEqual([
      [0, 1440, 64],
      [1440, 1440, 65],
      [2880, 960, 67],
    ])
    expect(suelta.acordes?.map((a) => [a.t, a.simbolo])).toEqual([
      [0, 'Em'],
      [1920, 'G'],
    ])
    expect(suelta.secciones).toBeUndefined()
    expect(suelta.bucle).toBeUndefined()
    expect(suelta.tempo).toBe(PIEZA.tempo)
  })

  it('una nota que entra o sale de la sección se recorta', () => {
    const corta = piezaDeSeccion(PIEZA, { id: 'x', desde: 3, hasta: 3 })
    expect(corta.pistas[0]?.notas.map((n) => [n.t, n.d, n.n])).toEqual([
      [0, 1440, 64],
      [1440, 480, 65],
    ])
    const siguiente = piezaDeSeccion(PIEZA, { id: 'y', desde: 4, hasta: 4 })
    expect(siguiente.pistas[0]?.notas.map((n) => [n.t, n.d, n.n])).toEqual([
      [0, 960, 65],
      [960, 960, 67],
    ])
  })
})

describe('reordenar las secciones', () => {
  it('en su orden, la pieza queda igual', () => {
    const misma = reordenar(PIEZA, ['a', 'b', 'a2'])
    expect(misma.pistas).toEqual(PIEZA.pistas)
    expect(misma.acordes).toEqual(PIEZA.acordes)
    expect(misma.secciones).toEqual(PIEZA.secciones)
    expect(misma.compases).toBe(6)
  })

  it('en otro orden, cada sección suena donde se ha puesto', () => {
    const otra = reordenar(PIEZA, ['b', 'a', 'a2'])
    expect(otra.pistas[0]?.notas.map((n) => [n.t, n.n])).toEqual([
      [0, 64],
      [1440, 65],
      [2880, 67],
      [3840, 60],
      [5760, 62],
      [7680, 60],
      [9600, 62],
    ])
    expect(otra.secciones?.map((s) => [s.id, s.desde, s.hasta])).toEqual([
      ['b', 1, 2],
      ['a', 3, 4],
      ['a2', 5, 6],
    ])
    expect(otra.acordes?.map((a) => a.simbolo)).toEqual(['Em', 'G', 'C', 'C', 'C', 'C'])
  })

  it('con menos secciones, la pieza es más corta; lo que no existe se ignora', () => {
    expect(reordenar(PIEZA, ['b', 'no-existe']).compases).toBe(2)
    expect(reordenar(PIEZA, []).compases).toBe(1)
  })
})

describe('saber si un orden es el bueno', () => {
  it('dos secciones que suenan igual tienen la misma huella y pueden intercambiarse', () => {
    expect(huellaDeSeccion(PIEZA, A!)).toBe(huellaDeSeccion(PIEZA, A2!))
    expect(huellaDeSeccion(PIEZA, A!)).not.toBe(huellaDeSeccion(PIEZA, B!))
    expect(ordenCorrecto(PIEZA, ['a', 'b', 'a2'])).toBe(true)
    expect(ordenCorrecto(PIEZA, ['a2', 'b', 'a'])).toBe(true)
  })

  it('cualquier otro orden no vale, ni uno incompleto', () => {
    expect(ordenCorrecto(PIEZA, ['b', 'a', 'a2'])).toBe(false)
    expect(ordenCorrecto(PIEZA, ['a', 'a2', 'b'])).toBe(false)
    expect(ordenCorrecto(PIEZA, ['a', 'b'])).toBe(false)
    expect(ordenCorrecto(PIEZA, ['a', 'b', 'zz'])).toBe(false)
  })
})

describe('barajar las secciones', () => {
  it('nunca entrega el orden correcto y siempre entrega todas las secciones', () => {
    for (let semilla = 0; semilla < 200; semilla++) {
      const orden = barajarSecciones(PIEZA, azarConSemilla(semilla))
      expect([...orden].sort()).toEqual(['a', 'a2', 'b'])
      expect(ordenCorrecto(PIEZA, orden)).toBe(false)
    }
  })

  it('con un azar que no baraja, gira las secciones', () => {
    // Un azar que siempre da casi 1 deja el orden como estaba.
    expect(barajarSecciones(PIEZA, () => 0.999999)).toEqual(['b', 'a2', 'a'])
  })
})
