import { describe, expect, it } from 'vitest'
import YAML from 'yaml'
import { Paso as EsquemaDePaso } from '../../src/contenido/esquemas.ts'
import type { Paso } from '../../src/contenido/tipos.ts'
import { Contexto, type Entorno } from './contexto.ts'
import { compilarPaso } from './pasos.ts'

/** Valida un paso escrito en YAML contra el esquema y lo compila. */
function compilar(yaml: string): { paso: Paso | undefined; errores: string[]; avisos: string[]; mensajes: string[] } {
  const entorno: Entorno = { hallazgos: [], conceptos: new Set(['pulso', 'intervalos']), glosario: new Map([['pulso', 'Pulso']]) }
  const leido = EsquemaDePaso.safeParse(YAML.parse(yaml))
  if (!leido.success) {
    return { paso: undefined, errores: ['esquema'], avisos: [], mensajes: leido.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) }
  }
  const paso = compilarPaso(leido.data, new Contexto(entorno, 'prueba'), 'pulso')
  return {
    paso,
    errores: entorno.hallazgos.filter((h) => h.nivel === 'error').map((h) => h.codigo),
    avisos: entorno.hallazgos.filter((h) => h.nivel === 'aviso').map((h) => h.codigo),
    mensajes: entorno.hallazgos.map((h) => `${h.donde}: ${h.mensaje}`),
  }
}

const ejercicio = `
enunciado: Haz lo que se pide.
pista: Una ayuda.
explicacion: El porqué.
`

const melodia = `
  tempo: 100
  tonalidad: D mayor
  compases: 2
  acordes: "D:1 | G:2 A:2"
  pistas:
    - rol: melodia
      instrumento: piano
      notas: "A4:4 D5:4 F#5:4. E5:8 | D5:4 B4:4 A4:2"
    - rol: armonia
      instrumento: cuerdas
      notas: "[D3 F#3 A3]:1 | [G3 B3 D4]:2 [A3 C#4 E4]:2"
`

describe('teoría', () => {
  it('compila el texto y el ejemplo', () => {
    const r = compilar(`tipo: teoria\ntexto: El [[pulso]] es regular.\nejemplo:${melodia}`)
    expect(r.errores).toEqual([])
    expect(r.paso?.tipo).toBe('teoria')
    if (r.paso?.tipo !== 'teoria') return
    expect(r.paso.ejemplo?.pistas[0]?.notas).toHaveLength(7)
    expect(r.paso.ejemplo?.tonalidad).toBe('D mayor')
    expect(r.paso.manipulable).toEqual(['tempo'])
    expect(r.paso.vista).toBe('pianoroll')
  })

  it('exige ejemplo o una justificación', () => {
    expect(compilar('tipo: teoria\ntexto: Sin sonido.').errores).toEqual(['teoria-sin-ejemplo'])
    expect(compilar('tipo: teoria\ntexto: Sin sonido.\nsinEjemplo: Habla de contratos.').errores).toEqual([])
  })

  it('propaga los fallos musicales del ejemplo', () => {
    const r = compilar(`tipo: teoria\ntexto: Hola.\nejemplo:${melodia.replace('F#5:4.', 'F5:4.')}`)
    expect(r.errores).toEqual(['fuera-de-tonalidad'])
    expect(r.mensajes[0]).toMatch(/prueba › ejemplo: La pista «melodia» toca Fa5/)
  })

  it('detecta un compás mal medido y dice en qué pista', () => {
    const r = compilar(`tipo: teoria\ntexto: Hola.\nejemplo:${melodia.replace('A4:2"', 'A4:4"')}`)
    expect(r.errores).toEqual(['notas-no-validas'])
    expect(r.mensajes[0]).toMatch(/pistas\[0\] \(melodia\): El compás 2 está mal medido/)
  })

  it('detecta que una pista no tiene los compases que declara la pieza', () => {
    const r = compilar(`tipo: teoria\ntexto: Hola.\nejemplo:${melodia.replace('compases: 2', 'compases: 3')}`)
    expect(r.errores).toEqual(['compases-no-coinciden', 'compases-no-coinciden', 'compases-no-coinciden'])
  })

  it('rechaza campos desconocidos en el esquema', () => {
    expect(compilar('tipo: teoria\ntexto: Hola.\ncolor: rojo').errores).toEqual(['esquema'])
  })

  it('con vista de pentagrama, el ejemplo tiene que poder escribirse', () => {
    expect(compilar(`tipo: teoria\ntexto: Hola.\nvista: pentagrama\nejemplo:${melodia}`).errores).toEqual([])
    const fusasDeTresillo = `
  tempo: 100
  compases: 1
  pistas:
    - rol: melodia
      instrumento: piano
      notas: "C4:32t D4:32t E4:32t r:16 r:8 r:4 r:2"
`
    const r = compilar(`tipo: teoria\ntexto: Hola.\nvista: pentagrama\nejemplo:${fusasDeTresillo}`)
    expect(r.errores).toEqual(['pentagrama-imposible'])
    expect(r.mensajes[0]).toMatch(/prueba › ejemplo: En el compás 1 hay una figura que el pentagrama no sabe escribir\./)
    // Con otra vista, la misma pieza vale.
    expect(compilar(`tipo: teoria\ntexto: Hola.\nejemplo:${fusasDeTresillo}`).errores).toEqual([])
  })
})

