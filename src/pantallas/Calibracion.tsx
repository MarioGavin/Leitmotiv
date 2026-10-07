import { useCallback, useMemo, useState } from 'react'
import { useAjustes } from '../app/ajustes.ts'
import type { PasoRitmo } from '../contenido/tipos.ts'
import { volver } from '../app/rutas.ts'
import { sonar } from '../audio/audio.ts'
import { useMomento, usePulsaciones } from '../ejercicios/usePulsaciones.ts'
import { type ResultadoDeCalibracion, calibrar, planDeRitmo } from '../musica/ritmo.ts'
import { PPQ, segundosATicks } from '../musica/tiempo.ts'
import { Boton } from '../ui/Boton.tsx'
import { Cabecera } from '../ui/Cabecera.tsx'
import { Dialogo } from '../ui/Dialogo.tsx'
import { Marco } from '../ui/Marco.tsx'
import { PadDeToques } from '../ui/musica/PadDeToques.tsx'
import { RejillaDeRitmo } from '../ui/musica/RejillaDeRitmo.tsx'

/** Un compás de cuenta previa y cuatro de tocar con la claqueta, una negra por golpe: dieciséis toques en unos quince segundos. */
const COMPASES = 4
const PATRON: Parameters<typeof planDeRitmo>[0] & Pick<PasoRitmo, 'paso'> = {
  modo: 'seguir',
  tempo: 90,
  compas: [4, 4],
  paso: PPQ,
  golpes: Array.from({ length: COMPASES * 4 }, (_, i) => i * PPQ),
  acentos: Array.from({ length: COMPASES * 4 }, () => false),
  duracion: COMPASES * 4 * PPQ,
  cuentaAtras: 1,
  repeticiones: 1,
  guia: 'claqueta',
}

function conSigno(ms: number): string {
  return `${ms > 0 ? '+' : ''}${ms} ms`
}

function textoDe(resultado: Exclude<ResultadoDeCalibracion, { tipo: 'medida' }>): string {
  if (resultado.tipo === 'pocos') {
    return resultado.toques === 0 ? 'No ha llegado ningún toque cerca de la claqueta. Toca el botón grande a la vez que cada clic.' : 'Han llegado pocos toques cerca de la claqueta. Toca en todos los clics, no solo en algunos.'
  }
  return 'Los toques van cada uno por su lado: unos antes del clic y otros después. Cuenta los clics en voz baja y vuelve a probar.'
}

/**
 * Calibración del retardo del sonido. Se toca con la claqueta y se mide cuánto
 * llegan tarde los toques: es lo que tarda el sonido en salir del altavoz (o de
 * unos auriculares) más lo que tarda la pantalla en dar el toque. Ese retardo
 * se resta luego a los toques de los ejercicios de ritmo.
 */
export function Calibracion() {
  const latenciaMs = useAjustes((a) => a.latenciaMs)
  const fijar = useAjustes((a) => a.fijar)
  const plan = useMemo(() => planDeRitmo(PATRON), [])
  const [resultado, setResultado] = useState<ResultadoDeCalibracion>()
  const [guardado, setGuardado] = useState(false)

  const alAcabar = useCallback(
    (toques: number[]) => {
      const nuevo = calibrar(
        plan.esperados.map((g) => g.t),
        toques,
      )
      setResultado(nuevo)
      sonar(nuevo.tipo === 'medida' ? 'acierto' : 'fallo')
    },
    [plan],
  )
  // Los toques se miden tal cual, sin restarles nada: el retardo es justo lo que se busca.
  const pulsaciones = usePulsaciones(plan, 0, alAcabar)
  const momento = useMomento(plan, pulsaciones)
  const { transcurrido } = pulsaciones
  const sonando = pulsaciones.estado === 'sonando'
  const ocupado = pulsaciones.estado !== 'parado'

  const posicion = useCallback(() => {
    const t = transcurrido()
    if (t === undefined) return undefined
    const tramo = plan.tramos.find((x) => t >= x.desde && t < x.hasta)
    if (!tramo || tramo.tipo !== 'toca') return undefined
    return segundosATicks(t - tramo.desde, PATRON.tempo)
  }, [transcurrido, plan])

  const empezar = (): void => {
    setResultado(undefined)
    setGuardado(false)
    pulsaciones.empezar()
  }

  const guardar = (valor: number): void => {
    fijar({ latenciaMs: valor })
    setGuardado(true)
  }

  const salir = (): void => {
    pulsaciones.parar()
    volver({ pantalla: 'ajustes' })
  }

  return (
    <main className="pantalla">
      <Cabecera titulo="Calibración" antes={<Boton variante="fantasma" soloIcono icono="atras" sonido="atras" aria-label="Salir de la calibración" onClick={salir} />} />
      <div className="pantalla__cuerpo pila">
        <Marco>
          <div className="pila pila--junta">
            <p>Tras cuatro clics de cuenta, toca el botón grande a la vez que la claqueta, durante cuatro compases.</p>
            <p className="suave nota-al-pie">Hazlo con lo que uses para practicar: si tocas con auriculares Bluetooth, con ellos puestos. Cada aparato tiene su retardo.</p>
          </div>
        </Marco>
        <dl className="datos calibracion__datos">
          <dt>Retardo guardado</dt>
          <dd>{conSigno(latenciaMs)}</dd>
        </dl>
        <Marco variante="hundido" relleno="ajustado" plano>
          <RejillaDeRitmo patron={PATRON} posicion={posicion} sonando={sonando} />
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
        <div className="respuesta">
          {resultado?.tipo === 'medida' && (
            <Dialogo tipo="acierto" rotulo={guardado ? 'Guardado' : 'Medido'}>
              <div className="pila pila--junta">
                <p>
                  Retardo: <strong className="dato">{conSigno(resultado.latenciaMs)}</strong>
                </p>
                <p className="suave nota-al-pie">
                  {guardado
                    ? 'A partir de ahora se resta a tus toques en los ejercicios de ritmo.'
                    : resultado.latenciaMs < 0
                      ? 'Tocas un poco antes de oír el clic: es normal, casi todo el mundo se adelanta. Al guardarlo, se tiene en cuenta.'
                      : `Medido con ${resultado.toques} toques. Guárdalo para que se reste a tus toques en los ejercicios de ritmo.`}
                </p>
              </div>
            </Dialogo>
          )}
          {resultado !== undefined && resultado.tipo !== 'medida' && (
            <Dialogo tipo="fallo" rotulo="Sin medida">
              <p>{textoDe(resultado)}</p>
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
          ) : resultado?.tipo === 'medida' && !guardado ? (
            <>
              <Boton icono="bucle" sonido={null} onClick={empezar}>
                Repetir
              </Boton>
              <Boton className="crece" variante="primario" onClick={() => guardar(resultado.latenciaMs)}>
                Guardar
              </Boton>
            </>
          ) : guardado ? (
            <>
              <Boton icono="bucle" sonido={null} onClick={empezar}>
                Repetir
              </Boton>
              <Boton className="crece" variante="primario" sonido="atras" onClick={salir}>
                Volver
              </Boton>
            </>
          ) : (
            <>
              {latenciaMs !== 0 && resultado === undefined && (
                <Boton onClick={() => fijar({ latenciaMs: 0 })}>Poner a cero</Boton>
              )}
              <Boton className="crece" variante="primario" icono="metronomo" sonido={null} onClick={empezar}>
                {resultado ? 'Volver a probar' : 'Empezar'}
              </Boton>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
