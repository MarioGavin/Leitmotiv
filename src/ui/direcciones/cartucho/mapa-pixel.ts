/**
 * Mapa del mundo de la dirección «Cartucho»: un mapa de RPG de 16 bits
 * generado y pintado por código, píxel a píxel.
 *
 * No hay imágenes: el terreno sale de una ruta (un nodo por mundo), un campo
 * de distancias y ruido determinista, y los árboles, montañas y casas son
 * pequeños dibujos de texto. El mismo plano se pinta con la paleta del día o
 * con la de la noche.
 */

/** Lado de una tesela, en píxeles lógicos. En pantalla cada píxel lógico son 2 px de CSS. */
export const TESELA = 8
/** Ancho del mapa, en teselas. */
export const ANCHO = 30
const SEPARACION = 6
const MARGEN_ARRIBA = 5
const MARGEN_ABAJO = 6

type NombreDeBioma = 'pradera' | 'flores' | 'bosque' | 'otono' | 'desierto' | 'sierra' | 'islas' | 'ruinas' | 'nieve' | 'ciudad' | 'ceniza' | 'cumbre'

/** Un bioma por mundo, en orden: el viaje cambia de paisaje a cada etapa. */
const BIOMAS: readonly NombreDeBioma[] = ['pradera', 'flores', 'bosque', 'otono', 'desierto', 'sierra', 'islas', 'ruinas', 'nieve', 'ciudad', 'ceniza', 'cumbre']

type Adorno = 'arbol' | 'arbolOtono' | 'flores' | 'cactus' | 'montana' | 'pinoNevado' | 'roca' | 'columna' | 'casita' | 'arbolSeco'

interface Bioma {
  /** Colores del suelo: base, mota oscura y mota clara. */
  suelo: readonly [string, string, string]
  adornos: ReadonlyArray<readonly [Adorno, number]>
  /** Cuánta tierra hay alrededor del camino, en teselas. */
  radio: number
}

/** Paleta de día. La de noche se deriva de esta (ver `aNoche`). */
const C = {
  mar: '#5aa9e0',
  marClaro: '#7dc0ee',
  espuma: '#e4f4ff',
  costa: '#2f6fa8',
  hierba: '#7ecb6a',
  hierbaOscura: '#5fae58',
  hierbaClara: '#a3df86',
  copa: '#3f9a4b',
  copaOscura: '#2a7040',
  copaClara: '#72c763',
  tronco: '#7a4f2a',
  otono: '#e58a2b',
  otonoOscuro: '#b55f1d',
  otonoClaro: '#f6bc4f',
  sueloOtono: '#b9c26a',
  arena: '#efd58f',
  arenaOscura: '#d6b56a',
  arenaClara: '#f8e7b4',
  cactus: '#4f9a4a',
  roca: '#9aa0ad',
  rocaOscura: '#6c7384',
  rocaClara: '#cdd2dc',
  sueloSierra: '#a9bf7c',
  nieve: '#eef4fa',
  nieveSombra: '#c6d5e8',
  pino: '#3d7f6a',
  losa: '#c9c2b0',
  losaOscura: '#a69d88',
  ceniza: '#6a6272',
  cenizaOscura: '#4a4353',
  cenizaClara: '#8a8193',
  lava: '#ff7a3a',
  camino: '#ecd49b',
  caminoBorde: '#b8935a',
  tejado: '#d2483a',
  tejadoOscuro: '#9e2f26',
  pared: '#f6ecd2',
  ventana: '#3a4a7a',
  puerta: '#7a4f2a',
  piedra: '#b7bcc8',
  piedraOscura: '#7d8494',
  bandera: '#f7b733',
  contorno: '#1b2440',
  petalo: '#ffffff',
  petalo2: '#ff9db0',
  polen: '#f7c948',
} as const

