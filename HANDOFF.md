# Estado del proyecto

Para quien continúe el trabajo sin haber visto las conversaciones anteriores. Las reglas del proyecto y las decisiones cerradas están en [CLAUDE.md](CLAUDE.md); aquí está lo que cambia: qué hay hecho, qué falta, qué falla y qué no se ha podido comprobar.

**Última actualización:** 8 de octubre de 2026, al cerrar el paso B7 (contenido). **Trabajo a mitad del Tramo B: falta B8, el cierre.** Lee primero la sección siguiente: manda sobre el resto del archivo, que en parte describe el estado al cerrar el Tramo A.

## Pausa a mitad del Tramo B: qué hay y qué falta

**Compila y pasa.** `npm run check` y `npm run e2e` pasan (584 pruebas unitarias y 53 de navegador, ejecutadas en Windows). Carga inicial: 101 KB de 300. `npm run audio:check` no se ha podido ejecutar ni en B6 ni en B7: esta máquina no tiene ffmpeg. En local, Playwright va de dos en dos procesos: con más, en Windows se agotan los tiempos. **Ojo con el reloj de audio**: en una tanda de B7 fallaron las cuatro pruebas que tocan al ritmo (calibración y lección) porque, medido en el Chromium de las pruebas, el reloj de audio de la máquina avanzaba a 0,65 veces el tiempo real; un rato después iba a tiempo real y las 53 pasaron sin tocar nada. Si vuelve a pasar, mide antes `AudioContext.currentTime` contra `performance.now()` durante unos segundos: el problema está en el dispositivo de sonido, no en el código.

### Hecho y comprobado en el Tramo B (commits `4ef1650` a `05b5b16`)

Cada uno pasó `npm run check` al hacerse (511 pruebas unitarias), `npm run e2e` (18) y `npm run audio:check` (70 comprobaciones).

- **Diseño**: una sola dirección, la mezcla que eligió Mario.
- **Lógica musical** (`src/musica/`): corrección de encargos (`requisitos.ts`), ritmo (`ritmo.ts`), generadores de preguntas de oído (`oido.ts`), exportación a MIDI (`midi.ts`), paso a ABC para el pentagrama (`abc.ts`), armaduras y compases compuestos.
- **Motor de audio** (`src/audio/`): edición en vivo (`fijarNotas`), cambio de instrumento en marcha, capas con fundido, salto a secciones, swing, claqueta y patrón de ritmo, lectura del instante de un toque contra el reloj de audio (`pulsacion.ts`), ajuste `latenciaMs`.
- **Progreso** (`src/progreso/`): experiencia y nivel, racha, desbloqueo, repaso espaciado con ts-fsrs, base de datos con Dexie, copia de seguridad en JSON y el almacén `useProgreso`. Desde B4-6 lo usa la lección; desde B5, también el título, el mapa y el mundo.

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
- **Pasado a B5 y hecho allí:** el candado de las lecciones bloqueadas y que recargar la pantalla final no registre otra vez la lección.
- **No comprobado:** el piano roll dentro de una lección en un móvil real (tacto y espacio).

### Paso B5 (progreso en la interfaz): hecho

