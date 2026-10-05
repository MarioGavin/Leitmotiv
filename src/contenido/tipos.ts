/**
 * Contenido ya compilado: lo que la app descarga de /content en tiempo de
 * ejecución. Lo genera scripts/contenido a partir de los YAML de /content.
 * Aquí no hay taquigrafía ni Markdown: las piezas traen notas en ticks y los
 * textos vienen como árbol listo para pintar.
 */
import type { IdInstrumento } from '../musica/instrumentos.ts'
import type { Nota, Pieza, Rol } from '../musica/pieza.ts'
import type { Compas } from '../musica/tiempo.ts'

// ───────────────────────────── prosa ─────────────────────────────

export type NodoEnLinea =
  | { t: 'texto'; v: string }
  | { t: 'fuerte'; h: NodoEnLinea[] }
  | { t: 'enfasis'; h: NodoEnLinea[] }
  /** Nota o clase de nota en notación científica: se muestra según la nomenclatura elegida. */
  | { t: 'nota'; v: string }
  /** Cifrado de acorde. */
  | { t: 'acorde'; v: string }
  | { t: 'tonalidad'; v: string }
  /** Intervalo con nombre de Tonal (3M, 5P). */
  | { t: 'intervalo'; v: string }
  /** Grado en cifra romana. */
  | { t: 'grado'; v: string }
  /** Enlace a un término del glosario. */
  | { t: 'glosario'; id: string; h: NodoEnLinea[] }
  | { t: 'salto' }

export type Bloque = { t: 'p'; h: NodoEnLinea[] } | { t: 'lista'; ordenada: boolean; items: NodoEnLinea[][] }

export type Prosa = Bloque[]

// ───────────────────────────── requisitos ─────────────────────────────

export type Requisito =
  | { regla: 'tonalidad'; valores: string[]; minimo: number }
  | { regla: 'compas'; valor: Compas }
  | { regla: 'compases'; valor: number }
  | { regla: 'tempo'; min: number; max: number }
  | { regla: 'pistas'; roles: Rol[] }
  | { regla: 'notas-minimas'; pista: Rol; valor: number }
  | { regla: 'rango'; pista: Rol; min: number; max: number }
  | { regla: 'densidad'; pista: Rol; min?: number; max?: number }
  | { regla: 'polifonia'; pista: Rol; max: number }
  | { regla: 'bucle' }
  | { regla: 'estructura'; forma: string; compasesPorSeccion: number }
  | { regla: 'empieza-en'; pista: Rol; grados: number[] }
  | { regla: 'termina-en'; pista: Rol; grados: number[] }
  | { regla: 'instrumentos'; permitidos: IdInstrumento[] }

// ───────────────────────────── pasos ─────────────────────────────

interface Comun {
  enunciado: Prosa
  pista: Prosa
  explicacion: Prosa
  /** Concepto que entrena, para el repaso espaciado. */
  concepto: string
}

export type Manipulable = 'tempo' | 'transposicion' | 'pistas' | 'instrumento'
export type Vista = 'pianoroll' | 'pentagrama' | 'teclado' | 'rejilla'
export type Direccion = 'ascendente' | 'descendente' | 'armonico'

export interface PasoTeoria {
  tipo: 'teoria'
  titulo?: string
  texto: Prosa
  ejemplo?: Pieza
  manipulable: Manipulable[]
  vista: Vista
}

export interface OidoIntervalo extends Comun {
  tipo: 'oido'
  modo: 'intervalo'
  /** Nombres de Tonal: 3m, 3M, 5P… */
  intervalos: string[]
  direcciones: Direccion[]
  /** Registro de la nota de partida, en MIDI. */
  registro: [number, number]
  instrumento: IdInstrumento
  rondas: number
}

export interface OidoAcorde extends Comun {
  tipo: 'oido'
  modo: 'acorde'
  /** Tipos de acorde en cifrado de Tonal: «M», «m», «dim», «maj7»… */
  calidades: string[]
  presentacion: 'bloque' | 'arpegio' | 'ambos'
  inversiones: boolean
  registro: [number, number]
  instrumento: IdInstrumento
  rondas: number
}

export interface OidoProgresion extends Comun {
  tipo: 'oido'
  modo: 'progresion'
  tonalidades: string[]
  /** Cada progresión, grado a grado. */
  progresiones: string[][]
  tempo: number
  instrumento: IdInstrumento
  rondas: number
}

export interface OidoEscala extends Comun {
  tipo: 'oido'
  modo: 'escala'
  /** Modos tal como los entiende `leerTonalidad`: «mayor», «dórico»… */
  escalas: string[]
  tonicas: string[]
  presentacion: 'escala' | 'melodia'
  instrumento: IdInstrumento
  rondas: number
}

export interface OidoTimbre extends Comun {
  tipo: 'oido'
  modo: 'timbre'
  instrumentos: IdInstrumento[]
  /** Frase escrita para el primer instrumento; el motor la transporta por octavas al registro de cada uno. */
  frase: Nota[]
  tempo: number
  compas: Compas
  compases: number
  rondas: number
}

export interface OidoContorno extends Comun {
  tipo: 'oido'
  modo: 'contorno'
  intervalos: string[]
  incluirIgual: boolean
  registro: [number, number]
  instrumento: IdInstrumento
  rondas: number
}

export interface OidoCompas extends Comun {
  tipo: 'oido'
  modo: 'compas'
  compases: Compas[]
  tempo: number
  rondas: number
}

export interface OidoPreguntas extends Comun {
  tipo: 'oido'
  modo: 'preguntas'
  preguntas: Array<{
    pieza: Pieza
    opciones: Prosa[]
    /** Índice de la opción correcta, desde 0. */
    correcta: number
    explicacion?: Prosa
  }>
}

