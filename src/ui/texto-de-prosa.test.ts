import { describe, expect, it } from 'vitest'
import type { Prosa } from '../contenido/tipos.ts'
import { paraBuscar, textoDeProsa } from './texto-de-prosa.ts'

const PROSA: Prosa = [
  { t: 'p', h: [{ t: 'texto', v: 'El ' }, { t: 'glosario', id: 'pulso', h: [{ t: 'texto', v: 'pulso' }] }, { t: 'texto', v: ' empieza en ' }, { t: 'nota', v: 'C4' }, { t: 'texto', v: '.' }] },
  { t: 'lista', ordenada: false, items: [[{ t: 'acorde', v: 'Cmaj7' }], [{ t: 'fuerte', h: [{ t: 'texto', v: 'fuerte' }] }]] },
]

describe('texto plano de la prosa', () => {
  it('junta los bloques y pone las notas en la nomenclatura elegida', () => {
    expect(textoDeProsa(PROSA, 'latina')).toBe('El pulso empieza en Do4. Cmaj7; fuerte')
    expect(textoDeProsa(PROSA, 'anglosajona')).toBe('El pulso empieza en C4. Cmaj7; fuerte')
  })

  it('para buscar, sin tildes ni mayúsculas', () => {
    expect(paraBuscar('  Compás ')).toBe('compas')
    expect(paraBuscar('ÑANDÚ')).toBe('nandu')
  })
})
