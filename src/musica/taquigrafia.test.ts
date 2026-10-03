import { describe, expect, it } from 'vitest'
import { ErrorDeTaquigrafia, MATICES, duracionDeFragmento, leerAcordes, leerFragmento, leerNotas, leerPatronRitmico, leerRejilla } from './taquigrafia.ts'

const c44 = { compas: [4, 4] as const, instrumento: 'piano' as const }

describe('leerNotas', () => {
  it('lee una melodía de dos compases', () => {
    const r = leerNotas('A4:4 D5:4 F#5:4. E5:8 | D5:4 B4:4 A4:2', c44)
    expect(r.compases).toBe(2)
    expect(r.notas.map((n) => [n.t, n.d, n.n])).toEqual([
      [0, 480, 69],
      [480, 480, 74],
      [960, 720, 78],
      [1680, 240, 76],
      [1920, 480, 74],
      [2400, 480, 71],
      [2880, 960, 69],
    ])
    expect(r.notas.every((n) => n.v === MATICES.mf)).toBe(true)
  })

  it('lee acordes entre corchetes y silencios', () => {
    const r = leerNotas('[C4 E4 G4]:2 r:4 [D4 F4]:4', c44)
    expect(r.notas.map((n) => [n.t, n.d, n.n])).toEqual([
      [0, 960, 60],
      [0, 960, 64],
      [0, 960, 67],
      [1440, 480, 62],
      [1440, 480, 65],
    ])
  })

  it('une las notas ligadas, también a través de la barra de compás', () => {
    const r = leerNotas('C4:2 E4:2~ | E4:2 G4:2', c44)
    expect(r.notas.map((n) => [n.t, n.d, n.n])).toEqual([
      [0, 960, 60],
      [960, 1920, 64],
      [2880, 960, 67],
    ])
  })

  it('aplica matices que persisten y acentos puntuales', () => {
    const r = leerNotas('C4:4 !p D4:4 E4:4> !ff F4:4', c44)
    expect(r.notas.map((n) => n.v)).toEqual([MATICES.mf, MATICES.p, (MATICES.p ?? 0) + 16, MATICES.ff])
  })

  it('respeta el matiz inicial de la pista', () => {
    expect(leerNotas('C4:1', { ...c44, matiz: 'pp' }).notas[0]?.v).toBe(MATICES.pp)
    expect(() => leerNotas('C4:1', { ...c44, matiz: 'fortísimo' })).toThrow(/Matiz no válido/)
  })

  it('repite el compás anterior con %', () => {
    const r = leerNotas('C4:4 E4:4 G4:2 | % | %', c44)
    expect(r.compases).toBe(3)
    expect(r.notas).toHaveLength(9)
    expect(r.notas.filter((n) => n.n === 60).map((n) => n.t)).toEqual([0, 1920, 3840])
  })

  it('entiende tresillos y compases que no son 4/4', () => {
    expect(leerNotas('C4:8t D4:8t E4:8t F4:4 G4:2', c44).notas.map((n) => n.t)).toEqual([0, 160, 320, 480, 960])
    const seis = leerNotas('C4:8 D4:8 E4:8 F4:4.', { compas: [6, 8], instrumento: 'piano' })
    expect(seis.compases).toBe(1)
    expect(leerNotas('C4:2.', { compas: [3, 4], instrumento: 'piano' }).notas[0]?.d).toBe(1440)
  })

  it('marca los huecos sin crear notas', () => {
    const r = leerNotas('C4:4 D4:4 ?:2', c44)
    expect(r.huecos).toEqual([{ t: 960, d: 960 }])
    expect(r.notas).toHaveLength(2)
  })

  it('traduce los alias de percusión a teclas del kit', () => {
    const r = leerNotas('bombo:4 caja:4 [bombo charles]:4 caja:4', { compas: [4, 4], instrumento: 'bateria' })
    expect(r.notas.map((n) => n.n)).toEqual([36, 38, 36, 42, 38])
    expect(() => leerNotas('timbal:1', { compas: [4, 4], instrumento: 'bateria' })).toThrow(/no es una pieza de «bateria»/)
    expect(() => leerNotas('C4:1', { compas: [4, 4], instrumento: 'bateria' })).toThrow(/Piezas disponibles: bombo/)
  })

  it('señala el compás mal medido', () => {
    expect(() => leerNotas('C4:4 D4:4 E4:4 | C4:1', c44)).toThrow(/compás 1 está mal medido: le faltan 480/)
    expect(() => leerNotas('C4:1 | C4:2. D4:2', c44)).toThrow(/compás 2 está mal medido: le sobran 480/)
    expect(() => leerNotas('C4:4 D4:4', c44)).toThrow(/compás 1 está mal medido/)
  })

  it('exige la barra entre compases', () => {
    expect(() => leerNotas('C4:1 D4:1', c44)).toThrow(ErrorDeTaquigrafia)
  })

  it('explica los eventos que no entiende', () => {
    expect(() => leerNotas('C4', c44)).toThrow(/No entiendo «C4»/)
    expect(() => leerNotas('C4:3', c44)).toThrow(/Figura no válida/)
    expect(() => leerNotas('Do4:4 r:2.', c44)).toThrow(/Nota no válida: «Do4»/)
    expect(() => leerNotas('[C4 E4:2 r:2', c44)).toThrow(/Falta cerrar un corchete/)
    expect(() => leerNotas('!fff C4:1', c44)).toThrow(/Matiz no válido/)
  })

  it('rechaza las ligaduras que no llegan a ninguna nota', () => {
    expect(() => leerNotas('C4:2~ D4:2', c44)).toThrow(/ligadura/)
    expect(() => leerNotas('C4:2~ r:2', c44)).toThrow(/ligadura/)
    expect(() => leerNotas('C4:2 D4:2~', c44)).toThrow(/ligadura/)
  })

  it('rechaza un % que no ocupa el compás entero o que no tiene compás previo', () => {
    expect(() => leerNotas('% | C4:1', c44)).toThrow(/no hay compás anterior/)
    expect(() => leerNotas('C4:1 | C4:2 %', c44)).toThrow(/compás entero/)
  })
})

