/**
 * Compila cada paso de una lección: valida su música con Tonal y lo convierte
 * al formato que consume la app. Todo lo que no cuadra queda anotado en el
 * contexto como error o aviso.
 */
import { Chord } from 'tonal'
import type { PasoT, RequisitoT } from '../../src/contenido/esquemas.ts'
import type {
  ConstruccionAcorde,
  ConstruccionMelodia,
  ConstruccionSecciones,
  EstadoDeJuego,
  Paso,
  PasoAnalisis,
  PasoCapas,
  PasoEncargo,
  PasoOido,
  PasoPianoRoll,
  PasoRitmo,
  PasoTeoria,
  PreguntaDeAnalisis,
  Prosa,
  Requisito,
} from '../../src/contenido/tipos.ts'
import { piezaAAbc } from '../../src/musica/abc.ts'
import { acordeEnCompas, formaDe } from '../../src/musica/comprobaciones.ts'
import { INSTRUMENTOS, type IdInstrumento, type Instrumento } from '../../src/musica/instrumentos.ts'
import { croma, cromaDeMidi, midiDe, normalizarIntervalo, semitonos } from '../../src/musica/notas.ts'
import type { Pieza, Rol } from '../../src/musica/pieza.ts'
import { leerFragmento, leerNotas, leerPatronRitmico } from '../../src/musica/taquigrafia.ts'
import { escribirCompas, leerCompas, leerFigura, ticksPorCompas } from '../../src/musica/tiempo.ts'
import { acordeDeGrado, estaEnTonalidad, funcionDe, leerAcorde, leerTonalidad } from '../../src/musica/tonalidad.ts'
import type { Contexto } from './contexto.ts'
import { compilarPieza } from './pieza.ts'

type De<T extends PasoT['tipo']> = Extract<PasoT, { tipo: T }>

const parrafo = (texto: string): Prosa => [{ t: 'p', h: [{ t: 'texto', v: texto }] }]

function comun(paso: { enunciado: string; pista: string; explicacion: string; concepto?: string | undefined }, ctx: Contexto, conceptoPorDefecto: string) {
  return {
    enunciado: ctx.prosa('enunciado', paso.enunciado),
    pista: ctx.prosa('pista', paso.pista),
    explicacion: ctx.prosa('explicacion', paso.explicacion),
    concepto: ctx.concepto(paso.concepto ?? conceptoPorDefecto),
  }
}

function registroEnMidi(registro: readonly [string, string], ctx: Contexto): [number, number] {
  const [min, max] = [midiDe(registro[0]), midiDe(registro[1])]
  if (min >= max) ctx.error('registro-no-valido', `El registro va de ${registro[0]} a ${registro[1]}: la primera nota debe ser más grave que la segunda.`)
  return [min, max]
}

function comprobarAlcance(id: IdInstrumento, [min, max]: [number, number], margen: number, ctx: Contexto): void {
  const inst: Instrumento = INSTRUMENTOS[id]
  if (inst.percusion) {
    ctx.error('instrumento-sin-afinar', `«${inst.nombre}» no tiene notas afinadas y este ejercicio las necesita.`)
    return
  }
  if (min - margen < inst.rango[0] || max + margen > inst.rango[1]) {
    ctx.error('registro-fuera-de-rango', `El ejercicio puede pedir notas fuera del registro de «${inst.nombre}». Estrecha el \`registro\`.`)
  }
}

// ───────────────────────────── requisitos ─────────────────────────────

