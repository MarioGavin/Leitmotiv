import { describe, expect, it } from 'vitest'
import { acordeEnCompas, comprobarAcordes, comprobarBucle, comprobarPieza, comprobarPolifonia, comprobarRangos, comprobarSecciones, comprobarTonalidad, formaDe } from './comprobaciones.ts'
import type { IdInstrumento } from './instrumentos.ts'
import { type Pieza, type Rol, duracionEnTicks, notasEnTramo, ordenarNotas, polifoniaMaxima } from './pieza.ts'
import { leerAcordes, leerNotas } from './taquigrafia.ts'

/** Pieza de prueba en 4/4 a partir de taquigrafía. */
function pieza(
  pistas: Array<{ rol: Rol; instrumento?: IdInstrumento; notas: string; id?: string }>,
  extra: Partial<Pieza> & { acordesTexto?: string } = {},
): Pieza {
  const compiladas = pistas.map((p) => {
    const instrumento = p.instrumento ?? 'piano'
    const r = leerNotas(p.notas, { compas: [4, 4], instrumento })
    return { id: p.id ?? p.rol, rol: p.rol, instrumento, notas: r.notas, compases: r.compases }
  })
  const { acordesTexto, ...resto } = extra
  const base: Pieza = {
    tempo: 100,
    compas: [4, 4],
    compases: Math.max(...compiladas.map((c) => c.compases)),
    pistas: compiladas.map(({ compases: _c, ...p }) => p),
    ...resto,
  }
  if (acordesTexto) base.acordes = leerAcordes(acordesTexto, [4, 4]).acordes
  return base
}

const codigos = (h: Array<{ codigo: string }>): string[] => h.map((x) => x.codigo)

describe('utilidades de pieza', () => {
  it('mide la duración y selecciona notas por tramo', () => {
    const p = pieza([{ rol: 'melodia', notas: 'C4:2 E4:2 | G4:1' }])
    expect(duracionEnTicks(p)).toBe(3840)
    const pista = p.pistas[0]
    expect(pista && notasEnTramo(pista, 960, 1920).map((n) => n.n)).toEqual([64])
    expect(pista && notasEnTramo(pista, 0, 961).map((n) => n.n)).toEqual([60, 64])
  })

  it('ordena por tiempo y altura sin tocar el original', () => {
    const notas = [{ t: 480, d: 1, n: 60, v: 1 }, { t: 0, d: 1, n: 67, v: 1 }, { t: 0, d: 1, n: 60, v: 1 }]
    expect(ordenarNotas(notas).map((n) => [n.t, n.n])).toEqual([[0, 60], [0, 67], [480, 60]])
    expect(notas[0]?.t).toBe(480)
  })

  it('cuenta la polifonía máxima: dos notas seguidas no se solapan', () => {
    expect(polifoniaMaxima(leerNotas('C4:4 D4:4 E4:4 F4:4', { compas: [4, 4], instrumento: 'piano' }).notas)).toBe(1)
    expect(polifoniaMaxima(leerNotas('[C4 E4 G4]:1', { compas: [4, 4], instrumento: 'piano' }).notas)).toBe(3)
    expect(polifoniaMaxima([{ t: 0, d: 960, n: 60, v: 1 }, { t: 480, d: 960, n: 64, v: 1 }])).toBe(2)
    expect(polifoniaMaxima([])).toBe(0)
  })
})

describe('rangos', () => {
  it('acepta notas dentro del registro del instrumento', () => {
    expect(comprobarRangos(pieza([{ rol: 'bajo', instrumento: 'bajo-electrico', notas: 'E1:2 G4:2' }]))).toEqual([])
  })

  it('señala las notas que el instrumento no puede tocar', () => {
    const h = comprobarRangos(pieza([{ rol: 'bajo', instrumento: 'bajo-electrico', notas: 'D1:2 A4:2' }]))
    expect(codigos(h)).toEqual(['fuera-de-rango', 'fuera-de-rango'])
    expect(h[0]?.mensaje).toMatch(/toca Re1 y «Bajo eléctrico» solo llega de Mi1 a Sol4 \(compás 1, tiempo 1\)/)
  })

  it('en percusión comprueba que la tecla sea una pieza del kit', () => {
    const p = pieza([{ rol: 'percusion', instrumento: 'bateria', notas: 'bombo:2 caja:2' }])
    expect(comprobarRangos(p)).toEqual([])
    p.pistas[0]?.notas.push({ t: 0, d: 120, n: 39, v: 100 })
    expect(codigos(comprobarRangos(p))).toEqual(['pieza-de-kit-desconocida'])
  })
})

