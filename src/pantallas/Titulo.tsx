import { useState } from 'react'
import { useFicha } from '../app/progreso.ts'
import { navegar } from '../app/rutas.ts'
import { iniciarAudio, sonar } from '../audio/audio.ts'
import { useProgreso } from '../progreso/progreso.ts'
import { Boton } from '../ui/Boton.tsx'
import { Emblema } from '../ui/Emblema.tsx'
import { FichaDelJugador } from '../ui/FichaDelJugador.tsx'

function esperar(ms: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ms))
}

/**
 * Pantalla de título. Además de dar la bienvenida, su botón es el gesto que
 * el navegador exige para poder hacer sonar la app.
 */
export function Titulo() {
  const [entrando, setEntrando] = useState(false)
  const ficha = useFicha()
  // El título no espera a la base: la ficha aparece cuando se ha leído, y solo si ya hay algo hecho.
  const listo = useProgreso((p) => p.carga === 'listo')
  const conProgreso = listo && ficha.xp > 0
  // A quien empieza de cero se le ofrece saltarse lo que ya sabe.
  const sinLecciones = useProgreso((p) => Object.keys(p.lecciones).length === 0 && p.superadas.length === 0)
  const nuevo = listo && ficha.xp === 0 && sinLecciones

  const empezar = async (destino: 'mapa' | 'prueba' = 'mapa'): Promise<void> => {
    setEntrando(true)
    try {
      // Si el motor de audio tarda (conexión lenta), se entra igual: arrancará con el siguiente toque.
      await Promise.race([iniciarAudio(), esperar(4000)])
      sonar('inicio')
    } catch (error) {
      console.warn('El audio no ha podido arrancar', error)
    }
    navegar({ pantalla: destino })
  }

  return (
    <main className="pantalla titulo-pantalla">
      <div className="titulo-pantalla__cuerpo">
        <Emblema ancho={120} />
        <h1 className="titulo-pantalla__nombre">Leitmotiv</h1>
        <p className="titulo-pantalla__lema">Aprende a componer música de videojuegos.</p>
        {conProgreso && <FichaDelJugador ficha={ficha} className="titulo-pantalla__ficha" />}
      </div>
      <div className="pie">
        <Boton variante="primario" bloque sonido={null} disabled={entrando} onClick={() => void empezar()}>
          {entrando ? 'Preparando el sonido…' : 'Empezar'}
        </Boton>
        {nuevo && (
          <Boton bloque sonido={null} disabled={entrando} onClick={() => void empezar('prueba')}>
            Ya sé algo: prueba de nivel
          </Boton>
        )}
        <p className="suave titulo-pantalla__nota">El sonido se activa al entrar. Mejor con auriculares.</p>
      </div>
    </main>
  )
}