describe('oído', () => {
  it('intervalos: normaliza los nombres y aplica los valores por defecto', () => {
    const r = compilar(`tipo: oido\nmodo: intervalo\n${ejercicio}intervalos: [3m, 3M, 5J]`)
    expect(r.errores).toEqual([])
    expect(r.paso).toMatchObject({ tipo: 'oido', modo: 'intervalo', intervalos: ['3m', '3M', '5P'], direcciones: ['ascendente'], registro: [48, 72], instrumento: 'piano', rondas: 5, concepto: 'pulso' })
  })

  it('intervalos: comprueba que caben en el instrumento', () => {
    const r = compilar(`tipo: oido\nmodo: intervalo\n${ejercicio}intervalos: [5J, 8J]\ninstrumento: bajo-electrico\nregistro: [E1, G4]`)
    expect(r.errores).toEqual(['registro-fuera-de-rango'])
  })

  it('intervalos: rechaza repetidos, registros invertidos y percusión', () => {
    expect(compilar(`tipo: oido\nmodo: intervalo\n${ejercicio}intervalos: [5J, 5P]`).errores).toEqual(['opciones-repetidas'])
    expect(compilar(`tipo: oido\nmodo: intervalo\n${ejercicio}intervalos: [3m, 3M]\nregistro: [C5, C3]`).errores).toContain('registro-no-valido')
    expect(compilar(`tipo: oido\nmodo: intervalo\n${ejercicio}intervalos: [3m, 3M]\ninstrumento: bateria`).errores).toEqual(['instrumento-sin-afinar'])
  })

  it('usa el concepto indicado y comprueba que existe', () => {
    expect(compilar(`tipo: oido\nmodo: intervalo\n${ejercicio}intervalos: [3m, 3M]\nconcepto: intervalos`).paso).toMatchObject({ concepto: 'intervalos' })
    expect(compilar(`tipo: oido\nmodo: intervalo\n${ejercicio}intervalos: [3m, 3M]\nconcepto: inventado`).errores).toEqual(['concepto-desconocido'])
  })

  it('acordes: comprueba los tipos con Tonal', () => {
    expect(compilar(`tipo: oido\nmodo: acorde\n${ejercicio}calidades: [M, m, dim, maj7]`).errores).toEqual([])
    expect(compilar(`tipo: oido\nmodo: acorde\n${ejercicio}calidades: [M, raro]`).errores).toEqual(['acorde-desconocido'])
  })

  it('progresiones: valida cada grado en cada tonalidad', () => {
    const r = compilar(`tipo: oido\nmodo: progresion\n${ejercicio}tonalidades: [C mayor, G mayor]\nprogresiones: ["I IV V I", "I V vi IV"]`)
    expect(r.errores).toEqual([])
    expect(r.paso).toMatchObject({ progresiones: [['I', 'IV', 'V', 'I'], ['I', 'V', 'vi', 'IV']], tempo: 84 })
    expect(compilar(`tipo: oido\nmodo: progresion\n${ejercicio}tonalidades: [C mayor]\nprogresiones: ["I IV V I", "I Vx I"]`).errores).toEqual(['grado-no-valido'])
  })

  it('escalas: normaliza los nombres de modo', () => {
    const r = compilar(`tipo: oido\nmodo: escala\n${ejercicio}escalas: [mayor, menor, dorico]`)
    expect(r.errores).toEqual([])
    expect(r.paso).toMatchObject({ escalas: ['mayor', 'menor', 'dórico'] })
    expect(compilar(`tipo: oido\nmodo: escala\n${ejercicio}escalas: [mayor, alegre]`).errores).toEqual(['escala-no-valida'])
  })

  it('timbre: la frase debe caber en todos los instrumentos', () => {
    expect(compilar(`tipo: oido\nmodo: timbre\n${ejercicio}instrumentos: [piano, cuerdas, chip-pulso]\nfrase: "C4:4 E4:4 G4:2"`).errores).toEqual([])
    expect(compilar(`tipo: oido\nmodo: timbre\n${ejercicio}instrumentos: [piano, bateria]\nfrase: "C4:1"`).errores).toEqual(['instrumento-sin-afinar'])
    expect(compilar(`tipo: oido\nmodo: timbre\n${ejercicio}instrumentos: [piano, bajo-electrico]\nfrase: "C1:2 C7:2"`).errores).toEqual(['frase-fuera-de-rango'])
  })

  it('contorno y compás', () => {
    expect(compilar(`tipo: oido\nmodo: contorno\n${ejercicio}intervalos: [2M, 3M, 5J]\nincluirIgual: true`).errores).toEqual([])
    const r = compilar(`tipo: oido\nmodo: compas\n${ejercicio}compases: ["4/4", "3/4", "6/8"]`)
    expect(r.paso).toMatchObject({ compases: [[4, 4], [3, 4], [6, 8]], tempo: 100 })
    expect(compilar(`tipo: oido\nmodo: compas\n${ejercicio}compases: ["4/4", "4/4"]`).errores).toEqual(['opciones-repetidas'])
  })

  it('preguntas: convierte la opción correcta a índice desde cero', () => {
    const yaml = `tipo: oido\nmodo: preguntas\n${ejercicio}preguntas:\n  - opciones: [Reposo, Tensión]\n    correcta: 1\n    pieza:${melodia.replace(/^/gm, '    ')}`
    const r = compilar(yaml)
    expect(r.errores).toEqual([])
    expect(r.paso?.tipo === 'oido' && r.paso.modo === 'preguntas' && r.paso.preguntas[0]?.correcta).toBe(0)
    expect(compilar(yaml.replace('correcta: 1', 'correcta: 3')).errores).toEqual(['correcta-fuera'])
  })
})

