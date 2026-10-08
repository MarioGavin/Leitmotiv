# Estado del proyecto

Para quien continúe el trabajo sin haber visto las conversaciones anteriores. Las reglas del proyecto y las decisiones cerradas están en [CLAUDE.md](CLAUDE.md); aquí está lo que cambia: qué hay hecho, qué falta, qué falla y qué no se ha podido comprobar.

**Última actualización:** 8 de octubre de 2026, al cerrar el Tramo B (paso B8). **La Fase 1 está terminada y espera la revisión de Mario (Parada 2).** La Fase 2 empieza en otra sesión, con su visto bueno.

## Dónde estamos

| | Qué incluye | Estado |
| --- | --- | --- |
| **Tramo A** | Investigación, andamiaje, formato del contenido, audio base, sistema de diseño con dos direcciones sobre pantallas reales | **Hecho** (Parada 1 superada) |
| **Tramo B** | Motor completo, los siete ejercicios, progreso y repaso, todas las pantallas, contenido del Mundo 0 y dos lecciones del Mundo 1, cierre | **Hecho** (falta la Parada 2) |
| **Fase 2** | Contenido de los Mundos 1 a 7, según [PLAN_DE_ESTUDIOS.md](PLAN_DE_ESTUDIOS.md) | Sin empezar |
| **Fase 3** | Mundos 8 a 10, proyecto final, pulido, rendimiento y pruebas en el móvil | Sin empezar |

**Cómo queda, medido al cerrar** (Windows, desde esta carpeta):

- `npm run check`: tipos, lint, contenido (11 mundos, 7 unidades, 26 lecciones, 132 pasos, 26 conceptos, 54 términos, 3 fichas y la prueba de nivel; **0 errores y 0 avisos**), **587 pruebas unitarias** en 37 archivos, compilación y presupuesto: en verde.
- `npm run e2e`: **57 pruebas de navegador** en 23 archivos, en verde compilando en la raíz y bajo `BASE_PATH=/leitmotiv/`.
- `npm run size`: **101,1 KB** de JavaScript comprimido en la carga inicial, de 300 (un 66 % de margen). El contenido no entra en ningún trozo de JavaScript.
- `npm run audio:check`: **no se ha podido ejecutar**. Esta máquina no tiene ffmpeg (falla al lanzarlo: `spawn ffmpeg ENOENT`). La última ejecución buena es del 5 de octubre (commit `3336757`, 70 comprobaciones, 0 fallos), antes del contenido del Mundo 0: **ningún ejemplo del Mundo 0 está medido**. El flujo de CI (`ci.yml`) instala ffmpeg y lo ejecuta, pero no se ha visto pasar.

## Qué espera a Mario (Parada 2)

1. **Revisar la Fase 1.** Las capturas de cada pantalla y de cada tipo de paso, en los dos esquemas y los dos tamaños, salen con `npm run shots -- --hoja` y con las órdenes de «Capturas» en DESIGN.md (van a `informes/capturas`, fuera de git).
2. **Probar en el móvil** la instalación, el audio y el ritmo, con la lista de [AUDIO_REVIEW.md](AUDIO_REVIEW.md) (secciones A a F). Pendiente desde la Parada 1. Lo que encuentres pasa a «Problemas conocidos».
3. **Aprobar o corregir [PLAN_DE_ESTUDIOS.md](PLAN_DE_ESTUDIOS.md)**: el mapa de unidades de los Mundos 1 a 10 y del proyecto final (39 unidades, 312 lecciones). Y decidir, de lo que recoge al final («Lo que el motor tendrá que aprender»), qué entra en la Fase 2: instrumentos nuevos, reglas de corrección nuevas y funciones (encargos con varias piezas, encargos de capas, matices…).
4. **Medir el audio**: instalar ffmpeg en esta máquina y ejecutar `npm run audio:check`, o subir los commits (`git push`: los de B7-7 y B8 no están subidos) y mirar si el flujo «Comprobación» de GitHub Actions pasa. Desde las sesiones de trabajo no hay acceso a GitHub.
5. **Decidir dos cosas del encargo original que no se han hecho**: el **«rango de compositor»** (hoy solo hay nivel numérico) y los **sellos por unidad**. Y cómo se guarda el proyecto final en `content/` (el mapa ya tiene su nodo «F»).
6. **Pasar el encargo original al repositorio**, si quieres: hoy no está copiado y cada fase empieza pidiéndotelo.
7. Decidir si el repositorio lleva licencia. Ahora no tiene ninguna.

## Hecho en el Tramo B

