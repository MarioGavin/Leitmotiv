# Sistema de diseño de Leitmotiv

Leitmotiv es una app para aprender a componer música de videojuegos desde el móvil, en sesiones de cinco a diez minutos y con una sola mano. La interfaz quiere parecer el menú de un RPG de consola portátil: paneles con marco, cursor de selección, tipografía con carácter, transiciones cortas y sonidos propios.

En la Parada 1 se presentaron dos direcciones, «Cartucho» y «Vinilo», y Mario eligió una mezcla:

| De «Cartucho» | De «Vinilo» |
| --- | --- |
| Los colores: noche azul y día pálido, con ámbar de acento | La tipografía: títulos condensados en mayúsculas y texto en Archivo |
| Las ventanas con marco de píxeles y el cursor ▶ | El recuadro que se rellena de verde o de rojo al corregir |
| Los iconos de mapa de bits | |
| El mapa del mundo en píxeles, siempre de día | |

Las capturas están en [docs/diseno/pantallas.png](docs/diseno/pantallas.png) y [docs/diseno/mas-pantallas.png](docs/diseno/mas-pantallas.png).

## Principios

1. **Una ventana, una cosa.** Cada bloque de la pantalla es un marco con una sola función: el texto, el ejemplo, las opciones, la respuesta. No hay tarjetas dentro de tarjetas.
2. **Lo que se toca, abajo.** Las acciones viven en el pie de la pantalla, al alcance del pulgar. Arriba quedan el avance y la salida.
3. **Elegir y confirmar.** Tocar una opción mueve el cursor; la respuesta se da con «Comprobar». Como en un menú de RPG, y sin respuestas por accidente.
4. **El color significa.** El acento marca lo que está elegido o lo que hay que pulsar. El verde y el rojo solo aparecen al corregir, y siempre con un icono y una palabra además del color. Cada papel de una pista (melodía, bajo, percusión…) tiene su color fijo en toda la app.
5. **La música se ve.** Todo ejemplo sonoro se dibuja como piano roll, con la tónica resaltada y las notas ajenas a la escala en filas más oscuras: la teoría está en la rejilla antes de leerla.
6. **Sobriedad.** Sin degradados, sin vidrio esmerilado, sin tarjetas redondeadas con sombra suave, sin emojis. Todo alineado a la izquierda. Un solo movimiento de entrada por pantalla.

## Estructura de una pantalla

```
┌──────────────────────────┐
│ cabecera                 │  salir o volver · título o avance · un dato
├──────────────────────────┤
│                          │
│ cuerpo                   │  marcos en una columna; se desplaza con la página
│                          │
├──────────────────────────┤
│ pie                      │  acciones, pegadas abajo
│ navegación (5 secciones) │  solo en las pantallas principales
└──────────────────────────┘
```

- Una sola columna, de 360 a 480 px de ancho. En pantallas más anchas la columna se centra.
- La cabecera y el pie se quedan fijos; el cuerpo se desplaza. Las pistas y las correcciones aparecen dentro del cuerpo, justo encima del pie, y se traen a la vista solas: así un texto largo nunca tapa el botón.
- El piano roll es la excepción: ocupa la pantalla entera y solo se desplaza la rejilla.
- La navegación principal tiene cinco secciones: Mapa, Repaso, Repertorio, Glosario y Ajustes. Dentro de una lección o del piano roll no hay navegación.

## Medidas

| Qué | Valor | Variable |
| --- | --- | --- |
| Espaciado | 4, 8, 12, 16, 24, 32 y 48 px | `--e-1` a `--e-7` |
| Tamaño mínimo de lo que se toca | 48 px (nunca menos de 44) | `--toque` |
| Ancho máximo de la columna | 480 px | `--ancho-app` |
| Píxel lógico de marcos, iconos y mapa | 2 px | — |
| Duración de las transiciones | 90 ms y 160 ms | `--dur-corta`, `--dur` |

