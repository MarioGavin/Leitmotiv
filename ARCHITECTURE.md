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
│  progreso/   base en el dispositivo (Dexie), repaso (FSRS), desbloqueo       │
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
| Progreso en el dispositivo | Dexie (IndexedDB) | 4.4 |
| Repaso espaciado | ts-fsrs | 5.4 |
| Exportar a MIDI | @tonejs/midi | 2.0 |
| Pentagrama | abcjs | 6.7 |
| Animación de entrada | Motion | 14 |
| Validación del contenido | zod | 4 |
| Pruebas | Vitest y Playwright | 5 y 1.56 |
| Estilo de código | oxlint | 1 |

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

Medido al cerrar el Tramo B:

| | gzip |
| --- | ---: |
| Carga inicial (React, Zustand, Tonal, carcasa, título, mapa, ajustes, almacén del progreso) | 101 KB |
| Pentagrama (abcjs), al abrirlo | 148 KB |
| Motor de audio (Tone.js y smplr), al quedar ociosa la app | 73 KB |
| Base del progreso (Dexie), la primera vez que se lee o se guarda | 32 KB |
| Entrada de pantalla (Motion con `LazyMotion`), al quedar ociosa la app | 26 KB |
| Ejercicios (`VistaDePaso`), al abrir una lección o un repaso | 13 KB |
| Exportar a MIDI (@tonejs/midi), al pedirlo | 9 KB |
| Repaso espaciado (ts-fsrs) y operaciones del progreso, al guardar | 7 KB |
| Cada pantalla, al abrirla | de 0,3 a 8 KB |
| Hojas de estilo | 10 KB |

Queda un 66 % de margen. El contenido no está en ningún trozo de JavaScript: son JSON que se piden cuando hacen falta (ver «Contenido»).

## Modelo musical (`src/musica`)

No depende del navegador: lo usan igual la app, el compilador de contenido y las pruebas.

- **Tiempo en ticks enteros**, 480 por negra (`tiempo.ts`). Tresillos y puntillos caen en números enteros; no hay errores de redondeo.
- **Pieza** (`pieza.ts`): el formato único de toda la música. Tempo, compás, tonalidad, compases, pistas con notas `{ t, d, n, v }` (inicio y duración en ticks, nota MIDI, velocidad), acordes marcados y secciones. Es JSON puro: lo mismo sirve para un ejemplo, un ejercicio, una pieza del usuario o la exportación a MIDI.
- **Notas y tonalidad** (`notas.ts`, `tonalidad.ts`): por dentro, notación científica y números MIDI (Do central = C4 = 60), que es lo que entiende Tonal. Do, Re, Mi es solo presentación. *Nunca se programa teoría a mano si Tonal lo resuelve*; donde Tonal es demasiado permisivo (acepta «5M» como intervalo, o «Gx» como grado) se valida encima.
- **Taquigrafía** (`taquigrafia.ts`): la forma compacta en que se escribe la música en el contenido. Solo se usa al compilar.
- **Comprobaciones** (`comprobaciones.ts`): las reglas que validan una pieza (registro, tonalidad, acordes, bucle, polifonía, secciones). Las usan el compilador y la corrección de encargos.
- **Instrumentos** (`instrumentos.ts`): el catálogo. Única fuente de verdad sobre qué instrumentos hay, su registro y el orden de las piezas de la batería en el piano roll.
- **Corrección de encargos** (`requisitos.ts`): una función pura `(pieza, requisitos) → una línea por requisito, cumplido o no, con lo que falta`. Una pista vacía no cumple ninguna regla que hable de ella.
- **Ejercicios**: `ritmo.ts` (el plan de lo que suena y cuándo, la puntuación de los toques y la calibración), `oido.ts` (los siete generadores de preguntas, con un azar inyectado), `construccion.ts` (la pieza con la opción puesta en el hueco y el texto de cada opción), `secciones.ts` (ordenar secciones), `acordes.ts` (en qué octava suena cada nota de un acorde).
- **Edición** (`edicion.ts`): poner, quitar, mover y estirar notas sin que se salgan de la pieza ni se pisen, e historial de deshacer. `plantilla.ts` da la pieza en blanco de una pieza nueva o de un encargo sin plantilla.
- **Salidas**: `midi.ts` (archivo MIDI de formato 1, 480 ticks por negra) y `abc.ts` (notación ABC para abcjs, con voces por pentagrama cuando hace falta).

