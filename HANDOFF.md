# Estado del proyecto

Para quien continúe el trabajo sin haber visto las conversaciones anteriores. Las reglas del proyecto y las decisiones cerradas están en [CLAUDE.md](CLAUDE.md); aquí está lo que cambia: qué hay hecho, qué falta, qué falla y qué no se ha podido comprobar.

**Última actualización:** 7 de octubre de 2026, al cerrar el paso B4-6 (composición y encargo): **los siete tipos de ejercicio funcionan**. **Trabajo a mitad del Tramo B.** Lee primero la sección siguiente: manda sobre el resto del archivo, que en parte describe el estado al cerrar el Tramo A.

## Pausa a mitad del Tramo B: qué hay y qué falta

**Vuelve a compilar desde el paso B4-1.** `npm run check` y `npm run e2e` pasan (569 pruebas unitarias y 24 de navegador, ejecutadas en Windows). En local, Playwright va de dos en dos procesos: con más, en Windows se agotan los tiempos.

### Hecho y comprobado en el Tramo B (commits `4ef1650` a `05b5b16`)

Cada uno pasó `npm run check` al hacerse (511 pruebas unitarias), `npm run e2e` (18) y `npm run audio:check` (70 comprobaciones).

- **Diseño**: una sola dirección, la mezcla que eligió Mario.
- **Lógica musical** (`src/musica/`): corrección de encargos (`requisitos.ts`), ritmo (`ritmo.ts`), generadores de preguntas de oído (`oido.ts`), exportación a MIDI (`midi.ts`), paso a ABC para el pentagrama (`abc.ts`), armaduras y compases compuestos.
- **Motor de audio** (`src/audio/`): edición en vivo (`fijarNotas`), cambio de instrumento en marcha, capas con fundido, salto a secciones, swing, claqueta y patrón de ritmo, lectura del instante de un toque contra el reloj de audio (`pulsacion.ts`), ajuste `latenciaMs`.
- **Progreso** (`src/progreso/`): experiencia y nivel, racha, desbloqueo, repaso espaciado con ts-fsrs, base de datos con Dexie, copia de seguridad en JSON y el almacén `useProgreso`. **Ninguna pantalla lo usa todavía.**

### En el commit «En curso»: escrito, sin terminar y sin probar en navegador

- `src/ejercicios/`: `tipos.ts`, `Cuestionario.tsx` (armazón común de preguntas), `Oido.tsx` (antes `OidoPreguntas.tsx`), `Analisis.tsx`, `Construccion.tsx`, `Capas.tsx`, `Ritmo.tsx`, `usePulsaciones.ts` (emite el evento `leitmotiv:ritmo` con los instantes de los toques, pensado para las pruebas de navegador).
- `src/musica/`: `acordes.ts`, `construccion.ts`, `secciones.ts`, `edicion.ts` (poner, quitar, mover y estirar notas; historial de deshacer), `plantilla.ts`. Estos cuatro últimos tienen pruebas unitarias y pasaban.
- `src/ui/`: `Ventana.tsx`, `musica/Audicion.tsx`, `PadDeToques.tsx`, `RejillaDeRitmo.tsx`, `Pentagrama.tsx` (abcjs, carga diferida), `EditorDePiano.tsx` (editor completo: historial, ampliación, herramientas, exportar MIDI, vista de pentagrama) y `RolloDePiano.tsx` reescrito (arrastre, selección, cursor de teclado).
- `src/app/descargas.ts`; nueve iconos nuevos; rutas nuevas en `rutas.ts` (`ficha/:id`, `pianoroll/:id?`, `prueba`, `calibracion`).

### Paso B4-1 (ejercicio de oído): hecho

