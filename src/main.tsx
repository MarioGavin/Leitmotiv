import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App.tsx'
import { cargarProgreso } from './progreso/progreso.ts'
import './ui/estilos/base.css'
import './ui/estilos/componentes.css'
import './ui/estilos/tema.css'
import './pantallas/pantallas.css'

const raiz = document.getElementById('raiz')
if (!raiz) throw new Error('Falta el elemento #raiz en index.html.')

// El progreso se empieza a leer antes de pintar nada: así ninguna pantalla lo pide en mitad de un render,
// y casi siempre está listo cuando se llega al mapa.
void cargarProgreso()

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
