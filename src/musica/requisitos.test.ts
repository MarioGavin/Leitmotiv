import { describe, expect, it } from 'vitest'
import type { Requisito } from '../contenido/tipos.ts'
import { piezaDePrueba } from './piezas-de-prueba.ts'
import { corregir, todoCumplido } from './requisitos.ts'

/** Corrige con un solo requisito y devuelve su línea. */
function linea(pieza: Parameters<typeof corregir>[0], requisito: Requisito, nomenclatura: 'latina' | 'anglosajona' = 'latina') {
  const [resultado] = corregir(pieza, [requisito], nomenclatura)
  if (!resultado) throw new Error('Sin resultado')
  return resultado
}

const melodia = (notas: string, extra: Parameters<typeof piezaDePrueba>[1] = {}) => piezaDePrueba([{ rol: 'melodia', notas }], extra)

describe('requisito de tonalidad', () => {
  const regla: Requisito = { regla: 'tonalidad', valores: ['C mayor'], minimo: 0.9 }

  it('se cumple cuando todas las notas son de la escala', () => {
    const r = linea(melodia('C4:4 E4:4 G4:4 B4:4'), regla)
    expect(r.cumplido).toBe(true)
    expect(r.titulo).toBe('Tonalidad: Do mayor')
  })

  it('nombra las notas ajenas, en la nomenclatura elegida', () => {
    const r = linea(melodia('C4:4 F#4:4 G4:4 Bb4:4'), regla)
    expect(r.cumplido).toBe(false)
    expect(r.detalle).toContain('Fa♯')
    expect(r.detalle).toContain('La♯')
    expect(linea(melodia('C4:4 F#4:4 G4:4 Bb4:4'), regla, 'anglosajona').detalle).toContain('F♯')
  })

  it('admite alguna nota de paso si no baja del mínimo', () => {
    const casi = melodia('C4:8 D4:8 E4:8 F4:8 G4:8 A4:8 B4:8 C5:8 | D5:8 C5:8 B4:8 A4:8 G4:8 F#4:8 G4:8 C5:8')
    const r = linea(casi, { ...regla, minimo: 0.9 })
    expect(r.cumplido).toBe(true)
    expect(r.detalle).toContain('de paso')
  })

  it('vale cualquiera de las tonalidades propuestas', () => {
    const r = linea(melodia('A3:4 B3:4 C4:4 E4:4', { tonalidad: 'A menor' }), { regla: 'tonalidad', valores: ['E mayor', 'A menor'], minimo: 1 })
    expect(r.cumplido).toBe(true)
    expect(r.titulo).toBe('Tonalidad: Mi mayor o La menor')
  })

  it('no se cumple sin notas, y la percusión no cuenta', () => {
    const soloBateria = piezaDePrueba([{ rol: 'percusion', instrumento: 'bateria', notas: 'bombo:4 caja:4 bombo:4 caja:4' }])
    expect(linea(soloBateria, regla)).toMatchObject({ cumplido: false, detalle: 'Todavía no hay notas.' })
  })
})

describe('requisitos de medida', () => {
  it('compás', () => {
    expect(linea(melodia('C4:1'), { regla: 'compas', valor: [4, 4] }).cumplido).toBe(true)
    const tres = piezaDePrueba([{ rol: 'melodia', notas: 'C4:2.' }], { compas: [3, 4] })
    expect(linea(tres, { regla: 'compas', valor: [4, 4] })).toMatchObject({ cumplido: false, detalle: 'La pieza está en 3/4.' })
    // 6/8 y 3/4 duran lo mismo, pero no son el mismo compás.
    expect(linea(tres, { regla: 'compas', valor: [6, 8] }).cumplido).toBe(false)
  })

  it('número de compases', () => {
    const p = melodia('C4:1 | D4:1')
    expect(linea(p, { regla: 'compases', valor: 2 }).cumplido).toBe(true)
    expect(linea(p, { regla: 'compases', valor: 4 })).toMatchObject({ cumplido: false, titulo: '4 compases de duración', detalle: 'La pieza tiene 2 compases.' })
  })

  it('tempo, con el consejo de hacia dónde moverlo', () => {
    const regla: Requisito = { regla: 'tempo', min: 70, max: 90 }
    expect(linea(melodia('C4:1', { tempo: 80 }), regla).cumplido).toBe(true)
    expect(linea(melodia('C4:1', { tempo: 60 }), regla).detalle).toBe('Va a 60 BPM. Súbelo.')
    expect(linea(melodia('C4:1', { tempo: 140 }), regla).detalle).toBe('Va a 140 BPM. Bájalo.')
    expect(linea(melodia('C4:1'), { regla: 'tempo', min: 100, max: 100 }).titulo).toBe('Tempo de 100 BPM')
  })
})

