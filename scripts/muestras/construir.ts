/**
 * Construye el banco de sonidos de la app a partir de los repositorios de
 * origen (ver fuentes.ts). Se ejecuta a mano cuando cambia el banco, no en CI:
 *
 *   npm run samples:build            → todos los instrumentos
 *   npm run samples:build -- piano   → solo los indicados
 *
 * Salida: public/samples/<id>/*.ogg + instrumento.json, public/samples/indice.json
 * y un informe de medidas en informes/muestras/<id>.json.
 */
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { INSTRUMENTOS, type IdInstrumento } from '../../src/musica/instrumentos.ts'
import {
  SR,
  aDb,
  codificarOpus,
  decodificar,
  decodificarMezcla,
  detectarTono,
  detectarTonoAgudo,
  hornearBucle,
  limitarDuracion,
  medirCostura,
  midiAHz,
  normalizarPico,
  pico,
  recortarFinal,
  recortarInicio,
  rms,
} from './dsp.ts'
import { FUENTES, type IdFuente, listarArchivos, obtenerArchivos } from './fuentes.ts'

const RAIZ = path.resolve(import.meta.dirname, '../..')
const SALIDA = path.join(RAIZ, 'public/samples')
const INFORMES = path.join(RAIZ, 'informes/muestras')

// ───────────────────────────── tipos ─────────────────────────────

interface Toma {
  ruta: string
  ganancia: number
}

interface RegionAfinada {
  nombre: string
  tomas: Toma[]
  /** Nota MIDI que se espera que suene en la muestra. */
  tono: number
}

interface RegionGolpe {
  nombre: string
  tomas: Toma[]
  tecla: number
  vel: [number, number]
  /** Posición y longitud de la alternancia (round robin), si la hay. */
  alternancia?: { posicion: number; de: number }
  /** Grupo exclusivo al que pertenece (p. ej. charles abierto). */
  grupo?: number
  /** Grupo que este golpe corta al sonar. */
  corta?: number
  maxSeg: number
}

interface RegionPreset {
  sample: string
  keyRange?: [number, number]
  key?: number
  pitch?: number
  detune?: number
  velRange?: [number, number]
  loop?: boolean
  loopStart?: number
  loopEnd?: number
  seqPosition?: number
  group?: number
  offBy?: number
}

interface GrupoPreset {
  label?: string
  velRange?: [number, number]
  seqLength?: number
  regions: RegionPreset[]
}

interface ArchivoInstrumento {
  id: IdInstrumento
  version: 1
  fuente: IdFuente
  licencia: string
  bytes: number
  archivos: string[]
  preset: {
    samples: { formats: ['ogg'] }
    defaults: { ampRelease: number; volume: number; detune?: number }
    groups: GrupoPreset[]
    aliases?: Record<string, number>
  }
}

type Medida = Record<string, string | number | boolean>

// ───────────────────────────── utilidades ─────────────────────────────

const NOTAS: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }

