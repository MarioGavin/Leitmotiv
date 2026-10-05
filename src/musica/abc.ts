/**
 * Convierte una pieza en notación ABC, que es lo que dibuja abcjs en la vista
 * de pentagrama. Es lógica pura: aquí no se carga la librería.
 *
 * Cada pista va en un pentagrama. Si en ella suenan a la vez notas que no
 * empiezan y acaban juntas (una nota larga debajo de otras cortas), se reparte
 * en capas, y cada capa es una voz del mismo pentagrama: así en cada voz solo
 * hay notas sueltas y acordes, y las ligaduras unen siempre el acorde entero.
 * abcjs empareja las ligaduras por posición dentro del acorde, no por altura:
 * ligar solo algunas notas de un acorde le hace dibujar ligaduras equivocadas.
 *
 * Dentro de una voz, lo que suena se corta donde algo empieza o acaba, en las
 * barras de compás y en los pulsos, y cada trozo se escribe como una nota, un
 * acorde o un silencio.
 *
 * Se escriben las figuras de la redonda con puntillo a la fusa y los tresillos
 * de negra, corchea y semicorchea. Si la pieza tiene otra cosa, se lanza un
 * `ErrorDePentagrama` en vez de dibujar una partitura aproximada.
 */
import { Key, Note } from 'tonal'
import { INSTRUMENTOS, type Instrumento } from './instrumentos.ts'
import { croma, cromaDeMidi } from './notas.ts'
import { type Nota, type Pieza, type Pista, type Rol, duracionEnTicks } from './pieza.ts'
import { esCompasCompuesto, ticksPorCompas, ticksPorPulso } from './tiempo.ts'
import { type Tonalidad, armaduraDe, leerTonalidad } from './tonalidad.ts'

/** La pieza tiene algo que el pentagrama no sabe escribir. */
export class ErrorDePentagrama extends Error {}

/** Unidad de duración del ABC que se escribe: la fusa (`L:1/32`). */
const UNIDAD = 60

/** Figuras que se pueden escribir, en ticks y de mayor a menor: de la redonda con puntillo a la fusa. */
const FIGURAS = [2880, 1920, 1440, 960, 720, 480, 360, 240, 180, 120, 60] as const

/** Lo que ocupa un grupo de tresillo, de mayor a menor: tres negras, tres corcheas o tres semicorcheas. */
const VENTANAS_DE_TRESILLO = [960, 480, 240] as const

export interface OpcionesDeAbc {
  /** Pistas que se escriben, por su `id`. Por defecto, todas. */
  pistas?: readonly string[]
  /** Compases por sistema. Por defecto, todos en una línea. */
  compasesPorLinea?: number
  /** Si se escribe el cifrado encima de la primera voz afinada. Por defecto, sí. */
  acordes?: boolean
  /** Si se escribe la indicación de tempo. Por defecto, sí. */
  tempo?: boolean
}

// ───────────────────────────── ortografía ─────────────────────────────

/** Cómo se llama cada grado cromático contado desde la tónica, en una tonalidad mayor y en una menor. */
const PLANTILLA_MAYOR = ['1P', '1A', '2M', '3m', '3M', '4P', '4A', '5P', '5A', '6M', '7m', '7M'] as const
const PLANTILLA_MENOR = ['1P', '2m', '2M', '3m', '3M', '4P', '4A', '5P', '6m', '6M', '7m', '7M'] as const

/**
 * Nombre con el que se escribe cada una de las doce clases de nota en una
 * tonalidad: las de la escala, como en la escala; las demás, según el grado
 * que alteran (en Sol menor, la sensible es Fa♯ y no Sol♭).
 */