describe('requisitos sobre las pistas', () => {
  const dosPistas = piezaDePrueba([
    { rol: 'melodia', notas: 'C5:4 D5:4 E5:4 G5:4' },
    { rol: 'bajo', instrumento: 'bajo-electrico', notas: '' },
  ])

  it('pistas con notas', () => {
    expect(linea(dosPistas, { regla: 'pistas', roles: ['melodia'] }).cumplido).toBe(true)
    const r = linea(dosPistas, { regla: 'pistas', roles: ['melodia', 'bajo'] })
    expect(r).toMatchObject({ cumplido: false, titulo: 'Pistas de melodía y bajo', detalle: 'Sin notas todavía: bajo.' })
  })

  it('mínimo de notas', () => {
    expect(linea(dosPistas, { regla: 'notas-minimas', pista: 'melodia', valor: 4 }).cumplido).toBe(true)
    expect(linea(dosPistas, { regla: 'notas-minimas', pista: 'melodia', valor: 6 }).detalle).toBe('Tiene 4: faltan 2.')
    expect(linea(dosPistas, { regla: 'notas-minimas', pista: 'bajo', valor: 1 }).cumplido).toBe(false)
  })

  it('registro', () => {
    const regla: Requisito = { regla: 'rango', pista: 'melodia', min: 60, max: 76 }
    expect(linea(melodia('C4:4 E5:4 G4:2'), regla).cumplido).toBe(true)
    const r = linea(melodia('B3:4 E5:4 G5:2'), regla)
    expect(r.cumplido).toBe(false)
    expect(r.titulo).toBe('Melodía entre Do4 y Mi5')
    expect(r.detalle).toBe('Se salen del registro: Si3, Sol5.')
    expect(linea(dosPistas, { regla: 'rango', pista: 'bajo', min: 28, max: 55 }).cumplido).toBe(false)
  })

  it('densidad media por compás', () => {
    const p = melodia('C4:4 D4:4 E4:4 F4:4 | G4:1')
    expect(linea(p, { regla: 'densidad', pista: 'melodia', min: 2, max: 4 })).toMatchObject({ cumplido: true, detalle: 'Lleva 2,5 de media.' })
    expect(linea(p, { regla: 'densidad', pista: 'melodia', min: 4 }).detalle).toContain('Añade notas')
    expect(linea(p, { regla: 'densidad', pista: 'melodia', max: 2 }).detalle).toContain('Quita notas')
  })

  it('polifonía', () => {
    expect(linea(melodia('C4:4 D4:4 E4:2'), { regla: 'polifonia', pista: 'melodia', max: 1 })).toMatchObject({ cumplido: true, titulo: 'Melodía a una sola voz' })
    expect(linea(melodia('[C4 E4 G4]:1'), { regla: 'polifonia', pista: 'melodia', max: 1 }).cumplido).toBe(false)
    expect(linea(melodia('[C4 E4 G4]:1'), { regla: 'polifonia', pista: 'melodia', max: 3 }).cumplido).toBe(true)
  })

  it('instrumentos permitidos: solo cuentan las pistas con notas', () => {
    const p = piezaDePrueba([
      { rol: 'melodia', instrumento: 'chip-pulso', notas: 'C5:1' },
      { rol: 'bajo', instrumento: 'chip-triangulo', notas: 'C2:1' },
      { rol: 'colchon', instrumento: 'cuerdas', notas: '' },
    ])
    expect(linea(p, { regla: 'instrumentos', permitidos: ['chip-pulso', 'chip-triangulo'] }).cumplido).toBe(true)
    const r = linea(p, { regla: 'instrumentos', permitidos: ['chip-pulso'] })
    expect(r.cumplido).toBe(false)
    expect(r.detalle).toBe('Sobra: onda triangular (chip).')
  })
})

describe('requisito de bucle', () => {
  it('se cumple si nada queda sonando y la melodía vuelve cerca', () => {
    expect(linea(melodia('C4:4 E4:4 G4:4 E4:4 | D4:4 F4:4 E4:4 D4:4'), { regla: 'bucle' }).cumplido).toBe(true)
  })

  it('falla si una nota se sale del final', () => {
    const p = melodia('C4:4 E4:4 G4:4 E4:4')
    p.pistas[0]?.notas.push({ t: 1680, d: 480, n: 62, v: 90 })
    expect(linea(p, { regla: 'bucle' }).detalle).toContain('después del último compás')
  })

  it('falla si la melodía acaba a más de una octava de donde empieza', () => {
    expect(linea(melodia('C4:4 E4:4 G4:4 E5:4'), { regla: 'bucle' }).detalle).toContain('más de una octava')
  })

  it('una pieza vacía no cierra nada', () => {
    expect(linea(melodia(''), { regla: 'bucle' }).cumplido).toBe(false)
  })
})

