import { describe, expect, it } from 'vitest'
import type { IndiceDelCurso, ResumenDeLeccion } from '../../contenido/tipos.ts'
import { nodosDelCurso } from './nodos.ts'

function leccion(id: string): ResumenDeLeccion {
  return { id, titulo: 'Lección', resumen: '', minutos: 5, conceptos: [], pasos: ['teoria'], encargo: false }
}

const INDICE: IndiceDelCurso = {
  version: 'prueba',
  mundos: [
    {
      id: 'm00',
      titulo: 'Repaso exprés',
      lema: 'Lo imprescindible.',
      descripcion: [],
      unidades: [
        { id: 'm00.u01', titulo: 'Pulso', objetivo: '', borrador: true, lecciones: [leccion('m00.u01.l01'), leccion('m00.u01.l02')] },
        { id: 'm00.u02', titulo: 'Notas', objetivo: '', borrador: true, lecciones: [] },
      ],
    },
    { id: 'm10', titulo: 'Producción y DAW', lema: 'De la idea al archivo.', descripcion: [], unidades: [] },
  ],
}

describe('nodos del mapa', () => {
  const nodos = nodosDelCurso(INDICE)

  it('hay un nodo por mundo y, al final, el proyecto final', () => {
    expect(nodos.map((n) => n.id)).toEqual(['m00', 'm10', 'final'])
    expect(nodos.at(-1)).toMatchObject({ final: true, numero: 'F', estado: 'en-obras' })
  })

  it('numera los mundos sin ceros a la izquierda', () => {
    expect(nodos.map((n) => n.numero)).toEqual(['0', '10', 'F'])
  })

  it('un mundo está abierto solo si tiene alguna lección', () => {
    expect(nodos[0]).toMatchObject({ estado: 'abierto', unidades: 2, lecciones: 2 })
    expect(nodos[1]).toMatchObject({ estado: 'en-obras', unidades: 0, lecciones: 0 })
  })
})