- `Leccion.tsx` usa `Oido.tsx` para todos los modos de oído: preguntas escritas y los siete generados con `src/musica/oido.ts`. El resultado del paso todavía no se guarda (llega en B5).
- Para que compile, de forma provisional: las rutas `ficha`, `prueba` y `calibracion` llevan a `Proximamente`, y `PianoRoll.tsx` abre la pieza de prueba en `EditorDePiano` sin guardar nada.
- `e2e/oido.spec.ts`: sirve una lección propia con pasos de intervalo y de acorde generados y los recorre con pista, corrección y repetición. `e2e/pianoroll.spec.ts` está adaptado al editor nuevo.
- **No comprobado:** cómo suenan las preguntas generadas (va a AUDIO_REVIEW.md cuando haya lecciones que las usen), el resto de modos generados en el navegador (solo intervalo y acorde) y la compilación bajo `BASE_PATH`. Ninguna lección del curso usa todavía pasos de oído generados: llegan con el contenido (B7).

### Paso B4-2 (ejercicio de ritmo): hecho

- `Leccion.tsx` usa `Ritmo.tsx`: cuenta previa, patrón, pad de toques, corrección golpe a golpe (adelantado, atrasado, perdido), repetir y, tras dos fallos, «Seguir de todos modos». Los cuatro pasos de ritmo de las dos lecciones ya se pueden hacer.
- CSS de `.ritmo*`, `.casilla*` y `.pad` (el pad usa el marco de `.boton`). Muestra en el Muestrario. Pareja de contraste nueva medida: `tinta-suave` sobre `superficie-2`.
- `e2e/ayudas.ts` tiene `tocarAlRitmo`, que pulsa el pad en los instantes que publica el evento `leitmotiv:ritmo`. `e2e/leccion.spec.ts` completa la lección «El tempo» tocando a tiempo, y prueba un intento sin toques y su repetición.
- **No comprobado:** la precisión en un teléfono real y cómo suena (AUDIO_REVIEW.md, B7). El enlace «Calibrarlo» del fallo lleva a una pantalla provisional hasta B6. Los modos `eco` y `leer` no tienen prueba de navegador, porque ninguna lección los usa todavía.

### Paso B4-3 (construcción guiada): hecho

- `Leccion.tsx` usa `Construccion.tsx` en sus tres modos: completar la melodía y elegir el acorde (opciones barajadas; al marcar una se ve y se oye en el hueco antes de responder) y ordenar secciones (escuchar cada fragmento o el conjunto, subir y bajar, decir cuántos están en su sitio).
- CSS de `.orden*` y de `.vista-pieza__resaltado` (el hueco).
- `e2e/leccion-de-prueba.ts` compila pasos escritos en YAML con el compilador real, para probar en el navegador tipos de paso que ninguna lección usa todavía. `e2e/construccion.spec.ts` recorre los tres modos, con un fallo explicado.
- **No comprobado:** cómo suena la opción puesta en el hueco (en particular el acorde añadido y la fundamental en el bajo) y el tamaño táctil de la lista de fragmentos (`tactil.spec.ts` solo mide pantallas de lecciones reales, y ninguna lleva todavía construcción).

### Paso B4-4 (análisis): hecho

- `Leccion.tsx` usa `Analisis.tsx`: la pieza a la vista y en escucha libre, con preguntas sobre tonalidad, compás, forma, función, acorde de un compás (que se destaca en la pieza) y preguntas libres.
- `e2e/analisis.spec.ts` recorre las seis clases de pregunta, con un fallo que vuelve al final.
- **No comprobado:** cómo se ve el texto de la pregunta (`.pregunta`) en el móvil; no se han sacado capturas.

### Paso B4-5 (mezcla por capas): hecho

- `Leccion.tsx` usa `Capas.tsx`: la música suena en bucle y, al marcar un estado de juego, sus capas entran o salen (y, si lo declara, cambia la sección que se repite) antes de responder. Lista de capas con luz hueca o llena, no solo de color.
- CSS de `.capas` y `.capa*`. `e2e/capas.spec.ts` comprueba con el audio en marcha que marcar un estado cambia las capas, y un acierto y un fallo.
- **No comprobado:** cómo suenan las entradas y salidas (AUDIO_REVIEW.md, B8) y la resecuenciación por secciones en el navegador (solo pruebas unitarias del motor).

### Paso B4-6 (composición y encargo): hecho