export function compilarRequisitos(fuente: readonly RequisitoT[], ctx: Contexto): Requisito[] {
  const salida: Requisito[] = []
  let compases: number | undefined
  for (const [i, r] of fuente.entries()) {
    const c = ctx.en(`requisitos[${i}] (${r.regla})`)
    switch (r.regla) {
      case 'tonalidad': {
        const valores = r.valores.flatMap((v) => c.intentar('tonalidad-no-valida', () => leerTonalidad(v).texto) ?? [])
        salida.push({ regla: 'tonalidad', valores, minimo: r.minimo })
        break
      }
      case 'compas': {
        const valor = c.intentar('compas-no-valido', () => leerCompas(r.valor))
        if (valor) salida.push({ regla: 'compas', valor })
        break
      }
      case 'compases':
        compases = r.valor
        salida.push({ regla: 'compases', valor: r.valor })
        break
      case 'tempo':
        if (r.min > r.max) c.error('tempo-no-valido', `El tempo mínimo (${r.min}) es mayor que el máximo (${r.max}).`)
        salida.push({ regla: 'tempo', min: r.min, max: r.max })
        break
      case 'pistas':
        salida.push({ regla: 'pistas', roles: r.roles as Rol[] })
        break
      case 'notas-minimas':
        salida.push({ regla: 'notas-minimas', pista: r.pista as Rol, valor: r.valor })
        break
      case 'rango': {
        const [min, max] = [midiDe(r.min), midiDe(r.max)]
        if (min >= max) c.error('rango-no-valido', `El rango va de ${r.min} a ${r.max}: la primera nota debe ser más grave.`)
        salida.push({ regla: 'rango', pista: r.pista as Rol, min, max })
        break
      }
      case 'densidad': {
        if (r.min === undefined && r.max === undefined) c.error('densidad-sin-limites', 'La regla de densidad necesita `min`, `max` o los dos.')
        if (r.min !== undefined && r.max !== undefined && r.min > r.max) c.error('densidad-no-valida', 'El mínimo de densidad es mayor que el máximo.')
        const regla: Requisito = { regla: 'densidad', pista: r.pista as Rol }
        if (r.min !== undefined) regla.min = r.min
        if (r.max !== undefined) regla.max = r.max
        salida.push(regla)
        break
      }
      case 'polifonia':
        salida.push({ regla: 'polifonia', pista: r.pista as Rol, max: r.max })
        break
      case 'bucle':
        salida.push({ regla: 'bucle' })
        break
      case 'estructura':
        salida.push({ regla: 'estructura', forma: r.forma, compasesPorSeccion: r.compasesPorSeccion })
        break
      case 'empieza-en':
      case 'termina-en':
        salida.push({ regla: r.regla, pista: r.pista as Rol, grados: r.grados })
        break
      case 'instrumentos':
        salida.push({ regla: 'instrumentos', permitidos: r.permitidos as IdInstrumento[] })
        break
    }
  }
  const estructura = salida.find((r) => r.regla === 'estructura')
  if (estructura?.regla === 'estructura' && compases !== undefined && estructura.forma.length * estructura.compasesPorSeccion !== compases) {
    ctx.error(
      'estructura-no-cuadra',
      `La forma ${estructura.forma} con ${estructura.compasesPorSeccion} compases por sección ocupa ${estructura.forma.length * estructura.compasesPorSeccion} compases y el encargo pide ${compases}.`,
    )
  }
  const reglas = salida.map((r) => ('pista' in r ? `${r.regla}:${r.pista}` : r.regla))
  for (const [i, regla] of reglas.entries()) {
    if (reglas.indexOf(regla) !== i) ctx.error('requisito-repetido', `La regla «${regla}» aparece dos veces.`)
  }
  return salida
}

// ───────────────────────────── teoría ─────────────────────────────

function compilarTeoria(paso: De<'teoria'>, ctx: Contexto): PasoTeoria | undefined {
  const salida: PasoTeoria = { tipo: 'teoria', texto: ctx.prosa('texto', paso.texto), manipulable: paso.manipulable, vista: paso.vista }
  if (paso.titulo !== undefined) salida.titulo = paso.titulo
  if (paso.ejemplo) {
    if (paso.sinEjemplo) ctx.error('ejemplo-contradictorio', 'El paso tiene `ejemplo` y `sinEjemplo` a la vez.')
    const c = compilarPieza(paso.ejemplo, ctx.en('ejemplo'))
    if (!c) return undefined
    salida.ejemplo = c.pieza
    // El pentagrama no aproxima: si el ejemplo tiene una figura que no sabe escribir, es mejor saberlo aquí.
    if (paso.vista === 'pentagrama') ctx.en('ejemplo').intentar('pentagrama-imposible', () => piezaAAbc(c.pieza))
  } else if (!paso.sinEjemplo) {
    ctx.error('teoria-sin-ejemplo', 'Cada paso de teoría lleva un `ejemplo` que suene. Si de verdad no procede, explica el motivo en `sinEjemplo`.')
  }
  return salida
}

