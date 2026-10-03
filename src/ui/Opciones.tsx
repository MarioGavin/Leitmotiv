import { type KeyboardEvent, type ReactNode, useRef } from 'react'
import { sonar } from '../audio/audio.ts'
import { Icono } from './Icono.tsx'

export interface Opcion<T extends string | number> {
  valor: T
  contenido: ReactNode
  /** Resultado tras comprobar: pinta la opción como acertada o fallada. */
  estado?: 'correcta' | 'incorrecta'
}

interface Props<T extends string | number> {
  /** Nombre del grupo para lectores de pantalla. */
  etiqueta: string
  opciones: ReadonlyArray<Opcion<T>>
  valor: T | undefined
  alElegir: (valor: T) => void
  /** No deja cambiar la elección (por ejemplo, tras comprobar). */
  bloqueadas?: boolean
}

const LETRAS = 'ABCDEFGH'

/**
 * Lista de opciones con cursor, como el menú de un RPG: tocar una opción mueve
 * el cursor; la respuesta se confirma aparte. Con teclado, las flechas mueven
 * el cursor.
 */
export function Opciones<T extends string | number>({ etiqueta, opciones, valor, alElegir, bloqueadas = false }: Props<T>) {
  const grupo = useRef<HTMLDivElement>(null)
  const elegida = opciones.findIndex((o) => o.valor === valor)

  const elegir = (indice: number): void => {
    const opcion = opciones[indice]
    if (!opcion || bloqueadas || opcion.valor === valor) return
    sonar('cursor')
    alElegir(opcion.valor)
  }

  const alTeclear = (evento: KeyboardEvent<HTMLDivElement>): void => {
    const paso = evento.key === 'ArrowDown' || evento.key === 'ArrowRight' ? 1 : evento.key === 'ArrowUp' || evento.key === 'ArrowLeft' ? -1 : 0
    if (paso === 0 || bloqueadas) return
    evento.preventDefault()
    const siguiente = (Math.max(elegida, paso === 1 ? -1 : 0) + paso + opciones.length) % opciones.length
    elegir(siguiente)
    grupo.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[siguiente]?.focus()
  }

  return (
    // El foco entra por la opción marcada (tabIndex 0) y se mueve con las flechas; el grupo en sí no se tabula.
    <div className="opciones" role="radiogroup" aria-label={etiqueta} tabIndex={-1} ref={grupo} onKeyDown={alTeclear}>
      {opciones.map((opcion, i) => {
        const marcada = i === elegida
        const clases = ['opcion']
        if (opcion.estado) clases.push(`opcion--${opcion.estado}`)
        return (
          <button
            key={opcion.valor}
            type="button"
            role="radio"
            aria-checked={marcada}
            // Solo una opción del grupo entra en el orden de tabulación; dentro se navega con las flechas.
            tabIndex={marcada || (elegida === -1 && i === 0) ? 0 : -1}
            aria-disabled={bloqueadas || undefined}
            className={clases.join(' ')}
            onClick={() => elegir(i)}
          >
            <span className="opcion__marca" data-letra={LETRAS[i]} aria-hidden="true">
              <Icono nombre="cursor" />
            </span>
            <span className="opcion__texto">{opcion.contenido}</span>
            <span className="opcion__estado">
              {opcion.estado === 'correcta' && <Icono nombre="acierto" titulo="Correcta" />}
              {opcion.estado === 'incorrecta' && <Icono nombre="fallo" titulo="Incorrecta" />}
            </span>
          </button>
        )
      })}
    </div>
  )
}