const DATOS_DE_BIOMA: Readonly<Record<NombreDeBioma, Bioma>> = {
  pradera: { suelo: [C.hierba, C.hierbaOscura, C.hierbaClara], adornos: [['arbol', 0.06]], radio: 4.6 },
  flores: {
    suelo: [C.hierba, C.hierbaOscura, C.hierbaClara],
    adornos: [
      ['flores', 0.22],
      ['arbol', 0.04],
    ],
    radio: 4.6,
  },
  bosque: { suelo: [C.hierbaOscura, C.copaOscura, C.hierba], adornos: [['arbol', 0.5]], radio: 5 },
  otono: { suelo: [C.sueloOtono, C.otonoOscuro, C.otonoClaro], adornos: [['arbolOtono', 0.42]], radio: 5 },
  desierto: {
    suelo: [C.arena, C.arenaOscura, C.arenaClara],
    adornos: [
      ['cactus', 0.09],
      ['roca', 0.05],
    ],
    radio: 4.4,
  },
  sierra: {
    suelo: [C.sueloSierra, C.hierbaOscura, C.hierbaClara],
    adornos: [
      ['montana', 0.4],
      ['roca', 0.06],
    ],
    radio: 5,
  },
  islas: { suelo: [C.arena, C.arenaOscura, C.arenaClara], adornos: [['arbol', 0.12]], radio: 1.9 },
  ruinas: {
    suelo: [C.losa, C.losaOscura, C.hierba],
    adornos: [
      ['columna', 0.13],
      ['roca', 0.07],
    ],
    radio: 4.4,
  },
  nieve: {
    suelo: [C.nieve, C.nieveSombra, C.nieve],
    adornos: [
      ['pinoNevado', 0.3],
      ['roca', 0.04],
    ],
    radio: 4.8,
  },
  ciudad: {
    suelo: [C.losa, C.losaOscura, C.arenaClara],
    adornos: [
      ['casita', 0.28],
      ['arbol', 0.05],
    ],
    radio: 4.4,
  },
  ceniza: {
    suelo: [C.ceniza, C.cenizaOscura, C.cenizaClara],
    adornos: [
      ['arbolSeco', 0.12],
      ['roca', 0.1],
    ],
    radio: 4.6,
  },
  cumbre: { suelo: [C.ceniza, C.cenizaOscura, C.lava], adornos: [['montana', 0.3]], radio: 4.2 },
}

// ───────────────────────────── dibujos ─────────────────────────────

type Dibujo = readonly string[]
type Colores = Readonly<Record<string, string>>

const DIBUJOS: Readonly<Record<Adorno, { dibujo: Dibujo; colores: Colores }>> = {
  arbol: {
    dibujo: ['..oooo..', '.oLLGGo.', 'oLLGGGGo', 'oGGGGGGo', 'oGGGGDDo', '.oGDDDo.', '..otto..', '...tt...'],
    colores: { o: C.copaOscura, G: C.copa, L: C.copaClara, D: C.copaOscura, t: C.tronco },
  },
  arbolOtono: {
    dibujo: ['..oooo..', '.oLLGGo.', 'oLLGGGGo', 'oGGGGGGo', 'oGGGGDDo', '.oGDDDo.', '..otto..', '...tt...'],
    colores: { o: C.otonoOscuro, G: C.otono, L: C.otonoClaro, D: C.otonoOscuro, t: C.tronco },
  },
  flores: {
    dibujo: ['........', '..f.....', '.fyf....', '..f...p.', '.....pyp', '......p.', '.f......', '........'],
    colores: { f: C.petalo, p: C.petalo2, y: C.polen },
  },
  cactus: {
    dibujo: ['........', '...cc...', '.c.cc...', '.c.cc.c.', '.cccc.c.', '...cccc.', '...cc...', '...cc...'],
    colores: { c: C.cactus },
  },
  montana: {
    dibujo: ['...oo...', '..oSSo..', '..oSRo..', '.oSRRDo.', '.oRRRDo.', 'oRRRDDDo', 'oRRDDDDo', 'oooooooo'],
    colores: { o: C.contorno, S: C.rocaClara, R: C.roca, D: C.rocaOscura },
  },
  pinoNevado: {
    dibujo: ['...oo...', '..oNNo..', '..oPPo..', '.oNNNNo.', '.oPPPPo.', 'oNNNNNNo', 'oPPPPPPo', '...tt...'],
    colores: { o: C.contorno, N: C.nieve, P: C.pino, t: C.tronco },
  },
  roca: {
    dibujo: ['........', '........', '..ooo...', '.oRRLo..', 'oRRRRLo.', 'oRDRRRo.', '.oooooo.', '........'],
    colores: { o: C.contorno, R: C.roca, L: C.rocaClara, D: C.rocaOscura },
  },
  columna: {
    dibujo: ['........', '.oooo...', '.oLLo...', '..oLo...', '..oLo...', '..oLo.o.', '.oLLooLo', '.oooo.oo'],
    colores: { o: C.contorno, L: C.rocaClara },
  },
  casita: {
    dibujo: ['........', '..oooo..', '.oTTTTo.', 'oTTTTTTo', 'oooooooo', '.oPWPPo.', '.oPPdPo.', '.oooooo.'],
    colores: { o: C.contorno, T: C.tejado, P: C.pared, W: C.ventana, d: C.puerta },
  },
  arbolSeco: {
    dibujo: ['........', '.t...t..', '..t.t...', '..ttt.t.', '...ttt..', '...tt...', '...tt...', '..tttt..'],
    colores: { t: C.cenizaOscura },
  },
}

