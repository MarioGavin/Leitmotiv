/**
 * Contraste de color según WCAG 2.x, y la lista de parejas de colores que la
 * interfaz usa de verdad. La prueba (scripts/diseno/contraste.test.ts) lee los
 * colores de tema.css y comprueba todas las parejas en los dos esquemas;
 * DESIGN.md recoge la tabla que resulta.
 */

/** Luminancia relativa de un color `#rrggbb`. */
export function luminancia(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) throw new Error(`Color no válido: «${hex}». Se espera #rrggbb.`)
  const n = Number.parseInt(m[1] as string, 16)
  const canal = (v: number): number => {
    const c = v / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255)
}

/** Razón de contraste entre dos colores, de 1 a 21. */
export function contraste(a: string, b: string): number {
  const la = luminancia(a)
  const lb = luminancia(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

export type Colores = Readonly<Record<string, string>>

/**
 * Extrae los colores de cada esquema de la hoja del tema: todas las
 * declaraciones `--nombre: #rrggbb` de los bloques `:root[data-esquema='…']`.
 * Devuelve `{ oscuro: {...}, claro: {...} }`.
 */
export function leerColores(css: string): Record<string, Record<string, string>> {
  const esquemas: Record<string, Record<string, string>> = {}
  const sinComentarios = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const bloque = /([^{}]+)\{([^{}]*)\}/g
  // Solo los bloques de raíz: el selector es `:root[data-esquema='x']` y nada más, sin bajar a ningún componente.
  const deRaiz = /^:root\[data-esquema='(\w+)'\]$/
  for (const [, selector = '', cuerpo = ''] of sinComentarios.matchAll(bloque)) {
    const esquema = deRaiz.exec(selector.trim())?.[1]
    if (!esquema) continue
    const colores = (esquemas[esquema] ??= {})
    for (const [, nombre = '', valor = ''] of cuerpo.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) colores[nombre] = valor.toLowerCase()
  }
  return esquemas
}

export interface Pareja {
  /** Color del texto o del elemento. */
  sobre: string
  /** Color del fondo sobre el que va. */
  fondo: string
  /** Contraste mínimo exigido: 4,5 para texto (AA) y 3 para bordes, iconos y elementos gráficos. */
  minimo: 4.5 | 3
  /** Dónde se usa, para entender la tabla. */
  uso: string
}

/** Las parejas de colores de la interfaz. Los nombres son los de las variables CSS, sin los guiones. */
export const PAREJAS: readonly Pareja[] = [
  { sobre: 'tinta', fondo: 'fondo', minimo: 4.5, uso: 'Texto sobre el fondo' },
  { sobre: 'tinta', fondo: 'superficie', minimo: 4.5, uso: 'Texto dentro de un marco' },
  { sobre: 'tinta', fondo: 'superficie-2', minimo: 4.5, uso: 'Texto sobre la fila elegida o un botón' },
  { sobre: 'tinta', fondo: 'hundido', minimo: 4.5, uso: 'Texto sobre una superficie hundida' },
  { sobre: 'tinta-suave', fondo: 'fondo', minimo: 4.5, uso: 'Texto secundario sobre el fondo' },
  { sobre: 'tinta-suave', fondo: 'superficie', minimo: 4.5, uso: 'Texto secundario dentro de un marco' },
  { sobre: 'tinta-suave', fondo: 'hundido', minimo: 4.5, uso: 'Rótulos de la rejilla' },
  { sobre: 'sobre-acento', fondo: 'acento', minimo: 4.5, uso: 'Texto del botón principal' },
  { sobre: 'acento-tinta', fondo: 'fondo', minimo: 4.5, uso: 'Texto de acento sobre el fondo' },
  { sobre: 'acento-tinta', fondo: 'superficie', minimo: 4.5, uso: 'Texto de acento dentro de un marco' },
  { sobre: 'acento-tinta', fondo: 'hundido', minimo: 4.5, uso: 'Nombre de la tónica en la rejilla' },
  { sobre: 'sobre-exito', fondo: 'exito', minimo: 4.5, uso: 'Rótulo de acierto y opción acertada (rellena)' },
  { sobre: 'exito-tinta', fondo: 'superficie', minimo: 4.5, uso: 'Opción correcta que no se había elegido' },
  { sobre: 'sobre-error', fondo: 'error', minimo: 4.5, uso: 'Rótulo de fallo y opción fallada (rellena)' },
  { sobre: 'error-tinta', fondo: 'superficie', minimo: 4.5, uso: 'Texto de error dentro de un marco' },
  { sobre: 'fondo', fondo: 'tinta', minimo: 4.5, uso: 'Rótulo de un marco (texto invertido)' },
  { sobre: 'superficie', fondo: 'tinta', minimo: 4.5, uso: 'Sección activa de la navegación (invertida)' },
  { sobre: 'tinta', fondo: 'boton-relleno', minimo: 4.5, uso: 'Texto de un botón secundario' },
  { sobre: 'borde', fondo: 'fondo', minimo: 3, uso: 'Borde de un marco contra el fondo' },
  { sobre: 'acento-tinta', fondo: 'fondo', minimo: 3, uso: 'Contorno de foco' },
]

/** Papeles de pista que tienen color propio en el piano roll. */
export const COLORES_DE_PISTA = ['pista-melodia', 'pista-contramelodia', 'pista-armonia', 'pista-colchon', 'pista-bajo', 'pista-percusion', 'pista-efecto'] as const

/** Fondos de la rejilla sobre los que puede caer una nota. */
export const FONDOS_DE_REJILLA = ['rejilla-fila-clara', 'rejilla-fila-oscura', 'rejilla-tonica'] as const

export interface Medida extends Pareja {
  valor: number
  cumple: boolean
}

/** Mide todas las parejas en un esquema. Lanza un error si falta algún color. */
export function medir(colores: Colores): Medida[] {
  const color = (nombre: string): string => {
    const valor = colores[nombre]
    if (!valor) throw new Error(`Falta el color --${nombre}.`)
    return valor
  }
  const medidas: Medida[] = PAREJAS.map((pareja) => {
    const valor = contraste(color(pareja.sobre), color(pareja.fondo))
    return { ...pareja, valor, cumple: valor >= pareja.minimo }
  })
  // Una nota del piano roll se distingue de la rejilla por su relleno o, si no llega, por su contorno.
  for (const pista of COLORES_DE_PISTA) {
    for (const fondo of FONDOS_DE_REJILLA) {
      const valor = Math.max(contraste(color(pista), color(fondo)), contraste(color('nota-contorno'), color(fondo)))
      medidas.push({ sobre: `${pista} (o su contorno)`, fondo, minimo: 3, uso: 'Nota en el piano roll', valor, cumple: valor >= 3 })
    }
  }
  return medidas
}
