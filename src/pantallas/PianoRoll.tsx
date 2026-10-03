import { type CSSProperties, use, useState } from 'react'
import { useAjustes } from '../app/ajustes.ts'
import { leerGlosario } from '../app/contenido.ts'
import { navegar } from '../app/rutas.ts'
import { tocarNotas } from '../audio/audio.ts'
import { INSTRUMENTOS, type Instrumento } from '../musica/instrumentos.ts'
import { NOMBRES_ROL, type Nota, type Pieza } from '../musica/pieza.ts'
import { PPQ, ticksASegundos } from '../musica/tiempo.ts'
import { tonalidadVisible } from '../musica/tonalidad.ts'
import { Boton } from '../ui/Boton.tsx'
import { Cabecera } from '../ui/Cabecera.tsx'
import { Conmutador } from '../ui/Conmutador.tsx'
import { Marco } from '../ui/Marco.tsx'
import { AvisoDeSonido } from '../ui/musica/EjemploSonoro.tsx'
import { RolloDePiano } from '../ui/musica/RolloDePiano.tsx'
import { useReproductor } from '../ui/musica/useReproductor.ts'

/** Pasos de rejilla que se pueden elegir, en ticks. */
const REJILLAS = [
  { valor: String(PPQ), texto: '1/4' },
  { valor: String(PPQ / 2), texto: '1/8' },
  { valor: String(PPQ / 4), texto: '1/16' },
] as const

const TEMPO_MINIMO = 40
const TEMPO_MAXIMO = 220

/** Término del glosario cuyo ejemplo se abre como pieza de prueba. */
const PIEZA_DE_PRUEBA = 'bucle'

function Editor({ inicial }: { inicial: Pieza }) {
  const nomenclatura = useAjustes((a) => a.nomenclatura)
  const [pieza, setPieza] = useState<Pieza>(() => structuredClone(inicial))
  const [idDePista, setIdDePista] = useState(pieza.pistas[0]?.id ?? '')
  const [paso, setPaso] = useState(PPQ / 2)
  const [tempo, setTempo] = useState(pieza.tempo)
  const [bucle, setBucle] = useState(pieza.bucle ?? true)
  const reproduccion = useReproductor(pieza, { bucle })
  const sonando = reproduccion.estado === 'sonando'
  const cargando = reproduccion.estado === 'cargando'
  const pista = pieza.pistas.find((p) => p.id === idDePista)

  const cambiarTempo = (nuevo: number): void => {
    const acotado = Math.max(TEMPO_MINIMO, Math.min(TEMPO_MAXIMO, nuevo))
    setTempo(acotado)
    reproduccion.fijarTempo(acotado)
  }

  const cambiarNotas = (notas: Nota[], tocada?: Nota): void => {
    if (!pista) return
    // El tempo viaja con la pieza: así el reproductor nuevo arranca al tempo que se ve en pantalla.
    setPieza({ ...pieza, tempo, pistas: pieza.pistas.map((p) => (p.id === pista.id ? { ...p, notas } : p)) })
    if (tocada) {
      const instrumento: Instrumento = INSTRUMENTOS[pista.instrumento]
      const duracion = instrumento.percusion ? 0.3 : Math.min(0.6, ticksASegundos(tocada.d, tempo))
      void tocarNotas(pista.instrumento, [{ nota: tocada.n, duracion, velocidad: tocada.v }]).catch(() => undefined)
    }
  }

  return (
    <main className="pantalla pantalla--pianoroll">
      <Cabecera
        titulo={pieza.titulo ?? 'Pieza sin título'}
        antes={<Boton variante="fantasma" soloIcono icono="atras" sonido="atras" aria-label="Volver al repertorio" onClick={() => navegar({ pantalla: 'repertorio' })} />}
        despues={pieza.tonalidad !== undefined && <span className="cabecera__dato">{tonalidadVisible(pieza.tonalidad, nomenclatura)}</span>}
      />
      <div className="pianoroll__pistas" role="group" aria-label="Pista que se edita">
        {pieza.pistas.map((p) => (
          <button key={p.id} type="button" className="pista-chip pista-chip--pestana" aria-pressed={p.id === idDePista} style={{ '--_color': `var(--pista-${p.rol})` } as CSSProperties} onClick={() => setIdDePista(p.id)}>
            <span className="pista-chip__color" />
            {p.nombre ?? NOMBRES_ROL[p.rol]}
          </button>
        ))}
      </div>
      <Marco variante="hundido" relleno="ninguno" className="pianoroll__marco">
        <RolloDePiano pieza={pieza} pista={idDePista} paso={paso} figura={paso} alCambiar={cambiarNotas} posicion={reproduccion.posicion} sonando={sonando} />
      </Marco>
      <div className="pianoroll__controles">
        <AvisoDeSonido reproduccion={reproduccion} />
        <div className="pianoroll__fila">
          <Boton variante="primario" soloIcono icono={sonando || cargando ? 'detener' : 'reproducir'} sonido={null} aria-label={sonando || cargando ? 'Parar' : 'Reproducir'} onClick={reproduccion.alternar} />
          <Boton soloIcono icono="bucle" sonido="cursor" aria-label="Repetir en bucle" aria-pressed={bucle} className={bucle ? 'boton--activo' : undefined} onClick={() => setBucle(!bucle)} />
          <span className="crece" />
          <Boton soloIcono icono="menos" sonido="cursor" aria-label="Bajar el tempo" onClick={() => cambiarTempo(tempo - 4)} />
          <output className="pianoroll__tempo" aria-label="Tempo">
            <span className="dato">{tempo}</span>
            <span className="etiqueta">BPM</span>
          </output>
          <Boton soloIcono icono="mas" sonido="cursor" aria-label="Subir el tempo" onClick={() => cambiarTempo(tempo + 4)} />
        </div>
        <div className="pianoroll__fila">
          <span className="etiqueta">Rejilla</span>
          <div className="crece">
            <Conmutador etiqueta="Paso de la rejilla" valor={String(paso)} alCambiar={(valor) => setPaso(Number(valor))} opciones={REJILLAS} />
          </div>
        </div>
      </div>
    </main>
  )
}

/**
 * Piano roll. En el Tramo A abre una pieza de prueba (el ejemplo de «bucle»
 * del glosario) para juzgar el diseño y el tacto; en el Tramo B editará las
 * piezas de los encargos y del repertorio, con deshacer y exportación a MIDI.
 */
export function PianoRoll() {
  const glosario = use(leerGlosario())
  const ejemplo = glosario.find((t) => t.id === PIEZA_DE_PRUEBA)?.ejemplo
  if (!ejemplo) {
    return (
      <main className="pantalla">
        <Cabecera titulo="Piano roll" />
        <div className="pantalla__cuerpo">
          <p>No se ha encontrado la pieza de prueba.</p>
        </div>
      </main>
    )
  }
  return <Editor inicial={ejemplo} />
}