// ───────────────────────────── oído ─────────────────────────────

function compilarOido(paso: De<'oido'>, ctx: Contexto, concepto: string): PasoOido | undefined {
  const base = comun(paso, ctx, concepto)
  switch (paso.modo) {
    case 'intervalo': {
      const intervalos = paso.intervalos.flatMap((i) => ctx.intentar('intervalo-no-valido', () => normalizarIntervalo(i)) ?? [])
      if (new Set(intervalos).size !== intervalos.length) ctx.error('opciones-repetidas', 'Hay intervalos repetidos.')
      const registro = registroEnMidi(paso.registro, ctx)
      const mayor = Math.max(0, ...intervalos.map(semitonos))
      comprobarAlcance(paso.instrumento as IdInstrumento, registro, mayor, ctx)
      return { tipo: 'oido', modo: 'intervalo', ...base, intervalos, direcciones: paso.direcciones, registro, instrumento: paso.instrumento as IdInstrumento, rondas: paso.rondas }
    }
    case 'acorde': {
      for (const calidad of paso.calidades) {
        if (Chord.getChord(calidad, 'C').empty) ctx.error('acorde-desconocido', `Tonal no conoce el tipo de acorde «${calidad}». Ejemplos: M, m, dim, aug, 7, maj7, m7, m7b5, sus4.`)
      }
      if (new Set(paso.calidades).size !== paso.calidades.length) ctx.error('opciones-repetidas', 'Hay tipos de acorde repetidos.')
      const registro = registroEnMidi(paso.registro, ctx)
      comprobarAlcance(paso.instrumento as IdInstrumento, registro, 14, ctx)
      return {
        tipo: 'oido',
        modo: 'acorde',
        ...base,
        calidades: paso.calidades,
        presentacion: paso.presentacion,
        inversiones: paso.inversiones,
        registro,
        instrumento: paso.instrumento as IdInstrumento,
        rondas: paso.rondas,
      }
    }
    case 'progresion': {
      const tonalidades = paso.tonalidades.flatMap((t) => ctx.intentar('tonalidad-no-valida', () => leerTonalidad(t)) ?? [])
      const progresiones = paso.progresiones.map((p) => p.trim().split(/\s+/))
      for (const tonalidad of tonalidades) {
        for (const progresion of progresiones) {
          for (const grado of progresion) ctx.intentar('grado-no-valido', () => acordeDeGrado(tonalidad, grado))
        }
      }
      if (new Set(paso.progresiones).size !== paso.progresiones.length) ctx.error('opciones-repetidas', 'Hay progresiones repetidas.')
      return {
        tipo: 'oido',
        modo: 'progresion',
        ...base,
        tonalidades: tonalidades.map((t) => t.texto),
        progresiones,
        tempo: paso.tempo,
        instrumento: paso.instrumento as IdInstrumento,
        rondas: paso.rondas,
      }
    }
    case 'escala': {
      const escalas = paso.escalas.flatMap((e) => ctx.intentar('escala-no-valida', () => leerTonalidad(`C ${e}`).modo.nombre) ?? [])
      if (new Set(escalas).size !== escalas.length) ctx.error('opciones-repetidas', 'Hay escalas repetidas.')
      return { tipo: 'oido', modo: 'escala', ...base, escalas, tonicas: paso.tonicas, presentacion: paso.presentacion, instrumento: paso.instrumento as IdInstrumento, rondas: paso.rondas }
    }
    case 'timbre': {
      const instrumentos = paso.instrumentos as IdInstrumento[]
      const compas = leerCompas(paso.compas)
      const primero = instrumentos.find((i) => !(INSTRUMENTOS[i] as Instrumento).percusion)
      if (!primero || instrumentos.some((i) => (INSTRUMENTOS[i] as Instrumento).percusion)) {
        ctx.error('instrumento-sin-afinar', 'El ejercicio de timbre compara instrumentos afinados; quita la percusión.')
        return undefined
      }
      const leido = ctx.en('frase').intentar('notas-no-validas', () => leerNotas(paso.frase, { compas, instrumento: primero }))
      if (!leido) return undefined
      const [min, max] = leido.notas.reduce<[number, number]>(([a, b], n) => [Math.min(a, n.n), Math.max(b, n.n)], [127, 0])
      for (const id of instrumentos) {
        const [bajo, alto] = INSTRUMENTOS[id].rango
        // El motor transporta la frase por octavas para que quepa en cada instrumento.
        const cabe = [-36, -24, -12, 0, 12, 24, 36].some((o) => min + o >= bajo && max + o <= alto)
        if (!cabe) ctx.error('frase-fuera-de-rango', `La frase no cabe en el registro de «${INSTRUMENTOS[id].nombre}» ni transportándola por octavas.`)
      }
      if (new Set(instrumentos).size !== instrumentos.length) ctx.error('opciones-repetidas', 'Hay instrumentos repetidos.')
      return { tipo: 'oido', modo: 'timbre', ...base, instrumentos, frase: leido.notas, tempo: paso.tempo, compas, compases: leido.compases, rondas: paso.rondas }
    }
    case 'contorno': {
      const intervalos = paso.intervalos.flatMap((i) => ctx.intentar('intervalo-no-valido', () => normalizarIntervalo(i)) ?? [])
      const registro = registroEnMidi(paso.registro, ctx)
      comprobarAlcance(paso.instrumento as IdInstrumento, registro, Math.max(0, ...intervalos.map(semitonos)), ctx)
      return { tipo: 'oido', modo: 'contorno', ...base, intervalos, incluirIgual: paso.incluirIgual, registro, instrumento: paso.instrumento as IdInstrumento, rondas: paso.rondas }
    }
    case 'compas': {
      const compases = paso.compases.map((c) => ctx.intentar('compas-no-valido', () => leerCompas(c))).filter((c) => c !== undefined)
      if (new Set(paso.compases).size !== paso.compases.length) ctx.error('opciones-repetidas', 'Hay compases repetidos.')
      return { tipo: 'oido', modo: 'compas', ...base, compases, tempo: paso.tempo, rondas: paso.rondas }
    }
    case 'preguntas': {
      const preguntas: Extract<PasoOido, { modo: 'preguntas' }>['preguntas'] = []
      for (const [i, p] of paso.preguntas.entries()) {
        const c = ctx.en(`preguntas[${i}]`)
        const compilada = compilarPieza(p.pieza, c.en('pieza'))
        if (p.correcta > p.opciones.length) c.error('correcta-fuera', `\`correcta\` vale ${p.correcta} y solo hay ${p.opciones.length} opciones.`)
        if (!compilada) continue
        const pregunta: (typeof preguntas)[number] = {
          pieza: compilada.pieza,
          opciones: p.opciones.map((o, k) => c.prosa(`opciones[${k}]`, o)),
          correcta: p.correcta - 1,
        }
        if (p.explicacion !== undefined) pregunta.explicacion = c.prosa('explicacion', p.explicacion)
        preguntas.push(pregunta)
      }
      return { tipo: 'oido', modo: 'preguntas', ...base, preguntas }
    }
  }
}

