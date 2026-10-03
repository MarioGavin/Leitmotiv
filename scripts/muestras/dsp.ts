/**
 * Procesado de muestras para el banco de sonidos de Leitmotiv.
 *
 * Todo trabaja con audio mono a 48 kHz en Float32Array. La decodificación y la
 * codificación las hace ffmpeg; el resto (recorte, detección de tono, bucles,
 * normalización) está aquí para que sea reproducible y comprobable.
 */
import { spawn } from 'node:child_process'

export const SR = 48000

// ───────────────────────────── utilidades ─────────────────────────────

export function aDb(lineal: number): number {
  return lineal <= 0 ? -Infinity : 20 * Math.log10(lineal)
}

export function deDb(db: number): number {
  return 10 ** (db / 20)
}

export function pico(x: Float32Array, desde = 0, hasta = x.length): number {
  let m = 0
  for (let i = desde; i < hasta; i++) {
    const v = Math.abs(x[i] ?? 0)
    if (v > m) m = v
  }
  return m
}

export function rms(x: Float32Array, desde = 0, hasta = x.length): number {
  const a = Math.max(0, desde)
  const b = Math.min(x.length, hasta)
  if (b <= a) return 0
  let s = 0
  for (let i = a; i < b; i++) s += (x[i] ?? 0) ** 2
  return Math.sqrt(s / (b - a))
}

function ejecutar(cmd: string, args: string[], entrada?: Buffer): Promise<Buffer> {
  return new Promise((resolver, rechazar) => {
    const p = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] })
    const trozos: Buffer[] = []
    let err = ''
    p.stdout.on('data', (d: Buffer) => trozos.push(d))
    p.stderr.on('data', (d: Buffer) => (err += d.toString()))
    p.on('error', rechazar)
    p.on('close', (codigo) => {
      if (codigo === 0) resolver(Buffer.concat(trozos))
      else rechazar(new Error(`${cmd} terminó con código ${codigo}: ${err.slice(-600)}`))
    })
    if (entrada) p.stdin.end(entrada)
    else p.stdin.end()
  })
}

// ───────────────────────────── entrada y salida ─────────────────────────────

/** Decodifica cualquier formato que entienda ffmpeg a mono 48 kHz. */
export async function decodificar(ruta: string): Promise<Float32Array> {
  const crudo = await ejecutar('ffmpeg', ['-v', 'error', '-i', ruta, '-f', 'f32le', '-ac', '1', '-ar', String(SR), 'pipe:1'])
  const copia = new Uint8Array(crudo.byteLength)
  copia.set(crudo)
  return new Float32Array(copia.buffer, 0, Math.floor(copia.byteLength / 4))
}

/** Suma varias tomas (por ejemplo, micrófonos distintos del mismo golpe) con su ganancia. */
export async function decodificarMezcla(tomas: ReadonlyArray<{ ruta: string; ganancia: number }>): Promise<Float32Array> {
  const pistas = await Promise.all(tomas.map((t) => decodificar(t.ruta)))
  const largo = Math.max(...pistas.map((p) => p.length))
  const salida = new Float32Array(largo)
  pistas.forEach((p, k) => {
    const g = tomas[k]?.ganancia ?? 1
    for (let i = 0; i < p.length; i++) salida[i] = (salida[i] ?? 0) + (p[i] ?? 0) * g
  })
  return salida
}

/** Codifica a Opus en contenedor Ogg. Chromium lo decodifica sin desplazar el inicio. */
export async function codificarOpus(x: Float32Array, destino: string, kbps: number): Promise<void> {
  const entrada = Buffer.from(x.buffer, x.byteOffset, x.byteLength)
  await ejecutar(
    'ffmpeg',
    [
      '-v', 'error', '-y',
      '-f', 'f32le', '-ar', String(SR), '-ac', '1', '-i', 'pipe:0',
      '-c:a', 'libopus', '-b:a', `${kbps}k`, '-vbr', 'on', '-compression_level', '10', '-application', 'audio',
      '-map_metadata', '-1', '-f', 'ogg', destino,
    ],
    entrada,
  )
}

// ───────────────────────────── recortes y niveles ─────────────────────────────

/**
 * Quita el silencio inicial. Deja un pequeño margen antes del ataque y aplica
 * un fundido de entrada de 1 ms para que no haya chasquido.
 */
