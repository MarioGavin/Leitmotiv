# Créditos y licencias

Todo lo que suena y se ve en Leitmotiv es obra propia o procede de fuentes con licencia libre que permite redistribuirlo. Este archivo dice de dónde sale cada cosa. La prueba `scripts/muestras/creditos.test.ts` lo compara con la tabla de fuentes del código y con `package.json`: si se añade un banco de sonidos, una tipografía o una librería y no se anota aquí, la comprobación falla.

## Música y ejemplos sonoros

Todos los ejemplos, ejercicios y piezas de `content/` son **composiciones originales** escritas para Leitmotiv. No hay transcripciones de obras existentes ni progresiones o melodías tomadas de ellas. Las referencias a bandas sonoras, cuando las haya, se nombran para que el usuario las escuche por su cuenta, y se analizan por sus técnicas.

## Sonidos

Los instrumentos muestreados se construyen con `npm run samples:build` (`scripts/muestras`) a partir de cuatro repositorios públicos, cada uno fijado a un commit. Solo se admiten bancos en dominio público, CC0 o CC-BY. La licencia de cada uno se comprobó en el propio repositorio el 3 de octubre de 2026.

| Instrumento de la app | Banco de origen | Licencia | Dónde consta |
| --- | --- | --- | --- |
| Piano de cola (`piano`) | Splendid Grand Piano | Dominio público | README.md («Public Domain samples by AKAI») |
| Sección de cuerda (`cuerdas`) | VSCO 2: Community Edition | CC0-1.0 | LICENSE (CC0 1.0 Universal) |
| Batería (`bateria`) | Virtuosity Drums | CC0-1.0 | LICENSE (CC0 1.0 Universal) |
| Bajo eléctrico (`bajo-electrico`) | Growlybass | CC0-1.0 | LICENSE (CC0 1.0 Universal) |

### Splendid Grand Piano

- Repositorio: https://github.com/sfzinstruments/SplendidGrandPiano
- Commit: `1c595d827b7fd7f0be3134aaed0f90b3662a09cf`
- Autores: muestras de un Steinway publicadas por AKAI; conversión a FLAC y mapeo SFZ de kinwie.
- Licencia: Dominio público.
- Qué se usa: 27 muestras de la capa *mezzoforte*, una cada tres semitonos o más, y el mapa de notas de `Data/MF.txt`.
- El repositorio pide indicar la procedencia si se redistribuye un derivado de su SFZ: queda indicada aquí.

### VSCO 2: Community Edition

- Repositorio: https://github.com/sgossner/VSCO-2-CE
- Commit: `440300901dfe9275fd84e0b7763af1f8443ae62e`
- Autores: Versilian Studios; grabación de Sam Gossner y Simon Dalzell; corte de muestras de Elan Hickler (Soundemote).
- Licencia: CC0-1.0.
- Qué se usa: 20 notas sostenidas con vibrato de contrabajo, violonchelo y sección de violines, que juntas forman la «sección de cuerda».

### Virtuosity Drums

- Repositorio: https://github.com/sfzinstruments/virtuosity_drums
- Commit: `9f04cf9a734527edfbb0a4eee1f674e45bbf71bc`
- Autores: Versilian Studios; batería tocada por Austin McMahon y grabada en Virtuosity Musical Instruments (Boston).
- Licencia: CC0-1.0.
- Qué se usa: 16 golpes de bombo, caja, aro, charles, toms y platos, mezclando los micrófonos de bombo, de caja y aéreos.

### Growlybass

- Repositorio: https://github.com/sfzinstruments/karoryfer.growlybass
- Commit: `4f483268fc66b5a6d5781d421c0d11b8d08d3fc6`
- Autores: Karoryfer Lecolds (Squier Jazz Bass grabado por línea).
- Licencia: CC0-1.0.
- Qué se usa: 13 notas sostenidas tocadas fuerte, una cada tres semitonos.

### Qué se les hace a las muestras