La prueba `e2e/tactil.spec.ts` mide todos los controles de las pantallas de `e2e/ayudas.ts`, en los dos esquemas, y falla si alguno baja de 44 × 44 px. Quedan fuera los términos del glosario, que son enlaces dentro de un texto.

## Color

El esquema oscuro es la **noche**: ventanas azules sobre un cielo marino. El claro es el **día**: ventanas blancas sobre un cielo pálido. Por defecto sigue al sistema.

| Variable | Noche | Día | Uso |
| --- | --- | --- | --- |
| `--fondo` | `#0c1226` | `#cfe2ee` | El cielo: fondo de la pantalla |
| `--superficie` | `#1a2d5a` | `#fdfcf6` | Relleno de las ventanas |
| `--superficie-2` | `#27407c` | `#ffe7a3` | Fila donde está el cursor |
| `--hundido` | `#0a1022` | `#e9f0f5` | Rejillas y ejemplos |
| `--tinta` | `#f6efd9` | `#17224a` | Texto y marco |
| `--tinta-suave` | `#b9c4de` | `#45527e` | Texto secundario |
| `--acento` | `#f7b733` | `#f7b733` | Ámbar: botón principal, cursor, avance |
| `--acento-tinta` | `#f7b733` | `#8a4b00` | El acento cuando es texto |
| `--exito` | `#5fd398` | `#1c7d4c` | Acierto |
| `--error` | `#ff7d6e` | `#c2371f` | Fallo |

La lista completa está en `src/ui/estilos/tema.css`. Ningún otro archivo de estilos lleva colores escritos.

### Color de las pistas

En el piano roll y en los ejemplos, cada papel tiene su color. Las notas llevan además un contorno, que es lo que las separa de la rejilla cuando el relleno no basta.

| Papel | Color |
| --- | --- |
| Melodía | Ámbar |
| Contramelodía | Naranja |
| Armonía | Azul cielo |
| Colchón | Lila |
| Bajo | Verde |
| Percusión | Rosa |
| Efecto | Gris |

## Tipografía

| Uso | Fuente |
| --- | --- |
| Títulos, cabeceras, enunciados, botones, rótulos y números grandes | Big Shoulders Display, pesos 800 y 900, en mayúsculas |
| Texto corrido, opciones, datos y etiquetas | Archivo, pesos 400 a 700 |
| Sostenido, bemol y becuadro | Leitmotiv Signos, dibujada para la app |

Las dos primeras tienen licencia OFL; autores y licencias, en CREDITS.md.