export function recortarInicio(x: Float32Array, umbralRelDb = -42, margenMs = 2): Float32Array {
  const umbral = pico(x) * deDb(umbralRelDb)
  let primero = 0
  for (let i = 0; i < x.length; i++) {
    if (Math.abs(x[i] ?? 0) > umbral) {
      primero = i
      break
    }
  }
  const inicio = Math.max(0, primero - Math.round((margenMs / 1000) * SR))
  const y = x.slice(inicio)
  const fundido = Math.min(y.length, Math.round(0.001 * SR))
  if (inicio > 0) for (let i = 0; i < fundido; i++) y[i] = (y[i] ?? 0) * (i / fundido)
  return y
}

/** Quita el silencio final (por debajo del umbral respecto al pico). */
export function recortarFinal(x: Float32Array, umbralRelDb = -60, colaMs = 20): Float32Array {
  const umbral = pico(x) * deDb(umbralRelDb)
  let ultimo = x.length - 1
  while (ultimo > 0 && Math.abs(x[ultimo] ?? 0) <= umbral) ultimo--
  const fin = Math.min(x.length, ultimo + 1 + Math.round((colaMs / 1000) * SR))
  return x.slice(0, fin)
}

/** Limita la duración con un fundido de salida en coseno alzado. */
export function limitarDuracion(x: Float32Array, maxSeg: number, fundidoSeg: number): Float32Array {
  const max = Math.round(maxSeg * SR)
  if (x.length <= max) return aplicarFundidoFinal(x, Math.min(fundidoSeg, 0.02))
  return aplicarFundidoFinal(x.slice(0, max), fundidoSeg)
}

export function aplicarFundidoFinal(x: Float32Array, fundidoSeg: number): Float32Array {
  const y = x.slice()
  const n = Math.min(y.length, Math.round(fundidoSeg * SR))
  for (let i = 0; i < n; i++) {
    const t = i / n
    const g = 0.5 * (1 + Math.cos(Math.PI * t))
    const pos = y.length - n + i
    y[pos] = (y[pos] ?? 0) * g
  }
  return y
}

export function normalizarPico(x: Float32Array, objetivoDb: number): Float32Array {
  const p = pico(x)
  if (p === 0) return x.slice()
  const g = deDb(objetivoDb) / p
  const y = new Float32Array(x.length)
  for (let i = 0; i < x.length; i++) y[i] = (x[i] ?? 0) * g
  return y
}

// ───────────────────────────── detección de tono ─────────────────────────────

export interface TonoDetectado {
  hz: number
  /** Nota MIDI con decimales (69 = La4 = 440 Hz). */
  midi: number
  /** Claridad de 0 a 1: cuánto se parece la señal a sí misma un periodo después. */
  claridad: number
}

export function hzAMidi(hz: number): number {
  return 69 + 12 * Math.log2(hz / 440)
}

export function midiAHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}

/**
 * Método de McLeod (NSDF). Analiza una ventana estable del sonido y devuelve la
 * frecuencia fundamental. `minHz` y `maxHz` acotan la búsqueda.
 */
