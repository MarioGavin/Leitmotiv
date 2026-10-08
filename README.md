# Leitmotiv

App para aprender a componer música de videojuegos desde el móvil: lecciones de cinco a diez minutos, ejemplos que suenan y se pueden manipular, ejercicios de oído, ritmo y escritura, y un piano roll táctil.

Es una PWA. Se instala desde el navegador, funciona sin conexión después de la primera carga y guarda el progreso solo en el dispositivo. No tiene servidor, ni cuentas, ni IA dentro: la corrección es por reglas.

**Estado: Fase 1 terminada, a la espera de la revisión de Mario (Parada 2).** Hay cimientos (formato del contenido, motor de audio, sistema de diseño, PWA y despliegue), los siete tipos de ejercicio, el progreso en el dispositivo con repaso espaciado y prueba de nivel, todas las pantallas, el Mundo 0 entero (24 lecciones en tres unidades, cada una acabada en un encargo) y dos lecciones del Mundo 1. El resto de los mundos es la Fase 2. Qué está hecho, qué falta y qué no se ha podido comprobar: [HANDOFF.md](HANDOFF.md).

## Qué necesitas

- [Node.js](https://nodejs.org) 22.12 o posterior (trae npm).
- Git.
- Solo para algunas comprobaciones: el Chromium de Playwright (`npx playwright install chromium`) y [ffmpeg](https://ffmpeg.org) en el `PATH`. Ver la tabla de comandos.

## Ponerla en marcha

```
npm install
npm run dev
```

Abre `http://localhost:5173`. El terminal enseña también una dirección de red (`Network`): con ella puedes abrir la app en el móvil si está en la misma wifi. Así se prueban el aspecto, el tacto y el sonido, pero no la instalación ni el modo sin conexión, que necesitan HTTPS: para eso, la versión publicada.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Compila el contenido y arranca el servidor de desarrollo |
| `npm run build` | Compila el contenido, comprueba los tipos y genera la versión de producción en `dist/` |
| `npm run preview` | Sirve `dist/` en `http://localhost:4173` |
| `npm run check` | Todo lo que debe pasar antes de publicar: tipos, estilo de código, contenido, pruebas, compilación y presupuesto de 300 KB |
| `npm test` | Pruebas unitarias |
| `npm run e2e` | Pruebas en navegador: cada pantalla y cada tipo de paso, el contenido real paso a paso, los encargos del Mundo 0, PWA y sin conexión. Antes hay que ejecutar `npm run build`. Necesita el Chromium de Playwright |
| `npm run content:check` | Valida el contenido sin escribir nada |
| `npm run content:schemas` | Regenera los esquemas que usa el editor para autocompletar las lecciones |
| `npm run audio:check` | Renderiza el audio sin altavoces y mide afinación, tiempos y niveles. Necesita el Chromium de Playwright y ffmpeg |
| `npm run size` | Mide la carga inicial de `dist/` contra el presupuesto |
| `npm run shots` | Capturas de pantalla en `informes/capturas`, en los dos esquemas y los dos tamaños. Con `-- --hoja`, una hoja con todas; con `-- --escena=nombre`, una escena; con `-- --ruta=#/leccion/m00.u01.l03/1,…`, rutas sueltas con todas las lecciones hechas |
| `npm run samples:build` | Reconstruye el banco de sonidos desde sus repositorios de origen. Necesita ffmpeg; solo hace falta si se cambian los instrumentos |
| `npm run fonts:build`, `npm run icons:build` | Regeneran las fuentes de signos musicales y los iconos de la app |

## Publicar en GitHub Pages

La primera vez:

1. Crea en GitHub un repositorio vacío (sin README ni licencia). Con una cuenta gratuita tiene que ser público para que Pages funcione; con un plan de pago puede ser privado, aunque la página publicada es pública igualmente. Lo explica la [documentación de GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).
2. Sube el código desde la carpeta del proyecto:

   ```
   git remote add origin https://github.com/TU-USUARIO/leitmotiv.git
   git push -u origin main
   ```

3. En el repositorio, entra en **Settings → Pages** y, en **Build and deployment → Source**, elige **GitHub Actions**.
4. Entra en la pestaña **Actions**. Hay dos flujos: «Comprobación» (tipos, pruebas, navegador y audio) y «Publicar». La primera ejecución de «Publicar» habrá fallado si Pages aún no estaba activado: ábrela y pulsa **Re-run all jobs**.
5. Cuando «Publicar» termine en verde, la app está en `https://TU-USUARIO.github.io/leitmotiv/`.

A partir de ahí, cada `git push` a `main` vuelve a comprobar y a publicar. El nombre del repositorio puede ser otro: la ruta se averigua sola.

## Tus datos

El progreso, las piezas de «Mi repertorio» y los ajustes solo están en el dispositivo. En **Ajustes → Tus datos** se exporta una copia en JSON (para guardarla o llevarla a otro móvil), se importa y se borra todo. Borrar los datos del navegador o desinstalar la app los borra también: conviene exportar una copia de vez en cuando.

## Instalarla en Android

1. Abre la dirección publicada en Chrome.
2. Menú **⋮ → Añadir a pantalla de inicio → Instalar** (el nombre de la opción cambia según la versión de Chrome).
3. Queda como una app más: icono propio, pantalla completa y sin barra de direcciones.

La primera vez necesita conexión. Cuando lo tiene todo guardado lo dice: «Leitmotiv ya puede abrirse sin conexión». Los sonidos de los instrumentos se terminan de guardar en segundo plano después de tocar «Empezar»; el estado se ve en **Ajustes → Diagnóstico de audio**.

Qué escuchar y qué probar en el móvil: [AUDIO_REVIEW.md](AUDIO_REVIEW.md).

## Cómo está organizado

```
content/     El curso, en YAML: mundos, lecciones, conceptos, glosario, fichas y prueba de nivel. Añadir una lección no exige tocar código
src/
  app/         Arranque, rutas, ajustes y lectura del contenido
  pantallas/   Una pantalla por ruta
  ejercicios/  Un componente por tipo de paso de lección
  progreso/    Progreso en el dispositivo: base de datos, experiencia, racha, desbloqueo, repaso y copia
  ui/          Componentes, tema, iconos, mapa y vistas de música
  audio/       Motor de audio, reproductor, instrumentos y sonidos de interfaz
  musica/      Tiempo, notas, tonalidad, formato de pieza y comprobaciones
  contenido/   Esquemas del contenido y tipos de lo compilado
scripts/     Compilador de contenido, banco de sonidos, verificación de audio, capturas
e2e/         Pruebas en navegador
public/      Iconos y banco de sonidos (y el contenido compilado, que no se guarda en git)
informes/    Medidas de la última verificación de audio, del presupuesto y del banco de sonidos
docs/        Capturas de la interfaz
```

## Documentos

| Documento | Para qué |
| --- | --- |
| [HANDOFF.md](HANDOFF.md) | Estado del proyecto: hecho, pendiente, problemas conocidos y no comprobado |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Cómo está hecho y por qué: librerías, audio, PWA, pruebas |
| [PLAN_DE_ESTUDIOS.md](PLAN_DE_ESTUDIOS.md) | El mapa del curso: las unidades de cada mundo y sus ocho lecciones, para la Fase 2 |
| [CONTENT_GUIDE.md](CONTENT_GUIDE.md) | Cómo se escribe una lección: mundos, unidades, pasos y los siete tipos de ejercicio |
| [DESIGN.md](DESIGN.md) | Sistema de diseño, con el contraste medido |
| [AUDIO_REVIEW.md](AUDIO_REVIEW.md) | Lo que hay que comprobar de oído y en el móvil |
| [CREDITS.md](CREDITS.md) | Procedencia y licencia de sonidos, tipografías y librerías |
| [CLAUDE.md](CLAUDE.md) | Instrucciones para las sesiones de trabajo con Claude: convenciones y decisiones cerradas |

## Añadir una lección

1. Crea un archivo `lNN-nombre.yaml` en la carpeta de su unidad, dentro de `content/mundos/`.
2. Escríbela siguiendo [CONTENT_GUIDE.md](CONTENT_GUIDE.md). Con VS Code y la extensión de YAML recomendada, el editor autocompleta y marca los errores.
3. `npm run content:check` dice qué falta o qué está mal, con el archivo y el campo.

Toda la música del contenido tiene que ser original: ver «La regla sobre obras existentes» en la guía.

## Licencias

Los sonidos, las tipografías y las librerías que usa la app son de licencia libre; el detalle está en [CREDITS.md](CREDITS.md). El código y el contenido de este repositorio no tienen todavía una licencia elegida.
