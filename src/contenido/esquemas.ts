/**
 * Esquemas del contenido, tal como se escribe en /content (YAML).
 *
 * Son la referencia de qué puede contener una lección. El compilador
 * (scripts/contenido) valida cada archivo contra ellos, convierte la
 * taquigrafía en notas y comprueba la música con Tonal. La app solo recibe el
 * resultado ya compilado (ver tipos.ts): este módulo no viaja al navegador.
 *
 * La descripción en prosa de cada campo está en CONTENT_GUIDE.md.
 */
import * as z from 'zod'
import { es } from 'zod/locales'
import { IDS_INSTRUMENTOS } from '../musica/instrumentos.ts'
import { ROLES } from '../musica/pieza.ts'
import { MATICES } from '../musica/taquigrafia.ts'

z.config(es())

// ───────────────────────────── piezas básicas ─────────────────────────────

/** Identificador en minúsculas con guiones: `sincopa`, `cadencia-perfecta`. */
export const Slug = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Debe ser un identificador en minúsculas, sin tildes ni espacios, con guiones: «cadencia-perfecta».')

/** Texto en Markdown reducido (negrita, cursiva, listas y las marcas propias: ver CONTENT_GUIDE.md). */
export const Texto = z.string().trim().min(1, 'No puede estar vacío.')