export type PasoOido = OidoIntervalo | OidoAcorde | OidoProgresion | OidoEscala | OidoTimbre | OidoContorno | OidoCompas | OidoPreguntas

export interface PasoRitmo extends Comun {
  tipo: 'ritmo'
  modo: 'seguir' | 'eco' | 'leer'
  tempo: number
  compas: Compas
  /** Duración de cada casilla del patrón, en ticks. */
  paso: number
  /** Instantes de cada golpe, en ticks desde el inicio del patrón. */
  golpes: number[]
  acentos: boolean[]
  /** Duración del patrón completo, en ticks. */
  duracion: number
  cuentaAtras: number
  repeticiones: number
  tolerancia: 'amplia' | 'normal' | 'estricta'
  /** Qué suena mientras el usuario toca. */
  guia: 'patron' | 'claqueta' | 'compas' | 'nada'
}

export interface Hueco {
  t: number
  d: number
}

export interface ConstruccionMelodia extends Comun {
  tipo: 'construccion'
  modo: 'completar-melodia'
  /** La pieza sin las notas del hueco. */
  pieza: Pieza
  /** Pista y tramo que hay que rellenar. */
  hueco: Hueco & { pista: string }
  opciones: Array<{ notas: Nota[]; correcta: boolean; porque: Prosa }>
}

export interface ConstruccionAcorde extends Comun {
  tipo: 'construccion'
  modo: 'elegir-acorde'
  pieza: Pieza
  hueco: Hueco
  opciones: Array<{ acorde: string; correcta: boolean; porque: Prosa }>
}

export interface ConstruccionSecciones extends Comun {
  tipo: 'construccion'
  modo: 'ordenar-secciones'
  pieza: Pieza
}

export type PasoConstruccion = ConstruccionMelodia | ConstruccionAcorde | ConstruccionSecciones

export interface PasoPianoRoll extends Comun {
  tipo: 'pianoroll'
  plantilla: Pieza
  editables: string[]
  requisitos: Requisito[]
}

export interface PreguntaDeAnalisis {
  sobre: 'tonalidad' | 'compas' | 'forma' | 'funcion' | 'acorde' | 'libre'
  /** Texto de la pregunta, ya redactado. */
  pregunta: Prosa
  opciones: Prosa[]
  /** Índice de la opción correcta, desde 0. */
  correcta: number
  explicacion?: Prosa
  /** Compás al que se refiere la pregunta, si lo hay. */
  compas?: number
}

export interface PasoAnalisis extends Comun {
  tipo: 'analisis'
  pieza: Pieza
  preguntas: PreguntaDeAnalisis[]
}

export interface EstadoDeJuego {
  id: string
  nombre: string
  descripcion?: Prosa
  capas: string[]
  seccion?: string
}

export interface PasoCapas extends Comun {
  tipo: 'capas'
  pieza: Pieza
  /** Nombre visible de cada capa. */
  capas: Record<string, string>
  estados: EstadoDeJuego[]
  transicion: { cuando: 'inmediato' | 'tiempo' | 'compas' | 'seccion'; fundido: number }
  situaciones: Array<{ texto: Prosa; estado: string; porque: Prosa }>
}

export interface PasoEncargo {
  tipo: 'encargo'
  titulo: string
  cliente?: string
  brief: Prosa
  pista: Prosa
  explicacion: Prosa
  concepto: string
  plantilla?: Pieza
  requisitos: Requisito[]
}

export type Paso = PasoTeoria | PasoOido | PasoRitmo | PasoConstruccion | PasoPianoRoll | PasoAnalisis | PasoCapas | PasoEncargo

export type TipoDePaso = Paso['tipo']

// ───────────────────────────── jerarquía ─────────────────────────────

export interface Leccion {
  /** m00.u01.l03 */
  id: string
  titulo: string
  resumen: string
  minutos: number
  conceptos: string[]
  pasos: Paso[]
}

export interface ResumenDeLeccion {
  id: string
  titulo: string
  resumen: string
  minutos: number
  conceptos: string[]
  /** Tipos de paso, en orden: sirve para pintar el avance sin descargar la lección. */
  pasos: TipoDePaso[]
  /** Si la lección termina en un encargo de compositor. */
  encargo: boolean
}

export interface ResumenDeUnidad {
  /** m00.u01 */
  id: string
  titulo: string
  objetivo: string
  /** La unidad está en construcción: puede tener menos de ocho lecciones. */
  borrador: boolean
  lecciones: ResumenDeLeccion[]
}

export interface ResumenDeMundo {
  /** m00 */
  id: string
  titulo: string
  lema: string
  descripcion: Prosa
  unidades: ResumenDeUnidad[]
}

/** /content/indice.json: el árbol del curso sin el contenido de las lecciones. */
export interface IndiceDelCurso {
  /** Huella del contenido: cambia cuando cambia cualquier archivo. */
  version: string
  mundos: ResumenDeMundo[]
}

export interface Concepto {
  id: string
  nombre: string
  definicion: Prosa
  /** Pasos que lo entrenan, como «m00.u01.l02#4». */
  pasos: string[]
}

export interface TerminoDeGlosario {
  id: string
  termino: string
  definicion: Prosa
  ver: string[]
  ejemplo?: Pieza
}

export interface Ficha {
  id: string
  titulo: string
  resumen: Prosa
  bloques: Array<{ titulo: string; texto: Prosa; ejemplo?: Pieza }>
}

export interface BloqueDePrueba {
  unidad: string
  aprobado: number
  pasos: Array<PasoOido | PasoRitmo | PasoConstruccion | PasoAnalisis>
}