const CASA: Dibujo = [
  '................',
  '......oooo......',
  '.....oTTTTo.....',
  '....oTTTTTTo....',
  '...oTTTTTTTTo...',
  '..oTTTTTTTTTTo..',
  '.oTTTTTTTTTTTTo.',
  'oooooooooooooooo',
  '.oPPPPPPPPPPPPo.',
  '.oPWWPPPPPPWWPo.',
  '.oPWWPPddPPWWPo.',
  '.oPPPPPddPPPPPo.',
  '.oPPPPPddPPPPPo.',
  '.oooooooooooooo.',
  '................',
  '................',
]

const CARTEL: Dibujo = [
  '................',
  '................',
  '................',
  '..oooooooooooo..',
  '..oMMMMMMMMMMo..',
  '..oMmmMMMmmMMo..',
  '..oMMMMMMMMMMo..',
  '..oMmmmMMmmMMo..',
  '..oMMMMMMMMMMo..',
  '..oooooooooooo..',
  '......oMMo......',
  '......oMMo......',
  '......oMMo......',
  '.....oooooo.....',
  '................',
  '................',
]

const CASTILLO: Dibujo = [
  '.......oB.......',
  '.......oBB......',
  '.o.o.o.o..o.o.o.',
  '.ooooo.o..ooooo.',
  '.oSSSo.oo.oSSSo.',
  '.oSWSooooooSWSo.',
  '.oSSSoSSSSoSSSo.',
  '.oSSSoSWWSoSSSo.',
  '.oSSSSSSSSSSSSo.',
  '.oSDSSSddSSSDSo.',
  '.oSDSSddddSSDSo.',
  '.oSSSSddddSSSSo.',
  '.oSSSSddddSSSSo.',
  '.oooooooooooooo.',
  '................',
  '................',
]

// ───────────────────────────── plano ─────────────────────────────

export interface NodoEnMapa {
  /** Posición de la tesela del nodo. */
  x: number
  y: number
}

export interface PlanoDelMapa {
  ancho: number
  alto: number
  nodos: NodoEnMapa[]
  /** Por tesela: ¿es tierra? */
  tierra: Uint8Array
  /** Por tesela: ¿pasa el camino? */
  camino: Uint8Array
  /** Por tesela: índice del bioma (el del mundo más cercano en vertical). */
  bioma: Uint8Array
  /** Por tesela: adorno que lleva (índice en ADORNOS + 1) o 0. */
  adorno: Uint8Array
}

const ADORNOS = Object.keys(DIBUJOS) as Adorno[]