- El progreso se empieza a leer en `main.tsx`, antes de pintar (`cargarProgreso()`). `src/app/progreso.ts` da a las pantallas `useEstadoDelCurso()` (suspende hasta tener el índice y el progreso, para no enseñar un candado que luego desaparece) y `useFicha()`.
- **Ficha del jugador** (`src/ui/FichaDelJugador.tsx`, cálculo en `src/progreso/ficha.ts`): nivel, barra de experiencia con su cifra y racha con la llama, que se enciende si hoy ya se ha estudiado. En el mapa (flotando arriba), en el mundo (arriba del todo) y en el título solo si hay experiencia. Muestra en el Muestrario.
- **Mapa**: el cursor empieza en el mundo por donde se sigue; los nodos pueden estar abiertos, completados (marca ✓), bloqueados (candado) o en obras; la ventana de abajo dice cuántas lecciones van hechas. `nodosDelCurso` recibe el estado del curso.
- **Mundo**: cada unidad dice «n de m hechas» o que está bloqueada; las lecciones hechas llevan «Hecha» y ✓, la siguiente lleva el cursor y, para lectores de pantalla, «la siguiente»; las bloqueadas no son enlaces y llevan candado.
- **Lección**: una bloqueada abierta por su dirección enseña «Lección bloqueada» y por cuál seguir. La pantalla final solo registra la lección si se llega desde el último paso; abierta de otro modo (recarga, historial) enseña «Tu marca» (veces y mejor resultado) con «Repetir» y «Volver al mundo», o lleva al paso 1 si la lección no está hecha.
- **Pruebas**: `sembrarProgreso()` en `e2e/ayudas.ts` escribe en IndexedDB antes de arrancar la app (las mismas tablas que `base.ts`; si cambia su esquema, hay que cambiarlo también ahí). La lección de prueba de las e2e pasa a ser la l01, que siempre está abierta. Nuevas: candado en el mundo y en la lección, recarga de la pantalla final sin sumar experiencia, ficha en título, mapa y mundo. `npm run shots` siembra «El pulso» hecha; la escena `leccion-completada` enseña ahora «Tu marca», no la recompensa.
- **No comprobado:** el aspecto de un mundo bloqueado en el mapa (ningún mundo después del 0 tiene lecciones todavía: solo con pruebas unitarias); el título con ficha, sin captura (sí con prueba de navegador); la racha al pasar la medianoche con la app abierta (el día se fija al abrir cada pantalla).

### Paso B6 (pantallas): hecho

Nueve subpasos, un commit cada uno (de `cc8ebce`, B6-1, al de B6-9). Todas las rutas tienen ya su pantalla; `Proximamente.tsx` no existe.