// ───────────────────────────── ritmo ─────────────────────────────

function compilarRitmo(paso: De<'ritmo'>, ctx: Contexto, concepto: string): PasoRitmo | undefined {
  const base = comun(paso, ctx, concepto)
  const compas = leerCompas(paso.compas)
  const patron = ctx.en('patron').intentar('patron-no-valido', () => leerPatronRitmico(paso.patron, paso.paso, compas))
  if (!patron) return undefined
  return {
    tipo: 'ritmo',
    modo: paso.modo,
    ...base,
    tempo: paso.tempo,
    compas,
    paso: leerFigura(paso.paso),
    golpes: patron.golpes,
    acentos: patron.acentos,
    duracion: patron.duracion,
    cuentaAtras: paso.cuentaAtras,
    repeticiones: paso.repeticiones,
    tolerancia: paso.tolerancia,
    guia: paso.guia ?? (paso.modo === 'seguir' ? 'patron' : 'claqueta'),
  }
}

// ───────────────────────────── construcción ─────────────────────────────

function unaCorrectaYUnaIncorrecta(opciones: ReadonlyArray<{ correcta: boolean }>, ctx: Contexto): void {
  if (!opciones.some((o) => o.correcta)) ctx.error('sin-opcion-correcta', 'Ninguna opción está marcada como correcta.')
  if (!opciones.some((o) => !o.correcta)) ctx.error('sin-opcion-incorrecta', 'Todas las opciones están marcadas como correctas.')
}

