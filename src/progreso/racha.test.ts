import { describe, expect, it } from 'vitest'
import { diasEntre, rachaDe } from './racha.ts'

describe('días entre dos fechas', () => {
  it('cuenta días de calendario, también al cambiar de mes, de año o de hora', () => {
    expect(diasEntre('2026-10-05', '2026-10-05')).toBe(0)
    expect(diasEntre('2026-10-05', '2026-10-06')).toBe(1)
    expect(diasEntre('2026-10-31', '2026-11-01')).toBe(1)
    expect(diasEntre('2026-12-31', '2027-01-01')).toBe(1)
    expect(diasEntre('2026-03-28', '2026-03-30')).toBe(2)
    expect(diasEntre('2026-10-06', '2026-10-05')).toBe(-1)
  })
})

describe('racha sin castigo', () => {
  it('sin días, no hay racha', () => {
    expect(rachaDe([], '2026-10-05')).toEqual({ dias: 0, mejor: 0, hoy: false })
  })

  it('cuenta los días seguidos', () => {
    expect(rachaDe(['2026-10-03', '2026-10-04', '2026-10-05'], '2026-10-05')).toEqual({ dias: 3, mejor: 3, hoy: true })
  })

  it('si hoy aún no se ha estudiado, la racha sigue viva', () => {
    expect(rachaDe(['2026-10-03', '2026-10-04'], '2026-10-05')).toEqual({ dias: 2, mejor: 2, hoy: false })
  })

  it('un día de descanso no la rompe ni cuenta', () => {
    expect(rachaDe(['2026-10-01', '2026-10-03', '2026-10-05'], '2026-10-05')).toEqual({ dias: 3, mejor: 3, hoy: true })
    // Ayer no se estudió y hoy todavía tampoco: sigue viva.
    expect(rachaDe(['2026-10-01', '2026-10-03'], '2026-10-05')).toEqual({ dias: 2, mejor: 2, hoy: false })
  })

  it('dos días seguidos sin estudiar la cortan, pero la mejor se recuerda', () => {
    expect(rachaDe(['2026-10-01', '2026-10-02', '2026-10-03'], '2026-10-06')).toEqual({ dias: 0, mejor: 3, hoy: false })
    expect(rachaDe(['2026-09-20', '2026-09-21', '2026-09-22', '2026-10-05'], '2026-10-05')).toEqual({ dias: 1, mejor: 3, hoy: true })
  })

  it('no importa el orden ni que haya días repetidos', () => {
    expect(rachaDe(['2026-10-05', '2026-10-03', '2026-10-04', '2026-10-04'], '2026-10-05')).toEqual({ dias: 3, mejor: 3, hoy: true })
  })

  it('un día posterior a hoy no cuenta', () => {
    expect(rachaDe(['2026-10-05', '2026-10-09'], '2026-10-05')).toEqual({ dias: 1, mejor: 1, hoy: true })
  })
})
