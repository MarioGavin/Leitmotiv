/** Entrega un archivo al usuario: el navegador lo guarda en su carpeta de descargas. */
export function descargar(nombre: string, datos: Uint8Array | string, tipo: string): void {
  const blob = new Blob([datos as BlobPart], { type: tipo })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.append(enlace)
  enlace.click()
  enlace.remove()
  // El navegador necesita la dirección un momento después del clic; luego se suelta la memoria.
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
