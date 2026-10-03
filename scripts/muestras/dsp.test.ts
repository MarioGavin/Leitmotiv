import { describe, expect, it } from 'vitest'
import { SR, aDb, deDb, detectarTono, detectarTonoAgudo, hornearBucle, hzAMidi, limitarDuracion, medirCostura, midiAHz, normalizarPico, pico, recortarFinal, recortarInicio, rms } from './dsp.ts'

/** Tono con unos pocos armónicos, como el de un instrumento, con silencio delante si se pide. */
function tono(hz: number, segundos: number, { silencioSeg = 0, amplitud = 0.5 }: { silencioSeg?: number; amplitud?: number } = {}): Float32Array {
  const silencio = Math.round(silencioSeg * SR)
  const x = new Float32Array(silencio + Math.round(segundos * SR))
  for (let i = silencio; i < x.length; i++) {
    const t = (i - silencio) / SR
    x[i] = amplitud * (0.7 * Math.sin(2 * Math.PI * hz * t) + 0.2 * Math.sin(4 * Math.PI * hz * t) + 0.1 * Math.sin(6 * Math.PI * hz * t))
  }
  return x
}

function cents(hz: number, esperado: number): number {
  return 1200 * Math.log2(hz / esperado)
}

describe('medidas básicas', () => {
  it('convierte entre decibelios y amplitud', () => {
    expect(aDb(1)).toBe(0)
    expect(aDb(0.5)).toBeCloseTo(-6.02, 2)
    expect(aDb(0)).toBe(-Infinity)
    expect(deDb(-20)).toBeCloseTo(0.1, 6)
    expect(deDb(aDb(0.37))).toBeCloseTo(0.37, 6)
  })

  it('mide el pico y el valor eficaz', () => {
    const x = new Float32Array([0, 0.5, -1, 0.25])
    expect(pico(x)).toBe(1)
    expect(pico(x, 0, 2)).toBe(0.5)
    expect(rms(new Float32Array([1, -1, 1, -1]))).toBe(1)
    expect(rms(new Float32Array(8))).toBe(0)
  })

  it('convierte entre hercios y notas MIDI', () => {
    expect(midiAHz(69)).toBe(440)
    expect(midiAHz(57)).toBeCloseTo(220, 6)
    expect(hzAMidi(440)).toBe(69)
    expect(hzAMidi(midiAHz(61.5))).toBeCloseTo(61.5, 6)
  })
})

describe('detección de tono', () => {
  it.each([55, 110, 220, 440, 880])('acierta la fundamental de un tono de %d Hz', (hz) => {
    const detectado = detectarTono(tono(hz, 1), { minHz: 40, maxHz: 1500 })
    expect(Math.abs(cents(detectado.hz, hz))).toBeLessThan(3)
    expect(detectado.claridad).toBeGreaterThan(0.9)
  })

  it('distingue una nota desafinada un cuarto de tono', () => {
    const detectado = detectarTono(tono(midiAHz(60.5), 1), { minHz: 100, maxHz: 1000 })
    expect(detectado.midi).toBeCloseTo(60.5, 1)
  })

  it.each([1760, 2093, 3520])('acierta las notas agudas (%d Hz) con el método de barrido', (hz) => {
    const detectado = detectarTonoAgudo(tono(hz, 0.6), { esperadoHz: hz * 1.01 })
    expect(Math.abs(cents(detectado.hz, hz))).toBeLessThan(5)
    expect(detectado.claridad).toBeGreaterThan(0.8)
  })

  it('da claridad baja con ruido', () => {
    const ruido = new Float32Array(SR)
    let semilla = 12345
    for (let i = 0; i < ruido.length; i++) {
      semilla = (semilla * 1103515245 + 12345) & 0x7fffffff
      ruido[i] = semilla / 0x40000000 - 1
    }
    expect(detectarTono(ruido, { minHz: 40, maxHz: 1500 }).claridad).toBeLessThan(0.5)
  })
})

describe('recortes y niveles', () => {
  it('quita el silencio inicial dejando un margen mínimo', () => {
    const recortado = recortarInicio(tono(220, 0.5, { silencioSeg: 0.3 }))
    // Queda como mucho el margen de 2 ms (más el primer semiciclo por debajo del umbral).
    expect(recortado.length).toBeLessThan(Math.round(0.51 * SR))
    expect(recortado.length).toBeGreaterThan(Math.round(0.49 * SR))
  })

  it('quita el silencio final dejando una cola', () => {
    const x = new Float32Array(SR)
    x.set(tono(220, 0.25))
    const recortado = recortarFinal(x)
    expect(recortado.length).toBeGreaterThanOrEqual(Math.round(0.25 * SR))
    expect(recortado.length).toBeLessThan(Math.round(0.3 * SR))
  })

  it('limita la duración y acaba en silencio', () => {
    const limitado = limitarDuracion(tono(220, 3), 1, 0.2)
    expect(limitado.length).toBe(SR)
    expect(Math.abs(limitado[limitado.length - 1] ?? 1)).toBeLessThan(0.001)
    // Antes del fundido, la señal está intacta.
    expect(pico(limitado, 0, Math.round(0.7 * SR))).toBeGreaterThan(0.3)
  })

  it('normaliza al pico pedido sin tocar el original', () => {
    const x = tono(220, 0.2, { amplitud: 0.2 })
    const y = normalizarPico(x, -3)
    expect(aDb(pico(y))).toBeCloseTo(-3, 3)
    expect(pico(x)).toBeLessThan(0.2)
    expect(normalizarPico(new Float32Array(16), -3)).toEqual(new Float32Array(16))
  })
})

describe('bucles', () => {
  it('hornea un bucle sin salto en la costura', () => {
    const hz = 196
    const x = tono(hz, 4)
    const bucle = hornearBucle(x, { inicioSeg: 1, longitudSeg: 2, cruceSeg: 0.3, periodo: SR / hz })
    expect(bucle.fin).toBeGreaterThan(bucle.inicio)
    expect(bucle.correlacion).toBeGreaterThan(0.95)
    const costura = medirCostura(bucle.datos, bucle.inicio, bucle.fin)
    // El salto al repetir no destaca sobre los cambios normales de la propia onda.
    expect(costura.proporcion).toBeLessThan(3)
  })

  it('delata una costura mal hecha', () => {
    const x = tono(196, 2)
    // Cortar en un punto cualquiera, sin fundido ni ajuste al periodo, deja un escalón.
    const inicio = Math.round(0.5 * SR)
    const fin = inicio + Math.round(0.7003 * SR) + 61
    const mala = medirCostura(x, inicio, fin)
    expect(mala.proporcion).toBeGreaterThan(5)
  })
})
