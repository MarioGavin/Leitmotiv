import YAML from 'yaml'
import { compilarPaso } from '../scripts/contenido/pasos.ts'
import { Contexto, type Entorno } from '../scripts/contenido/contexto.ts'
import { Paso as EsquemaDePaso } from '../src/contenido/esquemas.ts'
import type { Leccion, Paso } from '../src/contenido/tipos.ts'

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
