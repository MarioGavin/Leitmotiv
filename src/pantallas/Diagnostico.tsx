import { useCallback, useEffect, useState } from 'react'
import { navegar } from '../app/rutas.ts'
import { diagnosticoDeAudio, iniciarAudio, sonar, tocarNotas } from '../audio/audio.ts'
import { useAudio } from '../audio/estado.ts'
import type { Diagnostico as DatosDeAudio, NotaSuelta } from '../audio/motor.ts'
import { type IndiceDeMuestras, descargarInstrumento, instrumentoDescargado, leerIndiceDeMuestras } from '../audio/muestras.ts'
import type { SonidoDeInterfaz } from '../audio/sonidos.ts'
import { IDS_INSTRUMENTOS, INSTRUMENTOS, type IdInstrumento, esIdInstrumento } from '../musica/instrumentos.ts'
import { Boton } from '../ui/Boton.tsx'
import { Cabecera } from '../ui/Cabecera.tsx'
import { Marco } from '../ui/Marco.tsx'

/** Lo que suena al probar cada instrumento: lo justo para oír su timbre y su registro. */
const PRUEBAS: Readonly<Record<IdInstrumento, readonly NotaSuelta[]>> = {
  piano: [
    { nota: 60, en: 0, duracion: 0.5 },
    { nota: 64, en: 0.25, duracion: 0.5 },
    { nota: 67, en: 0.5, duracion: 0.9 },
  ],
  cuerdas: [
    { nota: 57, en: 0, duracion: 1.4 },
    { nota: 62, en: 0, duracion: 1.4 },
    { nota: 66, en: 0, duracion: 1.4 },
  ],
  'bajo-electrico': [
    { nota: 40, en: 0, duracion: 0.4 },
    { nota: 45, en: 0.4, duracion: 0.6 },
  ],
  bateria: [
    { nota: 36, en: 0 },
    { nota: 42, en: 0.2 },
    { nota: 38, en: 0.4 },
    { nota: 42, en: 0.6 },
  ],
  'chip-pulso': [
    { nota: 72, en: 0, duracion: 0.15 },
    { nota: 76, en: 0.15, duracion: 0.15 },
    { nota: 79, en: 0.3, duracion: 0.3 },
  ],
  'chip-triangulo': [
    { nota: 48, en: 0, duracion: 0.3 },
    { nota: 55, en: 0.3, duracion: 0.4 },
  ],
}

const SONIDOS: ReadonlyArray<{ id: SonidoDeInterfaz; nombre: string }> = [
  { id: 'inicio', nombre: 'Inicio' },
  { id: 'cursor', nombre: 'Cursor' },
  { id: 'aceptar', nombre: 'Aceptar' },
  { id: 'atras', nombre: 'Atrás' },
  { id: 'acierto', nombre: 'Acierto' },
  { id: 'fallo', nombre: 'Fallo' },
  { id: 'completar', nombre: 'Completar' },
]

const ESTADOS: Readonly<Record<string, string>> = {
  apagado: 'Apagado: falta un toque para poder sonar',
  arrancando: 'Arrancando…',
  activo: 'En marcha',
  suspendido: 'Suspendido por el sistema: toca la pantalla para reanudarlo',
  error: 'No ha podido arrancar',
}