/** Ruido determinista en [0, 1): el mismo mapa en todos los dispositivos. */
function azar(x: number, y: number, semilla = 0): number {
  let h = (x * 374761393 + y * 668265263 + semilla * 2147483647) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

/** Ruido suave: interpola el ruido de una rejilla más gruesa. */
function ruidoSuave(x: number, y: number, escala: number, semilla: number): number {
  const gx = x / escala
  const gy = y / escala
  const x0 = Math.floor(gx)
  const y0 = Math.floor(gy)
  const fx = gx - x0
  const fy = gy - y0
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const a = azar(x0, y0, semilla)
  const b = azar(x0 + 1, y0, semilla)
  const c = azar(x0, y0 + 1, semilla)
  const d = azar(x0 + 1, y0 + 1, semilla)
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy
}

/** Calcula el plano para un número de nodos (los mundos del curso más el proyecto final). */
export function trazarPlano(numNodos: number): PlanoDelMapa {
  const ancho = ANCHO
  const alto = MARGEN_ARRIBA + (numNodos - 1) * SEPARACION + MARGEN_ABAJO
  const n = ancho * alto
  const en = (x: number, y: number): number => y * ancho + x

  // La ruta serpentea alrededor del centro; siempre cabe en una pantalla de 360 px.
  const nodos: NodoEnMapa[] = Array.from({ length: numNodos }, (_, i) => ({
    x: Math.round(15 + 5.6 * Math.sin(i * 1.9 + 0.6)),
    y: MARGEN_ARRIBA + i * SEPARACION,
  }))

  const camino = new Uint8Array(n)
  for (let i = 0; i < nodos.length - 1; i++) {
    const a = nodos[i] as NodoEnMapa
    const b = nodos[i + 1] as NodoEnMapa
    const codo = a.y + 2 + (i % 3)
    for (let y = a.y; y <= codo; y++) camino[en(a.x, y)] = 1
    for (let x = Math.min(a.x, b.x); x <= Math.max(a.x, b.x); x++) camino[en(x, codo)] = 1
    for (let y = codo; y <= b.y; y++) camino[en(b.x, y)] = 1
  }

  const bioma = new Uint8Array(n)
  for (let y = 0; y < alto; y++) {
    const k = Math.min(numNodos - 1, Math.max(0, Math.round((y - MARGEN_ARRIBA) / SEPARACION)))
    for (let x = 0; x < ancho; x++) bioma[en(x, y)] = k % BIOMAS.length
  }

  // Distancia de cada tesela al camino (dos pasadas, como en una transformada de distancia).
  const distancia = new Float32Array(n).fill(99)
  for (let i = 0; i < n; i++) if (camino[i]) distancia[i] = 0
  const relajar = (x: number, y: number, dx: number, dy: number, coste: number): void => {
    const xx = x + dx
    const yy = y + dy
    if (xx < 0 || yy < 0 || xx >= ancho || yy >= alto) return
    const candidato = (distancia[en(xx, yy)] as number) + coste
    if (candidato < (distancia[en(x, y)] as number)) distancia[en(x, y)] = candidato
  }
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      relajar(x, y, -1, 0, 1)
      relajar(x, y, 0, -1, 1)
      relajar(x, y, -1, -1, 1.4)
      relajar(x, y, 1, -1, 1.4)
    }
  }
  for (let y = alto - 1; y >= 0; y--) {
    for (let x = ancho - 1; x >= 0; x--) {
      relajar(x, y, 1, 0, 1)
      relajar(x, y, 0, 1, 1)
      relajar(x, y, 1, 1, 1.4)
      relajar(x, y, -1, 1, 1.4)
    }
  }

  const tierra = new Uint8Array(n)
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const b = DATOS_DE_BIOMA[BIOMAS[bioma[en(x, y)] as number] as NombreDeBioma]
      const d = distancia[en(x, y)] as number
      const borde = x < 2 || x >= ancho - 2 || y < 1 || y >= alto - 1
      if (!borde && d + (ruidoSuave(x, y, 4, 7) - 0.5) * 3.4 < b.radio) tierra[en(x, y)] = 1
    }
  }
  // Alrededor de cada nodo siempre hay tierra firme: una explanada.
  for (const nodo of nodos) {
    for (let dy = -2; dy <= 1; dy++) {
      for (let dx = -2; dx <= 2; dx++) tierra[en(nodo.x + dx, nodo.y + dy)] = 1
    }
  }

  const adorno = new Uint8Array(n)
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const i = en(x, y)
      if (!tierra[i] || camino[i]) continue
      // Nada tapa la explanada del nodo ni el edificio que hay encima.
      if (nodos.some((nodo) => Math.abs(nodo.x - x) <= 2 && y - nodo.y >= -3 && y - nodo.y <= 1)) continue
      const b = DATOS_DE_BIOMA[BIOMAS[bioma[i] as number] as NombreDeBioma]
      let r = azar(x, y, 3)
      for (const [tipo, densidad] of b.adornos) {
        if (r < densidad) {
          adorno[i] = ADORNOS.indexOf(tipo) + 1
          break
        }
        r -= densidad
      }
    }
  }

  return { ancho, alto, nodos, tierra, camino, bioma, adorno }
}

