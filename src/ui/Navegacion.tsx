import { sonar } from '../audio/audio.ts'
import { type Pantalla, escribirRuta } from '../app/rutas.ts'
import { Icono } from './Icono.tsx'
import { Marco } from './Marco.tsx'
import type { NombreDeIcono } from './iconos/nombres.ts'

type Destino = Extract<Pantalla, 'mapa' | 'repaso' | 'repertorio' | 'glosario' | 'ajustes'>

const DESTINOS: ReadonlyArray<{ pantalla: Destino; texto: string; icono: NombreDeIcono }> = [
  { pantalla: 'mapa', texto: 'Mapa', icono: 'mapa' },
  { pantalla: 'repaso', texto: 'Repaso', icono: 'repaso' },
  { pantalla: 'repertorio', texto: 'Repertorio', icono: 'repertorio' },
  { pantalla: 'glosario', texto: 'Glosario', icono: 'glosario' },
  { pantalla: 'ajustes', texto: 'Ajustes', icono: 'ajustes' },
]

interface Props {
  actual: Pantalla
}

/** Navegación principal: la ventana de comandos, siempre abajo y al alcance del pulgar. */
export function Navegacion({ actual }: Props) {
  return (
    <nav className="navegacion" aria-label="Secciones">
      <Marco como="ul" relleno="ninguno" className="navegacion__lista">
        {DESTINOS.map((destino) => (
          <li key={destino.pantalla}>
            <a
              className="navegacion__enlace"
              href={escribirRuta({ pantalla: destino.pantalla })}
              aria-current={destino.pantalla === actual ? 'page' : undefined}
              onClick={() => {
                if (destino.pantalla !== actual) sonar('cursor')
              }}
            >
              <Icono nombre={destino.icono} />
              <span>{destino.texto}</span>
            </a>
          </li>
        ))}
      </Marco>
    </nav>
  )
}
