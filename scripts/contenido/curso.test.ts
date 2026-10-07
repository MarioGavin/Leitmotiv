import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { LECCIONES_POR_UNIDAD, compilarCurso } from './curso.ts'
import { ESQUEMAS, generar } from './esquemas-json.ts'

const RAIZ = path.resolve(import.meta.dirname, '../..')

const LECCION = `titulo: Una lección
resumen: Para probar.
minutos: 6
conceptos: [pulso]
pasos:
  - tipo: teoria
    texto: El [[pulso]] es regular.
    ejemplo:
      tempo: 90
      compases: 1
      pistas:
        - rol: percusion
          instrumento: bateria
          notas: "bombo:4 bombo:4 bombo:4 bombo:4"
  - tipo: ritmo
    modo: seguir
    enunciado: Marca el pulso.
    pista: Cuenta hasta cuatro.
    explicacion: El pulso es regular.
    tempo: 90
    paso: "4"
    patron: "xxxx"
  - tipo: ritmo
    modo: eco
    enunciado: Repite.
    pista: Escucha primero.
    explicacion: Igual que antes.
    tempo: 90
    paso: "4"
    patron: "x.x."
`

const ENCARGO = `  - tipo: encargo
    titulo: Patrón de menú
    brief: Cuatro compases de percusión en bucle.
    pista: Empieza por el bombo.
    explicacion: Un patrón que cierra se puede repetir sin cansar.
    requisitos:
      - {regla: compases, valor: 4}
      - {regla: bucle}
      - {regla: pistas, roles: [percusion]}
`

const carpetas: string[] = []

/** Crea un curso mínimo en una carpeta temporal. `archivos` añade o sustituye ficheros. */
function curso(archivos: Record<string, string>): string {
  const raiz = mkdtempSync(path.join(tmpdir(), 'leitmotiv-'))
  carpetas.push(raiz)
  const base: Record<string, string> = {
    'conceptos.yaml': 'pulso:\n  nombre: Pulso\n  definicion: El latido regular.\n',
    'glosario.yaml': 'pulso:\n  termino: Pulso\n  definicion: Latido regular.\n',
    'mundos/m00-repaso/mundo.yaml': 'titulo: Repaso\nlema: Lo imprescindible.\ndescripcion: Para empezar.\n',
    'mundos/m00-repaso/u01-pulso/unidad.yaml': 'titulo: Pulso\nobjetivo: Llevar el pulso.\nestado: borrador\n',
    'mundos/m00-repaso/u01-pulso/l01-uno.yaml': LECCION,
    ...archivos,
  }
  for (const [nombre, contenido] of Object.entries(base)) {
    const destino = path.join(raiz, nombre)
    mkdirSync(path.dirname(destino), { recursive: true })
    writeFileSync(destino, contenido)
  }
  return raiz
}

afterEach(() => {
  for (const c of carpetas.splice(0)) rmSync(c, { recursive: true, force: true })
})

const errores = (raiz: string): string[] => compilarCurso(raiz).hallazgos.filter((h) => h.nivel === 'error').map((h) => h.codigo)

describe('el contenido del repositorio', () => {
  const real = compilarCurso(path.join(RAIZ, 'content'))

  it('compila sin errores', () => {
    expect(real.hallazgos.filter((h) => h.nivel === 'error').map((h) => `${h.donde}: ${h.mensaje}`)).toEqual([])
  })

  it('tiene los once mundos del plan de estudios, en orden', () => {
    expect(real.indice.mundos.map((m) => m.id)).toEqual(['m00', 'm01', 'm02', 'm03', 'm04', 'm05', 'm06', 'm07', 'm08', 'm09', 'm10'])
  })

  it('cada lección tiene un identificador único con la forma mNN.uNN.lNN', () => {
    const ids = real.lecciones.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^m\d{2}\.u\d{2}\.l\d{2}$/)
  })

  it('los JSON Schema para el editor están al día con los esquemas', () => {
    for (const nombre of Object.keys(ESQUEMAS) as Array<keyof typeof ESQUEMAS>) {
      const enDisco = readFileSync(path.join(RAIZ, 'content/.esquemas', `${nombre}.schema.json`), 'utf8')
      expect(enDisco, `${nombre}: ejecuta «npm run content:schemas»`).toBe(generar(nombre))
    }
  })
})

