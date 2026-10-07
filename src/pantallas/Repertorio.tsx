import { use, useState } from 'react'
import { leerIndice } from '../app/contenido.ts'
import { descargarMidi } from '../app/descargas.ts'
import { navegar } from '../app/rutas.ts'
import { sonar } from '../audio/audio.ts'
import { cargarProgreso, useProgreso } from '../progreso/progreso.ts'
import type { PiezaGuardada } from '../progreso/tipos.ts'
import { Boton } from '../ui/Boton.tsx'
import { Cabecera } from '../ui/Cabecera.tsx'
import { Icono } from '../ui/Icono.tsx'
import { Marco } from '../ui/Marco.tsx'
import { Ventana } from '../ui/Ventana.tsx'
import { AvisoDeSonido, BotonDeEscucha } from '../ui/musica/EjemploSonoro.tsx'
import { VistaDePieza } from '../ui/musica/VistaDePieza.tsx'
import { useReproductor } from '../ui/musica/useReproductor.ts'

function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

function datosDe(pieza: PiezaGuardada): string {
  const { compases, tempo } = pieza.pieza
  return `${compases} ${compases === 1 ? 'compás' : 'compases'} · ${tempo} BPM`
}

interface PropsDeDetalle {
  pieza: PiezaGuardada
  /** Título de la lección de cuyo encargo sale, si sale de uno. */
  origen: string | undefined
  alBorrar: () => void
}

/** Una pieza abierta: se ve, se escucha, se abre en el piano roll, se exporta o se borra. */
function Detalle({ pieza, origen, alBorrar }: PropsDeDetalle) {
  const reproduccion = useReproductor(pieza.pieza)
  const [exportando, setExportando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [fallo, setFallo] = useState(false)

  const exportar = async (): Promise<void> => {
    setExportando(true)
    setFallo(false)
    try {
      await descargarMidi(pieza.pieza, pieza.titulo)
      sonar('aceptar')
    } catch (error) {
      console.warn('No se ha podido exportar a MIDI', error)
      setFallo(true)
      sonar('fallo')
    } finally {
      setExportando(false)
    }
  }

  return (
    <>
      <p className="suave nota-al-pie">
        {datosDe(pieza)}
        {origen !== undefined && <> · Encargo de «{origen}»</>}
        <br />
        Creada el {fechaCorta(pieza.creada)}; tocada por última vez el {fechaCorta(pieza.modificada)}.
      </p>
      <Marco variante="hundido" relleno="ninguno" plano>
        <VistaDePieza pieza={pieza.pieza} posicion={reproduccion.posicion} sonando={reproduccion.estado === 'sonando'} />
      </Marco>
      <AvisoDeSonido reproduccion={reproduccion} />
      <BotonDeEscucha reproduccion={reproduccion} />
      <Boton variante="primario" icono="pianoroll" onClick={() => navegar({ pantalla: 'pianoroll', id: pieza.id })}>
        Abrir en el piano roll
      </Boton>
      <Boton icono="descargar" sonido={null} disabled={exportando} onClick={() => void exportar()}>
        {exportando ? 'Exportando…' : 'Exportar MIDI'}
      </Boton>
      {fallo && (
        <p className="nota-al-pie" role="alert">
          No se ha podido exportar. Vuelve a intentarlo.
        </p>
      )}
      {confirmando ? (
        <div className="pila pila--junta repertorio__confirmar" role="group" aria-label="Borrar la pieza">
          <p>¿Borrar «{pieza.titulo}»? No se puede deshacer.</p>
          <div className="ajustes__fila">
            <Boton className="crece" sonido="atras" onClick={() => setConfirmando(false)}>
              No, dejarla
            </Boton>
            <Boton className="crece" variante="primario" icono="papelera" sonido="atras" onClick={alBorrar}>
              Sí, borrar
            </Boton>
          </div>
        </div>
      ) : (
        <Boton icono="papelera" sonido="cursor" onClick={() => setConfirmando(true)}>
          Borrar
        </Boton>
      )}
    </>
  )
}

/**
 * Mi repertorio: las piezas entregadas en los encargos y las empezadas aquí.
 * Cada una se escucha, se abre en el piano roll, se exporta a MIDI o se borra.
 */
export function Repertorio() {
  use(cargarProgreso())
  const indice = use(leerIndice())
  const repertorio = useProgreso((p) => p.repertorio)
  const [abierta, setAbierta] = useState<string>()
  const pieza = repertorio.find((p) => p.id === abierta)
  const tituloDeLeccion = (id: string | undefined): string | undefined =>
    id === undefined
      ? undefined
      : indice.mundos
          .flatMap((m) => m.unidades)
          .flatMap((u) => u.lecciones)
          .find((l) => l.id === id)?.titulo

  const borrar = (id: string): void => {
    setAbierta(undefined)
    void useProgreso.getState().borrarPieza(id)
  }

  return (
    <main className="pantalla">
      <Cabecera titulo="Mi repertorio" />
      <div className="pantalla__cuerpo pila pila--amplia">
        {repertorio.length === 0 ? (
          <div className="estado-vacio">
            <Icono nombre="repertorio" lado={48} className="repaso__icono" />
            <h2 className="titulo">Aún no tienes piezas</h2>
            <p>Aquí se guardan las piezas que entregas en los encargos de cada unidad y las que empiezas por tu cuenta en el piano roll.</p>
          </div>
        ) : (
          <Marco como="section" relleno="ninguno" rotulo={`${repertorio.length} ${repertorio.length === 1 ? 'pieza' : 'piezas'}`} aria-label="Tus piezas">
            <ul className="lecciones">
              {repertorio.map((p) => (
                <li key={p.id}>
                  <button type="button" className="leccion-enlace repertorio__pieza" onClick={() => setAbierta(p.id)}>
                    <Icono nombre={p.origen === undefined ? 'nota' : 'estrella'} />
                    <span className="leccion-enlace__texto">
                      <span className="leccion-enlace__titulo">{p.titulo}</span>
                      <span className="leccion-enlace__resumen">
                        {datosDe(p)}
                        {p.origen !== undefined && ' · encargo'}
                      </span>
                    </span>
                    <span className="leccion-enlace__duracion">{fechaCorta(p.modificada)}</span>
                    <Icono nombre="adelante" />
                  </button>
                </li>
              ))}
            </ul>
          </Marco>
        )}
      </div>
      <div className="pie">
        <Boton variante={repertorio.length === 0 ? 'primario' : 'secundario'} bloque icono="mas" onClick={() => navegar({ pantalla: 'pianoroll' })}>
          Pieza nueva
        </Boton>
      </div>

      <Ventana abierta={pieza !== undefined} alCerrar={() => setAbierta(undefined)} rotulo="Pieza" titulo={pieza?.titulo ?? ''}>
        {pieza && <Detalle key={pieza.id} pieza={pieza} origen={tituloDeLeccion(pieza.origen)} alBorrar={() => borrar(pieza.id)} />}
      </Ventana>
    </main>
  )
}