export function ortografiaDe(tonalidad: Tonalidad | undefined): string[] {
  const tonica = tonalidad?.tonica ?? 'C'
  const menor = tonalidad !== undefined && tonalidad.cromas.has((croma(tonica) + 3) % 12) && !tonalidad.cromas.has((croma(tonica) + 4) % 12)
  const nombres = new Array<string>(12).fill('C')
  for (const intervalo of menor ? PLANTILLA_MENOR : PLANTILLA_MAYOR) {
    const nota = Note.transpose(tonica, intervalo)
    // Una nota de paso con doble alteración se cambia por su enarmónica sencilla.
    const sencilla = /##|bb/.test(nota) ? Note.simplify(nota) : nota
    nombres[croma(sencilla)] = sencilla
  }
  for (const nota of tonalidad?.escala ?? []) nombres[croma(nota)] = nota
  return nombres
}

interface Escrita {
  letra: string
  /** Semitonos de alteración: −1 bemol, 1 sostenido. */
  alteracion: number
  octava: number
}

function deletrear(midi: number, ortografia: readonly string[]): Escrita {
  const nombre = ortografia[cromaDeMidi(midi)] ?? 'C'
  let alteracion = 0
  for (const signo of nombre.slice(1)) alteracion += signo === '#' ? 1 : signo === 'b' ? -1 : 0
  // La octava es la de la letra: un Si♯ que suena como Do4 se escribe en la octava 3.
  return { letra: nombre.charAt(0), alteracion, octava: Math.floor((midi - alteracion) / 12) - 1 }
}

/** Altura en ABC: Do4 es «C», Do5 es «c», Do6 es «c'» y Do3 es «C,». */
function alturaAbc({ letra, octava }: Pick<Escrita, 'letra' | 'octava'>): string {
  return octava >= 5 ? letra.toLowerCase() + "'".repeat(octava - 5) : letra + ','.repeat(4 - octava)
}

const SIGNOS: Readonly<Record<string, string>> = { '-2': '__', '-1': '_', '0': '=', '1': '^', '2': '^^' }

// ───────────────────────────── claves ─────────────────────────────

interface Clave {
  abc: string
  /** Semitonos que se suman a lo que suena para escribirlo: las claves con un 8 se leen una octava más arriba o más abajo. */
  desplazamiento: number
  /** Registro (en lo que suena) que se lee con comodidad, sin más de dos o tres líneas adicionales. */
  comodo: readonly [number, number]
}

const CLAVE_DE_SOL: Clave = { abc: 'treble', desplazamiento: 0, comodo: [57, 86] }
const CLAVE_DE_FA: Clave = { abc: 'bass', desplazamiento: 0, comodo: [36, 64] }
const CLAVE_DE_SOL_ALTA: Clave = { abc: 'treble+8', desplazamiento: -12, comodo: [69, 98] }
const CLAVE_DE_FA_BAJA: Clave = { abc: 'bass-8', desplazamiento: 12, comodo: [24, 52] }

/** La clave en la que las notas de la pista se salen menos del pentagrama. A igualdad, la de sol (la de fa, para un bajo). */
function elegirClave(notas: readonly Nota[], rol: Rol): Clave {
  const candidatas = rol === 'bajo' ? [CLAVE_DE_FA, CLAVE_DE_FA_BAJA, CLAVE_DE_SOL, CLAVE_DE_SOL_ALTA] : [CLAVE_DE_SOL, CLAVE_DE_FA, CLAVE_DE_SOL_ALTA, CLAVE_DE_FA_BAJA]
  let mejor = candidatas[0] as Clave
  let coste = Number.POSITIVE_INFINITY
  for (const clave of candidatas) {
    const [grave, aguda] = clave.comodo
    const fuera = notas.reduce((suma, n) => suma + Math.max(0, grave - n.n, n.n - aguda), 0)
    if (fuera < coste) {
      mejor = clave
      coste = fuera
    }
  }
  return mejor
}

// ───────────────────────────── percusión ─────────────────────────────

interface SignoDePercusion {
  /** Dónde se escribe, como nota de ABC en clave de percusión. La alteración no se dibuja: solo distingue dos piezas que comparten sitio. */
  nota: string
  cabeza?: 'x' | 'triangle'
  /** Adorno que se escribe delante. */
  adorno?: string
}

