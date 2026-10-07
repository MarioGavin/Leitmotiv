import { use, useMemo, useState } from 'react'
import { useAjustes } from '../app/ajustes.ts'
import { leerFichas, leerGlosario } from '../app/contenido.ts'
import { escribirRuta } from '../app/rutas.ts'
import { useVentanas } from '../app/ventanas.ts'
import { sonar } from '../audio/audio.ts'
import { Cabecera } from '../ui/Cabecera.tsx'
import { Icono } from '../ui/Icono.tsx'
import { Marco } from '../ui/Marco.tsx'
import { paraBuscar, textoDeProsa } from '../ui/texto-de-prosa.ts'

/**
 * El glosario: las fichas de consulta rápida y todos los términos del curso,
 * de la A a la Z, con un buscador. Cada término abre su definición en una
 * ventana; cada ficha, su pantalla.
 */
export function Glosario() {
  const glosario = use(leerGlosario())
  const fichas = use(leerFichas())
  const nomenclatura = useAjustes((a) => a.nomenclatura)
  const abrir = useVentanas((v) => v.abrirGlosario)
  const [busqueda, setBusqueda] = useState('')

  const terminos = useMemo(
    () => glosario.map((t) => ({ ...t, texto: textoDeProsa(t.definicion, nomenclatura) })).sort((a, b) => a.termino.localeCompare(b.termino, 'es')),
    [glosario, nomenclatura],
  )
  const conResumen = useMemo(() => fichas.map((f) => ({ ...f, texto: textoDeProsa(f.resumen, nomenclatura) })), [fichas, nomenclatura])

  const buscado = paraBuscar(busqueda)
  const coincide = (...textos: string[]): boolean => buscado === '' || textos.some((t) => paraBuscar(t).includes(buscado))
  // Primero lo que coincide por el nombre; la definición solo se mira si se busca algo.
  const terminosVisibles = terminos.filter((t) => coincide(t.termino) || (buscado !== '' && coincide(t.texto)))
  const fichasVisibles = conResumen.filter((f) => coincide(f.titulo, f.texto))

  return (
    <main className="pantalla">
      <Cabecera titulo="Glosario" />
      <div className="pantalla__cuerpo pila pila--amplia">
        <label className="pila pila--junta glosario__buscador">
          <span className="etiqueta">Buscar</span>
          <input className="campo" type="search" value={busqueda} placeholder="Un término o una palabra de su definición" onChange={(e) => setBusqueda(e.target.value)} />
        </label>

        {fichasVisibles.length > 0 && (
          <Marco como="section" relleno="ninguno" rotulo="Fichas" aria-label="Fichas">
            <ul className="lecciones">
              {fichasVisibles.map((ficha) => (
                <li key={ficha.id}>
                  <a className="leccion-enlace glosario__fila" href={escribirRuta({ pantalla: 'ficha', id: ficha.id })} onClick={() => sonar('aceptar')}>
                    <Icono nombre="glosario" />
                    <span className="leccion-enlace__texto">
                      <span className="leccion-enlace__titulo">{ficha.titulo}</span>
                      <span className="leccion-enlace__resumen">{ficha.texto}</span>
                    </span>
                    <span />
                    <Icono nombre="adelante" />
                  </a>
                </li>
              ))}
            </ul>
          </Marco>
        )}

        <Marco como="section" relleno="ninguno" rotulo="Términos" aria-label="Términos">
          {terminosVisibles.length === 0 ? (
            <p className="unidad__vacia suave">{terminos.length === 0 ? 'Todavía no hay términos en el glosario.' : `Nada coincide con «${busqueda.trim()}».`}</p>
          ) : (
            <ul className="lecciones">
              {terminosVisibles.map((termino) => (
                <li key={termino.id}>
                  <button
                    type="button"
                    className="leccion-enlace glosario__fila"
                    onClick={() => {
                      sonar('aceptar')
                      abrir(termino.id)
                    }}
                  >
                    {termino.ejemplo ? <Icono nombre="escuchar" titulo="Con ejemplo sonoro" /> : <Icono nombre="nota" />}
                    <span className="leccion-enlace__texto">
                      <span className="leccion-enlace__titulo">{termino.termino}</span>
                      <span className="leccion-enlace__resumen glosario__definicion">{termino.texto}</span>
                    </span>
                    <span />
                    <Icono nombre="adelante" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Marco>
      </div>
    </main>
  )
}
