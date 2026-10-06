/**
 * Piezas en blanco: el punto de partida de una pieza nueva del repertorio y de
 * un encargo que no trae plantilla propia.
 */
import type { Requisito } from '../contenido/tipos.ts'
import { INSTRUMENTOS, type IdInstrumento, type Instrumento } from './instrumentos.ts'
import type { Pieza, Pista, Rol } from './pieza.ts'
import type { Compas } from './tiempo.ts'

/** Instrumentos que se prueban para cada papel, por orden de preferencia. */
const PREFERIDOS: Readonly<Record<Rol, readonly IdInstrumento[]>> = {
  melodia: ['piano', 'chip-pulso', 'cuerdas'],
  contramelodia: ['cuerdas', 'piano', 'chip-pulso'],
  armonia: ['cuerdas', 'piano', 'chip-pulso'],
  colchon: ['cuerdas', 'piano'],
  bajo: ['bajo-electrico', 'chip-triangulo', 'piano'],
  percusion: ['bateria'],
  efecto: ['chip-pulso', 'piano'],
}

const ROLES_POR_DEFECTO: readonly Rol[] = ['melodia', 'armonia', 'bajo', 'percusion']

export interface OpcionesDePieza {
  titulo?: string
  tempo?: number
  compas?: Compas
  compases?: number
  tonalidad?: string
  roles?: readonly Rol[]
  /** Si se da, solo se usan estos instrumentos. */
  permitidos?: readonly IdInstrumento[]
}

function instrumentoPara(rol: Rol, permitidos: readonly IdInstrumento[] | undefined): IdInstrumento | undefined {
  const esPercusion = (id: IdInstrumento): boolean => Boolean((INSTRUMENTOS[id] as Instrumento).percusion)
  const vale = (id: IdInstrumento): boolean => (!permitidos || permitidos.includes(id)) && esPercusion(id) === (rol === 'percusion')
  return PREFERIDOS[rol].find(vale) ?? (permitidos ?? []).find(vale)
}

/** Una pieza sin notas, con una pista por papel. Los papeles para los que no hay instrumento permitido se quedan fuera. */
export function piezaEnBlanco(opciones: OpcionesDePieza = {}): Pieza {
  const pistas: Pista[] = []
  for (const rol of opciones.roles ?? ROLES_POR_DEFECTO) {
    const instrumento = instrumentoPara(rol, opciones.permitidos)
    if (instrumento === undefined || pistas.some((p) => p.id === rol)) continue
    pistas.push({ id: rol, rol, instrumento, notas: [] })
  }
  const pieza: Pieza = { tempo: opciones.tempo ?? 100, compas: opciones.compas ?? [4, 4], compases: opciones.compases ?? 8, bucle: true, pistas }
  if (opciones.titulo !== undefined) pieza.titulo = opciones.titulo
  pieza.tonalidad = opciones.tonalidad ?? 'C mayor'
  return pieza
}

/**
 * Pieza en blanco para un encargo sin plantilla: toma de los requisitos lo que
 * ya viene decidido (compás, longitud, tonalidad, papeles, instrumentos) y deja
 * el tempo en mitad del margen que se pida.
 */
export function plantillaParaRequisitos(requisitos: readonly Requisito[], titulo?: string): Pieza {
  const opciones: OpcionesDePieza = {}
  if (titulo !== undefined) opciones.titulo = titulo
  const roles = new Set<Rol>()
  for (const r of requisitos) {
    switch (r.regla) {
      case 'compas':
        opciones.compas = r.valor
        break
      case 'compases':
        opciones.compases = r.valor
        break
      case 'tempo':
        opciones.tempo = Math.round((r.min + r.max) / 2)
        break
      case 'tonalidad':
        if (r.valores[0] !== undefined) opciones.tonalidad = r.valores[0]
        break
      case 'instrumentos':
        opciones.permitidos = r.permitidos
        break
      case 'pistas':
        for (const rol of r.roles) roles.add(rol)
        break
      case 'notas-minimas':
      case 'rango':
      case 'densidad':
      case 'polifonia':
      case 'empieza-en':
      case 'termina-en':
        roles.add(r.pista)
        break
      case 'estructura':
        opciones.compases ??= r.forma.length * r.compasesPorSeccion
        break
      case 'bucle':
        break
    }
  }
  // Si los requisitos nombran papeles, la pieza trae esos (en su orden habitual); si no, los cuatro de siempre.
  if (roles.size > 0) opciones.roles = (['melodia', 'contramelodia', 'armonia', 'colchon', 'bajo', 'percusion', 'efecto'] as const).filter((rol) => roles.has(rol))
  return piezaEnBlanco(opciones)
}