export const NotaCientifica = z.string().regex(/^[A-G](#{1,2}|b{1,2})?-?\d$/, 'Debe ser una nota con octava: C4, F#5, Bb3.')
export const ClaseDeNota = z.string().regex(/^[A-G](#|b)?$/, 'Debe ser una nota sin octava: C, F#, Bb.')
export const CompasTexto = z.string().regex(/^\d{1,2}\/(1|2|4|8|16|32)$/, 'Debe ser un compás: 4/4, 3/4, 6/8.')
export const FiguraTexto = z.string().regex(/^(1|2|4|8|16|32)\.{0,2}t?$/, 'Debe ser una figura: 1, 2, 4, 8, 16 o 32, con «.» o «t».')
export const TonalidadTexto = z.string().regex(/^[A-G](#|b)? \S.*$/, 'Debe ser tónica y modo: «D mayor», «A menor», «E frigio».')
export const IntervaloTexto = z.string().regex(/^\d{1,2}[JPMmAd]$/, 'Debe ser un intervalo: 2m, 3M, 4J, 5J, 7m, 8J.')
export const GradoTexto = z.string().regex(/^[b#]?(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(°|ø|\+)?\S*$/, 'Debe ser un grado: I, ii, IV, V7, vi, vii°, bVII.')
export const IdInstrumentoZ = z.enum(IDS_INSTRUMENTOS as readonly [string, ...string[]])
export const RolZ = z.enum(ROLES)
export const MatizZ = z.enum(Object.keys(MATICES) as [string, ...string[]])

// ───────────────────────────── pieza ─────────────────────────────

export const RejillaFuente = z.strictObject({
  /** Figura de cada casilla. */
  paso: FiguraTexto,
  /** Una línea por pieza del kit, con `x`, `X`, `o` y `.` */
  lineas: z.record(z.string(), z.string()),
})

export const PistaFuente = z
  .strictObject({
    /** Identificador de la pista dentro de la pieza. Por defecto, el rol. */
    id: Slug.optional(),
    nombre: z.string().optional(),
    rol: RolZ,
    instrumento: IdInstrumentoZ,
    /** Taquigrafía: "C4:4 E4:4 G4:2 | …". Cadena vacía para una pista que rellenará el usuario. */
    notas: z.string().optional(),
    /** Alternativa a `notas` para percusión. */
    rejilla: RejillaFuente.optional(),
    /** Matiz inicial de la pista. */
    matiz: MatizZ.optional(),
    /** Ajuste de volumen en dB. */
    volumen: z.number().min(-24).max(6).optional(),
    paneo: z.number().min(-1).max(1).optional(),
    /** Capa de música adaptativa a la que pertenece la pista. */
    capa: Slug.optional(),
  })
  .refine((p) => (p.notas === undefined) !== (p.rejilla === undefined), 'Cada pista lleva `notas` o `rejilla`, una de las dos.')

export const SeccionFuente = z.strictObject({
  /** Letra o nombre corto: A, B, intro, puente. */
  id: z.string().regex(/^[A-Za-z][A-Za-z0-9-]*$/, 'Usa una letra o un nombre corto sin espacios: A, B, intro.'),
  nombre: z.string().optional(),
  desde: z.int().min(1),
  hasta: z.int().min(1),
})

export const PiezaFuente = z.strictObject({
  titulo: z.string().optional(),
  /** Negras por minuto. */
  tempo: z.int().min(30).max(300),
  compas: CompasTexto.default('4/4'),
  tonalidad: TonalidadTexto.optional(),
  /** Longitud en compases; se comprueba contra lo escrito en cada pista. */
  compases: z.int().min(1).max(64),
  bucle: z.boolean().optional(),
  swing: z.number().min(0).max(1).optional(),
  /** Línea de acordes: "D:1 | G:2 A:2". */
  acordes: z.string().optional(),
  secciones: z.array(SeccionFuente).optional(),
  /** Notas ajenas a la tonalidad que son intencionadas (dominantes secundarias, intercambio modal…). */
  cromatismos: z.array(ClaseDeNota).optional(),
  pistas: z.array(PistaFuente).min(1),
})

// ───────────────────────────── requisitos de encargo ─────────────────────────────

/**
 * Lista de comprobación que el motor valida sobre una pieza del usuario. Cada
 * regla genera una línea «cumplido / no cumplido» con su explicación.
 */
export const Requisito = z.discriminatedUnion('regla', [
  z.strictObject({ regla: z.literal('tonalidad'), valores: z.array(TonalidadTexto).min(1), minimo: z.number().min(0.5).max(1).default(0.9) }),
  z.strictObject({ regla: z.literal('compas'), valor: CompasTexto }),
  z.strictObject({ regla: z.literal('compases'), valor: z.int().min(1).max(64) }),
  z.strictObject({ regla: z.literal('tempo'), min: z.int().min(30), max: z.int().max(300) }),
  z.strictObject({ regla: z.literal('pistas'), roles: z.array(RolZ).min(1) }),
  z.strictObject({ regla: z.literal('notas-minimas'), pista: RolZ, valor: z.int().min(1) }),
  z.strictObject({ regla: z.literal('rango'), pista: RolZ, min: NotaCientifica, max: NotaCientifica }),
  z.strictObject({ regla: z.literal('densidad'), pista: RolZ, min: z.number().min(0).optional(), max: z.number().min(0).optional() }),
  z.strictObject({ regla: z.literal('polifonia'), pista: RolZ, max: z.int().min(1) }),
  z.strictObject({ regla: z.literal('bucle') }),
  z.strictObject({ regla: z.literal('estructura'), forma: z.string().regex(/^[A-Z]{2,8}$/, 'Escribe la forma con letras: AABA, ABAB.'), compasesPorSeccion: z.int().min(1) }),
  z.strictObject({ regla: z.literal('empieza-en'), pista: RolZ, grados: z.array(z.int().min(1).max(7)).min(1) }),
  z.strictObject({ regla: z.literal('termina-en'), pista: RolZ, grados: z.array(z.int().min(1).max(7)).min(1) }),
  z.strictObject({ regla: z.literal('instrumentos'), permitidos: z.array(IdInstrumentoZ).min(1) }),
])

// ───────────────────────────── pasos ─────────────────────────────

/** Campos que todo ejercicio lleva: qué hay que hacer, una pista y la explicación. */
const comun = {
  /** Qué se le pide al usuario, en una frase. */
  enunciado: Texto,
  /** Ayuda que se muestra si la pide: orienta sin dar la respuesta. */
  pista: Texto,
  /** Por qué la respuesta correcta lo es. Se muestra al fallar y al acertar. */
  explicacion: Texto,
  /** Concepto que entrena (para el repaso espaciado). Por defecto, el primero de la lección. */
  concepto: Slug.optional(),
}

const rondas = z.int().min(1).max(20).default(5)
const registro = z.tuple([NotaCientifica, NotaCientifica]).default(['C3', 'C5'])

const PasoTeoria = z.strictObject({
  tipo: z.literal('teoria'),
  titulo: z.string().optional(),
  texto: Texto,
  /** Ejemplo que suena. Obligatorio salvo que se justifique con `sinEjemplo`. */
  ejemplo: PiezaFuente.optional(),
  /** Qué puede tocar el usuario en el ejemplo. */
  manipulable: z.array(z.enum(['tempo', 'transposicion', 'pistas', 'instrumento'])).default(['tempo']),
  /** Cómo se dibuja el ejemplo. */
  vista: z.enum(['pianoroll', 'pentagrama', 'teclado', 'rejilla']).default('pianoroll'),
  /** Motivo por el que este paso no lleva ejemplo sonoro. */
  sinEjemplo: Texto.optional(),
})

// 1 · Oído
const OidoIntervalo = z.strictObject({
  tipo: z.literal('oido'),
  modo: z.literal('intervalo'),
  ...comun,
  /** Intervalos entre los que elegir. */
  intervalos: z.array(IntervaloTexto).min(2).max(8),
  direcciones: z.array(z.enum(['ascendente', 'descendente', 'armonico'])).min(1).default(['ascendente']),
  registro,
  instrumento: IdInstrumentoZ.default('piano'),
  rondas,
})

const OidoAcorde = z.strictObject({
  tipo: z.literal('oido'),
  modo: z.literal('acorde'),
  ...comun,
  /** Tipos de acorde, en cifrado: M, m, dim, aug, 7, maj7, m7, m7b5, sus4… */
  calidades: z.array(z.string().min(1)).min(2).max(8),
  presentacion: z.enum(['bloque', 'arpegio', 'ambos']).default('bloque'),
  inversiones: z.boolean().default(false),
  registro,
  instrumento: IdInstrumentoZ.default('piano'),
  rondas,
})

const OidoProgresion = z.strictObject({
  tipo: z.literal('oido'),
  modo: z.literal('progresion'),
  ...comun,
  tonalidades: z.array(TonalidadTexto).min(1),
  /** Progresiones entre las que elegir, en grados: "I IV V I". */
  progresiones: z.array(z.string().regex(/^\S+( \S+)+$/, 'Escribe los grados separados por espacios: "I IV V I".')).min(2).max(6),
  tempo: z.int().min(40).max(200).default(84),
  instrumento: IdInstrumentoZ.default('piano'),
  rondas,
})

const OidoEscala = z.strictObject({
  tipo: z.literal('oido'),
  modo: z.literal('escala'),
  ...comun,
  /** Modos o escalas entre los que elegir: mayor, menor, dórico… */
  escalas: z.array(z.string().min(1)).min(2).max(8),
  tonicas: z.array(ClaseDeNota).min(1).default(['C', 'D', 'F', 'G', 'A']),
  presentacion: z.enum(['escala', 'melodia']).default('escala'),
  instrumento: IdInstrumentoZ.default('piano'),
  rondas,
})

const OidoTimbre = z.strictObject({
  tipo: z.literal('oido'),
  modo: z.literal('timbre'),
  ...comun,
  instrumentos: z.array(IdInstrumentoZ).min(2).max(8),
  /** Frase que tocará el instrumento elegido al azar (taquigrafía). */
  frase: z.string().min(1),
  tempo: z.int().min(40).max(200).default(96),
  compas: CompasTexto.default('4/4'),
  rondas,
})

const OidoContorno = z.strictObject({
  tipo: z.literal('oido'),
  modo: z.literal('contorno'),
  ...comun,
  /** Tamaños de salto posibles entre las dos notas. */
  intervalos: z.array(IntervaloTexto).min(1).max(12),
  /** Si a veces suenan dos notas iguales. */
  incluirIgual: z.boolean().default(false),
  registro,
  instrumento: IdInstrumentoZ.default('piano'),
  rondas,
})

const OidoCompas = z.strictObject({
  tipo: z.literal('oido'),
  modo: z.literal('compas'),
  ...comun,
  compases: z.array(CompasTexto).min(2).max(5),
  tempo: z.int().min(40).max(200).default(100),
  rondas,
})

const PreguntaDeOido = z.strictObject({
  pieza: PiezaFuente,
  opciones: z.array(Texto).min(2).max(5),
  /** Posición de la opción correcta, empezando en 1. */
  correcta: z.int().min(1),
  explicacion: Texto.optional(),
})

const OidoPreguntas = z.strictObject({
  tipo: z.literal('oido'),
  modo: z.literal('preguntas'),
  ...comun,
  preguntas: z.array(PreguntaDeOido).min(1).max(12),
})

// 2 · Ritmo
const PasoRitmo = z.strictObject({
  tipo: z.literal('ritmo'),
  /** seguir: tocar con el patrón sonando · eco: escuchar y repetir · leer: tocar leyendo, sin oírlo antes. */
  modo: z.enum(['seguir', 'eco', 'leer']),
  ...comun,
  tempo: z.int().min(40).max(200),
  compas: CompasTexto.default('4/4'),
  /** Figura de cada casilla del patrón. */
  paso: FiguraTexto.default('16'),
  /** `x` golpe, `X` acento, `.` silencio. Debe ocupar compases enteros. */
  patron: z.string().min(1),
  /** Compases de claqueta antes de empezar. */
  cuentaAtras: z.int().min(1).max(2).default(1),
  repeticiones: z.int().min(1).max(8).default(2),
  tolerancia: z.enum(['amplia', 'normal', 'estricta']).default('normal'),
  /**
   * Qué suena mientras el usuario toca: `patron` (el patrón entero), `claqueta` (un clic en cada
   * tiempo), `compas` (solo el primer tiempo de cada compás) o `nada`. Por defecto, el patrón en
   * el modo `seguir` y la claqueta en los otros dos.
   */
  guia: z.enum(['patron', 'claqueta', 'compas', 'nada']).optional(),
})

// 3 · Construcción guiada
const OpcionDeMelodia = z.strictObject({
  /** Fragmento en taquigrafía que rellena el hueco. */
  notas: z.string().min(1),
  correcta: z.boolean(),
  /** Por qué funciona o por qué no. */
  porque: Texto,
})

const ConstruccionMelodia = z.strictObject({
  tipo: z.literal('construccion'),
  modo: z.literal('completar-melodia'),
  ...comun,
  /** Pieza con un único hueco `?:figura` en la pista de melodía. */
  pieza: PiezaFuente,
  opciones: z.array(OpcionDeMelodia).min(2).max(4),
})

const OpcionDeAcorde = z.strictObject({
  acorde: z.string().min(1),
  correcta: z.boolean(),
  porque: Texto,
})

const ConstruccionAcorde = z.strictObject({
  tipo: z.literal('construccion'),
  modo: z.literal('elegir-acorde'),
  ...comun,
  /** Pieza cuya línea de `acordes` tiene un único hueco `?:figura`. */
  pieza: PiezaFuente,
  opciones: z.array(OpcionDeAcorde).min(2).max(4),
})

const ConstruccionSecciones = z.strictObject({
  tipo: z.literal('construccion'),
  modo: z.literal('ordenar-secciones'),
  ...comun,
  /** Pieza con al menos tres secciones; el orden correcto es el de la propia pieza. */
  pieza: PiezaFuente,
})

// 4 · Piano roll
const PasoPianoRoll = z.strictObject({
  tipo: z.literal('pianoroll'),
  ...comun,
  /** Punto de partida. Las pistas con `notas: ""` empiezan vacías. */
  plantilla: PiezaFuente,
  /** Identificadores de las pistas que el usuario puede editar. */
  editables: z.array(Slug).min(1),
  requisitos: z.array(Requisito).min(1),
})

// 5 · Análisis
const explicacionOpcional = { explicacion: Texto.optional() }

const PreguntaDeAnalisis = z.discriminatedUnion('sobre', [
  /** La respuesta correcta es la tonalidad de la pieza. */
  z.strictObject({ sobre: z.literal('tonalidad'), opciones: z.array(TonalidadTexto).min(2).max(4), ...explicacionOpcional }),
  /** La respuesta correcta es el compás de la pieza. */
  z.strictObject({ sobre: z.literal('compas'), opciones: z.array(CompasTexto).min(2).max(4), ...explicacionOpcional }),
  /** La respuesta correcta es la sucesión de secciones de la pieza: «AABA». */
  z.strictObject({ sobre: z.literal('forma'), opciones: z.array(z.string().regex(/^[A-Z]{2,8}$/)).min(2).max(4), ...explicacionOpcional }),
  /** Función (tónica, subdominante, dominante) del acorde que suena en un compás. */
  z.strictObject({ sobre: z.literal('funcion'), compas: z.int().min(1), ...explicacionOpcional }),
  /** Acorde que suena en un compás. */
  z.strictObject({ sobre: z.literal('acorde'), compas: z.int().min(1), opciones: z.array(z.string().min(1)).min(2).max(4), ...explicacionOpcional }),
  /** Pregunta de respuesta escrita a mano. `correcta` es la posición de la opción correcta, desde 1. */
  z.strictObject({ sobre: z.literal('libre'), pregunta: Texto, opciones: z.array(Texto).min(2).max(4), correcta: z.int().min(1), explicacion: Texto }),
])

const PasoAnalisis = z.strictObject({
  tipo: z.literal('analisis'),
  ...comun,
  pieza: PiezaFuente,
  preguntas: z.array(PreguntaDeAnalisis).min(1).max(6),
})

// 6 · Mezcla por capas
const EstadoDeJuego = z.strictObject({
  id: Slug,
  nombre: z.string().min(1),
  descripcion: Texto.optional(),
  /** Capas que suenan en este estado (capas verticales). */
  capas: z.array(Slug).min(1),
  /** Sección que se repite en este estado (resecuenciación horizontal). */
  seccion: z.string().optional(),
})

const PasoCapas = z.strictObject({
  tipo: z.literal('capas'),
  ...comun,
  /** Pieza en bucle cuyas pistas declaran su `capa`. */
  pieza: PiezaFuente,
  /** Nombre visible de cada capa. */
  capas: z.record(Slug, z.string().min(1)),
  estados: z.array(EstadoDeJuego).min(2).max(5),
  transicion: z
    .strictObject({
      /** Cuándo se aplica el cambio de estado. */
      cuando: z.enum(['inmediato', 'tiempo', 'compas', 'seccion']).default('compas'),
      /** Segundos de fundido entre capas. */
      fundido: z.number().min(0).max(4).default(0.5),
    })
    .default({ cuando: 'compas', fundido: 0.5 }),
  /** Situaciones de juego que el usuario debe emparejar con un estado. */
  situaciones: z.array(z.strictObject({ texto: Texto, estado: Slug, porque: Texto })).min(1).max(6),
})

// 7 · Encargo de compositor
const PasoEncargo = z.strictObject({
  tipo: z.literal('encargo'),
  titulo: z.string().min(1),
  /** Quién lo pide, para ambientar. */
  cliente: z.string().optional(),
  /** El encargo tal como lo escribiría un estudio. */
  brief: Texto,
  pista: Texto,
  /** Qué se aprende al cumplirlo; se muestra al entregar. */
  explicacion: Texto,
  concepto: Slug.optional(),
  plantilla: PiezaFuente.optional(),
  requisitos: z.array(Requisito).min(3),
})

const PasoOido = z.discriminatedUnion('modo', [
  OidoIntervalo,
  OidoAcorde,
  OidoProgresion,
  OidoEscala,
  OidoTimbre,
  OidoContorno,
  OidoCompas,
  OidoPreguntas,
])

const PasoConstruccion = z.discriminatedUnion('modo', [ConstruccionMelodia, ConstruccionAcorde, ConstruccionSecciones])

export const Paso = z.discriminatedUnion('tipo', [
  PasoTeoria,
  PasoOido,
  PasoRitmo,
  PasoConstruccion,
  PasoPianoRoll,
  PasoAnalisis,
  PasoCapas,
  PasoEncargo,
])

/** Los pasos que pueden aparecer en la prueba de nivel y en el repaso: todos menos teoría y encargo. */
export const PasoDePractica = z.discriminatedUnion('tipo', [PasoOido, PasoRitmo, PasoConstruccion, PasoAnalisis])

// ───────────────────────────── jerarquía ─────────────────────────────

/** Un archivo `lNN-*.yaml`. Su identificador sale de la ruta: m00.u01.l03. */
export const LeccionFuente = z.strictObject({
  titulo: z.string().trim().min(1).max(60),
  /** Una frase: qué sabrá hacer el usuario al terminar. */
  resumen: Texto,
  /** Duración estimada. Las sesiones deben durar de 5 a 10 minutos. */
  minutos: z.int().min(3).max(12),
  /** Conceptos que introduce o practica (claves de conceptos.yaml). */
  conceptos: z.array(Slug).min(1),
  pasos: z.array(Paso).min(3).max(16),
})

/** `unidad.yaml` */
export const UnidadFuente = z.strictObject({
  titulo: z.string().trim().min(1).max(60),
  /** Qué será capaz de hacer el usuario al acabar la unidad. */
  objetivo: Texto,
  /**
   * `borrador`: la unidad aún no está completa y no se le exigen las ocho
   * lecciones ni el encargo final. `publicada` (por defecto): se le exige todo.
   */
  estado: z.enum(['borrador', 'publicada']).default('publicada'),
})

/** `mundo.yaml` */
export const MundoFuente = z.strictObject({
  titulo: z.string().trim().min(1).max(60),
  /** Frase corta que aparece en el mapa. */
  lema: z.string().trim().min(1).max(90),
  descripcion: Texto,
})

/** `conceptos.yaml`: un concepto por clave. */
export const ConceptosFuente = z.record(
  Slug,
  z.strictObject({
    nombre: z.string().min(1),
    /** Definición de una o dos frases; se muestra en el repaso. */
    definicion: Texto,
  }),
)

/** `glosario.yaml` */
export const GlosarioFuente = z.record(
  Slug,
  z.strictObject({
    termino: z.string().min(1),
    definicion: Texto,
    /** Otros términos relacionados. */
    ver: z.array(Slug).optional(),
    ejemplo: PiezaFuente.optional(),
  }),
)

/** Un archivo de `fichas/`: ficha de referencia consultable en cualquier momento. */
export const FichaFuente = z.strictObject({
  titulo: z.string().min(1),
  resumen: Texto,
  bloques: z
    .array(
      z.strictObject({
        titulo: z.string().min(1),
        texto: Texto,
        ejemplo: PiezaFuente.optional(),
      }),
    )
    .min(1),
})

/** `prueba-de-nivel.yaml`: un bloque por unidad que se puede saltar. */
export const PruebaDeNivelFuente = z.array(
  z.strictObject({
    /** Unidad que se da por sabida si se supera el bloque: m00.u01. */
    unidad: z.string().regex(/^m\d{2}\.u\d{2}$/),
    /** Proporción de aciertos necesaria. */
    aprobado: z.number().min(0.5).max(1).default(0.8),
    pasos: z.array(PasoDePractica).min(2).max(8),
  }),
)

export type PiezaFuenteT = z.infer<typeof PiezaFuente>
export type PistaFuenteT = z.infer<typeof PistaFuente>
export type RequisitoT = z.infer<typeof Requisito>
export type PasoT = z.infer<typeof Paso>
export type LeccionFuenteT = z.infer<typeof LeccionFuente>
