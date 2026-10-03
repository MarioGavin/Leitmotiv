/**
 * Convierte el Markdown reducido de los textos del contenido en el árbol que
 * pinta la app (Prosa). Solo se admiten párrafos, listas, **negrita**,
 * *cursiva* y las marcas propias:
 *
 *   {n:C4}        nota (se muestra como Do4 o C4 según los ajustes)
 *   {a:Cmaj7}     acorde en cifrado americano
 *   {t:D mayor}   tonalidad
 *   {i:3M}        intervalo (se muestra como «3.ª mayor»)
 *   {g:V7}        grado en cifra romana
 *   [[sincopa]]   enlace al glosario; [[sincopa|las síncopas]] con otro texto
 */
import { type Token, marked } from 'marked'
import type { Bloque, NodoEnLinea, Prosa } from '../../src/contenido/tipos.ts'
import { esClaseDeNota, esNota, normalizarIntervalo } from '../../src/musica/notas.ts'
import { acordeDeGrado, leerAcorde, leerTonalidad } from '../../src/musica/tonalidad.ts'

export interface ContextoDeProsa {
  /** Términos del glosario: id → término. Si es `undefined` no se comprueban los enlaces. */
  glosario?: ReadonlyMap<string, string>
}

export class ErrorDeProsa extends Error {
  override readonly name = 'ErrorDeProsa'
}

const MARCA = /\{([natig]):([^{}]+)\}|\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g
const DO_MAYOR = leerTonalidad('C mayor')

function marcasDe(texto: string, ctx: ContextoDeProsa): NodoEnLinea[] {
  const nodos: NodoEnLinea[] = []
  let cursor = 0
  const limpio = texto.replace(/\s*\n\s*/g, ' ')
  for (const m of limpio.matchAll(MARCA)) {
    if (m.index > cursor) nodos.push({ t: 'texto', v: limpio.slice(cursor, m.index) })
    cursor = m.index + m[0].length
    const [, clase, valorCrudo, idGlosario, textoGlosario] = m
    if (idGlosario !== undefined) {
      const termino = ctx.glosario?.get(idGlosario)
      if (ctx.glosario && termino === undefined) throw new ErrorDeProsa(`El término «${idGlosario}» no está en el glosario.`)
      nodos.push({ t: 'glosario', id: idGlosario, h: [{ t: 'texto', v: textoGlosario ?? (termino ?? idGlosario).toLowerCase() }] })
      continue
    }
    const valor = (valorCrudo ?? '').trim()
    switch (clase) {
      case 'n':
        if (!esNota(valor) && !esClaseDeNota(valor)) throw new ErrorDeProsa(`{n:${valor}} no es una nota. Ejemplos: {n:C4}, {n:F#}.`)
        nodos.push({ t: 'nota', v: valor })
        break
      case 'a':
        nodos.push({ t: 'acorde', v: leerAcorde(valor).simbolo })
        break
      case 't':
        nodos.push({ t: 'tonalidad', v: leerTonalidad(valor).texto })
        break
      case 'i':
        nodos.push({ t: 'intervalo', v: normalizarIntervalo(valor) })
        break
      case 'g':
        try {
          acordeDeGrado(DO_MAYOR, valor)
        } catch {
          throw new ErrorDeProsa(`{g:${valor}} no es un grado. Ejemplos: {g:I}, {g:V7}, {g:vi}.`)
        }
        nodos.push({ t: 'grado', v: valor })
        break
    }
  }
  if (cursor < limpio.length) nodos.push({ t: 'texto', v: limpio.slice(cursor) })
  return nodos
}

function enLinea(tokens: readonly Token[] | undefined, ctx: ContextoDeProsa): NodoEnLinea[] {
  const nodos: NodoEnLinea[] = []
  for (const t of tokens ?? []) {
    switch (t.type) {
      case 'text':
        if ('tokens' in t && t.tokens && t.tokens.length > 0) nodos.push(...enLinea(t.tokens, ctx))
        else nodos.push(...marcasDe(t.text as string, ctx))
        break
      case 'escape':
        nodos.push({ t: 'texto', v: t.text as string })
        break
      case 'strong':
        nodos.push({ t: 'fuerte', h: enLinea(t.tokens, ctx) })
        break
      case 'em':
        nodos.push({ t: 'enfasis', h: enLinea(t.tokens, ctx) })
        break
      case 'br':
        nodos.push({ t: 'salto' })
        break
      default:
        throw new ErrorDeProsa(`No se admite «${t.type}» en los textos (${JSON.stringify(t.raw.slice(0, 40))}). Solo negrita, cursiva, listas y las marcas propias.`)
    }
  }
  return fusionarTextos(nodos)
}

function fusionarTextos(nodos: NodoEnLinea[]): NodoEnLinea[] {
  const salida: NodoEnLinea[] = []
  for (const n of nodos) {
    const ultimo = salida[salida.length - 1]
    if (n.t === 'texto' && ultimo?.t === 'texto') ultimo.v += n.v
    else salida.push(n)
  }
  return salida
}

/** Compila un texto. Lanza `ErrorDeProsa` si usa algo no admitido o una marca mal escrita. */
export function compilarProsa(markdown: string, ctx: ContextoDeProsa = {}): Prosa {
  const bloques: Bloque[] = []
  for (const token of marked.lexer(markdown.trim())) {
    switch (token.type) {
      case 'space':
        break
      case 'paragraph':
        bloques.push({ t: 'p', h: enLinea(token.tokens, ctx) })
        break
      case 'list': {
        const items = (token.items as Array<{ tokens: Token[] }>).map((item) => {
          const partes: NodoEnLinea[] = []
          for (const hijo of item.tokens) {
            if (hijo.type === 'text') partes.push(...enLinea('tokens' in hijo && hijo.tokens ? hijo.tokens : [hijo], ctx))
            else if (hijo.type !== 'space') throw new ErrorDeProsa('Las listas solo pueden tener una línea de texto por elemento.')
          }
          return partes
        })
        bloques.push({ t: 'lista', ordenada: Boolean(token.ordered), items })
        break
      }
      default:
        throw new ErrorDeProsa(`No se admite «${token.type}» en los textos (${JSON.stringify(token.raw.slice(0, 40))}). Solo párrafos y listas.`)
    }
  }
  if (bloques.length === 0) throw new ErrorDeProsa('El texto está vacío.')
  return bloques
}

/** Texto plano de una prosa (para índices, búsquedas y pruebas). */
export function textoPlano(prosa: Prosa): string {
  const deNodos = (nodos: NodoEnLinea[]): string =>
    nodos
      .map((n) => {
        if (n.t === 'texto' || n.t === 'nota' || n.t === 'acorde' || n.t === 'tonalidad' || n.t === 'intervalo' || n.t === 'grado') return n.v
        if (n.t === 'salto') return ' '
        return deNodos(n.h)
      })
      .join('')
  return prosa.map((b) => (b.t === 'p' ? deNodos(b.h) : b.items.map(deNodos).join(' '))).join(' ')
}