/** Escritura habitual de la batería, por tecla General MIDI. */
const PERCUSION: Readonly<Record<number, SignoDePercusion>> = {
  36: { nota: 'F' },
  37: { nota: '^c', cabeza: 'x' },
  38: { nota: 'c' },
  42: { nota: 'g', cabeza: 'x' },
  44: { nota: 'D', cabeza: 'x' },
  45: { nota: 'A' },
  46: { nota: '^g', cabeza: 'x', adorno: '!open!' },
  49: { nota: 'a', cabeza: 'x' },
  50: { nota: 'e' },
  51: { nota: 'f', cabeza: 'x' },
  53: { nota: '^f', cabeza: 'triangle' },
}

/** Una pieza del kit que no está en la tabla se escribe en la línea central. */
const PERCUSION_POR_DEFECTO: SignoDePercusion = { nota: 'B' }

/** Orden de las notas de un acorde de percusión: de abajo arriba en el pentagrama. */
function ordenDePercusion(tecla: number): number {
  const nota = (PERCUSION[tecla] ?? PERCUSION_POR_DEFECTO).nota.replace('^', '')
  return 'CDEFGABcdefgab'.indexOf(nota)
}

// ───────────────────────────── del sonido a las figuras ─────────────────────────────

/** Una nota ya preparada para escribirse: con la altura escrita y recortada a la pieza. */
interface Sonido {
  n: number
  t: number
  fin: number
}

interface Evento {
  /** Inicio dentro del compás, en ticks. */
  pos: number
  /** Duración con la que se escribe, en ticks: dentro de un tresillo, vez y media la que suena. */
  escrita: number
  /** Alturas que suenan, de grave a aguda. Vacío: un silencio. */
  alturas: number[]
  /** Sigue sonando después de este evento: se liga con el siguiente. */
  sigue: boolean
  /** Ya venía sonando: no se le vuelven a poner las alteraciones. */
  viene: boolean
  /** Si abre un grupo de tresillo, cuántos eventos lo forman. */
  tresillo?: number
  /** Si es el primero después de un grupo de tresillo. */
  trasTresillo?: boolean
}

function noCabe(compas: number): ErrorDePentagrama {
  return new ErrorDePentagrama(`En el compás ${compas} hay una figura que el pentagrama no sabe escribir.`)
}

/**
 * Grupos de tresillo de un compás: los tramos en los que algún corte cae fuera
 * de la rejilla de fusas y todos caen en tercios del tramo.
 */
function ventanasDeTresillo(cortes: readonly number[], porCompas: number, pulso: number, compas: number): Array<readonly [number, number]> {
  const ventanas: Array<readonly [number, number]> = []
  for (const corte of cortes) {
    if (corte % UNIDAD === 0 || ventanas.some(([a, b]) => corte > a && corte < b)) continue
    const ventana = VENTANAS_DE_TRESILLO.map((ancho) => [Math.floor(corte / ancho) * ancho, Math.floor(corte / ancho) * ancho + ancho] as const).find(([desde, hasta]) => {
      const ancho = hasta - desde
      // El grupo cabe en un pulso o empieza en uno y ocupa pulsos enteros: no se monta a caballo de dos.
      const enUnPulso = Math.floor(desde / pulso) === Math.floor((hasta - 1) / pulso)
      const pulsosEnteros = desde % pulso === 0 && ancho % pulso === 0
      if (hasta > porCompas || !(enUnPulso || pulsosEnteros)) return false
      return cortes.every((c) => c <= desde || c >= hasta || (c - desde) % (ancho / 3) === 0)
    })
    if (!ventana) throw noCabe(compas)
    ventanas.push(ventana)
  }
  return ventanas
}

/**
 * Parte un tramo en figuras. Una figura que no empieza en un pulso no pasa del
 * pulso siguiente; una que empieza en un pulso puede ocupar varios (en un
 * compás compuesto, solo si los ocupa enteros).
 */
