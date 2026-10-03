import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { INSTRUMENTOS } from '../../src/musica/instrumentos.ts'
import { FUENTES } from './fuentes.ts'

const RAIZ = path.resolve(import.meta.dirname, '../..')
const creditos = readFileSync(path.join(RAIZ, 'CREDITS.md'), 'utf8')
const indice = JSON.parse(readFileSync(path.join(RAIZ, 'public/samples/indice.json'), 'utf8')) as {
  instrumentos: Record<string, { bytes: number; archivos: string[]; licencia: string; fuente: string }>
}
const paquete = JSON.parse(readFileSync(path.join(RAIZ, 'package.json'), 'utf8')) as {
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
}

/** Licencias con las que se puede redistribuir un banco de sonidos en la app. */
const LICENCIAS_ADMITIDAS = ['CC0-1.0', 'Dominio público', 'CC-BY-3.0', 'CC-BY-4.0']

function licenciaDe(nombre: string): string {
  const datos = JSON.parse(readFileSync(path.join(RAIZ, 'node_modules', nombre, 'package.json'), 'utf8')) as { license?: string }
  return datos.license ?? ''
}

describe('CREDITS.md', () => {
  it.each(Object.entries(FUENTES))('recoge el banco «%s» con su repositorio, su commit y su licencia', (_id, fuente) => {
    expect(creditos).toContain(fuente.nombre)
    expect(creditos).toContain(fuente.url)
    expect(creditos).toContain(fuente.commit)
    expect(creditos).toContain(fuente.licencia)
    expect(LICENCIAS_ADMITIDAS).toContain(fuente.licencia)
  })

  it('cada instrumento muestreado sale de un banco conocido y con la licencia que consta', () => {
    const muestreados = Object.entries(INSTRUMENTOS)
      .filter(([, instrumento]) => instrumento.tipo === 'muestras')
      .map(([id]) => id)
    expect(Object.keys(indice.instrumentos).sort()).toEqual(muestreados.sort())
    for (const [id, datos] of Object.entries(indice.instrumentos)) {
      const fuente = (FUENTES as Record<string, { licencia: string; nombre: string }>)[datos.fuente]
      expect(fuente, `El instrumento «${id}» apunta a la fuente «${datos.fuente}», que no está en fuentes.ts`).toBeDefined()
      expect(datos.licencia).toBe(fuente?.licencia)
      // El instrumento aparece en la tabla de CREDITS.md con su identificador.
      expect(creditos).toContain(`(\`${id}\`)`)
    }
  })

  it('el número de muestras que dice de cada banco es el que hay', () => {
    const cuenta = (id: string): number => indice.instrumentos[id]?.archivos.length ?? 0
    expect(creditos).toContain(`${cuenta('piano')} muestras de la capa`)
    expect(creditos).toContain(`${cuenta('cuerdas')} notas sostenidas con vibrato`)
    expect(creditos).toContain(`${cuenta('bateria')} golpes de bombo`)
    expect(creditos).toContain(`${cuenta('bajo-electrico')} notas sostenidas tocadas fuerte`)
  })

  it.each(Object.keys(paquete.dependencies))('recoge la librería «%s» con su licencia', (nombre) => {
    const fila = creditos.split('\n').find((linea) => linea.includes(`\`${nombre}\``))
    expect(fila, `Falta «${nombre}» en la tabla de librerías`).toBeDefined()
    expect(fila).toContain(licenciaDe(nombre))
  })

  it('recoge todas las tipografías instaladas, con su licencia', () => {
    const fuentes = Object.keys(paquete.devDependencies).filter((nombre) => nombre.startsWith('@fontsource'))
    expect(fuentes.length).toBeGreaterThan(0)
    for (const nombre of fuentes) {
      const fila = creditos.split('\n').find((linea) => linea.includes(`\`${nombre}\``))
      expect(fila, `Falta «${nombre}» en la tabla de tipografías`).toBeDefined()
      expect(fila).toContain(licenciaDe(nombre))
    }
  })
})