describe('ritmo', () => {
  it('compila el patrón a instantes en ticks', () => {
    const r = compilar(`tipo: ritmo\nmodo: seguir\n${ejercicio}tempo: 90\npatron: "x...x...x.x.x..."`)
    expect(r.errores).toEqual([])
    expect(r.paso).toMatchObject({ golpes: [0, 480, 960, 1200, 1440], duracion: 1920, paso: 120, compas: [4, 4], cuentaAtras: 1, repeticiones: 2, tolerancia: 'normal' })
  })

  it('rechaza patrones que no ocupan compases enteros', () => {
    expect(compilar(`tipo: ritmo\nmodo: eco\n${ejercicio}tempo: 90\ncompas: 3/4\npatron: "x...x...x...x..."`).errores).toEqual(['patron-no-valido'])
  })
})

describe('construcción', () => {
  const conHueco = melodia.replace('F#5:4. E5:8', '?:2')

  it('completar melodía: sitúa las opciones en el hueco', () => {
    const r = compilar(
      `tipo: construccion\nmodo: completar-melodia\n${ejercicio}pieza:${conHueco}opciones:\n  - notas: "F#5:4. E5:8"\n    correcta: true\n    porque: Sube a la tercera.\n  - notas: "F5:2"\n    correcta: false\n    porque: Fa natural no es de la escala.`,
    )
    expect(r.errores).toEqual([])
    if (r.paso?.tipo !== 'construccion' || r.paso.modo !== 'completar-melodia') throw new Error('tipo inesperado')
    expect(r.paso.hueco).toEqual({ t: 960, d: 960, pista: 'melodia' })
    expect(r.paso.opciones[0]?.notas.map((n) => n.t)).toEqual([960, 1680])
    expect(r.paso.pieza.pistas[0]?.notas).toHaveLength(5)
  })

  it('completar melodía: las opciones deben medir lo que el hueco', () => {
    const r = compilar(
      `tipo: construccion\nmodo: completar-melodia\n${ejercicio}pieza:${conHueco}opciones:\n  - notas: "F#5:4"\n    correcta: true\n    porque: a\n  - notas: "E5:2"\n    correcta: false\n    porque: b`,
    )
    expect(r.errores).toEqual(['opcion-mal-medida'])
  })

  it('completar melodía: exige un único hueco, una correcta y una incorrecta', () => {
    const sinHueco = `tipo: construccion\nmodo: completar-melodia\n${ejercicio}pieza:${melodia}opciones:\n  - notas: "E5:2"\n    correcta: true\n    porque: a\n  - notas: "D5:2"\n    correcta: false\n    porque: b`
    expect(compilar(sinHueco).errores).toEqual(['hueco-unico'])
    const todasCorrectas = `tipo: construccion\nmodo: completar-melodia\n${ejercicio}pieza:${conHueco}opciones:\n  - notas: "E5:2"\n    correcta: true\n    porque: a\n  - notas: "D5:2"\n    correcta: true\n    porque: b`
    expect(compilar(todasCorrectas).errores).toEqual(['sin-opcion-incorrecta'])
  })

  it('completar melodía: la opción correcta no puede salirse de la tonalidad', () => {
    const r = compilar(
      `tipo: construccion\nmodo: completar-melodia\n${ejercicio}pieza:${conHueco}opciones:\n  - notas: "F5:2"\n    correcta: true\n    porque: a\n  - notas: "E5:2"\n    correcta: false\n    porque: b`,
    )
    expect(r.errores).toEqual(['correcta-fuera-de-tonalidad'])
  })

  it('elegir acorde: localiza el hueco en la línea de acordes', () => {
    const pieza = melodia.replace('"D:1 | G:2 A:2"', '"D:1 | ?:2 A:2"').replace(/    - rol: armonia[\s\S]*$/, '')
    const r = compilar(
      `tipo: construccion\nmodo: elegir-acorde\n${ejercicio}pieza:${pieza}opciones:\n  - acorde: G\n    correcta: true\n    porque: Contiene el Re de la melodía.\n  - acorde: C\n    correcta: false\n    porque: Do natural no es de Re mayor.`,
    )
    expect(r.errores).toEqual([])
    expect(r.avisos).toEqual([])
    expect(r.paso).toMatchObject({ hueco: { t: 1920, d: 960 }, opciones: [{ acorde: 'G', correcta: true }, { acorde: 'C', correcta: false }] })
    const mal = compilar(
      `tipo: construccion\nmodo: elegir-acorde\n${ejercicio}pieza:${pieza}opciones:\n  - acorde: A\n    correcta: true\n    porque: a\n  - acorde: C\n    correcta: false\n    porque: b`,
    )
    expect(mal.avisos).toEqual(['correcta-sin-nota-de-melodia'])
  })

  it('ordenar secciones: pide al menos tres que cubran la pieza', () => {
    const base = `tipo: construccion\nmodo: ordenar-secciones\n${ejercicio}pieza:\n  tempo: 100\n  compases: 4\n  pistas:\n    - rol: melodia\n      instrumento: piano\n      notas: "C4:1 | D4:1 | E4:1 | C4:1"\n  secciones:\n`
    expect(compilar(`${base}    - {id: A1, desde: 1, hasta: 1}\n    - {id: A2, desde: 2, hasta: 2}\n    - {id: B, desde: 3, hasta: 3}\n    - {id: A3, desde: 4, hasta: 4}`).errores).toEqual([])
    expect(compilar(`${base}    - {id: A, desde: 1, hasta: 2}\n    - {id: B, desde: 3, hasta: 4}`).errores).toEqual(['pocas-secciones'])
    expect(compilar(`${base}    - {id: A, desde: 1, hasta: 1}\n    - {id: B, desde: 2, hasta: 2}\n    - {id: C, desde: 3, hasta: 3}`).errores).toEqual(['secciones-incompletas'])
  })
})