// ───────────────────────────── pintura ─────────────────────────────

/** El mar de noche tiene sus propios colores: más oscuro que la tierra, para que la isla destaque a la luz de la luna. */
const MAR_DE_NOCHE: Readonly<Record<string, string>> = {
  [C.mar]: '#14285a',
  [C.marClaro]: '#1e3a78',
  [C.espuma]: '#4a70b8',
  [C.costa]: '#0c1a40',
}

/** De día a noche: se oscurece y se tiñe de azul, salvo las luces. */
function aNoche(hex: string): string {
  const mar = MAR_DE_NOCHE[hex]
  if (mar) return mar
  const n = Number.parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  const rr = Math.round(r * 0.42 + 8)
  const gg = Math.round(g * 0.5 + 16)
  const bb = Math.round(b * 0.62 + 40)
  return `rgb(${rr} ${gg} ${bb})`
}

export type MomentoDelDia = 'dia' | 'noche'

/** Estado de un nodo, que decide qué edificio se dibuja encima. */
export type EdificioDeNodo = 'casa' | 'cartel' | 'castillo'

/** Pinta el mapa completo en un lienzo de `ancho × TESELA` por `alto × TESELA` píxeles. */
export function pintarMapa(ctx: CanvasRenderingContext2D, plano: PlanoDelMapa, momento: MomentoDelDia, edificios: readonly EdificioDeNodo[]): void {
  const { ancho, alto, tierra, camino, bioma, adorno, nodos } = plano
  const T = TESELA
  const en = (x: number, y: number): number => y * ancho + x
  const esTierra = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < ancho && y < alto && tierra[en(x, y)] === 1
  const esCamino = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < ancho && y < alto && camino[en(x, y)] === 1
  const noche = momento === 'noche'
  const color = (hex: string): string => (noche ? aNoche(hex) : hex)
  // Las luces (ventanas, lava, bandera) no se apagan de noche: al contrario.
  const luz = (hex: string): string => hex
  const punto = (x: number, y: number, c: string, w = 1, h = 1): void => {
    ctx.fillStyle = c
    ctx.fillRect(x, y, w, h)
  }
  const dibujar = (dibujo: Dibujo, colores: Colores, px: number, py: number, luces: Colores = {}): void => {
    dibujo.forEach((fila, y) => {
      for (let x = 0; x < fila.length; x++) {
        const letra = fila[x] as string
        if (letra === '.') continue
        const encendida = luces[letra]
        const c = encendida ?? colores[letra]
        if (c) punto(px + x, py + y, encendida ? luz(encendida) : color(c))
      }
    })
  }

  // Mar, con algunas olas.
  punto(0, 0, color(C.mar), ancho * T, alto * T)
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      if (tierra[en(x, y)]) continue
      const r = azar(x, y, 11)
      if (r < 0.16) punto(x * T + 1 + Math.floor(r * 30), y * T + 2 + Math.floor(azar(x, y, 12) * 4), color(C.marClaro), 3, 1)
    }
  }

  // Tierra: suelo del bioma con motas, espuma en la orilla y un borde oscuro al sur que da relieve.
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const i = en(x, y)
      if (!tierra[i]) {
        if (esTierra(x, y - 1)) punto(x * T, y * T, color(C.costa), T, 2)
        continue
      }
      const b = DATOS_DE_BIOMA[BIOMAS[bioma[i] as number] as NombreDeBioma]
      punto(x * T, y * T, color(b.suelo[0]), T, T)
      for (let k = 0; k < 3; k++) {
        const r = azar(x * 3 + k, y, 21)
        if (r < 0.5) punto(x * T + Math.floor(azar(x, y, 30 + k) * 7), y * T + Math.floor(azar(x, y, 40 + k) * 7), color(r < 0.25 ? b.suelo[1] : b.suelo[2]), r < 0.12 ? 2 : 1, 1)
      }
      if (!esTierra(x, y - 1)) punto(x * T, y * T, color(C.espuma), T, 1)
      if (!esTierra(x - 1, y)) punto(x * T, y * T, color(C.espuma), 1, T)
      if (!esTierra(x + 1, y)) punto(x * T + T - 1, y * T, color(C.espuma), 1, T)
    }
  }

  // Camino, con el borde marcado allí donde no continúa. Sobre el agua es un puente de tablas.
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      if (!camino[en(x, y)]) continue
      const px = x * T
      const py = y * T
      if (tierra[en(x, y)]) {
        punto(px, py, color(C.camino), T, T)
        if (!esCamino(x, y - 1)) punto(px, py, color(C.caminoBorde), T, 1)
        if (!esCamino(x, y + 1)) punto(px, py + T - 1, color(C.caminoBorde), T, 1)
        if (!esCamino(x - 1, y)) punto(px, py, color(C.caminoBorde), 1, T)
        if (!esCamino(x + 1, y)) punto(px + T - 1, py, color(C.caminoBorde), 1, T)
        if (azar(x, y, 51) < 0.4) punto(px + 2 + Math.floor(azar(x, y, 52) * 4), py + 2 + Math.floor(azar(x, y, 53) * 4), color(C.caminoBorde))
      } else {
        const vertical = esCamino(x, y - 1) || esCamino(x, y + 1)
        punto(px, py, color(C.tronco), T, T)
        for (let k = 1; k < T; k += 2) {
          if (vertical) punto(px + 1, py + k, color(C.camino), T - 2, 1)
          else punto(px + k, py + 1, color(C.camino), 1, T - 2)
        }
      }
    }
  }

  // Adornos del terreno.
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const a = adorno[en(x, y)] as number
      if (a === 0) continue
      const { dibujo, colores } = DIBUJOS[ADORNOS[a - 1] as Adorno]
      dibujar(dibujo, colores, x * T, y * T, noche ? { W: C.bandera } : {})
    }
  }

  // Edificio de cada nodo, sobre la explanada: dos teselas de ancho, justo encima del camino.
  nodos.forEach((nodo, i) => {
    const px = nodo.x * T - T / 2
    const py = (nodo.y - 2) * T
    const edificio = edificios[i] ?? 'cartel'
    if (edificio === 'casa') {
      dibujar(CASA, { o: C.contorno, T: C.tejado, P: C.pared, W: C.ventana, d: C.puerta }, px, py, noche ? { W: C.bandera } : {})
    } else if (edificio === 'castillo') {
      dibujar(CASTILLO, { o: C.contorno, S: C.piedra, D: C.piedraOscura, W: C.ventana, d: C.puerta, B: C.bandera }, px, py, noche ? { W: C.bandera, B: C.bandera } : { B: C.tejado })
    } else {
      dibujar(CARTEL, { o: C.contorno, M: C.camino, m: C.caminoBorde }, px, py)
    }
  })
}
