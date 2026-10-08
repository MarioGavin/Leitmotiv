<!--
Encargo original de Mario, copiado tal como lo dio al cerrar el Tramo B (8 de octubre de 2026).
No se edita: es la referencia del alcance. Lo decidido después (el nombre Leitmotiv en vez de «Partitura»,
abcjs en vez de VexFlow, la mezcla de direcciones visuales, etc.) está en CLAUDE.md, que manda sobre esto.
-->

# PROYECTO: «Partitura» — app para aprender a componer música de videojuegos

## Rol y objetivo
Eres el equipo completo (arquitecto, frontend, diseñador de UI, pedagogo musical
y compositor) de una PWA instalable en móvil que lleva a un estudiante desde un
repaso rápido de fundamentos hasta el flujo de trabajo profesional de música
para videojuegos. Idioma de toda la app y del contenido: español de España.

## Quién la usa
Una sola persona: estudiante de Ingeniería Informática y Diseño de Videojuegos.
Sabe lo básico de solfeo y tocó algo de guitarra y piano. Le gusta el orquestal
de JRPG clásico, el acid jazz/funk/pop de los RPG urbanos modernos, el retro
de 8 y 16 bits y la épica de combate. Meta: saber qué quiere que suene, entender
cómo funciona ese tipo de música y ser capaz de empezar a componerlo.

## Decisiones ya tomadas (no las reabras)
- PWA móvil primero, instalable, usable offline tras la primera carga.
- Progreso solo en el dispositivo (IndexedDB) con exportar/importar copia JSON.
- Sin backend, sin cuentas, sin IA dentro de la app. Corrección por reglas.
- Sonido: instrumentos muestreados con licencia libre + sintetizadores para retro.
- Despliegue: GitHub Pages con GitHub Actions.

## Stack
- Vite + React + TypeScript estricto, vite-plugin-pwa (Workbox).
- Audio: Tone.js (transporte, síntesis, efectos); smplr o soundfont-player para
  instrumentos muestreados; carga perezosa por instrumento y caché en Cache Storage.
- Teoría: Tonal.js (escalas, acordes, intervalos, análisis). Nunca programes
  teoría a mano si Tonal lo resuelve.
- Notación: VexFlow (o abcjs si simplifica). MIDI: @tonejs/midi para exportar.
- Estado: Zustand. Persistencia: Dexie. Animación: Motion (framer-motion).
- Tests: Vitest para lógica musical y validadores; Playwright para flujos.
- Antes de usar cualquier librería, consulta su documentación actual (Context7
  o web). No inventes APIs. Verifica la licencia de cada banco de sonidos
  (solo CC0, CC-BY o equivalente) y anótala en CREDITS.md.

## Herramientas de Claude Code a usar si están disponibles
- Plugin/skill de diseño frontend (frontend-design) para toda la UI.
- MCP de Playwright para abrir la app, hacer capturas a 390×844 y revisarlas.
- MCP Context7 para documentación de Tone.js, Tonal, VexFlow, vite-plugin-pwa.
- Subagentes para escribir contenido por unidad y para revisarlo.
Si alguna no está instalada, dilo al principio y sigue sin ella.

## Arquitectura obligatoria: contenido separado del motor
El contenido vive como datos (JSON/MDX tipados en /content), no en componentes.
Añadir una lección nueva no debe exigir tocar código. Define y documenta en
CONTENT_GUIDE.md los esquemas de: Mundo > Unidad > Lección > Paso, y de cada
tipo de ejercicio. Valida todo el contenido con un script (zod) en CI.

## Tipos de ejercicio (motor)
1. Oído: intervalos, calidad de acordes, progresiones, modos, instrumento/timbre.
2. Ritmo: tocar patrones siguiendo el pulso, con tolerancia y latencia calibrable.
3. Construcción guiada: completar melodía, elegir acorde, ordenar secciones;
   cada opción se puede escuchar antes de responder.
