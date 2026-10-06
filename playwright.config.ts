import { defineConfig, devices } from '@playwright/test'

/**
 * Pruebas de extremo a extremo. Corren contra la versión de producción
 * (`npm run build` y luego `npm run e2e`), en un Chromium con las medidas y el
 * tacto de un móvil Android. Es la única manera de comprobar el service
 * worker, el modo sin conexión y la instalación.
 */
const PUERTO = 4173
// Con BASE_PATH (como en GitHub Pages) la app se compila y se sirve bajo esa ruta: las pruebas la siguen.
const base = (process.env.BASE_PATH ?? '').replace(/^\/+|\/+$/g, '')
const URL_BASE = `http://127.0.0.1:${PUERTO}/${base ? `${base}/` : ''}`

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  fullyParallel: true,
  // Con un navegador por núcleo, en Windows las pruebas se quedan sin tiempo: en local van de dos en dos.
  ...(process.env.CI ? {} : { workers: 2 }),
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: URL_BASE,
    locale: 'es-ES',
    trace: 'retain-on-failure',
    serviceWorkers: 'allow',
  },
  projects: [{ name: 'movil', use: { ...devices['Pixel 7'] } }],
  webServer: {
    command: `npm run preview -- --port ${PUERTO} --strictPort --host 127.0.0.1`,
    url: URL_BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
