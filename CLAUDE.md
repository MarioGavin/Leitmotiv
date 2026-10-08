# Leitmotiv

PWA para aprender a componer música de videojuegos desde el móvil. La usa una sola persona, Mario, que es también quien la encarga.

**Lee primero [HANDOFF.md](HANDOFF.md)**: dice en qué punto está el proyecto, qué falta, qué falla y qué no se ha comprobado. Este archivo recoge lo que no cambia: cómo se trabaja, qué está decidido y cómo está escrito el código.

## Cómo se trabaja

- **Todo en español de España**: interfaz, contenido, documentos, nombres del código, comentarios y la conversación con Mario.
- **Los mensajes de commit, en inglés**, impersonales y profesionales: sin nombrar a Mario ni hablar en primera persona. Se conserva la etiqueta del paso: `test: cover Mundo 0 commissions end to end (B8-1)`.
- **Por fases, con paradas.** Fase 1: cimientos, los siete tipos de ejercicio, el Mundo 0 entero y dos lecciones del Mundo 1. Fase 2: el contenido del resto de los mundos, en otra sesión y con varios agentes. Después, una fase 3. Las fases se parten en tramos. Al final de cada tramo, un commit; en cada parada se enseña el resultado y se espera a Mario. No se sigue sin su visto bueno.
- **Al cerrar un tramo o una fase**: informe con tres listas (hecho, no hecho, no comprobado) y HANDOFF.md al día.
- **No puedes oír.** Nunca afirmes que algo «suena bien». Lo que se puede medir se mide (`npm run audio:check`); lo que hay que juzgar de oído se apunta en AUDIO_REVIEW.md para que lo escuche Mario.
- **No inventes API.** Antes de usar una librería, consulta su documentación actual o su código en `node_modules`, y ejecuta lo que afirmes.
- **Licencias y autores, del origen.** No se dan de memoria: se leen en el repositorio o el paquete y se anotan en CREDITS.md.
- **Lo no comprobado se dice.** Nada se da por hecho sin haberlo ejecutado.
- El encargo original de Mario está copiado tal cual en [docs/ENCARGO.md](docs/ENCARGO.md). Lo que sigue lo resume y, donde se ha decidido otra cosa después (el nombre, abcjs, el diseño), manda este archivo. El alcance exacto de las fases 2 y 3 está en el encargo. Según el encargo, la Fase 2 escribe el contenido de los Mundos 1 a 7 (un agente por unidad, con dos revisores por unidad, uno musical y otro de pedagogía y castellano, y un crítico final del plan) y la Fase 3, los Mundos 8 a 10 y el proyecto final, el pulido, el rendimiento y las pruebas en el móvil.
- **El mapa de unidades** de todos los mundos está en [PLAN_DE_ESTUDIOS.md](PLAN_DE_ESTUDIOS.md): cada unidad de la Fase 2 se escribe a partir de su ficha, una vez que Mario lo haya aprobado.

## Decisiones cerradas

No se reabren. Si alguna estorba, se le plantea a Mario antes de tocar nada.

### Producto

- PWA, móvil primero (Android con Chrome), instalable y con funcionamiento sin conexión tras la primera carga.
- Progreso solo en el dispositivo (IndexedDB), con exportar e importar en JSON. Sin servidor y sin cuentas.
- Sin IA dentro de la app. La corrección es por reglas.
- Sonido: instrumentos muestreados de licencia libre (solo dominio público, CC0 o CC-BY) y sintetizadores para lo retro. Todo alojado en la propia app: nada se pide a servidores de terceros.
- Despliegue en GitHub Pages con GitHub Actions.
- Nombre: Leitmotiv.
- Se escribe en piano roll. El pentagrama es una vista de lectura secundaria.
- Carga inicial por debajo de 300 KB de JavaScript comprimido, sin contar las muestras.
- El audio arranca solo tras un gesto del usuario, sobrevive a la suspensión del contexto y tiene latencia calibrable.

### Contenido y pedagogía