Las muestras no se redistribuyen tal cual. El proceso (`scripts/muestras/construir.ts`) las recorta, comprueba su afinación y corrige las desviaciones, hornea un bucle con fundido cruzado en las notas sostenidas de cuerda, iguala los niveles y las codifica en Ogg Opus mono a 48 kHz. El resultado está en `public/samples` (2 MB en total) y las medidas de cada muestra, en `informes/muestras`.

### Sonidos sintetizados

Los instrumentos de chip (`chip-pulso`, `chip-triangulo`) y los sonidos de la interfaz se sintetizan en el dispositivo con osciladores de Web Audio (`src/audio/nativo.ts`, `src/audio/sonidos.ts`). No usan ninguna muestra.

### Bancos descartados

Para que no se vuelvan a proponer sin revisar:

- Los bancos que smplr descarga por defecto de sus servidores no se usan: Leitmotiv aloja sus propias muestras y usa smplr solo como reproductor. Al revisarlos en origen, dos no servían: las muestras del piano eléctrico jRhodes3d son CC BY-NC (uso no comercial), aunque algún listado las da por CC0, y el SoundFont MusyngKite es CC BY-SA.
- Antes de añadir un instrumento, la licencia se comprueba en el repositorio de origen, no en listados de terceros.

## Tipografías

Se sirven desde la propia app (paquetes de Fontsource) y todas tienen la licencia SIL Open Font License 1.1.

| Tipografía | Titulares de los derechos | Licencia | Paquete |
| --- | --- | --- | --- |
| Big Shoulders Display | The Big Shoulders Project Authors (https://github.com/xotypeco/big_shoulders) | OFL-1.1 | `@fontsource-variable/big-shoulders-display` |
| Archivo | The Archivo Project Authors (https://github.com/Omnibus-Type/Archivo) | OFL-1.1 | `@fontsource-variable/archivo` |

La fuente de signos musicales (`src/ui/fuentes/leitmotiv-signos.otf`: sostenido, bemol y becuadro) es un dibujo propio, generado por `scripts/fuentes/signos.ts`. No deriva de ninguna otra fuente.

## Iconos e ilustraciones

Los iconos, el emblema, los iconos de la app y el mapa del mundo en píxeles (terreno, árboles, casas y castillo) son dibujos propios, hechos por código en `src/ui` y `scripts/iconos.ts`. No se usa ninguna librería de iconos ni imagen de terceros.

## Librerías que viajan en la app

| Librería | Para qué | Licencia |
| --- | --- | --- |
| `react`, `react-dom` | Interfaz | MIT |
| `zustand` | Estado de la interfaz | MIT |
| `tone` | Transporte y planificación del audio, efectos | MIT |
| `smplr` | Reproductor de los instrumentos muestreados | MIT |
| `tonal` | Teoría musical: notas, intervalos, escalas y acordes | MIT |
| `dexie` | Progreso en el dispositivo (IndexedDB) | Apache-2.0 |
| `ts-fsrs` | Repaso espaciado (FSRS) | MIT |
| `@tonejs/midi` | Exportación a MIDI (trae `midi-file` y `array-flatten`, MIT) | MIT |
| `abcjs` | Vista de pentagrama | MIT |
| `motion` | Entrada de las pantallas (trae `framer-motion`, `motion-dom` y `motion-utils`, MIT, y `tslib`, 0BSD) | MIT |

El service worker lo generan `vite-plugin-pwa` y Workbox (MIT), que dejan en la app publicada una pequeña parte de su código.

## Herramientas de desarrollo

No viajan en la app: Vite, TypeScript, Vitest, Playwright, oxlint, zod, yaml, marked, sharp, tsx, opentype.js, happy-dom y fake-indexeddb, cada una con su licencia (MIT, Apache-2.0 o ISC). Las muestras se procesan con ffmpeg, que hay que tener instalado para regenerar el banco de sonidos o para la verificación de audio.