function compilarConstruccion(
  paso: De<'construccion'>,
  ctx: Contexto,
  concepto: string,
): ConstruccionMelodia | ConstruccionAcorde | ConstruccionSecciones | undefined {
  const base = comun(paso, ctx, concepto)
  switch (paso.modo) {
    case 'completar-melodia': {
      const c = compilarPieza(paso.pieza, ctx.en('pieza'), { huecos: true })
      if (!c) return undefined
      const hueco = c.huecosDeNotas[0]
      if (c.huecosDeNotas.length !== 1 || !hueco || c.huecosDeAcordes.length > 0) {
        ctx.error('hueco-unico', `La pieza debe tener exactamente un hueco «?:figura» en una pista; tiene ${c.huecosDeNotas.length}.`)
        return undefined
      }
      const pista = c.pieza.pistas.find((p) => p.id === hueco.pista)
      if (!pista) return undefined
      const tonalidad = c.pieza.tonalidad ? leerTonalidad(c.pieza.tonalidad) : undefined
      unaCorrectaYUnaIncorrecta(paso.opciones, ctx)
      const opciones: ConstruccionMelodia['opciones'] = []
      for (const [i, o] of paso.opciones.entries()) {
        const co = ctx.en(`opciones[${i}]`)
        const fragmento = co.intentar('notas-no-validas', () => leerFragmento(o.notas, { instrumento: pista.instrumento }))
        if (!fragmento) continue
        if (fragmento.duracion !== hueco.d) {
          co.error('opcion-mal-medida', `La opción dura ${fragmento.duracion} ticks y el hueco ${hueco.d}: deben coincidir.`)
        }
        if (o.correcta && tonalidad) {
          for (const n of fragmento.notas) {
            if (!estaEnTonalidad(n.n, tonalidad) && !(paso.pieza.cromatismos ?? []).some((x) => croma(x) === cromaDeMidi(n.n))) {
              co.error('correcta-fuera-de-tonalidad', `La opción marcada como correcta tiene notas que no pertenecen a ${tonalidad.texto}.`)
              break
            }
          }
        }
        opciones.push({ notas: fragmento.notas.map((n) => ({ ...n, t: n.t + hueco.t })), correcta: o.correcta, porque: co.prosa('porque', o.porque) })
      }
      return { tipo: 'construccion', modo: 'completar-melodia', ...base, pieza: c.pieza, hueco, opciones }
    }
    case 'elegir-acorde': {
      const c = compilarPieza(paso.pieza, ctx.en('pieza'), { huecos: true })
      if (!c) return undefined
      const hueco = c.huecosDeAcordes[0]
      if (c.huecosDeAcordes.length !== 1 || !hueco || c.huecosDeNotas.length > 0) {
        ctx.error('hueco-unico', `La línea de \`acordes\` debe tener exactamente un hueco «?:figura»; tiene ${c.huecosDeAcordes.length}.`)
        return undefined
      }
      unaCorrectaYUnaIncorrecta(paso.opciones, ctx)
      const melodia = c.pieza.pistas.filter((p) => p.rol === 'melodia').flatMap((p) => p.notas)
      const primera = melodia.filter((n) => n.t >= hueco.t && n.t < hueco.t + hueco.d).sort((a, b) => a.t - b.t)[0]
      const opciones: ConstruccionAcorde['opciones'] = []
      for (const [i, o] of paso.opciones.entries()) {
        const co = ctx.en(`opciones[${i}]`)
        const acorde = co.intentar('acorde-desconocido', () => leerAcorde(o.acorde))
        if (!acorde) continue
        if (o.correcta && primera && !acorde.cromas.has(cromaDeMidi(primera.n))) {
          co.aviso('correcta-sin-nota-de-melodia', `El acorde correcto (${acorde.simbolo}) no contiene la primera nota de la melodía en ese tramo. Compruébalo.`)
        }
        opciones.push({ acorde: acorde.simbolo, correcta: o.correcta, porque: co.prosa('porque', o.porque) })
      }
      if (new Set(opciones.map((o) => o.acorde)).size !== opciones.length) ctx.error('opciones-repetidas', 'Hay acordes repetidos entre las opciones.')
      return { tipo: 'construccion', modo: 'elegir-acorde', ...base, pieza: c.pieza, hueco, opciones }
    }
    case 'ordenar-secciones': {
      const c = compilarPieza(paso.pieza, ctx.en('pieza'))
      if (!c) return undefined
      const secciones = c.pieza.secciones ?? []
      if (secciones.length < 3) ctx.error('pocas-secciones', 'Para ordenar secciones la pieza necesita al menos tres.')
      const cubiertos = secciones.reduce((s, x) => s + (x.hasta - x.desde + 1), 0)
      if (cubiertos !== c.pieza.compases) ctx.error('secciones-incompletas', 'Las secciones deben cubrir todos los compases de la pieza, sin huecos.')
      return { tipo: 'construccion', modo: 'ordenar-secciones', ...base, pieza: c.pieza }
    }
  }
}

