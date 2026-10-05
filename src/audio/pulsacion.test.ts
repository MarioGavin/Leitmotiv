import { describe, expect, it } from 'vitest'
import { LATENCIA_MAXIMA_MS, LATENCIA_MINIMA_MS, acotarLatencia, instanteDelToque, leerRelojes } from './pulsacion.ts'

describe('leer los dos relojes a la vez', () => {
  it('usa la pareja que da el navegador: el instante que está saliendo por el altavoz', () => {
    const ctx = { currentTime: 10, outputLatency: 0.04, getOutputTimestamp: () => ({ contextTime: 9.95, performanceTime: 5000 }) }
    expect(leerRelojes(ctx, 5003)).toEqual({ audio: 9.95, pagina: 5000 })
  })

  it('si el navegador devuelve ceros, resta al reloj de audio el retardo de salida que declare', () => {
    const ctx = { currentTime: 10, outputLatency: 0.04, baseLatency: 0.01, getOutputTimestamp: () => ({ contextTime: 0, performanceTime: 0 }) }
    expect(leerRelojes(ctx, 5003)).toEqual({ audio: 9.96, pagina: 5003 })
  })

  it('sin esa función, lo mismo; y sin retardo de salida, el propio del procesado o nada', () => {
    expect(leerRelojes({ currentTime: 10, baseLatency: 0.01 }, 7000)).toEqual({ audio: 9.99, pagina: 7000 })
    expect(leerRelojes({ currentTime: 10 }, 7000)).toEqual({ audio: 10, pagina: 7000 })
  })

  it('una pareja a medias no vale', () => {
    const ctx = { currentTime: 10, getOutputTimestamp: () => ({ contextTime: 9.9 }) }
    expect(leerRelojes(ctx, 7000)).toEqual({ audio: 10, pagina: 7000 })
  })
})

describe('instante de un toque en el reloj de audio', () => {
  const relojes = { audio: 12, pagina: 8000 }

  it('suma lo que ha pasado en el reloj de la página desde que se leyeron los dos', () => {
    expect(instanteDelToque(relojes, 8000, 0)).toBe(12)
    expect(instanteDelToque(relojes, 8050, 0)).toBeCloseTo(12.05, 9)
  })

  it('un toque anterior a la lectura cae antes: la hora del toque es la del dedo, no la de quien la procesa', () => {
    expect(instanteDelToque(relojes, 7980, 0)).toBeCloseTo(11.98, 9)
  })

  it('resta el retardo calibrado: quien oye tarde, toca tarde', () => {
    expect(instanteDelToque(relojes, 8050, 30)).toBeCloseTo(12.02, 9)
    expect(instanteDelToque(relojes, 8050, -20)).toBeCloseTo(12.07, 9)
  })
})

describe('retardo calibrado dentro de límites', () => {
  it('redondea a milisegundos y recorta lo que no es creíble', () => {
    expect(acotarLatencia(37.6)).toBe(38)
    expect(acotarLatencia(9999)).toBe(LATENCIA_MAXIMA_MS)
    expect(acotarLatencia(-9999)).toBe(LATENCIA_MINIMA_MS)
    expect(acotarLatencia(Number.NaN)).toBe(0)
    expect(acotarLatencia(Number.POSITIVE_INFINITY)).toBe(0)
  })
})