function partirEnFiguras(desde: number, hasta: number, pulso: number, compuesto: boolean, compas: number): number[] {
  const figuras: number[] = []
  let p = desde
  while (p < hasta) {
    const resto = hasta - p
    const enPulso = p % pulso === 0
    const limite = enPulso ? resto : Math.min(resto, pulso - (p % pulso))
    const figura = FIGURAS.find((f) => f <= limite && (f <= pulso || !compuesto || f % pulso === 0))
    if (figura === undefined) throw noCabe(compas)
    figuras.push(figura)
    p += figura
  }
  return figuras
}

interface Rejilla {
  porCompas: number
  pulso: number
  compuesto: boolean
}

/** Eventos de un compás de una voz: notas, acordes y silencios, ya con sus figuras, sus ligaduras y sus tresillos. */
function eventosDelCompas(sonidos: readonly Sonido[], inicio: number, rejilla: Rejilla, cortesExtra: readonly number[], compas: number): Evento[] {
  const { porCompas, pulso, compuesto } = rejilla
  const fin = inicio + porCompas
  const enCompas = sonidos.filter((s) => s.t < fin && s.fin > inicio)
  const cortes = new Set<number>([0, porCompas])
  for (const s of enCompas) {
    if (s.t > inicio) cortes.add(s.t - inicio)
    if (s.fin < fin) cortes.add(s.fin - inicio)
  }
  for (const c of cortesExtra) if (c > inicio && c < fin) cortes.add(c - inicio)
  const ventanas = ventanasDeTresillo(
    [...cortes].sort((a, b) => a - b),
    porCompas,
    pulso,
    compas,
  )
  for (const [a, b] of ventanas) cortes.add(a).add(b)
  const orden = [...cortes].sort((a, b) => a - b)

  const eventos: Evento[] = []
  let ventanaAnterior: readonly [number, number] | undefined
  for (let i = 0; i + 1 < orden.length; i++) {
    const a = orden[i] as number
    const b = orden[i + 1] as number
    // En una capa, todo lo que suena en un trozo empezó y acabará a la vez: el trozo entero viene ligado o sigue ligado.
    const cubren = enCompas.filter((s) => s.t - inicio <= a && s.fin - inicio >= b)
    const alturas = [...new Set(cubren.map((s) => s.n))].sort((x, y) => x - y)
    const sigue = cubren.some((s) => s.fin - inicio > b)
    const viene = cubren.some((s) => s.t - inicio < a)
    const ventana = ventanas.find(([desde, hasta]) => a >= desde && b <= hasta)
    if (ventana) {
      const ancho = ventana[1] - ventana[0]
      const evento: Evento = { pos: a, escrita: ((b - a) / (ancho / 3)) * (ancho / 2), alturas, sigue, viene }
      if (a === ventana[0]) evento.tresillo = orden.filter((c) => c >= ventana[0] && c < ventana[1]).length
      eventos.push(evento)
    } else {
      const figuras = partirEnFiguras(a, b, pulso, compuesto, compas)
      let p = a
      figuras.forEach((figura, k) => {
        const evento: Evento = { pos: p, escrita: figura, alturas, sigue: k < figuras.length - 1 || sigue, viene: k > 0 || viene }
        if (k === 0 && ventanaAnterior) evento.trasTresillo = true
        eventos.push(evento)
        p += figura
      })
    }
    ventanaAnterior = ventana
  }
  return eventos
}

// ───────────────────────────── de las figuras al texto ─────────────────────────────

interface Voz {
  pista: Pista
  percusion: boolean
  clave: Clave | undefined
  /** Capas de la pista: cada una se escribe como una voz del mismo pentagrama. */
  capas: Sonido[][]
}

interface Escritura {
  rejilla: Rejilla
  ortografia: readonly string[]
  /** Alteración que la armadura pone a cada letra. */
  armadura: ReadonlyMap<string, number>
}