describe('fragmentos', () => {
  it('mide un fragmento sin exigir compases completos', () => {
    expect(duracionDeFragmento('F#5:4 E5:4', 'piano')).toBe(960)
    expect(duracionDeFragmento('[C4 E4]:8 r:8', 'piano')).toBe(480)
    expect(() => duracionDeFragmento('X9:4', 'piano')).toThrow(/Nota no válida/)
  })

  it('lee un fragmento con tiempos desde cero', () => {
    const f = leerFragmento('F#5:4 r:8 E5:8', { instrumento: 'piano' })
    expect(f.duracion).toBe(960)
    expect(f.notas.map((n) => [n.t, n.d, n.n])).toEqual([
      [0, 480, 78],
      [720, 240, 76],
    ])
    expect(() => leerFragmento('C4:4 | D4:4', { instrumento: 'piano' })).toThrow(/no lleva barras/)
    expect(() => leerFragmento('', { instrumento: 'piano' })).toThrow(/vacío/)
  })
})

describe('leerRejilla', () => {
  const base = { compas: [4, 4] as const, instrumento: 'bateria' as const }

  it('convierte casillas en golpes y repite la línea hasta llenar los compases', () => {
    const notas = leerRejilla({ paso: '8', lineas: { bombo: 'x...x...', caja: '..x...x.' } }, { ...base, compases: 2 })
    expect(notas.filter((n) => n.n === 36).map((n) => n.t)).toEqual([0, 960, 1920, 2880])
    expect(notas.filter((n) => n.n === 38).map((n) => n.t)).toEqual([480, 1440, 2400, 3360])
  })

  it('distingue golpe normal, acento y golpe flojo', () => {
    const notas = leerRejilla({ paso: '4', lineas: { charles: 'xXo.' } }, { ...base, compases: 1 })
    expect(notas.map((n) => n.v)).toEqual([100, 122, 62])
  })

  it('admite barras y espacios como ayuda visual', () => {
    const a = leerRejilla({ paso: '16', lineas: { bombo: 'x...|x...|x...|x...' } }, { ...base, compases: 1 })
    const b = leerRejilla({ paso: '16', lineas: { bombo: 'x...x...x...x...' } }, { ...base, compases: 1 })
    expect(a).toEqual(b)
  })

  it('exige compases enteros y solo para percusión', () => {
    expect(() => leerRejilla({ paso: '16', lineas: { bombo: 'x...x...x...x..' } }, { ...base, compases: 1 })).toThrow(/compases enteros/)
    expect(() => leerRejilla({ paso: '16', lineas: { bombo: 'x...x...x...x...' } }, { ...base, compases: 3 })).not.toThrow()
    expect(() => leerRejilla({ paso: '8', lineas: { bombo: 'x.x.x.x.x.x.x.x.' } }, { ...base, compases: 3 })).toThrow(/no cabe un número entero/)
    expect(() => leerRejilla({ paso: '16', lineas: { bombo: 'x' } }, { compas: [4, 4], instrumento: 'piano', compases: 1 })).toThrow(/solo sirve para percusión/)
    expect(() => leerRejilla({ paso: '16', lineas: { bombo: 'x..y' } }, { ...base, compases: 1 })).toThrow(/solo puede tener/)
  })

  it('funciona con tresillos y con 6/8', () => {
    const tresillos = leerRejilla({ paso: '8t', lineas: { charles: 'x..x..x..x..' } }, { ...base, compases: 1 })
    expect(tresillos.map((n) => n.t)).toEqual([0, 480, 960, 1440])
    const seis = leerRejilla({ paso: '8', lineas: { charles: 'x..x..' } }, { compas: [6, 8], instrumento: 'bateria', compases: 1 })
    expect(seis.map((n) => n.t)).toEqual([0, 720])
  })
})