const requisitos = `
requisitos:
  - {regla: tonalidad, valores: [C mayor]}
  - {regla: compases, valor: 4}
  - {regla: rango, pista: melodia, min: C4, max: G5}
  - {regla: bucle}
`

describe('piano roll', () => {
  const plantilla = `plantilla:\n  tempo: 110\n  tonalidad: C mayor\n  compases: 4\n  pistas:\n    - rol: melodia\n      instrumento: piano\n      notas: ""\n    - rol: bajo\n      instrumento: bajo-electrico\n      notas: "C2:1 | F2:1 | G2:1 | C2:1"\n`

  it('admite pistas vacías en la plantilla y compila los requisitos', () => {
    const r = compilar(`tipo: pianoroll\n${ejercicio}${plantilla}editables: [melodia]${requisitos}`)
    expect(r.errores).toEqual([])
    expect(r.paso).toMatchObject({
      editables: ['melodia'],
      requisitos: [
        { regla: 'tonalidad', valores: ['C mayor'], minimo: 0.9 },
        { regla: 'compases', valor: 4 },
        { regla: 'rango', pista: 'melodia', min: 60, max: 79 },
        { regla: 'bucle' },
      ],
    })
  })

  it('las pistas editables deben existir', () => {
    expect(compilar(`tipo: pianoroll\n${ejercicio}${plantilla}editables: [flauta]${requisitos}`).errores).toEqual(['pista-inexistente'])
  })

  it('fuera de las plantillas, una pista vacía es un error', () => {
    const r = compilar(`tipo: teoria\ntexto: Hola.\nejemplo:\n  tempo: 100\n  compases: 1\n  pistas:\n    - rol: melodia\n      instrumento: piano\n      notas: ""`)
    expect(r.errores).toEqual(['pista-vacia'])
  })
})

