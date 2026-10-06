# Arquitectura

Cómo está hecho Leitmotiv y por qué. Las decisiones cerradas del proyecto (PWA, sin servidor, sin IA dentro de la app, corrección por reglas…) están resumidas en CLAUDE.md; aquí se explica cómo se han llevado a código y qué se ha medido para decidir.

## Vista general

```
content/ (YAML)                         scripts/muestras  ──▶  public/samples (Ogg Opus)
     │                                                                │
     ▼  scripts/contenido (zod + Tonal)                               │
public/content (JSON)                                                 │
     │                                                                │
     ▼                                                                ▼
┌─────────────────────────────── la app (src/) ───────────────────────────────┐
│  app/        arranque, rutas, ajustes, lectura del contenido                 │
│  pantallas/  una por ruta                                                    │
│  ejercicios/ un componente por tipo de paso                                  │
│  ui/         componentes, tema, iconos, mapa y vistas de música              │
│  audio/      motor (Tone.js + smplr + Web Audio), reproductor, sonidos       │
│  musica/     tiempo, notas, tonalidad, pieza, taquigrafía, comprobaciones    │
│  contenido/  esquemas (fuente) y tipos (compilado)                           │
└──────────────────────────────────────────────────────────────────────────────┘
     │
     ▼  vite build + vite-plugin-pwa
dist/  ──▶  GitHub Pages
```

Tres ideas sostienen el resto:

1. **El contenido son datos.** Las lecciones se escriben en YAML y se compilan a JSON antes de publicar. La app no contiene ninguna lección en su código.
2. **Todo suena en vivo desde notas.** No hay audios grabados de los ejemplos: cada ejemplo es una pieza (notas en ticks) que el motor toca con instrumentos muestreados o sintetizados. Por eso se puede cambiar el tempo, transportar, silenciar pistas y editar.
3. **Lo que no se puede oír se mide.** El mismo motor que suena en el móvil se ejecuta sin altavoces para comprobar afinación, tiempos y niveles.

## Stack

| Para qué | Qué | Versión |
| --- | --- | --- |
| Compilación | Vite | 8 |
| Interfaz | React | 19 |
| Lenguaje | TypeScript estricto | 6.0 |
| PWA | vite-plugin-pwa (Workbox) | 1.3 |
| Transporte y planificación de audio | Tone.js | 15 |
| Instrumentos muestreados | smplr | 1.1 |
| Teoría musical | Tonal | 6.4.3 (fijada) |
| Estado de la interfaz | Zustand | 5 |
| Validación del contenido | zod | 4 |
| Pruebas | Vitest y Playwright | 5 y 1.56 |
| Estilo de código | oxlint | 1 |

Instaladas pero todavía sin usar (entran en el Tramo B): Dexie (progreso en IndexedDB), ts-fsrs (repaso espaciado), @tonejs/midi (exportar MIDI), abcjs (pentagrama) y Motion (animación).

### Decisiones de librerías, con lo que se midió

Antes de escribir código se montó un prototipo mínimo con cada librería en un Chromium sin interfaz. Tamaños en gzip.

- **smplr y no soundfont-player.** smplr acepta un banco propio descrito por regiones (notas, capas de velocidad, alternancias, grupos de corte), un almacén de descargas propio y un planificador sustituible, que es lo que hace posible el render sin altavoces. Pesa 9,9 KB. Se usa solo como reproductor: sus bancos alojados no se usan (ver CREDITS.md).
- **abcjs y no VexFlow para el pentagrama.** abcjs hace solo la maquetación y el salto de línea, admite cifrado y color de tinta, y pesa 163 KB en un trozo aparte. VexFlow pesa 95,5 KB más 247 KB de su fuente musical y obliga a maquetar a mano. El pentagrama es una vista de lectura secundaria (el piano roll es la principal), así que se carga solo cuando se pide.
- **FSRS (ts-fsrs) y no SM-2.** 7,2 KB; mejor programación con pocos repasos.
- **Tonal fijada en 6.4.3.** La 6.5.0 y sus subpaquetes publican un `main` y unos `types` que apuntan a archivos que no existen; no se puede importar desde Node.
- **TypeScript 6.0 y no 7.0.** La 7.0 se publicó el día antes de empezar; la plantilla oficial de Vite fija la 6.0.
- **oxlint y no ESLint.** Es lo que trae ahora la plantilla oficial de Vite con React.
- **Playwright fijado en 1.56.0** para que coincida con el Chromium ya instalado en el entorno de trabajo. Solo se prueba en Chromium.
- **Nada de librería de iconos ni de componentes.** El brief pide iconos propios y una estética concreta.

