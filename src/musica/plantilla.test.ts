import { describe, expect, it } from 'vitest'
import type { Requisito } from '../contenido/tipos.ts'
import { piezaEnBlanco, plantillaParaRequisitos } from './plantilla.ts'
import { corregir } from './requisitos.ts'

describe('pieza en blanco', () => {
  it('trae las cuatro pistas de siempre, sin notas, en Do mayor y en bucle', () => {
    const pieza = piezaEnBlanco()
    expect(pieza).toMatchObject({ tempo: 100, compas: [4, 4], compases: 8, bucle: true, tonalidad: 'C mayor' })
    expect(pieza.pistas.map((p) => [p.id, p.instrumento, p.notas.length])).toEqual([
      ['melodia', 'piano', 0],
      ['armonia', 'cuerdas', 0],
      ['bajo', 'bajo-electrico', 0],
      ['percusion', 'bateria', 0],
    ])
    expect(pieza.titulo).toBeUndefined()
  })

  it('admite título, tempo, compás, longitud, tonalidad y papeles', () => {
    const pieza = piezaEnBlanco({ titulo: 'Vals', tempo: 132, compas: [3, 4], compases: 16, tonalidad: 'A menor', roles: ['melodia', 'bajo'] })
    expect(pieza).toMatchObject({ titulo: 'Vals', tempo: 132, compas: [3, 4], compases: 16, tonalidad: 'A menor' })
    expect(pieza.pistas.map((p) => p.rol)).toEqual(['melodia', 'bajo'])
  })

  it('con instrumentos restringidos, cada papel toma el primero que le sirve y la percusión solo si está permitida', () => {
    const chip = piezaEnBlanco({ permitidos: ['chip-pulso', 'chip-triangulo'] })
    expect(chip.pistas.map((p) => [p.rol, p.instrumento])).toEqual([
      ['melodia', 'chip-pulso'],
      ['armonia', 'chip-pulso'],
      ['bajo', 'chip-triangulo'],
    ])
    expect(piezaEnBlanco({ permitidos: ['bateria'] }).pistas.map((p) => p.rol)).toEqual(['percusion'])
  })
})

describe('plantilla de un encargo', () => {
  const requisitos: Requisito[] = [
    { regla: 'tonalidad', valores: ['D menor', 'F mayor'], minimo: 0.9 },
    { regla: 'compas', valor: [6, 8] },
    { regla: 'compases', valor: 4 },
    { regla: 'tempo', min: 60, max: 80 },
    { regla: 'notas-minimas', pista: 'melodia', valor: 6 },
    { regla: 'rango', pista: 'bajo', min: 28, max: 55 },
    { regla: 'instrumentos', permitidos: ['piano', 'bajo-electrico'] },
    { regla: 'bucle' },
  ]

  it('toma de los requisitos lo que ya viene decidido', () => {
    const pieza = plantillaParaRequisitos(requisitos, 'Nana del bosque')
    expect(pieza).toMatchObject({ titulo: 'Nana del bosque', tonalidad: 'D menor', compas: [6, 8], compases: 4, tempo: 70 })
    expect(pieza.pistas.map((p) => [p.rol, p.instrumento])).toEqual([
      ['melodia', 'piano'],
      ['bajo', 'bajo-electrico'],
    ])
  })

  it('la plantilla cumple de entrada los requisitos que no dependen de escribir notas', () => {
    const resultados = corregir(plantillaParaRequisitos(requisitos), requisitos, 'latina')
    const porRegla = Object.fromEntries(resultados.map((r) => [r.requisito.regla, r.cumplido]))
    expect(porRegla).toMatchObject({ compas: true, compases: true, tempo: true, instrumentos: true })
  })

  it('sin requisitos que nombren papeles, trae las cuatro pistas de siempre', () => {
    expect(plantillaParaRequisitos([{ regla: 'bucle' }]).pistas.map((p) => p.rol)).toEqual(['melodia', 'armonia', 'bajo', 'percusion'])
  })

  it('la longitud sale de la estructura si no se pide otra', () => {
    expect(plantillaParaRequisitos([{ regla: 'estructura', forma: 'AABA', compasesPorSeccion: 2 }]).compases).toBe(8)
    expect(
      plantillaParaRequisitos([
        { regla: 'compases', valor: 16 },
        { regla: 'estructura', forma: 'AABA', compasesPorSeccion: 4 },
      ]).compases,
    ).toBe(16)
  })
})
