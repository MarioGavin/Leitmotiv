import YAML from 'yaml'
import { compilarPaso } from '../scripts/contenido/pasos.ts'
import { compilarPieza } from '../scripts/contenido/pieza.ts'
import { Contexto, type Entorno } from '../scripts/contenido/contexto.ts'
import { Paso as EsquemaDePaso, FichaFuente } from '../src/contenido/esquemas.ts'
import type { BloqueDePrueba, Ficha, Leccion, Paso } from '../src/contenido/tipos.ts'

/** Lección que sustituye a la real en las pruebas que usan `page.route`. Es la primera del curso: siempre está abierta. */
export const ID_DE_PRUEBA = 'm00.u01.l01'

/**
 * Compila unos pasos escritos en YAML, como en `content/`, con el compilador
 * de verdad: así las pruebas de navegador ensayan tipos de paso que ninguna
 * lección usa todavía. Falla si el paso no valida o el compilador da errores.
 */
export function leccionDePrueba(yaml: string): Leccion {
  const pasos = (YAML.parse(yaml) as unknown[]).map((fuente, i): Paso => {
    const entorno: Entorno = { hallazgos: [], conceptos: new Set(['pulso']), glosario: new Map() }
    const leido = EsquemaDePaso.safeParse(fuente)
    if (!leido.success) throw new Error(`Paso ${i + 1}: ${leido.error.message}`)
    const paso = compilarPaso(leido.data, new Contexto(entorno, `prueba/${i + 1}`), 'pulso')
    const errores = entorno.hallazgos.filter((h) => h.nivel === 'error')
    if (!paso || errores.length > 0) throw new Error(`Paso ${i + 1}: ${errores.map((h) => h.mensaje).join('; ')}`)
    return paso
  })
  return { id: ID_DE_PRUEBA, titulo: 'Lección de prueba', resumen: 'Prueba.', minutos: 5, conceptos: ['pulso'], pasos }
}

/** Compila una ficha escrita en YAML, como las de `content/fichas/`, con el compilador de verdad. */
export function fichaDePrueba(id: string, yaml: string): Ficha {
  const entorno: Entorno = { hallazgos: [], conceptos: new Set(['pulso']), glosario: new Map([['pulso', 'Pulso']]) }
  const leido = FichaFuente.safeParse(YAML.parse(yaml))
  if (!leido.success) throw new Error(`Ficha ${id}: ${leido.error.message}`)
  const ctx = new Contexto(entorno, `fichas/${id}`)
  const ficha: Ficha = {
    id,
    titulo: leido.data.titulo,
    resumen: ctx.prosa('resumen', leido.data.resumen),
    bloques: leido.data.bloques.map((b, i) => {
      const cb = ctx.en(`bloques[${i}]`)
      const bloque: Ficha['bloques'][number] = { titulo: b.titulo, texto: cb.prosa('texto', b.texto) }
      const ejemplo = b.ejemplo ? compilarPieza(b.ejemplo, cb.en('ejemplo'))?.pieza : undefined
      if (ejemplo) bloque.ejemplo = ejemplo
      return bloque
    }),
  }
  const errores = entorno.hallazgos.filter((h) => h.nivel === 'error')
  if (errores.length > 0) throw new Error(`Ficha ${id}: ${errores.map((h) => h.mensaje).join('; ')}`)
  return ficha
}

/** Ficha de prueba, servida con `page.route`: tiene un bloque sin ejemplo, que ninguna ficha del curso tiene. */
export const FICHA_DE_PRUEBA = fichaDePrueba(
  'compases',
  `
titulo: Compases de un vistazo
resumen: Cómo se agrupan los [[pulso|pulsos]] en los compases más usados.
bloques:
  - titulo: Cuatro por cuatro
    texto: Cuatro pulsos por compás; el primero pesa más. Es el compás de casi toda la música de combate.
    ejemplo:
      tempo: 120
      compases: 2
      pistas:
        - rol: percusion
          instrumento: bateria
          rejilla:
            paso: "4"
            lineas:
              bombo: "x...|x..."
              caja: "..x.|..x."
  - titulo: Tres por cuatro
    texto: Tres pulsos por compás, como un vals.
`,
)

/** Una pregunta de oído de dos opciones, «Uno» y «Dos». */
function pregunta(correcta: 1 | 2): string {
  return `
- tipo: oido
  modo: preguntas
  enunciado: ¿Cuántos golpes suenan?
  pista: Cuéntalos.
  explicacion: Hay que contarlos.
  preguntas:
    - opciones: [Uno, Dos]
      correcta: ${correcta}
      pieza:
        tempo: 100
        compases: 1
        pistas:
          - rol: percusion
            instrumento: bateria
            rejilla:
              paso: "4"
              lineas:
                caja: "${correcta === 2 ? 'x.x.' : 'x...'}"
`
}

/**
 * Todavía no hay prueba-de-nivel.yaml (llega con el contenido): se sirve una
 * de dos bloques, uno por cada unidad del Mundo 0 que hay escrita o declarada.
 * Los pasos pasan por el compilador de verdad.
 */
export const PRUEBA_DE_PRUEBA: BloqueDePrueba[] = [
  { unidad: 'm00.u01', aprobado: 0.8, pasos: leccionDePrueba(pregunta(2) + pregunta(1)).pasos as BloqueDePrueba['pasos'] },
  { unidad: 'm00.u02', aprobado: 1, pasos: leccionDePrueba(pregunta(2) + pregunta(2)).pasos as BloqueDePrueba['pasos'] },
]
