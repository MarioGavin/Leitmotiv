import { describe, expect, it } from 'vitest'
import { AJUSTES_INICIALES, migrar } from './ajustes.ts'

describe('ajustes guardados por versiones anteriores', () => {
  it('lo que no reconoce se queda en su valor inicial', () => {
    expect(migrar(undefined)).toEqual(AJUSTES_INICIALES)
    expect(migrar(null)).toEqual(AJUSTES_INICIALES)
    expect(migrar('texto')).toEqual(AJUSTES_INICIALES)
    expect(migrar({ esquema: 'sepia', nomenclatura: 'alemana', sonidosDeInterfaz: 'sí', timbre: 'organo', latenciaMs: 'mucha' })).toEqual(AJUSTES_INICIALES)
  })

  it('conserva lo que sigue valiendo', () => {
    const guardado = { esquema: 'claro', nomenclatura: 'anglosajona', sonidosDeInterfaz: false, timbre: 'campana', latenciaMs: 85 }
    expect(migrar(guardado)).toEqual(guardado)
  })

  it('de la versión 1 hereda el timbre de la dirección visual y descarta la dirección', () => {
    expect(migrar({ direccion: 'vinilo', esquema: 'oscuro', nomenclatura: 'latina', sonidosDeInterfaz: true })).toEqual({ ...AJUSTES_INICIALES, esquema: 'oscuro', timbre: 'campana' })
    expect(migrar({ direccion: 'cartucho' })).toEqual(AJUSTES_INICIALES)
  })

  it('de la versión 2 pasa sin retardo calibrado', () => {
    expect(migrar({ esquema: 'claro', nomenclatura: 'latina', sonidosDeInterfaz: true, timbre: 'chip' }).latenciaMs).toBe(0)
  })

  it('un retardo que no es creíble se recorta', () => {
    expect(migrar({ latenciaMs: 5000 }).latenciaMs).toBe(500)
    expect(migrar({ latenciaMs: -5000 }).latenciaMs).toBe(-100)
    expect(migrar({ latenciaMs: 42.4 }).latenciaMs).toBe(42)
  })
})