// ───────────────────────────── piano roll ─────────────────────────────

function compilarPianoRoll(paso: De<'pianoroll'>, ctx: Contexto, concepto: string): PasoPianoRoll | undefined {
  const base = comun(paso, ctx, concepto)
  const c = compilarPieza(paso.plantilla, ctx.en('plantilla'), { pistasVacias: true })
  if (!c) return undefined
  for (const id of paso.editables) {
    if (!c.pieza.pistas.some((p) => p.id === id)) ctx.error('pista-inexistente', `\`editables\` nombra la pista «${id}», que no existe en la plantilla.`)
  }
  return { tipo: 'pianoroll', ...base, plantilla: c.pieza, editables: paso.editables, requisitos: compilarRequisitos(paso.requisitos, ctx) }
}

// ───────────────────────────── análisis ─────────────────────────────

const NOMBRES_FUNCION = { T: 'Tónica', S: 'Subdominante', D: 'Dominante' } as const

function compilarAnalisis(paso: De<'analisis'>, ctx: Contexto, concepto: string): PasoAnalisis | undefined {
  const base = comun(paso, ctx, concepto)
  const c = compilarPieza(paso.pieza, ctx.en('pieza'))
  if (!c) return undefined
  const pieza: Pieza = c.pieza
  const preguntas: PreguntaDeAnalisis[] = []

  /** Monta una pregunta cuyas opciones son cadenas y cuya respuesta se calcula a partir de la pieza. */
  const cerrada = (
    cp: Contexto,
    sobre: PreguntaDeAnalisis['sobre'],
    pregunta: string,
    opciones: string[],
    correcta: string | undefined,
    nodo: (v: string) => Prosa,
    explicacion: string | undefined,
    compas?: number,
  ): void => {
    if (correcta === undefined) return
    if (new Set(opciones).size !== opciones.length) cp.error('opciones-repetidas', 'Hay opciones repetidas.')
    const indice = opciones.indexOf(correcta)
    if (indice < 0) {
      cp.error('correcta-ausente', `La respuesta correcta según la pieza es «${correcta}» y no está entre las opciones (${opciones.join(', ')}).`)
      return
    }
    const p: PreguntaDeAnalisis = { sobre, pregunta: parrafo(pregunta), opciones: opciones.map(nodo), correcta: indice }
    if (explicacion !== undefined) p.explicacion = cp.prosa('explicacion', explicacion)
    if (compas !== undefined) p.compas = compas
    preguntas.push(p)
  }

  for (const [i, q] of paso.preguntas.entries()) {
    const cp = ctx.en(`preguntas[${i}] (${q.sobre})`)
    switch (q.sobre) {
      case 'tonalidad': {
        if (!pieza.tonalidad) {
          cp.error('pieza-sin-tonalidad', 'La pieza no declara `tonalidad`, así que no se puede preguntar por ella.')
          break
        }
        const opciones = q.opciones.flatMap((o) => cp.intentar('tonalidad-no-valida', () => leerTonalidad(o).texto) ?? [])
        cerrada(cp, 'tonalidad', '¿En qué tonalidad está?', opciones, pieza.tonalidad, (v) => [{ t: 'p', h: [{ t: 'tonalidad', v }] }], q.explicacion)
        break
      }
      case 'compas':
        cerrada(cp, 'compas', '¿En qué compás está escrita?', q.opciones, escribirCompas(pieza.compas), parrafo, q.explicacion)
        break
      case 'forma': {
        const forma = formaDe(pieza)
        if (!forma) cp.error('pieza-sin-secciones', 'La pieza no declara `secciones`, así que no se puede preguntar por la forma.')
        cerrada(cp, 'forma', '¿Qué forma tiene?', q.opciones, forma, parrafo, q.explicacion)
        break
      }
      case 'funcion': {
        const acorde = acordeEnCompas(pieza, q.compas)
        if (!acorde || !pieza.tonalidad) {
          cp.error('funcion-sin-datos', `Para preguntar por la función hacen falta \`tonalidad\` y un acorde en el compás ${q.compas}.`)
          break
        }
        const funcion = funcionDe(acorde, leerTonalidad(pieza.tonalidad))
        if (!funcion) {
          cp.error('acorde-no-diatonico', `El acorde ${acorde} del compás ${q.compas} no es diatónico en ${pieza.tonalidad}: su función no es evidente.`)
          break
        }
        cerrada(cp, 'funcion', `¿Qué función cumple el acorde del compás ${q.compas}?`, Object.values(NOMBRES_FUNCION), NOMBRES_FUNCION[funcion], parrafo, q.explicacion, q.compas)
        break
      }
      case 'acorde': {
        const acorde = acordeEnCompas(pieza, q.compas)
        if (!acorde) {
          cp.error('compas-sin-acorde', `No hay ningún acorde escrito en el compás ${q.compas}.`)
          break
        }
        const opciones = q.opciones.flatMap((o) => cp.intentar('acorde-desconocido', () => leerAcorde(o).simbolo) ?? [])
        cerrada(cp, 'acorde', `¿Qué acorde suena en el compás ${q.compas}?`, opciones, acorde, (v) => [{ t: 'p', h: [{ t: 'acorde', v }] }], q.explicacion, q.compas)
        break
      }
      case 'libre':
        if (q.correcta > q.opciones.length) {
          cp.error('correcta-fuera', `\`correcta\` vale ${q.correcta} y solo hay ${q.opciones.length} opciones.`)
          break
        }
        preguntas.push({
          sobre: 'libre',
          pregunta: cp.prosa('pregunta', q.pregunta),
          opciones: q.opciones.map((o, k) => cp.prosa(`opciones[${k}]`, o)),
          correcta: q.correcta - 1,
          explicacion: cp.prosa('explicacion', q.explicacion),
        })
        break
    }
  }
  return { tipo: 'analisis', ...base, pieza, preguntas }
}