- **B6-1 Calibración** (`#/calibracion`, `pantallas/Calibracion.tsx`): cuenta previa y cuatro compases tocando con la claqueta a 90 BPM; mide con `pulsacion.ts` y `calibrar` (`musica/ritmo.ts`: mediana de las desviaciones; hacen falta seis de cada diez toques y una dispersión de 60 ms como mucho) y guarda `latenciaMs`. «Volver» tira del historial si se llegó desde la app (`volver` en `rutas.ts`), así que la calibración devuelve al ejercicio de ritmo que la pidió. La lección recuerda lo acertado en la pasada aunque se salga a calibrar (mapa `pasadas` en `Leccion.tsx`). El ejercicio de ritmo ofrece calibrar también cuando todos los toques caen fuera (el caso típico de un retardo grande, que antes no lo ofrecía).
- **B6-2 Ajustes**: retardo calibrado con su botón de calibrar; «Tus datos» con exportar copia (descarga un JSON), importar copia (con confirmación; restaura progreso y ajustes) y borrar todo (con confirmación; progreso a cero y ajustes de fábrica). `copia.ts` se descarga aparte. También llevan a la prueba de nivel.
- **B6-3 Repaso** (`#/repaso`): los conceptos que tocan hoy según FSRS, cada uno con un ejercicio de una lección hecha (`VistaDePaso`), a pantalla completa (`usePantallaCompleta` en `app/ventanas.ts` esconde la navegación). Al terminar, `registrarRepaso` y la experiencia. Estados vacíos: sin lecciones hechas, y sin nada pendiente (dice cuándo toca y deja adelantar un repaso corto). **Arreglo:** el compilador apuntaba los pasos de cada concepto contando desde 0 y el repaso los lee desde 1; ahora cuentan desde 1, como la dirección de la lección y los borradores.
- **B6-4 Mi repertorio** (`#/repertorio`): lista de piezas; cada una en una ventana para verla, escucharla, abrirla en el piano roll, exportarla a MIDI o borrarla (con confirmación). «Pieza nueva». El piano roll (`#/pianoroll/:id`) guarda solo, 0,8 s después de cada cambio, al salir y al esconderse la app; sin identificador empieza una pieza nueva que entra en el repertorio con el primer cambio. Se le puede cambiar el título en las opciones (`.campo`). `descargarMidi` en `app/descargas.ts`.
- **B6-5 Glosario y fichas** (`#/glosario`, `#/ficha/:id`): fichas y términos de la A a la Z, con buscador sin tildes que mira también las definiciones (`ui/texto-de-prosa.ts`). La ventana del glosario enseña y hace sonar el ejemplo del término (`EjemploSuelto`, cargado aparte). La ficha pinta cada bloque con su ejemplo. Arreglo en `VistaDePieza`: las líneas de percusión miden al menos su rótulo (se pisaban «Charles», «Caja» y «Bombo»).
- **B6-6 Prueba de nivel** (`#/prueba`): un bloque por unidad, en el orden del archivo; tras cada bloque dice si la unidad queda sabida; al primero que no se supera termina. Se saltan las unidades ya hechas o sabidas; salir a medias no guarda nada. Al acabar, `superarUnidades`. Se llega desde el título (solo quien empieza de cero: «Ya sé algo: prueba de nivel») y desde Ajustes.
- **B6-7 Ejemplo sonoro**: `vista` `teclado` (`TecladoDePieza`), `rejilla` (`RejillaDePasos`) y `pentagrama` (abcjs, aparte), además de `pianoroll`. `manipulable: instrumento` cambia el instrumento de la melodía (o de la primera pista afinada) entre los que caben en su registro y su polifonía (`instrumentosQueCaben`); `useReproductor` gana `fijarInstrumento`. El pentagrama se dibuja con la tinta del tema (en oscuro salía negro sobre azul).
- **B6-8 Motion**: la entrada de cada pantalla (aparece y sube 6 px en 160 ms) con `LazyMotion`, `domAnimation` y `m`, en `ui/movimiento/Entrada.tsx`, que se descarga cuando la app está ociosa (26 KB). Con `prefers-reduced-motion`, sin movimiento. Fuera la animación CSS de `.pantalla`.
- **B6-9 CSS pendiente**: `.rollo__nota--elegida`, `.rollo__asa` y `.rollo__cursor` (variable `--nota-elegida` por esquema). `.pentagrama*` e `.instrumentos` entraron en B6-7, donde se usan por primera vez; `.boton--activo` ya existía desde B4-6 y se ha comprobado en captura (la goma del piano roll).
- **Pruebas**: e2e nuevas `calibracion`, `ajustes`, `repaso`, `repertorio`, `glosario`, `prueba`, `ejemplos` y `movimiento`; `pianoroll` sobre una pieza sembrada. `sembrarProgreso()` siembra también tarjetas y piezas (`PIEZA_GUARDADA`). Contenido de prueba compilado con el compilador real en `e2e/leccion-de-prueba.ts`: `FICHA_DE_PRUEBA` y `PRUEBA_DE_PRUEBA` (aún no hay fichas ni prueba en `content/`). `scripts/capturas.ts` admite `antes` para servir ese contenido; escenas nuevas de cada pantalla.
- **No comprobado:** `npm run audio:check` no se ha podido ejecutar: esta máquina Windows no tiene ffmpeg (no se ha tocado el motor de audio, pero sí `useReproductor`). Lo que hay que oír está en AUDIO_REVIEW.md, sección E. Nada de esto se ha visto en un móvil real: la calibración con altavoz y con Bluetooth, el guardado al cerrar la app (`pagehide` y `visibilitychange`), la descarga del JSON y del MIDI en Android, el selector de archivos al importar. El cambio de instrumento y el pentagrama solo se han visto en pruebas: ninguna lección del curso los usa todavía.
- **Notas para Windows:** las pruebas nuevas que no tratan de la PWA bloquean el service worker: su precarga en cada contexto nuevo, con dos procesos a la vez, a veces deja colgadas peticiones del servidor de `vite preview`. Una vez, al lanzar `movimiento.spec.ts` justo después de compilar, las dos pruebas fallaron en `page.goto` por el arranque del servidor; repetidas seis veces seguidas, pasan.