function duracionAbc(ticks: number): string {
  const unidades = ticks / UNIDAD
  return unidades === 1 ? '' : String(unidades)
}

interface DatosDelCompas {
  percusion: boolean
  /** Silencio de esta voz: «z» se ve y «x» no (las capas secundarias callan sin ensuciar el pentagrama). */
  silencio: 'z' | 'x'
  /** Tick en el que empieza el compás. */
  inicio: number
  /** Acordes que se escriben encima, por tick. */
  cifrado: ReadonlyMap<number, string>
}

function textoDelCompas(eventos: readonly Evento[], datos: DatosDelCompas, escritura: Escritura): string {
  // Alteración vigente en cada línea o espacio (letra y octava) durante este compás.
  const vigentes = new Map<string, number>()
  let texto = ''
  eventos.forEach((evento, i) => {
    if (i > 0 && (evento.pos % escritura.rejilla.pulso === 0 || evento.tresillo !== undefined || evento.trasTresillo)) texto += ' '
    if (evento.tresillo !== undefined) texto += `(3:2:${evento.tresillo}`
    const simbolo = datos.cifrado.get(datos.inicio + evento.pos)
    if (simbolo !== undefined) texto += `"${simbolo}"`
    const duracion = duracionAbc(evento.escrita)
    // Un golpe de percusión partido en dos figuras no se liga: la segunda es silencio.
    if (evento.alturas.length === 0 || (datos.percusion && evento.viene)) {
      texto += `${datos.silencio}${duracion}`
      return
    }
    let notas: string[]
    if (datos.percusion) {
      const signos = [...evento.alturas].sort((a, b) => ordenDePercusion(a) - ordenDePercusion(b)).map((tecla) => PERCUSION[tecla] ?? PERCUSION_POR_DEFECTO)
      for (const adorno of new Set(signos.flatMap((signo) => signo.adorno ?? []))) texto += adorno
      notas = [...new Set(signos.map((signo) => signo.nota))]
    } else {
      notas = evento.alturas.map((n) => {
        const escrita = deletrear(n, escritura.ortografia)
        const sitio = `${escrita.letra}${escrita.octava}`
        let signo = ''
        // Una nota que viene ligada no repite la alteración.
        if (!evento.viene && escrita.alteracion !== (vigentes.get(sitio) ?? escritura.armadura.get(escrita.letra) ?? 0)) {
          signo = SIGNOS[String(escrita.alteracion)] ?? ''
          vigentes.set(sitio, escrita.alteracion)
        }
        return `${signo}${alturaAbc(escrita)}`
      })
    }
    const ligadura = evento.sigue && !datos.percusion ? '-' : ''
    texto += `${notas.length === 1 ? (notas[0] as string) : `[${notas.join('')}]`}${duracion}${ligadura}`
  })
  return texto
}

/**
 * Reparte lo que suena en capas: dentro de cada una, las notas que coinciden
 * empiezan y acaban a la vez. La primera capa es la más aguda.
 */