- `Composicion.tsx` lleva los pasos `pianoroll` y `encargo`: enunciado (o el encargo con su cliente) y la lista de requisitos, que se corrige en vivo con `requisitos.ts`; luego el editor a pantalla completa con un contador «n/m» que abre la lista, la pista si falta algo y la explicación al cumplirlo todo. Un encargo sin plantilla parte de `plantillaParaRequisitos`. Lo escrito se guarda como borrador (`m00.u01.l08#5`) a los 0,8 s sin tocar y al salir del editor; sobrevive a recargar. Entregar un encargo lo guarda en el repertorio con la lección como origen y borra el borrador.
- `VistaDePaso.tsx` elige el componente de cada paso. `PasoPendiente` ya no existe.
- `Leccion.tsx` reescrita: suma lo acertado a la primera por concepto y, al terminar, llama a `completarLeccion` y enseña la experiencia ganada, los aciertos y la subida de nivel. Avisa si el dispositivo no deja guardar.
- `e2e/composicion.spec.ts`: requisitos que se cumplen al escribir, candado en la pista no editable, borrador que sobrevive a recargar, entrega al repertorio (leída de IndexedDB) y +40 de experiencia. `e2e/leccion.spec.ts` comprueba la recompensa de «El tempo».
- **Pasado a B5:** el candado de las lecciones bloqueadas. Necesita el progreso cargado al arrancar y que las pruebas siembren lecciones completadas; hoy se puede abrir cualquier lección por su URL.
- **No comprobado:** volver a abrir la pantalla final (recargar en ella) registra la lección otra vez, con la experiencia de repetirla (5 puntos). El piano roll dentro de una lección en un móvil real (tacto y espacio).

### Lo que falta del CSS de lo nuevo

`.pentagrama*`, `.rollo__nota--elegida`, `.rollo__asa`, `.rollo__cursor`, `.instrumentos`, `.boton--activo`. Se hace con el ejercicio o la pantalla que lo usa.

### Ruta acordada con Mario (un commit y una parada por paso)

~~B4-2 ritmo~~ · ~~B4-3 construcción guiada~~ · ~~B4-4 análisis~~ · ~~B4-5 mezcla por capas~~ · ~~B4-6 composición y encargo~~ · B5 progreso en la interfaz · B6 pantallas · B7 contenido · B8 cierre. El detalle de cada uno, en la lista siguiente.

### Lo que queda del Tramo B, en orden

1. **Ejercicios**: `Composicion.tsx` (paso de piano roll y de encargo: lista de requisitos con `requisitos.ts`, borradores, guardar en el repertorio); un repartidor `VistaDePaso` que elija el componente por tipo de paso; quitar `PasoPendiente`; reescribir `Leccion.tsx` (resultado por concepto, `completarLeccion`, pantalla final con experiencia, candado si la lección está bloqueada); el CSS de arriba.
2. **Pantallas**: enlazar todo en `App.tsx` y llamar a `useProgreso.cargar()` al arrancar; Repaso, Repertorio, Glosario con fichas, Prueba de nivel, Calibración de latencia, piano roll que abra una pieza del repertorio; nivel, experiencia, racha y candados en Título, Mapa, Mundo y en la propia lección; Ajustes con latencia, copia de seguridad (exportar e importar) y borrar datos; vistas `teclado`, `rejilla` y `pentagrama` en `EjemploSonoro`; `manipulable: instrumento`; transiciones con Motion.
3. **Contenido**: Mundo 0 entero (faltan 22 lecciones; tres unidades de ocho, cada una acabada en un encargo), dos lecciones del Mundo 1, glosario, conceptos, fichas y `prueba-de-nivel.yaml`. Corregir el texto de la lección l01, que dice «bombo» donde suena la caja.
4. **Pruebas de navegador**: los siete tipos de ejercicio, piano roll, exportación a MIDI, copia de seguridad, ritmo y sin conexión; capturas en los dos esquemas; presupuesto de carga.
5. **Documentos**: README, CLAUDE.md (dice que Dexie, ts-fsrs, @tonejs/midi y abcjs «todavía no se usan»: ya no es cierto; tampoco recoge `src/progreso/`), CONTENT_GUIDE (campos `registro`, `swing` y `guia`), DESIGN, CREDITS, ARCHITECTURE (incluido el evento `leitmotiv:ritmo`), AUDIO_REVIEW, y el mapa de unidades de todos los mundos para la Fase 2.