### Paso B7 (contenido): hecho

Siete subpasos, un commit cada uno (de `928de52`, B7-1, al de B7-7). `npm run content:check`: 11 mundos, 7 unidades, 26 lecciones, 132 pasos, 26 conceptos, 54 términos, 3 fichas y la prueba de nivel; **0 errores y 0 avisos**. Toda la música es original.

- **Mundo 0 entero** (24 lecciones, las tres unidades publicadas, sin `estado: borrador`):
  - **u01 Pulso y compás**: «El pulso», «El tempo», «Redondas, blancas y negras», «Corcheas y semicorcheas», «El compás, en cuatro y en tres», «El 6/8, pulsos que se parten en tres», «Silencios y puntillo» y «La feria del pueblo» (encargo «El bucle de la feria»).
  - **u02 Notas e intervalos**: «Las siete notas», «Teclas negras, sostenidos y bemoles», «La octava y el registro», «Segundas y terceras», «Cuartas, quintas y octavas», «Sextas y séptimas», «Reposo y tensión» y «La llamada del héroe» (encargo del mismo nombre).
  - **u03 Escalas y tríadas**: «La escala mayor», «La tónica, la nota que es casa», «La escala menor», «Tríadas mayores y menores», «Tríadas disminuida y aumentada», «Los acordes de la escala», «Casa, viaje y tensión» y «El bucle de la aldea» (encargo del mismo nombre).
  - Cada encargo lleva plantilla y de 7 a 8 requisitos; al entregarlo, la pieza va a Mi repertorio con el título del encargo (lo hace `Composicion.tsx`, sin cambios).
- **«El pulso»** dice lo que suena: «a la vez que la caja» en el ritmo y «golpe seco, el del aro» en la guía de compás; el ejemplo del paso 3 nombra el pedal de charles. En «El tempo», «Camina con dos dedos, un paso por golpe» (el ejemplo alterna bombo y aro). Revisadas todas las menciones de piezas de batería contra lo que suena.
- **Mundo 1**: m01.u01.l01 «Frases que respiran» y l02 «Pregunta y respuesta». La unidad sigue en borrador. El Mundo 1 pasa de «en obras» a bloqueado.
- **Se estrena todo lo que B6 dejó sin usar**: los siete modos de oído generados (intervalo, acorde, progresión, escala, timbre, contorno, compás), los ritmos `eco` y `leer`, las vistas `teclado`, `rejilla` y `pentagrama`, `manipulable: [instrumento]` y `[transposicion]`, una mezcla por capas, ordenar secciones (dos), elegir acorde (tres), y análisis de tonalidad, compás, acorde y función. Hay pasos de los siete tipos de ejercicio y de piano roll dentro de lecciones.
- **Conceptos** (26): uno por cada `concepto` de los ejercicios, con `nombre` y `definicion`. Cada uno tiene al menos dos pasos de los que entran en el repaso (oído, ritmo, construcción, análisis o capas), comprobado sobre el contenido compilado.
- **Glosario** (54 términos): todos los enlazados con `[[…]]` y los básicos del Mundo 0; diez con ejemplo sonoro. **Fichas**: `compases-y-figuras`, `intervalos` y `escalas-y-triadas`. **Prueba de nivel**: un bloque por unidad del Mundo 0, cinco ejercicios cada uno, distintos de los de las lecciones.
- **Pruebas**: nueva `e2e/contenido.spec.ts`, que abre cada paso de cada lección real (una prueba por unidad) y falla con cualquier error de consola. `glosario.spec.ts` se escribe contra el glosario real (lo lee de `dist/`) y gana una prueba con la ficha «Intervalos»; `prueba.spec.ts` gana dos con la prueba real; `arranque.spec.ts` comprueba el Mundo 1 bloqueado frente al 5 en obras y cuenta 24 lecciones; en `leccion.spec.ts` el candado se busca en la fila de «El tempo» (ahora hay siete con candado). `PANTALLAS` incluye `#/ficha/intervalos`. «El pulso» y «El tempo» no cambian de estructura: las pruebas que dependen de ellas siguen igual.
- **Capturas**: las escenas `glosario`, `ficha`, `prueba` y `prueba-balance` usan el contenido real; escena nueva `mapa-bloqueado`; `npm run shots -- --ruta=#/leccion/m00.u02.l03/1,…` captura rutas sueltas con todas las lecciones hechas (en Git Bash, con `MSYS_NO_PATHCONV=1` delante, o convierte `#/…` en una ruta de Windows).
- **No comprobado:** cómo suena todo lo nuevo (sección F de AUDIO_REVIEW.md) y su sonoridad, porque `npm run audio:check` no se puede ejecutar sin ffmpeg. Ningún ejercicio nuevo se ha hecho de punta a punta en el navegador, salvo los de la prueba de nivel que recorre la escena `prueba-balance`: `contenido.spec.ts` solo comprueba que cada paso se pinta. Los encargos de las tres unidades no se han completado en una prueba (es B8). Si la dificultad y la duración (de 6 a 10 minutos declarados) son las adecuadas, solo lo puede decir Mario al hacerlas.
- **Arreglo de interfaz**: en los enunciados, las notas, acordes y tonalidades marcados salían con la letra de los datos en mitad del titular; ahora heredan la del titular (`.prosa.enunciado__texto .musical` en `pantallas.css`). Encontrado en las capturas.
- **Aprendido al escribir el YAML**: un valor sin comillas no puede llevar «: » (el YAML lo lee como otra clave), y uno que empieza por una marca «{…}» hay que entrecomillarlo. La marca `{i:3M}` ya se lee «3.ª mayor»: no hace falta escribir el nombre al lado. El enunciado se ve como titular en mayúsculas: conviene una frase corta.

