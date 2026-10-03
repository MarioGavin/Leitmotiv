/**
 * Capturas de pantalla de la app, para revisar el diseño sin un móvil delante.
 *
 *   npm run shots                       → todas las escenas, direcciones, esquemas y tamaños
 *   npm run shots -- --escena=mapa      → solo una escena
 *   npm run shots -- --direccion=vinilo --esquema=claro --tam=360x640
 *   npm run shots -- --completa         → la página entera, no solo lo que cabe en la pantalla
 *   npm run shots -- --hojas            → además, una hoja de contactos por dirección (todas sus capturas juntas)
 *
 * Escribe en informes/capturas. Usa el servidor de desarrollo de Vite y el
 * Chromium de Playwright.
 */
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { type Page, chromium } from '@playwright/test'
import sharp, { type OverlayOptions } from 'sharp'
import { createServer } from 'vite'

const RAIZ = path.resolve(import.meta.dirname, '..')
const DESTINO = path.join(RAIZ, 'informes/capturas')
const PUERTO = 5188

interface Escena {
  nombre: string
  /** Fragmento de la URL: «#/mapa». */
  ruta: string
  /** Lo que hay que hacer en la página antes de capturar (elegir una opción, abrir algo…). */
  preparar?: (pagina: Page) => Promise<void>
  /** Si no es `true`, la escena solo se captura cuando se pide por su nombre. */
  principal?: boolean
}

const ESCENAS: readonly Escena[] = [
  { nombre: 'mapa', ruta: '#/mapa', principal: true },
  { nombre: 'mundo', ruta: '#/mundo/m00' },
  { nombre: 'leccion-teoria', ruta: '#/leccion/m00.u01.l02/1' },
  {
    nombre: 'leccion-ejercicio',
    ruta: '#/leccion/m00.u01.l02/2',
    principal: true,
    preparar: async (pagina) => {
      await pagina.getByRole('radio').nth(1).click()
    },
  },
  {
    nombre: 'leccion-correccion',
    ruta: '#/leccion/m00.u01.l02/2',
    preparar: async (pagina) => {
      await pagina.getByRole('radio').nth(1).click()
      await pagina.getByRole('button', { name: 'Comprobar' }).click()
      await pagina.getByRole('status').first().waitFor()
    },
  },
  {
    nombre: 'leccion-pista',
    ruta: '#/leccion/m00.u01.l02/2',
    preparar: async (pagina) => {
      await pagina.getByRole('button', { name: 'Pista' }).click()
    },
  },
  {
    nombre: 'glosario-ventana',
    ruta: '#/leccion/m00.u01.l02/1',
    preparar: async (pagina) => {
      await pagina.getByRole('button', { name: 'pulso', exact: true }).click()
      await pagina.getByRole('dialog').waitFor()
    },
  },
  { nombre: 'leccion-completada', ruta: '#/leccion/m00.u01.l02/6' },
  { nombre: 'pianoroll', ruta: '#/pianoroll', principal: true },
  { nombre: 'titulo', ruta: '#/' },
  { nombre: 'ajustes', ruta: '#/ajustes' },
  { nombre: 'muestrario', ruta: '#/muestrario' },
  { nombre: 'diagnostico', ruta: '#/diagnostico' },
]

const DIRECCIONES = ['cartucho', 'vinilo'] as const
const ESQUEMAS = ['oscuro', 'claro'] as const
const TAMANOS = [
  { ancho: 390, alto: 844 },
  { ancho: 360, alto: 640 },
] as const

function argumento(nombre: string): string | undefined {
  const prefijo = `--${nombre}=`
  return process.argv.find((a) => a.startsWith(prefijo))?.slice(prefijo.length)
}

const soloEscena = argumento('escena')
const soloDireccion = argumento('direccion')
const soloEsquema = argumento('esquema')
const soloTam = argumento('tam')
const completa = process.argv.includes('--completa')
const hojas = process.argv.includes('--hojas')

const escenas = ESCENAS.filter((e) => (soloEscena ? soloEscena.split(',').includes(e.nombre) : e.principal))
const direcciones = DIRECCIONES.filter((d) => !soloDireccion || d === soloDireccion)
const esquemas = ESQUEMAS.filter((e) => !soloEsquema || e === soloEsquema)
const tamanos = TAMANOS.filter((t) => !soloTam || `${t.ancho}x${t.alto}` === soloTam)

if (escenas.length === 0) {
  console.error(`No hay ninguna escena con ese nombre. Disponibles: ${ESCENAS.map((e) => e.nombre).join(', ')}.`)
  process.exit(1)
}

mkdirSync(DESTINO, { recursive: true })

const servidor = await createServer({ root: RAIZ, logLevel: 'error', server: { port: PUERTO, strictPort: true, host: '127.0.0.1' } })
await servidor.listen()
const navegador = await chromium.launch()
const hechas: Array<{ archivo: string; escena: string; direccion: string; esquema: string; tam: string }> = []
let fallos = 0