/** «F#3», «gb2», «A#0»… → número MIDI con Do4 = 60. `octavas` corrige la convención del banco. */
function midiDeNombre(nombre: string, octavas = 0): number {
  const m = /^([a-gA-G])([#b]?)(-?\d)$/.exec(nombre)
  if (!m) throw new Error(`Nombre de nota no reconocido: ${nombre}`)
  const base = NOTAS[(m[1] ?? '').toLowerCase()] ?? 0
  const alt = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0
  return 12 * (Number(m[3]) + 1 + octavas) + base + alt
}

function nombreMuestra(midi: number): string {
  return `n${String(midi).padStart(3, '0')}`
}

/** Reparte el teclado entre las muestras: cada una cubre hasta la mitad del camino a sus vecinas. */
function repartirTeclado(tonos: number[], [min, max]: readonly [number, number]): Array<[number, number]> {
  const orden = [...tonos].sort((a, b) => a - b)
  return orden.map((t, i) => {
    const previo = orden[i - 1]
    const siguiente = orden[i + 1]
    const bajo = previo === undefined ? Math.min(min, t) : Math.floor((previo + t) / 2) + 1
    const alto = siguiente === undefined ? Math.max(max, t) : Math.floor((t + siguiente) / 2)
    return [bajo, alto]
  })
}

async function escribirOpus(datos: Float32Array, carpeta: string, nombre: string, kbps: number): Promise<number> {
  const destino = path.join(carpeta, `${nombre}.ogg`)
  await codificarOpus(datos, destino, kbps)
  return statSync(destino).size
}

/** Por encima de esta frecuencia el periodo dura muy pocas muestras y se usa el detector espectral. */
const UMBRAL_AGUDO_HZ = 1500

/**
 * Comprueba que la muestra suena en la nota que dice su nombre. Es la defensa
 * contra los bancos que numeran las octavas de otra manera.
 */
function comprobarTono(nombre: string, esperado: number, datos: Float32Array, desdeSeg = 0.25): { cents: number; claridad: number; hz: number } {
  const hzEsperado = midiAHz(esperado)
  const agudo = hzEsperado >= UMBRAL_AGUDO_HZ
  const t = agudo
    ? detectarTonoAgudo(datos, { esperadoHz: hzEsperado })
    : detectarTono(datos, { minHz: hzEsperado / 1.8, maxHz: hzEsperado * 1.8, desdeSeg, ventanaSeg: 0.4 })
  const desvio = t.midi - esperado
  if (t.claridad < (agudo ? 0.8 : 0.4) || Math.abs(desvio) > 0.6) {
    throw new Error(
      `${nombre}: se esperaba la nota MIDI ${esperado} (${hzEsperado.toFixed(1)} Hz) y suena ${t.hz.toFixed(1)} Hz (MIDI ${t.midi.toFixed(2)}, claridad ${t.claridad.toFixed(2)})`,
    )
  }
  return { cents: Math.round(desvio * 100), claridad: +t.claridad.toFixed(3), hz: t.hz }
}

// ───────────────────────────── recetas ─────────────────────────────

interface ResultadoReceta {
  /** Corrección global de afinación en cents (0 si no hace falta). */
  desafinacionGlobal?: number
  grupos: GrupoPreset[]
  alias?: Record<string, number>
  release: number
  volumenDb: number
  medidas: Medida[]
  archivos: string[]
  bytes: number
}

/** Instrumentos afinados cuya nota decae sola (piano, bajo). */
async function construirDecae(
  id: IdInstrumento,
  carpeta: string,
  regiones: RegionAfinada[],
  o: { maxSeg: number; fundidoSeg: number; kbps: number; release: number; volumenDb: number; afinacion: 'por-muestra' | 'global'; medirTonoEnSeg: number },
): Promise<ResultadoReceta> {
  const medidas: Medida[] = []
  const archivos: string[] = []
  let bytes = 0
  const teclas = repartirTeclado(regiones.map((r) => r.tono), INSTRUMENTOS[id].rango)
  const orden = [...regiones].sort((a, b) => a.tono - b.tono)
  const presetRegiones: RegionPreset[] = []
  for (const [i, r] of orden.entries()) {
    let x = await decodificarMezcla(r.tomas)
    x = recortarInicio(x, -40)
    const tono = comprobarTono(r.nombre, r.tono, x, o.medirTonoEnSeg)
    x = limitarDuracion(x, o.maxSeg, o.fundidoSeg)
    x = normalizarPico(x, -3)
    const tam = await escribirOpus(x, carpeta, r.nombre, o.kbps)
    bytes += tam
    archivos.push(`${r.nombre}.ogg`)
    const region: RegionPreset = { sample: r.nombre, keyRange: teclas[i] ?? [r.tono, r.tono], pitch: r.tono }
    if (o.afinacion === 'por-muestra' && Math.abs(tono.cents) >= 4) region.detune = -tono.cents
    presetRegiones.push(region)
    medidas.push({ muestra: r.nombre, tono: r.tono, cents: tono.cents, claridad: tono.claridad, segundos: +(x.length / SR).toFixed(2), rmsDb: +aDb(rms(x, 0, Math.min(x.length, SR))).toFixed(1), bytes: tam })
  }
  const resultado: ResultadoReceta = { grupos: [{ regions: presetRegiones }], release: o.release, volumenDb: o.volumenDb, medidas, archivos, bytes }
  if (o.afinacion === 'global') {
    // Se conserva la afinación relativa del instrumento (p. ej. el «estiramiento» del piano)
    // y solo se centra el registro medio en La = 440 Hz.
    const centrales = medidas
      .filter((m) => typeof m.tono === 'number' && m.tono >= 45 && m.tono <= 80)
      .map((m) => Number(m.cents))
      .sort((a, b) => a - b)
    const mediana = centrales[Math.floor(centrales.length / 2)] ?? 0
    if (Math.abs(mediana) >= 3) resultado.desafinacionGlobal = -mediana
  }
  return resultado
}

/** Instrumentos de nota sostenida: la muestra se prepara para repetirse en bucle. */
async function construirSostenido(
  id: IdInstrumento,
  carpeta: string,
  regiones: RegionAfinada[],
  o: { inicioBucleSeg: number; longitudBucleSeg: number; cruceSeg: number; kbps: number; release: number; volumenDb: number },
): Promise<ResultadoReceta> {
  const medidas: Medida[] = []
  const archivos: string[] = []
  let bytes = 0
  const teclas = repartirTeclado(regiones.map((r) => r.tono), INSTRUMENTOS[id].rango)
  const orden = [...regiones].sort((a, b) => a.tono - b.tono)
  const presetRegiones: RegionPreset[] = []
  for (const [i, r] of orden.entries()) {
    let x = await decodificarMezcla(r.tomas)
    x = recortarInicio(x, -32, 4)
    const t = comprobarTono(r.nombre, r.tono, x, 0.6)
    const desvio = t.cents / 100
    const bucle = hornearBucle(x, { inicioSeg: o.inicioBucleSeg, longitudSeg: o.longitudBucleSeg, cruceSeg: o.cruceSeg, periodo: SR / t.hz })
    const y = normalizarPico(bucle.datos, -6)
    const tam = await escribirOpus(y, carpeta, r.nombre, o.kbps)
    bytes += tam
    archivos.push(`${r.nombre}.ogg`)
    // La costura se mide sobre el archivo ya codificado, que es lo que sonará.
    const decodificado = await decodificar(path.join(carpeta, `${r.nombre}.ogg`))
    const costura = medirCostura(decodificado, bucle.inicio, bucle.fin)
    if (costura.proporcion > 12) throw new Error(`${r.nombre}: la costura del bucle destaca ${costura.proporcion.toFixed(1)} veces sobre la onda`)
    const cents = Math.round(desvio * 100)
    const region: RegionPreset = {
      sample: r.nombre,
      keyRange: teclas[i] ?? [r.tono, r.tono],
      pitch: r.tono,
      loop: true,
      loopStart: +(bucle.inicio / SR).toFixed(5),
      loopEnd: +(bucle.fin / SR).toFixed(5),
    }
    if (Math.abs(cents) >= 4) region.detune = -cents
    presetRegiones.push(region)
    medidas.push({
      muestra: r.nombre,
      tono: r.tono,
      cents,
      claridad: t.claridad,
      origenSeg: +(x.length / SR).toFixed(2),
      bucleInicio: region.loopStart ?? 0,
      bucleFin: region.loopEnd ?? 0,
      correlacion: +bucle.correlacion.toFixed(3),
      cruce: bucle.tipoCruce,
      costura: +costura.proporcion.toFixed(2),
      saltoDb: +costura.saltoDb.toFixed(1),
      rmsBucleDb: +aDb(rms(y, bucle.inicio, bucle.fin)).toFixed(1),
      bytes: tam,
    })
  }
  return { grupos: [{ regions: presetRegiones }], release: o.release, volumenDb: o.volumenDb, medidas, archivos, bytes }
}

/** Percusión sin afinar: se conserva el equilibrio natural entre piezas y dinámicas. */
async function construirGolpes(
  carpeta: string,
  golpes: RegionGolpe[],
  alias: Record<string, number>,
  o: { kbps: number; release: number; volumenDb: number; picoKitDb: number; sueloPiezaDb: number },
): Promise<ResultadoReceta> {
  const preparados: Array<{ g: RegionGolpe; x: Float32Array }> = []
  for (const g of golpes) {
    let x = await decodificarMezcla(g.tomas)
    // El corte busca el golpe, no el primer roce: así el transitorio cae justo en el tiempo.
    x = recortarInicio(x, -26, 1.5)
    x = recortarFinal(x, -62)
    x = limitarDuracion(x, g.maxSeg, Math.min(0.6, g.maxSeg / 3))
    preparados.push({ g, x })
  }
  // Una sola ganancia para todo el kit: el golpe más fuerte queda en el pico objetivo y se
  // conserva el equilibrio natural entre piezas (un charles suena más flojo que una caja).
  const picoKit = Math.max(...preparados.map((p) => pico(p.x)))
  const gananciaKit = 10 ** (o.picoKitDb / 20) / picoKit
  // Dentro de cada pieza, todas las capas y alternancias se llevan al nivel de la más fuerte:
  // la dinámica la pone la velocidad de la nota, y la capa solo cambia el timbre.
  const picoPorTecla = new Map<number, number>()
  for (const { g, x } of preparados) picoPorTecla.set(g.tecla, Math.max(picoPorTecla.get(g.tecla) ?? 0, pico(x)))
  // Ninguna pieza queda más de `sueloPiezaDb` por debajo de la más fuerte: un pedal de charles
  // grabado muy flojo sería inaudible en el altavoz de un móvil.
  const suelo = picoKit * 10 ** (o.sueloPiezaDb / 20)
  for (const [tecla, p] of picoPorTecla) if (p < suelo) picoPorTecla.set(tecla, suelo)
  const medidas: Medida[] = []
  const archivos: string[] = []
  let bytes = 0
  const grupos = new Map<string, GrupoPreset>()
  for (const { g, x } of preparados) {
    const propio = pico(x)
    const ganancia = propio > 0 ? (gananciaKit * (picoPorTecla.get(g.tecla) ?? propio)) / propio : gananciaKit
    const y = new Float32Array(x.length)
    for (let i = 0; i < x.length; i++) y[i] = (x[i] ?? 0) * ganancia
    const tam = await escribirOpus(y, carpeta, g.nombre, o.kbps)
    bytes += tam
    archivos.push(`${g.nombre}.ogg`)
    const clave = `${g.tecla}:${g.vel[0]}-${g.vel[1]}`
    let grupo = grupos.get(clave)
    if (!grupo) {
      grupo = { label: clave, velRange: g.vel, regions: [] }
      if (g.alternancia) grupo.seqLength = g.alternancia.de
      grupos.set(clave, grupo)
    }
    const region: RegionPreset = { sample: g.nombre, key: g.tecla }
    if (g.alternancia) region.seqPosition = g.alternancia.posicion
    if (g.grupo !== undefined) region.group = g.grupo
    if (g.corta !== undefined) region.offBy = g.corta
    grupo.regions.push(region)
    medidas.push({ muestra: g.nombre, tecla: g.tecla, vel: `${g.vel[0]}-${g.vel[1]}`, segundos: +(y.length / SR).toFixed(2), picoDb: +aDb(pico(y)).toFixed(1), bytes: tam })
  }
  return { grupos: [...grupos.values()], alias, release: o.release, volumenDb: o.volumenDb, medidas, archivos, bytes }
}

// ───────────────────────────── instrumentos ─────────────────────────────

const RECETAS: Record<string, { fuente: IdFuente; construir: (carpeta: string) => Promise<ResultadoReceta> }> = {
  piano: {
    fuente: 'splendid',
    async construir(carpeta) {
      const dir = await obtenerArchivos('splendid', ['Data/MF.txt'])
      const mapa = readFileSync(path.join(dir, 'Data/MF.txt'), 'utf8')
      const todas: Array<{ tono: number; archivo: string }> = []
      for (const linea of mapa.split('\n')) {
        const m = /pitch_keycenter=(\d+).*sample=(.+)\.\$EXT/.exec(linea)
        if (m) todas.push({ tono: Number(m[1]), archivo: `Samples/${(m[2] ?? '').trim()}.flac` })
      }
      todas.sort((a, b) => a.tono - b.tono)
      // Una muestra cada tercera menor basta: las notas intermedias se transportan como mucho un semitono y medio.
      const elegidas: typeof todas = []
      for (const r of todas) {
        const ultima = elegidas[elegidas.length - 1]
        if (!ultima || r.tono - ultima.tono >= 3) elegidas.push(r)
      }
      const ultimaTotal = todas[todas.length - 1]
      const ultimaElegida = elegidas[elegidas.length - 1]
      if (ultimaTotal && ultimaElegida && ultimaTotal.tono !== ultimaElegida.tono) elegidas.push(ultimaTotal)
      await obtenerArchivos('splendid', elegidas.map((e) => e.archivo))
      const regiones: RegionAfinada[] = elegidas.map((e) => ({
        nombre: nombreMuestra(e.tono),
        tomas: [{ ruta: path.join(dir, e.archivo), ganancia: 1 }],
        tono: e.tono,
      }))
      return construirDecae('piano', carpeta, regiones, {
        maxSeg: 5,
        fundidoSeg: 1.2,
        kbps: 64,
        release: 0.45,
        volumenDb: 0,
        // El piano se afina «estirado» a propósito: solo se centra el conjunto en La = 440 Hz.
        afinacion: 'global',
        medirTonoEnSeg: 0.25,
      })
    },
  },

  cuerdas: {
    fuente: 'vsco2ce',
    async construir(carpeta) {
      const archivos = await listarArchivos('vsco2ce')
      // El banco nombra las notas con Do3 = 60: hay que subir una octava para Do4 = 60.
      const secciones: Array<{ patron: RegExp; tramo: [number, number] }> = [
        { patron: /^Strings\/Solo Contrabass\/SusVib\/BKCtbss_SusVib_([A-G]#?\d)_v3_rr1\.wav$/, tramo: [0, 35] },
        { patron: /^Strings\/Cello Section\/susvib\/susvib_([A-G]#?\d)_v3_1\.wav$/, tramo: [36, 54] },
        { patron: /^Strings\/Violin Section\/susVib\/VlnEns_susVib_([A-G]#?\d)_v2\.wav$/, tramo: [55, 127] },
      ]
      const elegidas: Array<{ tono: number; archivo: string }> = []
      for (const { patron, tramo } of secciones) {
        for (const a of archivos) {
          const m = patron.exec(a)
          if (!m) continue
          const tono = midiDeNombre(m[1] ?? '', 1)
          if (tono >= tramo[0] && tono <= tramo[1]) elegidas.push({ tono, archivo: a })
        }
      }
      const dir = await obtenerArchivos('vsco2ce', elegidas.map((e) => e.archivo))
      const regiones: RegionAfinada[] = elegidas.map((e) => ({
        nombre: nombreMuestra(e.tono),
        tomas: [{ ruta: path.join(dir, e.archivo), ganancia: 1 }],
        tono: e.tono,
      }))
      return construirSostenido('cuerdas', carpeta, regiones, {
        inicioBucleSeg: 1.0,
        longitudBucleSeg: 2.2,
        cruceSeg: 0.5,
        kbps: 64,
        release: 0.35,
        volumenDb: 0,
      })
    },
  },

  'bajo-electrico': {
    fuente: 'growlybass',
    async construir(carpeta) {
      const archivos = await listarArchivos('growlybass')
      const elegidas: Array<{ tono: number; archivo: string }> = []
      for (const a of archivos) {
        const m = /^sustain\/([a-g]b?\d)_f_rr1\.wav$/.exec(a)
        // Se nombra como se escribe para bajo: suena una octava por debajo. «db2» es la cuerda desafinada: no se usa.
        if (m && m[1] !== 'db2') elegidas.push({ tono: midiDeNombre(m[1] ?? '', -1), archivo: a })
      }
      const dir = await obtenerArchivos('growlybass', elegidas.map((e) => e.archivo))
      const regiones: RegionAfinada[] = elegidas.map((e) => ({
        nombre: nombreMuestra(e.tono),
        tomas: [{ ruta: path.join(dir, e.archivo), ganancia: 1 }],
        tono: e.tono,
      }))
      return construirDecae('bajo-electrico', carpeta, regiones, {
        maxSeg: 4,
        fundidoSeg: 1.0,
        kbps: 56,
        release: 0.12,
        // Grabado por línea, queda unos 3 dB por debajo del resto a igual velocidad.
        volumenDb: 3,
        afinacion: 'por-muestra',
        // Una cuerda pulsada suena algo alta al principio y baja al asentarse: se mide a medio segundo.
        medirTonoEnSeg: 0.5,
      })
    },
  },

  bateria: {
    fuente: 'virtuosity',
    async construir(carpeta) {
      const piezas = INSTRUMENTOS.bateria.percusion
      // El kit básico del banco suma micro de bombo, micro de caja y aéreos al mismo nivel.
      const micros = ['kickmic', 'snaremic', 'oh']
      const tomasDe = (carpetaPieza: string, sufijo: string): string[] => micros.map((m) => `Samples/${m}/${carpetaPieza}/${m}_${sufijo}.flac`)
      interface Plan {
        nombre: string
        pieza: keyof typeof piezas
        carpeta: string
        sufijo: string
        vel: [number, number]
        alternancia?: { posicion: number; de: number }
        grupo?: number
        corta?: number
        maxSeg: number
      }
      const plan: Plan[] = [
        { nombre: 'bombo-p', pieza: 'bombo', carpeta: 'kick', sufijo: 'kick_snon_vl2_rr1', vel: [0, 79], maxSeg: 1.2 },
        { nombre: 'bombo-f', pieza: 'bombo', carpeta: 'kick', sufijo: 'kick_snon_vl4_rr1', vel: [80, 127], maxSeg: 1.2 },
        { nombre: 'caja-p', pieza: 'caja', carpeta: 'snare', sufijo: 'snare_center_vl14', vel: [0, 79], maxSeg: 1.2 },
        { nombre: 'caja-f', pieza: 'caja', carpeta: 'snare', sufijo: 'snare_center_vl30', vel: [80, 127], maxSeg: 1.2 },
        { nombre: 'aro', pieza: 'aro', carpeta: 'snare', sufijo: 'snare_crossstick_vl10', vel: [0, 127], maxSeg: 0.8 },
        { nombre: 'charles-p1', pieza: 'charles', carpeta: 'hh', sufijo: 'hh_closed_vl2_rr1', vel: [0, 79], alternancia: { posicion: 1, de: 2 }, corta: 1, maxSeg: 0.6 },
        { nombre: 'charles-p2', pieza: 'charles', carpeta: 'hh', sufijo: 'hh_closed_vl2_rr2', vel: [0, 79], alternancia: { posicion: 2, de: 2 }, corta: 1, maxSeg: 0.6 },
        { nombre: 'charles-f1', pieza: 'charles', carpeta: 'hh', sufijo: 'hh_closed_vl4_rr1', vel: [80, 127], alternancia: { posicion: 1, de: 2 }, corta: 1, maxSeg: 0.6 },
        { nombre: 'charles-f2', pieza: 'charles', carpeta: 'hh', sufijo: 'hh_closed_vl4_rr2', vel: [80, 127], alternancia: { posicion: 2, de: 2 }, corta: 1, maxSeg: 0.6 },
        { nombre: 'charles-pedal', pieza: 'charles_pedal', carpeta: 'hh', sufijo: 'hh_pedal_vl2_rr1', vel: [0, 127], corta: 1, maxSeg: 0.6 },
        { nombre: 'charles-abierto', pieza: 'charles_abierto', carpeta: 'hh', sufijo: 'hh_open_vl3_rr1', vel: [0, 127], grupo: 1, maxSeg: 2.5 },
        { nombre: 'tom-grave', pieza: 'tom_grave', carpeta: 'ltom', sufijo: 'ltom_center_vl12', vel: [0, 127], maxSeg: 1.8 },
        { nombre: 'tom-agudo', pieza: 'tom_agudo', carpeta: 'htom', sufijo: 'htom_center_vl12', vel: [0, 127], maxSeg: 1.5 },
        { nombre: 'crash', pieza: 'crash', carpeta: 'crash', sufijo: 'crash_crash_vl3_rr1', vel: [0, 127], maxSeg: 3.5 },
        { nombre: 'ride', pieza: 'ride', carpeta: 'ride', sufijo: 'ride_ride_vl2_rr1', vel: [0, 127], maxSeg: 2.5 },
        { nombre: 'campana', pieza: 'campana', carpeta: 'ride', sufijo: 'ride_bell_vl2_rr1', vel: [0, 127], maxSeg: 2.5 },
      ]
      const rutas = plan.flatMap((p) => tomasDe(p.carpeta, p.sufijo))
      const dir = await obtenerArchivos('virtuosity', rutas)
      const golpes: RegionGolpe[] = plan.map((p) => {
        const g: RegionGolpe = {
          nombre: p.nombre,
          tomas: tomasDe(p.carpeta, p.sufijo).map((r) => ({ ruta: path.join(dir, r), ganancia: 1 })),
          tecla: piezas[p.pieza].tecla,
          vel: p.vel,
          maxSeg: p.maxSeg,
        }
        if (p.alternancia) g.alternancia = p.alternancia
        if (p.grupo !== undefined) g.grupo = p.grupo
        if (p.corta !== undefined) g.corta = p.corta
        return g
      })
      const alias = Object.fromEntries(Object.entries(piezas).map(([nombre, pieza]) => [nombre, pieza.tecla]))
      return construirGolpes(carpeta, golpes, alias, { kbps: 72, release: 0.25, volumenDb: 0, picoKitDb: -1.5, sueloPiezaDb: -15 })
    },
  },
}

// ───────────────────────────── ejecución ─────────────────────────────

async function principal(): Promise<void> {
  const pedidos = process.argv.slice(2)
  const ids = (pedidos.length > 0 ? pedidos : Object.keys(RECETAS)) as IdInstrumento[]
  mkdirSync(SALIDA, { recursive: true })
  mkdirSync(INFORMES, { recursive: true })
  for (const id of ids) {
    const receta = RECETAS[id]
    if (!receta) throw new Error(`No hay receta para «${id}». Disponibles: ${Object.keys(RECETAS).join(', ')}`)
    const carpeta = path.join(SALIDA, id)
    rmSync(carpeta, { recursive: true, force: true })
    mkdirSync(carpeta, { recursive: true })
    const inicio = Date.now()
    const r = await receta.construir(carpeta)
    const fuente = FUENTES[receta.fuente]
    const archivo: ArchivoInstrumento = {
      id,
      version: 1,
      fuente: receta.fuente,
      licencia: fuente.licencia,
      bytes: r.bytes,
      archivos: r.archivos,
      preset: {
        samples: { formats: ['ogg'] },
        defaults: { ampRelease: r.release, volume: r.volumenDb, ...(r.desafinacionGlobal ? { detune: r.desafinacionGlobal } : {}) },
        groups: r.grupos,
        ...(r.alias ? { aliases: r.alias } : {}),
      },
    }
    writeFileSync(path.join(carpeta, 'instrumento.json'), `${JSON.stringify(archivo)}\n`)
    writeFileSync(
      path.join(INFORMES, `${id}.json`),
      `${JSON.stringify({ id, fuente: receta.fuente, commit: fuente.commit, muestras: r.archivos.length, bytes: r.bytes, desafinacionGlobal: r.desafinacionGlobal ?? 0, medidas: r.medidas }, null, 1)}\n`,
    )
    console.log(`${id.padEnd(16)} ${String(r.archivos.length).padStart(3)} muestras  ${(r.bytes / 1024).toFixed(0).padStart(5)} KB  ${((Date.now() - inicio) / 1000).toFixed(1)} s`)
  }

  // Índice de todo lo construido (también de ejecuciones anteriores).
  const indice: Record<string, { bytes: number; archivos: string[]; licencia: string; fuente: string }> = {}
  for (const id of readdirSync(SALIDA).sort()) {
    const ruta = path.join(SALIDA, id, 'instrumento.json')
    try {
      const a = JSON.parse(readFileSync(ruta, 'utf8')) as ArchivoInstrumento
      indice[id] = { bytes: a.bytes, archivos: a.archivos, licencia: a.licencia, fuente: a.fuente }
    } catch {
      // No es una carpeta de instrumento.
    }
  }
  writeFileSync(path.join(SALIDA, 'indice.json'), `${JSON.stringify({ version: 1, instrumentos: indice })}\n`)
  const total = Object.values(indice).reduce((s, i) => s + i.bytes, 0)
  console.log(`Total del banco: ${(total / 1024 / 1024).toFixed(2)} MB en ${Object.keys(indice).length} instrumentos`)
}

await principal()