### Paso B8 (cierre): en curso

- **B8-1 Pruebas de navegador**: `e2e/encargos.spec.ts` (los tres encargos del Mundo 0, escritos con el teclado del piano roll hasta cumplir todos los requisitos, entregados y leídos de IndexedDB y en Mi repertorio), `e2e/ritmo.spec.ts` (leer y eco de m00.u01.l03, superados con `tocarAlRitmo`) y `e2e/pwa.spec.ts` ampliada (sin conexión: glosario, ficha, repaso, repertorio, prueba de nivel, calibración, una lección de cada unidad y el piano ya usado). 57 pruebas en verde, en la raíz y bajo `/leitmotiv/`.
- **B8-2 Capturas**: revisadas; arreglados las opciones de completar la melodía que se leían igual, el pie de ordenar secciones que no cabía a 360 px (con prueba que lo mide en cada paso), el requisito de polifonía que salía cumplido sin notas y un texto de m00.u01.l03.
- **B8-3 Presupuesto**: `npm run size` da **101,1 KB** de JavaScript comprimido en la carga inicial, de 300 (un 66 % de margen); 357,9 KB se descargan después, cuando hacen falta. El contenido no está en ningún trozo de JavaScript: son JSON que se piden al abrir cada pantalla. Al arrancar solo se lee `indice.json` (3,4 KB comprimido); cada lección (26, 248 KB sin comprimir en total), el glosario (5,9 KB), las fichas (3,0 KB), los conceptos (2,1 KB) y la prueba de nivel (3,8 KB) se piden cuando se abren.

### Ruta acordada con Mario (un commit y una parada por paso)

~~B4-2 ritmo~~ · ~~B4-3 construcción guiada~~ · ~~B4-4 análisis~~ · ~~B4-5 mezcla por capas~~ · ~~B4-6 composición y encargo~~ · ~~B5 progreso en la interfaz~~ · ~~B6 pantallas~~ · ~~B7 contenido~~ · B8 cierre. El detalle de cada uno, en la lista siguiente.

