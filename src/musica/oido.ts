/**
 * Generadores de preguntas para los ejercicios de oído que no llevan las
 * preguntas escritas a mano: intervalo, acorde, progresión, escala, timbre,
 * contorno y compás.
 *
 * Cada generador recibe la configuración del paso y un generador de números al
 * azar, y devuelve preguntas ya resueltas: la pieza que suena, las opciones y
 * cuál es la correcta. Es lógica pura: con el mismo azar, las mismas preguntas.
 * Toda la teoría sale de Tonal.
 */
import { Chord } from 'tonal'
import type { OidoAcorde, OidoCompas, OidoContorno, OidoEscala, OidoIntervalo, OidoProgresion, OidoTimbre, PasoOido } from '../contenido/tipos.ts'
import { apilar, enPosicionCerrada } from './acordes.ts'
import { INSTRUMENTOS, type IdInstrumento, teclaDePercusion } from './instrumentos.ts'
import { type Nomenclatura, cifradoVisible, croma, cromaDeMidi, midiDe, nombreDeIntervalo, nombreVisible, notaDeMidi, semitonos, transportar } from './notas.ts'
import type { Nota, Pieza } from './pieza.ts'
import { type Compas, PPQ, esCompasCompuesto, escribirCompas, ticksPorCompas, ticksPorTiempo } from './tiempo.ts'
import { acordeDeGrado, leerTonalidad, tonalidadVisible } from './tonalidad.ts'

/** Número al azar en [0, 1). */
export type Azar = () => number

export interface PreguntaGenerada {
  /** Lo que suena. */
  pieza: Pieza
  /** Opciones, ya con el texto que se muestra. */
  opciones: string[]
  /** Índice de la opción correcta. */
  correcta: number
  /** Qué ha sonado exactamente: se muestra al corregir. */
  explicacion: string
}

export type PasoOidoGenerado = Exclude<PasoOido, { modo: 'preguntas' }>

