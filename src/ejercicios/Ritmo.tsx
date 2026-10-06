import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAjustes } from '../app/ajustes.ts'
import { navegar } from '../app/rutas.ts'
import { sonar } from '../audio/audio.ts'
import type { PasoRitmo } from '../contenido/tipos.ts'
import { type ResultadoDeRitmo, VENTANA_MS, planDeRitmo, puntuarRitmo } from '../musica/ritmo.ts'
import { segundosATicks } from '../musica/tiempo.ts'
import { Boton } from '../ui/Boton.tsx'
import { Dialogo } from '../ui/Dialogo.tsx'
import { Marco } from '../ui/Marco.tsx'
import { ProsaVista } from '../ui/ProsaVista.tsx'
import { PadDeToques } from '../ui/musica/PadDeToques.tsx'
import { RejillaDeRitmo } from '../ui/musica/RejillaDeRitmo.tsx'
import type { PropsDePaso } from './tipos.ts'
import { usePulsaciones } from './usePulsaciones.ts'

/** Intentos fallidos a partir de los cuales se deja seguir adelante sin haberlo superado. */
const INTENTOS_PARA_SEGUIR = 2

function mensajeDe(resultado: ResultadoDeRitmo, total: number): string {
  const sesgo = Math.round(Math.abs(resultado.sesgo))
  switch (resultado.diagnostico) {
    case 'bien':
      return resultado.aciertos === total ? `Los ${total} golpes, en su sitio.` : `${resultado.aciertos} de ${total} golpes en su sitio.`
    case 'adelantado':
      return `Vas por delante: tocas unos ${sesgo} ms antes de tiempo. No persigas el golpe; espera a que llegue.`
    case 'atrasado':
      return `Vas por detrás: tocas unos ${sesgo} ms tarde. Estás esperando a oír el golpe en vez de anticiparlo.`
    case 'irregular':
      return 'Los golpes bailan: unos llegan antes y otros después. Cuenta los pulsos en voz alta mientras tocas.'
    case 'faltan':
      return resultado.perdidos === 1 ? 'Te has dejado un golpe.' : `Te has dejado ${resultado.perdidos} golpes.`
    case 'sobran':
      return 'Has dado golpes de más. Toca solo donde lo pide el patrón.'
    case 'sin-toques':
      return 'No ha llegado ningún toque. Marca el ritmo en el botón grande.'
  }
}

/**
 * Ejercicio de ritmo: suena una cuenta previa y hay que marcar el patrón en el
 * botón grande. Al acabar se ve qué golpes han entrado, si se va por delante o
 * por detrás, y se puede repetir.
 */