### Lo que queda del Tramo B, en orden

1. ~~**Ejercicios**~~ (hecho en B4-6 y B5): `Composicion.tsx` (paso de piano roll y de encargo: lista de requisitos con `requisitos.ts`, borradores, guardar en el repertorio); un repartidor `VistaDePaso` que elija el componente por tipo de paso; quitar `PasoPendiente`; reescribir `Leccion.tsx` (resultado por concepto, `completarLeccion`, pantalla final con experiencia, candado si la lección está bloqueada); el CSS de arriba.
2. ~~**Pantallas** (B6)~~: hecho; ver «Paso B6».
3. ~~**Contenido**~~ (hecho en B7): Mundo 0 entero (faltan 22 lecciones; tres unidades de ocho, cada una acabada en un encargo), dos lecciones del Mundo 1, glosario, conceptos, fichas y `prueba-de-nivel.yaml`. Corregir el texto de la lección l01, que dice «bombo» donde suena la caja.
4. **Pruebas de navegador** (B8): sin conexión con las pantallas nuevas, un encargo de cada unidad, los ritmos `eco` y `leer` de punta a punta; capturas en los dos esquemas; presupuesto de carga.
5. **Documentos** (B8): README, CLAUDE.md (dice que Dexie, ts-fsrs, @tonejs/midi y abcjs «todavía no se usan»: ya no es cierto; tampoco recoge `src/progreso/`), CONTENT_GUIDE (campos `registro`, `swing` y `guia`), DESIGN, CREDITS, ARCHITECTURE (incluido el evento `leitmotiv:ritmo`), AUDIO_REVIEW, y el mapa de unidades de todos los mundos para la Fase 2.

### No comprobado de lo nuevo

- Todo lo de B4 a B6 tiene prueba de navegador, pero solo en un Chromium de escritorio que imita un móvil.
- El pentagrama con abcjs y la exportación a MIDI ya se prueban en el navegador (B6); no en un móvil.
- La precisión de los toques de ritmo y la latencia en un teléfono real.
- Que GitHub Actions y Pages funcionen.

## Dónde estamos

La Fase 1 se hace en dos tramos, cada uno con su parada:

| | Qué incluye | Estado |
| --- | --- | --- |
| **Tramo A** | Investigación, andamiaje, formato del contenido, audio base, sistema de diseño con dos direcciones sobre pantallas reales | **Hecho** |
| **Tramo B** | Motor completo, los siete ejercicios, progreso y repaso, todas las pantallas, contenido del Mundo 0 y dos lecciones del Mundo 1 | En curso |

### Qué espera a Mario (Parada 1)

1. ~~Elegir dirección visual.~~ **Hecho**: una mezcla, descrita al principio de DESIGN.md.
2. ~~Crear el repositorio en GitHub y hacer el primer push.~~ **Hecho**: `MarioGavin/Leitmotiv`. Desde las sesiones de trabajo no hay acceso a GitHub: no se ha podido ver si los flujos de Actions han pasado.
3. **Probar en el móvil** la instalación y el audio, con la lista de AUDIO_REVIEW.md (desde B7, también la sección F: el contenido nuevo). Todavía no lo ha hecho. Lo que encuentre pasa a «Problemas conocidos».
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
- Escrito al cerrar el Tramo A: los once mundos con su descripción; las tres unidades del Mundo 0 y las cuatro del Mundo 1, declaradas; dos lecciones, cinco términos y dos conceptos. **Desde B7**: el Mundo 0 entero, dos lecciones del Mundo 1, 54 términos, 26 conceptos, tres fichas y la prueba de nivel (ver «Paso B7»).

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
6. ~~**Contenido.**~~ (hecho en B7) Mundo 0 entero: tres unidades de ocho lecciones, cada una acabada en un encargo. Faltan 22 lecciones. Dos lecciones del Mundo 1. Glosario, fichas y prueba de nivel.
7. **Pruebas de navegador que faltan**: exportación a MIDI, copia de seguridad, ejercicio de ritmo.
8. **Cierre**: mapa de unidades de todos los mundos para la Fase 2, AUDIO_REVIEW.md con el contenido nuevo, README, CLAUDE.md y este archivo al día, informe y commit.

