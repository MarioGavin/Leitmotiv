import { type ReactNode, Suspense, lazy, useEffect, useLayoutEffect } from 'react'
import { fijarTimbreDeInterfaz, iniciarAudio, precargarAudio, silenciarInterfaz } from '../audio/audio.ts'
import { guardarSonidosEnSegundoPlano } from '../audio/muestras.ts'
import { Ajustes } from '../pantallas/Ajustes.tsx'
import { Mapa } from '../pantallas/Mapa.tsx'
import { Mundo } from '../pantallas/Mundo.tsx'
import { Proximamente } from '../pantallas/Proximamente.tsx'
import { Titulo } from '../pantallas/Titulo.tsx'
import { Boton } from '../ui/Boton.tsx'
import { Limite } from '../ui/Limite.tsx'
import { Navegacion } from '../ui/Navegacion.tsx'
import { VentanaDeGlosario } from '../ui/VentanaDeGlosario.tsx'
import { Avisos } from './Avisos.tsx'
import { useAjustes, useEsquemaResuelto } from './ajustes.ts'
import { useVentanas } from './ventanas.ts'
import { type Ruta, navegar, useRuta } from './rutas.ts'

// Las pantallas pesadas se descargan aparte, la primera vez que se abren.
const Leccion = lazy(() => import('../pantallas/Leccion.tsx').then((m) => ({ default: m.Leccion })))
const PianoRoll = lazy(() => import('../pantallas/PianoRoll.tsx').then((m) => ({ default: m.PianoRoll })))
const Diagnostico = lazy(() => import('../pantallas/Diagnostico.tsx').then((m) => ({ default: m.Diagnostico })))
const Repaso = lazy(() => import('../pantallas/Repaso.tsx').then((m) => ({ default: m.Repaso })))
const Calibracion = lazy(() => import('../pantallas/Calibracion.tsx').then((m) => ({ default: m.Calibracion })))
const Muestrario = lazy(() => import('../pantallas/Muestrario.tsx').then((m) => ({ default: m.Muestrario })))

/** Aplica al documento el esquema de color elegido, y a la interfaz sus sonidos. */
function useAspecto(): void {
  const sonidos = useAjustes((a) => a.sonidosDeInterfaz)
  const timbre = useAjustes((a) => a.timbre)
  const resuelto = useEsquemaResuelto()

  useLayoutEffect(() => {
    const raiz = document.documentElement
    raiz.dataset.esquema = resuelto
    // La barra del navegador y la de estado toman el color del fondo.
    const fondo = getComputedStyle(raiz).getPropertyValue('--fondo').trim()
    if (fondo) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', fondo)
  }, [resuelto])

  useEffect(() => fijarTimbreDeInterfaz(timbre), [timbre])
  useEffect(() => silenciarInterfaz(!sonidos), [sonidos])
}

/** El motor de audio se descarga cuando la app está ociosa y arranca con el primer toque, sea donde sea. */
function useArranqueDeAudio(): void {
  useEffect(() => {
    // En el primer plano de la app no hay prisa: se espera a que el navegador esté ocioso (o un momento, donde no existe esa API).
    const ocioso = (tarea: () => void): void => {
      if ('requestIdleCallback' in window) window.requestIdleCallback(tarea)
      else setTimeout(tarea, 1200)
    }
    ocioso(() => precargarAudio())
    const alTocar = (): void => {
      void iniciarAudio()
        // Con el audio en marcha, los instrumentos se van guardando para poder sonar sin conexión.
        .then(() => ocioso(() => void guardarSonidosEnSegundoPlano().catch((error: unknown) => console.warn('No se han podido guardar los sonidos', error))))
        .catch((error: unknown) => console.warn('El audio no ha podido arrancar', error))
    }
    window.addEventListener('pointerdown', alTocar, { once: true, capture: true })
    window.addEventListener('keydown', alTocar, { once: true, capture: true })
    return () => {
      window.removeEventListener('pointerdown', alTocar, { capture: true })
      window.removeEventListener('keydown', alTocar, { capture: true })
    }
  }, [])
}

function Cargando() {
  return (
    <main className="pantalla">
      <div className="pantalla__cuerpo estado-vacio">
        <p className="etiqueta" role="status">
          Cargando…
        </p>
      </div>
    </main>
  )
}

function pantallaDe(ruta: Ruta): { contenido: ReactNode; conNavegacion: boolean } {
  switch (ruta.pantalla) {
    case 'titulo':
      return { contenido: <Titulo />, conNavegacion: false }
    case 'mapa':
      return { contenido: <Mapa />, conNavegacion: true }
    case 'mundo':
      return { contenido: <Mundo id={ruta.id} />, conNavegacion: true }
    case 'leccion':
      return { contenido: <Leccion id={ruta.id} paso={ruta.paso} />, conNavegacion: false }
    case 'pianoroll':
      return { contenido: <PianoRoll />, conNavegacion: false }
    case 'repaso':
      return { contenido: <Repaso />, conNavegacion: true }
    case 'repertorio':
      return {
        contenido: (
          <Proximamente titulo="Mi repertorio" descripcion="Las piezas que compongas en los encargos, para escucharlas, seguir editándolas y exportarlas a MIDI.">
            <Boton variante="primario" bloque icono="pianoroll" onClick={() => navegar({ pantalla: 'pianoroll' })}>
              Abrir el piano roll de prueba
            </Boton>
          </Proximamente>
        ),
        conNavegacion: true,
      }
    case 'glosario':
      return {
        contenido: <Proximamente titulo="Glosario" descripcion="Todos los términos del curso y las fichas de consulta rápida, con su ejemplo sonoro." />,
        conNavegacion: true,
      }
    case 'ficha':
      return { contenido: <Proximamente titulo="Ficha" descripcion="Una ficha de consulta rápida, con su ejemplo sonoro." />, conNavegacion: true }
    case 'prueba':
      return { contenido: <Proximamente titulo="Prueba de nivel" descripcion="Unas preguntas para saltarte lo que ya sabes." />, conNavegacion: true }
    case 'calibracion':
      return { contenido: <Calibracion />, conNavegacion: false }
    case 'ajustes':
      return { contenido: <Ajustes />, conNavegacion: true }
    case 'diagnostico':
      return { contenido: <Diagnostico />, conNavegacion: false }
    case 'muestrario':
      return { contenido: <Muestrario />, conNavegacion: false }
  }
}

export function App() {
  const ruta = useRuta()
  useAspecto()
  useArranqueDeAudio()
  const pantallaCompleta = useVentanas((v) => v.pantallaCompleta)
  const { contenido, conNavegacion: conNavegacionDeRuta } = pantallaDe(ruta)
  const conNavegacion = conNavegacionDeRuta && !pantallaCompleta
  // La clave hace que cada pantalla empiece de cero (y que un error no se quede pegado al cambiar de pantalla).
  const clave = ruta.pantalla === 'leccion' || ruta.pantalla === 'mundo' ? `${ruta.pantalla}/${ruta.id}` : ruta.pantalla
  return (
    <div className="app">
      <Limite key={clave}>
        <Suspense fallback={<Cargando />}>{contenido}</Suspense>
      </Limite>
      {conNavegacion && <Navegacion actual={ruta.pantalla === 'mundo' ? 'mapa' : ruta.pantalla} />}
      <VentanaDeGlosario />
      <Avisos visible={conNavegacion} />
    </div>
  )
}