Por pasos, con un commit cada uno (de `e053065` a `51f27a7` y el de este archivo). Todo se ha probado en un Chromium de escritorio que imita un Pixel 7, nunca en un móvil real.

- **Lógica musical** (`src/musica/`): corrección de encargos por reglas (`requisitos.ts`), plan y puntuación del ritmo y calibración (`ritmo.ts`), los siete generadores de preguntas de oído (`oido.ts`), exportación a MIDI (`midi.ts`), paso a ABC para el pentagrama (`abc.ts`), edición de notas con deshacer (`edicion.ts`), construcción guiada (`construccion.ts`, `secciones.ts`, `acordes.ts`) y plantillas (`plantilla.ts`).
- **Motor de audio** (`src/audio/`): edición en vivo, cambio de instrumento y de tempo en marcha, capas con fundido, salto a secciones, swing, sesiones de ritmo con claqueta y cuenta previa, toques medidos contra el reloj de audio (`pulsacion.ts`) y retardo calibrable (`latenciaMs`).
- **Progreso** (`src/progreso/`): base en el dispositivo con Dexie, experiencia y nivel, racha sin castigo, desbloqueo en orden, repaso espaciado con ts-fsrs, prueba de nivel que da unidades por sabidas, Mi repertorio, borradores y copia de seguridad en JSON.
- **Los siete ejercicios** (`src/ejercicios/`): oído (preguntas escritas y siete modos generados), ritmo (seguir, eco y leer), construcción guiada (completar la melodía, elegir el acorde, ordenar secciones), piano roll con requisitos, análisis, mezcla por capas y encargo de compositor. Todos con pista, explicación del fallo y repetición.
- **Pantallas**: título, mapa, mundo, lección, repaso, Mi repertorio, piano roll, glosario y fichas, prueba de nivel, calibración, ajustes (con «Tus datos»), diagnóstico y muestrario. Ejemplos sonoros en piano roll, teclado, rejilla y pentagrama, con tempo, transposición, pistas e instrumento. Entrada de pantalla con Motion.
- **Contenido**: el Mundo 0 entero (tres unidades de ocho lecciones, cada una acabada en un encargo), dos lecciones del Mundo 1, 26 conceptos, 54 términos de glosario, tres fichas y la prueba de nivel. Toda la música es original.

### Paso B8: el cierre

- **B8-1 Pruebas de navegador** (`4d5d66d`): `e2e/encargos.spec.ts` escribe los tres encargos del Mundo 0 en el piano roll, con el teclado, hasta cumplir todos los requisitos, los entrega y lee la pieza de IndexedDB y en Mi repertorio con el título del encargo. `e2e/ritmo.spec.ts` toca de punta a punta el ritmo de leer y el de eco de m00.u01.l03 con `tocarAlRitmo`. `e2e/pwa.spec.ts`: tras una visita con conexión, en modo avión se abren el glosario, una ficha, el repaso, Mi repertorio, la prueba de nivel, la calibración, una lección de cada unidad del Mundo 0 y la primera del Mundo 1, y suena el piano ya usado. Ayudas nuevas: `escribirEnElRollo`, `filaDeNota`, `filaDePercusion`, `marcarHechas`.
- **B8-2 Capturas** (`0fe5361`): revisadas la hoja principal, `mapa-bloqueado`, una lección de cada tipo de paso (teoría en piano roll, teclado, rejilla y pentagrama; los siete ejercicios; un piano roll y un encargo) y una escena nueva, `encargo-editor`. Arreglado:
  - en completar la melodía, dos opciones que solo cambiaban de ritmo se leían igual («Do5» y «Do5»): ahora nombran figuras y silencios;
  - en ordenar secciones, a 360 px el pie no cabía y la página se ensanchaba: «Escuchar» va con la pieza; `contenido.spec.ts` recorre ahora cada paso a 360 × 640 y mide que nada se salga ni deje el pie fuera de la vista (con el código anterior, falla);
  - el requisito de polifonía salía cumplido con la pista vacía;
  - el texto de la rejilla de m00.u01.l03 decía «charles» donde la fila se llama «Pedal».
