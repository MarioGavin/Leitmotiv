import { type ChangeEvent, useRef, useState } from 'react'
import { AJUSTES_INICIALES, type Esquema, type ValoresDeAjustes, useAjustes, valoresActuales } from '../app/ajustes.ts'
import { descargar } from '../app/descargas.ts'
import { navegar } from '../app/rutas.ts'
import { sonar } from '../audio/audio.ts'
import type { Nomenclatura } from '../musica/notas.ts'
import { useProgreso } from '../progreso/progreso.ts'
import { type DatosDeProgreso, PROGRESO_VACIO } from '../progreso/tipos.ts'
import { Boton } from '../ui/Boton.tsx'
import { Cabecera } from '../ui/Cabecera.tsx'
import { Conmutador } from '../ui/Conmutador.tsx'
import { Marco } from '../ui/Marco.tsx'
import { Ventana } from '../ui/Ventana.tsx'

/** Una copia leída y comprobada, a la espera de que el usuario confirme que quiere restaurarla. */
interface CopiaLeida {
  datos: DatosDeProgreso
  ajustes: ValoresDeAjustes
  creada: string
}

type Aviso = { tipo: 'hecho' | 'error'; texto: string }

function cuantas(n: number, una: string, varias: string): string {
  return `${n} ${n === 1 ? una : varias}`
}

function resumenDe(datos: DatosDeProgreso): string {
  return `${cuantas(Object.keys(datos.lecciones).length, 'lección hecha', 'lecciones hechas')} y ${cuantas(datos.repertorio.length, 'pieza', 'piezas')} en Mi repertorio`
}