try {
  for (const tam of tamanos) {
    for (const direccion of direcciones) {
      for (const esquema of esquemas) {
        const contexto = await navegador.newContext({
          viewport: { width: tam.ancho, height: tam.alto },
          deviceScaleFactor: 2,
          hasTouch: true,
          isMobile: true,
          colorScheme: esquema === 'oscuro' ? 'dark' : 'light',
          reducedMotion: 'reduce',
        })
        await contexto.addInitScript(
          ([d, e]) => {
            localStorage.setItem('leitmotiv-ajustes', JSON.stringify({ state: { direccion: d, esquema: e, nomenclatura: 'latina', sonidosDeInterfaz: true }, version: 1 }))
          },
          [direccion, esquema] as const,
        )
        for (const escena of escenas) {
          const pagina = await contexto.newPage()
          const errores: string[] = []
          pagina.on('pageerror', (e) => errores.push(e.message))
          pagina.on('console', (m) => {
            if (m.type() === 'error') errores.push(m.text())
          })
          await pagina.goto(`http://127.0.0.1:${PUERTO}/${escena.ruta}`)
          await pagina.waitForLoadState('networkidle')
          await pagina.evaluate(() => document.fonts.ready)
          await escena.preparar?.(pagina)
          await pagina.waitForTimeout(250)
          const tamTexto = `${tam.ancho}x${tam.alto}`
          const archivo = path.join(DESTINO, `${escena.nombre}-${direccion}-${esquema}-${tamTexto}${completa ? '-completa' : ''}.png`)
          await pagina.screenshot({ path: archivo, fullPage: completa })
          hechas.push({ archivo, escena: escena.nombre, direccion, esquema, tam: tamTexto })
          if (errores.length > 0) {
            fallos++
            console.error(`  ERRORES en ${escena.nombre} (${direccion}, ${esquema}, ${tamTexto}):\n    ${errores.join('\n    ')}`)
          }
          await pagina.close()
        }
        await contexto.close()
      }
    }
  }
} finally {
  await navegador.close()
  await servidor.close()
}

console.log(`${hechas.length} capturas en informes/capturas.`)

const TITULOS: Readonly<Record<string, string>> = {
  mapa: 'Mapa del mundo',
  mundo: 'Un mundo por dentro',
  'leccion-teoria': 'Paso de teoría',
  'leccion-ejercicio': 'Paso con ejercicio',
  'leccion-correccion': 'Corrección de un fallo',
  'leccion-pista': 'Pista',
  'leccion-completada': 'Lección completada',
  'glosario-ventana': 'Término del glosario',
  pianoroll: 'Piano roll',
  titulo: 'Título',
  ajustes: 'Ajustes',
  muestrario: 'Muestrario',
  diagnostico: 'Diagnóstico de audio',
}

function rotulo(texto: string, ancho: number, cuerpo: number): Buffer {
  const seguro = texto.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${cuerpo * 2}"><text x="0" y="${cuerpo * 1.3}" font-family="DejaVu Sans, Arial, sans-serif" font-size="${cuerpo}" font-weight="bold" fill="#ffffff">${seguro}</text></svg>`,
  )
}

/**
 * Hoja de contactos de una dirección: una columna por escena y esquema, y una
 * fila por tamaño de pantalla. Las capturas van a tamaño real (1 px de CSS = 1 px).
 */
async function hojaDeContactos(direccion: string): Promise<void> {
  const lista = hechas.filter((c) => c.direccion === direccion)
  if (lista.length === 0) return
  const columnas = escenas.flatMap((e) => esquemas.map((esquema) => ({ escena: e.nombre, esquema })))
  const filas = tamanos.map((t) => ({ ...t, tam: `${t.ancho}x${t.alto}` }))
  const margen = 28
  const cabecera = 72
  const pie = 34
  const anchoDeColumna = Math.max(...filas.map((f) => f.ancho))
  const total = {
    width: margen + columnas.length * (anchoDeColumna + margen),
    height: cabecera + filas.reduce((suma, f) => suma + pie + f.alto + margen, 0),
  }
  const piezas: OverlayOptions[] = [
    { input: rotulo(`Leitmotiv — dirección «${direccion[0]?.toUpperCase()}${direccion.slice(1)}»`, total.width - margen * 2, 28), left: margen, top: 16 },
  ]
  let y = cabecera
  for (const fila of filas) {
    for (const [i, columna] of columnas.entries()) {
      const captura = lista.find((c) => c.escena === columna.escena && c.esquema === columna.esquema && c.tam === fila.tam)
      if (!captura) continue
      const x = margen + i * (anchoDeColumna + margen)
      piezas.push({ input: rotulo(`${TITULOS[columna.escena] ?? columna.escena}, ${columna.esquema} (${fila.ancho} × ${fila.alto})`, anchoDeColumna, 15), left: x, top: y })
      piezas.push({ input: await sharp(captura.archivo).resize(fila.ancho, fila.alto, { fit: 'cover', position: 'top' }).toBuffer(), left: x, top: y + pie })
    }
    y += pie + fila.alto + margen
  }
  const salida = path.join(DESTINO, `hoja-${direccion}${soloEscena ? `-${escenas.map((e) => e.nombre).join('+')}` : ''}.png`)
  await sharp({ create: { ...total, channels: 3, background: '#2b2b2b' } })
    .composite(piezas)
    .png()
    .toFile(salida)
  console.log(`Hoja de contactos: ${path.relative(RAIZ, salida)}`)
}

if (hojas && !completa) {
  for (const direccion of direcciones) await hojaDeContactos(direccion)
}

if (fallos > 0) {
  console.error(`${fallos} escenas con errores de consola.`)
  process.exit(1)
}
