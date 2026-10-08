/**
 * Corrección por reglas de una pieza escrita por el usuario: lo que valida un
 * ejercicio de piano roll o un encargo de compositor.
 *
 * Cada requisito del contenido se convierte en una línea de la lista de
 * comprobación: qué se pide, si se cumple y, si no, qué falta. Es una función
 * pura: la misma pieza da siempre el mismo resultado.
 */
import type { Requisito } from '../contenido/tipos.ts'
import { comprobarBucle } from './comprobaciones.ts'
import { INSTRUMENTOS, type Instrumento } from './instrumentos.ts'
import { type Nomenclatura, nombreVisible, notaDeMidi } from './notas.ts'
import { NOMBRES_ROL, type Nota, type Pieza, type Pista, type Rol, polifoniaMaxima } from './pieza.ts'
import { escribirCompas, ticksPorCompas } from './tiempo.ts'
import { type Tonalidad, alteracionesDe, estaEnTonalidad, gradoDe, leerTonalidad, tonalidadVisible } from './tonalidad.ts'

export interface ResultadoDeRequisito {
  requisito: Requisito
  cumplido: boolean
  /** Qué se pide, en una frase corta: «Tonalidad: Do mayor». */
  titulo: string
  /** Qué hay ahora mismo en la pieza y, si no se cumple, qué falta. */
  detalle: string
}

function esAfinada(pista: Pista): boolean {
  const instrumento: Instrumento = INSTRUMENTOS[pista.instrumento]
  return !instrumento.percusion
}

function deRol(pieza: Pieza, rol: Rol): Pista[] {
  return pieza.pistas.filter((p) => p.rol === rol)
}

function notasDeRol(pieza: Pieza, rol: Rol): Nota[] {
  return deRol(pieza, rol).flatMap((p) => p.notas)
}

function rolEnTexto(rol: Rol): string {
  return NOMBRES_ROL[rol].toLowerCase()
}

function plural(cantidad: number, uno: string, varios: string): string {
  return `${cantidad} ${cantidad === 1 ? uno : varios}`
}

function enLista(elementos: readonly string[]): string {
  if (elementos.length <= 1) return elementos.join('')
  return `${elementos.slice(0, -1).join(', ')} o ${elementos[elementos.length - 1]}`
}

const ORDINALES = ['', '1.º', '2.º', '3.º', '4.º', '5.º', '6.º', '7.º']

/** Parecido entre dos tramos de melodía: proporción de notas que coinciden en sitio, altura y duración (0 a 1). */
function parecido(a: readonly Nota[], b: readonly Nota[]): number {
  if (a.length === 0 && b.length === 0) return 1
  const clave = (n: Nota): string => `${n.t}:${n.n}:${n.d}`
  const enA = new Set(a.map(clave))
  const comunes = b.filter((n) => enA.has(clave(n))).length
  return comunes / Math.max(a.length, b.length)
}

/** A partir de este parecido, dos secciones se dan por «la misma». */
const UMBRAL_DE_REPETICION = 0.8