describe('tonalidad', () => {
  it('no dice nada si la pieza no declara tonalidad', () => {
    expect(comprobarTonalidad(pieza([{ rol: 'melodia', notas: 'C4:4 C#4:4 D4:4 D#4:4' }]))).toEqual([])
  })

  it('acepta una melodía dentro de la escala', () => {
    const p = pieza([{ rol: 'melodia', notas: 'A4:4 D5:4 F#5:4. E5:8 | D5:4 B4:4 A4:2' }], { tonalidad: 'D mayor' })
    expect(comprobarTonalidad(p)).toEqual([])
  })

  it('señala las notas ajenas con su posición', () => {
    const p = pieza([{ rol: 'melodia', notas: 'A4:4 D5:4 F5:2 | D5:1' }], { tonalidad: 'D mayor' })
    const h = comprobarTonalidad(p)
    expect(codigos(h)).toEqual(['fuera-de-tonalidad'])
    expect(h[0]?.mensaje).toMatch(/toca Fa5, que no pertenece a D mayor \(compás 1, tiempo 3\)/)
  })

  it('admite los cromatismos declarados', () => {
    const p = pieza([{ rol: 'melodia', notas: 'A4:4 D5:4 F5:2 | D5:1' }], { tonalidad: 'D mayor' })
    expect(comprobarTonalidad(p, ['F'])).toEqual([])
  })

  it('en menor acepta la sensible y el 6.º elevado', () => {
    const p = pieza([{ rol: 'melodia', notas: 'A4:4 G#4:4 F#4:4 E4:4' }], { tonalidad: 'A menor' })
    expect(comprobarTonalidad(p)).toEqual([])
  })

  it('escribe con bemoles en las tonalidades con bemoles', () => {
    const p = pieza([{ rol: 'melodia', notas: 'F4:2 Db4:2' }], { tonalidad: 'F mayor' })
    expect(comprobarTonalidad(p)[0]?.mensaje).toMatch(/toca Re♭4/)
  })

  it('ignora la percusión', () => {
    const p = pieza([{ rol: 'percusion', instrumento: 'bateria', notas: 'bombo:2 caja:2' }], { tonalidad: 'D mayor' })
    expect(comprobarTonalidad(p)).toEqual([])
  })
})