- **B8-3 Presupuesto** (`0b4d4c1`): 101,1 KB de carga inicial. Al arrancar solo se lee `indice.json` (3,4 KB comprimido); cada lección (26, 248 KB sin comprimir en total), el glosario (5,9 KB), las fichas (3,0 KB), los conceptos (2,1 KB) y la prueba de nivel (3,8 KB) se piden al abrir su pantalla, y el service worker los guarda de antemano.
- **B8-4 Documentos** (`df4dae8`): README, CLAUDE.md, CONTENT_GUIDE, DESIGN, CREDITS, ARCHITECTURE (con el evento `leitmotiv:ritmo`) y AUDIO_REVIEW al día.
- **B8-5** (`005e93b`): `movimiento.spec.ts` fallaba de vez en cuando (la última muestra pillaba la entrada a 0,005 px de acabar); ahora mide hasta que la pantalla queda quieta.
- **B8-6 Mapa de unidades** (`51f27a7`): [PLAN_DE_ESTUDIOS.md](PLAN_DE_ESTUDIOS.md), escrito con el encargo original delante.
- **B8-7**: este archivo, y un arreglo de la tanda final: bajo `/leitmotiv/`, `contenido.spec.ts` midió una vez el pie a 0,05 px de acabar la entrada de pantalla (que la trae 6 px más abajo). Ahora esa prueba va con «reducir movimiento»: mide dónde queda cada cosa, no cómo llega.

## Pendiente

### Para la Fase 2

- **Antes de nada**, la Parada 2: el visto bueno de Mario al plan de estudios y a lo que el motor tiene que aprender.
- **Cómo se trabaja**, según el encargo: un agente por unidad escribe el contenido siguiendo CONTENT_GUIDE.md; por cada unidad, dos revisores independientes, uno de corrección musical (ejecutando los validadores: tonalidad, acordes nombrados, bucles que cierran; y `npm run audio:check`) y otro de pedagogía y castellano; al final, un crítico que busca huecos en el plan.
- **Instrumentos nuevos** (canal de ruido, madera, metal, percusión de orquesta, coro, teclado eléctrico, guitarra, arpa), cada uno con la licencia comprobada en origen (ver «Bancos descartados» en CREDITS.md).
- **Reglas de corrección nuevas** y funciones que pide el plan: la lista está al final de PLAN_DE_ESTUDIOS.md.
- Cada unidad nueva, con sus conceptos en `conceptos.yaml`, sus términos en el glosario, su bloque en la prueba de nivel si se puede saltar, y una ficha si conviene.
- Cada encargo nuevo, escrito de verdad en una prueba de navegador hasta cumplir sus requisitos, como los del Mundo 0 en `e2e/encargos.spec.ts`.

### Deudas que no son contenido

- `npm run audio:check` sin ejecutar desde el 5 de octubre (falta ffmpeg).
- El «rango de compositor» y los sellos por unidad del encargo original.
- El repaso y la prueba de nivel no retoman la sesión al volver de calibrar (ver «Problemas conocidos»).

## Problemas conocidos

**Audio** (medido, pendiente de juzgar de oído: AUDIO_REVIEW.md)

- Los ejemplos de solo batería quedaban entre 8 y 10 dB por debajo de los que llevan melodía (medida del Tramo A).
- El bucle de las notas largas de cuerda puede notarse en el registro de violín.
- La nota más aguda del piano (Do8) queda 42 cents alta, por la afinación estirada de las muestras de origen.
- El nivel de los sonidos de interfaz está puesto por cálculo.

**Interfaz**

- A 360 px, el botón «Abrir el piano roll» de los pasos de componer parte su texto en dos líneas. Se lee y cabe, pero pesa; no se ha cambiado.
- El pentagrama pone un compás por sistema en el móvil: se lee, pero ocupa mucho alto.

**Técnicos**

- Un paso de piano roll o de encargo dentro de una lección guarda el borrador 0,8 s después de cada cambio y al salir de la pantalla, pero no al esconderse la app, como sí hace el piano roll suelto: cerrar la app en ese margen pierde el último cambio.
- Ir a calibrar desde un ejercicio de ritmo del repaso o de la prueba de nivel saca de la sesión, que vuelve a empezar (en una lección sí se retoma).
- Tone.js 15 obliga a tres rodeos, explicados en ARCHITECTURE.md: ticks repetidos, canal en mono y sintetizador monofónico. Por el tercero, los sonidos de interfaz y los instrumentos de chip se sintetizan con osciladores nativos de Web Audio y no con sintetizadores de Tone.js. **Es una desviación del encargo**, que pedía los sonidos de interfaz «con Tone.js»: siguen sin usar archivos y salen por los buses de Tone.js, pero la fuente es un oscilador nativo.
- Tonal está fijada en la versión 6.4.3. Antes de subirla hay que comprobar que la nueva se puede importar desde Node.
- Playwright está fijado en la 1.56.0 y solo se prueba en Chromium. En Windows va de dos en dos procesos.
- **El reloj de audio de esta máquina**: en una tanda de B7 fallaron a la vez las cuatro pruebas que tocan al ritmo porque, medido en el Chromium de las pruebas, el reloj de audio avanzaba a 0,65 veces el tiempo real; un rato después iba bien y pasaron sin tocar nada. En B8 no ha vuelto a pasar. Si pasa, mide `AudioContext.currentTime` contra `performance.now()` unos segundos antes de buscar el fallo en el código.
- En modo avión a mitad de la descarga del banco de sonidos (que la app hace en segundo plano tras el primer sonido), el navegador anota en la consola la muestra que no llegó. La app no falla y lo reintenta en la siguiente visita con conexión; la prueba sin conexión lo tolera.
- **Un fallo suelto sin explicar**: repitiendo `contenido.spec.ts` (unas 30 pasadas), una vez no apareció en 5 s la barra de avance de m00.u01.l07, paso 1; en las demás, sí. No se pudo ver la traza (la sobrescribió la repetición). Si vuelve a pasar, mira la traza de `test-results/` antes de alargar la espera: puede ser la máquina cargada (dos navegadores y el servidor a la vez) o una carga de la lección que se queda colgada.
- El repositorio no tiene licencia.