4. Piano roll táctil multipista (melodía, armonía, bajo, percusión) con bucle,
   cuantización, selección de instrumento y exportación MIDI.
5. Análisis: escuchar un ejemplo ORIGINAL y marcar tonalidad, forma, función.
6. Mezcla por capas: activar/desactivar stems y transiciones para entender
   música adaptativa (capas verticales y resecuenciación horizontal).
7. Encargos de compositor: brief realista («tema de tienda, 8 compases, bucle
   limpio, ánimo alegre») con lista de comprobación que el motor valida:
   tonalidad, rango, que el bucle cierre, densidad, estructura.
Todo ejercicio tiene pista, explicación del fallo y repetición.

## Pedagogía
- Sesiones de 5–10 minutos. Teoría mínima justo antes de usarla, siempre con
  un ejemplo audible y manipulable.
- Repaso espaciado (algoritmo tipo SM-2/FSRS) sobre los conceptos fallados.
- Prueba de nivel inicial que permite saltar los fundamentos.
- Cada unidad termina en un encargo; las piezas se guardan en «Mi repertorio».
- Glosario enlazado y fichas de referencia consultables en cualquier momento.

## Plan de estudios (mucho contenido; mínimo 8 lecciones por unidad)
Mundo 0 — Repaso exprés orientado a videojuegos: pulso, compás, notas,
  intervalos, escalas, tríadas.
Mundo 1 — Melodía y motivo: frase, contorno, desarrollo motívico, leitmotiv.
Mundo 2 — Armonía funcional: grados, cadencias, progresiones típicas, inversiones,
  conducción de voces, bajo.
Mundo 3 — Color: modos y su uso expresivo, séptimas y extensiones, intercambio
  modal, dominantes secundarias, modulación, cromatismo.
Mundo 4 — Ritmo y groove: síncopa, compases irregulares, ostinatos, batería y bajo.
Mundo 5 — Orquestación: familias, registros, dobles, texturas, plantilla
  orquestal, cómo escribir para muestras (articulaciones, dinámicas, CC).
Mundo 6 — Lenguajes de género, analizados por técnicas (no por copia):
  orquestal de aventura y JRPG clásico; jazz/funk/pop urbano de RPG moderno
  (acordes extendidos, líneas de bajo, voz y metales); chiptune y sus límites
  de canales; épica de combate (ostinatos, metales, percusión, coros).
Mundo 7 — Funciones de la música en un juego: título, pueblo, mundo abierto,
  mazmorra, combate normal, jefe, jefe final, tienda, relax/guardado, tensión,
  tristeza, victoria, derrota, jingles y stingers. Qué pide cada una y por qué.
Mundo 8 — Música interactiva: bucles sin costura, intro+loop, capas verticales,
  resecuenciación horizontal, transiciones y stingers, estados y parámetros,
  música generativa, límites de memoria y CPU.
Mundo 9 — Flujo profesional: lectura de un brief, hoja de música (cue sheet),
  temas y variaciones para todo un juego, maqueta > revisión > entrega, stems,
  formatos y loudness, nombrado de archivos, integración con middleware
  (conceptos de Wwise y FMOD), trabajo con audio lead y diseñadores,
  derechos y contratos a nivel introductorio, cómo montar un portfolio.
Mundo 10 — Producción y DAW: síntesis sustractiva y FM, muestreo, mezcla
  básica, reverb y espacio, y cómo llevar un MIDI de la app a un DAW
  (guías para FL Studio, Reaper y Cubase sin depender de ninguno).
Proyecto final: banda sonora mínima de un juego ficticio (6–8 pistas con
  tema principal, variaciones y un tema adaptativo de exploración a combate).

## Regla de contenido sobre obras existentes
Puedes nombrar sagas y compositores para explicar técnicas y recomendar
escuchas, pero TODO ejemplo sonoro y toda partitura de la app debe ser
composición original escrita para ilustrar la técnica. No transcribas ni
reproduzcas melodías, progresiones identificables ni letras de obras con
derechos.

