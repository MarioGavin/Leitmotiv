// Página de apoyo para `npm run audio:check`: expone el render offline del motor
// a Playwright. No forma parte de la app publicada.
import { aWav, renderizarPieza } from '../../src/audio/offline.ts'

function aBase64(bytes: ArrayBuffer): string {
  const u8 = new Uint8Array(bytes)
  let binario = ''
  for (let i = 0; i < u8.length; i += 0x8000) binario += String.fromCharCode(...u8.subarray(i, i + 0x8000))
  return btoa(binario)
}

window.renderizar = async (pieza, opciones) => aBase64(aWav(await renderizarPieza(pieza, opciones)))