## Contenido

Está descrito para quien escribe en CONTENT_GUIDE.md. Por dentro:

- `src/contenido/esquemas.ts`: esquemas zod de lo que se escribe (la fuente). No viaja al navegador.
- `src/contenido/tipos.ts`: tipos de lo compilado, que es lo que lee la app.
- `scripts/contenido/`: `curso.ts` recorre las carpetas y aplica las reglas de conjunto; `pasos.ts` compila cada tipo de paso; `pieza.ts` convierte la taquigrafía y llama a las comprobaciones; `prosa.ts` convierte el Markdown reducido en un árbol que la app pinta sin intérprete de Markdown; `contexto.ts` lleva la cuenta de errores y avisos con su ruta.
- Salida en `public/content/` (no se guarda en git): `indice.json` (el árbol del curso sin el contenido de las lecciones), un JSON por lección, `conceptos.json`, `glosario.json`, `fichas.json` y `prueba-de-nivel.json`. La app pide el índice al arrancar (3,4 KB comprimido) y lo demás cuando se abre la pantalla que lo usa (`src/app/contenido.ts`). El service worker lo guarda todo de antemano, así que sin conexión se abre igual.

## Progreso (`src/progreso`)

- **Base en el dispositivo** (`base.ts`): IndexedDB con Dexie, en un trozo aparte. Seis tablas: `lecciones` (completadas, veces y mejor resultado), `tarjetas` (una por concepto, con su estado de FSRS), `diario` (experiencia, lecciones y repasos de cada día), `repertorio` (las piezas del usuario), `borradores` (lo escrito a medias en un paso de componer, por `lección#paso`) y `datos` (las unidades dadas por sabidas en la prueba de nivel). Todo es JSON puro (`tipos.ts`).
- **Reglas, sin base de datos**: `operaciones.ts` dice qué registros cambian al completar una lección, un repaso o la prueba de nivel; `experiencia.ts` (20 puntos por lección nueva, 20 más si acaba en encargo, 5 por repetirla, 3 por repaso y 10 por unidad superada en la prueba), `racha.ts` (un día de descanso no la rompe), `desbloqueo.ts` (lecciones, unidades y mundos se abren en orden; lo dado por sabido cuenta como hecho), `ficha.ts` (nivel, experiencia y racha). Todo con pruebas en Node.
- **Repaso espaciado**: `repaso.ts` programa con ts-fsrs, sin variación al azar para que el mismo historial dé siempre las mismas fechas; `agenda.ts` solo lee las fechas, para que las pantallas sepan qué toca sin cargar la librería.
- **Almacén** (`progreso.ts`, Zustand, en la carga inicial): lo que hay en memoria y las acciones. La lectura empieza en `main.tsx`, antes de pintar; `src/app/progreso.ts` deja a las pantallas esperar con `use()` para no enseñar un candado que luego desaparece. Si el navegador no deja guardar, la app sigue con el progreso en memoria y lo avisa.
- **Copia de seguridad** (`copia.ts`, aparte): exporta progreso y ajustes a un JSON; al importar, cada registro se comprueba y se reconstruye con los campos conocidos, o el archivo se rechaza entero.

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

Sin parar la música se puede: cambiar las notas de una pista (`fijarNotas`, lo que usa el piano roll al editar), cambiar el instrumento, el tempo y el tono, silenciar pistas, hacer entrar y salir capas con fundido y saltar a una sección que se repite (los ejercicios de capas). El swing lo aplica el transporte de Tone.js a las corcheas de contratiempo (`swingSubdivision` en `8n`).

Dos defectos de Tone.js 15 que el reproductor esquiva (los dos se encontraron midiendo):

- **Ticks repetidos.** El reloj puede entregar dos veces un tick que cae justo en el borde entre dos ventanas de planificación (pasa a tempos «redondos» como 60 o 120). La nota sonaba doble, 6 dB más fuerte. Cada pista recuerda cuándo sonó cada nota y descarta la repetición.
- **Canal en mono.** `Channel` mezcla su entrada a mono antes de panear y se pierden 3 dB. Se crea con `channelCount: 2`.

