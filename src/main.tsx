import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App.tsx'
import './ui/estilos/base.css'
import './ui/estilos/componentes.css'
import './ui/estilos/tema.css'
import './pantallas/pantallas.css'

const raiz = document.getElementById('raiz')
if (!raiz) throw new Error('Falta el elemento #raiz en index.html.')

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
