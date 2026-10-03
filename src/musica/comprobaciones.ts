/**
 * Comprobaciones musicales sobre una pieza. Las usa el validador de contenido
 * (para garantizar que cada ejemplo es lo que dice ser) y, en la app, los
 * encargos de compositor.
 */
import { Chord } from 'tonal'
import { INSTRUMENTOS, type Instrumento } from './instrumentos.ts'
import { type Nomenclatura, croma, cromaDeMidi, nombreVisible, notaDeMidi } from './notas.ts'
import { type Pieza, type Pista, duracionEnTicks, polifoniaMaxima } from './pieza.ts'
import { posicionLegible, ticksPorCompas } from './tiempo.ts'
import { type Acorde, alteracionesDe, leerAcorde, leerTonalidad } from './tonalidad.ts'

export interface Hallazgo {
  /** `error` invalida el contenido; `aviso` pide que alguien lo mire. */
  nivel: 'error' | 'aviso'
  /** Código estable, útil para pruebas: `fuera-de-rango`, `fuera-de-tonalidad`… */
  codigo: string
  mensaje: string
}

const N: Nomenclatura = 'latina'

function donde(ticks: number, pieza: Pieza): string {
  const p = posicionLegible(ticks, pieza.compas)
  return `compás ${p.compas}, tiempo ${p.tiempo}`
}

function nombre(midi: number, alteraciones: 'sostenidos' | 'bemoles' = 'sostenidos'): string {
  return nombreVisible(notaDeMidi(midi, alteraciones), N)
}

function esAfinada(pista: Pista): boolean {
  const inst: Instrumento = INSTRUMENTOS[pista.instrumento]
  return !inst.percusion
}

/** Cada nota cabe en el registro de su instrumento; en percusión, cada tecla es una pieza del kit. */
export function comprobarRangos(pieza: Pieza): Hallazgo[] {
  const hallazgos: Hallazgo[] = []
  for (const pista of pieza.pistas) {
    const inst: Instrumento = INSTRUMENTOS[pista.instrumento]
    if (inst.percusion) {
      const teclas = new Set(Object.values(inst.percusion).map((p) => p.tecla))
      for (const n of pista.notas) {
        if (!teclas.has(n.n)) {
          hallazgos.push({ nivel: 'error', codigo: 'pieza-de-kit-desconocida', mensaje: `La pista «${pista.id}» usa la tecla ${n.n}, que no es ninguna pieza de «${inst.nombre}» (${donde(n.t, pieza)}).` })
        }
      }
      continue
    }
    const [min, max] = inst.rango
    for (const n of pista.notas) {
      if (n.n < min || n.n > max) {
        hallazgos.push({
          nivel: 'error',
          codigo: 'fuera-de-rango',
          mensaje: `La pista «${pista.id}» toca ${nombre(n.n)} y «${inst.nombre}» solo llega de ${nombre(min)} a ${nombre(max)} (${donde(n.t, pieza)}).`,
        })
      }
    }
  }
  return hallazgos
}

/** Todas las notas afinadas pertenecen a la tonalidad declarada, salvo los cromatismos anunciados. */
export function comprobarTonalidad(pieza: Pieza, cromatismos: readonly string[] = []): Hallazgo[] {
  if (!pieza.tonalidad) return []
  const tonalidad = leerTonalidad(pieza.tonalidad)
  const admitidas = new Set(tonalidad.cromasAdmitidas)
  for (const c of cromatismos) admitidas.add(croma(c))
  const alt = alteracionesDe(tonalidad)
  const hallazgos: Hallazgo[] = []
  for (const pista of pieza.pistas) {
    if (!esAfinada(pista)) continue
    for (const n of pista.notas) {
      if (!admitidas.has(cromaDeMidi(n.n))) {
        hallazgos.push({
          nivel: 'error',
          codigo: 'fuera-de-tonalidad',
          mensaje: `La pista «${pista.id}» toca ${nombre(n.n, alt)}, que no pertenece a ${tonalidad.texto} (${donde(n.t, pieza)}). Si es intencionado, decláralo en \`cromatismos\`.`,
        })
      }
    }
  }
  return hallazgos
}

function mismasCromas(a: ReadonlySet<number>, b: ReadonlySet<number>): boolean {
  return a.size === b.size && [...a].every((c) => b.has(c))
}

const NOMBRES_CROMA = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const

