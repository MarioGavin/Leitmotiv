/**
 * Fachada del audio para la interfaz. Vive en el paquete inicial y pesa muy
 * poco: el motor (Tone.js, smplr) se descarga aparte, en cuanto la app está
 * ociosa, y como muy tarde al primer gesto.
 */
import type { IdInstrumento } from '../musica/instrumentos.ts'
import type { Pieza } from '../musica/pieza.ts'
import { useAudio } from './estado.ts'
import type * as Motor from './motor.ts'
import type { Diagnostico, NotaSuelta } from './motor.ts'
import type { OpcionesDeReproductor, Reproductor } from './reproductor.ts'
import type * as Sonidos from './sonidos.ts'
import type { SonidoDeInterfaz, TimbreDeInterfaz } from './sonidos.ts'

type Motor = typeof Motor
type Sonidos = typeof Sonidos

let motor: Promise<Motor> | undefined
let sonidos: Promise<Sonidos> | undefined
let sonidosListos: Sonidos | undefined
let silencioDeInterfaz = false
let timbre: TimbreDeInterfaz = 'chip'

function cargarMotor(): Promise<Motor> {
  motor ??= import('./motor.ts')
  return motor
}

function cargarSonidos(): Promise<Sonidos> {
  sonidos ??= import('./sonidos.ts').then((m) => {
    m.fijarTimbre(timbre)
    sonidosListos = m
    return m
  })
  return sonidos
}

/** Descarga el motor de audio sin arrancarlo, para que el primer toque no tenga que esperar. */
export function precargarAudio(): void {
  void cargarMotor().then(() => cargarSonidos())
}

/** Arranca el audio. Debe llamarse desde un gesto del usuario. */
export async function iniciarAudio(): Promise<void> {
  const m = await cargarMotor()
  await m.iniciar()
  await cargarSonidos()
}

export function audioActivo(): boolean {
  return useAudio.getState().estado === 'activo'
}

export async function tocarNotas(id: IdInstrumento, notas: readonly NotaSuelta[]): Promise<void> {
  const m = await cargarMotor()
  if (!m.iniciado()) await m.iniciar()
  await m.tocar(id, notas)
}

export async function prepararPieza(pieza: Pieza, opciones?: OpcionesDeReproductor): Promise<Reproductor> {
  const m = await cargarMotor()
  if (!m.iniciado()) await m.iniciar()
  return m.prepararPieza(pieza, opciones)
}

export async function precargarInstrumento(id: IdInstrumento): Promise<void> {
  const m = await cargarMotor()
  if (!m.iniciado()) return
  await m.voz(id)
}

export async function diagnosticoDeAudio(): Promise<Diagnostico | undefined> {
  const m = await cargarMotor()
  return m.iniciado() ? m.diagnostico() : undefined
}

/** Sonido de interfaz. No hace nada si están silenciados o el audio no ha arrancado. */
export function sonar(sonido: SonidoDeInterfaz): void {
  if (silencioDeInterfaz) return
  try {
    sonidosListos?.sonar(sonido)
  } catch (error) {
    // Un sonido de interfaz es un adorno: si falla, la acción que lo acompaña tiene que seguir adelante.
    console.warn('No ha podido sonar la interfaz', error)
  }
}

export function silenciarInterfaz(silencio: boolean): void {
  silencioDeInterfaz = silencio
}

export function fijarTimbreDeInterfaz(nuevo: TimbreDeInterfaz): void {
  timbre = nuevo
  sonidosListos?.fijarTimbre(nuevo)
}