### Para la Fase 2

- Harán falta más instrumentos: un canal de ruido para la percusión de chiptune, vientos y metales para orquestación, teclado eléctrico y guitarra para jazz y funk. Cada uno, con la licencia comprobada en origen (ver «Bancos descartados» en CREDITS.md).
- El encargo original de Mario no está copiado en el repositorio. Conviene pedírselo al empezar.

## Problemas conocidos

**Funcionamiento**

- ~~No se guarda nada del progreso.~~ Resuelto en B4-6 y B5: las lecciones, la experiencia y los encargos se guardan en el dispositivo. Desde B6, lo que se edita en el piano roll suelto tampoco se pierde: va a Mi repertorio.
- ~~El piano roll es una prueba de diseño.~~ Resuelto en B4 y B6: editor completo que abre y guarda piezas de Mi repertorio.
- ~~Repaso, Repertorio y Glosario son pantallas provisionales.~~ Resuelto en B6.

**Audio** (medido, pendiente de juzgar de oído: AUDIO_REVIEW.md)

- Los ejemplos de solo batería quedan entre 8 y 10 dB por debajo de los que llevan melodía.
- El bucle de las notas largas de cuerda puede notarse en el registro de violín: el sonido de antes y el de después de la costura se parecen poco.
- La nota más aguda del piano (Do8) queda 42 cents alta, por la afinación estirada de las muestras de origen.
- El nivel de los sonidos de interfaz está puesto por cálculo.

**Técnicos**

- Un paso de piano roll o de encargo dentro de una lección guarda el borrador 0,8 s después de cada cambio y al salir de la pantalla, pero no al esconderse la app, como sí hace el piano roll suelto desde B6: cerrar la app en ese margen pierde el último cambio.
- Ir a calibrar desde un ejercicio de ritmo del repaso o de la prueba de nivel saca de la sesión, que vuelve a empezar (en una lección sí se retoma).

- Tone.js 15 obliga a tres rodeos, explicados en ARCHITECTURE.md: ticks repetidos, canal en mono y sintetizador monofónico. Por el tercero, los sonidos de interfaz y los instrumentos de chip se sintetizan con osciladores nativos de Web Audio y no con sintetizadores de Tone.js. **Es una desviación del encargo**, que pedía los sonidos de interfaz «con Tone.js»: siguen sin usar archivos y salen por los buses de Tone.js, pero la fuente es un oscilador nativo.
- Tonal está fijada en la versión 6.4.3. Antes de subirla hay que comprobar que la nueva se puede importar desde Node.
- Playwright está fijado en la 1.56.0 y solo se prueba en Chromium.
- El repositorio no tiene licencia.

## No comprobado

Nada de esto se ha podido verificar desde el entorno de trabajo. No hay motivo concreto para pensar que falle, pero no se ha visto funcionar.

