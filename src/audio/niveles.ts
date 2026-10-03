/**
 * Niveles de la mezcla, compartidos por el motor en tiempo real y por el render
 * offline para que lo que se mide sea lo que suena.
 *
 * Se han fijado midiendo (npm run audio:check): con estos valores un ejemplo
 * con melodía y acompañamiento queda entre −15 y −19 LUFS y el limitador solo
 * actúa en picos aislados.
 */

/** Ganancia del bus de música antes del limitador, en dB. */
export const NIVEL_MUSICA_DB = 2

/** Umbral del limitador, en dB. Deja margen para los picos entre muestras. */
export const UMBRAL_LIMITADOR_DB = -1.5

/** Nivel del bus de sonidos de interfaz, en dB. No pasa por el limitador. */
export const NIVEL_INTERFAZ_DB = -8

export function dbAGanancia(db: number): number {
  return 10 ** (db / 20)
}