describe('requisitos', () => {
  const encargo = (reqs: string): string => `tipo: encargo\ntitulo: Tema de tienda\nbrief: Ocho compases alegres.\npista: Empieza por el bajo.\nexplicacion: Un bucle que cierra.\nrequisitos:\n${reqs}`

  it('detecta reglas incoherentes', () => {
    expect(compilar(encargo('  - {regla: tempo, min: 140, max: 100}\n  - {regla: bucle}\n  - {regla: compases, valor: 8}')).errores).toEqual(['tempo-no-valido'])
    expect(compilar(encargo('  - {regla: rango, pista: melodia, min: G5, max: C4}\n  - {regla: bucle}\n  - {regla: compases, valor: 8}')).errores).toEqual(['rango-no-valido'])
    expect(compilar(encargo('  - {regla: densidad, pista: melodia}\n  - {regla: bucle}\n  - {regla: compases, valor: 8}')).errores).toEqual(['densidad-sin-limites'])
    expect(compilar(encargo('  - {regla: bucle}\n  - {regla: bucle}\n  - {regla: compases, valor: 8}')).errores).toEqual(['requisito-repetido'])
  })

  it('la estructura debe cuadrar con el número de compases', () => {
    expect(compilar(encargo('  - {regla: estructura, forma: AABA, compasesPorSeccion: 2}\n  - {regla: compases, valor: 8}\n  - {regla: bucle}')).errores).toEqual([])
    expect(compilar(encargo('  - {regla: estructura, forma: AABA, compasesPorSeccion: 4}\n  - {regla: compases, valor: 8}\n  - {regla: bucle}')).errores).toEqual(['estructura-no-cuadra'])
  })

  it('un encargo necesita al menos tres requisitos', () => {
    expect(compilar(encargo('  - {regla: bucle}')).errores).toEqual(['esquema'])
  })

  it('la plantilla debe cuadrar con lo que pide el encargo', () => {
    const conPlantilla = `${encargo('  - {regla: compases, valor: 8}\n  - {regla: bucle}\n  - {regla: tempo, min: 100, max: 132}')}\nplantilla:\n  tempo: 110\n  compases: 4\n  pistas:\n    - rol: melodia\n      instrumento: piano\n      notas: ""`
    expect(compilar(conPlantilla).errores).toEqual(['plantilla-no-cuadra'])
  })
})