describe('leerPatronRitmico', () => {
  it('devuelve los instantes de cada golpe', () => {
    const p = leerPatronRitmico('x...x...x.x.x...', '16', [4, 4])
    expect(p.golpes).toEqual([0, 480, 960, 1200, 1440])
    expect(p.duracion).toBe(1920)
    expect(leerPatronRitmico('X..x..', '8', [6, 8]).acentos).toEqual([true, false])
  })

  it('rechaza patrones vacíos o que no ocupan compases enteros', () => {
    expect(() => leerPatronRitmico('....', '4', [4, 4])).toThrow(/ningún golpe/)
    expect(() => leerPatronRitmico('x.x', '4', [4, 4])).toThrow(/compases enteros/)
  })
})

describe('leerAcordes', () => {
  it('lee una progresión con duraciones', () => {
    const r = leerAcordes('D:1 | G:2 A:2 | Bm:1 | G:2 A7:2', [4, 4])
    expect(r.compases).toBe(4)
    expect(r.acordes.map((a) => [a.t, a.d, a.simbolo])).toEqual([
      [0, 1920, 'D'],
      [1920, 960, 'G'],
      [2880, 960, 'A'],
      [3840, 1920, 'Bm'],
      [5760, 960, 'G'],
      [6720, 960, 'A7'],
    ])
  })

  it('admite repetición, tramos sin acorde y huecos', () => {
    const r = leerAcordes('C:1 | % | -:2 G:2 | ?:1', [4, 4])
    expect(r.acordes.map((a) => a.simbolo)).toEqual(['C', 'C', 'G'])
    expect(r.huecos).toEqual([{ t: 5760, d: 1920 }])
    expect(r.compases).toBe(4)
  })

  it('rechaza acordes desconocidos y compases mal medidos', () => {
    expect(() => leerAcordes('Hm:1', [4, 4])).toThrow(/Acorde no reconocido/)
    expect(() => leerAcordes('C:2 | G:1', [4, 4])).toThrow(/compás 1 de acordes dura 960/)
    expect(() => leerAcordes('C', [4, 4])).toThrow(/acorde:figura/)
  })
})