describe('requisito de estructura', () => {
  const A = 'C4:4 E4:4 G4:4 E4:4'
  const B = 'F4:2 A4:2'
  const regla: Requisito = { regla: 'estructura', forma: 'AABA', compasesPorSeccion: 1 }

  it('reconoce las repeticiones y el contraste', () => {
    expect(linea(melodia(`${A} | ${A} | ${B} | ${A}`), regla).cumplido).toBe(true)
  })

  it('avisa si dos secciones con la misma letra no se repiten', () => {
    const r = linea(melodia(`${A} | D4:1 | ${B} | ${A}`), regla)
    expect(r.cumplido).toBe(false)
    expect(r.detalle).toContain('Las secciones 1 y 2 llevan la misma letra (A)')
  })

  it('avisa si la sección que debe contrastar es igual', () => {
    const r = linea(melodia(`${A} | ${A} | ${A} | ${A}`), regla)
    expect(r.cumplido).toBe(false)
    expect(r.detalle).toContain('tienen que contrastar')
  })

  it('tolera una variación pequeña en la repetición', () => {
    // Cinco notas y cambia una: coinciden cuatro de cinco, el 80 %.
    const a1 = 'C4:4 E4:4 G4:4 E4:8 D4:8'
    const a2 = 'C4:4 E4:4 G4:4 E4:8 C4:8'
    expect(linea(melodia(`${a1} | ${a2} | ${B} | ${a1}`), regla).cumplido).toBe(true)
  })

  it('pide el número de compases que exige la forma y melodía en todas las secciones', () => {
    expect(linea(melodia(`${A} | ${A}`), regla).detalle).toBe('Hacen falta 4 compases y la pieza tiene 2.')
    expect(linea(melodia(`${A} | ${A} | r:1 | ${A}`), regla).detalle).toBe('La sección 3 (B) no tiene melodía todavía.')
  })
})

describe('requisitos de principio y final', () => {
  const enDo = (notas: string) => melodia(notas, { tonalidad: 'C mayor' })

  it('grado de la primera nota', () => {
    expect(linea(enDo('C4:4 E4:4 G4:2'), { regla: 'empieza-en', pista: 'melodia', grados: [1, 5] })).toMatchObject({ cumplido: true, detalle: 'Empieza en Do4, el 1.º grado.' })
    const r = linea(enDo('D4:4 E4:4 G4:2'), { regla: 'empieza-en', pista: 'melodia', grados: [1, 5] })
    expect(r.cumplido).toBe(false)
    expect(r.titulo).toBe('Melodía: empieza en el 1.º o 5.º grado')
    expect(r.detalle).toBe('Empieza en Re4, el 2.º grado. Prueba con Do o Sol.')
  })

  it('grado de la última nota', () => {
    expect(linea(enDo('E4:4 D4:4 C4:2'), { regla: 'termina-en', pista: 'melodia', grados: [1] }).cumplido).toBe(true)
    expect(linea(enDo('E4:4 D4:4 F#4:2'), { regla: 'termina-en', pista: 'melodia', grados: [1] }).detalle).toContain('que no es de la escala')
  })

  it('sin tonalidad o sin notas no se puede cumplir', () => {
    expect(linea(melodia('C4:1'), { regla: 'empieza-en', pista: 'melodia', grados: [1] }).cumplido).toBe(false)
    expect(linea(enDo(''), { regla: 'termina-en', pista: 'melodia', grados: [1] }).detalle).toBe('Todavía no hay notas en esa pista.')
  })
})

describe('corrección completa', () => {
  it('devuelve una línea por requisito, en orden, y dice si está todo', () => {
    const p = melodia('C4:4 E4:4 G4:4 C4:4', { tonalidad: 'C mayor', tempo: 90 })
    const requisitos: Requisito[] = [
      { regla: 'tonalidad', valores: ['C mayor'], minimo: 1 },
      { regla: 'tempo', min: 80, max: 100 },
      { regla: 'notas-minimas', pista: 'melodia', valor: 8 },
    ]
    const r = corregir(p, requisitos, 'latina')
    expect(r.map((x) => x.cumplido)).toEqual([true, true, false])
    expect(r.map((x) => x.requisito.regla)).toEqual(['tonalidad', 'tempo', 'notas-minimas'])
    expect(todoCumplido(r)).toBe(false)
    expect(todoCumplido(r.slice(0, 2))).toBe(true)
  })
})
