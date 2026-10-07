import { use } from 'react'
import { leerFichas } from '../app/contenido.ts'
import { volver } from '../app/rutas.ts'
import { Boton } from '../ui/Boton.tsx'
import { Cabecera } from '../ui/Cabecera.tsx'
import { Marco } from '../ui/Marco.tsx'
import { ProsaVista } from '../ui/ProsaVista.tsx'
import { EjemploSuelto } from '../ui/musica/EjemploSuelto.tsx'

interface Props {
  id: string
}

/** Una ficha de consulta rápida: un resumen y unos bloques, cada uno con su ejemplo que suena. */
export function Ficha({ id }: Props) {
  const fichas = use(leerFichas())
  const ficha = fichas.find((f) => f.id === id)
  const atras = <Boton variante="fantasma" soloIcono icono="atras" sonido="atras" aria-label="Volver al glosario" onClick={() => volver({ pantalla: 'glosario' })} />

  if (!ficha) {
    return (
      <main className="pantalla">
        <Cabecera titulo="Ficha" antes={atras} />
        <div className="pantalla__cuerpo estado-vacio">
          <h2 className="titulo">Esta ficha no está</h2>
          <p>No se encuentra entre las fichas del curso. Vuelve al glosario y elige otra.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="pantalla">
      <Cabecera titulo={ficha.titulo} antes={atras} />
      <div className="pantalla__cuerpo pila pila--amplia">
        <ProsaVista prosa={ficha.resumen} className="ficha-de-consulta__resumen" />
        {ficha.bloques.map((bloque, i) => (
          <Marco key={i} como="section" rotulo={bloque.titulo} aria-label={bloque.titulo}>
            <div className="pila">
              <ProsaVista prosa={bloque.texto} />
              {bloque.ejemplo && <EjemploSuelto pieza={bloque.ejemplo} />}
            </div>
          </Marco>
        ))}
      </div>
    </main>
  )
}
