import { useState } from 'react'
import { navegar } from '../app/rutas.ts'
import { iniciarAudio, sonar } from '../audio/audio.ts'
import { Boton } from '../ui/Boton.tsx'
import { Emblema } from '../ui/Emblema.tsx'

function esperar(ms: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ms))
}

/**
 * Pantalla de título. Además de dar la bienvenida, su botón es el gesto que
 * el navegador exige para poder hacer sonar la app.
 */
export function Titulo() {
  const [entrando, setEntrando] = useState(false)

  const empezar = async (): Promise<void> => {
    setEntrando(true)
    try {
      // Si el motor de audio tarda (conexión lenta), se entra igual: arrancará con el siguiente toque.
      await Promise.race([iniciarAudio(), esperar(4000)])
      sonar('inicio')
    } catch (error) {
      console.warn('El audio no ha podido arrancar', error)
    }
    navegar({ pantalla: 'mapa' })
  }

  return (
    <main className="pantalla titulo-pantalla">
      <div className="titulo-pantalla__cuerpo">
        <Emblema ancho={120} />
        <h1 className="titulo-pantalla__nombre">Leitmotiv</h1>
        <p className="titulo-pantalla__lema">Aprende a componer música de videojuegos.</p>
      </div>
      <div className="pie">
        <Boton variante="primario" bloque sonido={null} disabled={entrando} onClick={() => void empezar()}>
          {entrando ? 'Preparando el sonido…' : 'Empezar'}
        </Boton>
        <p className="suave titulo-pantalla__nota">El sonido se activa al entrar. Mejor con auriculares.</p>
      </div>
    </main>
  )
}