## Interfaz: que recuerde a un videojuego, sin distraer y sin aspecto «de IA»
- Dirección: menú de un RPG de consola portátil. Paneles con marco, cursor de
  selección, tipografía con carácter, transiciones cortas y nítidas, sonidos
  de interfaz propios (generados con Tone.js) con interruptor de silencio.
- Mapa de progreso como mapa de mundo con regiones (los Mundos) y nodos.
- Prohibido: degradados morado-azul, glassmorphism, tarjetas redondeadas
  genéricas con sombra suave, emojis como iconos, Inter/Space Grotesk por
  defecto, todo centrado, héroe gigante. Iconos propios en SVG.
- Define primero un sistema de diseño (tokens de color, tipo, espaciado,
  componentes) en DESIGN.md y preséntame 2 direcciones visuales con capturas
  antes de construir pantallas. Espera mi elección.
- Gamificación sobria: experiencia y rango de compositor, racha diaria sin
  castigos, sellos por unidad, repertorio de piezas propias, «encargos» como
  misiones. Nada de monedas, vidas, temporizadores agresivos ni notificaciones
  insistentes.
- Accesibilidad: objetivos táctiles ≥44 px, una mano, contraste AA, respeta
  prefers-reduced-motion, modo claro y oscuro.

## Requisitos técnicos de audio
- El audio arranca solo tras un gesto del usuario; gestiona la suspensión del
  AudioContext en iOS y Android.
- Calibración de latencia para ejercicios de ritmo.
- Presupuesto: carga inicial < 300 KB de JS comprimido sin contar muestras;
  cada instrumento se descarga al necesitarse y queda en caché.

## Fases y cómo trabajar
FASE 1 (sesión normal, esfuerzo máximo): investigación de librerías y bancos de
  sonido, arquitectura, esquemas de contenido, sistema de diseño con las 2
  direcciones, motor de audio, los 7 tipos de ejercicio, repaso espaciado,
  persistencia, PWA y despliegue. Contenido: Mundo 0 completo y 2 lecciones de
  muestra del Mundo 1. Para aquí y enséñamelo.
FASE 2 (ultracode / varios agentes): un agente por unidad escribe el contenido
  siguiendo CONTENT_GUIDE.md; por cada unidad, dos revisores independientes:
  uno comprueba la corrección musical (ejecutando validadores con Tonal: que
  cada ejemplo esté en la tonalidad que dice, que los acordes sean los
  nombrados, que los bucles cierren) y otro la pedagogía y el castellano.
  Un crítico final busca huecos en el plan de estudios.
FASE 3: Mundos 8–10 y proyecto final, pulido, rendimiento, pruebas en móvil.

## Calidad y verificación
- Tests unitarios de toda la lógica musical y de cada validador de encargo.
- Playwright: instalación PWA, una lección completa, piano roll, exportar MIDI,
  copia de seguridad, modo offline.
- Revisa capturas a 390×844 y 360×640 antes de dar una pantalla por buena.
- No puedes oír: no afirmes que algo «suena bien». Verifica por análisis
  (notas, niveles, ausencia de clipping) y deja una lista AUDIO_REVIEW.md de
  lo que debo escuchar yo, con dónde encontrarlo en la app.
- Al final de cada fase: qué está hecho, qué no, qué no has podido comprobar.

## Entregables
Repositorio con README (instalación, despliegue, cómo añadir contenido),
CONTENT_GUIDE.md, DESIGN.md, CREDITS.md, AUDIO_REVIEW.md y la app desplegable.

## Antes de escribir código
Hazme las preguntas que cambien la arquitectura o el plan de estudios, propón
el nombre definitivo de la app y enséñame el plan de la Fase 1. No empieces
hasta que lo apruebe.
