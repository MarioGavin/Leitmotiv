/**
 * Verificación de audio sin altavoces.
 *
 *   npm run audio:check
 *
 * Renderiza con el motor real (en Chromium sin interfaz, con OfflineAudioContext)
 * una batería de casos y todos los ejemplos del contenido, y mide lo que se
 * puede medir sin oír: que cada nota suena a la altura que dice, que empieza
 * cuando toca, que nada satura ni queda en silencio, y la sonoridad de cada
 * ejemplo. Lo que hay que juzgar de oído está en AUDIO_REVIEW.md.
 */
import { execFile } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import { chromium } from '@playwright/test'
import { createServer } from 'vite'
import type { Leccion, Paso, TerminoDeGlosario } from '../../src/contenido/tipos.ts'
import { INSTRUMENTOS, type IdInstrumento, type Instrumento } from '../../src/musica/instrumentos.ts'
import type { Pieza } from '../../src/musica/pieza.ts'
import { SR, aDb, detectarTono, detectarTonoAgudo, midiAHz, pico, rms } from '../muestras/dsp.ts'

const exec = promisify(execFile)
const RAIZ = path.resolve(import.meta.dirname, '../..')
const TMP = path.join(RAIZ, 'informes/tmp')
const guardarWav = process.argv.includes('--guardar')

interface Medida {
  caso: string
  ok: boolean
  detalle: string
  datos: Record<string, number | string>
}

function leerWav(bytes: Buffer): { canales: Float32Array[]; sr: number } {
  const canales = bytes.readUInt16LE(22)
  const sr = bytes.readUInt32LE(24)
  const n = (bytes.length - 44) / 2 / canales
  const datos = Array.from({ length: canales }, () => new Float32Array(n))
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < canales; c++) (datos[c] as Float32Array)[i] = bytes.readInt16LE(44 + (i * canales + c) * 2) / 32768
  }
  return { canales: datos, sr }
}

/** Sonoridad integrada (LUFS) y pico real (dBTP) según EBU R128, medidos con ffmpeg. */
async function sonoridad(archivo: string): Promise<{ lufs: number; picoReal: number }> {
  const { stderr } = await exec('ffmpeg', ['-hide_banner', '-nostats', '-i', archivo, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { maxBuffer: 1 << 26 })
  const resumen = stderr.slice(stderr.lastIndexOf('Summary:'))
  const lufs = Number(/I:\s+(-?[\d.]+) LUFS/.exec(resumen)?.[1] ?? Number.NaN)
  const picoReal = Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(resumen)?.[1] ?? Number.NaN)
  return { lufs, picoReal }
}

function primerSonido(x: Float32Array, umbral: number): number {
  for (let i = 0; i < x.length; i++) if (Math.abs(x[i] ?? 0) > umbral) return i
  return -1
}

function notaSuelta(instrumento: IdInstrumento, nota: number, velocidad = 100): Pieza {
  // A 60 negras por minuto un tick son 1/480 s: la nota empieza en el segundo 1 y dura 2.
  return { tempo: 60, compas: [4, 4], compases: 1, pistas: [{ id: 'p', rol: 'melodia', instrumento, notas: [{ t: 480, d: 960, n: nota, v: velocidad }] }] }
}

/** Todas las piezas que aparecen en una lección compilada, con un nombre que diga dónde están. */
function piezasDe(leccion: Leccion): Array<{ nombre: string; pieza: Pieza }> {
  const salida: Array<{ nombre: string; pieza: Pieza }> = []
  const anotar = (nombre: string, pieza: Pieza | undefined): void => {
    if (pieza && pieza.pistas.some((p) => p.notas.length > 0)) salida.push({ nombre: `${leccion.id} ${nombre}`, pieza })
  }
  leccion.pasos.forEach((paso: Paso, i) => {
    const n = `paso ${i + 1} (${paso.tipo})`
    if (paso.tipo === 'teoria') anotar(n, paso.ejemplo)
    else if (paso.tipo === 'oido' && paso.modo === 'preguntas') paso.preguntas.forEach((q, k) => anotar(`${n} pregunta ${k + 1}`, q.pieza))
    else if (paso.tipo === 'construccion' || paso.tipo === 'analisis' || paso.tipo === 'capas') anotar(n, paso.pieza)
    else if (paso.tipo === 'pianoroll' || paso.tipo === 'encargo') anotar(n, paso.plantilla)
  })
  return salida
}

