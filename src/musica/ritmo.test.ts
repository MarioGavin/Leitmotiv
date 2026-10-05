import { describe, expect, it } from 'vitest'
import { latenciaMedida, planDeRitmo, puntuarRitmo } from './ritmo.ts'
import { leerPatronRitmico } from './taquigrafia.ts'

function paso(patron: string, extra: Partial<Parameters<typeof planDeRitmo>[0]> = {}): Parameters<typeof planDeRitmo>[0] {
  const leido = leerPatronRitmico(patron, extra.compas?.[1] === 8 ? '8' : '4', extra.compas ?? [4, 4])
  return { modo: 'seguir', tempo: 60, compas: [4, 4], ...leido, cuentaAtras: 1, repeticiones: 1, guia: 'patron', ...extra }
}

describe('plan de un ejercicio de ritmo', () => {
  it('seguir: cuenta previa y el patrón sonando mientras se toca', () => {
    const plan = planDeRitmo(paso('x.x.', { repeticiones: 2 }))
    // A 60 BPM, un tiempo es un segundo.
    expect(plan.tiempo).toBe(1)
    expect(plan.duracion).toBe(12)
    expect(plan.claqueta).toEqual([
      { t: 0, fuerte: true },
      { t: 1, fuerte: false },
      { t: 2, fuerte: false },
      { t: 3, fuerte: false },
    ])
    expect(plan.esperados.map((g) => g.t)).toEqual([4, 6, 8, 10])
    expect(plan.patron.map((g) => g.t)).toEqual([4, 6, 8, 10])
    expect(plan.tramos).toEqual([
      { desde: 0, hasta: 4, tipo: 'claqueta' },
      { desde: 4, hasta: 12, tipo: 'toca' },
    ])
  })

  it('leer: el patrón no suena; solo la claqueta', () => {
    const plan = planDeRitmo(paso('x.xx', { modo: 'leer', guia: 'claqueta' }))
    expect(plan.patron).toEqual([])
    expect(plan.esperados.map((g) => g.t)).toEqual([4, 6, 7])
    expect(plan.claqueta.map((g) => g.t)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
  })

  it('eco: se alternan una vuelta de escucha y una del usuario', () => {
    const plan = planDeRitmo(paso('xx..', { modo: 'eco', guia: 'claqueta', repeticiones: 2 }))
    expect(plan.tramos.map((t) => t.tipo)).toEqual(['claqueta', 'escucha', 'toca', 'escucha', 'toca'])
    expect(plan.patron.map((g) => g.t)).toEqual([4, 5, 12, 13])
    expect(plan.esperados.map((g) => g.t)).toEqual([8, 9, 16, 17])
    expect(plan.duracion).toBe(20)
  })

  it('guía de compás: solo suena el primer tiempo de cada compás', () => {
    const plan = planDeRitmo(paso('xxxx|xxxx', { guia: 'compas' }))
    expect(plan.patron).toEqual([])
    expect(plan.claqueta.map((g) => g.t)).toEqual([0, 1, 2, 3, 4, 8])
    expect(plan.esperados).toHaveLength(8)
  })

  it('sin guía, después de la cuenta previa no suena nada', () => {
    const plan = planDeRitmo(paso('xxxx', { guia: 'nada' }))
    expect(plan.claqueta.map((g) => g.t)).toEqual([0, 1, 2, 3])
    expect(plan.patron).toEqual([])
  })

  it('respeta el compás, la cuenta previa de dos compases y los acentos', () => {
    const plan = planDeRitmo(paso('X..x..', { compas: [6, 8], cuentaAtras: 2, tempo: 120 }))
    // En 6/8 a 120 negras por minuto, una corchea dura 0,25 s y el compás, 1,5 s.
    expect(plan.tiempo).toBe(0.25)
    expect(plan.claqueta).toHaveLength(12)
    expect(plan.claqueta.filter((g) => g.fuerte).map((g) => g.t)).toEqual([0, 1.5])
    expect(plan.esperados).toEqual([
      { t: 3, fuerte: true },
      { t: 3.75, fuerte: false },
    ])
  })
})

describe('puntuación del ritmo', () => {
  const golpes = [4, 5, 6, 7, 8, 9, 10, 11]

  it('toques clavados: todo acierto', () => {
    const r = puntuarRitmo(golpes, golpes, 'normal')
    expect(r).toMatchObject({ aciertos: 8, perdidos: 0, sobrantes: 0, precision: 1, aprobado: true, diagnostico: 'bien' })
    expect(r.sesgo).toBeCloseTo(0, 6)
  })

  it('mide la desviación de cada toque en milisegundos, con su signo', () => {
    const r = puntuarRitmo([1, 2], [0.96, 2.05], 'normal')
    expect(r.desviaciones[0]).toBeCloseTo(-40, 6)
    expect(r.desviaciones[1]).toBeCloseTo(50, 6)
    expect(r.sesgo).toBeCloseTo(5, 6)
  })

  it('un toque fuera de la ventana no cuenta, y sobra', () => {
    const r = puntuarRitmo([1, 2, 3, 4], [1, 2, 3, 4.2], 'normal')
    expect(r).toMatchObject({ aciertos: 3, perdidos: 1, sobrantes: 1, aprobado: false })
    expect(r.desviaciones[3]).toBeNull()
  })

  it('la tolerancia cambia el ancho de la ventana', () => {
    const tarde = golpes.map((g) => g + 0.09)
    expect(puntuarRitmo(golpes, tarde, 'amplia').aprobado).toBe(true)
    expect(puntuarRitmo(golpes, tarde, 'normal').aprobado).toBe(true)
    expect(puntuarRitmo(golpes, tarde, 'estricta').aprobado).toBe(false)
  })

  it('distingue adelantarse, atrasarse y tocar de forma irregular', () => {
    expect(puntuarRitmo(golpes, golpes.map((g) => g - 0.08), 'normal').diagnostico).toBe('adelantado')
    expect(puntuarRitmo(golpes, golpes.map((g) => g + 0.08), 'normal').diagnostico).toBe('atrasado')
    const irregular = golpes.map((g, i) => g + (i % 2 === 0 ? -0.09 : 0.09))
    const r = puntuarRitmo(golpes, irregular, 'normal')
    expect(r.aprobado).toBe(true)
    expect(r.diagnostico).toBe('irregular')
  })

  it('aprueba con cuatro de cada cinco golpes', () => {
    const diez = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    expect(puntuarRitmo(diez, diez.slice(0, 8), 'normal')).toMatchObject({ precision: 0.8, aprobado: true })
    expect(puntuarRitmo(diez, diez.slice(0, 7), 'normal')).toMatchObject({ aprobado: false, diagnostico: 'faltan' })
  })

  it('aporrear la pantalla no aprueba', () => {
    const muchos = Array.from({ length: 40 }, (_, i) => 4 + i * 0.2)
    const r = puntuarRitmo(golpes, muchos, 'amplia')
    expect(r.aciertos).toBe(8)
    expect(r.aprobado).toBe(false)
    expect(r.diagnostico).toBe('sobran')
  })

  it('sin toques', () => {
    expect(puntuarRitmo(golpes, [], 'normal')).toMatchObject({ aciertos: 0, precision: 0, aprobado: false, diagnostico: 'sin-toques' })
  })

  it('con golpes muy juntos, un toque no vale para dos', () => {
    // Semicorcheas a 150 BPM: 0,1 s entre golpes, menos que la ventana normal.
    const rapidos = [1, 1.1, 1.2, 1.3]
    const r = puntuarRitmo(rapidos, [1, 1.2], 'normal')
    expect(r.aciertos).toBe(2)
    expect(r.desviaciones).toEqual([0, null, 0, null].map((d) => (d === null ? null : expect.closeTo(d, 6))))
  })
})

describe('calibración de latencia', () => {
  it('devuelve la mediana de las desviaciones, redondeada', () => {
    const clics = [1, 2, 3, 4, 5, 6, 7, 8]
    const toques = clics.map((c, i) => c + 0.12 + (i === 3 ? 0.2 : 0))
    expect(latenciaMedida(clics, toques)).toBe(120)
  })

  it('con menos de cuatro toques no hay medida', () => {
    expect(latenciaMedida([1, 2, 3, 4], [1.1, 2.1])).toBeUndefined()
  })
})