### Muestras (`scripts/muestras`, `muestras.ts`)

- **Construcción** (`npm run samples:build`, a mano, no en CI): clona los repositorios de origen sin su contenido y pide solo los archivos necesarios; decodifica con ffmpeg; recorta; detecta la afinación (método de McLeod, y un barrido de Goertzel por encima de 1,5 kHz, donde el primero pierde precisión) y la corrige; hornea bucles con fundido cruzado en las cuerdas; iguala niveles; codifica.
- **Formato**: Ogg Opus mono a 48 kHz, entre 56 y 72 kbps. Chromium lo decodifica sin desfase inicial. El banco entero pesa 2 MB.
- **Descarga y caché**: cada instrumento se descarga la primera vez que suena y lo guarda la propia app en Cache Storage (no el service worker), así que funciona igual en desarrollo. Con el audio ya en marcha, el resto del banco se guarda en segundo plano, salvo que el usuario tenga activado el ahorro de datos.

### Niveles (`niveles.ts`)

Fijados midiendo: con el bus de música a +2 dB y el limitador a −1,5 dB, un ejemplo con melodía y acompañamiento queda entre −16 y −21 LUFS y el limitador solo actúa en picos. Cada papel de pista tiene su nivel de partida (melodía 0 dB … colchón −7 dB).

### Ritmo: toques contra el reloj de audio

Lo que suena se programa en el reloj del audio y los toques llegan con la hora de la página. `pulsacion.ts` toma una pareja de horas a la vez con `getOutputTimestamp` (que dice qué está saliendo por el altavoz) y pasa cada toque al reloj del audio; lo que quede de desfase (altavoz, Bluetooth, pantalla) lo resta el ajuste `latenciaMs`, que se mide en la pantalla de calibración (`calibrar` en `ritmo.ts`: la mediana de las desviaciones, con seis de cada diez toques y una dispersión de 60 ms como mucho). El motor da una sesión de ritmo (claqueta, cuenta previa y patrón) y `ejercicios/usePulsaciones.ts` la lleva desde React.

**El evento `leitmotiv:ritmo`.** Al empezar a sonar una sesión, `usePulsaciones.ts` emite en `document` un `CustomEvent('leitmotiv:ritmo', { detail: { instantes } })` con el instante, en el reloj de la página (`performance.now()`), en que cae cada golpe que el usuario tiene que tocar (en el modo de eco, solo los de su turno). La app no lo escucha: es para las pruebas de navegador, que con `tocarAlRitmo` (`e2e/ayudas.ts`) pulsan el pad justo en esos instantes, o con un retraso para simular latencia. Si se cambia su forma, hay que cambiar también esa ayuda.

### Verificación sin altavoces (`offline.ts`, `scripts/audio`)

`renderizarPieza` monta el mismo reproductor sobre un `OfflineAudioContext`. `npm run audio:check` abre un Chromium sin interfaz, renderiza una batería de casos y todos los ejemplos del contenido, y mide afinación, instante de inicio, niveles, sonoridad (EBU R128, con ffmpeg) y saturación. Lo que queda para el oído está en AUDIO_REVIEW.md.

## Interfaz (`src/app`, `src/pantallas`, `src/ejercicios`, `src/ui`)