/**
 * Los acordes escritos coinciden con lo que suena: las pistas de armonía solo
 * tocan notas del acorde, y cuando tocan tres o más notas distintas forman
 * exactamente ese acorde. El bajo debería empezar cada acorde en su fundamental.
 */
export function comprobarAcordes(pieza: Pieza): Hallazgo[] {
  if (!pieza.acordes || pieza.acordes.length === 0) return []
  const hallazgos: Hallazgo[] = []
  for (const marcado of pieza.acordes) {
    let acorde: Acorde
    try {
      acorde = leerAcorde(marcado.simbolo)
    } catch (e) {
      hallazgos.push({ nivel: 'error', codigo: 'acorde-desconocido', mensaje: `${(e as Error).message} (${donde(marcado.t, pieza)})` })
      continue
    }
    const fin = marcado.t + marcado.d
    const cromasArmonia = new Set<number>()
    for (const pista of pieza.pistas) {
      if (!esAfinada(pista)) continue
      const empiezan = pista.notas.filter((n) => n.t >= marcado.t && n.t < fin)
      if (pista.rol === 'armonia' || pista.rol === 'colchon') {
        for (const n of empiezan) {
          cromasArmonia.add(cromaDeMidi(n.n))
          if (!acorde.cromas.has(cromaDeMidi(n.n))) {
            hallazgos.push({
              nivel: 'error',
              codigo: 'nota-ajena-al-acorde',
              mensaje: `La pista «${pista.id}» toca ${nombre(n.n)} sobre el acorde ${acorde.simbolo}, que solo tiene ${acorde.notas.map((x) => nombreVisible(x, N)).join(', ')} (${donde(n.t, pieza)}).`,
            })
          }
        }
      }
      if (pista.rol === 'bajo' && empiezan.length > 0) {
        const primera = empiezan.reduce((a, b) => (b.t < a.t ? b : a))
        const esperada = croma(acorde.bajo ?? acorde.fundamental)
        if (primera.t === marcado.t && cromaDeMidi(primera.n) !== esperada) {
          hallazgos.push({
            nivel: 'aviso',
            codigo: 'bajo-sin-fundamental',
            mensaje: `El bajo entra en ${nombre(primera.n)} sobre ${acorde.simbolo}; se esperaba ${nombreVisible(acorde.bajo ?? acorde.fundamental, N)} (${donde(primera.t, pieza)}). Si es una inversión, escríbela en el cifrado: ${acorde.simbolo}/${notaDeMidi(primera.n).replace(/-?\d+$/, '')}.`,
          })
        }
      }
    }
    if (cromasArmonia.size >= 3) {
      const sinBajo = new Set(acorde.notas.map(croma))
      const candidatos = Chord.detect([...cromasArmonia].map((c) => NOMBRES_CROMA[c] ?? 'C'))
      const coincide = mismasCromas(cromasArmonia, sinBajo) || candidatos.some((c) => mismasCromas(new Set(Chord.get(c).notes.map(croma)), sinBajo))
      if (!coincide) {
        hallazgos.push({
          nivel: 'error',
          codigo: 'acorde-no-coincide',
          mensaje: `En ${donde(marcado.t, pieza)} está escrito ${acorde.simbolo}, pero la armonía toca ${[...cromasArmonia].map((c) => nombreVisible(NOMBRES_CROMA[c] ?? 'C', N)).join(', ')}${candidatos[0] ? ` (parece ${candidatos[0]})` : ''}.`,
        })
      }
    }
  }
  return hallazgos
}