async function principal(): Promise<void> {
  mkdirSync(TMP, { recursive: true })
  const servidor = await createServer({ root: RAIZ, logLevel: 'error', server: { port: 5187, strictPort: true } })
  await servidor.listen()
  const navegador = await chromium.launch()
  const pagina = await navegador.newPage()
  pagina.on('pageerror', (e) => console.error('[página]', e.message))
  pagina.on('console', (m) => {
    if (m.type() === 'error') console.error('[consola]', m.text())
  })
  await pagina.goto('http://localhost:5187/scripts/audio/arnes.html')
  await pagina.waitForFunction(() => typeof window.renderizar === 'function')

  const medidas: Medida[] = []
  let indice = 0
  const renderizar = async (nombre: string, pieza: Pieza, opciones: Record<string, unknown> = {}) => {
    const base64 = await pagina.evaluate(([p, o]) => window.renderizar(p as Pieza, o as never), [pieza, opciones] as const)
    const bytes = Buffer.from(base64, 'base64')
    const archivo = path.join(TMP, `${String(indice++).padStart(3, '0')}-${nombre.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.wav`)
    writeFileSync(archivo, bytes)
    return { ...leerWav(bytes), archivo }
  }

  // ── 1. Cada instrumento afinado suena a la altura pedida y entra a tiempo ──
  for (const id of Object.keys(INSTRUMENTOS) as IdInstrumento[]) {
    const inst: Instrumento = INSTRUMENTOS[id]
    if (inst.percusion) {
      for (const [alias, pieza] of Object.entries(inst.percusion)) {
        const { canales, sr } = await renderizar(`${id}-${alias}`, notaSuelta(id, pieza.tecla, 110), { limitador: false, nivelDb: 0 })
        const x = canales[0] as Float32Array
        const inicio = primerSonido(x, 0.004) / sr
        const nivel = aDb(pico(x))
        const ok = nivel > -34 && Math.abs(inicio - 1) < 0.012
        medidas.push({ caso: `${id} · ${alias}`, ok, detalle: ok ? '' : 'no suena o entra a destiempo', datos: { inicioSeg: +inicio.toFixed(4), picoDb: +nivel.toFixed(1) } })
      }
      continue
    }
    const [min, max] = inst.rango
    const notas = [...new Set([min, Math.round(min + (max - min) * 0.25), Math.round((min + max) / 2), Math.round(min + (max - min) * 0.75), max, 69].filter((n) => n >= min && n <= max))]
    for (const nota of notas) {
      const { canales, sr } = await renderizar(`${id}-${nota}`, notaSuelta(id, nota), { limitador: false, nivelDb: 0 })
      const x = canales[0] as Float32Array
      const esperado = midiAHz(nota)
      // El análisis usa la frecuencia de muestreo de dsp.ts; el render se pide a esa misma.
      const tono =
        esperado >= 1500
          ? detectarTonoAgudo(x, { esperadoHz: esperado, desdeSeg: 1.05, ventanaSeg: 0.25 })
          : detectarTono(x, { minHz: esperado / 1.8, maxHz: esperado * 1.8, desdeSeg: 1.2, ventanaSeg: 0.4 })
      const cents = Math.round((tono.midi - nota) * 100)
      const inicio = primerSonido(x, 0.003) / sr
      const nivel = aDb(rms(x, sr, sr * 2))
      // El piano conserva su afinación estirada: en los extremos puede irse unos 40 cents.
      const margen = id === 'piano' ? 55 : 20
      const ok = Math.abs(cents) <= margen && Math.abs(inicio - 1) < 0.02 && nivel > -45
      medidas.push({
        caso: `${id} · nota ${nota}`,
        ok,
        detalle: ok ? '' : `esperado ${esperado.toFixed(1)} Hz, suena ${tono.hz.toFixed(1)} Hz`,
        datos: { cents, inicioSeg: +inicio.toFixed(4), rmsDb: +nivel.toFixed(1), claridad: +tono.claridad.toFixed(2) },
      })
    }
  }

  // ── 2. El silencio es silencio: antes de la primera nota no suena nada ──
  {
    const { canales, sr } = await renderizar('silencio-previo', notaSuelta('piano', 60))
    const previo = aDb(rms(canales[0] as Float32Array, 0, Math.round(sr * 0.95)))
    medidas.push({ caso: 'silencio antes de la primera nota', ok: previo < -90, detalle: '', datos: { rmsDb: Number.isFinite(previo) ? +previo.toFixed(1) : -120 } })
  }

  // ── 3. Ninguna nota suena dos veces: a tempos redondos el reloj de Tone.js puede duplicar un tick ──
  for (const tempo of [60, 96, 120, 150]) {
    const golpes = Array.from({ length: 8 }, (_, i) => ({ t: i * 480, d: 240, n: 38, v: 100 }))
    const pieza: Pieza = { tempo, compas: [4, 4], compases: 2, pistas: [{ id: 'p', rol: 'percusion', instrumento: 'bateria', notas: golpes }] }
    const { canales, sr } = await renderizar(`golpes-iguales-${tempo}`, pieza, { limitador: false })
    const x = canales[0] as Float32Array
    const porGolpe = (60 / tempo) * sr
    const picos = golpes.map((_, i) => aDb(pico(x, Math.round(i * porGolpe), Math.round(i * porGolpe + 0.1 * sr))))
    const dispersion = Math.max(...picos) - Math.min(...picos)
    medidas.push({ caso: `ocho golpes iguales a ${tempo} BPM`, ok: dispersion < 0.5, detalle: dispersion < 0.5 ? '' : 'algún golpe suena doble', datos: { dispersionDb: +dispersion.toFixed(2), picoDb: +Math.max(...picos).toFixed(1) } })
  }

  // ── 4. Los ejemplos del contenido: ni saturan ni quedan en silencio, y se anota su sonoridad ──
  const dirLecciones = path.join(RAIZ, 'public/content/lecciones')
  const piezas: Array<{ nombre: string; pieza: Pieza }> = []
  for (const f of readdirSync(dirLecciones).sort()) piezas.push(...piezasDe(JSON.parse(readFileSync(path.join(dirLecciones, f), 'utf8')) as Leccion))
  for (const t of JSON.parse(readFileSync(path.join(RAIZ, 'public/content/glosario.json'), 'utf8')) as TerminoDeGlosario[]) {
    if (t.ejemplo) piezas.push({ nombre: `glosario ${t.id}`, pieza: t.ejemplo })
  }
  for (const { nombre, pieza } of piezas) {
    const { canales, archivo } = await renderizar(nombre, pieza, { vueltas: pieza.bucle ? 2 : 1 })
    const x = canales[0] as Float32Array
    const { lufs, picoReal } = await sonoridad(archivo)
    const saturadas = [...x].filter((v) => Math.abs(v) >= 0.999).length
    // Un ejemplo con un solo golpe por pulso es mucho silencio: por eso el margen inferior es amplio.
    const ok = saturadas === 0 && picoReal <= -0.3 && lufs > -34 && lufs < -10
    medidas.push({
      caso: `ejemplo · ${nombre}`,
      ok,
      detalle: ok ? '' : saturadas > 0 || picoReal > -0.3 ? 'satura' : 'sonoridad fuera de margen',
      datos: { lufs: +lufs.toFixed(1), picoRealDb: +picoReal.toFixed(1), muestrasSaturadas: saturadas },
    })
  }

  await navegador.close()
  await servidor.close()

  const fallos = medidas.filter((m) => !m.ok)
  for (const m of medidas) {
    console.log(`${m.ok ? 'ok   ' : 'FALLO'} ${m.caso.padEnd(58)} ${Object.entries(m.datos).map(([k, v]) => `${k}=${v}`).join('  ')}${m.detalle ? `  ← ${m.detalle}` : ''}`)
  }
  mkdirSync(path.join(RAIZ, 'informes'), { recursive: true })
  writeFileSync(path.join(RAIZ, 'informes/audio.json'), `${JSON.stringify({ frecuenciaDeMuestreo: SR, casos: medidas.length, fallos: fallos.length, medidas }, null, 1)}\n`)
  console.log(`\n${medidas.length} comprobaciones de audio, ${fallos.length} fallos. Informe en informes/audio.json${guardarWav ? ' y WAV en informes/tmp' : ''}.`)
  if (fallos.length > 0) process.exit(1)
}

await principal()