### No comprobado de lo nuevo

- Ningún componente del commit «En curso» se ha visto funcionar en un navegador.
- El dibujo del pentagrama con abcjs dentro de la app, y la exportación a MIDI dentro del paquete de Vite (solo probadas desde Node).
- La precisión de los toques de ritmo y la latencia en un teléfono real.
- Que GitHub Actions y Pages funcionen. Ojo: **con el commit «En curso» la CI fallará**, porque no compila.

## Dónde estamos

La Fase 1 se hace en dos tramos, cada uno con su parada:

| | Qué incluye | Estado |
| --- | --- | --- |
| **Tramo A** | Investigación, andamiaje, formato del contenido, audio base, sistema de diseño con dos direcciones sobre pantallas reales | **Hecho** |
| **Tramo B** | Motor completo, los siete ejercicios, progreso y repaso, todas las pantallas, contenido del Mundo 0 y dos lecciones del Mundo 1 | En curso |

### Qué espera a Mario (Parada 1)

1. ~~Elegir dirección visual.~~ **Hecho**: una mezcla, descrita al principio de DESIGN.md.
2. ~~Crear el repositorio en GitHub y hacer el primer push.~~ **Hecho**: `MarioGavin/Leitmotiv`. Desde las sesiones de trabajo no hay acceso a GitHub: no se ha podido ver si los flujos de Actions han pasado.
3. **Probar en el móvil** la instalación y el audio, con la lista de AUDIO_REVIEW.md. Todavía no lo ha hecho. Lo que encuentre pasa a «Problemas conocidos».
4. Decidir si el repositorio lleva licencia. Ahora no tiene ninguna.

## Hecho

Todo lo de esta lista se ha ejecutado y pasa: `npm run check` (252 pruebas unitarias en 15 archivos), `npm run e2e` (17 pruebas en Chromium con medidas de móvil, compilando en la raíz y bajo `/leitmotiv/`) y `npm run audio:check` (56 comprobaciones, 0 fallos).

**Cimientos**

- Proyecto con Vite 8, React 19 y TypeScript estricto; oxlint, Vitest y Playwright.
- Presupuesto de la carga inicial medido en cada compilación: 94 KB de JavaScript comprimido, de un límite de 300. El motor de audio (71 KB) se descarga aparte.
- Flujos de GitHub Actions para comprobar (`ci.yml`) y publicar en Pages (`deploy.yml`).
- Prototipo y medida de cada librería antes de adoptarla. Las conclusiones están en ARCHITECTURE.md; el código de los prototipos no se ha conservado.

**Contenido**

- Esquemas zod de mundo, unidad, lección y paso, con los siete tipos de ejercicio y sus variantes, además de conceptos, glosario, fichas y prueba de nivel.
- Taquigrafía para escribir música en el YAML (notas, rejillas de percusión, acordes) y compilador a JSON con errores que dicen archivo y campo.
- Comprobaciones musicales al compilar: registro y polifonía de cada instrumento, notas dentro de la tonalidad, acordes escritos que coinciden con lo que suena, bucles que cierran y secciones bien formadas.
- CONTENT_GUIDE.md y esquemas JSON para que el editor autocomplete.
- Escrito: los once mundos con su descripción; las tres unidades del Mundo 0 y las cuatro del Mundo 1, declaradas; **dos lecciones** («El pulso» y «El tempo», diez pasos); cinco términos de glosario y dos conceptos.

**Audio**

