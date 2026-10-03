# Estado del proyecto

Para quien continúe el trabajo sin haber visto las conversaciones anteriores. Las reglas del proyecto y las decisiones cerradas están en [CLAUDE.md](CLAUDE.md); aquí está lo que cambia: qué hay hecho, qué falta, qué falla y qué no se ha podido comprobar.

**Última actualización:** 3 de octubre de 2026, al cerrar el Tramo A de la Fase 1.

## Dónde estamos

La Fase 1 se hace en dos tramos, cada uno con su parada:

| | Qué incluye | Estado |
| --- | --- | --- |
| **Tramo A** | Investigación, andamiaje, formato del contenido, audio base, sistema de diseño con dos direcciones sobre pantallas reales | **Hecho.** En la Parada 1 |
| **Tramo B** | Motor completo, los siete ejercicios, progreso y repaso, todas las pantallas, contenido del Mundo 0 y dos lecciones del Mundo 1 | Sin empezar |

### Qué espera a Mario (Parada 1)

1. **Elegir dirección visual**: «Cartucho» o «Vinilo». Se comparan en `docs/diseno/` y en la app (Ajustes → Dirección visual). Hasta que elija conviven las dos, y no se construyen pantallas nuevas.
2. **Crear el repositorio en GitHub, activar Pages y hacer el primer push**. Los pasos están en el README. Desde las sesiones de trabajo no ha habido acceso de escritura a GitHub.
3. **Probar en el móvil** la instalación y el audio, con la lista de AUDIO_REVIEW.md. Lo que encuentre pasa a «Problemas conocidos».
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
- Siete sonidos de interfaz derivados del motivo La-Mi-Si-Mi, con un timbre por dirección visual.
- Descarga de cada instrumento la primera vez que suena, guardado en el dispositivo y resto del banco en segundo plano.
- Render sin altavoces y medidas automáticas de afinación, tiempos, niveles y sonoridad.
- Pantalla de diagnóstico de audio.

**Interfaz**

- Sistema de diseño (DESIGN.md) con dos direcciones completas, cada una en claro y en oscuro: tipografías, marcos, 28 iconos propios por dirección, mapa y timbre.
- Componentes: marco, botón, opciones con cursor, diálogo, avance, cabecera, navegación, conmutador, deslizador, vista de pieza, ejemplo sonoro y rollo de piano.
- Pantallas: título, mapa del mundo, mundo, lección (pasos de teoría y de oído con preguntas, pista, corrección, repetición de la pregunta fallada y final), piano roll de prueba, ajustes, diagnóstico y muestrario.
- Contraste AA medido en los cuatro esquemas y tamaño de los controles medido en ocho pantallas, las dos cosas con prueba automática. Otra prueba vigila que ningún título recortado pierda las tildes.
- Nombres de las notas en Do, Re, Mi o en C, D, E, a elegir.

**PWA**

- Manifiesto, iconos y service worker. La carcasa y el contenido se guardan en la primera visita; las actualizaciones se ofrecen y el usuario decide cuándo recargar.
- Funciona sin conexión en las pruebas automáticas: carga, navegación, contenido de una lección y sonido de un instrumento ya usado.

## Pendiente

### Al elegir dirección

Seguir «Después de elegir» en DESIGN.md: borrar la dirección descartada, sus tipografías y su hoja de capturas, y actualizar CREDITS.md. Si se elige «Vinilo», regenerar los iconos de la app y el color del tema.

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

- **Los pasos de ritmo de las dos lecciones no se pueden hacer.** Enseñan el enunciado y un botón para saltarlos.
- **No se guarda nada del progreso.** Completar una lección no deja rastro, y lo que se edita en el piano roll se pierde al salir.
- **El piano roll es una prueba de diseño.** Abre siempre la misma pieza. Tocar una casilla pone una nota del tamaño de la rejilla y tocar una nota la quita; no hay arrastre, ni deshacer, ni ampliación. Editar mientras suena detiene la reproducción. No se puede usar con teclado ni con lector de pantalla. Sus casillas miden 28 px.
- Repaso, Repertorio y Glosario son pantallas provisionales.
- Mientras convivan las dos direcciones, la app descarga las hojas de estilo y las tipografías de ambas.

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

Después: leer CLAUDE.md, mirar el estado de la Parada 1 con Mario (dirección elegida, lo que haya oído y probado en el móvil) y seguir por «Pendiente».