### Presupuesto de la carga inicial

Límite: 300 KB de JavaScript comprimido antes de pintar la primera pantalla, sin contar las muestras. `npm run size` lo mide sobre `dist/` y falla si se pasa.

| | gzip |
| --- | ---: |
| Carga inicial (React, Zustand, Tonal, carcasa, título, mapa, ajustes) | 94 KB |
| Motor de audio (Tone.js y smplr), al quedar ociosa la app | 71 KB |
| Lección, piano roll, diagnóstico y muestrario, al abrirlos | 2 a 3 KB cada uno |
| Hojas de estilo | 8 KB |

Queda un 69 % de margen. Lo que se añada en el Tramo B (Dexie 35 KB, ts-fsrs 7 KB, Motion con `LazyMotion` 34 KB, @tonejs/midi 10 KB) debe entrar como trozos aparte.

## Modelo musical (`src/musica`)

No depende del navegador: lo usan igual la app, el compilador de contenido y las pruebas.

- **Tiempo en ticks enteros**, 480 por negra (`tiempo.ts`). Tresillos y puntillos caen en números enteros; no hay errores de redondeo.
- **Pieza** (`pieza.ts`): el formato único de toda la música. Tempo, compás, tonalidad, compases, pistas con notas `{ t, d, n, v }` (inicio y duración en ticks, nota MIDI, velocidad), acordes marcados y secciones. Es JSON puro: lo mismo sirve para un ejemplo, un ejercicio, una pieza del usuario o la exportación a MIDI.
- **Notas y tonalidad** (`notas.ts`, `tonalidad.ts`): por dentro, notación científica y números MIDI (Do central = C4 = 60), que es lo que entiende Tonal. Do, Re, Mi es solo presentación. *Nunca se programa teoría a mano si Tonal lo resuelve*; donde Tonal es demasiado permisivo (acepta «5M» como intervalo, o «Gx» como grado) se valida encima.
- **Taquigrafía** (`taquigrafia.ts`): la forma compacta en que se escribe la música en el contenido. Solo se usa al compilar.
- **Comprobaciones** (`comprobaciones.ts`): las reglas que validan una pieza (registro, tonalidad, acordes, bucle, polifonía, secciones). Las usa el compilador y las usará la corrección de encargos.
- **Instrumentos** (`instrumentos.ts`): el catálogo. Única fuente de verdad sobre qué instrumentos hay y su registro.

## Contenido

Está descrito para quien escribe en CONTENT_GUIDE.md. Por dentro:

- `src/contenido/esquemas.ts`: esquemas zod de lo que se escribe (la fuente). No viaja al navegador.
- `src/contenido/tipos.ts`: tipos de lo compilado, que es lo que lee la app.
- `scripts/contenido/`: `curso.ts` recorre las carpetas y aplica las reglas de conjunto; `pasos.ts` compila cada tipo de paso; `pieza.ts` convierte la taquigrafía y llama a las comprobaciones; `prosa.ts` convierte el Markdown reducido en un árbol que la app pinta sin intérprete de Markdown; `contexto.ts` lleva la cuenta de errores y avisos con su ruta.
- Salida en `public/content/` (no se guarda en git): `indice.json` (el árbol del curso sin el contenido de las lecciones), un JSON por lección, `conceptos.json`, `glosario.json`, `fichas.json` y `prueba-de-nivel.json`. La app pide el índice al arrancar y cada lección cuando se abre (`src/app/contenido.ts`).

## Audio (`src/audio`)

### Un solo contexto para todo

`motor.ts` crea **un `AudioContext` nativo**, se lo da a Tone.js (`setContext`) y se lo pasa a smplr. Los nodos de smplr y los osciladores nativos se conectan a la entrada de nodos de Tone.js, que es un nodo nativo.

```
voces (smplr / osciladores) ─▶ canal de pista ─▶ bus de música (+2 dB) ─▶ limitador (−1,5 dB) ─┐
sonidos de interfaz (osciladores) ───────────▶ bus de interfaz (−8 dB) ───────────────────────┴─▶ salida
```