/** Tamaño legible: «640 KB», «2,0 MB». */
function tamano(bytes: number): string {
  const kb = bytes / 1024
  return kb < 1000 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1).replace('.', ',')} MB`
}

/** Por qué no se ha cargado un instrumento, dicho de forma que se sepa qué hacer. El detalle técnico va entre paréntesis. */
function falloDeCarga(detalle: string): string {
  return navigator.onLine ? `No se ha podido cargar (${detalle})` : 'No se ha podido cargar: hace falta conexión la primera vez'
}

/**
 * Diagnóstico de audio: en qué estado está el motor, qué latencia declara el
 * dispositivo y una prueba de cada instrumento. Sirve para comprobar en un
 * móvil concreto lo que no puede verificarse sin oír.
 */
export function Diagnostico() {
  const estado = useAudio((a) => a.estado)
  const error = useAudio((a) => a.error)
  const cargas = useAudio((a) => a.cargas)
  const [datos, setDatos] = useState<DatosDeAudio>()
  const [indice, setIndice] = useState<IndiceDeMuestras>()
  const [descargados, setDescargados] = useState<ReadonlySet<string>>(new Set())
  const [descarga, setDescarga] = useState<string>()

  // Los datos del motor se refrescan dos veces por segundo mientras la pantalla está abierta.
  useEffect(() => {
    let vivo = true
    const leer = (): void => {
      void diagnosticoDeAudio().then((d) => {
        if (vivo) setDatos(d)
      })
    }
    leer()
    const reloj = window.setInterval(leer, 500)
    return () => {
      vivo = false
      window.clearInterval(reloj)
    }
  }, [])

  const revisarDescargas = useCallback(async (lista: IndiceDeMuestras): Promise<void> => {
    const hechos = new Set<string>()
    for (const [id, datosDeInstrumento] of Object.entries(lista.instrumentos)) {
      if (await instrumentoDescargado(id, datosDeInstrumento.archivos)) hechos.add(id)
    }
    setDescargados(hechos)
  }, [])

  useEffect(() => {
    let vivo = true
    leerIndiceDeMuestras()
      .then((lista) => {
        if (!vivo) return
        setIndice(lista)
        return revisarDescargas(lista)
      })
      .catch((e: unknown) => console.warn('No se ha podido leer el índice de muestras', e))
    return () => {
      vivo = false
    }
  }, [revisarDescargas])

  const probar = (id: IdInstrumento): void => {
    void tocarNotas(id, PRUEBAS[id])
      .then(() => (indice ? revisarDescargas(indice) : undefined))
      .catch((e: unknown) => console.warn(`No se ha podido probar ${id}`, e))
  }

  const descargarTodo = async (): Promise<void> => {
    if (!indice) return
    try {
      for (const [id, datosDeInstrumento] of Object.entries(indice.instrumentos)) {
        await descargarInstrumento(id, datosDeInstrumento.archivos, (hechas, total) => setDescarga(`${esIdInstrumento(id) ? INSTRUMENTOS[id].nombre : id}: ${hechas} de ${total}`))
      }
      setDescarga(undefined)
    } catch (e) {
      setDescarga(`No se ha podido completar la descarga: ${e instanceof Error ? e.message : String(e)}`)
    }
    await revisarDescargas(indice)
  }

  const total = indice ? Object.values(indice.instrumentos).reduce((suma, i) => suma + i.bytes, 0) : 0
  const todoDescargado = indice !== undefined && Object.keys(indice.instrumentos).every((id) => descargados.has(id))

  return (
    <main className="pantalla">
      <Cabecera titulo="Diagnóstico" antes={<Boton variante="fantasma" soloIcono icono="atras" sonido="atras" aria-label="Volver a los ajustes" onClick={() => navegar({ pantalla: 'ajustes' })} />} />
      <div className="pantalla__cuerpo pila pila--amplia">
        <Marco como="section" rotulo="Motor de audio" aria-label="Motor de audio">
          <div className="pila">
            <p role="status">
              <strong>{ESTADOS[estado] ?? estado}</strong>
              {error !== undefined && <span className="suave"> ({error})</span>}
            </p>
            {estado !== 'activo' && (
              <Boton variante="primario" bloque sonido={null} onClick={() => void iniciarAudio().catch(() => undefined)}>
                Activar el sonido
              </Boton>
            )}
            {datos && (
              <dl className="datos">
                <dt>Frecuencia de muestreo</dt>
                <dd>{datos.frecuenciaDeMuestreo} Hz</dd>
                <dt>Latencia de procesado</dt>
                <dd>{datos.latenciaBaseMs} ms</dd>
                <dt>Latencia de salida declarada</dt>
                <dd>{datos.latenciaDeSalidaMs > 0 ? `${datos.latenciaDeSalidaMs} ms` : 'Sin dato'}</dd>
                <dt>Antelación al programar</dt>
                <dd>{datos.antelacionMs} ms</dd>
                <dt>Nivel de salida</dt>
                <dd>{Number.isFinite(datos.nivelDb) ? `${datos.nivelDb.toFixed(1)} dB` : 'Silencio'}</dd>
                <dt>Reloj de audio</dt>
                <dd>{datos.relojDeAudio.toFixed(1)} s</dd>
              </dl>
            )}
          </div>
        </Marco>

        <Marco como="section" relleno="ninguno" rotulo="Instrumentos" aria-label="Instrumentos">
          <ul className="lecciones">
            {IDS_INSTRUMENTOS.map((id) => {
              const instrumento = INSTRUMENTOS[id]
              const carga = cargas[id]
              const enDispositivo = instrumento.tipo === 'sinte' ? 'Sintetizado: no descarga nada' : descargados.has(id) ? 'Guardado en el dispositivo' : 'Se descarga al usarlo'
              return (
                <li key={id} className="instrumento-fila">
                  <span className="leccion-enlace__texto">
                    <span className="leccion-enlace__titulo">{instrumento.nombre}</span>
                    <span className="leccion-enlace__resumen">
                      {carga?.fase === 'cargando' ? `Cargando ${carga.cargadas} de ${carga.total}…` : carga?.fase === 'error' ? falloDeCarga(carga.mensaje) : enDispositivo}
                    </span>
                  </span>
                  <Boton icono="reproducir" sonido={null} aria-label={`Probar ${instrumento.nombre}`} onClick={() => probar(id)}>
                    Probar
                  </Boton>
                </li>
              )
            })}
          </ul>
        </Marco>

        <Marco como="section" rotulo="Sin conexión" aria-label="Sonidos sin conexión">
          <div className="pila">
            <p>
              Los instrumentos muestreados ocupan {indice ? tamano(total) : '…'} en total. Cada uno se guarda en el dispositivo la primera vez que suena; aquí
              puedes guardarlos todos de una vez.
            </p>
            {descarga !== undefined && <p role="status">{descarga}</p>}
            <Boton bloque icono="descargar" disabled={!indice || todoDescargado} onClick={() => void descargarTodo()}>
              {todoDescargado ? 'Todo guardado' : 'Guardar todos los sonidos'}
            </Boton>
          </div>
        </Marco>

        <Marco como="section" rotulo="Sonidos de interfaz" aria-label="Sonidos de interfaz">
          <div className="diagnostico__sonidos">
            {SONIDOS.map((s) => (
              <Boton key={s.id} sonido={null} onClick={() => sonar(s.id)}>
                {s.nombre}
              </Boton>
            ))}
          </div>
        </Marco>
      </div>
    </main>
  )
}
