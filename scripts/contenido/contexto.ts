/**
 * Contexto de compilación: sabe en qué punto del contenido estamos y recoge
 * los hallazgos (errores y avisos) para informar de todos a la vez.
 */
import type { Prosa } from '../../src/contenido/tipos.ts'
import type { Hallazgo } from '../../src/musica/comprobaciones.ts'
import { type ContextoDeProsa, compilarProsa } from './prosa.ts'

export interface HallazgoDeContenido extends Hallazgo {
  /** Archivo y ruta dentro de él: `mundos/m00/u01/l01.yaml › pasos[2] › ejemplo`. */
  donde: string
}

export interface Entorno {
  hallazgos: HallazgoDeContenido[]
  /** id → término, para resolver los enlaces [[…]] de los textos. */
  glosario?: ReadonlyMap<string, string>
  /** Conceptos definidos en conceptos.yaml. Si es `undefined` no se comprueban. */
  conceptos?: ReadonlySet<string>
}

export class Contexto {
  readonly entorno: Entorno
  readonly ruta: string

  constructor(entorno: Entorno, ruta: string) {
    this.entorno = entorno
    this.ruta = ruta
  }

  /** Contexto hijo: añade un tramo a la ruta. */
  en(tramo: string): Contexto {
    return new Contexto(this.entorno, `${this.ruta} › ${tramo}`)
  }

  error(codigo: string, mensaje: string): void {
    this.entorno.hallazgos.push({ nivel: 'error', codigo, mensaje, donde: this.ruta })
  }

  aviso(codigo: string, mensaje: string): void {
    this.entorno.hallazgos.push({ nivel: 'aviso', codigo, mensaje, donde: this.ruta })
  }

  anotar(hallazgos: readonly Hallazgo[]): void {
    for (const h of hallazgos) this.entorno.hallazgos.push({ ...h, donde: this.ruta })
  }

  /** Ejecuta algo que puede lanzar y convierte la excepción en un error del informe. */
  intentar<T>(codigo: string, accion: () => T): T | undefined {
    try {
      return accion()
    } catch (e) {
      this.error(codigo, (e as Error).message)
      return undefined
    }
  }

  /** Compila un texto; si falla, anota el error y devuelve un párrafo vacío para poder seguir. */
  prosa(campo: string, markdown: string): Prosa {
    const ctxProsa: ContextoDeProsa = this.entorno.glosario ? { glosario: this.entorno.glosario } : {}
    try {
      return compilarProsa(markdown, ctxProsa)
    } catch (e) {
      this.en(campo).error('texto-no-valido', (e as Error).message)
      return [{ t: 'p', h: [] }]
    }
  }

  /** Comprueba que un concepto existe y lo devuelve. */
  concepto(id: string): string {
    if (this.entorno.conceptos && !this.entorno.conceptos.has(id)) {
      this.error('concepto-desconocido', `El concepto «${id}» no está definido en conceptos.yaml.`)
    }
    return id
  }
}
