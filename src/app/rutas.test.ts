import { describe, expect, it } from 'vitest'
import { type Ruta, escribirRuta, leerRuta } from './rutas.ts'

describe('rutas', () => {
  it('lee la pantalla de título cuando no hay fragmento', () => {
    expect(leerRuta('')).toEqual({ pantalla: 'titulo' })
    expect(leerRuta('#')).toEqual({ pantalla: 'titulo' })
    expect(leerRuta('#/')).toEqual({ pantalla: 'titulo' })
  })

  it('lee las pantallas sin parámetros', () => {
    expect(leerRuta('#/mapa')).toEqual({ pantalla: 'mapa' })
    expect(leerRuta('#/ajustes')).toEqual({ pantalla: 'ajustes' })
    expect(leerRuta('#/pianoroll')).toEqual({ pantalla: 'pianoroll' })
  })

  it('lee un mundo y una lección con su paso', () => {
    expect(leerRuta('#/mundo/m03')).toEqual({ pantalla: 'mundo', id: 'm03' })
    expect(leerRuta('#/leccion/m00.u01.l02/4')).toEqual({ pantalla: 'leccion', id: 'm00.u01.l02', paso: 4 })
  })

  it('lee una ficha y una pieza del repertorio por su identificador', () => {
    expect(leerRuta('#/ficha/intervalos')).toEqual({ pantalla: 'ficha', id: 'intervalos' })
    expect(leerRuta('#/pianoroll/3f2a-77')).toEqual({ pantalla: 'pianoroll', id: '3f2a-77' })
    expect(leerRuta('#/prueba')).toEqual({ pantalla: 'prueba' })
    expect(leerRuta('#/calibracion')).toEqual({ pantalla: 'calibracion' })
  })

  it('un identificador con caracteres raros no vale', () => {
    expect(leerRuta('#/ficha/..%2F..')).toEqual({ pantalla: 'mapa' })
    expect(leerRuta('#/ficha')).toEqual({ pantalla: 'mapa' })
    expect(leerRuta('#/pianoroll/<script>')).toEqual({ pantalla: 'pianoroll' })
  })

  it('empieza por el primer paso si falta o no es un número válido', () => {
    expect(leerRuta('#/leccion/m00.u01.l02')).toEqual({ pantalla: 'leccion', id: 'm00.u01.l02', paso: 1 })
    expect(leerRuta('#/leccion/m00.u01.l02/0')).toEqual({ pantalla: 'leccion', id: 'm00.u01.l02', paso: 1 })
    expect(leerRuta('#/leccion/m00.u01.l02/dos')).toEqual({ pantalla: 'leccion', id: 'm00.u01.l02', paso: 1 })
  })

  it('manda al mapa lo que no reconoce', () => {
    expect(leerRuta('#/no-existe')).toEqual({ pantalla: 'mapa' })
    expect(leerRuta('#/leccion/otra-cosa/1')).toEqual({ pantalla: 'mapa' })
    expect(leerRuta('#/mundo/x')).toEqual({ pantalla: 'mapa' })
  })

  it('escribe y vuelve a leer la misma ruta', () => {
    const rutas: Ruta[] = [
      { pantalla: 'titulo' },
      { pantalla: 'mapa' },
      { pantalla: 'mundo', id: 'm10' },
      { pantalla: 'leccion', id: 'm01.u04.l08', paso: 7 },
      { pantalla: 'repertorio' },
      { pantalla: 'diagnostico' },
      { pantalla: 'ficha', id: 'acordes' },
      { pantalla: 'pianoroll' },
      { pantalla: 'pianoroll', id: 'abc-123' },
      { pantalla: 'prueba' },
      { pantalla: 'calibracion' },
    ]
    for (const ruta of rutas) expect(leerRuta(escribirRuta(ruta))).toEqual(ruta)
  })
})
