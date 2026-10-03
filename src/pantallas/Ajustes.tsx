import { type DireccionVisual, type Esquema, useAjustes } from '../app/ajustes.ts'
import { navegar } from '../app/rutas.ts'
import type { Nomenclatura } from '../musica/notas.ts'
import { Boton } from '../ui/Boton.tsx'
import { Cabecera } from '../ui/Cabecera.tsx'
import { Conmutador } from '../ui/Conmutador.tsx'
import { Marco } from '../ui/Marco.tsx'

/** Ajustes de la app. En la Parada 1 incluye el cambio entre las dos direcciones visuales. */
export function Ajustes() {
  const { direccion, esquema, nomenclatura, sonidosDeInterfaz, fijar } = useAjustes()
  return (
    <main className="pantalla">
      <Cabecera titulo="Ajustes" />
      <div className="pantalla__cuerpo pila pila--amplia">
        <Marco como="section" rotulo="Aspecto" aria-label="Aspecto">
          <div className="pila">
            <div className="pila pila--junta">
              <span className="etiqueta">Dirección visual</span>
              <Conmutador<DireccionVisual>
                etiqueta="Dirección visual"
                valor={direccion}
                alCambiar={(valor) => fijar({ direccion: valor })}
                opciones={[
                  { valor: 'cartucho', texto: 'Cartucho' },
                  { valor: 'vinilo', texto: 'Vinilo' },
                ]}
              />
              <p className="suave nota-al-pie">Las dos direcciones conviven hasta que elijas una. Después solo quedará la elegida.</p>
            </div>
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
              <Conmutador<'si' | 'no'>
                etiqueta="Sonidos de la interfaz"
                valor={sonidosDeInterfaz ? 'si' : 'no'}
                alCambiar={(valor) => fijar({ sonidosDeInterfaz: valor === 'si' })}
                opciones={[
                  { valor: 'si', texto: 'Con sonido' },
                  { valor: 'no', texto: 'En silencio' },
                ]}
              />
            </div>
          </div>
        </Marco>

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