- El contenido son datos tipados en `content/`. Añadir una lección no exige tocar código. Los esquemas (Mundo > Unidad > Lección > Paso, y cada tipo de ejercicio) están en CONTENT_GUIDE.md y se validan con zod en la CI.
- **Toda la música es original.** No se transcriben ni reproducen melodías, progresiones identificables ni letras de obras con derechos. Las obras se pueden nombrar para que el usuario las escuche por su cuenta, y se analizan por sus técnicas.
- Siete tipos de ejercicio: oído, ritmo (con tolerancia y latencia calibrable), construcción guiada, piano roll táctil multipista con exportación a MIDI, análisis, mezcla por capas y encargos de compositor validados. Todos tienen pista, explicación del fallo y repetición.
- Sesiones de cinco a diez minutos. Teoría mínima, siempre con un ejemplo que suena y se puede manipular.
- Repaso espaciado (FSRS), prueba de nivel, glosario y fichas.
- Cada unidad termina en un encargo; la pieza resultante va a «Mi repertorio». Mínimo, ocho lecciones por unidad.
- Plan de estudios: Mundos 0 a 10 y un proyecto final. Están en `content/mundos/`, cada uno con su descripción.
- Quien aprende sabe solfeo básico y algo de guitarra y piano. Le interesan el JRPG orquestal clásico, el jazz, funk y pop de los RPG urbanos modernos, lo retro de 8 y 16 bits y la música épica de combate.

### Interfaz

- Parece el menú de un RPG de consola portátil: paneles con marco, cursor de selección, tipografía con carácter, transiciones cortas, sonidos de interfaz propios (y la opción de silenciarlos) y un mapa del mundo.
- **Prohibido**: degradados morado-azul, vidrio esmerilado, tarjetas redondeadas genéricas con sombra suave, emojis como iconos, Inter o Space Grotesk, todo centrado y cabeceras gigantes. Los iconos son propios, en SVG.
- Gamificación sobria.
- Accesibilidad: controles táctiles de 44 px o más, uso con una mano, contraste AA, `prefers-reduced-motion`, esquemas claro y oscuro.
- El sistema está en DESIGN.md. De las dos direcciones que se le presentaron, Mario eligió una mezcla: colores, marcos de píxeles, iconos y mapa de «Cartucho», con la tipografía de «Vinilo» y su recuadro verde o rojo al corregir. El mapa del mundo se ve siempre de día.

### Técnicas

| Para qué | Qué | Nota |
| --- | --- | --- |
| Compilación e interfaz | Vite 8, React 19, TypeScript 6.0 estricto | TypeScript se queda en la 6.0 |
| PWA | vite-plugin-pwa (Workbox) | Las actualizaciones las acepta el usuario; nunca se recarga sola |
| Audio | Tone.js 15 (transporte), smplr 1.1 (muestras), Web Audio nativo (sintetizados) | Un solo `AudioContext` para todo |
| Teoría musical | Tonal, **fijada en 6.4.3** | La 6.5.0 no se puede importar desde Node |
| Estado | Zustand; ajustes en localStorage | El progreso, en IndexedDB con Dexie (`src/progreso/`), en un trozo aparte |
| Repaso espaciado | ts-fsrs | En un trozo aparte; `agenda.ts` lee las fechas sin cargarla |
| Pentagrama | abcjs, en un trozo aparte | VexFlow se descartó por peso |
| MIDI | @tonejs/midi | Se carga al exportar |
| Animación | Motion | Con `LazyMotion`, en un trozo aparte |
| Contenido | YAML, zod 4 | |
| Pruebas | Vitest 5 y Playwright **1.56.0 (fijada)** | Solo Chromium |
| Estilo de código | oxlint | |

Motion solo mueve la entrada de las pantallas (`src/ui/movimiento/Entrada.tsx`), en un trozo que se descarga cuando la app está ociosa. Las razones de cada elección están en ARCHITECTURE.md. Además:

- Rutas en el fragmento de la URL (`#/mapa`), con enrutador propio. Sin librería de rutas.
- Sin librería de iconos, ni de componentes, ni de CSS.
- Tiempo musical en ticks enteros, 480 por negra. Por dentro, notas en MIDI y notación científica; Do, Re, Mi es solo presentación. Los acordes se muestran siempre en cifrado americano.
- **Nunca se programa teoría a mano si Tonal lo resuelve.**
- Muestras en Ogg Opus mono a 48 kHz. Las guarda la propia app en Cache Storage, no el service worker.