- **Arranque por gesto**: el contexto se crea en `iniciar()`, que solo se llama desde un toque (el botón «Empezar» o el primer toque en cualquier pantalla).
- **Suspensión**: al pasar a segundo plano se pausa el transporte y se suspende el contexto; al volver, o al siguiente toque, se reanuda. El estado (`apagado`, `arrancando`, `activo`, `suspendido`, `error`) vive en un almacén mínimo (`estado.ts`) que la interfaz lee sin cargar el motor.
- **Carga diferida**: `audio.ts` es la fachada que usa la interfaz; el motor se descarga con `import()` cuando la app queda ociosa.

### Voces (`voces.ts`)

Todas las voces tienen la misma interfaz: `tocar(nota, tiempo, duración, velocidad)`, `callar()` y `liberar()`.

- **Muestreadas** (piano, cuerdas, bajo, batería): smplr en modo *preset* con las muestras de `public/samples`. Un cargador por contexto comparte las muestras ya decodificadas.
- **De chip** (pulso y triangular) y **sonidos de interfaz**: osciladores nativos, uno nuevo por nota con su envolvente (`nativo.ts`). La onda de pulso es una `PeriodicWave` limitada en banda.

Los osciladores por nota sustituyeron a un sintetizador monofónico de Tone.js que fallaba al programar una nota para «ahora» habiendo otra programada para más tarde (dos toques rápidos). El fallo lo destapó una prueba de extremo a extremo: el sonido de acierto impedía que el toque siguiente llegara a su botón.

### Reproductor (`reproductor.ts`)

Programa una pieza sobre el transporte de Tone.js: una voz, un canal y un `Part` por pista, con los eventos en ticks. Solo hay un transporte, así que solo suena una pieza a la vez: preparar otra libera la anterior y avisa a quien la estuviera mostrando.

Dos defectos de Tone.js 15 que el reproductor esquiva (los dos se encontraron midiendo):

- **Ticks repetidos.** El reloj puede entregar dos veces un tick que cae justo en el borde entre dos ventanas de planificación (pasa a tempos «redondos» como 60 o 120). La nota sonaba doble, 6 dB más fuerte. Cada pista recuerda cuándo sonó cada nota y descarta la repetición.
- **Canal en mono.** `Channel` mezcla su entrada a mono antes de panear y se pierden 3 dB. Se crea con `channelCount: 2`.

### Muestras (`scripts/muestras`, `muestras.ts`)

- **Construcción** (`npm run samples:build`, a mano, no en CI): clona los repositorios de origen sin su contenido y pide solo los archivos necesarios; decodifica con ffmpeg; recorta; detecta la afinación (método de McLeod, y un barrido de Goertzel por encima de 1,5 kHz, donde el primero pierde precisión) y la corrige; hornea bucles con fundido cruzado en las cuerdas; iguala niveles; codifica.
- **Formato**: Ogg Opus mono a 48 kHz, entre 56 y 72 kbps. Chromium lo decodifica sin desfase inicial. El banco entero pesa 2 MB.
- **Descarga y caché**: cada instrumento se descarga la primera vez que suena y lo guarda la propia app en Cache Storage (no el service worker), así que funciona igual en desarrollo. Con el audio ya en marcha, el resto del banco se guarda en segundo plano, salvo que el usuario tenga activado el ahorro de datos.

### Niveles (`niveles.ts`)

Fijados midiendo: con el bus de música a +2 dB y el limitador a −1,5 dB, un ejemplo con melodía y acompañamiento queda entre −16 y −21 LUFS y el limitador solo actúa en picos. Cada papel de pista tiene su nivel de partida (melodía 0 dB … colchón −7 dB).

### Verificación sin altavoces (`offline.ts`, `scripts/audio`)

`renderizarPieza` monta el mismo reproductor sobre un `OfflineAudioContext`. `npm run audio:check` abre un Chromium sin interfaz, renderiza una batería de casos y todos los ejemplos del contenido, y mide afinación, instante de inicio, niveles, sonoridad (EBU R128, con ffmpeg) y saturación. Lo que queda para el oído está en AUDIO_REVIEW.md.

## Interfaz (`src/app`, `src/pantallas`, `src/ejercicios`, `src/ui`)