// ───────────────────────────── capas ─────────────────────────────

function compilarCapas(paso: De<'capas'>, ctx: Contexto, concepto: string): PasoCapas | undefined {
  const base = comun(paso, ctx, concepto)
  const c = compilarPieza(paso.pieza, ctx.en('pieza'))
  if (!c) return undefined
  const pieza: Pieza = c.pieza
  if (!pieza.bucle) ctx.error('capas-sin-bucle', 'La pieza de un ejercicio de capas debe ser un bucle (`bucle: true`).')
  const capasDePistas = new Set<string>()
  for (const pista of pieza.pistas) {
    if (!pista.capa) ctx.error('pista-sin-capa', `La pista «${pista.id}» no declara a qué \`capa\` pertenece.`)
    else capasDePistas.add(pista.capa)
  }
  for (const id of Object.keys(paso.capas)) {
    if (!capasDePistas.has(id)) ctx.error('capa-sin-pistas', `La capa «${id}» tiene nombre pero ninguna pista la usa.`)
  }
  for (const id of capasDePistas) {
    if (!(id in paso.capas)) ctx.error('capa-sin-nombre', `La capa «${id}» no tiene nombre en \`capas\`.`)
  }
  const secciones = new Set((pieza.secciones ?? []).map((s) => s.id))
  const estados: EstadoDeJuego[] = []
  const idsDeEstado = new Set<string>()
  for (const [i, e] of paso.estados.entries()) {
    const ce = ctx.en(`estados[${i}] (${e.id})`)
    if (idsDeEstado.has(e.id)) ce.error('estado-repetido', `Hay dos estados con el identificador «${e.id}».`)
    idsDeEstado.add(e.id)
    for (const capa of e.capas) {
      if (!capasDePistas.has(capa)) ce.error('capa-inexistente', `El estado usa la capa «${capa}», que no existe en la pieza.`)
    }
    if (e.seccion !== undefined && !secciones.has(e.seccion)) ce.error('seccion-inexistente', `El estado usa la sección «${e.seccion}», que no existe en la pieza.`)
    const estado: EstadoDeJuego = { id: e.id, nombre: e.nombre, capas: e.capas }
    if (e.descripcion !== undefined) estado.descripcion = ce.prosa('descripcion', e.descripcion)
    if (e.seccion !== undefined) estado.seccion = e.seccion
    estados.push(estado)
  }
  const usanSeccion = estados.filter((e) => e.seccion !== undefined).length
  if (usanSeccion > 0 && usanSeccion < estados.length) ctx.error('secciones-a-medias', 'Si un estado indica `seccion`, todos deben indicarla.')
  const situaciones = paso.situaciones.map((s, i) => {
    const cs = ctx.en(`situaciones[${i}]`)
    if (!idsDeEstado.has(s.estado)) cs.error('estado-inexistente', `La situación apunta al estado «${s.estado}», que no existe.`)
    return { texto: cs.prosa('texto', s.texto), estado: s.estado, porque: cs.prosa('porque', s.porque) }
  })
  return { tipo: 'capas', ...base, pieza, capas: paso.capas, estados, transicion: paso.transicion, situaciones }
}