describe('análisis', () => {
  const pieza = `pieza:\n  tempo: 100\n  compas: 3/4\n  tonalidad: C mayor\n  compases: 4\n  acordes: "C:2. | F:2. | G7:2. | C:2."\n  secciones:\n    - {id: A, desde: 1, hasta: 2}\n    - {id: B, desde: 3, hasta: 4}\n  pistas:\n    - rol: melodia\n      instrumento: piano\n      notas: "E4:2. | F4:2. | D4:2. | C4:2."\n`

  it('calcula las respuestas correctas a partir de la pieza', () => {
    const r = compilar(
      `tipo: analisis\n${ejercicio}${pieza}preguntas:\n  - {sobre: tonalidad, opciones: [G mayor, C mayor, A menor]}\n  - {sobre: compas, opciones: ["4/4", "3/4"]}\n  - {sobre: forma, opciones: [AB, AA, ABA]}\n  - {sobre: funcion, compas: 3}\n  - {sobre: acorde, compas: 2, opciones: [C, F, G]}\n  - {sobre: libre, pregunta: ¿Cómo termina?, opciones: [En reposo, En tensión], correcta: 1, explicacion: Acaba en la tónica.}`,
    )
    expect(r.errores).toEqual([])
    if (r.paso?.tipo !== 'analisis') throw new Error('tipo inesperado')
    expect(r.paso.preguntas.map((p) => [p.sobre, p.correcta])).toEqual([
      ['tonalidad', 1],
      ['compas', 1],
      ['forma', 0],
      ['funcion', 2],
      ['acorde', 1],
      ['libre', 0],
    ])
    expect(r.paso.preguntas[3]?.compas).toBe(3)
  })

  it('falla si la respuesta correcta no está entre las opciones', () => {
    const r = compilar(`tipo: analisis\n${ejercicio}${pieza}preguntas:\n  - {sobre: tonalidad, opciones: [G mayor, A menor]}`)
    expect(r.errores).toEqual(['correcta-ausente'])
    expect(r.mensajes[0]).toMatch(/La respuesta correcta según la pieza es «C mayor»/)
  })

  it('falla si faltan los datos para calcular la respuesta', () => {
    const sinTonalidad = pieza.replace('  tonalidad: C mayor\n', '')
    expect(compilar(`tipo: analisis\n${ejercicio}${sinTonalidad}preguntas:\n  - {sobre: tonalidad, opciones: [G mayor, C mayor]}`).errores).toEqual(['pieza-sin-tonalidad'])
    expect(compilar(`tipo: analisis\n${ejercicio}${pieza}preguntas:\n  - {sobre: acorde, compas: 9, opciones: [C, F]}`).errores).toEqual(['compas-sin-acorde'])
  })
})