## Comandos

```
npm install
npm run dev             # compila el contenido y arranca Vite (http://localhost:5173)
npm run check           # tipos + lint + contenido + pruebas + compilación + presupuesto: lo que exige la CI
npm test                # Vitest
npm run build           # contenido + tsc + vite build → dist/
npm run e2e             # Playwright contra dist/: hay que compilar antes
npm run audio:check     # render sin altavoces y medidas; necesita ffmpeg (-- --guardar deja los WAV en informes/tmp)
npm run content:check   # valida content/ sin escribir
npm run content:schemas # regenera content/.esquemas tras tocar src/contenido/esquemas.ts
npm run size            # presupuesto de la carga inicial sobre dist/
npm run shots           # capturas en informes/capturas (-- --hoja, --escena=, --esquema=, --tam=, --completa, --ruta=)
npm run samples:build   # reconstruye public/samples desde los repositorios de origen (a mano; necesita ffmpeg)
npm run fonts:build     # regenera las fuentes de signos (src/ui/fuentes)
npm run icons:build     # regenera los iconos de la app (public/icons)
```

Para probar como se publica, bajo una subruta: `BASE_PATH=/leitmotiv/ npm run build && BASE_PATH=/leitmotiv/ npm run e2e` (en PowerShell, antes: `$env:BASE_PATH = '/leitmotiv/'`).

Antes de dar algo por terminado: `npm run check`, `npm run e2e` y, si se ha tocado audio o música del contenido, `npm run audio:check`.

## Estructura

```
content/                 Fuente del curso (YAML). mundos/mNN-…/uNN-…/lNN-….yaml, glosario.yaml, conceptos.yaml,
                         fichas/ (una por archivo) y prueba-de-nivel.yaml
  .esquemas/             JSON Schema generados, para el autocompletado del editor
src/
  main.tsx               Entrada: monta App e importa las hojas de estilo
  app/                   App.tsx (carcasa), rutas.ts, ajustes.ts, contenido.ts (lectura con use()), Avisos.tsx (PWA)
  pantallas/             Una por ruta: Titulo, Mapa, Mundo, Leccion, Repaso, Repertorio, PianoRoll, Glosario, Ficha, Prueba,
                         Calibracion, Ajustes, Diagnostico, Muestrario
  ejercicios/            Un componente por tipo de paso; VistaDePaso elige cuál pintar
  ui/                    Componentes (Marco, Boton, Opciones, Dialogo…), contraste.ts
    estilos/             base.css (fuentes, escalas, reinicio), componentes.css (estructura) y tema.css (colores y aspecto)
    iconos/              nombres.ts y dibujos.ts (mapas de bits de 12 × 12)
    mapa/                El mapa del mundo en píxeles y sus nodos
    musica/              VistaDePieza, TecladoDePieza, RejillaDePasos, EjemploSonoro, EditorDePiano, RolloDePiano, useReproductor
    movimiento/          Entrada.tsx: la entrada de pantalla con Motion (trozo aparte)
  audio/                 audio.ts (fachada), estado.ts, motor.ts, reproductor.ts, voces.ts, nativo.ts, sonidos.ts,
                         muestras.ts, niveles.ts, offline.ts
  musica/                tiempo, notas, tonalidad, pieza (formato único), taquigrafia, comprobaciones, instrumentos
  contenido/             esquemas.ts (zod, lo que se escribe) y tipos.ts (lo compilado, lo que lee la app)
  progreso/              base.ts (Dexie), progreso.ts (almacén), operaciones, experiencia, racha, desbloqueo, repaso (FSRS),
                         agenda, ficha, copia (exportar e importar) y tipos
scripts/
  contenido/             Compilador YAML → public/content (JSON)
  muestras/              Construcción del banco de sonidos y su DSP
  audio/                 Verificación de audio sin altavoces
  diseno/                Medida del contraste
  fuentes/, iconos.ts    Fuentes de signos e iconos de la app
  capturas.ts, presupuesto.ts
e2e/                     Playwright: una prueba por pantalla y por tipo de paso, contenido.spec.ts (cada paso de cada lección
                         real, a 360 × 640), encargos, ritmo, PWA y sin conexión, audio, tamaño de los controles, tildes.
                         ayudas.ts (sembrarProgreso, tocarAlRitmo, escribirEnElRollo…) y leccion-de-prueba.ts
public/                  icons/, samples/ (en git) y content/ (generado, fuera de git)
informes/                audio.json, presupuesto.json, muestras/ (en git); capturas/ y tmp/ (fuera de git)
docs/diseno/             Hojas de capturas de la interfaz
```