## No comprobado

Nada de esto se ha podido verificar desde el entorno de trabajo. No hay motivo concreto para pensar que falle, pero no se ha visto funcionar.

- **Cómo suena.** Nadie ha escuchado todavía ningún instrumento, ejemplo ni sonido de interfaz. Del contenido del Mundo 0 no hay ni medidas (falta ffmpeg).
- **En un teléfono real.** Instalación en Android, arranque del audio, retardo al tocar y su calibración (con altavoz y con Bluetooth), paso a segundo plano, bloqueo de pantalla, llamadas, uso sin conexión, el guardado al cerrar la app, la descarga del JSON y del MIDI, el selector de archivos al importar, el tacto y el espacio del piano roll dentro de una lección.
- **El contenido hecho por una persona.** Si la dificultad y la duración de las lecciones (de 6 a 10 minutos declarados) son las adecuadas, solo lo puede decir Mario al hacerlas. Las pruebas abren cada paso de cada lección y hacen de punta a punta los tres encargos, los ritmos de seguir, eco y leer y los tipos de ejercicio con contenido de prueba, pero no resuelven todos los ejercicios reales.
- **La publicación.** Los flujos de GitHub Actions no se han visto ejecutarse. La app se ha probado compilada bajo una subruta como la de Pages, pero no se ha desplegado.
- **Otros navegadores.** Ni Safari, ni iOS, ni Firefox.
- **Rendimiento** en un móvil modesto: fluidez del piano roll y cortes de audio.
- **Lectores de pantalla.** Los papeles y los nombres accesibles están puestos y las pruebas los usan para encontrar los controles (los encargos se escriben con el teclado del piano roll), pero no se ha probado con TalkBack.
- **El requisito de repositorio público** para usar Pages con una cuenta gratuita, que cita el README: no se ha podido releer la documentación de GitHub.
- **Las firmas de los paquetes de npm** (`npm audit signatures`): el entorno de trabajo no deja descargarlas.

## Cómo retomar

```
npm install
npx playwright install chromium   # solo si la máquina no lo tiene
npm run check                     # debe acabar con «Dentro del presupuesto»
npm run build && npm run e2e      # 57 pruebas
npm run audio:check               # necesita ffmpeg; la última vez, 70 comprobaciones
npm run dev
```

Después: leer CLAUDE.md y PLAN_DE_ESTUDIOS.md, preguntar a Mario qué ha decidido en la Parada 2 y qué ha oído y probado en el móvil, y pedirle el encargo original si no está en el repositorio.

## Prompt para empezar la Fase 2

Una propuesta, para usarla cuando Mario haya dado el visto bueno en la Parada 2 (y ajustarla a lo que decida):

> Lee CLAUDE.md, CONTENT_GUIDE.md, PLAN_DE_ESTUDIOS.md y HANDOFF.md. Empieza la Fase 2: el contenido de los Mundos 1 a 7 según PLAN_DE_ESTUDIOS.md, con los cambios que te diga. Antes de escribir, pídeme el encargo original y dime qué reglas de corrección, instrumentos y funciones del final de PLAN_DE_ESTUDIOS.md hacen falta para el primer mundo; impleméntalos primero, con sus pruebas. Después, un agente por unidad escribe sus ocho lecciones siguiendo CONTENT_GUIDE.md, y dos revisores independientes las revisan (uno musical, ejecutando `npm run content:check` y `npm run audio:check`; otro de pedagogía y castellano). Cada encargo nuevo se escribe en una prueba de navegador hasta cumplir sus requisitos. Un mundo por tramo, con un commit por unidad y una parada al final de cada mundo.