function repartirEnCapas(sonidos: readonly Sonido[]): Sonido[][] {
  const bloques = new Map<string, Sonido[]>()
  for (const sonido of sonidos) {
    const clave = `${sonido.t}:${sonido.fin}`
    const bloque = bloques.get(clave)
    if (bloque) bloque.push(sonido)
    else bloques.set(clave, [sonido])
  }
  const media = (grupo: readonly Sonido[]): number => grupo.reduce((suma, x) => suma + x.n, 0) / grupo.length
  const inicioDe = (bloque: readonly Sonido[]): number => bloque[0]?.t ?? 0
  const finDe = (bloque: readonly Sonido[]): number => bloque[0]?.fin ?? 0
  // Por orden de entrada; si dos entran a la vez, primero el más agudo.
  const enOrden = [...bloques.values()].sort((a, b) => inicioDe(a) - inicioDe(b) || media(b) - media(a))
  const capas: Array<{ libreDesde: number; ultima: number; sonidos: Sonido[] }> = []
  for (const bloque of enOrden) {
    // De las capas que están calladas, sigue en la que venía sonando más cerca: así una melodía no salta de voz.
    const altura = media(bloque)
    let capa: (typeof capas)[number] | undefined
    for (const candidata of capas) {
      if (candidata.libreDesde > inicioDe(bloque)) continue
      if (!capa || Math.abs(candidata.ultima - altura) < Math.abs(capa.ultima - altura)) capa = candidata
    }
    if (!capa) {
      capa = { libreDesde: 0, ultima: altura, sonidos: [] }
      capas.push(capa)
    }
    capa.sonidos.push(...bloque)
    capa.libreDesde = finDe(bloque)
    capa.ultima = altura
  }
  if (capas.length === 0) return [[]]
  return capas.map((c) => c.sonidos).sort((a, b) => media(b) - media(a))
}

/** Golpes de percusión con su duración escrita: cada uno llega hasta el golpe siguiente o hasta el final de su pulso, lo que ocurra antes. */
function sonidosDePercusion(notas: readonly Nota[], total: number, rejilla: Rejilla): Sonido[] {
  const inicios = [...new Set(notas.map((n) => n.t))].sort((a, b) => a - b)
  return notas.map((n) => {
    const enCompas = n.t % rejilla.porCompas
    const finDePulso = n.t - enCompas + Math.min(rejilla.porCompas, (Math.floor(enCompas / rejilla.pulso) + 1) * rejilla.pulso)
    const siguiente = inicios.find((t) => t > n.t) ?? total
    return { n: n.n, t: n.t, fin: Math.min(siguiente, finDePulso, total) }
  })
}

function prepararVoz(pista: Pista, total: number, rejilla: Rejilla): Voz {
  const instrumento: Instrumento = INSTRUMENTOS[pista.instrumento]
  const notas = pista.notas.filter((n) => n.d > 0 && n.t >= 0 && n.t < total)
  // En la percusión los golpes que coinciden duran lo mismo y ninguno pisa al siguiente: siempre es una sola capa.
  if (instrumento.percusion) return { pista, percusion: true, clave: undefined, capas: [sonidosDePercusion(notas, total, rejilla)] }
  const clave = elegirClave(notas, pista.rol)
  return { pista, percusion: false, clave, capas: repartirEnCapas(notas.map((n) => ({ n: n.n + clave.desplazamiento, t: n.t, fin: Math.min(n.t + n.d, total) }))) }
}