## Convenciones

### Código

- Identificadores y nombres de archivo en español, sin tildes ni eñes (`diseno`, `tamano`). Comentarios y textos, con ortografía completa.
- TypeScript estricto con `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax` y `erasableSyntaxOnly`: nada de `enum` ni `namespace`, `import type` para los tipos, y las importaciones llevan la extensión (`./rutas.ts`).
- `any` está prohibido y los ciclos de importación también (oxlint los marca como error).
- Solo exportaciones con nombre. Los archivos de componentes, en PascalCase; los demás módulos, en minúsculas.
- Los comentarios explican el porqué, sobre todo el de lo raro.
- Sin dependencias nuevas sin motivo. Si se añade una librería, una tipografía o un banco de sonidos, se anota en CREDITS.md: una prueba lo exige.

### Interfaz

- CSS a mano, sin preprocesador. Clases `bloque__elemento--variante`. La estructura va en `componentes.css` y `pantallas.css`; los colores y el aspecto, solo en `tema.css`, como variables por esquema. Las variables privadas de un componente empiezan por `--_` y se declaran en el propio componente, para que no se hereden de un marco exterior.
- Lo que tiene marco pinta su cara en `::before`: la caja ya incluye el marco y la sombra.
- Todo control mide 44 px o más (`e2e/tactil.spec.ts` lo mide) y toda pareja de colores pasa AA (`scripts/diseno/contraste.test.ts`). Un botón que solo lleva icono necesita `aria-label`.
- Acierto y fallo nunca se distinguen solo por el color.
- Los títulos pueden ir en mayúsculas: una caja que recorte su contenido debe dejar sitio a las tildes (`e2e/tildes.spec.ts` lo mide).
- Textos: de tú, frases cortas, botones que dicen lo que hacen. Ver «Redacción» en DESIGN.md.
- Lo pesado se carga con `lazy()` o `import()`. `npm run size` falla si la carga inicial pasa de 300 KB.

### Audio

- La interfaz habla con el audio por la fachada `src/audio/audio.ts` (más `estado.ts` y `muestras.ts`, que no arrastran Tone.js). De `motor.ts`, `reproductor.ts`, `voces.ts` y `sonidos.ts` solo importa tipos: el motor se descarga aparte y no puede entrar en la carga inicial.
- `sonar()` no lanza nunca: un sonido de interfaz no puede impedir una acción.
- Las voces sintetizadas son osciladores nativos, uno por nota (`nativo.ts`), no sintetizadores de Tone.js.
- Solo suena una pieza a la vez. Desde React, con `useReproductor`.
- Cualquier cambio en el motor, los niveles o las muestras pasa por `npm run audio:check`, y lo que quede para el oído, a AUDIO_REVIEW.md.

### Contenido

- Se escribe en YAML siguiendo CONTENT_GUIDE.md. La música, en la taquigrafía de la guía, nunca en JSON a mano.
- Identificadores `m00`, `m00.u01`, `m00.u01.l02`; salen de los nombres de las carpetas y los archivos.
- `npm run content:check` tiene que acabar con cero errores y cero avisos.

### Pruebas

- Las unitarias viven junto a lo que prueban (`*.test.ts`) y corren en Node, sin DOM. Toda la lógica musical y cada validador tienen las suyas.
- Lo que depende del navegador (PWA, sin conexión, tacto, flujo de una lección) se prueba con Playwright sobre la versión de producción.
- `e2e/contenido.spec.ts` abre cada paso de cada lección de `content/` a 360 × 640 y falla con cualquier error de consola, con algo que se salga por los lados o con el pie fuera de la vista: una lección nueva queda cubierta sin escribir otra prueba.
- Un fallo encontrado se arregla junto con la prueba que lo habría detectado.

