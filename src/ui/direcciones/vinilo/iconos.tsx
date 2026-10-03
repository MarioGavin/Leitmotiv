/**
 * Iconos de la dirección «Vinilo»: formas macizas y geométricas sobre una
 * rejilla de 24 × 24, pensadas para verse junto a una tipografía condensada
 * y pesada. Sin trazos finos: todo es relleno.
 */
import type { ReactNode } from 'react'
import type { NombreDeIcono } from '../../iconos/nombres.ts'

const ASPA = 'M5 7.8L7.8 5 12 9.2 16.2 5 19 7.8 14.8 12 19 16.2 16.2 19 12 14.8 7.8 19 5 16.2 9.2 12z'
const ALTAVOZ = 'M3 9h4l6-5v16l-6-5H3z'

export const FORMAS: Readonly<Record<NombreDeIcono, ReactNode>> = {
  cursor: <path d="M7 4l12 8-12 8z" />,
  reproducir: <path d="M6 3l15 9-15 9z" />,
  pausa: <path d="M5 4h5v16H5zM14 4h5v16h-5z" />,
  detener: <path d="M5 5h14v14H5z" />,
  bucle: <path d="M3 6h13V3.5L21 8l-5 4.5V10H6v3H3zM21 18H8v2.5L3 16l5-4.5V14h10v-3h3z" />,
  escuchar: (
    <>
      <path d={ALTAVOZ} />
      <path d="M16 8h2.5v8H16zM20 5h2.5v14H20z" />
    </>
  ),
  silencio: (
    <>
      <path d={ALTAVOZ} />
      <path d="M15.2 10l1.8-1.8 2 2 2-2 1.8 1.8-2 2 2 2-1.8 1.8-2-2-2 2-1.8-1.8 2-2z" />
    </>
  ),
  pista: (
    <>
      <path d="M7.5 9a4.5 4.5 0 1 1 7.3 3.5c-.8.6-1.3 1.1-1.3 2V15h-3v-.8c0-2 1-3.1 2.2-4a1.5 1.5 0 1 0-2.2-1.2z" />
      <path d="M10.5 17h3v3h-3z" />
    </>
  ),
  cerrar: <path d={ASPA} />,
  atras: <path d="M15.5 3l3 3-6 6 6 6-3 3-9-9z" />,
  adelante: <path d="M8.5 3l-3 3 6 6-6 6 3 3 9-9z" />,
  candado: <path fillRule="evenodd" d="M7 10V8a5 5 0 0 1 10 0v2h3v11H4V10zm3 0h4V8a2 2 0 0 0-4 0z" />,
  acierto: <path d="M3.5 12.6l3-3 3.6 3.6 7.4-7.6 3 3L10.1 19z" />,
  fallo: <path d={ASPA} />,
  mapa: (
    <>
      <path
        fillRule="evenodd"
        d="M6 13a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM18 1a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"
      />
      <path d="M8.5 13.4l4.9-4.9 2.1 2.1-4.9 4.9z" />
    </>
  ),
  repaso: <path d="M5 2h14v4l-5 6 5 6v4H5v-4l5-6-5-6z" />,
  repertorio: (
    <>
      <path fillRule="evenodd" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 6.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z" />
      <circle cx="12" cy="12" r="1.3" />
    </>
  ),
  glosario: <path d="M2 4h7a2 2 0 0 1 2 2v15a2 2 0 0 0-2-1.5H2zM22 4h-7a2 2 0 0 0-2 2v15a2 2 0 0 1 2-1.5h7z" />,
  ajustes: <path d="M4 3h3v6h1.5v5H7v7H4v-7H2.5V9H4zM10.5 3h3v10H15v5h-1.5v3h-3v-3H9v-5h1.5zM17 3h3v2h1.5v5H20v11h-3V10h-1.5V5H17z" />,
  metronomo: (
    <>
      <path fillRule="evenodd" d="M8.5 2h7L20 22H4zm2.4 3L8 19h8L13.1 5z" />
      <path d="M11 17l5.5-12 2.3 1-5.3 12z" />
    </>
  ),
  lapiz: <path d="M3 21l1.2-5.6L15.6 4l4.4 4.4L8.6 19.8zM17 2.6l1.4-1.4a1.5 1.5 0 0 1 2 0l2.4 2.4a1.5 1.5 0 0 1 0 2L21.4 7z" />,
  goma: <path d="M14.5 3L21 9.5l-9 9H6L2.5 15zM3 20h18v2H3z" />,
  mas: <path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z" />,
  menos: <path d="M4 10h16v4H4z" />,
  descargar: <path d="M10 3h4v8h4.5L12 18l-6.5-7H10zM4 19.5h16V22H4z" />,
  nota: <path d="M10 3h9v4.5h-6V17a4 4 0 1 1-3-3.9z" />,
  estrella: <path d="M12 2l3 6.6 7 .8-5.2 4.9 1.4 7.2L12 17.9l-6.2 3.6 1.4-7.2L2 9.4l7-.8z" />,
  pianoroll: <path d="M2 4h8v4H2zM9 10h8v4H9zM5 16h7v4H5zM15 16h7v4h-7z" />,
}
