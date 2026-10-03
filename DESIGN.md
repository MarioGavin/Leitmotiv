# Sistema de diseño de Leitmotiv

Leitmotiv es una app para aprender a componer música de videojuegos desde el móvil, en sesiones de cinco a diez minutos y con una sola mano. La interfaz quiere parecer el menú de un RPG de consola portátil: paneles con marco, cursor de selección, tipografía con carácter, transiciones cortas y sonidos propios.

Este documento describe el sistema común y las **dos direcciones visuales** que se presentan en la Parada 1. Las dos están montadas como temas reales sobre las mismas pantallas y se cambian en **Ajustes → Dirección visual**. Cuando se elija una, la otra se borra (ver [Después de elegir](#después-de-elegir)).

| | Cartucho | Vinilo |
| --- | --- | --- |
| Idea | El menú de un RPG de 16 bits en una consola portátil | El RPG urbano contado con la gráfica de una funda de disco de jazz y funk |
| Marcos | Ventanas de píxeles con esquinas escalonadas | Borde grueso de tinta y sombra dura desplazada |
| Tipografía | Jersey (de píxel) y Atkinson Hyperlegible Next | Big Shoulders Display (condensada, en mayúsculas) y Archivo |
| Selección | Cursor ▶ que se mueve y fila iluminada | Bloque de color mostaza y letra grande A, B, C |
| Mapa del curso | Mapa del mundo en píxeles, generado por código | Plano de una línea de metro con números de andén |
| Esquema oscuro / claro | Noche / día | Petróleo / menta |
| Sonidos de interfaz | Onda de pulso de 8 bits | Campana FM |
| Capturas | [docs/diseno/cartucho.png](docs/diseno/cartucho.png) | [docs/diseno/vinilo.png](docs/diseno/vinilo.png) |

## Principios

1. **Una ventana, una cosa.** Cada bloque de la pantalla es un marco con una sola función: el texto, el ejemplo, las opciones, la respuesta. No hay tarjetas dentro de tarjetas.
2. **Lo que se toca, abajo.** Las acciones viven en el pie de la pantalla, al alcance del pulgar. Arriba quedan el avance y la salida.
3. **Elegir y confirmar.** Tocar una opción mueve el cursor; la respuesta se da con «Comprobar». Como en un menú de RPG, y sin respuestas por accidente.
4. **El color significa.** El acento marca lo que está elegido o lo que hay que pulsar. El verde y el rojo solo aparecen al corregir, y siempre con un icono y una palabra además del color. Cada papel de una pista (melodía, bajo, percusión…) tiene su color fijo en toda la app.
5. **La música se ve.** Todo ejemplo sonoro se dibuja como piano roll, con la tónica resaltada y las notas ajenas a la escala en filas más oscuras: la teoría está en la rejilla antes de leerla.
6. **Sobriedad.** Sin degradados, sin vidrio esmerilado, sin tarjetas redondeadas con sombra suave, sin emojis. Todo alineado a la izquierda. Un solo movimiento de entrada por pantalla.

## Lo que comparten las dos direcciones

### Estructura de una pantalla

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

### Medidas

| Qué | Valor | Variable |
| --- | --- | --- |
| Espaciado | 4, 8, 12, 16, 24, 32 y 48 px | `--e-1` a `--e-7` |
| Tamaño mínimo de lo que se toca | 48 px (nunca menos de 44) | `--toque` |
| Ancho máximo de la columna | 480 px | `--ancho-app` |
| Duración de las transiciones | 90 ms y 160 ms | `--dur-corta`, `--dur` |

La prueba `e2e/tactil.spec.ts` mide todos los controles de ocho pantallas en las dos direcciones y falla si alguno baja de 44 × 44 px. Quedan fuera los términos del glosario (enlaces dentro de un texto) y las casillas del piano roll, que miden 28 × 28 px: la rejilla es una superficie de dibujo, no un botón, y en el Tramo B tendrá control de ampliación.

### Componentes

Todos están en `src/ui`. La estructura y las medidas, en `src/ui/estilos/componentes.css`; el aspecto de cada dirección, en `src/ui/direcciones/<dirección>/<dirección>.css`. El muestrario (**Ajustes → Muestrario de diseño**) los enseña todos juntos.

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
| Icono | Icono propio de la dirección activa | `Icono.tsx` |
| Prosa | Pinta los textos del contenido: nombres de notas en la nomenclatura elegida y términos del glosario que se pueden tocar | `ProsaVista.tsx` |
| Vista de pieza | Piano roll en miniatura de un ejemplo, entero y sin desplazamiento | `musica/VistaDePieza.tsx` |
| Ejemplo sonoro | La vista de pieza con sus controles: tempo, transposición, pistas | `musica/EjemploSonoro.tsx` |
| Rollo de piano | La rejilla editable, con nombres de notas y compases fijos en los bordes | `musica/RolloDePiano.tsx` |
| Emblema | Las cuatro notas del motivo | `Emblema.tsx` |

Todo lo que lleva marco pinta su cara en un pseudoelemento `::before`, de modo que la caja del componente ya incluye el marco y la sombra: nada se sale de su sitio y no hay que reservar márgenes a mano. Cada dirección solo define cuánto «vuela» el marco por cada lado (`--_vuelo-*`) y cómo se dibuja.

### El emblema y el motivo

Las letras L, E, T y M de «Leitmotiv», leídas como notas, dan **La, Mi, Si (Ti) y Mi**. Ese motivo de cuatro notas es:

- el emblema: cuatro bloques a esas alturas, como se verían en un piano roll (icono de la app, pantalla de título, final de lección);
- el sonido de entrada y la base de todos los sonidos de interfaz (`src/audio/sonidos.ts`).

### Movimiento

- Una sola animación de entrada por pantalla (160 ms). Nada se mueve solo después, salvo el cursor de «Cartucho», que da un paso corto para señalar.
- Lo que responde a un toque sí se mueve: el botón se hunde, el cabezal recorre la rejilla.
- Con `prefers-reduced-motion`, todo queda quieto.

### Sonido de la interfaz

Siete sonidos, todos derivados del motivo: inicio, cursor, aceptar, atrás, acierto, fallo y completar. Se sintetizan al momento (no hay archivos) con un timbre por dirección. Se silencian en **Ajustes → Sonidos de la interfaz**. Suenan por un bus aparte del de la música, más bajo, y nunca interrumpen una acción.

### Accesibilidad

- **Contraste AA medido**, no estimado: `scripts/diseno/contraste.test.ts` lee los colores de los CSS y comprueba todas las parejas texto/fondo que usa la interfaz (4,5:1) y los bordes, el foco y las notas del piano roll (3:1), en los cuatro esquemas. Las tablas están [más abajo](#contraste-medido).
- **Claro y oscuro** en las dos direcciones; por defecto sigue al sistema.
- **Una mano**: acciones abajo, nada importante en las esquinas de arriba salvo salir.
- **Sin depender del color**: acierto y fallo llevan icono y palabra; la pista silenciada cambia de forma (hueca), no solo de tono.
- **Lectores de pantalla**: cada pantalla tiene su título, las listas de opciones son grupos de radio, los avisos son regiones `status`, los iconos decorativos se ocultan.
- **Teclado**: foco visible en todo. Queda pendiente la edición del piano roll con teclado (ver HANDOFF.md).

### Redacción

- Español de España, de tú. Frases cortas, verbos corrientes.
- Los botones dicen lo que hacen: «Comprobar», «Escuchar», «Volver al mundo». Una acción conserva su nombre en todo el recorrido.
- Los errores dicen qué ha pasado y qué hacer, sin disculparse: «No se ha podido cargar el sonido. Hace falta conexión la primera vez que se usa un instrumento.»
- Lo que aún no existe lo dice claro: «En construcción», con lo que habrá.
- Las notas se nombran Do, Re, Mi (o C, D, E si se elige en Ajustes). Los acordes van siempre en cifrado americano. Los intervalos, a la española: «3.ª mayor», «5.ª justa».

## Dirección A: «Cartucho»

**La idea.** El menú de un RPG de 16 bits. Las pantallas son ventanas sobre un fondo liso, el cursor ▶ señala la opción y el mapa del curso es un mapa del mundo de los de recorrer a pie. El esquema oscuro es la **noche** (ventanas azules sobre un cielo marino, con las ventanas de las casas encendidas en el mapa); el claro es el **día** (ventanas blancas sobre un cielo pálido).

**Lo memorable**: el mapa del mundo. Todo lo demás es callado a propósito.

### Color

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

La lista completa está en `src/ui/direcciones/cartucho/cartucho.css`.

### Tipografía

La familia **Jersey** (The Soft Type Project Authors, licencia OFL) es de píxel y trae un dibujo distinto por tamaño: el número es la altura de las mayúsculas en píxeles. Los tamaños se han elegido para que cada píxel de la letra mida un número entero de px de pantalla:

| Uso | Fuente y tamaño | Píxel de la letra |
| --- | --- | --- |
| Títulos, números grandes | Jersey 10 a 37,33 px | 2 px, igual que los marcos |
| Nombre de la app en el título | Jersey 10 a 74,67 px | 4 px |
| Cabeceras, subtítulos, enunciados | Jersey 15 a 27 px | 1 px |
| Botones, opciones, rótulos, datos | Jersey 10 a 18,67 px | 1 px |
| Texto corrido | Atkinson Hyperlegible Next, 16 px | — |

El texto de más de una línea usa siempre Atkinson Hyperlegible Next (licencia OFL): una fuente de píxel cansa en un párrafo. Su cero barrado es deliberado en una app llena de cifras.

Jersey solo tiene un peso: la negrita sintética está desactivada (`font-synthesis: style`) porque emborronaría los píxeles.

### Marcos

Un píxel lógico son 2 px. La ventana es un rectángulo con un anillo claro de 4 px al que le faltan las esquinas y, por fuera, un contorno de 2 px que rellena esas esquinas: la esquina escalonada de las ventanas de 16 bits. Se dibuja solo con `box-shadow` (ver el comentario «Marco de píxeles» del CSS), sin imágenes. Los botones usan el mismo marco más fino y una sombra dura de 4 px que se tapa al pulsar.

### Iconos

Mapas de bits de 12 × 12 escritos como texto en `src/ui/direcciones/cartucho/iconos.ts` y convertidos en un trazado SVG. Se pintan a 24 px (píxeles de 2 px). Para retocar uno basta con cambiar `#` y `.`; una prueba comprueba que todos miden 12 × 12.

### Mapa del mundo

Generado y pintado por código (`mapa-pixel.ts`): una ruta que serpentea, un campo de distancias que decide dónde hay tierra, ruido determinista para la costa y los adornos, y un bioma por parada (pradera, prado en flor, bosque, otoño, desierto, sierra, islas, ruinas, nieve, ciudad, ceniza y cumbre). Los árboles, las casas y el castillo son dibujos de texto de 8 × 8 y 16 × 16. El mismo plano se pinta con la paleta del día o con la de la noche. Encima van los botones de cada mundo, con su insignia y su nombre.

## Dirección B: «Vinilo»

**La idea.** El RPG urbano —el de la banda sonora de jazz, funk y pop— contado con la gráfica de una funda de disco: títulos condensados en mayúsculas, bloques de color plano, bordes gruesos de tinta y sombras duras, como una serigrafía mal registrada. Las lecciones se leen como la lista de temas de un disco, con su número grande y su duración. El esquema oscuro es **petróleo**; el claro, **menta**. El acento es mostaza; el bermellón queda para los fallos.

**Lo memorable**: la tipografía a gran tamaño. Los números de los mundos y de las lecciones son el dibujo de la pantalla.

### Color

| Variable | Petróleo | Menta | Uso |
| --- | --- | --- | --- |
| `--fondo` | `#0e3133` | `#dfeae4` | Fondo de la pantalla |
| `--superficie` | `#17494b` | `#ffffff` | Relleno de los marcos |
| `--superficie-2` | `#226265` | `#e9f1ec` | Superficie realzada |
| `--hundido` | `#082224` | `#eef3ef` | Rejillas y ejemplos |
| `--tinta` | `#f5eedc` | `#101615` | Texto y borde |
| `--tinta-suave` | `#b9d2ca` | `#47534f` | Texto secundario |
| `--acento` | `#f3c22f` | `#f3c22f` | Mostaza: lo elegido y el botón principal |
| `--acento-tinta` | `#f3c22f` | `#0a6b62` | El acento cuando es texto (en claro, verde azulado) |
| `--exito` | `#56d6a0` | `#0b7a6e` | Acierto |
| `--error` | `#ff6a4a` | `#d23a22` | Fallo: bermellón |

La lista completa está en `src/ui/direcciones/vinilo/vinilo.css`.

### Tipografía

| Uso | Fuente |
| --- | --- |
| Títulos, botones, números | Big Shoulders Display (licencia OFL), pesos 800 y 900, en mayúsculas |
| Texto corrido, opciones, rótulos | Archivo (licencia OFL), pesos 400 a 700 |

Los autores y las licencias de todas las fuentes están en CREDITS.md.

Las mayúsculas se reservan para la fuente de títulos, que está dibujada para eso. Los rótulos y las opciones van en minúsculas.

### Marcos

Borde de 3 px del color de la tinta y sombra dura desplazada 5 px (4 px en los botones). Al pulsar, el botón se desplaza hasta tapar su sombra. Los rótulos son pegatinas ligeramente giradas sobre el borde. Las listas de opciones se separan con filetes del mismo grosor y la opción elegida se rellena entera de mostaza.

### Iconos

Formas macizas sobre una rejilla de 24 × 24, sin trazos finos, en `src/ui/direcciones/vinilo/iconos.tsx`.

### Mapa del curso

El plano de una línea de metro: una estación por mundo, el número grande como en un andén y el nombre a su derecha. La línea cambia de carril cada tres paradas con un quiebro a 45°. El tramo recorrido se pinta con el color de la tinta; el resto, apagado.

## Color de las pistas

En el piano roll y en los ejemplos, cada papel tiene su color. Las notas llevan además un contorno, que es lo que las separa de la rejilla cuando el relleno no basta.

| Papel | Cartucho | Vinilo |
| --- | --- | --- |
| Melodía | Ámbar | Mostaza |
| Contramelodía | Naranja | Melocotón |
| Armonía | Azul cielo | Turquesa |
| Colchón | Lila | Verde agua |
| Bajo | Verde | Bermellón |
| Percusión | Rosa | Tinta |
| Efecto | Gris | Gris |

## Contraste medido

Generado con `npx tsx scripts/diseno/contraste.ts` a partir de los CSS. Si cambia un color, la prueba `scripts/diseno/contraste.test.ts` avisa y esta tabla hay que regenerarla.

### Cartucho

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
| Rótulo de acierto | `--sobre-exito` | `--exito` | 4.5 | 9.2 | 5.1 |
| Opción correcta | `--exito-tinta` | `--superficie` | 4.5 | 8.6 | 7.0 |
| Rótulo de fallo | `--sobre-error` | `--error` | 4.5 | 7.4 | 5.4 |
| Opción incorrecta | `--error-tinta` | `--superficie` | 4.5 | 6.9 | 6.9 |
| Rótulo de un marco (texto invertido) | `--fondo` | `--tinta` | 4.5 | 16.2 | 11.6 |
| Sección activa de la navegación (invertida) | `--superficie` | `--tinta` | 4.5 | 11.7 | 15.0 |
| Borde de un marco contra el fondo | `--borde` | `--fondo` | 3 | 16.2 | 11.6 |
| Contorno de foco | `--acento-tinta` | `--fondo` | 3 | 10.4 | 5.1 |
| Opción correcta sobre la fila elegida | `--exito-tinta` | `--superficie-2` | 4.5 | 6.4 | 5.9 |
| Opción incorrecta sobre la fila elegida | `--error-tinta` | `--superficie-2` | 4.5 | 5.1 | 5.8 |
| Texto de un botón secundario | `--tinta` | `--boton-relleno` | 4.5 | 8.7 | 15.0 |
| Nota en el piano roll (la peor de 21 combinaciones) | color de pista o su contorno | filas de la rejilla | 3 | 5.0 | 13.6 |

### Vinilo

| Uso | Color | Sobre | Mínimo | Oscuro | Claro |
| --- | --- | --- | ---: | ---: | ---: |
| Texto sobre el fondo | `--tinta` | `--fondo` | 4.5 | 12.1 | 14.8 |
| Texto dentro de un marco | `--tinta` | `--superficie` | 4.5 | 8.7 | 18.3 |
| Texto sobre la fila elegida o un botón | `--tinta` | `--superficie-2` | 4.5 | 6.0 | 15.9 |
| Texto sobre una superficie hundida | `--tinta` | `--hundido` | 4.5 | 14.3 | 16.3 |
| Texto secundario sobre el fondo | `--tinta-suave` | `--fondo` | 4.5 | 8.7 | 6.5 |
| Texto secundario dentro de un marco | `--tinta-suave` | `--superficie` | 4.5 | 6.3 | 8.0 |
| Rótulos de la rejilla | `--tinta-suave` | `--hundido` | 4.5 | 10.4 | 7.1 |
| Texto del botón principal | `--sobre-acento` | `--acento` | 4.5 | 11.1 | 11.0 |
| Texto de acento sobre el fondo | `--acento-tinta` | `--fondo` | 4.5 | 8.3 | 5.2 |
| Texto de acento dentro de un marco | `--acento-tinta` | `--superficie` | 4.5 | 6.0 | 6.4 |
| Nombre de la tónica en la rejilla | `--acento-tinta` | `--hundido` | 4.5 | 9.9 | 5.7 |
| Rótulo de acierto | `--sobre-exito` | `--exito` | 4.5 | 9.5 | 5.2 |
| Opción correcta | `--exito-tinta` | `--superficie` | 4.5 | 6.7 | 7.0 |
| Rótulo de fallo | `--sobre-error` | `--error` | 4.5 | 6.6 | 4.8 |
| Opción incorrecta | `--error-tinta` | `--superficie` | 4.5 | 4.7 | 6.5 |
| Rótulo de un marco (texto invertido) | `--fondo` | `--tinta` | 4.5 | 12.1 | 14.8 |
| Sección activa de la navegación (invertida) | `--superficie` | `--tinta` | 4.5 | 8.7 | 18.3 |
| Borde de un marco contra el fondo | `--borde` | `--fondo` | 3 | 12.1 | 14.8 |
| Contorno de foco | `--acento-tinta` | `--fondo` | 3 | 8.3 | 5.2 |
| Secciones de la navegación | `--nav-tinta` | `--nav-fondo` | 4.5 | 10.4 | 12.2 |
| Botón de dos posiciones encendido | `--fondo` | `--tinta` | 4.5 | 12.1 | 14.8 |
| Nota en el piano roll (la peor de 21 combinaciones) | color de pista o su contorno | filas de la rejilla | 3 | 3.3 | 16.4 |

## Capturas

`npm run shots` abre la app en un Chromium con medidas de móvil y captura cada pantalla en las dos direcciones, en claro y en oscuro, a 390 × 844 y a 360 × 640. Con `-- --hojas` compone además una hoja por dirección. Las hojas de la Parada 1 están en `docs/diseno/`:

| | Cartucho | Vinilo |
| --- | --- | --- |
| Mapa, paso con ejercicio y piano roll, en oscuro y en claro, a los dos tamaños | [cartucho.png](docs/diseno/cartucho.png) | [vinilo.png](docs/diseno/vinilo.png) |
| Mundo, teoría, corrección, glosario, lección completada, título y ajustes, en oscuro | [cartucho-mas-pantallas.png](docs/diseno/cartucho-mas-pantallas.png) | [vinilo-mas-pantallas.png](docs/diseno/vinilo-mas-pantallas.png) |

Se han generado con estas dos órdenes, copiando después las hojas de `informes/capturas` a `docs/diseno`:

```
npm run shots -- --hojas
npm run shots -- --hojas --escena=titulo,mundo,leccion-teoria,leccion-correccion,glosario-ventana,leccion-completada,ajustes --esquema=oscuro --tam=390x844
```

Hay tres escenas más para revisar estados concretos: `leccion-pista`, `muestrario` y `diagnostico`.

Las capturas se hacen en un navegador de escritorio que imita un móvil. No sustituyen a mirar la app en el teléfono: ver «No comprobado» en HANDOFF.md.

## Cómo se toca el sistema

- **Un color**: se cambia en el bloque del esquema, en el CSS de la dirección. `npm test` comprueba el contraste.
- **Un icono nuevo**: se añade su nombre a `src/ui/iconos/nombres.ts` y su dibujo a los dos juegos. La prueba `iconos.test.ts` falla si falta en alguno.
- **Un componente nuevo**: estructura en `componentes.css` con variables; aspecto en el CSS de la dirección; una muestra en `src/pantallas/Muestrario.tsx`.
- **Un signo que falta en las fuentes**: se dibuja en `scripts/fuentes/signos.ts` (`npm run fonts:build`). Así se han hecho ♯, ♭ y ♮, y las voladitas ª y º de la fuente de píxel.
- **Una caja que recorta su texto** (`overflow: hidden` para acortar con puntos suspensivos): hay que dejarle relleno arriba y abajo, porque con un interlineado apretado el recorte se come las tildes de las mayúsculas. `e2e/tildes.spec.ts` lo mide en todas las pantallas.

## Después de elegir

Cuando se elija dirección:

1. Borrar la carpeta de la otra en `src/ui/direcciones/` y la línea que importa su CSS en `src/main.tsx`.
2. Quitar la elección de dirección de `src/app/ajustes.ts`, de `src/pantallas/Ajustes.tsx` y del script de `index.html`; `Icono.tsx` y `Mapa.tsx` dejan de elegir entre dos juegos.
3. Quitar de `base.css` las fuentes que ya no se usen y sus paquetes de `package.json`; actualizar CREDITS.md.
4. Si se elige Vinilo, regenerar los iconos de la app con sus colores (`scripts/iconos.ts`) y cambiar `theme_color` en `vite.config.ts` e `index.html`.
5. Dejar este documento con una sola dirección y borrar de `docs/diseno/` las hojas de la otra.