/** Corrige una pieza contra una lista de requisitos. Devuelve una línea por requisito, en el mismo orden. */
export function corregir(pieza: Pieza, requisitos: readonly Requisito[], nomenclatura: Nomenclatura): ResultadoDeRequisito[] {
  const nombre = (midi: number, tonalidad?: Tonalidad): string => nombreVisible(notaDeMidi(midi, tonalidad ? alteracionesDe(tonalidad) : 'sostenidos'), nomenclatura)
  let tonalidadDeLaPieza: Tonalidad | undefined
  try {
    tonalidadDeLaPieza = pieza.tonalidad ? leerTonalidad(pieza.tonalidad) : undefined
  } catch {
    tonalidadDeLaPieza = undefined
  }

  return requisitos.map((requisito): ResultadoDeRequisito => {
    const linea = (cumplido: boolean, titulo: string, detalle: string): ResultadoDeRequisito => ({ requisito, cumplido, titulo, detalle })
    switch (requisito.regla) {
      case 'tonalidad': {
        const nombres = requisito.valores.map((v) => tonalidadVisible(v, nomenclatura))
        const titulo = `Tonalidad: ${enLista(nombres)}`
        const notas = pieza.pistas.filter(esAfinada).flatMap((p) => p.notas)
        if (notas.length === 0) return linea(false, titulo, 'Todavía no hay notas.')
        let mejor = { proporcion: -1, tonalidad: leerTonalidad(requisito.valores[0] ?? 'C mayor') }
        for (const valor of requisito.valores) {
          const tonalidad = leerTonalidad(valor)
          const proporcion = notas.filter((n) => estaEnTonalidad(n.n, tonalidad)).length / notas.length
          if (proporcion > mejor.proporcion) mejor = { proporcion, tonalidad }
        }
        const ajenas = [...new Set(notas.filter((n) => !estaEnTonalidad(n.n, mejor.tonalidad)).map((n) => nombreVisible(notaDeMidi(n.n, alteracionesDe(mejor.tonalidad)), nomenclatura, { octava: false })))]
        if (mejor.proporcion >= requisito.minimo) {
          return linea(true, titulo, ajenas.length === 0 ? 'Todas las notas pertenecen a la escala.' : `Casi todas las notas pertenecen a la escala (de paso: ${ajenas.join(', ')}).`)
        }
        return linea(false, titulo, `Hay notas que no son de la escala: ${ajenas.join(', ')}. En la rejilla, las filas más oscuras quedan fuera de la tonalidad.`)
      }
      case 'compas': {
        const titulo = `Compás de ${escribirCompas(requisito.valor)}`
        const cumple = ticksPorCompas(pieza.compas) === ticksPorCompas(requisito.valor) && pieza.compas[1] === requisito.valor[1]
        return linea(cumple, titulo, cumple ? 'El compás es el que se pide.' : `La pieza está en ${escribirCompas(pieza.compas)}.`)
      }
      case 'compases': {
        const titulo = `${plural(requisito.valor, 'compás', 'compases')} de duración`
        const cumple = pieza.compases === requisito.valor
        return linea(cumple, titulo, cumple ? 'La duración es la que se pide.' : `La pieza tiene ${plural(pieza.compases, 'compás', 'compases')}.`)
      }
      case 'tempo': {
        const titulo = requisito.min === requisito.max ? `Tempo de ${requisito.min} BPM` : `Tempo entre ${requisito.min} y ${requisito.max} BPM`
        const cumple = pieza.tempo >= requisito.min && pieza.tempo <= requisito.max
        const consejo = pieza.tempo < requisito.min ? 'Súbelo.' : 'Bájalo.'
        return linea(cumple, titulo, cumple ? `Va a ${pieza.tempo} BPM.` : `Va a ${pieza.tempo} BPM. ${consejo}`)
      }
      case 'pistas': {
        const titulo = `Pistas de ${enLista(requisito.roles.map(rolEnTexto)).replace(' o ', ' y ')}`
        const vacias = requisito.roles.filter((rol) => notasDeRol(pieza, rol).length === 0)
        return linea(vacias.length === 0, titulo, vacias.length === 0 ? 'Todas tienen notas.' : `Sin notas todavía: ${vacias.map(rolEnTexto).join(', ')}.`)
      }
      case 'notas-minimas': {
        const titulo = `Al menos ${plural(requisito.valor, 'nota', 'notas')} en la pista de ${rolEnTexto(requisito.pista)}`
        const cuantas = notasDeRol(pieza, requisito.pista).length
        return linea(cuantas >= requisito.valor, titulo, cuantas >= requisito.valor ? `Tiene ${cuantas}.` : `Tiene ${cuantas}: faltan ${requisito.valor - cuantas}.`)
      }
      case 'rango': {
        const titulo = `${NOMBRES_ROL[requisito.pista]} entre ${nombre(requisito.min, tonalidadDeLaPieza)} y ${nombre(requisito.max, tonalidadDeLaPieza)}`
        const notas = notasDeRol(pieza, requisito.pista)
        if (notas.length === 0) return linea(false, titulo, 'Todavía no hay notas en esa pista.')
        const fuera = notas.filter((n) => n.n < requisito.min || n.n > requisito.max)
        if (fuera.length === 0) return linea(true, titulo, 'Todas las notas caben en el registro.')
        const nombres = [...new Set(fuera.map((n) => nombre(n.n, tonalidadDeLaPieza)))]
        return linea(false, titulo, `Se salen del registro: ${nombres.join(', ')}.`)
      }
      case 'densidad': {
        const { min, max } = requisito
        const margen = min !== undefined && max !== undefined ? `entre ${min} y ${max}` : min !== undefined ? `al menos ${min}` : `como mucho ${max ?? 0}`
        const titulo = `${NOMBRES_ROL[requisito.pista]}: ${margen} notas por compás de media`
        const media = notasDeRol(pieza, requisito.pista).length / Math.max(1, pieza.compases)
        const lectura = `Lleva ${media.toFixed(1).replace('.', ',').replace(',0', '')} de media.`
        if (min !== undefined && media < min) return linea(false, titulo, `${lectura} Añade notas.`)
        if (max !== undefined && media > max) return linea(false, titulo, `${lectura} Quita notas: tiene que respirar.`)
        return linea(true, titulo, lectura)
      }
      case 'polifonia': {
        const titulo = requisito.max === 1 ? `${NOMBRES_ROL[requisito.pista]} a una sola voz` : `${NOMBRES_ROL[requisito.pista]}: como mucho ${requisito.max} notas a la vez`
        const maxima = Math.max(0, ...deRol(pieza, requisito.pista).map((p) => polifoniaMaxima(p.notas)))
        // Una pista vacía no está «a una sola voz»: no tiene voz. Darlo por cumplido enseñaba una marca verde sin haber escrito nada.
        if (maxima === 0) return linea(false, titulo, 'Todavía no hay notas en esa pista.')
        if (maxima <= requisito.max) return linea(true, titulo, maxima === 1 ? 'Suena una nota cada vez.' : `Suenan hasta ${maxima} notas a la vez.`)
        return linea(false, titulo, `Hay momentos con ${maxima} notas a la vez: acorta o quita las que se pisan.`)
      }
      case 'bucle': {
        const titulo = 'El bucle cierra sin costura'
        if (pieza.pistas.every((p) => p.notas.length === 0)) return linea(false, titulo, 'Todavía no hay notas.')
        const hallazgos = comprobarBucle({ ...pieza, bucle: true })
        if (hallazgos.some((h) => h.codigo === 'bucle-no-cierra')) return linea(false, titulo, 'Hay notas que siguen sonando después del último compás: acórtalas para que acaben con la pieza.')
        if (hallazgos.some((h) => h.codigo === 'bucle-con-salto')) return linea(false, titulo, 'La melodía acaba a más de una octava de donde empieza: al repetirse dará un salto. Acerca la última nota a la primera.')
        return linea(true, titulo, 'Nada queda sonando al final y la melodía vuelve al principio sin saltos.')
      }
      case 'estructura': {
        const titulo = `Forma ${requisito.forma}, con secciones de ${plural(requisito.compasesPorSeccion, 'compás', 'compases')}`
        const porSeccion = requisito.compasesPorSeccion * ticksPorCompas(pieza.compas)
        const letras = [...requisito.forma]
        if (pieza.compases !== letras.length * requisito.compasesPorSeccion) {
          return linea(false, titulo, `Hacen falta ${letras.length * requisito.compasesPorSeccion} compases y la pieza tiene ${pieza.compases}.`)
        }
        const melodia = notasDeRol(pieza, 'melodia')
        const tramos = letras.map((_, i) => melodia.filter((n) => n.t >= i * porSeccion && n.t < (i + 1) * porSeccion).map((n) => ({ ...n, t: n.t - i * porSeccion })))
        const vacio = tramos.findIndex((t) => t.length === 0)
        if (vacio >= 0) return linea(false, titulo, `La sección ${vacio + 1} (${letras[vacio]}) no tiene melodía todavía.`)
        for (let i = 0; i < letras.length; i++) {
          for (let k = i + 1; k < letras.length; k++) {
            const igual = parecido(tramos[i] ?? [], tramos[k] ?? []) >= UMBRAL_DE_REPETICION
            if (letras[i] === letras[k] && !igual) {
              return linea(false, titulo, `Las secciones ${i + 1} y ${k + 1} llevan la misma letra (${letras[i]}): la melodía tiene que repetirse, y no lo hace.`)
            }
            if (letras[i] !== letras[k] && igual) {
              return linea(false, titulo, `Las secciones ${i + 1} (${letras[i]}) y ${k + 1} (${letras[k]}) tienen que contrastar, y ahora son casi iguales.`)
            }
          }
        }
        return linea(true, titulo, 'Las secciones con la misma letra se repiten y las demás contrastan.')
      }
      case 'empieza-en':
      case 'termina-en': {
        const alPrincipio = requisito.regla === 'empieza-en'
        const grados = enLista(requisito.grados.map((g) => ORDINALES[g] ?? `${g}.º`))
        const titulo = `${NOMBRES_ROL[requisito.pista]}: ${alPrincipio ? 'empieza' : 'termina'} en el ${grados} grado`
        if (!tonalidadDeLaPieza) return linea(false, titulo, 'La pieza no tiene tonalidad: no se puede saber qué grado es cada nota.')
        const notas = notasDeRol(pieza, requisito.pista)
        if (notas.length === 0) return linea(false, titulo, 'Todavía no hay notas en esa pista.')
        const elegida = alPrincipio ? notas.reduce((a, b) => (b.t < a.t || (b.t === a.t && b.n < a.n) ? b : a)) : notas.reduce((a, b) => (b.t + b.d > a.t + a.d || (b.t + b.d === a.t + a.d && b.n < a.n) ? b : a))
        const grado = gradoDe(elegida.n, tonalidadDeLaPieza)
        const cual = `${alPrincipio ? 'Empieza' : 'Termina'} en ${nombre(elegida.n, tonalidadDeLaPieza)}`
        if (grado !== undefined && requisito.grados.includes(grado)) return linea(true, titulo, `${cual}, el ${ORDINALES[grado]} grado.`)
        const buenas = requisito.grados.flatMap((g) => tonalidadDeLaPieza.escala[g - 1] ?? []).map((n) => nombreVisible(n, nomenclatura))
        return linea(false, titulo, `${cual}${grado === undefined ? ', que no es de la escala' : `, el ${ORDINALES[grado]} grado`}. Prueba con ${enLista(buenas)}.`)
      }
      case 'instrumentos': {
        const nombres = requisito.permitidos.map((id) => INSTRUMENTOS[id].nombre.toLowerCase())
        const titulo = `Solo con ${enLista(nombres).replace(' o ', ' y ')}`
        const ajenos = [...new Set(pieza.pistas.filter((p) => p.notas.length > 0 && !requisito.permitidos.includes(p.instrumento)).map((p) => INSTRUMENTOS[p.instrumento].nombre.toLowerCase()))]
        return linea(ajenos.length === 0, titulo, ajenos.length === 0 ? 'Todos los instrumentos son de los permitidos.' : `Sobra: ${ajenos.join(', ')}.`)
      }
    }
  })
}

/** ¿Se cumplen todos los requisitos? */
export function todoCumplido(resultados: readonly ResultadoDeRequisito[]): boolean {
  return resultados.every((r) => r.cumplido)
}