describe('capas', () => {
  const pieza = `pieza:\n  tempo: 96\n  tonalidad: A menor\n  compases: 2\n  bucle: true\n  pistas:\n    - rol: colchon\n      instrumento: cuerdas\n      capa: base\n      notas: "[A2 E3 A3]:1 | [F2 C3 F3]:1"\n    - rol: percusion\n      instrumento: bateria\n      capa: ritmo\n      rejilla: {paso: "8", lineas: {bombo: "x...x...", caja: "..x...x."}}\n`
  const resto = `capas: {base: Colchón de cuerdas, ritmo: Batería}\nestados:\n  - {id: exploracion, nombre: Exploración, capas: [base]}\n  - {id: combate, nombre: Combate, capas: [base, ritmo]}\nsituaciones:\n  - {texto: Aparece un enemigo., estado: combate, porque: La percusión sube la energía.}\n`

  it('compila capas, estados y situaciones', () => {
    const r = compilar(`tipo: capas\n${ejercicio}${pieza}${resto}`)
    expect(r.errores).toEqual([])
    expect(r.paso).toMatchObject({ transicion: { cuando: 'compas', fundido: 0.5 }, estados: [{ id: 'exploracion', capas: ['base'] }, { id: 'combate', capas: ['base', 'ritmo'] }] })
  })

  it('comprueba que capas, estados y situaciones encajan', () => {
    expect(compilar(`tipo: capas\n${ejercicio}${pieza.replace('  bucle: true\n', '')}${resto}`).errores).toEqual(['capas-sin-bucle'])
    expect(compilar(`tipo: capas\n${ejercicio}${pieza}${resto.replace('capas: [base, ritmo]}', 'capas: [base, metales]}')}`).errores).toEqual(['capa-inexistente'])
    expect(compilar(`tipo: capas\n${ejercicio}${pieza}${resto.replace('estado: combate', 'estado: sigilo')}`).errores).toEqual(['estado-inexistente'])
    expect(compilar(`tipo: capas\n${ejercicio}${pieza.replace('      capa: ritmo\n', '')}${resto}`).errores).toEqual(['pista-sin-capa', 'capa-sin-pistas', 'capa-inexistente'])
  })
})

describe('encargo', () => {
  it('compila el brief y los requisitos', () => {
    const r = compilar(
      `tipo: encargo\ntitulo: Tema de tienda\ncliente: Estudio Lúmina\nbrief: |\n  Necesitamos un bucle **alegre** de ocho compases.\npista: Empieza por el bajo.\nexplicacion: Un bucle que cierra invita a quedarse.\nrequisitos:\n  - {regla: tonalidad, valores: [C mayor, G mayor]}\n  - {regla: compases, valor: 8}\n  - {regla: tempo, min: 100, max: 132}\n  - {regla: bucle}\n  - {regla: densidad, pista: melodia, min: 2, max: 8}\n  - {regla: pistas, roles: [melodia, bajo]}`,
    )
    expect(r.errores).toEqual([])
    expect(r.paso).toMatchObject({ tipo: 'encargo', titulo: 'Tema de tienda', cliente: 'Estudio Lúmina', concepto: 'pulso' })
    expect(r.paso?.tipo === 'encargo' && r.paso.requisitos).toHaveLength(6)
  })
})
