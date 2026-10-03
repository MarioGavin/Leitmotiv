import { describe, expect, it } from 'vitest'
import { compilarProsa, textoPlano } from './prosa.ts'

describe('compilarProsa', () => {
  it('compila párrafos con negrita y cursiva', () => {
    expect(compilarProsa('El **pulso** es *regular*.')).toEqual([
      {
        t: 'p',
        h: [
          { t: 'texto', v: 'El ' },
          { t: 'fuerte', h: [{ t: 'texto', v: 'pulso' }] },
          { t: 'texto', v: ' es ' },
          { t: 'enfasis', h: [{ t: 'texto', v: 'regular' }] },
          { t: 'texto', v: '.' },
        ],
      },
    ])
  })

  it('separa párrafos y une las líneas partidas', () => {
    const p = compilarProsa('Primera línea\nque sigue.\n\nSegundo párrafo.')
    expect(p).toHaveLength(2)
    expect(textoPlano(p)).toBe('Primera línea que sigue. Segundo párrafo.')
  })

  it('compila listas con y sin orden', () => {
    const p = compilarProsa('- uno\n- **dos**\n\n1. primero\n2. segundo')
    expect(p.map((b) => (b.t === 'lista' ? [b.ordenada, b.items.length] : b.t))).toEqual([
      [false, 2],
      [true, 2],
    ])
  })

  it('reconoce las marcas musicales y normaliza su contenido', () => {
    const p = compilarProsa('De {n:C4} a {n:F#} hay una {i:4A}; en {t:d mayor} el {g:V7} es {a:A7}.'.replace('d mayor', 'D mayor'))
    const nodos = p[0]?.t === 'p' ? p[0].h : []
    expect(nodos.filter((n) => n.t !== 'texto')).toEqual([
      { t: 'nota', v: 'C4' },
      { t: 'nota', v: 'F#' },
      { t: 'intervalo', v: '4A' },
      { t: 'tonalidad', v: 'D mayor' },
      { t: 'grado', v: 'V7' },
      { t: 'acorde', v: 'A7' },
    ])
  })

  it('acepta la J castellana en los intervalos', () => {
    const p = compilarProsa('Una {i:5J}.')
    expect(p[0]?.t === 'p' && p[0].h[1]).toEqual({ t: 'intervalo', v: '5P' })
  })

  it('enlaza con el glosario usando el término o un texto propio', () => {
    const glosario = new Map([['sincopa', 'Síncopa']])
    const p = compilarProsa('La [[sincopa]] y [[sincopa|las síncopas]].', { glosario })
    const nodos = p[0]?.t === 'p' ? p[0].h : []
    expect(nodos[1]).toEqual({ t: 'glosario', id: 'sincopa', h: [{ t: 'texto', v: 'síncopa' }] })
    expect(nodos[3]).toEqual({ t: 'glosario', id: 'sincopa', h: [{ t: 'texto', v: 'las síncopas' }] })
  })

  it('falla si el término no existe en el glosario', () => {
    expect(() => compilarProsa('Mira [[contratiempo]].', { glosario: new Map() })).toThrow(/no está en el glosario/)
  })

  it('falla con marcas mal escritas', () => {
    expect(() => compilarProsa('{n:Do4}')).toThrow(/no es una nota/)
    expect(() => compilarProsa('{a:Hm}')).toThrow(/Acorde no reconocido/)
    expect(() => compilarProsa('{t:D alegre}')).toThrow(/Tonalidad no válida/)
    expect(() => compilarProsa('{i:5M}')).toThrow(/Intervalo no válido/)
    expect(() => compilarProsa('{g:IX}')).toThrow(/no es un grado/)
  })

  it('rechaza lo que no es Markdown reducido', () => {
    expect(() => compilarProsa('# Título')).toThrow(/No se admite «heading»/)
    expect(() => compilarProsa('Un [enlace](http://x).')).toThrow(/No se admite «link»/)
    expect(() => compilarProsa('`código`')).toThrow(/No se admite «codespan»/)
    expect(() => compilarProsa('> cita')).toThrow(/No se admite «blockquote»/)
    expect(() => compilarProsa('   ')).toThrow(/vacío/)
  })

  it('conserva los símbolos tal cual', () => {
    expect(textoPlano(compilarProsa('3 < 4 & «comillas» — raya'))).toBe('3 < 4 & «comillas» — raya')
  })
})