function fechaLarga(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Lo que hay guardado ahora, sin las funciones del almacén. */
function progresoActual(): DatosDeProgreso {
  const { lecciones, tarjetas, diario, superadas, repertorio, borradores } = useProgreso.getState()
  return { lecciones, tarjetas, diario, superadas, repertorio, borradores }
}

/** Copia de seguridad (exportar e importar) y borrado de todo lo guardado. */
function TusDatos() {
  const archivo = useRef<HTMLInputElement>(null)
  const [aviso, setAviso] = useState<Aviso>()
  const [pendiente, setPendiente] = useState<CopiaLeida>()
  const [borrando, setBorrando] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const fijar = useAjustes((a) => a.fijar)
  const sinGuardar = useProgreso((p) => p.carga === 'sin-guardar')

  const exportar = async (): Promise<void> => {
    setOcupado(true)
    setAviso(undefined)
    try {
      await useProgreso.getState().cargar()
      // El lector de copias se descarga la primera vez que hace falta.
      const { crearCopia, nombreDeCopia } = await import('../progreso/copia.ts')
      const ahora = new Date()
      const datos = progresoActual()
      descargar(nombreDeCopia(ahora), JSON.stringify(crearCopia(datos, valoresActuales(), ahora)), 'application/json')
      setAviso({ tipo: 'hecho', texto: `Copia descargada: ${resumenDe(datos)}.` })
    } catch (error) {
      console.warn('No se ha podido exportar la copia', error)
      setAviso({ tipo: 'error', texto: 'No se ha podido preparar la copia. Vuelve a intentarlo.' })
      sonar('fallo')
    } finally {
      setOcupado(false)
    }
  }

  const alElegirArchivo = async (evento: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const elegido = evento.target.files?.[0]
    // Se vacía para que elegir otra vez el mismo archivo vuelva a avisar.
    evento.target.value = ''
    if (!elegido) return
    setAviso(undefined)
    try {
      const { ErrorDeCopia, leerCopia } = await import('../progreso/copia.ts')
      try {
        setPendiente(leerCopia(await elegido.text()))
      } catch (error) {
        if (!(error instanceof ErrorDeCopia)) throw error
        setAviso({ tipo: 'error', texto: error.message })
        sonar('fallo')
      }
    } catch (error) {
      console.warn('No se ha podido leer la copia', error)
      setAviso({ tipo: 'error', texto: 'No se ha podido leer el archivo. Vuelve a intentarlo.' })
      sonar('fallo')
    }
  }

  const restaurar = async (copia: CopiaLeida): Promise<void> => {
    setPendiente(undefined)
    await useProgreso.getState().restaurar(copia.datos)
    fijar(copia.ajustes)
    setAviso({ tipo: 'hecho', texto: `Copia restaurada: ${resumenDe(copia.datos)}.` })
  }

  const borrarTodo = async (): Promise<void> => {
    setBorrando(false)
    await useProgreso.getState().restaurar(PROGRESO_VACIO)
    fijar(AJUSTES_INICIALES)
    setAviso({ tipo: 'hecho', texto: 'Datos borrados. Empiezas de cero.' })
  }

  return (
    <Marco como="section" rotulo="Tus datos" aria-label="Tus datos">
      <div className="pila">
        <p className="suave nota-al-pie">Tu progreso y tus piezas se guardan solo en este dispositivo. Exporta una copia de vez en cuando para no perderlos, o para llevarlos a otro.</p>
        {sinGuardar && (
          <p className="nota-al-pie" role="alert">
            Este dispositivo no deja guardar el progreso: se perderá al cerrar la app. Exporta una copia antes.
          </p>
        )}
        <div className="ajustes__fila">
          <Boton className="crece" icono="descargar" sonido={null} disabled={ocupado} onClick={() => void exportar()}>
            Exportar copia
          </Boton>
          <Boton className="crece" icono="cargar" onClick={() => archivo.current?.click()}>
            Importar copia
          </Boton>
        </div>
        <input ref={archivo} type="file" accept="application/json,.json" hidden aria-label="Archivo de la copia de seguridad" onChange={(e) => void alElegirArchivo(e)} />
        <Boton bloque icono="papelera" sonido="atras" onClick={() => setBorrando(true)}>
          Borrar todos los datos
        </Boton>
        {aviso && (
          <p className="nota-al-pie" role={aviso.tipo === 'error' ? 'alert' : 'status'}>
            {aviso.texto}
          </p>
        )}
      </div>

      <Ventana abierta={pendiente !== undefined} alCerrar={() => setPendiente(undefined)} rotulo="Restaurar copia" titulo="¿Restaurar esta copia?" cerrar="Cancelar">
        {pendiente && (
          <>
            <p>
              Copia del {fechaLarga(pendiente.creada)}: {resumenDe(pendiente.datos)}.
            </p>
            <p className="suave">Sustituye todo lo que hay ahora en este dispositivo, ajustes incluidos.</p>
            <Boton variante="primario" bloque icono="cargar" onClick={() => void restaurar(pendiente)}>
              Restaurar
            </Boton>
          </>
        )}
      </Ventana>

      <Ventana abierta={borrando} alCerrar={() => setBorrando(false)} rotulo="Borrar datos" titulo="¿Borrar todo?" cerrar="Cancelar">
        <p>Se borran las lecciones hechas, el repaso, la experiencia, la racha y Mi repertorio, y los ajustes vuelven a los de fábrica.</p>
        <p className="suave">No se puede deshacer. Si quieres conservar algo, exporta antes una copia.</p>
        <Boton variante="primario" bloque icono="papelera" sonido="atras" onClick={() => void borrarTodo()}>
          Borrar todo
        </Boton>
      </Ventana>
    </Marco>
  )
}

function conSigno(ms: number): string {
  return `${ms > 0 ? '+' : ''}${ms} ms`
}

/** Ajustes de la app: aspecto, música, sonidos de la interfaz, retardo y datos guardados. */
export function Ajustes() {
  const { esquema, nomenclatura, sonidosDeInterfaz, timbre, latenciaMs, fijar } = useAjustes()
  return (
    <main className="pantalla">
      <Cabecera titulo="Ajustes" />
      <div className="pantalla__cuerpo pila pila--amplia">
        <Marco como="section" rotulo="Aspecto" aria-label="Aspecto">
          <div className="pila">
            <div className="pila pila--junta">
              <span className="etiqueta">Esquema de color</span>
              <Conmutador<Esquema>
                etiqueta="Esquema de color"
                valor={esquema}
                alCambiar={(valor) => fijar({ esquema: valor })}
                opciones={[
                  { valor: 'sistema', texto: 'Sistema' },
                  { valor: 'oscuro', texto: 'Oscuro' },
                  { valor: 'claro', texto: 'Claro' },
                ]}
              />
            </div>
          </div>
        </Marco>

        <Marco como="section" rotulo="Música" aria-label="Música">
          <div className="pila">
            <div className="pila pila--junta">
              <span className="etiqueta">Nombres de las notas</span>
              <Conmutador<Nomenclatura>
                etiqueta="Nombres de las notas"
                valor={nomenclatura}
                alCambiar={(valor) => fijar({ nomenclatura: valor })}
                opciones={[
                  { valor: 'latina', texto: 'Do Re Mi' },
                  { valor: 'anglosajona', texto: 'C D E' },
                ]}
              />
              <p className="suave nota-al-pie">Los acordes se escriben siempre en cifrado americano (Cmaj7), como en cualquier DAW.</p>
            </div>
            <div className="pila pila--junta">
              <span className="etiqueta">Sonidos de la interfaz</span>
              <Conmutador<'chip' | 'campana' | 'silencio'>
                etiqueta="Sonidos de la interfaz"
                valor={sonidosDeInterfaz ? timbre : 'silencio'}
                alCambiar={(valor) => {
                  if (valor === 'silencio') fijar({ sonidosDeInterfaz: false })
                  else fijar({ sonidosDeInterfaz: true, timbre: valor })
                  // El timbre nuevo se oye al elegirlo: el del propio conmutador suena antes de que cambie.
                  if (valor !== 'silencio') window.setTimeout(() => sonar('aceptar'), 60)
                }}
                opciones={[
                  { valor: 'chip', texto: 'Chip' },
                  { valor: 'campana', texto: 'Campana' },
                  { valor: 'silencio', texto: 'Silencio' },
                ]}
              />
            </div>
            <div className="pila pila--junta">
              <span className="etiqueta">Retardo del sonido</span>
              <div className="ajustes__fila">
                <span className="dato crece ajustes__latencia">{conSigno(latenciaMs)}</span>
                <Boton icono="metronomo" onClick={() => navegar({ pantalla: 'calibracion' })}>
                  Calibrar
                </Boton>
              </div>
              <p className="suave nota-al-pie">Se resta a tus toques en los ejercicios de ritmo. Calíbralo con lo que uses para practicar: el altavoz o tus auriculares.</p>
            </div>
          </div>
        </Marco>

        <TusDatos />

        <div className="pila">
          <Boton bloque icono="escuchar" onClick={() => navegar({ pantalla: 'diagnostico' })}>
            Diagnóstico de audio
          </Boton>
          <Boton bloque icono="pianoroll" onClick={() => navegar({ pantalla: 'muestrario' })}>
            Muestrario de diseño
          </Boton>
        </div>
      </div>
    </main>
  )
}