export function detectarTono(
  x: Float32Array,
  { minHz, maxHz, desdeSeg = 0.15, ventanaSeg = 0.35 }: { minHz: number; maxHz: number; desdeSeg?: number; ventanaSeg?: number },
): TonoDetectado {
  const tauMax = Math.ceil(SR / minHz)
  const tauMin = Math.max(2, Math.floor(SR / maxHz))
  let inicio = Math.round(desdeSeg * SR)
  let largo = Math.max(Math.round(ventanaSeg * SR), tauMax * 4)
  if (inicio + largo + tauMax >= x.length) {
    inicio = Math.max(0, Math.min(inicio, x.length - largo - tauMax - 1))
    largo = Math.min(largo, x.length - inicio - tauMax - 1)
  }
  if (largo < tauMax * 2) return { hz: 0, midi: 0, claridad: 0 }

  const nsdf = new Float64Array(tauMax + 2)
  for (let tau = tauMin - 1; tau <= tauMax + 1; tau++) {
    let acf = 0
    let energia = 0
    for (let i = inicio; i < inicio + largo; i++) {
      const a = x[i] ?? 0
      const b = x[i + tau] ?? 0
      acf += a * b
      energia += a * a + b * b
    }
    nsdf[tau] = energia > 0 ? (2 * acf) / energia : 0
  }

  // Máximos locales del NSDF.
  const picos: Array<{ tau: number; valor: number }> = []
  for (let tau = tauMin; tau <= tauMax; tau++) {
    const v = nsdf[tau] ?? 0
    if (v > 0 && v > (nsdf[tau - 1] ?? 0) && v >= (nsdf[tau + 1] ?? 0)) picos.push({ tau, valor: v })
  }
  if (picos.length === 0) return { hz: 0, midi: 0, claridad: 0 }
  const mejor = Math.max(...picos.map((p) => p.valor))
  // El primer pico suficientemente alto corresponde al periodo fundamental (evita octavas graves).
  const elegido = picos.find((p) => p.valor >= 0.9 * mejor) ?? picos[0]
  if (!elegido) return { hz: 0, midi: 0, claridad: 0 }
  // Interpolación parabólica para afinar el periodo.
  const y0 = nsdf[elegido.tau - 1] ?? 0
  const y1 = nsdf[elegido.tau] ?? 0
  const y2 = nsdf[elegido.tau + 1] ?? 0
  const den = y0 - 2 * y1 + y2
  const desplazamiento = den === 0 ? 0 : (0.5 * (y0 - y2)) / den
  const periodo = elegido.tau + desplazamiento
  const hz = SR / periodo
  return { hz, midi: hzAMidi(hz), claridad: elegido.valor }
}

/**
 * Para notas muy agudas el periodo dura pocas muestras y el NSDF pierde
 * precisión. Aquí se barre una rejilla de frecuencias alrededor de la esperada
 * (pasos de 2 cents) y se elige la que más energía recoge.
 */
export function detectarTonoAgudo(
  x: Float32Array,
  { esperadoHz, margenSemitonos = 9, desdeSeg = 0.02, ventanaSeg = 0.25 }: { esperadoHz: number; margenSemitonos?: number; desdeSeg?: number; ventanaSeg?: number },
): TonoDetectado {
  const inicio = Math.min(Math.round(desdeSeg * SR), Math.max(0, x.length - 1024))
  const n = Math.min(Math.round(ventanaSeg * SR), x.length - inicio)
  if (n < 512) return { hz: 0, midi: 0, claridad: 0 }
  const ventana = new Float64Array(n)
  for (let i = 0; i < n; i++) ventana[i] = (x[inicio + i] ?? 0) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)))
  let mejorHz = 0
  let mejor = -1
  let suma = 0
  let cuenta = 0
  for (let c = -margenSemitonos * 100; c <= margenSemitonos * 100; c += 2) {
    const hz = esperadoHz * 2 ** (c / 1200)
    if (hz >= SR / 2) break
    const paso = (2 * Math.PI * hz) / SR
    let re = 0
    let im = 0
    for (let i = 0; i < n; i++) {
      const v = ventana[i] ?? 0
      re += v * Math.cos(paso * i)
      im -= v * Math.sin(paso * i)
    }
    const potencia = re * re + im * im
    suma += potencia
    cuenta++
    if (potencia > mejor) {
      mejor = potencia
      mejorHz = hz
    }
  }
  // Claridad: cuánto destaca el pico sobre la media de la banda explorada (1 = pico aislado).
  const claridad = mejor > 0 && cuenta > 0 ? Math.max(0, 1 - suma / cuenta / mejor) : 0
  return { hz: mejorHz, midi: hzAMidi(mejorHz), claridad }
}

// ───────────────────────────── bucles ─────────────────────────────

export interface BucleHorneado {
  datos: Float32Array
  /** Inicio y fin del bucle, en muestras. */
  inicio: number
  fin: number
  /** Parecido (−1 a 1) entre lo que suena antes del fin y antes del inicio. */
  correlacion: number
  tipoCruce: 'lineal' | 'potencia'
}

function correlacionNormalizada(x: Float32Array, a: number, b: number, n: number): number {
  let ab = 0
  let aa = 0
  let bb = 0
  for (let i = 0; i < n; i++) {
    const va = x[a + i] ?? 0
    const vb = x[b + i] ?? 0
    ab += va * vb
    aa += va * va
    bb += vb * vb
  }
  return aa > 0 && bb > 0 ? ab / Math.sqrt(aa * bb) : 0
}