/** Convierte una pieza en ABC. Lanza `ErrorDePentagrama` si tiene figuras que no se pueden escribir. */
export function piezaAAbc(pieza: Pieza, opciones: OpcionesDeAbc = {}): string {
  const elegidas = opciones.pistas
  const pistas = elegidas ? pieza.pistas.filter((p) => elegidas.includes(p.id)) : pieza.pistas
  if (pistas.length === 0) throw new ErrorDePentagrama('No hay ninguna pista que escribir.')

  const rejilla: Rejilla = { porCompas: ticksPorCompas(pieza.compas), pulso: ticksPorPulso(pieza.compas), compuesto: esCompasCompuesto(pieza.compas) }
  if (rejilla.porCompas % UNIDAD !== 0) throw new ErrorDePentagrama(`El pentagrama no sabe escribir el compás ${pieza.compas[0]}/${pieza.compas[1]}.`)
  const total = duracionEnTicks(pieza)
  const tonalidad = pieza.tonalidad === undefined ? undefined : leerTonalidad(pieza.tonalidad)
  const armadura = tonalidad ? armaduraDe(tonalidad) : undefined
  const alteradas = new Map<string, number>()
  if (armadura) {
    for (const nota of Key.majorKey(armadura.relativaMayor).scale) {
      if (nota.length > 1) alteradas.set(nota.charAt(0), nota.charAt(1) === '#' ? 1 : -1)
    }
  }
  const escritura: Escritura = { rejilla, ortografia: ortografiaDe(tonalidad), armadura: alteradas }

  const voces = pistas.map((pista) => prepararVoz(pista, total, rejilla))
  // El cifrado va sobre la primera voz afinada; encima de una batería no se leería como armonía.
  const vozDelCifrado = opciones.acordes === false ? undefined : voces.find((v) => !v.percusion)
  const cifrado = new Map<number, string>()
  if (vozDelCifrado) for (const acorde of pieza.acordes ?? []) if (acorde.t < total) cifrado.set(acorde.t, acorde.simbolo)

  const lineas = ['X:1', `M:${pieza.compas[0]}/${pieza.compas[1]}`, 'L:1/32']
  if (opciones.tempo !== false) lineas.push(`Q:1/4=${Math.round(pieza.tempo)}`)
  if (voces.some((v) => v.percusion)) {
    for (const [tecla, signo] of Object.entries(PERCUSION)) lineas.push(`%%percmap ${signo.nota} ${tecla}${signo.cabeza ? ` ${signo.cabeza}` : ''}`)
  }
  lineas.push(`K:${armadura?.relativaMayor ?? 'C'}`)

  // Cada capa de cada pista es una voz de ABC; las de una misma pista comparten pentagrama.
  const vocesAbc: Array<{ numero: number; voz: Voz; compases: string[] }> = []
  const sinCifrado = new Map<number, string>()
  for (const voz of voces) {
    voz.capas.forEach((sonidos, capa) => {
      const conCifrado = voz === vozDelCifrado && capa === 0
      const compases = Array.from({ length: pieza.compases }, (_, c) => {
        const inicio = c * rejilla.porCompas
        const eventos = eventosDelCompas(sonidos, inicio, rejilla, conCifrado ? [...cifrado.keys()] : [], c + 1)
        return textoDelCompas(eventos, { percusion: voz.percusion, silencio: capa === 0 ? 'z' : 'x', inicio, cifrado: conCifrado ? cifrado : sinCifrado }, escritura)
      })
      vocesAbc.push({ numero: vocesAbc.length + 1, voz, compases })
    })
  }
  if (voces.some((voz) => voz.capas.length > 1)) {
    const grupos = voces.map((voz) => {
      const numeros = vocesAbc.filter((v) => v.voz === voz).map((v) => v.numero)
      return numeros.length > 1 ? `(${numeros.join(' ')})` : String(numeros[0])
    })
    lineas.push(`%%score ${grupos.join(' ')}`)
  }
  for (const v of vocesAbc) lineas.push(`V:${v.numero} clef=${v.voz.clave?.abc ?? 'perc'}`)

  const porLinea = Math.max(1, Math.floor(opciones.compasesPorLinea ?? pieza.compases))
  for (let desde = 0; desde < pieza.compases; desde += porLinea) {
    const hasta = Math.min(pieza.compases, desde + porLinea)
    for (const v of vocesAbc) {
      // La percusión no lleva armadura: su voz arranca en su propia tonalidad, sin alteraciones.
      const arranque = desde === 0 ? `${v.voz.percusion ? '[K:C]' : ''}${pieza.bucle ? '|:' : ''}` : ''
      const cierre = hasta === pieza.compases ? (pieza.bucle ? ':|' : '|]') : '|'
      lineas.push(`[V:${v.numero}]${arranque} ${v.compases.slice(desde, hasta).join(' | ')} ${cierre}`)
    }
  }
  return `${lineas.join('\n')}\n`
}

/** ¿Se puede escribir esta pieza en el pentagrama? */
export function cabeEnPentagrama(pieza: Pieza, opciones: OpcionesDeAbc = {}): boolean {
  try {
    piezaAAbc(pieza, opciones)
    return true
  } catch (error) {
    if (error instanceof ErrorDePentagrama) return false
    throw error
  }
}
