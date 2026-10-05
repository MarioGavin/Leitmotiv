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
import type { OpcionesDeRender, PasoDeGuion } from '../../src/audio/offline.ts'
import type { BloqueDePrueba, Ficha, Leccion, Paso, TerminoDeGlosario } from '../../src/contenido/tipos.ts'
import { INSTRUMENTOS, type IdInstrumento, type Instrumento } from '../../src/musica/instrumentos.ts'
import { azarConSemilla, generarPreguntas } from '../../src/musica/oido.ts'
import type { Nota, Pieza } from '../../src/musica/pieza.ts'
import { type PlanDeRitmo, planDeRitmo } from '../../src/musica/ritmo.ts'
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

interface PiezaConNombre {
  nombre: string
  pieza: Pieza
}

/** Todas las piezas que pueden sonar en unos pasos, con un nombre que diga dónde están. */
function piezasDe(origen: string, pasos: readonly Paso[]): PiezaConNombre[] {
  const salida: PiezaConNombre[] = []
  const anotar = (nombre: string, pieza: Pieza | undefined): void => {
    if (pieza && pieza.pistas.some((p) => p.notas.length > 0)) salida.push({ nombre: `${origen} ${nombre}`, pieza })
  }
  pasos.forEach((paso, i) => {
    const n = `paso ${i + 1} (${paso.tipo})`
    if (paso.tipo === 'teoria') anotar(n, paso.ejemplo)
    else if (paso.tipo === 'oido' && paso.modo === 'preguntas') paso.preguntas.forEach((q, k) => anotar(`${n} pregunta ${k + 1}`, q.pieza))
    else if (paso.tipo === 'oido') {
      // Las preguntas de estos modos salen al azar: se comprueban dos tandas de muestra, siempre las mismas.
      const preguntas = [...generarPreguntas(paso, 'latina', azarConSemilla(1)), ...generarPreguntas(paso, 'latina', azarConSemilla(2))]
      const vistas = new Set<number>()
      for (const q of preguntas) {
        if (vistas.has(q.correcta)) continue
        vistas.add(q.correcta)
        anotar(`${n} ${paso.modo} «${q.opciones[q.correcta] ?? ''}»`, q.pieza)
      }
    } else if (paso.tipo === 'construccion' && paso.modo === 'completar-melodia') {
      // Suena la pieza con cada una de las opciones puesta en el hueco.
      paso.opciones.forEach((opcion, k) => {
        anotar(`${n} opción ${k + 1}`, { ...paso.pieza, pistas: paso.pieza.pistas.map((p) => (p.id === paso.hueco.pista ? { ...p, notas: [...p.notas, ...opcion.notas] } : p)) })
      })
    } else if (paso.tipo === 'construccion' || paso.tipo === 'analisis' || paso.tipo === 'capas') anotar(n, paso.pieza)
    else if (paso.tipo === 'pianoroll' || paso.tipo === 'encargo') anotar(n, paso.plantilla)
  })
  return salida
}