/**
 * Prepara una nota sostenida para repetirse sin costura.
 *
 * El tramo final del bucle se funde con lo que suena justo antes de su inicio,
 * de modo que al saltar del fin al inicio la onda continúa. El fin se ajusta
 * dentro de ±1 periodo para que las dos ondas lleguen en fase.
 */
export function hornearBucle(
  x: Float32Array,
  { inicioSeg, longitudSeg, cruceSeg, periodo }: { inicioSeg: number; longitudSeg: number; cruceSeg: number; periodo: number },
): BucleHorneado {
  const margenFinal = Math.round(0.05 * SR)
  const cruce = Math.round(cruceSeg * SR)
  let inicio = Math.max(cruce, Math.round(inicioSeg * SR))
  let longitud = Math.round(longitudSeg * SR)
  const holgura = Math.ceil(periodo) + 2
  if (inicio + longitud + holgura + margenFinal > x.length) {
    // La muestra es más corta de lo pedido: se reparte lo que hay.
    const disponible = x.length - margenFinal - holgura - cruce
    if (disponible < cruce * 2) throw new Error('La muestra es demasiado corta para hacer un bucle')
    inicio = Math.max(cruce, Math.min(inicio, Math.round(cruce + disponible * 0.3)))
    longitud = x.length - margenFinal - holgura - inicio
  }
  if (longitud < cruce) throw new Error('El bucle sería más corto que el fundido')

  // Busca el fin que mejor alinea las fases en una ventana de ±1 periodo.
  const ventana = Math.min(cruce, Math.max(1024, Math.round(periodo * 8)))
  let mejorFin = inicio + longitud
  let mejorCorr = -Infinity
  for (let d = -Math.ceil(periodo); d <= Math.ceil(periodo); d++) {
    const fin = inicio + longitud + d
    const c = correlacionNormalizada(x, inicio - ventana, fin - ventana, ventana)
    if (c > mejorCorr) {
      mejorCorr = c
      mejorFin = fin
    }
  }
  const fin = mejorFin
  const lineal = mejorCorr > 0.5
  const cola = Math.min(Math.round(0.1 * SR), x.length - inicio)
  const y = new Float32Array(fin + cola)
  y.set(x.subarray(0, fin))
  for (let i = 0; i < cruce; i++) {
    const t = (i + 0.5) / cruce
    const sale = lineal ? 1 - t : Math.cos((t * Math.PI) / 2)
    const entra = lineal ? t : Math.sin((t * Math.PI) / 2)
    const pos = fin - cruce + i
    y[pos] = (x[pos] ?? 0) * sale + (x[inicio - cruce + i] ?? 0) * entra
  }
  // Tras el fin se copia la continuación natural del bucle: el codificador ve una
  // onda continua y lo que precede al punto de salto no sufre efectos de borde.
  for (let i = 0; i < cola; i++) y[fin + i] = x[inicio + i] ?? 0
  return { datos: y, inicio, fin, correlacion: mejorCorr, tipoCruce: lineal ? 'lineal' : 'potencia' }
}

export interface Costura {
  /** Salto en la costura dividido por el salto típico (percentil 95) dentro del bucle. */
  proporcion: number
  /** Tamaño absoluto del salto, en dBFS. */
  saltoDb: number
}

/**
 * Mide cuánto «salta» la onda al pasar del fin al inicio del bucle, comparado
 * con lo que cambia de forma natural entre muestras vecinas. Una proporción en
 * torno a 1 indica que la costura es indistinguible del resto de la onda. Con
 * audio comprimido el salto queda al nivel del ruido del códec (unos −40 dBFS).
 */
export function medirCostura(y: Float32Array, inicio: number, fin: number): Costura {
  const error = (previa2: number, previa1: number, real: number) => Math.abs(2 * previa1 - previa2 - real)
  const enCostura = error(y[fin - 2] ?? 0, y[fin - 1] ?? 0, y[inicio] ?? 0)
  const errores: number[] = []
  for (let i = inicio + 2; i < fin; i += 7) errores.push(error(y[i - 2] ?? 0, y[i - 1] ?? 0, y[i] ?? 0))
  errores.sort((a, b) => a - b)
  const p95 = errores[Math.floor(errores.length * 0.95)] ?? 0
  return { proporcion: p95 > 0 ? enCostura / p95 : 0, saltoDb: aDb(enCostura) }
}
