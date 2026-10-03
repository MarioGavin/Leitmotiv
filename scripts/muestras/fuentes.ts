/**
 * Bancos de sonido de origen. Cada entrada apunta a un repositorio público en un
 * commit concreto, con la licencia comprobada en el propio repositorio (archivo
 * LICENSE o README) el 3 de octubre de 2026. Solo se admiten CC0, dominio
 * público, CC-BY o equivalente. CREDITS.md se comprueba contra esta tabla.
 */
import { execFile } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'

const exec = promisify(execFile)

export interface Fuente {
  nombre: string
  url: string
  commit: string
  licencia: 'CC0-1.0' | 'Dominio público' | 'CC-BY-3.0' | 'CC-BY-4.0'
  /** Dónde consta la licencia dentro del repositorio. */
  constaEn: string
  autores: string
  /** Si la licencia exige atribución, el texto exacto que hay que mostrar. */
  atribucion?: string
  notas?: string
}

export const FUENTES = {
  splendid: {
    nombre: 'Splendid Grand Piano',
    url: 'https://github.com/sfzinstruments/SplendidGrandPiano',
    commit: '1c595d827b7fd7f0be3134aaed0f90b3662a09cf',
    licencia: 'Dominio público',
    constaEn: 'README.md («Public Domain samples by AKAI»)',
    autores: 'Muestras de un Steinway publicadas por AKAI; conversión a FLAC y mapeo SFZ de kinwie',
    notas:
      'Se usan las muestras de la capa MF y el mapa de notas de Data/MF.txt. El repositorio pide indicar la procedencia si se redistribuye un derivado de su SFZ: queda indicada aquí.',
  },
  vsco2ce: {
    nombre: 'VSCO 2: Community Edition',
    url: 'https://github.com/sgossner/VSCO-2-CE',
    commit: '440300901dfe9275fd84e0b7763af1f8443ae62e',
    licencia: 'CC0-1.0',
    constaEn: 'LICENSE (CC0 1.0 Universal)',
    autores: 'Versilian Studios: grabación de Sam Gossner y Simon Dalzell; corte de muestras de Elan Hickler (Soundemote)',
  },
  virtuosity: {
    nombre: 'Virtuosity Drums',
    url: 'https://github.com/sfzinstruments/virtuosity_drums',
    commit: '9f04cf9a734527edfbb0a4eee1f674e45bbf71bc',
    licencia: 'CC0-1.0',
    constaEn: 'LICENSE (CC0 1.0 Universal)',
    autores: 'Versilian Studios; batería tocada por Austin McMahon y grabada en Virtuosity Musical Instruments (Boston)',
  },
  growlybass: {
    nombre: 'Growlybass',
    url: 'https://github.com/sfzinstruments/karoryfer.growlybass',
    commit: '4f483268fc66b5a6d5781d421c0d11b8d08d3fc6',
    licencia: 'CC0-1.0',
    constaEn: 'LICENSE (CC0 1.0 Universal)',
    autores: 'Karoryfer Lecolds (Squier Jazz Bass grabado por línea)',
  },
} as const satisfies Record<string, Fuente>

export type IdFuente = keyof typeof FUENTES

const RAIZ_CACHE = path.resolve(import.meta.dirname, '../../.cache/fuentes')

/**
 * Descarga solo los archivos pedidos de un repositorio (clon sin blobs) y
 * devuelve la carpeta local donde quedan.
 */
export async function obtenerArchivos(id: IdFuente, rutas: readonly string[]): Promise<string> {
  const fuente: Fuente = FUENTES[id]
  const dir = path.join(RAIZ_CACHE, id)
  if (!existsSync(path.join(dir, '.git'))) {
    mkdirSync(RAIZ_CACHE, { recursive: true })
    await exec('git', ['clone', '--quiet', '--filter=blob:none', '--no-checkout', `${fuente.url}.git`, dir], { maxBuffer: 1 << 26 })
  }
  const faltan = rutas.filter((r) => !existsSync(path.join(dir, r)))
  for (let i = 0; i < faltan.length; i += 40) {
    const lote = faltan.slice(i, i + 40)
    await exec('git', ['-C', dir, '-c', 'gc.auto=0', 'checkout', fuente.commit, '--', ...lote], { maxBuffer: 1 << 26 })
  }
  return dir
}

/** Lista todos los archivos del repositorio en el commit fijado, sin descargar su contenido. */
export async function listarArchivos(id: IdFuente): Promise<string[]> {
  const fuente: Fuente = FUENTES[id]
  const dir = await obtenerArchivos(id, [])
  const { stdout } = await exec('git', ['-C', dir, '-c', 'core.quotepath=off', 'ls-tree', '-r', '--name-only', fuente.commit], {
    maxBuffer: 1 << 26,
  })
  return stdout.split('\n').filter(Boolean)
}
