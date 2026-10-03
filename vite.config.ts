/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Ruta base de despliegue. En GitHub Pages de proyecto es `/<repo>/`;
 * el workflow de despliegue la pasa en BASE_PATH. En local es `/`.
 */
const base = normalizarBase(process.env.BASE_PATH)

function normalizarBase(valor: string | undefined): string {
  if (!valor || valor === '/') return '/'
  const limpio = valor.replace(/^\/+|\/+$/g, '')
  return `/${limpio}/`
}

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      // El usuario decide cuándo recargar: nunca en mitad de una lección.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg'],
      manifest: {
        id: base,
        name: 'Leitmotiv',
        short_name: 'Leitmotiv',
        description: 'Aprende a componer música de videojuegos, del pulso al flujo de trabajo profesional.',
        lang: 'es-ES',
        dir: 'ltr',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0c1226',
        theme_color: '#0c1226',
        categories: ['education', 'music'],
        icons: [
          { src: 'icons/icono-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icono-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Carcasa de la app, contenido compilado e índices de los instrumentos: todo disponible
        // sin conexión tras la primera carga. Las muestras de audio (.ogg) no entran aquí: las
        // descarga y las guarda la propia app en Cache Storage (src/audio/muestras.ts).
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,otf,json,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: false,
        skipWaiting: false,
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 700,
  },
  server: { host: true },
  preview: { host: true },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    globals: false,
  },
})