- Un solo `AudioContext`; arranque con el primer gesto; suspensión al pasar a segundo plano y reanudación al volver.
- Cuatro instrumentos muestreados (piano, sección de cuerda, bajo eléctrico y batería) construidos desde bancos en dominio público o CC0, con la afinación corregida y los niveles igualados: 76 muestras, 2,1 MB. Dos instrumentos de chip sintetizados (pulso y triangular).
- Reproductor de piezas: bucle, cambio de tempo y de tono en marcha, silenciar pistas, posición para el cabezal.
- Siete sonidos de interfaz derivados del motivo La-Mi-Si-Mi, con dos timbres a elegir.
- Descarga de cada instrumento la primera vez que suena, guardado en el dispositivo y resto del banco en segundo plano.
- Render sin altavoces y medidas automáticas de afinación, tiempos, niveles y sonoridad.
- Pantalla de diagnóstico de audio.

**Interfaz**

- Sistema de diseño (DESIGN.md) con un tema en claro y en oscuro: tipografías, marcos de píxeles, 28 iconos propios y mapa del mundo.
- Componentes: marco, botón, opciones con cursor, diálogo, avance, cabecera, navegación, conmutador, deslizador, vista de pieza, ejemplo sonoro y rollo de piano.
- Pantallas: título, mapa del mundo, mundo, lección (pasos de teoría y de oído con preguntas, pista, corrección, repetición de la pregunta fallada y final), piano roll de prueba, ajustes, diagnóstico y muestrario.
- Contraste AA medido en los cuatro esquemas y tamaño de los controles medido en ocho pantallas, las dos cosas con prueba automática. Otra prueba vigila que ningún título recortado pierda las tildes.
- Nombres de las notas en Do, Re, Mi o en C, D, E, a elegir.

**PWA**

- Manifiesto, iconos y service worker. La carcasa y el contenido se guardan en la primera visita; las actualizaciones se ofrecen y el usuario decide cuándo recargar.
- Funciona sin conexión en las pruebas automáticas: carga, navegación, contenido de una lección y sonido de un instrumento ya usado.

## Pendiente

### Tramo B, en este orden

1. **Motor de audio completo.** Editar una pieza sin parar la reproducción; metrónomo y cuenta previa; calibración de latencia y registro de toques contra el reloj de audio; capas que entran y salen con fundido; cambio de instrumento en marcha.
2. **Lógica musical y corrección.** Función pura que corrige un encargo: `(pieza, requisitos) → lista de requisitos cumplidos o no, con explicación`. Generadores de preguntas para los ejercicios de oído. Todo con pruebas.
3. **Los siete ejercicios.** Hoy solo existen los pasos de teoría y el de oído con preguntas. Faltan el resto de variantes de oído (intervalo, acorde, progresión, escala, timbre, contorno, compás), ritmo, construcción guiada, piano roll con requisitos, análisis, mezcla por capas y encargo. Los esquemas y el compilador ya los admiten: falta el componente de cada uno en `src/ejercicios/`.
4. **Progreso.** Base de datos en el dispositivo (Dexie), lecciones completadas, repaso espaciado (FSRS), prueba de nivel, copia de seguridad en JSON (exportar e importar) y «Mi repertorio».
5. **Pantallas.** Repaso, Repertorio y Glosario (hoy son avisos de «en construcción»); piano roll completo (deshacer, ampliación, arrastre, duración de las notas, edición con teclado, exportación a MIDI); vista de pentagrama con abcjs; transiciones con Motion.
6. **Contenido.** Mundo 0 entero: tres unidades de ocho lecciones, cada una acabada en un encargo. Faltan 22 lecciones. Dos lecciones del Mundo 1. Glosario, fichas y prueba de nivel.
7. **Pruebas de navegador que faltan**: exportación a MIDI, copia de seguridad, ejercicio de ritmo.
8. **Cierre**: mapa de unidades de todos los mundos para la Fase 2, AUDIO_REVIEW.md con el contenido nuevo, README, CLAUDE.md y este archivo al día, informe y commit.

### Para la Fase 2

- Harán falta más instrumentos: un canal de ruido para la percusión de chiptune, vientos y metales para orquestación, teclado eléctrico y guitarra para jazz y funk. Cada uno, con la licencia comprobada en origen (ver «Bancos descartados» en CREDITS.md).
- El encargo original de Mario no está copiado en el repositorio. Conviene pedírselo al empezar.

