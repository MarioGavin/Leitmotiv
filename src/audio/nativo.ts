/**
 * Síntesis con nodos nativos de Web Audio: lo que usan los sonidos de interfaz
 * y los instrumentos de chip.
 *
 * Cada nota es un oscilador nuevo con su propia envolvente, que se destruye al
 * acabar. A diferencia de un sintetizador monofónico de Tone.js, no guarda
 * estado entre notas: se puede programar una nota para «ahora» aunque haya
 * otras ya programadas para más tarde (toques rápidos, un sonido de interfaz
 * que pisa a otro) sin que nada falle.
 */

const ondas = new WeakMap<BaseAudioContext, Map<number, PeriodicWave>>()

/**
 * Onda de pulso con el ciclo de trabajo indicado (0,5 es una cuadrada; 0,25 y
 * 0,125 son los timbres más finos de una consola de 8 bits), limitada en
 * banda: no produce aliasing en las notas agudas.
 */
export function ondaDePulso(ctx: BaseAudioContext, ciclo: number): PeriodicWave {
  let porCiclo = ondas.get(ctx)
  if (!porCiclo) {
    porCiclo = new Map()
    ondas.set(ctx, porCiclo)
  }
  let onda = porCiclo.get(ciclo)
  if (!onda) {
    const armonicos = 64
    const real = new Float32Array(armonicos + 1)
    const imag = new Float32Array(armonicos + 1)
    // Serie de Fourier de un pulso que vale +1 durante `ciclo` y −1 el resto del periodo.
    for (let n = 1; n <= armonicos; n++) {
      real[n] = (2 / (n * Math.PI)) * Math.sin(2 * Math.PI * n * ciclo)
      imag[n] = (2 / (n * Math.PI)) * (1 - Math.cos(2 * Math.PI * n * ciclo))
    }
    onda = ctx.createPeriodicWave(real, imag)
    porCiclo.set(ciclo, onda)
  }
  return onda
}

export interface Envolvente {
  /** Segundos hasta el nivel máximo. */
  ataque: number
  /** Segundos de caída hasta el nivel de sostenido. */
  caida: number
  /** Nivel de sostenido, de 0 a 1 (relativo al máximo). */
  sostenido: number
  /** Segundos que tarda en apagarse al soltar. */
  relajacion: number
}

export interface NotaNativa {
  /** Detiene la nota de inmediato, con un fundido muy corto para que no chasquee. */
  cortar: () => void
}

interface OpcionesDeNota {
  ctx: BaseAudioContext
  destino: AudioNode
  /** Crea y conecta la fuente a `entrada`; devuelve los osciladores que hay que arrancar y parar. */
  fuente: (entrada: AudioNode) => OscillatorNode[]
  /** Instante de inicio, en segundos del reloj de audio. */
  tiempo: number
  /** Segundos que se mantiene pulsada. */
  duracion: number
  /** Ganancia en el máximo de la envolvente. */
  nivel: number
  envolvente: Envolvente
  /** Se llama cuando la nota ha terminado de sonar. */
  alAcabar?: () => void
  /**
   * Reloj con el que se corta la nota. Por defecto, el del contexto; en un
   * render sin altavoces ese no avanza hasta el final y hay que dar el de Tone.js.
   */
  ahora?: () => number
}

/** Programa una nota: fuente → envolvente → destino. */
export function programarNota({ ctx, destino, fuente, tiempo, duracion, nivel, envolvente, alAcabar, ahora: reloj }: OpcionesDeNota): NotaNativa {
  const ganancia = ctx.createGain()
  ganancia.connect(destino)
  const osciladores = fuente(ganancia)
  const { ataque, caida, sostenido, relajacion } = envolvente
  const suelta = tiempo + Math.max(ataque, duracion)
  const fin = suelta + relajacion
  const g = ganancia.gain
  g.setValueAtTime(0, tiempo)
  g.linearRampToValueAtTime(nivel, tiempo + ataque)
  // Si la nota es más corta que la caída, se suelta desde donde esté.
  const finDeCaida = Math.min(suelta, tiempo + ataque + caida)
  const nivelAlSoltar = caida > 0 ? nivel + (nivel * sostenido - nivel) * ((finDeCaida - tiempo - ataque) / caida) : nivel * sostenido
  g.linearRampToValueAtTime(nivelAlSoltar, finDeCaida)
  g.setValueAtTime(nivelAlSoltar, suelta)
  g.linearRampToValueAtTime(0, fin)
  for (const oscilador of osciladores) {
    oscilador.start(tiempo)
    oscilador.stop(fin + 0.01)
  }
  const principal = osciladores[0]
  if (principal) {
    principal.onended = () => {
      ganancia.disconnect()
      alAcabar?.()
    }
  }
  return {
    cortar() {
      const ahora = reloj ? reloj() : ctx.currentTime
      // Se congela la envolvente donde esté y se funde a cero: cancelar a secas daría un salto audible.
      if (typeof g.cancelAndHoldAtTime === 'function') g.cancelAndHoldAtTime(ahora)
      else g.cancelScheduledValues(ahora)
      g.setTargetAtTime(0, ahora, 0.004)
      for (const oscilador of osciladores) {
        try {
          oscilador.stop(ahora + 0.03)
        } catch {
          // Ya estaba parado.
        }
      }
    },
  }
}

export function frecuenciaDe(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}
