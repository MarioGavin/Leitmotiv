import { useState } from 'react'
import { navegar } from '../app/rutas.ts'
import { NOMBRES_ROL, ROLES } from '../musica/pieza.ts'
import { Avance } from '../ui/Avance.tsx'
import { Boton } from '../ui/Boton.tsx'
import { Cabecera } from '../ui/Cabecera.tsx'
import { Deslizador } from '../ui/Deslizador.tsx'
import { Dialogo } from '../ui/Dialogo.tsx'
import { Icono } from '../ui/Icono.tsx'
import { Marco } from '../ui/Marco.tsx'
import { Opciones } from '../ui/Opciones.tsx'
import { NOMBRES_DE_ICONO } from '../ui/iconos/nombres.ts'

/**
 * Muestrario del sistema de diseño: todos los componentes en sus estados,
 * para juzgar una dirección visual de un vistazo. Lo describe DESIGN.md.
 */
export function Muestrario() {
  const [opcion, setOpcion] = useState<string | undefined>('3M')
  const [tempo, setTempo] = useState(96)
  const [paso, setPaso] = useState(3)
  return (
    <main className="pantalla">
      <Cabecera titulo="Muestrario" antes={<Boton variante="fantasma" soloIcono icono="atras" sonido="atras" aria-label="Volver a los ajustes" onClick={() => navegar({ pantalla: 'ajustes' })} />} />
      <div className="pantalla__cuerpo pila pila--amplia">
        <section className="pila" aria-label="Tipografía">
          <h2 className="titulo">El tema del héroe</h2>
          <h3 className="subtitulo">Un motivo de cuatro notas</h3>
          <p>
            Un leitmotiv es una idea musical breve que acompaña a un personaje, un lugar o una emoción, y que vuelve transformada cada vez que
            reaparecen.
          </p>
          <p className="fila">
            <span className="etiqueta">Tempo</span>
            <span className="dato">112 BPM</span>
            <span className="etiqueta">Compás</span>
            <span className="dato">4/4</span>
          </p>
        </section>

        <section className="pila" aria-label="Botones">
          <Boton variante="primario" bloque>
            Comprobar
          </Boton>
          <div className="fila">
            <Boton icono="reproducir">Escuchar</Boton>
            <Boton icono="pista">Pista</Boton>
          </div>
          <div className="fila">
            <Boton disabled>Desactivado</Boton>
            <Boton variante="fantasma">Saltar</Boton>
            <Boton soloIcono icono="bucle" aria-label="Repetir en bucle" />
          </div>
        </section>

        <Marco relleno="ninguno" rotulo="¿Qué intervalo suena?">
          <Opciones
            etiqueta="Respuestas"
            valor={opcion}
            alElegir={setOpcion}
            opciones={[
              { valor: '2M', contenido: '2.ª mayor' },
              { valor: '3M', contenido: '3.ª mayor' },
              { valor: '5P', contenido: '5.ª justa' },
              { valor: '8P', contenido: 'Octava justa' },
            ]}
          />
        </Marco>

        <Dialogo tipo="pista" rotulo="Pista">
          Canta la primera nota y sube por la escala hasta la segunda: cuenta cuántas notas has pisado.
        </Dialogo>
        <Dialogo tipo="acierto" rotulo="Correcto">
          Una 3.ª mayor: cuatro semitonos. Es el intervalo que hace que un acorde suene mayor.
        </Dialogo>
        <Dialogo tipo="fallo" rotulo="Casi">
          Era una 3.ª mayor y has marcado una 5.ª justa. La quinta suena más hueca y abierta.
        </Dialogo>

        <Marco rotulo="Controles">
          <div className="pila">
            <div className="fila">
              <Avance total={6} actual={paso} />
              <span className="cabecera__dato">{paso}/6</span>
            </div>
            <div className="fila">
              <Boton soloIcono icono="menos" aria-label="Paso anterior" onClick={() => setPaso((p) => Math.max(1, p - 1))} />
              <Boton soloIcono icono="mas" aria-label="Paso siguiente" onClick={() => setPaso((p) => Math.min(6, p + 1))} />
            </div>
            <Deslizador etiqueta="Tempo" valor={tempo} min={40} max={200} lectura={`${tempo} BPM`} alCambiar={setTempo} />
            <div className="transporte__pistas">
              {ROLES.map((rol, i) => (
                <button key={rol} type="button" className="pista-chip" aria-pressed={i !== 3} style={{ '--_color': `var(--pista-${rol})` } as React.CSSProperties}>
                  <span className="pista-chip__color" />
                  {NOMBRES_ROL[rol]}
                </button>
              ))}
            </div>
          </div>
        </Marco>

        <Marco rotulo="Iconos">
          <ul className="muestrario__iconos">
            {NOMBRES_DE_ICONO.map((nombre) => (
              <li key={nombre}>
                <Icono nombre={nombre} />
                <span className="etiqueta">{nombre}</span>
              </li>
            ))}
          </ul>
        </Marco>
      </div>
    </main>
  )
}
