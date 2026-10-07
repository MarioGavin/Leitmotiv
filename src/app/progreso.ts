/**
 * El progreso tal como lo leen las pantallas: qué está abierto y hecho en el
 * curso, y la ficha del jugador.
 *
 * La lectura de la base empieza al arrancar (main.tsx). Las pantallas que
 * dependen de ella esperan con `use()` dentro de su límite de suspense, para
 * no enseñar un candado que un momento después desaparece.
 */
import { use, useMemo, useState } from 'react'
import { type EstadoDeMundo, estadoDelCurso } from '../progreso/desbloqueo.ts'
import { type Ficha, fichaDelJugador } from '../progreso/ficha.ts'
import { cargarProgreso, useProgreso } from '../progreso/progreso.ts'
import { diaDe } from '../progreso/tipos.ts'
import { leerIndice } from './contenido.ts'

/** Estado de todo el curso con el progreso ya leído. Suspende mientras se leen el índice o el progreso. */
export function useEstadoDelCurso(): EstadoDeMundo[] {
  const indice = use(leerIndice())
  // Si no se puede leer, la promesa se cumple igual y el progreso queda vacío.
  use(cargarProgreso())
  const lecciones = useProgreso((p) => p.lecciones)
  const superadas = useProgreso((p) => p.superadas)
  return useMemo(() => estadoDelCurso(indice, new Set(Object.keys(lecciones)), new Set(superadas)), [indice, lecciones, superadas])
}

/** Nivel, experiencia y racha. No suspende: hasta que se lee el progreso, es la ficha de quien empieza. */
export function useFicha(): Ficha {
  const diario = useProgreso((p) => p.diario)
  // El día se fija al montar la pantalla: si pasa la medianoche con ella abierta, la racha se pone al día en la siguiente.
  const [hoy] = useState(() => diaDe(new Date()))
  return useMemo(() => fichaDelJugador(diario, hoy), [diario, hoy])
}