- Las mayúsculas se reservan para la fuente de títulos, que está dibujada para eso. Las opciones, las etiquetas y el texto van en minúsculas.
- Los títulos llevan un interlineado apretado (0,95). Una caja que recorte su texto tiene que dejar sitio a las tildes de las mayúsculas: ver [Cómo se toca el sistema](#cómo-se-toca-el-sistema).
- Las fuentes de texto no traen ♯, ♭ ni ♮, o los dejan en manos del sistema. `scripts/fuentes/signos.ts` los dibuja y una regla `unicode-range` hace que se usen solo para esos tres signos.

## Marcos

Un píxel lógico son 2 px. La ventana es un rectángulo con un anillo claro de 4 px al que le faltan las esquinas y, por fuera, un contorno de 2 px que rellena esas esquinas: la esquina escalonada de las ventanas de 16 bits. Se dibuja solo con `box-shadow` (ver el comentario «Marco de píxeles» de `tema.css`), sin imágenes. Los botones usan el mismo marco más fino y una sombra dura de 4 px que se tapa al pulsar.

Todo lo que lleva marco pinta su cara en un pseudoelemento `::before`, de modo que la caja del componente ya incluye el marco y la sombra: nada se sale de su sitio y no hay que reservar márgenes a mano. Cada componente declara cuánto «vuela» el marco por cada lado (`--_vuelo-*`).

El rótulo de un marco es una etiqueta sobre el borde superior, con la letra de los títulos: dice de qué es la ventana («Unidad 1», «Pista», «Fallo»).

## Componentes

Todos están en `src/ui`. La estructura y las medidas, en `src/ui/estilos/componentes.css`; los colores y el dibujo, en `src/ui/estilos/tema.css`. El muestrario (**Ajustes → Muestrario de diseño**) los enseña todos juntos.

| Componente | Qué es | Archivo |
| --- | --- | --- |
| Marco | El panel con borde. Variantes: normal, hundido (superficies de trabajo), con rótulo sobre el borde | `Marco.tsx` |
| Botón | Principal (acento), secundario, fantasma (solo texto) y cuadrado con icono | `Boton.tsx` |
| Opciones | Lista de respuestas con cursor. Es un grupo de botones de radio: con teclado se recorre con las flechas | `Opciones.tsx` |
| Diálogo | Marco con rótulo de color para la pista, el acierto y el fallo | `Dialogo.tsx` |
| Avance | Un tramo por paso de la lección | `Avance.tsx` |
| Cabecera y Navegación | Lo fijo de arriba y de abajo | `Cabecera.tsx`, `Navegacion.tsx` |
| Conmutador | Elegir una entre dos o tres opciones | `Conmutador.tsx` |
| Deslizador | Un valor continuo, como el tempo | `Deslizador.tsx` |
| Icono | Icono propio, de mapa de bits | `Icono.tsx` |
| Prosa | Pinta los textos del contenido: nombres de notas en la nomenclatura elegida y términos del glosario que se pueden tocar | `ProsaVista.tsx` |
| Vista de pieza | Piano roll en miniatura de un ejemplo, entero y sin desplazamiento | `musica/VistaDePieza.tsx` |
| Ejemplo sonoro | La pieza en la vista que pida la lección (piano roll en miniatura, teclado, rejilla de pasos o pentagrama) con sus controles: tempo, transposición, pistas e instrumento | `musica/EjemploSonoro.tsx` |
| Teclado | La pieza sobre un teclado: teclas usadas marcadas y las que suenan encendidas con el color de su pista | `musica/TecladoDePieza.tsx` |
| Rejilla de pasos | La pieza como una caja de ritmos: una fila por pieza de la batería o pista, un bloque por compás | `musica/RejillaDePasos.tsx` |
| Campo de texto | Hundido y con el marco fino: buscar en el glosario, el título de una pieza | `.campo` |
| Rollo de piano | La rejilla editable, con nombres de notas y compases fijos en los bordes | `musica/RolloDePiano.tsx` |
| Emblema | Las cuatro notas del motivo | `Emblema.tsx` |
| Ficha del jugador | Nivel, barra de experiencia con su cifra y racha. En el mapa, el mundo y, si hay algo hecho, el título | `FichaDelJugador.tsx` |
| Mapa del mundo | El mapa en píxeles con un botón por mundo | `mapa/MapaDelMundo.tsx` |

### Opciones y corrección

Antes de comprobar, la fila elegida lleva el cursor ▶ y un fondo algo más claro. Al comprobar:

- si era la buena, la fila se rellena de **verde**;
- si no, se rellena de **rojo**, y la buena se marca con su texto en verde.

Cada fila lleva además su icono (✓ o ✗), y el diálogo de debajo dice «Correcto» o «Fallo» con su explicación: el color nunca va solo.

## Iconos

Mapas de bits de 12 × 12 escritos como texto en `src/ui/iconos/dibujos.ts` y convertidos en un trazado SVG. Se pintan a 24 px (píxeles de 2 px). Para retocar uno basta con cambiar `#` y `.`; una prueba comprueba que todos miden 12 × 12 y que hay un dibujo por cada nombre de `nombres.ts`.

## Mapa del mundo

Generado y pintado por código (`src/ui/mapa/mapa-pixel.ts`): una ruta que serpentea, un campo de distancias que decide dónde hay tierra, ruido determinista para la costa y los adornos, y un bioma por parada (pradera, prado en flor, bosque, otoño, desierto, sierra, islas, ruinas, nieve, ciudad, ceniza y cumbre). Los árboles, las casas y el castillo son dibujos de texto de 8 × 8 y 16 × 16. Encima van los botones de cada mundo, con su insignia y su nombre.

**El mapa se pinta siempre de día**, también con el esquema oscuro. La versión nocturna, que oscurecía los mismos colores, parecía una pantalla con el brillo bajado; ahora el mundo conserva sus colores y son las ventanas de alrededor las que oscurecen.

## El emblema y el motivo

Las letras L, E, T y M de «Leitmotiv», leídas como notas, dan **La, Mi, Si (Ti) y Mi**. Ese motivo de cuatro notas es:

- el emblema: cuatro bloques a esas alturas, como se verían en un piano roll (icono de la app, pantalla de título, final de lección);
- el sonido de entrada y la base de todos los sonidos de interfaz (`src/audio/sonidos.ts`).

## Movimiento

- Una sola animación de entrada por pantalla (160 ms: aparece y sube 6 px), hecha con Motion en `src/ui/movimiento/Entrada.tsx`. Motion se descarga aparte cuando la app está ociosa, así que la primera pantalla aparece quieta. Los pasos de una lección no repiten la entrada; el mapa y el piano roll entran quietos. Las ventanas y los avisos suben con una animación CSS (`entrar`). Nada se mueve solo después, salvo el cursor, que da un paso corto para señalar.
- Lo que responde a un toque sí se mueve: el botón se hunde, el cabezal recorre la rejilla.
- Con `prefers-reduced-motion`, todo queda quieto.

## Sonido de la interfaz

Siete sonidos, todos derivados del motivo: inicio, cursor, aceptar, atrás, acierto, fallo y completar. Se sintetizan al momento (no hay archivos). Hay dos timbres, a elegir en **Ajustes → Sonidos de la interfaz**: «Chip», la onda de pulso de una consola de 8 bits, y «Campana», una campana de síntesis FM. Ahí mismo se silencian. Suenan por un bus aparte del de la música, más bajo, y nunca interrumpen una acción.

## Accesibilidad

- **Contraste AA medido**, no estimado: `scripts/diseno/contraste.test.ts` lee los colores de `tema.css` y comprueba todas las parejas texto/fondo que usa la interfaz (4,5:1) y los bordes, el foco y las notas del piano roll (3:1), en los dos esquemas. La tabla está [más abajo](#contraste-medido).
- **Claro y oscuro**; por defecto sigue al sistema.
- **Una mano**: acciones abajo, nada importante en las esquinas de arriba salvo salir.
- **Sin depender del color**: acierto y fallo llevan icono y palabra; la pista silenciada cambia de forma (hueca), no solo de tono.
- **Lectores de pantalla**: cada pantalla tiene su título, las listas de opciones son grupos de radio, los avisos son regiones `status`, los iconos decorativos se ocultan.
- **Teclado**: foco visible en todo.

## Redacción

- Español de España, de tú. Frases cortas, verbos corrientes.
- Los botones dicen lo que hacen: «Comprobar», «Escuchar», «Volver al mundo». Una acción conserva su nombre en todo el recorrido.
- Los errores dicen qué ha pasado y qué hacer, sin disculparse: «No se ha podido cargar el sonido. Hace falta conexión la primera vez que se usa un instrumento.»
- Las notas se nombran Do, Re, Mi (o C, D, E si se elige en Ajustes). Los acordes van siempre en cifrado americano. Los intervalos, a la española: «3.ª mayor», «5.ª justa».

## Contraste medido

Generado con `npx tsx scripts/diseno/contraste.ts` a partir de `tema.css`. Si cambia un color, la prueba `scripts/diseno/contraste.test.ts` avisa y esta tabla hay que regenerarla.

| Uso | Color | Sobre | Mínimo | Oscuro | Claro |
| --- | --- | --- | ---: | ---: | ---: |
| Texto sobre el fondo | `--tinta` | `--fondo` | 4.5 | 16.2 | 11.6 |
| Texto dentro de un marco | `--tinta` | `--superficie` | 4.5 | 11.7 | 15.0 |
| Texto sobre la fila elegida o un botón | `--tinta` | `--superficie-2` | 4.5 | 8.7 | 12.6 |
| Texto sobre una superficie hundida | `--tinta` | `--hundido` | 4.5 | 16.5 | 13.4 |
| Texto secundario sobre el fondo | `--tinta-suave` | `--fondo` | 4.5 | 10.6 | 5.7 |
| Texto secundario dentro de un marco | `--tinta-suave` | `--superficie` | 4.5 | 7.7 | 7.4 |
| Rótulos de la rejilla | `--tinta-suave` | `--hundido` | 4.5 | 10.8 | 6.6 |
| Texto del botón principal | `--sobre-acento` | `--acento` | 4.5 | 10.3 | 8.6 |
| Texto de acento sobre el fondo | `--acento-tinta` | `--fondo` | 4.5 | 10.4 | 5.1 |
| Texto de acento dentro de un marco | `--acento-tinta` | `--superficie` | 4.5 | 7.5 | 6.6 |
| Nombre de la tónica en la rejilla | `--acento-tinta` | `--hundido` | 4.5 | 10.6 | 5.9 |
| Rótulo de acierto y opción acertada (rellena) | `--sobre-exito` | `--exito` | 4.5 | 9.2 | 5.1 |
| Opción correcta que no se había elegido | `--exito-tinta` | `--superficie` | 4.5 | 8.6 | 7.0 |
| Rótulo de fallo y opción fallada (rellena) | `--sobre-error` | `--error` | 4.5 | 7.4 | 5.4 |
| Texto de error dentro de un marco | `--error-tinta` | `--superficie` | 4.5 | 6.9 | 6.9 |
| Rótulo de un marco (texto invertido) | `--fondo` | `--tinta` | 4.5 | 16.2 | 11.6 |
| Sección activa de la navegación (invertida) | `--superficie` | `--tinta` | 4.5 | 11.7 | 15.0 |
| Texto de un botón secundario | `--tinta` | `--boton-relleno` | 4.5 | 8.7 | 15.0 |
| Borde de un marco contra el fondo | `--borde` | `--fondo` | 3 | 16.2 | 11.6 |
| Contorno de foco | `--acento-tinta` | `--fondo` | 3 | 10.4 | 5.1 |
| Nota en el piano roll (la peor de 21 combinaciones) | color de pista o su contorno | filas de la rejilla | 3 | 5.0 | 13.6 |

## Capturas

`npm run shots` abre la app en un Chromium con medidas de móvil y captura las pantallas en claro y en oscuro, a 390 × 844 y a 360 × 640. Con `-- --hoja` compone además una hoja con todas. Las de `docs/diseno/` se generan así, copiando después las hojas desde `informes/capturas`:

```
npm run shots -- --hoja
npm run shots -- --hoja=mas --tam=390x844 --escena=titulo,mundo,leccion-teoria,leccion-correccion,glosario-ventana,leccion-completada,ajustes
```

La lista de escenas está al principio de `scripts/capturas.ts`. Las capturas se hacen en un navegador de escritorio que imita un móvil: no sustituyen a mirar la app en el teléfono.

## Cómo se toca el sistema

- **Un color**: se cambia en el bloque del esquema, en `tema.css`. `npm test` comprueba el contraste.
- **Un icono nuevo**: se añade su nombre a `src/ui/iconos/nombres.ts` y su dibujo a `dibujos.ts`. La prueba `iconos.test.ts` falla si falta.
- **Un componente nuevo**: estructura en `componentes.css` con variables; colores y dibujo en `tema.css`; una muestra en `src/pantallas/Muestrario.tsx`.
- **Un signo que falta en las fuentes**: se dibuja en `scripts/fuentes/signos.ts` (`npm run fonts:build`). Así se han hecho ♯, ♭ y ♮.
- **Una caja que recorta su texto** (`overflow: hidden` para acortar con puntos suspensivos): hay que dejarle relleno arriba y abajo, porque con un interlineado apretado el recorte se come las tildes de las mayúsculas. `e2e/tildes.spec.ts` lo mide en todas las pantallas.