/** Onda triangular con una redonda por compás: afinación limpia y entrada exacta, para medir. */
function redondas(alturas: readonly number[], extra: Partial<Pieza> = {}, capa?: string): Pieza {
  const notas: Nota[] = alturas.map((n, i) => ({ t: i * 1920, d: 1920, n, v: 100 }))
  return { tempo: 120, compas: [4, 4], compases: alturas.length, pistas: [{ id: 'p', rol: 'melodia', instrumento: 'chip-triangulo', ...(capa === undefined ? {} : { capa }), notas }], ...extra }
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
  const guardar = (nombre: string, base64: string) => {
    const bytes = Buffer.from(base64, 'base64')
    const archivo = path.join(TMP, `${String(indice++).padStart(3, '0')}-${nombre.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.wav`)
    writeFileSync(archivo, bytes)
    return { ...leerWav(bytes), archivo }
  }
  const renderizar = async (nombre: string, pieza: Pieza, opciones: OpcionesDeRender = {}) => {
    return guardar(nombre, await pagina.evaluate(([p, o]) => window.renderizar(p as Pieza, o as OpcionesDeRender), [pieza, opciones] as const))
  }
  const renderizarRitmo = async (nombre: string, plan: PlanDeRitmo, inicio: number) => {
    return guardar(nombre, await pagina.evaluate(([p, i]) => window.renderizarRitmo(p as PlanDeRitmo, { inicio: i as number }), [plan, inicio] as const))
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
  const leerJson = <T>(...ruta: string[]): T => JSON.parse(readFileSync(path.join(RAIZ, 'public/content', ...ruta), 'utf8')) as T
  const piezas: PiezaConNombre[] = []
  for (const f of readdirSync(path.join(RAIZ, 'public/content/lecciones')).sort()) {
    const leccion = leerJson<Leccion>('lecciones', f)
    piezas.push(...piezasDe(leccion.id, leccion.pasos))
  }
  for (const t of leerJson<TerminoDeGlosario[]>('glosario.json')) {
    if (t.ejemplo) piezas.push({ nombre: `glosario ${t.id}`, pieza: t.ejemplo })
  }
  for (const ficha of leerJson<Ficha[]>('fichas.json')) {
    ficha.bloques.forEach((bloque, i) => {
      if (bloque.ejemplo) piezas.push({ nombre: `ficha ${ficha.id} bloque ${i + 1}`, pieza: bloque.ejemplo })
    })
  }
  for (const bloque of leerJson<BloqueDePrueba[]>('prueba-de-nivel.json')) piezas.push(...piezasDe(`prueba de nivel ${bloque.unidad}`, bloque.pasos))
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

  // ── 5. El motor: lo que en la app ocurre al tocar un control, comprobado sobre el render ──
  const nivel = (x: Float32Array, sr: number, desde: number, hasta: number): number => {
    const db = aDb(rms(x, Math.round(desde * sr), Math.round(hasta * sr)))
    return Number.isFinite(db) ? +db.toFixed(1) : -120
  }
  /** Nota que suena a partir de un instante: distingue un Do4 de un Sol4. */
  const notaEn = (x: Float32Array, desde: number): number => +detectarTono(x, { minHz: 180, maxHz: 520, desdeSeg: desde, ventanaSeg: 0.3 }).midi.toFixed(1)
  const anotar = (caso: string, ok: boolean, detalle: string, datos: Record<string, number | string>): void => {
    medidas.push({ caso, ok, detalle: ok ? '' : detalle, datos })
  }
  const DO = 60
  const SOL = 67
  const AUDIBLE = -40
  const CALLADO = -70

  // 5a. Swing: la corchea a contratiempo se retrasa hasta el segundo tercio del pulso cuando el swing vale 1.
  for (const [swing, esperado] of [
    [0, 0.25],
    [0.5, 0.25 + 0.5 / 12],
    [1, 0.25 + 1 / 12],
  ] as const) {
    const pieza: Pieza = { tempo: 120, compas: [4, 4], compases: 1, swing, pistas: [{ id: 'p', rol: 'melodia', instrumento: 'chip-pulso', notas: [{ t: 240, d: 120, n: 72, v: 110 }] }] }
    const { canales, sr } = await renderizar(`swing-${swing}`, pieza, { limitador: false })
    const inicio = primerSonido(canales[0] as Float32Array, 0.003) / sr
    anotar(`swing ${swing}: la corchea a contratiempo entra en ${esperado.toFixed(3)} s`, Math.abs(inicio - esperado) < 0.004, 'el swing no cae donde debe', { inicioSeg: +inicio.toFixed(4), esperadoSeg: +esperado.toFixed(4) })
  }

  // 5b. Edición en vivo: al cambiar las notas de una pista mientras suena, el compás siguiente ya es el nuevo.
  {
    const { canales } = await renderizar('edicion-en-vivo', redondas([DO, DO, DO, DO]), {
      guion: [{ en: 1, accion: { tipo: 'notas', pista: 'p', notas: [0, 1, 2, 3].map((c) => ({ t: c * 1920, d: 1920, n: SOL, v: 100 })) } }],
    })
    const x = canales[0] as Float32Array
    const [antes, despues, final] = [notaEn(x, 0.5), notaEn(x, 2.5), notaEn(x, 6.5)]
    anotar('edición en vivo: las notas nuevas suenan desde el compás siguiente', antes === DO && despues === SOL && final === SOL, 'no suenan las notas nuevas', { compas1: antes, compas2: despues, compas4: final })
  }

  // 5c. Capas: una capa entra en la barra de compás que se pidió y sale en el pulso que se pidió.
  {
    const { canales, sr } = await renderizar('capas-cuantizadas', redondas([SOL, SOL, SOL, SOL], {}, 'tension'), {
      limitador: false,
      antes: [{ tipo: 'capas', activas: [], cuando: 'inmediato', fundido: 0.01 }],
      guion: [
        { en: 0.5, accion: { tipo: 'capas', activas: ['tension'], cuando: 'compas', fundido: 0.2 } },
        { en: 4.6, accion: { tipo: 'capas', activas: [], cuando: 'tiempo', fundido: 0.1 } },
      ],
    })
    const x = canales[0] as Float32Array
    const datos = { antesDb: nivel(x, sr, 1, 1.95), dentroDb: nivel(x, sr, 2.4, 4.4), aunDentroDb: nivel(x, sr, 4.65, 4.95), despuesDb: nivel(x, sr, 5.3, 5.9) }
    const ok = datos.antesDb < CALLADO && datos.dentroDb > AUDIBLE && datos.aunDentroDb > AUDIBLE && datos.despuesDb < CALLADO
    anotar('capas: entra en la barra de compás y sale en el pulso siguiente', ok, 'la capa no entra o no sale cuando debe', datos)
  }
  {
    const { canales, sr } = await renderizar('capas-inmediato', redondas([SOL, SOL], {}, 'tension'), {
      limitador: false,
      antes: [{ tipo: 'capas', activas: [], cuando: 'inmediato', fundido: 0.01 }],
      guion: [{ en: 0.5, accion: { tipo: 'capas', activas: ['tension'], cuando: 'inmediato', fundido: 0.05 } }],
    })
    const x = canales[0] as Float32Array
    const datos = { antesDb: nivel(x, sr, 0.1, 0.45), despuesDb: nivel(x, sr, 0.85, 1.4) }
    anotar('capas: un cambio inmediato se oye enseguida', datos.antesDb < CALLADO && datos.despuesDb > AUDIBLE, 'el cambio inmediato tarda', datos)
  }

  // 5d. Secciones: el salto ocurre justo en la frontera pedida, y la sección de llegada se repite.
  const dosSecciones = redondas([DO, DO, SOL, SOL], {
    bucle: true,
    secciones: [
      { id: 'a', desde: 1, hasta: 2 },
      { id: 'b', desde: 3, hasta: 4 },
    ],
  })
  {
    const { canales, sr } = await renderizar('seccion-en-la-barra', dosSecciones, { limitador: false, duracion: 9, antes: [{ tipo: 'seccion', seccion: 'a' }], guion: [{ en: 0.5, accion: { tipo: 'seccion', seccion: 'b', cuando: 'compas' } }] })
    const x = canales[0] as Float32Array
    const datos = { s0: notaEn(x, 0.5), s2: notaEn(x, 2.5), s4: notaEn(x, 4.5), s6: notaEn(x, 6.5), s8: notaEn(x, 8.5), enLaCosturaDb: nivel(x, sr, 2.02, 2.12) }
    const ok = datos.s0 === DO && datos.s2 === SOL && datos.s4 === SOL && datos.s6 === SOL && datos.s8 === SOL && datos.enLaCosturaDb > AUDIBLE
    anotar('secciones: salta en la barra de compás y repite la sección nueva', ok, 'el salto de sección falla', datos)
  }
  {
    const { canales } = await renderizar('seccion-al-acabar', dosSecciones, { limitador: false, duracion: 9, antes: [{ tipo: 'seccion', seccion: 'a' }], guion: [{ en: 0.5, accion: { tipo: 'seccion', seccion: 'b', cuando: 'seccion' } }] })
    const x = canales[0] as Float32Array
    const datos = { s2: notaEn(x, 2.5), s4: notaEn(x, 4.5), s6: notaEn(x, 6.5), s8: notaEn(x, 8.5) }
    anotar('secciones: con «al acabar la sección», la termina antes de saltar', datos.s2 === DO && datos.s4 === SOL && datos.s6 === SOL && datos.s8 === SOL, 'no espera al final de la sección', datos)
  }
  {
    const { canales } = await renderizar('seccion-sin-saltar', dosSecciones, { limitador: false, duracion: 9, antes: [{ tipo: 'seccion', seccion: 'a' }] })
    const x = canales[0] as Float32Array
    const datos = { s2: notaEn(x, 2.5), s4: notaEn(x, 4.5), s6: notaEn(x, 6.5) }
    anotar('secciones: sin pedir nada, la sección elegida se repite', datos.s2 === DO && datos.s4 === DO && datos.s6 === DO, 'la sección no se repite', datos)
  }
  {
    const { canales } = await renderizar('seccion-a-la-pieza', dosSecciones, { limitador: false, duracion: 9, antes: [{ tipo: 'seccion', seccion: 'b' }], guion: [{ en: 0.5, accion: { tipo: 'seccion', cuando: 'compas' } }] })
    const x = canales[0] as Float32Array
    const datos = { s0: notaEn(x, 0.5), s2: notaEn(x, 2.5), s4: notaEn(x, 4.5), s6: notaEn(x, 6.5) }
    anotar('secciones: sin sección, vuelve a la pieza entera', datos.s0 === SOL && datos.s2 === DO && datos.s4 === DO && datos.s6 === SOL, 'no vuelve a la pieza entera', datos)
  }

  // 5e. Capas y sección pedidas a la vez, en cualquier orden: las dos cosas pasan en la misma barra.
  for (const orden of ['capas-seccion', 'seccion-capas'] as const) {
    const capas: PasoDeGuion = { en: 0.5, accion: { tipo: 'capas', activas: ['tension'], cuando: 'compas', fundido: 0.05 } }
    const seccion: PasoDeGuion = { en: 0.5, accion: { tipo: 'seccion', seccion: 'b', cuando: 'compas' } }
    const pieza: Pieza = { ...dosSecciones, pistas: dosSecciones.pistas.map((p) => ({ ...p, capa: 'tension' })) }
    const { canales, sr } = await renderizar(`estado-${orden}`, pieza, {
      limitador: false,
      duracion: 5,
      antes: [
        { tipo: 'seccion', seccion: 'a' },
        { tipo: 'capas', activas: [], cuando: 'inmediato', fundido: 0.01 },
      ],
      guion: orden === 'capas-seccion' ? [capas, seccion] : [seccion, capas],
    })
    const x = canales[0] as Float32Array
    const datos = { antesDb: nivel(x, sr, 1, 1.95), despuesDb: nivel(x, sr, 2.2, 3.8), nota: notaEn(x, 2.5) }
    anotar(`estado de juego (${orden}): capa y sección cambian en la misma barra`, datos.antesDb < CALLADO && datos.despuesDb > AUDIBLE && datos.nota === SOL, 'capa y sección no cambian juntas', datos)
  }

  // 5f. Cambio de instrumento sobre la marcha: sigue sonando la misma nota, con otro timbre.
  {
    const { canales, sr } = await renderizar('cambio-de-instrumento', redondas([DO, DO, DO, DO]), { limitador: false, guion: [{ en: 0.05, accion: { tipo: 'instrumento', pista: 'p', instrumento: 'chip-pulso' } }] })
    const x = canales[0] as Float32Array
    // La onda triangular y la de pulso suenan a niveles distintos: el del último compás tiene que ser el de la segunda.
    const referencia = async (instrumento: IdInstrumento): Promise<number> => {
      const pieza = redondas([DO])
      const r = await renderizar(`referencia-${instrumento}`, { ...pieza, pistas: pieza.pistas.map((p) => ({ ...p, instrumento })) }, { limitador: false })
      return nivel(r.canales[0] as Float32Array, r.sr, 0.3, 1.8)
    }
    const datos = { nota: notaEn(x, 6.5), alPrincipioDb: nivel(x, sr, 0.1, 0.3), alFinalDb: nivel(x, sr, 6.3, 7.8), trianguloDb: await referencia('chip-triangulo'), pulsoDb: await referencia('chip-pulso') }
    const ok = datos.nota === DO && Math.abs(datos.alPrincipioDb - datos.trianguloDb) < 1 && Math.abs(datos.alFinalDb - datos.pulsoDb) < 1 && Math.abs(datos.trianguloDb - datos.pulsoDb) > 2
    anotar('cambio de instrumento: misma nota, otro timbre', ok, 'el instrumento no cambia', datos)
  }

  // 5g. Ritmo: cada clic de claqueta y cada golpe del patrón suenan en su instante, y el turno del usuario queda en silencio.
  {
    const plan = planDeRitmo({ modo: 'eco', tempo: 100, compas: [4, 4], golpes: [0, 480, 1440], acentos: [true, false, false], duracion: 1920, cuentaAtras: 1, repeticiones: 1, guia: 'nada' })
    const inicio = 0.5
    const { canales, sr } = await renderizarRitmo('ritmo-eco', plan, inicio)
    const x = canales[0] as Float32Array
    const instantes = [...plan.claqueta, ...plan.patron].map((g) => g.t).sort((a, b) => a - b)
    let peor = 0
    for (const t of instantes) {
      // Entre dos golpes hay al menos 0,6 s: la entrada es el primer sonido por encima del umbral cerca del instante.
      const desde = Math.round((inicio + t - 0.05) * sr)
      const entrada = primerSonido(x.subarray(desde, Math.round((inicio + t + 0.1) * sr)), 0.02)
      const desvio = entrada < 0 ? 1 : Math.abs(entrada / sr - 0.05)
      peor = Math.max(peor, desvio)
    }
    const turno = plan.tramos.find((tramo) => tramo.tipo === 'toca')
    const silencio = turno ? nivel(x, sr, inicio + turno.desde + 0.6, inicio + turno.hasta) : 0
    anotar('ritmo: claqueta y patrón suenan en su instante', peor < 0.015 && silencio < -60, 'algún golpe entra a destiempo o suena algo en el turno del usuario', { golpes: instantes.length, peorDesvioMs: +(peor * 1000).toFixed(1), turnoDb: silencio })
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
