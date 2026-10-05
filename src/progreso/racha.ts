/**
 * Racha de días de estudio, sin castigo: un día de descanso no la rompe. Se
 * corta cuando pasan dos días seguidos sin estudiar, y los días de descanso no
 * cuentan ni a favor ni en contra.
 */

const MS_POR_DIA = 86_400_000

/** Días enteros entre dos fechas escritas como «2026-10-05» (la segunda menos la primera). */
export function diasEntre(desde: string, hasta: string): number {
  // A mediodía en UTC: así un cambio de hora no convierte un día en 23 o 25 horas.
  return Math.round((Date.parse(`${hasta}T12:00:00Z`) - Date.parse(`${desde}T12:00:00Z`)) / MS_POR_DIA)
}

export interface Racha {
  /** Días estudiados en la racha en curso. Cero si se ha cortado. */
  dias: number
  /** La racha más larga que ha habido. */
  mejor: number
  /** Si hoy ya se ha estudiado. */
  hoy: boolean
}

/**
 * @param diasEstudiados Días con actividad, como «2026-10-05», en cualquier orden.
 * @param hoy El día de hoy.
 */
export function rachaDe(diasEstudiados: readonly string[], hoy: string): Racha {
  // Los días posteriores a hoy (un reloj mal puesto) no cuentan.
  const dias = [...new Set(diasEstudiados)].filter((dia) => diasEntre(dia, hoy) >= 0).sort()
  let mejor = 0
  let actual = 0
  let anterior: string | undefined
  for (const dia of dias) {
    actual = anterior !== undefined && diasEntre(anterior, dia) <= 2 ? actual + 1 : 1
    mejor = Math.max(mejor, actual)
    anterior = dia
  }
  const viva = anterior !== undefined && diasEntre(anterior, hoy) <= 2
  return { dias: viva ? actual : 0, mejor, hoy: anterior === hoy }
}