/** Generador determinista (mulberry32), para las pruebas y para repetir una tanda. */
export function azarConSemilla(semilla: number): Azar {
  let a = semilla >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function entero(azar: Azar, min: number, max: number): number {
  return min + Math.floor(azar() * (max - min + 1))
}

function elegir<T>(azar: Azar, lista: readonly T[]): T {
  return lista[Math.floor(azar() * lista.length)] as T
}

function barajar<T>(azar: Azar, lista: readonly T[]): T[] {
  const copia = [...lista]
  for (let i = copia.length - 1; i > 0; i--) {
    const k = Math.floor(azar() * (i + 1))
    ;[copia[i], copia[k]] = [copia[k] as T, copia[i] as T]
  }
  return copia
}

/**
 * Reparte `rondas` preguntas entre `cuantas` respuestas posibles: todas salen
 * más o menos las mismas veces y ninguna se repite dos veces seguidas (si hay
 * más de una).
 */
export function repartir(azar: Azar, cuantas: number, rondas: number): number[] {
  const salida: number[] = []
  const indices = Array.from({ length: cuantas }, (_, i) => i)
  while (salida.length < rondas) {
    let tanda = barajar(azar, indices)
    if (cuantas > 1 && salida.length > 0 && tanda[0] === salida[salida.length - 1]) tanda = [...tanda.slice(1), tanda[0] as number]
    salida.push(...tanda)
  }
  return salida.slice(0, rondas)
}

const VELOCIDAD = 92

function nota(t: number, d: number, n: number, v = VELOCIDAD): Nota {
  return { t, d, n, v }
}

function pieza(instrumento: IdInstrumento, notas: Nota[], compases: number, tempo: number, compas: Compas = [4, 4]): Pieza {
  return { tempo, compas, compases, pistas: [{ id: 'melodia', rol: 'melodia', instrumento, notas }] }
}

/**
 * Nombre de una nota MIDI que, al subirla el intervalo dado, da otra nota bien
 * escrita: entre «La♯» y «Si♭» se elige la que evita los dobles sostenidos.
 */
function nombreDeRaiz(midi: number, intervalo: string): string {
  const candidatas = [notaDeMidi(midi, 'sostenidos'), notaDeMidi(midi, 'bemoles')]
  const alteraciones = (n: string): number => (n.match(/[#b]/g) ?? []).length
  let mejor = candidatas[0] as string
  let coste = Number.POSITIVE_INFINITY
  for (const candidata of candidatas) {
    const c = alteraciones(candidata) + alteraciones(transportar(candidata, intervalo)) * 2
    if (c < coste) {
      mejor = candidata
      coste = c
    }
  }
  return mejor
}

// ───────────────────────────── intervalo ─────────────────────────────

function deIntervalo(paso: OidoIntervalo, nomenclatura: Nomenclatura, azar: Azar): PreguntaGenerada[] {
  const opciones = paso.intervalos.map((i) => mayuscula(nombreDeIntervalo(i)))
  return repartir(azar, paso.intervalos.length, paso.rondas).map((indice) => {
    const intervalo = paso.intervalos[indice] as string
    const salto = semitonos(intervalo)
    const direccion = elegir(azar, paso.direcciones)
    // Las dos notas caben en el `registro` siempre que sea más ancho que el intervalo; si no, manda la grave.
    const grave = entero(azar, paso.registro[0], Math.max(paso.registro[0], paso.registro[1] - salto))
    const nombreGrave = nombreDeRaiz(grave, intervalo)
    const nombreAguda = transportar(nombreGrave, intervalo)
    const aguda = midiDe(nombreAguda)
    const [a, b] = [nombreVisible(nombreGrave, nomenclatura), nombreVisible(nombreAguda, nomenclatura)]
    const cuantos = `${salto} ${salto === 1 ? 'semitono' : 'semitonos'}`
    if (direccion === 'armonico') {
      return {
        pieza: pieza(paso.instrumento, [nota(0, PPQ * 4, grave), nota(0, PPQ * 4, aguda)], 1, 80),
        opciones,
        correcta: indice,
        explicacion: `Sonaban a la vez ${a} y ${b}: una ${nombreDeIntervalo(intervalo)}, ${cuantos}.`,
      }
    }
    const [primera, segunda] = direccion === 'ascendente' ? [grave, aguda] : [aguda, grave]
    const [de, hasta] = direccion === 'ascendente' ? [a, b] : [b, a]
    return {
      pieza: pieza(paso.instrumento, [nota(0, PPQ * 2, primera), nota(PPQ * 2, PPQ * 2, segunda)], 1, 80),
      opciones,
      correcta: indice,
      explicacion: `De ${de} a ${hasta}: una ${nombreDeIntervalo(intervalo)} ${direccion}, ${cuantos}.`,
    }
  })
}

function mayuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

// ───────────────────────────── acorde ─────────────────────────────

const NOMBRES_DE_CALIDAD: Readonly<Record<string, string>> = {
  M: 'Mayor',
  m: 'Menor',
  dim: 'Disminuido',
  aug: 'Aumentado',
  sus2: 'Suspendido de segunda (sus2)',
  sus4: 'Suspendido de cuarta (sus4)',
  '7': 'Séptima de dominante (7)',
  maj7: 'Mayor con séptima mayor (maj7)',
  m7: 'Menor con séptima (m7)',
  m7b5: 'Semidisminuido (m7♭5)',
  dim7: 'Séptima disminuida (dim7)',
  mMaj7: 'Menor con séptima mayor (mMaj7)',
  '6': 'Mayor con sexta (6)',
  m6: 'Menor con sexta (m6)',
  '9': 'Novena de dominante (9)',
  maj9: 'Mayor con novena (maj9)',
  m9: 'Menor con novena (m9)',
  add9: 'Mayor con novena añadida (add9)',
}

/** Nombre visible de un tipo de acorde: «Menor con séptima (m7)». */
export function nombreDeCalidad(calidad: string): string {
  // Un tipo sin nombre propio se deja en cifrado, con las alteraciones bien escritas: «7b9» → «7♭9».
  return NOMBRES_DE_CALIDAD[calidad] ?? calidad.replace(/b(?=\d)/g, '♭').replaceAll('#', '♯')
}

function deAcorde(paso: OidoAcorde, nomenclatura: Nomenclatura, azar: Azar): PreguntaGenerada[] {
  const opciones = paso.calidades.map(nombreDeCalidad)
  const [min, max] = INSTRUMENTOS[paso.instrumento].rango
  return repartir(azar, paso.calidades.length, paso.rondas).map((indice) => {
    const calidad = paso.calidades[indice] as string
    const fundamental = entero(azar, paso.registro[0], paso.registro[1])
    // Para la fundamental se prefieren los bemoles salvo en Fa♯: son los nombres con los que se cifran los acordes.
    const clase = cromaDeMidi(fundamental) === 6 ? 'F#' : notaDeMidi(fundamental, 'bemoles').replace(/-?\d+$/, '')
    const acorde = Chord.getChord(calidad, clase)
    let notas = apilar(fundamental, acorde.notes)
    let inversion = 0
    if (paso.inversiones) {
      inversion = entero(azar, 0, Math.min(2, notas.length - 1))
      for (let i = 0; i < inversion; i++) notas = [...notas.slice(1), (notas[0] as number) + 12]
    }
    // Si al invertirlo se sale del instrumento, baja una octava.
    while (Math.max(...notas) > max && Math.min(...notas) - 12 >= min) notas = notas.map((n) => n - 12)
    const presentacion = paso.presentacion
    const eventos: Nota[] = []
    let compases = 1
    if (presentacion === 'bloque') {
      for (const n of notas) eventos.push(nota(0, PPQ * 4, n))
    } else {
      // Arpegio en negras; la última nota (y en «ambos», el acorde entero) se queda sonando.
      notas.forEach((n, i) => eventos.push(nota(i * PPQ, PPQ, n)))
      compases = Math.ceil((notas.length * PPQ) / (PPQ * 4))
      if (presentacion === 'ambos') {
        const inicio = compases * PPQ * 4
        for (const n of notas) eventos.push(nota(inicio, PPQ * 4, n))
        compases += 1
      }
    }
    const nombres = acorde.notes.map((n) => nombreVisible(n, nomenclatura)).join(', ')
    const posicion = inversion === 0 ? '' : inversion === 1 ? ', en primera inversión' : ', en segunda inversión'
    return {
      pieza: pieza(paso.instrumento, eventos, compases, 84),
      opciones,
      correcta: indice,
      explicacion: `Era ${cifradoVisible(acorde.symbol.replace(/^([A-G][#b]?)M$/, '$1'))}${posicion}: ${nombres}.`,
    }
  })
}

// ───────────────────────────── progresión ─────────────────────────────

function deProgresion(paso: OidoProgresion, nomenclatura: Nomenclatura, azar: Azar): PreguntaGenerada[] {
  const opciones = paso.progresiones.map((p) => p.join(' – '))
  const [min, max] = INSTRUMENTOS[paso.instrumento].rango
  return repartir(azar, paso.progresiones.length, paso.rondas).map((indice) => {
    const grados = paso.progresiones[indice] as string[]
    const tonalidad = leerTonalidad(elegir(azar, paso.tonalidades))
    const eventos: Nota[] = []
    const simbolos: string[] = []
    grados.forEach((grado, i) => {
      const acorde = acordeDeGrado(tonalidad, grado)
      simbolos.push(cifradoVisible(acorde.simbolo.replace(/^([A-G][#b]?)M$/, '$1')))
      const t = i * PPQ * 4
      // Mano derecha entre La3 y Sol♯4; el bajo, una octava y media por debajo.
      for (const n of enPosicionCerrada(acorde.notas, Math.max(min, 57))) if (n <= max) eventos.push(nota(t, PPQ * 4, n))
      const bajo = enPosicionCerrada([acorde.fundamental], Math.max(min, 40))[0]
      if (bajo !== undefined) eventos.push(nota(t, PPQ * 4, bajo, 84))
    })
    return {
      pieza: pieza(paso.instrumento, eventos, grados.length, paso.tempo),
      opciones,
      correcta: indice,
      explicacion: `En ${tonalidadVisible(tonalidad.texto, nomenclatura)}: ${simbolos.join(' – ')}.`,
    }
  })
}

// ───────────────────────────── escala ─────────────────────────────

function deEscala(paso: OidoEscala, nomenclatura: Nomenclatura, azar: Azar): PreguntaGenerada[] {
  const opciones = paso.escalas.map(mayuscula)
  const [min, max] = INSTRUMENTOS[paso.instrumento].rango
  return repartir(azar, paso.escalas.length, paso.rondas).map((indice) => {
    const tonica = elegir(azar, paso.tonicas)
    const tonalidad = leerTonalidad(`${tonica} ${paso.escalas[indice] as string}`)
    // La tónica, lo más cerca posible del Do central sin salirse del instrumento.
    let base = 60 + ((croma(tonica) + 6) % 12) - 6
    while (base < min) base += 12
    while (base + 12 > max) base -= 12
    const subida = [...apilar(base, tonalidad.escala), base + 12]
    const corchea = PPQ / 2
    let alturas: number[]
    if (paso.presentacion === 'escala') {
      alturas = [...subida, ...subida.slice(0, -1).reverse()]
    } else {
      // Una melodía corta que pasa por todos los grados: sube por terceras y baja por grados hasta la tónica.
      const n = subida.length
      const orden: number[] = []
      for (let i = 0; i + 2 < n; i += 2) orden.push(i, i + 2, i + 1)
      for (let i = n - 1; i >= 0; i--) orden.push(i)
      alturas = orden.map((i) => subida[i] as number)
    }
    const eventos = alturas.map((n, i) => nota(i * corchea, i === alturas.length - 1 ? PPQ * 2 : corchea, n))
    const fin = (alturas.length - 1) * corchea + PPQ * 2
    const nombres = tonalidad.escala.map((n) => nombreVisible(n, nomenclatura)).join(', ')
    return {
      pieza: pieza(paso.instrumento, eventos, Math.ceil(fin / (PPQ * 4)), 100),
      opciones,
      correcta: indice,
      explicacion: `Era ${tonalidadVisible(tonalidad.texto, nomenclatura)}: ${nombres}.`,
    }
  })
}

// ───────────────────────────── timbre ─────────────────────────────

/** Transporta una frase por octavas hasta que quepa centrada en el registro de un instrumento. */
export function llevarAlRegistro(notas: readonly Nota[], instrumento: IdInstrumento): Nota[] {
  const [min, max] = INSTRUMENTOS[instrumento].rango
  const grave = Math.min(...notas.map((n) => n.n))
  const aguda = Math.max(...notas.map((n) => n.n))
  const centro = (min + max) / 2
  let mejor = 0
  let distancia = Number.POSITIVE_INFINITY
  for (let octavas = -4; octavas <= 4; octavas++) {
    const salto = octavas * 12
    if (grave + salto < min || aguda + salto > max) continue
    // A igualdad de condiciones se prefiere no mover la frase.
    const d = Math.abs((grave + aguda) / 2 + salto - centro) + Math.abs(octavas) * 0.01
    if (d < distancia) {
      distancia = d
      mejor = salto
    }
  }
  return notas.map((n) => ({ ...n, n: n.n + mejor }))
}

function deTimbre(paso: OidoTimbre, azar: Azar): PreguntaGenerada[] {
  const opciones = paso.instrumentos.map((id) => INSTRUMENTOS[id].nombre)
  return repartir(azar, paso.instrumentos.length, paso.rondas).map((indice) => {
    const instrumento = paso.instrumentos[indice] as IdInstrumento
    return {
      pieza: pieza(instrumento, llevarAlRegistro(paso.frase, instrumento), paso.compases, paso.tempo, paso.compas),
      opciones,
      correcta: indice,
      explicacion: `Era ${INSTRUMENTOS[instrumento].nombre.toLowerCase()}. ${INSTRUMENTOS[instrumento].descripcion}`,
    }
  })
}

// ───────────────────────────── contorno ─────────────────────────────

function deContorno(paso: OidoContorno, nomenclatura: Nomenclatura, azar: Azar): PreguntaGenerada[] {
  const opciones = paso.incluirIgual ? ['Sube', 'Baja', 'Se queda igual'] : ['Sube', 'Baja']
  return repartir(azar, opciones.length, paso.rondas).map((indice) => {
    const intervalo = elegir(azar, paso.intervalos)
    const salto = indice === 2 ? 0 : semitonos(intervalo)
    const grave = entero(azar, paso.registro[0], Math.max(paso.registro[0], paso.registro[1] - salto))
    const nombreGrave = indice === 2 ? notaDeMidi(grave) : nombreDeRaiz(grave, intervalo)
    const nombreAguda = indice === 2 ? nombreGrave : transportar(nombreGrave, intervalo)
    const aguda = midiDe(nombreAguda)
    const [primera, segunda] = indice === 1 ? [aguda, grave] : [grave, aguda]
    const [de, hasta] = (indice === 1 ? [nombreAguda, nombreGrave] : [nombreGrave, nombreAguda]).map((n) => nombreVisible(n, nomenclatura))
    const explicacion = indice === 2 ? `Era dos veces la misma nota, ${de}.` : `De ${de} a ${hasta}: ${indice === 0 ? 'sube' : 'baja'} una ${nombreDeIntervalo(intervalo)}.`
    return { pieza: pieza(paso.instrumento, [nota(0, PPQ * 2, primera), nota(PPQ * 2, PPQ * 2, segunda)], 1, 80), opciones, correcta: indice, explicacion }
  })
}

// ───────────────────────────── compás ─────────────────────────────

/** Patrón de batería que deja oír el compás: bombo en el primer tiempo, un acento menor donde se parte el compás y charles en todos los tiempos. */
export function patronDeCompas(compas: Compas, compases: number): Nota[] {
  const tecla = (alias: string): number => teclaDePercusion('bateria', alias) ?? 36
  const porCompas = ticksPorCompas(compas)
  const porTiempo = ticksPorTiempo(compas)
  const [numerador] = compas
  const notas: Nota[] = []
  for (let c = 0; c < compases; c++) {
    for (let i = 0; i < numerador; i++) {
      const t = c * porCompas + i * porTiempo
      const primero = i === 0
      // Acento secundario: cada tres tiempos en los compases compuestos; en el tercero de un 4/4.
      const secundario = !primero && (esCompasCompuesto(compas) ? i % 3 === 0 : numerador === 4 && i === 2)
      if (primero) notas.push(nota(t, porTiempo, tecla('bombo'), 112))
      if (secundario) notas.push(nota(t, porTiempo, tecla('aro'), 84))
      notas.push(nota(t, porTiempo, tecla('charles'), primero ? 100 : secundario ? 80 : 64))
    }
  }
  return notas.sort((a, b) => a.t - b.t || a.n - b.n)
}

function deCompas(paso: OidoCompas, azar: Azar): PreguntaGenerada[] {
  const opciones = paso.compases.map(escribirCompas)
  return repartir(azar, paso.compases.length, paso.rondas).map((indice) => {
    const compas = paso.compases[indice] as Compas
    const compases = 4
    const agrupacion = esCompasCompuesto(compas) ? `${compas[0]} pulsos rápidos agrupados de tres en tres` : `${compas[0]} pulsos`
    return {
      pieza: { tempo: paso.tempo, compas, compases, pistas: [{ id: 'percusion', rol: 'percusion', instrumento: 'bateria', notas: patronDeCompas(compas, compases) }] },
      opciones,
      correcta: indice,
      explicacion: `El bombo vuelve cada ${agrupacion}: es un ${escribirCompas(compas)}.`,
    }
  })
}

// ───────────────────────────── entrada ─────────────────────────────

/** Genera la tanda de preguntas de un paso de oído. */
export function generarPreguntas(paso: PasoOidoGenerado, nomenclatura: Nomenclatura, azar: Azar): PreguntaGenerada[] {
  switch (paso.modo) {
    case 'intervalo':
      return deIntervalo(paso, nomenclatura, azar)
    case 'acorde':
      return deAcorde(paso, nomenclatura, azar)
    case 'progresion':
      return deProgresion(paso, nomenclatura, azar)
    case 'escala':
      return deEscala(paso, nomenclatura, azar)
    case 'timbre':
      return deTimbre(paso, azar)
    case 'contorno':
      return deContorno(paso, nomenclatura, azar)
    case 'compas':
      return deCompas(paso, azar)
  }
}
