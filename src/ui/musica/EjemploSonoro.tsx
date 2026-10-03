import { type CSSProperties, useState } from 'react'
import type { Manipulable } from '../../contenido/tipos.ts'
import { INSTRUMENTOS } from '../../musica/instrumentos.ts'
import { NOMBRES_ROL, type Pieza } from '../../musica/pieza.ts'
import { Boton } from '../Boton.tsx'
import { Deslizador } from '../Deslizador.tsx'
import { Marco } from '../Marco.tsx'
import { VistaDePieza } from './VistaDePieza.tsx'
import type { ControlDeReproduccion } from './useReproductor.ts'

const TEMPO_MINIMO = 40
const TEMPO_MAXIMO = 200

interface PropsDeBoton {
  reproduccion: ControlDeReproduccion
  className?: string
  /** Icono cuando está parado. Por defecto, el de reproducir. */
  icono?: 'reproducir' | 'escuchar'
}

/** Botón de escuchar y parar una pieza. Mientras se descargan los sonidos, lo dice. */
export function BotonDeEscucha({ reproduccion, className, icono = 'reproducir' }: PropsDeBoton) {
  const sonando = reproduccion.estado === 'sonando'
  const cargando = reproduccion.estado === 'cargando'
  return (
    <Boton {...(className ? { className } : {})} icono={sonando || cargando ? 'detener' : icono} sonido={null} onClick={reproduccion.alternar} aria-pressed={sonando}>
      {cargando ? 'Cargando…' : sonando ? 'Parar' : 'Escuchar'}
    </Boton>
  )
}

/** Aviso de que el sonido no ha podido cargarse, con lo que se puede hacer. */
export function AvisoDeSonido({ reproduccion }: { reproduccion: ControlDeReproduccion }) {
  if (reproduccion.estado !== 'error') return null
  return (
    <p className="nota-al-pie" role="alert">
      No se ha podido cargar el sonido. {navigator.onLine ? 'Vuelve a intentarlo.' : 'Hace falta conexión la primera vez que se usa un instrumento.'}
    </p>
  )
}

interface Props {
  pieza: Pieza
  /** Lo devuelve `useReproductor(pieza)`: quien pinta el ejemplo decide dónde va el botón de escuchar. */
  reproduccion: ControlDeReproduccion
  /** Qué puede tocar el usuario en este ejemplo. */
  manipulable?: readonly Manipulable[]
}

/**
 * Ejemplo sonoro de una lección: la pieza a la vista y los controles que la
 * lección permita tocar (tempo, transposición, pistas).
 */
export function EjemploSonoro({ pieza, reproduccion, manipulable = [] }: Props) {
  const [tempo, setTempo] = useState(pieza.tempo)
  const [semitonos, setSemitonos] = useState(0)
  const [apagadas, setApagadas] = useState<ReadonlySet<string>>(() => new Set(pieza.pistas.filter((p) => p.silenciada).map((p) => p.id)))

  const cambiarTempo = (nuevo: number): void => {
    setTempo(nuevo)
    reproduccion.fijarTempo(nuevo)
  }

  const cambiarTransposicion = (nuevo: number): void => {
    const acotado = Math.max(-12, Math.min(12, nuevo))
    setSemitonos(acotado)
    reproduccion.fijarTransposicion(acotado)
  }

  const alternarPista = (id: string): void => {
    const siguiente = new Set(apagadas)
    if (siguiente.has(id)) siguiente.delete(id)
    else siguiente.add(id)
    setApagadas(siguiente)
    reproduccion.silenciar(id, siguiente.has(id))
  }

  return (
    <div className="transporte">
      <Marco variante="hundido" relleno="ninguno" plano>
        <VistaDePieza pieza={pieza} posicion={reproduccion.posicion} sonando={reproduccion.estado === 'sonando'} apagadas={apagadas} />
      </Marco>
      <AvisoDeSonido reproduccion={reproduccion} />
      {manipulable.includes('tempo') && <Deslizador etiqueta="Tempo" valor={tempo} min={TEMPO_MINIMO} max={TEMPO_MAXIMO} lectura={`${tempo} BPM`} alCambiar={cambiarTempo} />}
      {manipulable.includes('transposicion') && (
        <div className="transporte__fila">
          <span className="etiqueta crece">Transposición</span>
          <Boton soloIcono icono="menos" sonido="cursor" aria-label="Bajar un semitono" onClick={() => cambiarTransposicion(semitonos - 1)} />
          <output className="deslizador__valor">{semitonos > 0 ? `+${semitonos}` : semitonos}</output>
          <Boton soloIcono icono="mas" sonido="cursor" aria-label="Subir un semitono" onClick={() => cambiarTransposicion(semitonos + 1)} />
        </div>
      )}
      {manipulable.includes('pistas') && pieza.pistas.length > 1 && (
        <div className="transporte__pistas" role="group" aria-label="Pistas que suenan">
          {pieza.pistas.map((pista) => (
            <button
              key={pista.id}
              type="button"
              className="pista-chip"
              aria-pressed={!apagadas.has(pista.id)}
              style={{ '--_color': `var(--pista-${pista.rol})` } as CSSProperties}
              onClick={() => alternarPista(pista.id)}
            >
              <span className="pista-chip__color" />
              {pista.nombre ?? (pieza.pistas.filter((p) => p.rol === pista.rol).length > 1 ? INSTRUMENTOS[pista.instrumento].nombre : NOMBRES_ROL[pista.rol])}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
