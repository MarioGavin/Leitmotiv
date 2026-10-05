import { describe, expect, it } from 'vitest'
import { AJUSTES_INICIALES } from '../app/ajustes.ts'
import { piezaDePrueba } from '../musica/piezas-de-prueba.ts'
import { type CopiaDeSeguridad, ErrorDeCopia, crearCopia, leerCopia, nombreDeCopia } from './copia.ts'
import { alCompletarLeccion, alRepasar, alSuperarUnidades, aplicarCambios } from './operaciones.ts'
import { type DatosDeProgreso, PROGRESO_VACIO } from './tipos.ts'

const AHORA = new Date(2026, 9, 5, 10, 30)
const PIEZA = piezaDePrueba(
  [
    { rol: 'melodia', notas: 'D5:4 F#5:4 A5:2 | D5:1', capa: 'tema' },
    { rol: 'percusion', instrumento: 'bateria', notas: 'bombo:4 caja:4 bombo:4 caja:4 | %' },
  ],
  { titulo: 'Fanfarria', tonalidad: 'D mayor', bucle: true, swing: 0.3, acordesTexto: 'D:1 | D:1', secciones: [{ id: 'a', nombre: 'Entrada', desde: 1, hasta: 2 }] },
)

/** Un progreso con un poco de todo. */
function progreso(): DatosDeProgreso {
  let datos = PROGRESO_VACIO
  const pasos = [
    alCompletarLeccion(datos, { id: 'm00.u01.l01', conEncargo: false, conceptos: { pulso: { aciertos: 2, total: 3 } } }, AHORA).cambios,
    alSuperarUnidades(datos, ['m00.u02'], AHORA).cambios,
  ]
  for (const cambios of pasos) datos = aplicarCambios(datos, cambios)
  datos = aplicarCambios(datos, alRepasar(datos, [{ concepto: 'pulso', paso: 'm00.u01.l01#2', resultado: { aciertos: 1, total: 1 } }], new Date(2026, 9, 8, 9)).cambios)
  return {
    ...datos,
    repertorio: [{ id: 'p1', titulo: 'Fanfarria', pieza: PIEZA, origen: 'm00.u01.l08', creada: AHORA.toISOString(), modificada: AHORA.toISOString() }],
    borradores: { 'm00.u02.l08#4': { id: 'm00.u02.l08#4', pieza: PIEZA, modificada: AHORA.toISOString() } },
  }
}

const AJUSTES = { ...AJUSTES_INICIALES, esquema: 'claro' as const, nomenclatura: 'anglosajona' as const, latenciaMs: 60 }

/** Un rincón de la copia, sin tipos: para estropearla a mano. */
function en(raiz: unknown, ...ruta: Array<string | number>): Record<string, unknown> {
  let actual = raiz as Record<string | number, unknown>
  for (const paso of ruta) actual = actual[paso] as Record<string | number, unknown>
  return actual as Record<string, unknown>
}

/** Copia en texto, con un cambio hecho a mano. */
function estropeada(cambio: (copia: CopiaDeSeguridad) => void): string {
  const copia = JSON.parse(JSON.stringify(crearCopia(progreso(), AJUSTES, AHORA))) as CopiaDeSeguridad
  cambio(copia)
  return JSON.stringify(copia)
}

describe('copia de seguridad', () => {
  it('lo que se guarda en una copia se recupera idéntico', () => {
    const datos = progreso()
    const texto = JSON.stringify(crearCopia(datos, AJUSTES, AHORA))
    const leida = leerCopia(texto)
    expect(leida.datos).toEqual(datos)
    expect(leida.ajustes).toEqual(AJUSTES)
    expect(leida.creada).toBe(AHORA.toISOString())
  })

  it('una copia de un progreso vacío también vale', () => {
    expect(leerCopia(JSON.stringify(crearCopia(PROGRESO_VACIO, AJUSTES_INICIALES, AHORA))).datos).toEqual(PROGRESO_VACIO)
  })

  it('el archivo lleva la fecha en el nombre', () => {
    expect(nombreDeCopia(AHORA)).toBe('leitmotiv-copia-2026-10-05.json')
    expect(nombreDeCopia(new Date(2027, 0, 3))).toBe('leitmotiv-copia-2027-01-03.json')
  })
})