describe('compilarCurso', () => {
  it('compila un curso mínimo y construye el índice', () => {
    const c = compilarCurso(curso({}))
    expect(c.hallazgos).toEqual([])
    expect(c.indice.mundos).toHaveLength(1)
    expect(c.indice.mundos[0]?.unidades[0]).toMatchObject({ id: 'm00.u01', borrador: true })
    expect(c.indice.mundos[0]?.unidades[0]?.lecciones[0]).toMatchObject({ id: 'm00.u01.l01', pasos: ['teoria', 'ritmo', 'ritmo'], encargo: false })
    expect(c.lecciones[0]?.pasos).toHaveLength(3)
    expect(c.indice.version).toMatch(/^[0-9a-f]{12}$/)
  })

  it('apunta en cada concepto los ejercicios que lo entrenan, contando los pasos desde 1', () => {
    const c = compilarCurso(curso({}))
    // La lección es teoría, ritmo y ritmo: los ejercicios son los pasos 2 y 3, los mismos números que en la dirección #/leccion/m00.u01.l01/2.
    expect(c.conceptos).toEqual([expect.objectContaining({ id: 'pulso', pasos: ['m00.u01.l01#2', 'm00.u01.l01#3'] })])
    const tipos = c.indice.mundos[0]?.unidades[0]?.lecciones[0]?.pasos ?? []
    for (const paso of c.conceptos[0]?.pasos ?? []) expect(tipos[Number(paso.split('#')[1]) - 1]).toBe('ritmo')
  })

  it('la versión cambia cuando cambia el contenido', () => {
    const a = compilarCurso(curso({})).indice.version
    const b = compilarCurso(curso({ 'mundos/m00-repaso/u01-pulso/l01-uno.yaml': LECCION.replace('Marca el pulso.', 'Marca cada pulso.') })).indice.version
    expect(a).not.toBe(b)
  })

  it(`una unidad publicada necesita ${LECCIONES_POR_UNIDAD} lecciones y acabar en un encargo`, () => {
    const publicada = 'titulo: Pulso\nobjetivo: Llevar el pulso.\n'
    expect(errores(curso({ 'mundos/m00-repaso/u01-pulso/unidad.yaml': publicada }))).toEqual(['unidad-corta', 'unidad-sin-encargo'])
    const ocho: Record<string, string> = { 'mundos/m00-repaso/u01-pulso/unidad.yaml': publicada }
    for (let i = 1; i <= 8; i++) ocho[`mundos/m00-repaso/u01-pulso/l0${i}-x.yaml`] = LECCION
    delete ocho['mundos/m00-repaso/u01-pulso/l01-x.yaml']
    expect(errores(curso(ocho))).toEqual(['unidad-sin-encargo'])
    ocho['mundos/m00-repaso/u01-pulso/l08-x.yaml'] = `${LECCION}${ENCARGO}`
    expect(errores(curso(ocho))).toEqual([])
  })

  it('el encargo debe ser el último paso y único', () => {
    const enMedio = LECCION.replace('  - tipo: ritmo\n    modo: eco', `${ENCARGO}  - tipo: ritmo\n    modo: eco`)
    expect(errores(curso({ 'mundos/m00-repaso/u01-pulso/l01-uno.yaml': enMedio }))).toEqual(['encargo-no-final'])
    expect(errores(curso({ 'mundos/m00-repaso/u01-pulso/l01-uno.yaml': `${LECCION}${ENCARGO}${ENCARGO}` }))).toEqual(['varios-encargos'])
  })

  it('una lección necesita al menos un ejercicio', () => {
    const soloTeoria = `titulo: T\nresumen: R\nminutos: 6\nconceptos: [pulso]\npasos:\n${'  - {tipo: teoria, texto: Hola., sinEjemplo: Prueba.}\n'.repeat(3)}`
    const c = compilarCurso(curso({ 'mundos/m00-repaso/u01-pulso/l01-uno.yaml': soloTeoria }))
    expect(c.hallazgos.map((h) => h.codigo)).toEqual(['demasiada-teoria', 'leccion-sin-ejercicios', 'concepto-sin-practica'])
  })

  it('avisa si la duración se sale de los 5–10 minutos', () => {
    const c = compilarCurso(curso({ 'mundos/m00-repaso/u01-pulso/l01-uno.yaml': LECCION.replace('minutos: 6', 'minutos: 12') }))
    expect(c.hallazgos.map((h) => [h.nivel, h.codigo])).toEqual([['aviso', 'duracion-fuera']])
  })

  it('los conceptos y los términos del glosario deben existir', () => {
    expect(errores(curso({ 'mundos/m00-repaso/u01-pulso/l01-uno.yaml': LECCION.replace('conceptos: [pulso]', 'conceptos: [swing]') }))).toContain('concepto-desconocido')
    const c = compilarCurso(curso({ 'mundos/m00-repaso/u01-pulso/l01-uno.yaml': LECCION.replace('[[pulso]]', '[[contratiempo]]') }))
    expect(c.hallazgos.map((h) => h.codigo)).toEqual(['texto-no-valido'])
    expect(c.hallazgos[0]?.donde).toBe('mundos/m00-repaso/u01-pulso/l01-uno.yaml › pasos[0] (teoria) › texto')
    expect(errores(curso({ 'glosario.yaml': 'pulso:\n  termino: Pulso\n  definicion: Latido.\n  ver: [tempo]\n' }))).toEqual(['termino-desconocido'])
  })

  it('informa de los fallos de esquema con la ruta del campo', () => {
    const c = compilarCurso(curso({ 'mundos/m00-repaso/u01-pulso/l01-uno.yaml': LECCION.replace('tempo: 90\n    paso: "4"\n    patron: "xxxx"', 'tempo: 900\n    paso: "4"\n    patron: "xxxx"') }))
    const fallos = c.hallazgos.filter((h) => h.nivel === 'error')
    expect(fallos).toHaveLength(1)
    expect(fallos[0]).toMatchObject({ codigo: 'esquema', donde: 'mundos/m00-repaso/u01-pulso/l01-uno.yaml › pasos[1].tempo' })
    expect(fallos[0]?.mensaje).toMatch(/200/)
  })

  it('informa de un YAML roto sin detener el resto', () => {
    const c = compilarCurso(curso({ 'mundos/m00-repaso/u01-pulso/l02-rota.yaml': 'titulo: [sin cerrar\n' }))
    expect(c.hallazgos.map((h) => h.codigo)).toEqual(['yaml-no-valido'])
    expect(c.lecciones).toHaveLength(1)
  })

  it('exige mundo.yaml, unidad.yaml y conceptos.yaml', () => {
    const raiz = curso({})
    rmSync(path.join(raiz, 'mundos/m00-repaso/u01-pulso/unidad.yaml'))
    rmSync(path.join(raiz, 'conceptos.yaml'))
    expect(new Set(errores(raiz))).toEqual(new Set(['falta-archivo']))
  })

  it('ignora carpetas y archivos que no siguen la nomenclatura', () => {
    const c = compilarCurso(curso({ 'mundos/borradores/mundo.yaml': 'x: 1\n', 'mundos/m00-repaso/u01-pulso/notas.yaml': 'x: 1\n' }))
    expect(c.hallazgos).toEqual([])
    expect(c.lecciones).toHaveLength(1)
  })

  it('compila la prueba de nivel y exige que cada paso diga su concepto', () => {
    const paso = (concepto: string): string => `      - tipo: ritmo\n        modo: seguir\n        enunciado: Marca.\n        pista: Cuenta.\n        explicacion: Regular.\n${concepto}        tempo: 90\n        paso: "4"\n        patron: "xxxx"\n`
    const prueba = `- unidad: m00.u01\n  pasos:\n${paso('        concepto: pulso\n')}${paso('        concepto: pulso\n')}`
    const c = compilarCurso(curso({ 'prueba-de-nivel.yaml': prueba }))
    expect(c.hallazgos).toEqual([])
    expect(c.prueba).toEqual([expect.objectContaining({ unidad: 'm00.u01', aprobado: 0.8 })])
    expect(c.prueba[0]?.pasos).toHaveLength(2)
    expect(errores(curso({ 'prueba-de-nivel.yaml': `- unidad: m00.u01\n  pasos:\n${paso('')}${paso('        concepto: pulso\n')}` }))).toEqual(['paso-sin-concepto'])
    expect(errores(curso({ 'prueba-de-nivel.yaml': prueba.replace('m00.u01', 'm09.u09') }))).toEqual(['unidad-desconocida'])
  })
})