- **En un teléfono real.** Instalación en Android, arranque del audio, retardo al tocar, paso a segundo plano, bloqueo de pantalla, llamadas, auriculares Bluetooth y uso sin conexión. Todo se ha probado en un Chromium de escritorio que imita un móvil.
- **Cómo suena.** Nadie ha escuchado todavía ningún instrumento, ejemplo ni sonido de interfaz.
- **La publicación.** Los flujos de GitHub Actions no se han ejecutado nunca. Se ha comprobado que las versiones de las acciones existen y qué entradas y salidas tienen, y la app se ha probado compilada bajo una subruta como la de Pages, pero no se ha desplegado.
- **Windows.** Desde el Tramo B, `npm run check`, `npm run e2e` y `npm run shots` se ejecutan en Windows (desde una carpeta con espacios). `npm run audio:check` y `npm run samples:build` no, porque esa máquina no tiene ffmpeg.
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
npm run build && npm run e2e      # 53 pruebas
npm run audio:check               # 56 comprobaciones; necesita ffmpeg
npm run dev
```

Después: leer CLAUDE.md, preguntar a Mario qué ha oído y probado en el móvil, y seguir por «Pendiente».

## Prompt para B8

El prompt de la sesión siguiente, tal como se le dio a Mario al cerrar B7:

> Lee CLAUDE.md, CONTENT_GUIDE.md y la sección «Pausa a mitad del Tramo B» de HANDOFF.md (incluidos «Paso B6» y «Paso B7»). Haz solo el paso B8 de la ruta: el cierre del Tramo B. Pártelo en subpasos B8-1, B8-2…, con un commit cada uno («feat: …», «test: …» o «docs: … (B8-n)»), y para solo al final.
>
> 1. Pruebas de navegador que faltan (si las de ritmo fallan sin motivo, mira antes «Ojo con el reloj de audio» en HANDOFF.md). Sin conexión con las pantallas nuevas: después de una visita con conexión, en modo avión se abren el glosario, una ficha, el repaso, Mi repertorio, la prueba de nivel, la calibración y una lección de cada unidad, y suena un instrumento ya usado (amplía e2e/pwa.spec.ts). Un encargo de cada unidad del Mundo 0 (m00.u01.l08, m00.u02.l08 y m00.u03.l08), escrito en el piano roll hasta cumplir todos sus requisitos, entregado y leído de IndexedDB en Mi repertorio con el título del encargo. Un ejercicio de ritmo en modo eco y otro en modo leer de punta a punta, con tocarAlRitmo (hoy e2e/contenido.spec.ts solo comprueba que se abren). Repite la tanda con BASE_PATH=/leitmotiv/.
> 2. Capturas en los dos esquemas y los dos tamaños, revisadas: npm run shots -- --hoja; la escena mapa-bloqueado; y con --ruta=, una lección de cada tipo de paso (teoría en pianoroll, teclado, rejilla y pentagrama; los siete ejercicios; un piano roll y un encargo). Lo que se vea mal se arregla.
> 3. Presupuesto de carga: npm run size, con la cifra en HANDOFF.md. El contenido nuevo no debe entrar en la carga inicial.
> 4. Documentos: README; CLAUDE.md (dice que Dexie, ts-fsrs, @tonejs/midi y abcjs «todavía no se usan», no recoge src/progreso/, content/fichas, prueba-de-nivel.yaml, e2e/contenido.spec.ts ni la opción --ruta= de npm run shots); CONTENT_GUIDE (los campos registro, swing y guia, y lo aprendido en B7 que cuenta HANDOFF.md); DESIGN; CREDITS; ARCHITECTURE (con el evento leitmotiv:ritmo); AUDIO_REVIEW (que la sección F siga al día).
> 5. El mapa de unidades de todos los mundos para la Fase 2: para cada mundo del 1 al 10 y el proyecto final, sus unidades (título y objetivo) y, en cada unidad, ocho lecciones con una línea de lo que enseñan, la última con su encargo. El Mundo 1 respeta las dos lecciones ya escritas de m01.u01. Antes de escribirlo, pídeme el encargo original: el alcance de la Fase 2 está allí.
>
> No toques el contenido del Mundo 0 salvo para arreglar lo que salga mal en las pruebas o en las capturas. npm run audio:check necesita ffmpeg; en esta máquina Windows no lo hay: si sigue sin haberlo, dilo en el informe y no lo des por pasado.
>
> En esta máquina (Windows) Playwright va de dos en dos procesos. Al acabar: npm run check, npm run e2e (también con BASE_PATH=/leitmotiv/) y npm run audio:check, todos en verde; HANDOFF.md al día, con el Tramo B cerrado y lo que espera a Mario en la Parada 2; e informe breve con hecho / no hecho / no comprobado. Para ahí: la Fase 2 empieza en otra sesión.