// ───────────────────────────── encargo ─────────────────────────────

function compilarEncargo(paso: De<'encargo'>, ctx: Contexto, concepto: string): PasoEncargo | undefined {
  const salida: PasoEncargo = {
    tipo: 'encargo',
    titulo: paso.titulo,
    brief: ctx.prosa('brief', paso.brief),
    pista: ctx.prosa('pista', paso.pista),
    explicacion: ctx.prosa('explicacion', paso.explicacion),
    concepto: ctx.concepto(paso.concepto ?? concepto),
    requisitos: compilarRequisitos(paso.requisitos, ctx),
  }
  if (paso.cliente !== undefined) salida.cliente = paso.cliente
  if (paso.plantilla) {
    const c = compilarPieza(paso.plantilla, ctx.en('plantilla'), { pistasVacias: true })
    if (!c) return undefined
    salida.plantilla = c.pieza
    const compases = salida.requisitos.find((r) => r.regla === 'compases')
    if (compases?.regla === 'compases' && compases.valor !== c.pieza.compases) {
      ctx.error('plantilla-no-cuadra', `La plantilla tiene ${c.pieza.compases} compases y el encargo pide ${compases.valor}.`)
    }
    const compas = salida.requisitos.find((r) => r.regla === 'compas')
    if (compas?.regla === 'compas' && ticksPorCompas(compas.valor) !== ticksPorCompas(c.pieza.compas)) {
      ctx.error('plantilla-no-cuadra', 'El compás de la plantilla no es el que pide el encargo.')
    }
  }
  return salida
}

// ───────────────────────────── entrada ─────────────────────────────

/** Compila un paso. Devuelve `undefined` si no se pudo (los motivos quedan en el contexto). */
export function compilarPaso(paso: PasoT, ctx: Contexto, conceptoPorDefecto: string): Paso | undefined {
  switch (paso.tipo) {
    case 'teoria':
      return compilarTeoria(paso, ctx)
    case 'oido':
      return compilarOido(paso, ctx, conceptoPorDefecto)
    case 'ritmo':
      return compilarRitmo(paso, ctx, conceptoPorDefecto)
    case 'construccion':
      return compilarConstruccion(paso, ctx, conceptoPorDefecto)
    case 'pianoroll':
      return compilarPianoRoll(paso, ctx, conceptoPorDefecto)
    case 'analisis':
      return compilarAnalisis(paso, ctx, conceptoPorDefecto)
    case 'capas':
      return compilarCapas(paso, ctx, conceptoPorDefecto)
    case 'encargo':
      return compilarEncargo(paso, ctx, conceptoPorDefecto)
  }
}