/** Un bucle cierra: nada queda sonando más allá del final y la melodía puede volver al principio sin un salto brusco. */
export function comprobarBucle(pieza: Pieza): Hallazgo[] {
  if (!pieza.bucle) return []
  const hallazgos: Hallazgo[] = []
  const total = duracionEnTicks(pieza)
  const ultimoCompas = total - ticksPorCompas(pieza.compas)
  let hayNotasAlFinal = false
  for (const pista of pieza.pistas) {
    for (const n of pista.notas) {
      if (n.t + n.d > total) {
        hallazgos.push({
          nivel: 'error',
          codigo: 'bucle-no-cierra',
          mensaje: `En la pista «${pista.id}» una nota sigue sonando después del final del bucle (${donde(n.t, pieza)}): al repetirse se cortará o se montará sobre el principio.`,
        })
      }
      if (n.t + n.d > ultimoCompas) hayNotasAlFinal = true
    }
    if (pista.rol === 'melodia' && pista.notas.length >= 2 && esAfinada(pista)) {
      const primera = pista.notas.reduce((a, b) => (b.t < a.t ? b : a))
      const ultima = pista.notas.reduce((a, b) => (b.t + b.d > a.t + a.d ? b : a))
      const salto = Math.abs(ultima.n - primera.n)
      if (salto > 12) {
        hallazgos.push({
          nivel: 'aviso',
          codigo: 'bucle-con-salto',
          mensaje: `La melodía de «${pista.id}» termina en ${nombre(ultima.n)} y vuelve a empezar en ${nombre(primera.n)}: son más de una octava de salto en la costura del bucle.`,
        })
      }
    }
  }
  if (!hayNotasAlFinal && pieza.pistas.some((p) => p.notas.length > 0)) {
    hallazgos.push({ nivel: 'aviso', codigo: 'bucle-con-silencio-final', mensaje: 'El último compás del bucle está vacío: al repetirse se oirá un hueco.' })
  }
  return hallazgos
}

/** Los canales de chip son monofónicos: no pueden sonar dos notas a la vez. */
export function comprobarPolifonia(pieza: Pieza): Hallazgo[] {
  const hallazgos: Hallazgo[] = []
  for (const pista of pieza.pistas) {
    const inst: Instrumento = INSTRUMENTOS[pista.instrumento]
    if (inst.tipo !== 'sinte' || inst.percusion) continue
    const maximo = polifoniaMaxima(pista.notas)
    if (maximo > inst.polifonia) {
      hallazgos.push({
        nivel: 'error',
        codigo: 'demasiadas-voces',
        mensaje: `La pista «${pista.id}» hace sonar ${maximo} notas a la vez y «${inst.nombre}» solo puede con ${inst.polifonia}.`,
      })
    }
  }
  return hallazgos
}

/** Las secciones caen dentro de la pieza y no se pisan. */
export function comprobarSecciones(pieza: Pieza): Hallazgo[] {
  if (!pieza.secciones) return []
  const hallazgos: Hallazgo[] = []
  const ocupados = new Map<number, string>()
  for (const s of pieza.secciones) {
    if (s.desde > s.hasta || s.hasta > pieza.compases) {
      hallazgos.push({ nivel: 'error', codigo: 'seccion-fuera', mensaje: `La sección «${s.id}» va del compás ${s.desde} al ${s.hasta} y la pieza tiene ${pieza.compases}.` })
      continue
    }
    for (let c = s.desde; c <= s.hasta; c++) {
      const previa = ocupados.get(c)
      if (previa) hallazgos.push({ nivel: 'error', codigo: 'secciones-solapadas', mensaje: `El compás ${c} está en dos secciones a la vez.` })
      ocupados.set(c, s.id)
    }
  }
  if (ocupados.size < pieza.compases) {
    hallazgos.push({ nivel: 'aviso', codigo: 'compases-sin-seccion', mensaje: 'Hay compases que no pertenecen a ninguna sección.' })
  }
  return hallazgos
}

/** Todas las comprobaciones de una pieza. */
export function comprobarPieza(pieza: Pieza, opciones: { cromatismos?: readonly string[] } = {}): Hallazgo[] {
  return [
    ...comprobarRangos(pieza),
    ...comprobarTonalidad(pieza, opciones.cromatismos),
    ...comprobarAcordes(pieza),
    ...comprobarBucle(pieza),
    ...comprobarPolifonia(pieza),
    ...comprobarSecciones(pieza),
  ]
}

/** Forma de la pieza como sucesión de letras de sección, en orden: «AABA». */
export function formaDe(pieza: Pieza): string | undefined {
  if (!pieza.secciones || pieza.secciones.length === 0) return undefined
  return [...pieza.secciones]
    .sort((a, b) => a.desde - b.desde)
    .map((s) => s.id.charAt(0).toUpperCase())
    .join('')
}

/** Acorde que suena al empezar un compás (contado desde 1). */
export function acordeEnCompas(pieza: Pieza, compas: number): string | undefined {
  const t = (compas - 1) * ticksPorCompas(pieza.compas)
  return pieza.acordes?.find((a) => a.t <= t && a.t + a.d > t)?.simbolo
}