## Recetas

- **Lección nueva**: un YAML en la carpeta de su unidad. Nada más. Después, `npm run content:check` y, para verla, `npm run shots -- --ruta=#/leccion/mNN.uNN.lNN/1`.
- **Componente de un tipo de paso**: el componente en `src/ejercicios/` y su caso en `VistaDePaso.tsx`. Los pasos de componer ocupan la pantalla entera mientras se edita: ver `Composicion.tsx`.
- **Campo nuevo en el contenido**: `src/contenido/esquemas.ts`, `src/contenido/tipos.ts`, `scripts/contenido/`, su prueba, `npm run content:schemas` y CONTENT_GUIDE.md.
- **Pantalla nueva**: `src/app/rutas.ts`, un archivo en `src/pantallas/`, `App.tsx`, una escena en `scripts/capturas.ts` y su ruta en la lista `PANTALLAS` de `e2e/ayudas.ts`.
- **Componente o icono nuevo**: ver «Cómo se toca el sistema» en DESIGN.md.
- **Instrumento nuevo**: `src/musica/instrumentos.ts`, `scripts/muestras/`, `npm run samples:build`, CREDITS.md y AUDIO_REVIEW.md.

## Trampas conocidas

- **Tone.js 15**: el reloj puede entregar dos veces el mismo tick (el reproductor descarta la repetición); `Channel` mezcla a mono si no se crea con `channelCount: 2`; un `Synth` monofónico lanza una excepción si se le programa una nota para «ahora» con otra pendiente para después.
- **opentype.js** en Node solo admite la importación por defecto.
- **AAC** no se decodifica en el Chromium de pruebas. Por eso las muestras son Ogg Opus.
- **Playwright** está fijado en la 1.56.0 para coincidir con el Chromium que ya trae el entorno de trabajo en la nube. En otra máquina: `npx playwright install chromium`.
- `public/content` no está en git: lo generan `npm run dev`, `npm run build` y `npm run content:build`.
- Las pruebas de navegador usan `dist/`: si se cambia código, hay que volver a compilar. Con `BASE_PATH`, la compilación y las pruebas deben usar el mismo valor.
- En desarrollo no hay service worker. La instalación, las actualizaciones y el modo sin conexión solo existen en la versión compilada.
- Los ajustes se guardan en localStorage (`leitmotiv-ajustes`) y un script de `index.html` los aplica antes de pintar. Si cambia su forma, hay que subir `version` y revisar ese script.
- Si cambia el formato de las muestras, hay que subir la versión de la caché en `src/audio/muestras.ts`.
- En un terminal de agente, `pkill -f "vite preview"` se mata a sí mismo. Usar `pkill -f "[v]ite preview"`.
- **Windows**: Playwright va de dos en dos procesos (`playwright.config.ts`); con más se agotan los tiempos. En Git Bash, `--ruta=#/…` y `BASE_PATH=/leitmotiv/` se convierten en rutas de Windows: delante, `MSYS_NO_PATHCONV=1`, o usar PowerShell. Esta máquina no tiene ffmpeg: `npm run audio:check` y `npm run samples:build` no se pueden ejecutar en ella.
- **El reloj de audio**: si las pruebas de ritmo (calibración, `ritmo.spec.ts`, «El tempo») fallan todas a la vez sin motivo, mide `AudioContext.currentTime` contra `performance.now()` unos segundos. En una ocasión el reloj de audio de la máquina iba a 0,65 veces el tiempo real; un rato después, bien.
- `sembrarProgreso` y `marcarHechas` (`e2e/ayudas.ts`) escriben en IndexedDB las mismas tablas que `src/progreso/base.ts`: si cambia su esquema, hay que cambiarlas también.
- Con `isMobile`, si algo se sale por los lados, Chromium ensancha la página e `innerWidth` lo sigue: para medir lo que se ve, `visualViewport`.