## Problemas conocidos

**Funcionamiento**

- **No se guarda nada del progreso.** Completar una lección no deja rastro, y lo que se edita en el piano roll se pierde al salir.
- **El piano roll es una prueba de diseño.** Abre siempre la misma pieza. Tocar una casilla pone una nota del tamaño de la rejilla y tocar una nota la quita; no hay arrastre, ni deshacer, ni ampliación. Editar mientras suena detiene la reproducción. No se puede usar con teclado ni con lector de pantalla. Sus casillas miden 28 px.
- Repaso, Repertorio y Glosario son pantallas provisionales.

**Audio** (medido, pendiente de juzgar de oído: AUDIO_REVIEW.md)

- Los ejemplos de solo batería quedan entre 8 y 10 dB por debajo de los que llevan melodía.
- El bucle de las notas largas de cuerda puede notarse en el registro de violín: el sonido de antes y el de después de la costura se parecen poco.
- La nota más aguda del piano (Do8) queda 42 cents alta, por la afinación estirada de las muestras de origen.
- El nivel de los sonidos de interfaz está puesto por cálculo.

**Técnicos**

- Tone.js 15 obliga a tres rodeos, explicados en ARCHITECTURE.md: ticks repetidos, canal en mono y sintetizador monofónico. Por el tercero, los sonidos de interfaz y los instrumentos de chip se sintetizan con osciladores nativos de Web Audio y no con sintetizadores de Tone.js. **Es una desviación del encargo**, que pedía los sonidos de interfaz «con Tone.js»: siguen sin usar archivos y salen por los buses de Tone.js, pero la fuente es un oscilador nativo.
- Tonal está fijada en la versión 6.4.3. Antes de subirla hay que comprobar que la nueva se puede importar desde Node.
- Playwright está fijado en la 1.56.0 y solo se prueba en Chromium.
- El repositorio no tiene licencia.

## No comprobado

Nada de esto se ha podido verificar desde el entorno de trabajo. No hay motivo concreto para pensar que falle, pero no se ha visto funcionar.

- **En un teléfono real.** Instalación en Android, arranque del audio, retardo al tocar, paso a segundo plano, bloqueo de pantalla, llamadas, auriculares Bluetooth y uso sin conexión. Todo se ha probado en un Chromium de escritorio que imita un móvil.
- **Cómo suena.** Nadie ha escuchado todavía ningún instrumento, ejemplo ni sonido de interfaz.
- **La publicación.** Los flujos de GitHub Actions no se han ejecutado nunca. Se ha comprobado que las versiones de las acciones existen y qué entradas y salidas tienen, y la app se ha probado compilada bajo una subruta como la de Pages, pero no se ha desplegado.
- **Windows.** Se ha desarrollado y probado en Linux. Los guiones se han revisado para que no dependan de las rutas de Linux y se han probado desde una carpeta con espacios en el nombre, pero no se han ejecutado en Windows.
- **Otros navegadores.** Ni Safari, ni iOS, ni Firefox.
- **Rendimiento** en un móvil modesto: fluidez del piano roll y cortes de audio.
- **Lectores de pantalla.** Los papeles y los nombres accesibles están puestos y las pruebas los usan para encontrar los controles, pero no se ha probado con TalkBack.
- **El requisito de repositorio público** para usar Pages con una cuenta gratuita, que cita el README: no se ha podido releer la documentación de GitHub en la última sesión.
- **Las firmas de los paquetes de npm** (`npm audit signatures`): el entorno de trabajo no deja descargarlas. `npm audit` no encuentra vulnerabilidades.

## Cómo retomar

```
npm install
npx playwright install chromium   # solo si la máquina no lo tiene
npm run check                     # debe acabar con «Dentro del presupuesto»
npm run build && npm run e2e      # 17 pruebas
npm run audio:check               # 56 comprobaciones; necesita ffmpeg
npm run dev
```

Después: leer CLAUDE.md, preguntar a Mario qué ha oído y probado en el móvil, y seguir por «Pendiente».