- **Rutas en el fragmento** (`#/mapa`, `#/leccion/m00.u01.l02/3`), con un enrutador propio de sesenta líneas (`rutas.ts`). Funcionan en GitHub Pages sin configurar nada y sin conexión.
- **Estado**: Zustand para lo que cruza pantallas (ajustes, estado del audio, ventana del glosario); estado local de React para lo demás.
- **Ajustes en localStorage**, no en IndexedDB: hay que leerlos de forma síncrona antes de pintar para no dar un destello con otro tema (lo hace un script en `index.html`).
- **Contenido con `use()`**: las funciones de `contenido.ts` devuelven siempre la misma promesa por recurso, así que las pantallas la leen con `use()` dentro de un límite de suspense y otro de errores (`Limite.tsx`).
- **Una pantalla por archivo** en `pantallas/`; las pesadas se cargan con `lazy()`.
- **Ventanas y pantalla completa** (`app/ventanas.ts`): la definición de un término del glosario se abre desde cualquier pantalla, y el repaso y la prueba de nivel esconden la navegación mientras duran.
- **Entrada de pantalla con Motion** (`ui/movimiento/Entrada.tsx`): aparece y sube 6 px en 160 ms, con `LazyMotion` y `domAnimation`, en un trozo que se descarga cuando la app está ociosa. Con `prefers-reduced-motion`, sin movimiento.
- **Un componente por tipo de paso** en `ejercicios/`. `VistaDePaso.tsx` elige cuál pintar y `Leccion.tsx` le da la cabecera con el avance (`envoltorio`). Los pasos de componer (`Composicion.tsx`) solo la usan para el enunciado: mientras se edita, el piano roll ocupa la pantalla entera. Cada paso devuelve cuántas cosas acertó a la primera; la lección lo suma por concepto y, al acabar, llama a `completarLeccion`.
- **Reproducción desde React**: el gancho `useReproductor(pieza)` prepara el reproductor al primer «Escuchar», sigue su estado y lo libera al salir. Si la pieza cambia mientras suena (se edita, se elige otra opción), cambia las notas sin parar. El cabezal se mueve escribiendo en el estilo del elemento, sin pasar por React.
- **Piano roll** (`ui/musica/EditorDePiano.tsx` y `RolloDePiano.tsx`): lápiz y goma, arrastrar para mover, asa para estirar, deshacer, tres ampliaciones, reproducción en bucle mientras se edita, pentagrama y exportar a MIDI. La rejilla se recorre también con el teclado (flechas, Intro, Suprimir, más y menos, Alt con flechas). El piano roll suelto guarda en Mi repertorio 0,8 s después de cada cambio, al salir y al esconderse la app.
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
| Lógica musical, taquigrafía, validadores y corrección de encargos | Vitest | `src/musica/*.test.ts` |
| Progreso: experiencia, racha, desbloqueo, repaso, copia y base (con fake-indexeddb) | Vitest | `src/progreso/*.test.ts` |
| Compilador de contenido y contenido real | Vitest | `scripts/contenido/*.test.ts` |
| Proceso de muestras y créditos | Vitest | `scripts/muestras/*.test.ts` |
| Contraste AA de los dos esquemas | Vitest | `scripts/diseno/contraste.test.ts` |
| Rutas, iconos, mapa | Vitest | `src/app`, `src/ui` |
| Cada tipo de paso, cada pantalla, una lección completa, los tres encargos del Mundo 0, los ritmos de seguir, eco y leer, el contenido real paso a paso (a 360 × 640), PWA y sin conexión, audio, tamaño de los controles, tildes sin recortar | Playwright | `e2e/` (23 archivos) |
| Afinación, tiempos y niveles del audio | Chromium + ffmpeg | `npm run audio:check` |

## Pruebas de navegador: cómo están montadas

- Corren contra `dist/` (la versión de producción) con un Chromium que imita un Pixel 7. En local van de dos en dos procesos: con más, en Windows se agotan los tiempos.
- `sembrarProgreso` (`e2e/ayudas.ts`) escribe en IndexedDB antes de arrancar la app, con las mismas tablas que `base.ts`; `marcarHechas` escribe con la app abierta. Si cambia el esquema de la base, hay que cambiar también esas dos ayudas.
- `e2e/leccion-de-prueba.ts` compila con el compilador real pasos escritos en YAML y los sirve con `page.route`, para probar tipos de paso con contenido propio. Esas pruebas bloquean el service worker, que si no serviría la lección real.
- `escribirEnElRollo` escribe notas en el piano roll con el teclado, casilla a casilla, como lo haría quien no usa el dedo.
- Las pruebas de ritmo suenan de verdad y tocan con `tocarAlRitmo` (ver «El evento `leitmotiv:ritmo`»). Dependen de que el reloj de audio de la máquina vaya a tiempo real (ver HANDOFF.md).