describe('archivos que no son una copia', () => {
  it('rechaza lo que no es JSON o no es de la app', () => {
    for (const texto of ['', 'hola', '[]', '42', 'null', '{"app":"otra"}', '{"formato":1}']) {
      expect(() => leerCopia(texto)).toThrow(ErrorDeCopia)
      expect(() => leerCopia(texto)).toThrow('Ese archivo no es una copia de seguridad de Leitmotiv.')
    }
  })

  it('rechaza una copia de una versión más nueva y dice por qué', () => {
    expect(() => leerCopia(estropeada((c) => (c.formato = 99)))).toThrow(/versión más nueva/)
  })

  it('unos ajustes rotos no impiden recuperar el progreso', () => {
    const leida = leerCopia(estropeada((c) => (c.ajustes = 'nada' as never)))
    expect(leida.ajustes).toEqual(AJUSTES_INICIALES)
    expect(leida.datos).toEqual(progreso())
  })
})

describe('copias dañadas', () => {
  const casos: Array<[string, (c: CopiaDeSeguridad) => void, RegExp]> = [
    ['falta el progreso', (c) => delete (c as Partial<CopiaDeSeguridad>).progreso, /el progreso no tiene la forma esperada/],
    ['las lecciones no son una lista', (c) => (en(c, 'progreso').lecciones = {}), /la lista de lecciones debería ser una lista/],
    ['una lección con un identificador imposible', (c) => (en(c, 'progreso', 'lecciones', 0).id = '../../etc'), /la lección 1 \(id\) no es válido/],
    ['una nota fuera de rango', (c) => (en(c, 'progreso', 'lecciones', 0).mejor = 7), /la lección 1 \(mejor\) no es un número válido/],
    ['una lección repetida', (c) => c.progreso.lecciones.push(c.progreso.lecciones[0] as never), /dos registros de «m00.u01.l01»/],
    ['una fecha que no lo es', (c) => (en(c, 'progreso', 'tarjetas', 0, 'fsrs').due = 'mañana'), /el repaso 1 \(fsrs\)\.due no es una fecha/],
    ['un día mal escrito', (c) => (en(c, 'progreso', 'diario', 0).dia = '5 de octubre'), /el día 1 del diario \(dia\) no es válido/],
    ['experiencia negativa', (c) => (en(c, 'progreso', 'diario', 0).xp = -5), /\(xp\) no es un número válido/],
    ['una unidad superada que no es una unidad', (c) => (c.progreso.superadas = ['todas']), /la unidad superada 1 no es válido/],
    ['una pieza con un instrumento que no existe', (c) => (en(c, 'progreso', 'repertorio', 0, 'pieza', 'pistas', 0).instrumento = 'theremin'), /nombra un instrumento que no existe \(«theremin»\)/],
    ['una nota que no es un número', (c) => (en(c, 'progreso', 'repertorio', 0, 'pieza', 'pistas', 0, 'notas', 0).n = 'C4'), /notas\[0\]\.n no es un número válido/],
    ['una nota sin duración', (c) => (en(c, 'progreso', 'repertorio', 0, 'pieza', 'pistas', 0, 'notas', 0).d = 0), /notas\[0\]\.d no es un número válido/],
    ['un compás imposible', (c) => (en(c, 'progreso', 'repertorio', 0, 'pieza').compas = [4, 3]), /no es un compás/],
    ['un tempo absurdo', (c) => (en(c, 'progreso', 'repertorio', 0, 'pieza').tempo = 9000), /tempo no es un número válido/],
    ['un borrador de un paso que no existe', (c) => (en(c, 'progreso', 'borradores', 0).id = 'm00#1'), /el borrador 1 \(id\) no es válido/],
    ['dos piezas con el mismo identificador', (c) => c.progreso.repertorio.push(c.progreso.repertorio[0] as never), /dos piezas con el mismo identificador/],
  ]

  for (const [nombre, cambio, mensaje] of casos) {
    it(`rechaza ${nombre}`, () => {
      const texto = estropeada(cambio)
      expect(() => leerCopia(texto)).toThrow(ErrorDeCopia)
      expect(() => leerCopia(texto)).toThrow(mensaje)
    })
  }

  it('los campos que no conoce se descartan sin protestar', () => {
    const leida = leerCopia(
      estropeada((c) => {
        en(c, 'progreso', 'lecciones', 0).inventado = 'x'
        en(c, 'progreso', 'repertorio', 0, 'pieza').sorpresa = { malo: true }
        en(c).extra = [1, 2, 3]
      }),
    )
    expect(leida.datos).toEqual(progreso())
  })
})