- **Rutas en el fragmento** (`#/mapa`, `#/leccion/m00.u01.l02/3`), con un enrutador propio de sesenta líneas (`rutas.ts`). Funcionan en GitHub Pages sin configurar nada y sin conexión.
- **Estado**: Zustand para lo que cruza pantallas (ajustes, estado del audio, ventana del glosario); estado local de React para lo demás.
- **Ajustes en localStorage**, no en IndexedDB: hay que leerlos de forma síncrona antes de pintar para no dar un destello con otro tema (lo hace un script en `index.html`).
- **Contenido con `use()`**: las funciones de `contenido.ts` devuelven siempre la misma promesa por recurso, así que las pantallas la leen con `use()` dentro de un límite de suspense y otro de errores (`Limite.tsx`).
- **Una pantalla por archivo** en `pantallas/`; las pesadas se cargan con `lazy()`.
- **Un componente por tipo de paso** en `ejercicios/`. `VistaDePaso.tsx` elige cuál pintar y `Leccion.tsx` le da la cabecera con el avance (`envoltorio`). Los pasos de componer (`Composicion.tsx`) solo la usan para el enunciado: mientras se edita, el piano roll ocupa la pantalla entera. Cada paso devuelve cuántas cosas acertó a la primera; la lección lo suma por concepto y, al acabar, llama a `completarLeccion`.
- **Reproducción desde React**: el gancho `useReproductor(pieza)` prepara el reproductor al primer «Escuchar», sigue su estado y lo libera al salir. El cabezal se mueve escribiendo en el estilo del elemento, sin pasar por React.
- **Un solo tema**, en claro y en oscuro: ver DESIGN.md.

## PWA y funcionamiento sin conexión

- `vite-plugin-pwa` genera el manifiesto y un service worker de Workbox que guarda de antemano la carcasa (HTML, JS, CSS, fuentes, iconos), todo el contenido compilado y los índices de los instrumentos.
- **Las actualizaciones no se aplican solas** (`registerType: 'prompt'`): cuando hay versión nueva, la app lo dice y el usuario decide cuándo recargar. Nunca dentro de una lección ni en el piano roll.
- Las muestras de audio van por su propia caché (ver arriba).
- En Android, instalar desde el menú de Chrome crea una app de verdad (WebAPK): icono propio, pantalla completa y sin barra de direcciones.

## Despliegue

- `.github/workflows/ci.yml`: en cada cambio, tipos, lint, validación del contenido, pruebas unitarias, compilación, presupuesto, pruebas en navegador (compilando bajo una subruta, como en Pages) y verificación de audio.
- `.github/workflows/deploy.yml`: en cada cambio de `main`, compila con la ruta base que indica GitHub Pages y publica.
- La ruta base llega por la variable `BASE_PATH` (`vite.config.ts`). Todas las rutas de la app son relativas a `import.meta.env.BASE_URL`.

## Pruebas

| Qué | Con qué | Dónde |
| --- | --- | --- |
| Lógica musical, taquigrafía y validadores | Vitest | `src/musica/*.test.ts` |
| Compilador de contenido y contenido real | Vitest | `scripts/contenido/*.test.ts` |
| Proceso de muestras y créditos | Vitest | `scripts/muestras/*.test.ts` |
| Contraste AA de los dos esquemas | Vitest | `scripts/diseno/contraste.test.ts` |
| Rutas, iconos, mapa | Vitest | `src/app`, `src/ui` |
| Arranque, lección completa, piano roll, PWA, sin conexión, audio, tamaño de los controles, tildes sin recortar | Playwright | `e2e/` |
| Afinación, tiempos y niveles del audio | Chromium + ffmpeg | `npm run audio:check` |

## Previsto para el Tramo B

Solo lo que condiciona la arquitectura; la lista de tareas está en HANDOFF.md.

- **Progreso en IndexedDB (Dexie)** con copia de seguridad en JSON: lecciones completadas, resultados por concepto, tarjetas de repaso (FSRS), piezas del repertorio. Los ajustes de localStorage se incluyen en la copia.
- **Corrección de encargos** con las reglas de `comprobaciones.ts` y los requisitos del contenido: una función pura `(pieza, requisitos) → lista de cumplido / no cumplido con explicación`.
- **Edición en vivo**: el reproductor necesita poder cambiar las notas de una pista sin parar (ahora, editar detiene la reproducción).
- **Ejercicios de ritmo**: medir el toque contra el reloj de audio y restar la latencia calibrada.