describe('acordes', () => {
  it('acepta una armonía que toca los acordes escritos', () => {
    const p = pieza(
      [
        { rol: 'armonia', notas: '[D3 F#3 A3]:1 | [G3 B3 D4]:2 [A3 C#4 E4]:2' },
        { rol: 'bajo', instrumento: 'bajo-electrico', notas: 'D2:1 | G2:2 A2:2' },
      ],
      { acordesTexto: 'D:1 | G:2 A:2' },
    )
    expect(comprobarAcordes(p)).toEqual([])
  })

  it('acepta inversiones y acordes incompletos', () => {
    const p = pieza([{ rol: 'armonia', notas: '[F#3 A3 D4]:1 | [G3 D4]:1' }], { acordesTexto: 'D:1 | G:1' })
    expect(comprobarAcordes(p)).toEqual([])
  })

  it('señala la nota ajena al acorde y que el acorde no coincide', () => {
    const p = pieza([{ rol: 'armonia', notas: '[D3 F3 A3]:1' }], { acordesTexto: 'D:1' })
    const h = comprobarAcordes(p)
    expect(codigos(h)).toEqual(['nota-ajena-al-acorde', 'acorde-no-coincide'])
    expect(h[0]?.mensaje).toMatch(/toca Fa3 sobre el acorde D, que solo tiene Re, Fa♯, La/)
    expect(h[1]?.mensaje).toMatch(/parece Dm/)
  })

  it('acepta las séptimas completas', () => {
    const p = pieza([{ rol: 'armonia', notas: '[G3 B3 D4 F4]:1' }], { acordesTexto: 'G7:1' })
    expect(comprobarAcordes(p)).toEqual([])
  })

  it('avisa si el bajo no entra en la fundamental y propone escribir la inversión', () => {
    const p = pieza([{ rol: 'bajo', instrumento: 'bajo-electrico', notas: 'F#2:1' }], { acordesTexto: 'D:1' })
    const h = comprobarAcordes(p)
    expect(h.map((x) => [x.nivel, x.codigo])).toEqual([['aviso', 'bajo-sin-fundamental']])
    expect(h[0]?.mensaje).toMatch(/D\/F#/)
    const conInversion = pieza([{ rol: 'bajo', instrumento: 'bajo-electrico', notas: 'F#2:1' }], { acordesTexto: 'D/F#:1' })
    expect(comprobarAcordes(conInversion)).toEqual([])
  })

  it('no juzga la melodía: las notas de paso son normales', () => {
    const p = pieza([{ rol: 'melodia', notas: 'D4:4 E4:4 F#4:4 G4:4' }], { acordesTexto: 'D:1' })
    expect(comprobarAcordes(p)).toEqual([])
  })
})

describe('bucles', () => {
  it('no comprueba nada si la pieza no es un bucle', () => {
    expect(comprobarBucle(pieza([{ rol: 'melodia', notas: 'C4:1 | r:1' }]))).toEqual([])
  })

  it('acepta un bucle que cierra', () => {
    expect(comprobarBucle(pieza([{ rol: 'melodia', notas: 'C4:2 E4:2 | G4:2 D4:2' }], { bucle: true }))).toEqual([])
  })

  it('falla si una nota sigue sonando después del final', () => {
    const p = pieza([{ rol: 'melodia', notas: 'C4:1' }], { bucle: true })
    p.pistas[0]?.notas.push({ t: 1440, d: 960, n: 64, v: 90 })
    expect(codigos(comprobarBucle(p))).toEqual(['bucle-no-cierra'])
  })

  it('avisa de un salto de más de una octava en la costura', () => {
    const h = comprobarBucle(pieza([{ rol: 'melodia', notas: 'C4:2 E4:2 | G5:2 D6:2' }], { bucle: true }))
    expect(h.map((x) => [x.nivel, x.codigo])).toEqual([['aviso', 'bucle-con-salto']])
  })

  it('avisa si el último compás queda vacío', () => {
    const h = comprobarBucle(pieza([{ rol: 'melodia', notas: 'C4:1 | r:1' }], { bucle: true }))
    expect(codigos(h)).toEqual(['bucle-con-silencio-final'])
  })
})

describe('polifonía de chip', () => {
  it('un canal de chip solo puede tocar una nota a la vez', () => {
    expect(comprobarPolifonia(pieza([{ rol: 'melodia', instrumento: 'chip-pulso', notas: 'C4:4 E4:4 G4:2' }]))).toEqual([])
    const h = comprobarPolifonia(pieza([{ rol: 'melodia', instrumento: 'chip-pulso', notas: '[C4 E4]:1' }]))
    expect(codigos(h)).toEqual(['demasiadas-voces'])
    expect(h[0]?.mensaje).toMatch(/2 notas a la vez .* solo puede con 1/)
  })

  it('no limita los instrumentos muestreados', () => {
    expect(comprobarPolifonia(pieza([{ rol: 'armonia', notas: '[C4 E4 G4 B4]:1' }]))).toEqual([])
  })
})

describe('secciones y forma', () => {
  const base = pieza([{ rol: 'melodia', notas: 'C4:1 | D4:1 | E4:1 | F4:1' }])

  it('deduce la forma de las secciones', () => {
    const p: Pieza = { ...base, secciones: [{ id: 'A1', desde: 1, hasta: 1 }, { id: 'A2', desde: 2, hasta: 2 }, { id: 'B', desde: 3, hasta: 3 }, { id: 'A3', desde: 4, hasta: 4 }] }
    expect(formaDe(p)).toBe('AABA')
    expect(comprobarSecciones(p)).toEqual([])
    expect(formaDe(base)).toBeUndefined()
  })

  it('señala secciones fuera de la pieza, solapadas o incompletas', () => {
    expect(codigos(comprobarSecciones({ ...base, secciones: [{ id: 'A', desde: 1, hasta: 6 }] }))).toContain('seccion-fuera')
    expect(codigos(comprobarSecciones({ ...base, secciones: [{ id: 'A', desde: 1, hasta: 3 }, { id: 'B', desde: 3, hasta: 4 }] }))).toContain('secciones-solapadas')
    expect(codigos(comprobarSecciones({ ...base, secciones: [{ id: 'A', desde: 1, hasta: 2 }] }))).toEqual(['compases-sin-seccion'])
  })

  it('encuentra el acorde de cada compás', () => {
    const p = pieza([{ rol: 'melodia', notas: 'C4:1 | D4:1 | E4:1' }], { acordesTexto: 'C:1 | F:2 G:2 | C:1' })
    expect(acordeEnCompas(p, 1)).toBe('C')
    expect(acordeEnCompas(p, 2)).toBe('F')
    expect(acordeEnCompas(p, 3)).toBe('C')
    expect(acordeEnCompas(p, 4)).toBeUndefined()
  })
})

describe('comprobarPieza', () => {
  it('reúne todos los hallazgos', () => {
    const p = pieza(
      [
        { rol: 'melodia', instrumento: 'chip-pulso', notas: '[A4 C5]:1' },
        { rol: 'armonia', notas: '[D3 F3 A3]:1' },
      ],
      { tonalidad: 'D mayor', acordesTexto: 'D:1', bucle: true },
    )
    expect(new Set(codigos(comprobarPieza(p)))).toEqual(new Set(['fuera-de-tonalidad', 'nota-ajena-al-acorde', 'acorde-no-coincide', 'demasiadas-voces']))
  })

  it('una pieza correcta no produce hallazgos', () => {
    const p = pieza(
      [
        { rol: 'melodia', notas: 'A4:4 D5:4 F#5:4. E5:8 | D5:4 B4:4 A4:2' },
        { rol: 'armonia', instrumento: 'cuerdas', notas: '[D3 F#3 A3]:1 | [G3 B3 D4]:2 [A3 C#4 E4]:2' },
        { rol: 'bajo', instrumento: 'bajo-electrico', notas: 'D2:2 D2:2 | G2:2 A2:2' },
        { rol: 'percusion', instrumento: 'bateria', notas: 'bombo:4 caja:4 bombo:4 caja:4 | %' },
      ],
      { tonalidad: 'D mayor', acordesTexto: 'D:1 | G:2 A:2', bucle: true },
    )
    expect(comprobarPieza(p)).toEqual([])
  })
})