export function Ritmo({ paso, alTerminar }: PropsDePaso<PasoRitmo>) {
  const latenciaMs = useAjustes((a) => a.latenciaMs)
  const plan = useMemo(() => planDeRitmo(paso), [paso])
  const [resultado, setResultado] = useState<ResultadoDeRitmo>()
  const [intentos, setIntentos] = useState(0)
  const [pistaVisible, setPistaVisible] = useState(false)
  const [momento, setMomento] = useState('')
  const respuesta = useRef<HTMLDivElement>(null)
  const turnos = useMemo(() => plan.tramos.filter((t) => t.tipo === 'toca'), [plan])

  const alAcabar = useCallback(
    (toques: number[]) => {
      // Solo cuentan los toques dados en el turno del usuario (con algo de margen por los bordes).
      const validos = toques.filter((t) => turnos.some((turno) => t >= turno.desde - 0.25 && t <= turno.hasta + 0.25))
      const nuevo = puntuarRitmo(
        plan.esperados.map((g) => g.t),
        validos,
        paso.tolerancia,
      )
      setResultado(nuevo)
      setIntentos((n) => n + 1)
      sonar(nuevo.aprobado ? 'acierto' : 'fallo')
    },
    [plan, turnos, paso.tolerancia],
  )
  const pulsaciones = usePulsaciones(plan, latenciaMs, alAcabar)
  const { transcurrido } = pulsaciones
  const sonando = pulsaciones.estado === 'sonando'

  // El rótulo grande dice qué toca hacer en cada momento: contar, escuchar o tocar.
  useEffect(() => {
    if (!sonando) return
    let cuadro = 0
    const mirar = (): void => {
      const t = transcurrido()
      if (t !== undefined) {
        const tramo = plan.tramos.find((x) => t < x.hasta) ?? plan.tramos.at(-1)
        let texto = ''
        if (t < 0) texto = 'Atento…'
        else if (tramo?.tipo === 'claqueta') texto = String(Math.min(Math.floor((t - tramo.desde) / plan.tiempo) + 1, Math.round((tramo.hasta - tramo.desde) / plan.tiempo)))
        else if (tramo?.tipo === 'escucha') texto = 'Escucha'
        else texto = '¡Toca!'
        setMomento(texto)
      }
      cuadro = requestAnimationFrame(mirar)
    }
    mirar()
    return () => cancelAnimationFrame(cuadro)
  }, [sonando, transcurrido, plan])

  useEffect(() => {
    if (resultado || pistaVisible) respuesta.current?.scrollIntoView({ block: 'nearest' })
  }, [resultado, pistaVisible])

  /** Posición dentro del patrón (en ticks) mientras toca el usuario o suena el ejemplo. */
  const posicion = useCallback(() => {
    const t = transcurrido()
    if (t === undefined) return undefined
    const tramo = plan.tramos.find((x) => t >= x.desde && t < x.hasta)
    if (!tramo || tramo.tipo === 'claqueta') return undefined
    return segundosATicks(t - tramo.desde, paso.tempo) % paso.duracion
  }, [transcurrido, plan, paso.tempo, paso.duracion])

  const empezar = (): void => {
    setResultado(undefined)
    setPistaVisible(false)
    setMomento('')
    pulsaciones.empezar()
  }

  const ocupado = pulsaciones.estado !== 'parado'
  const total = plan.esperados.length
  const porVuelta = paso.golpes.length
  const vueltas = Math.round(total / Math.max(1, porVuelta))
  const fallidos = resultado && !resultado.aprobado ? intentos : 0
  // En el modo de eco el patrón se saca de oído: solo se enseña al corregir.
  const oculto = paso.modo === 'eco' && !resultado

  return (
    <>
      <div className="pantalla__cuerpo pila">
        <div className="enunciado">
          <ProsaVista prosa={paso.enunciado} className="enunciado__texto" />
          <p className="etiqueta">
            {paso.tempo} BPM · {paso.compas[0]}/{paso.compas[1]}
            {paso.modo === 'eco' ? ' · Primero escuchas, luego repites' : paso.modo === 'leer' ? ' · El patrón no suena: léelo' : ''}
          </p>
        </div>
        <Marco variante="hundido" relleno="ajustado" plano>
          {resultado ? (
            <div className="pila pila--junta">
              {Array.from({ length: vueltas }, (_, v) => (
                <RejillaDeRitmo key={v} patron={paso} marcas={resultado.desviaciones.slice(v * porVuelta, (v + 1) * porVuelta)} holgura={VENTANA_MS[paso.tolerancia] / 2} {...(vueltas > 1 ? { rotulo: `Vuelta ${v + 1}` } : {})} />
              ))}
            </div>
          ) : (
            <RejillaDeRitmo patron={paso} oculto={oculto} posicion={posicion} sonando={sonando} />
          )}
        </Marco>
        <p className="ritmo__momento" aria-live="assertive">
          {sonando ? momento : pulsaciones.estado === 'cargando' ? 'Cargando…' : ''}
        </p>
        <PadDeToques activo={sonando} alTocar={pulsaciones.tocar}>
          Toca aquí
        </PadDeToques>
        {pulsaciones.aviso !== undefined && (
          <p className="nota-al-pie" role="alert">
            {pulsaciones.aviso}
          </p>
        )}
        <div className="respuesta" ref={respuesta}>
          {pistaVisible && !resultado && (
            <Dialogo tipo="pista" rotulo="Pista">
              <ProsaVista prosa={paso.pista} />
            </Dialogo>
          )}
          {resultado && (
            <Dialogo tipo={resultado.aprobado ? 'acierto' : 'fallo'} rotulo={resultado.aprobado ? 'Superado' : 'Todavía no'}>
              <div className="pila pila--junta">
                <p>
                  <strong>
                    {resultado.aciertos} de {total}
                  </strong>{' '}
                  · {mensajeDe(resultado, total)}
                </p>
                <ProsaVista prosa={paso.explicacion} />
                {!resultado.aprobado && Math.abs(resultado.sesgo) > 60 && (
                  <p className="suave nota-al-pie">
                    Si te pasa siempre lo mismo, puede ser el retardo del sonido de tu dispositivo.{' '}
                    <button type="button" className="termino" onClick={() => navegar({ pantalla: 'calibracion' })}>
                      Calibrarlo
                    </button>{' '}
                    lleva medio minuto.
                  </p>
                )}
              </div>
            </Dialogo>
          )}
        </div>
      </div>
      <div className="pie">
        <div className="pie__acciones">
          {ocupado ? (
            <Boton bloque icono="detener" sonido={null} onClick={pulsaciones.parar}>
              Parar
            </Boton>
          ) : resultado ? (
            <>
              <Boton icono="bucle" sonido={null} onClick={empezar}>
                Repetir
              </Boton>
              {(resultado.aprobado || fallidos >= INTENTOS_PARA_SEGUIR) && (
                // Superarlo a la primera cuenta entero; cada intento de más, menos. Seguir sin superarlo no cuenta.
                <Boton className="crece" variante="primario" onClick={() => alTerminar({ aciertos: resultado.aprobado ? 1 : 0, total: intentos })}>
                  {resultado.aprobado ? 'Continuar' : 'Seguir de todos modos'}
                </Boton>
              )}
            </>
          ) : (
            <>
              <Boton icono="pista" aria-expanded={pistaVisible} onClick={() => setPistaVisible(!pistaVisible)}>
                Pista
              </Boton>
              <Boton className="crece" variante="primario" icono="reproducir" sonido={null} onClick={empezar}>
                Empezar
              </Boton>
            </>
          )}
        </div>
      </div>
    </>
  )
}
