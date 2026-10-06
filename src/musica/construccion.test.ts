import { describe, expect, it } from 'vitest'
import { PISTA_DE_ACORDE, conAcorde, conFragmento } from './construccion.ts'
import { cromaDeMidi } from './notas.ts'
import { piezaDePrueba } from './piezas-de-prueba.ts'

describe('melodía con el fragmento elegido', () => {
  const pieza = piezaDePrueba([
    { rol: 'melodia', notas: 'A4:4 D5:4 r:2 | D5:1' },
    { rol: 'bajo', instrumento: 'bajo-electrico', notas: 'D2:1 | D2:1' },
  ])
  const fragmento = [
    { t: 960, d: 480, n: 78, v: 90 },
    { t: 1440, d: 480, n: 76, v: 90 },
  ]

  it('pone las notas en la pista del hueco, en orden, sin tocar las demás', () => {
    const completa = conFragmento(pieza, 'melodia', fragmento)
    expect(completa.pistas[0]?.notas.map((n) => [n.t, n.n])).toEqual([
      [0, 69],
      [480, 74],
      [960, 78],
      [1440, 76],
      [1920, 74],
    ])
    expect(completa.pistas[1]).toBe(pieza.pistas[1])
  })

  it('no modifica la pieza original, y sin notas la devuelve tal cual', () => {
    conFragmento(pieza, 'melodia', fragmento)
    expect(pieza.pistas[0]?.notas).toHaveLength(3)
    expect(conFragmento(pieza, 'melodia', [])).toBe(pieza)
  })
})

describe('pieza con el acorde elegido', () => {
  const hueco = { t: 1920, d: 960 }
  const conArmonia = piezaDePrueba(
    [
      { rol: 'melodia', notas: 'A4:1 | D5:2 E5:2' },
      { rol: 'armonia', instrumento: 'cuerdas', notas: '[D4 F#4 A4]:1 | r:2 [A3 C#4 E4]:2' },
      { rol: 'bajo', instrumento: 'bajo-electrico', notas: 'D2:1 | r:2 A2:2' },
    ],
    { tonalidad: 'D mayor', acordesTexto: 'D:1 | -:2 A:2' },
  )

  it('el acorde suena en la pista de armonía, en su registro, y el bajo toca la fundamental', () => {
    const pieza = conAcorde(conArmonia, hueco, 'G')
    const armonia = pieza.pistas[1]?.notas.filter((n) => n.t === 1920) ?? []
    expect(armonia.map((n) => cromaDeMidi(n.n)).sort((a, b) => a - b)).toEqual([2, 7, 11])
    expect(armonia.every((n) => n.d === 960 && n.n >= 55 && n.n <= 72)).toBe(true)
    const bajo = pieza.pistas[2]?.notas.find((n) => n.t === 1920)
    expect(bajo).toMatchObject({ d: 960, n: 43 })
    expect(pieza.acordes?.map((a) => a.simbolo)).toEqual(['D', 'G', 'A'])
    expect(pieza.pistas[0]).toBe(conArmonia.pistas[0])
  })

  it('un acorde con bajo cifrado pone ese bajo', () => {
    const bajo = conAcorde(conArmonia, hueco, 'G/B').pistas[2]?.notas.find((n) => n.t === 1920)
    expect(cromaDeMidi(bajo?.n ?? 0)).toBe(11)
  })

  it('si el bajo ya toca en el hueco, no se le añade nada', () => {
    const conBajo = piezaDePrueba([
      { rol: 'melodia', notas: 'A4:1 | D5:1' },
      { rol: 'armonia', notas: '[D4 F#4 A4]:1 | r:1' },
      { rol: 'bajo', instrumento: 'bajo-electrico', notas: 'D2:1 | G2:1' },
    ])
    expect(conAcorde(conBajo, { t: 1920, d: 1920 }, 'G').pistas[2]).toBe(conBajo.pistas[2])
  })

  it('sin pista de armonía añade una de piano; también cuando aún no se ha elegido nada', () => {
    const sola = piezaDePrueba([{ rol: 'melodia', notas: 'A4:1 | D5:1' }])
    const vacia = conAcorde(sola, hueco, undefined)
    expect(vacia.pistas.map((p) => p.id)).toEqual(['melodia', PISTA_DE_ACORDE])
    expect(vacia.pistas[1]?.notas).toEqual([])
    const elegida = conAcorde(sola, hueco, 'Bm')
    expect(elegida.pistas.map((p) => [p.id, p.rol, p.instrumento])).toEqual([
      ['melodia', 'melodia', 'piano'],
      [PISTA_DE_ACORDE, 'armonia', 'piano'],
    ])
    expect(elegida.pistas[1]?.notas.map((n) => cromaDeMidi(n.n)).sort((a, b) => a - b)).toEqual([2, 6, 11])
    // Alrededor del Do central.
    expect(elegida.pistas[1]?.notas.every((n) => n.n >= 55 && n.n <= 69)).toBe(true)
  })

  it('con pista de armonía y sin nada elegido, devuelve la misma pieza', () => {
    expect(conAcorde(conArmonia, hueco, undefined)).toBe(conArmonia)
  })

  it('no modifica la pieza original', () => {
    const copia = structuredClone(conArmonia)
    conAcorde(conArmonia, hueco, 'Em7')
    expect(conArmonia).toEqual(copia)
  })
})
