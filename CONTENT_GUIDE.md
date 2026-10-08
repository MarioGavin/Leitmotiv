# Guía de contenido

Todo lo que Leitmotiv enseña está en la carpeta `content/`, en archivos YAML. **Añadir o cambiar una lección no exige tocar código.** Esta guía explica cómo se organiza el contenido, cómo se escribe la música y qué campos admite cada tipo de paso.

La referencia exacta de cada campo son los esquemas de `src/contenido/esquemas.ts`. Si esta guía y los esquemas no coinciden, mandan los esquemas (y hay que corregir la guía).

## Contenido

- [Cómo se trabaja](#cómo-se-trabaja)
- [Organización: mundos, unidades y lecciones](#organización-mundos-unidades-y-lecciones)
- [La regla sobre obras existentes](#la-regla-sobre-obras-existentes)
- [Textos](#textos)
- [Piezas: cómo se escribe la música](#piezas-cómo-se-escribe-la-música)
- [Pasos de una lección](#pasos-de-una-lección)
- [Requisitos de piano roll y de encargo](#requisitos-de-piano-roll-y-de-encargo)
- [Conceptos, glosario, fichas y prueba de nivel](#conceptos-glosario-fichas-y-prueba-de-nivel)
- [Qué comprueba el compilador](#qué-comprueba-el-compilador)
- [Cómo se escribe una buena lección](#cómo-se-escribe-una-buena-lección)
- [Errores frecuentes al escribir](#errores-frecuentes-al-escribir)
- [Cómo se ve y se prueba una lección](#cómo-se-ve-y-se-prueba-una-lección)

## Cómo se trabaja

```bash
npm run content:check    # valida todo el contenido sin escribir nada (es lo que corre en CI)
npm run content:build    # valida y escribe public/content, que es lo que lee la app
npm run dev              # compila el contenido y arranca la app
npm run audio:check      # renderiza todos los ejemplos y mide que suenan como dicen
```

El compilador (`scripts/contenido`) lee los YAML, los valida con zod, convierte la música a notas con tiempos exactos y comprueba con Tonal que la música es coherente con lo que dice: que las notas están en la tonalidad declarada, que los acordes escritos son los que suenan, que cada compás está completo, que un bucle cierra. Si algo falla, dice en qué archivo, en qué paso y en qué campo, y no se publica nada.

Con la extensión de YAML de Red Hat, VS Code autocompleta y subraya los errores mientras se escribe (`.vscode/settings.json` ya apunta a los esquemas de `content/.esquemas/`). Esos esquemas se regeneran con `npm run content:schemas` cuando cambia `esquemas.ts`; una prueba avisa si se quedan atrás.

## Organización: mundos, unidades y lecciones

```
content/
  conceptos.yaml              conceptos que entrena el curso (para el repaso)
  glosario.yaml               términos y definiciones
  fichas/                     fichas de consulta rápida, una por archivo
  prueba-de-nivel.yaml        prueba inicial (opcional)
  mundos/
    m00-repaso/
      mundo.yaml
      u01-pulso-y-compas/
        unidad.yaml
        l01-el-pulso.yaml
        l02-el-tempo.yaml
```

La jerarquía es **Mundo › Unidad › Lección › Paso**. Los identificadores salen de los nombres de carpeta y de archivo: la lección `l02-el-tempo.yaml` de la unidad `u01-…` del mundo `m00-…` es `m00.u01.l02`. Solo cuentan el prefijo y el número; el resto del nombre es para las personas. El orden es el de los números.

### `mundo.yaml`

| Campo | Obligatorio | Qué es |
| --- | --- | --- |
| `titulo` | sí | Nombre del mundo, hasta 60 caracteres |
| `lema` | sí | Frase corta que aparece en el mapa, hasta 90 caracteres |
| `descripcion` | sí | Uno o dos párrafos: qué se aprende ([texto](#textos)) |

### `unidad.yaml`

| Campo | Obligatorio | Qué es |
| --- | --- | --- |
| `titulo` | sí | Nombre de la unidad |
| `objetivo` | sí | Qué sabrá hacer el usuario al acabarla |
| `estado` | no | `publicada` (por defecto) o `borrador` |

Una unidad **publicada** tiene que tener al menos **ocho lecciones** y su última lección tiene que acabar en un **encargo de compositor**. Mientras se escribe, se marca con `estado: borrador` y esas dos reglas no se aplican.

### Lección (`lNN-nombre.yaml`)

| Campo | Obligatorio | Qué es |
| --- | --- | --- |
| `titulo` | sí | Hasta 60 caracteres |
| `resumen` | sí | Una frase: qué sabrá hacer el usuario al terminar |
| `minutos` | sí | Duración estimada, de 3 a 12. Fuera de 5–10, el compilador avisa |
| `conceptos` | sí | Conceptos que introduce o practica (claves de `conceptos.yaml`) |
| `pasos` | sí | De 3 a 16 [pasos](#pasos-de-una-lección) |

Una lección tiene que tener algún ejercicio, no puede encadenar tres pasos de teoría seguidos (aviso) y, si lleva un encargo, es su último paso.

## La regla sobre obras existentes

**Todo ejemplo sonoro y toda partitura de la app es una composición original.** No se transcriben ni se reproducen melodías, progresiones identificables ni letras de obras con derechos. Las bandas sonoras de referencia se nombran para que el usuario las escuche por su cuenta, y se analizan por sus técnicas («un ostinato de corcheas sobre un pedal de tónica»), nunca copiando sus notas.

Esto no lo puede comprobar ninguna herramienta: es responsabilidad de quien escribe la lección.

## Textos

Los campos de texto (`texto`, `enunciado`, `pista`, `explicacion`, `descripcion`…) admiten un Markdown reducido: párrafos, listas, `**negrita**` y `*cursiva*`. Nada más: ni títulos, ni enlaces, ni imágenes, ni tablas, ni código.

Además hay unas marcas propias. Sirven para que la app muestre los nombres de las notas como el usuario haya elegido (Do, Re, Mi o C, D, E) y para enlazar con el glosario:

| Marca | Se ve como | Notas |
| --- | --- | --- |
| `{n:C4}` | Do4 o C4 | Nota. También sin octava: `{n:F#}` |
| `{a:Cmaj7}` | Cmaj7 | Acorde, siempre en cifrado americano |
| `{t:D mayor}` | Re mayor o D mayor | Tonalidad |
| `{i:3M}` | 3.ª mayor | Intervalo. Los justos se escriben con J o con P: `4J`, `5P` |
| `{g:V7}` | V7 | Grado en cifra romana: `I`, `ii`, `V7`, `vii°`, `bVII` |
| `[[sincopa]]` | síncopa (enlace) | Término del glosario. Con otro texto: `[[sincopa\|las síncopas]]` |

Las notas se escriben siempre en notación científica (Do central = `C4`) y las tonalidades como tónica en letra y modo en español. El compilador valida todas las marcas: una nota imposible, un acorde que Tonal no conoce o un término que no está en el glosario son errores.

Modos admitidos en una tonalidad: `mayor`, `menor`, `menor armonica`, `menor melodica`, `jonico`, `dorico`, `frigio`, `lidio`, `mixolidio`, `eolico`, `locrio`, `pentatonica mayor`, `pentatonica menor`, `blues`, `frigio dominante`, `tonos enteros` y `cromatica` (se escriben sin tildes).

## Piezas: cómo se escribe la música

Un ejemplo, un ejercicio o una plantilla de piano roll son siempre una **pieza**: tempo, compás, tonalidad y una o varias pistas. Es el mismo formato en toda la app.

```yaml
ejemplo:
  titulo: Camino de la pradera   # opcional
  tempo: 104                     # negras por minuto, de 30 a 300
  compas: 4/4                    # por defecto, 4/4
  tonalidad: D mayor             # opcional, pero casi siempre conviene
  compases: 4                    # se comprueba contra lo escrito en cada pista
  bucle: true                    # la pieza está pensada para repetirse
  acordes: "D:1 | G:2 A:2 | Bm:1 | G:2 A:2"
  pistas:
    - rol: melodia
      instrumento: piano
      notas: "A4:4 D5:4 F#5:4. E5:8 | D5:4 B4:4 A4:4 C#5:4 | D5:4. F#5:8 E5:4 D5:4 | B4:4 G4:4 A4:4. C#5:8"
    - rol: colchon
      instrumento: cuerdas
      notas: "[A3 D4 F#4]:1 | [B3 D4 G4]:2 [A3 C#4 E4]:2 | [B3 D4 F#4]:1 | [B3 D4 G4]:2 [A3 C#4 E4]:2"
    - rol: percusion
      instrumento: bateria
      rejilla:
        paso: "8"
        lineas:
          charles: "xoxoxoxo"
          caja: "..x...x."
          bombo: "x..x.x.."
```

### Campos de una pieza

| Campo | Obligatorio | Qué es |
| --- | --- | --- |
| `tempo` | sí | Negras por minuto (30–300) |
| `compases` | sí | Longitud en compases (1–64) |
| `pistas` | sí | Al menos una |
| `compas` | no | `4/4`, `3/4`, `6/8`… Por defecto, `4/4` |
| `tonalidad` | no | `D mayor`, `A menor`, `E frigio`… |
| `titulo` | no | Nombre de la pieza |
| `bucle` | no | `true` si se repite sin fin |
| `swing` | no | De 0 (recto) a 1 (tresillo): cuánto se retrasan las corcheas a contratiempo al sonar. Se escribe recto, como en una partitura de jazz; lo demás lo hace el motor. No va al MIDI exportado |
| `acordes` | no | [Línea de acordes](#acordes) |
| `secciones` | no | Lista de `{ id, desde, hasta }` en compases, con `nombre` opcional. El `id` es una letra o un nombre corto: `A`, `B`, `intro` |
| `cromatismos` | no | Notas ajenas a la tonalidad que son intencionadas: `[C, Bb]` |

### Campos de una pista

| Campo | Obligatorio | Qué es |
| --- | --- | --- |
| `rol` | sí | `melodia`, `contramelodia`, `armonia`, `colchon`, `bajo`, `percusion` o `efecto`. Decide el color y el nivel en la mezcla |
| `instrumento` | sí | Uno del [catálogo](#instrumentos) |
| `notas` | una de las dos | [Taquigrafía](#taquigrafía-de-notas). Cadena vacía `""` para una pista que rellenará el usuario |
| `rejilla` | una de las dos | [Rejilla de percusión](#rejilla-de-percusión) |
| `id` | no | Identificador dentro de la pieza. Por defecto, el rol. Hace falta si hay dos pistas con el mismo rol |
| `nombre` | no | Nombre visible |
| `matiz` | no | Matiz inicial: `pp`, `p`, `mp`, `mf` (por defecto), `f`, `ff` |
| `volumen` | no | Ajuste en dB, de −24 a 6 |
| `paneo` | no | De −1 (izquierda) a 1 (derecha) |
| `capa` | no | Capa de música adaptativa a la que pertenece (para los pasos de [capas](#6-mezcla-por-capas-tipo-capas)) |

### Instrumentos

| Identificador | Qué es | Registro |
| --- | --- | --- |
| `piano` | Piano de cola | La0 a Do8 (`A0`–`C8`) |
| `cuerdas` | Sección de cuerda, notas sostenidas | Mi1 a Do7 (`E1`–`C7`) |
| `bajo-electrico` | Bajo eléctrico | Mi1 a Sol4 (`E1`–`G4`) |
| `bateria` | Batería acústica | Piezas por nombre (ver abajo) |
| `chip-pulso` | Onda de pulso de 8 bits, una sola nota a la vez | La1 a Do8 (`A1`–`C8`) |
| `chip-triangulo` | Onda triangular de 8 bits, una sola nota a la vez | Do1 a Do7 (`C1`–`C7`) |

El catálogo está en `src/musica/instrumentos.ts`. Una nota fuera del registro de su instrumento es un error.

Piezas de la batería, con el rótulo que llevan en la rejilla y en el piano roll:

| Se escribe | Se rotula | Qué es |
| --- | --- | --- |
| `bombo` | Bombo | Bombo |
| `aro` | Aro | Golpe de aro: seco, más corto que la caja |
| `caja` | Caja | Caja |
| `charles` | Charles | Charles cerrado, con la baqueta |
| `charles_pedal` | Pedal | Charles con el pie |
| `charles_abierto` | Abierto | Charles abierto |
| `tom_grave`, `tom_agudo` | Tom gr., Tom ag. | Toms |
| `crash`, `ride`, `campana` | Crash, Ride, Campana | Platos y campana del ride |

Si el texto nombra una pieza, que sea la que suena y la que se ve rotulada: «el pedal del charles (la fila «Pedal»)», no «el charles».

### Taquigrafía de notas

Cada evento se escribe `qué:figura`, separado por espacios. Las barras `|` separan compases y **cada compás tiene que estar completo**: si le falta o le sobra tiempo, el compilador lo dice con el número de compás.

| Se escribe | Significa |
| --- | --- |
| `C4:4` | Do4, negra |
| Figuras | `1` redonda, `2` blanca, `4` negra, `8` corchea, `16` semicorchea, `32` fusa |
| `C4:4.` | Con puntillo (`..` doble puntillo) |
| `C4:8t` | Figura de tresillo: tres ocupan lo que dos |
| `[C4 E4 G4]:2` | Varias notas a la vez |
| `r:4` | Silencio |
| `C4:2~ \| C4:2` | Ligadura: une la nota con la siguiente de la misma altura |
| `C4:4>` | Acento (16 puntos más de velocidad) |
| `!p`, `!f`… | Cambia el matiz desde ahí: `pp` 40, `p` 56, `mp` 72, `mf` 88, `f` 104, `ff` 120 (velocidad MIDI) |
| `%` | Repite el compás anterior |
| `?:2` | Hueco que rellenará el usuario (solo en ejercicios de construcción) |
| `caja:4` | En percusión, el nombre de la pieza en lugar de la nota |

Alteraciones: `#` sostenido y `b` bemol (`F#4`, `Bb3`). El Do central es `C4`.

### Rejilla de percusión

Para la batería suele ser más cómodo dibujar el patrón:

```yaml
rejilla:
  paso: "16"                 # figura de cada casilla
  lineas:
    charles: "x.x.x.x.x.x.x.x."
    caja:    "....X.......X..."
    bombo:   "x.......x.x....."
```

`x` es un golpe, `X` un golpe acentuado, `o` un golpe flojo y `.` un silencio. Cada línea tiene que ocupar compases enteros y se repite hasta llenar la pieza. Se pueden poner barras `|` o espacios para leerla mejor.

### Acordes

La línea de acordes usa la misma idea: `símbolo:figura`, con barras de compás.

```yaml
acordes: "D:1 | G:2 A:2 | % | Bm:2 A7:2"
```

`%` repite el compás anterior, `-` deja un tramo sin acorde y `?` deja un hueco (solo en ejercicios de elegir acorde). Los símbolos son cifrado americano tal como lo entiende Tonal: `C`, `Am`, `G7`, `Cmaj7`, `Dm7b5`, `F/A`…

Los acordes escritos **se comprueban contra lo que suena**: las pistas de armonía (`armonia`, `colchon`) solo pueden tocar notas del acorde, y si tocan tres o más notas distintas tienen que formar ese acorde. Si el bajo no entra en la fundamental, el compilador avisa (si es una inversión, se escribe en el cifrado: `D/F#`).

## Pasos de una lección

Hay un paso de teoría y siete tipos de ejercicio. Cada paso es un elemento de la lista `pasos` y se distingue por su `tipo` (y, en algunos, por su `modo`).

Todos los ejercicios llevan estos campos, que son obligatorios:

| Campo | Qué es |
| --- | --- |
| `enunciado` | Qué hay que hacer, en una frase |
| `pista` | Ayuda que se muestra si se pide: orienta sin dar la respuesta |
| `explicacion` | Por qué la respuesta correcta lo es. Se muestra al fallar |
| `concepto` | (Opcional) Concepto que entrena. Por defecto, el primero de la lección |

### Teoría (`tipo: teoria`)

Un texto corto y un ejemplo que suena. **La teoría sin ejemplo sonoro no se admite**, salvo que se justifique.

| Campo | Qué es |
| --- | --- |
| `texto` | El texto (obligatorio). Dos párrafos como mucho |
| `titulo` | Título del paso |
| `ejemplo` | Una [pieza](#piezas-cómo-se-escribe-la-música) |
| `manipulable` | Qué puede tocar el usuario: `tempo`, `transposicion`, `pistas`, `instrumento`. Por defecto, `[tempo]` |
| `vista` | Cómo se dibuja: `pianoroll` (por defecto), `pentagrama`, `teclado`, `rejilla` |
| `sinEjemplo` | Motivo por el que este paso no lleva ejemplo. Sin `ejemplo` y sin `sinEjemplo`, es un error |

### 1. Oído (`tipo: oido`)

Según `modo`:

| Modo | Qué se pregunta | Campos propios |
| --- | --- | --- |
| `intervalo` | Qué intervalo suena | `intervalos` (2–8, como `3M`, `5J`), `direcciones` (`ascendente`, `descendente`, `armonico`), `registro`, `instrumento`, `rondas` |
| `acorde` | Qué tipo de acorde suena | `calidades` (2–8: `M`, `m`, `dim`, `aug`, `7`, `maj7`, `m7`…), `presentacion` (`bloque`, `arpegio`, `ambos`), `inversiones`, `registro`, `instrumento`, `rondas` |
| `progresion` | Qué progresión suena | `tonalidades`, `progresiones` (2–6, en grados: `"I IV V I"`), `tempo`, `instrumento`, `rondas` |
| `escala` | Qué escala o modo suena | `escalas` (2–8), `tonicas`, `presentacion` (`escala`, `melodia`), `instrumento`, `rondas` |
| `timbre` | Qué instrumento suena | `instrumentos` (2–8, afinados), `frase` (taquigrafía), `tempo`, `compas`, `rondas` |
| `contorno` | Si la segunda nota sube, baja o se queda | `intervalos`, `incluirIgual`, `registro`, `instrumento`, `rondas` |
| `compas` | En qué compás está | `compases` (2–5), `tempo`, `rondas` |
| `preguntas` | Preguntas escritas a mano sobre un fragmento | `preguntas` (1–12) |

En los modos que generan las preguntas solos:

- `rondas` es el número de preguntas: de 1 a 20, 5 por defecto.
- `registro` (en `intervalo`, `acorde` y `contorno`) son las dos notas entre las que se mueven las preguntas, la grave primero: `[C4, C5]`. Por defecto, `[C3, C5]`. Tienen que caber en el instrumento.
- `instrumento` es el que suena: `piano` por defecto (en `timbre`, los que se comparan).
- `tempo`, donde lo hay: 84 BPM por defecto en `progresion`, 96 en `timbre` y 100 en `compas`.
- En `escala`, `tonicas` son las notas desde las que puede empezar (por defecto Do, Re, Fa, Sol y La) y `presentacion` decide si suena la escala subiendo (`escala`) o una melodía hecha con ella (`melodia`).
- En `acorde`, `presentacion` puede ser `bloque` (todas a la vez, por defecto), `arpegio` o `ambos`, e `inversiones: true` añade acordes invertidos.

En el modo `preguntas`, cada pregunta lleva su `pieza`, de 2 a 5 `opciones`, la posición de la `correcta` (**empezando en 1**) y una `explicacion` opcional:

```yaml
- tipo: oido
  modo: preguntas
  enunciado: ¿A qué velocidad va el pulso?
  pista: Camina con dos dedos al ritmo del bombo.
  explicacion: Entre 60 y 80 BPM la música camina despacio; por encima de 150 corre.
  preguntas:
    - opciones: [Lento, Medio, Rápido]
      correcta: 1
      explicacion: Va a 66 BPM.
      pieza:
        tempo: 66
        compases: 2
        pistas:
          - rol: percusion
            instrumento: bateria
            rejilla: { paso: "4", lineas: { bombo: "x.x.", aro: ".x.x" } }
```

### 2. Ritmo (`tipo: ritmo`)

El usuario toca un patrón con el dedo y se mide su precisión.

| Campo | Qué es |
| --- | --- |
| `modo` | `seguir` (tocar con el patrón sonando), `eco` (escuchar y repetir) o `leer` (tocar leyendo, sin oírlo antes) |
| `tempo` | De 40 a 200 |
| `patron` | `x` golpe, `X` acento, `.` silencio. Tiene que ocupar compases enteros |
| `paso` | Figura de cada casilla. Por defecto, `16` |
| `compas` | Por defecto, `4/4` |
| `cuentaAtras` | Compases de claqueta: 1 (por defecto) o 2 |
| `repeticiones` | De 1 a 8. Por defecto, 2 |
| `tolerancia` | `amplia`, `normal` (por defecto) o `estricta` |
| `guia` | Qué suena mientras el usuario toca: `patron` (el patrón entero), `claqueta` (un clic en cada tiempo), `compas` (solo el primer tiempo de cada compás) o `nada`. Por defecto, `patron` en el modo `seguir` y `claqueta` en los otros dos. Con `guia: patron` en `eco` o `leer` el ejercicio se convierte en seguir: no tiene sentido |

En el modo `eco` se alternan, tantas veces como diga `repeticiones`, una vuelta en la que suena el patrón (con la claqueta) y otra en la que toca el usuario, con lo que diga `guia`; la rejilla no enseña el patrón hasta corregir. En `leer`, el patrón se ve desde el principio y no suena nunca. Los toques se miden contra el reloj del audio y se les resta el retardo que el usuario haya calibrado.

### 3. Construcción guiada (`tipo: construccion`)

| Modo | Qué hace el usuario | Campos propios |
| --- | --- | --- |
| `completar-melodia` | Elige el fragmento que completa una melodía | `pieza` con un único hueco `?:figura` en una pista; `opciones` (2–4) con `notas`, `correcta` y `porque` |
| `elegir-acorde` | Elige el acorde que falta | `pieza` cuya línea de `acordes` tiene un único hueco `?:figura`; `opciones` (2–4) con `acorde`, `correcta` y `porque` |
| `ordenar-secciones` | Ordena las secciones de una pieza | `pieza` con al menos tres `secciones`; el orden correcto es el de la propia pieza |

Cada opción explica en `porque` por qué funciona o por qué no. Las opciones tienen que durar lo mismo que el hueco, y tiene que haber al menos una correcta y una incorrecta.

### 4. Piano roll (`tipo: pianoroll`)

El usuario escribe en la rejilla a partir de una plantilla.

| Campo | Qué es |
| --- | --- |
| `plantilla` | Pieza de partida. Las pistas con `notas: ""` empiezan vacías |
| `editables` | Identificadores de las pistas que el usuario puede tocar |
| `requisitos` | Al menos uno: [qué se comprueba](#requisitos-de-piano-roll-y-de-encargo) |

### 5. Análisis (`tipo: analisis`)

Una `pieza` y de 1 a 6 `preguntas` sobre ella. Según `sobre`:

| `sobre` | La respuesta correcta | Campos |
| --- | --- | --- |
| `tonalidad` | La tonalidad de la pieza | `opciones` (2–4 tonalidades) |
| `compas` | El compás de la pieza | `opciones` (2–4 compases) |
| `forma` | La sucesión de secciones: `AABA` | `opciones` (2–4 formas) |
| `funcion` | Tónica, subdominante o dominante del acorde de un compás | `compas` |
| `acorde` | El acorde que suena en un compás | `compas`, `opciones` (2–4) |
| `libre` | La que se indique | `pregunta`, `opciones`, `correcta` (desde 1) y `explicacion` |

Salvo en `libre`, **la respuesta correcta la calcula el compilador a partir de la pieza** y tiene que estar entre las opciones: no se puede escribir una respuesta que contradiga la música.

### 6. Mezcla por capas (`tipo: capas`)

Música adaptativa: capas verticales (pistas que entran y salen) y resecuenciación horizontal (secciones que se repiten según el estado del juego).

| Campo | Qué es |
| --- | --- |
| `pieza` | Un bucle cuyas pistas declaran su `capa` |
| `capas` | Nombre visible de cada capa: `{ base: Base, tension: Tensión }` |
| `estados` | De 2 a 5 estados de juego: `id`, `nombre`, `capas` que suenan y, si procede, la `seccion` que se repite |
| `transicion` | `cuando` cambia (`inmediato`, `tiempo`, `compas`, `seccion`) y segundos de `fundido`. Por defecto, al compás y 0,5 s |
| `situaciones` | De 1 a 6 situaciones de juego que el usuario empareja con un estado: `texto`, `estado` y `porque` |

### 7. Encargo de compositor (`tipo: encargo`)

El final de cada unidad: un encargo como el que haría un estudio, que el usuario compone en el piano roll y que se valida con reglas. La pieza queda en «Mi repertorio».

| Campo | Qué es |
| --- | --- |
| `titulo` | Nombre del encargo |
| `brief` | El encargo tal como lo escribiría un estudio |
| `cliente` | (Opcional) Quién lo pide, para ambientar |
| `pista`, `explicacion` | Como en cualquier ejercicio. La explicación se muestra al entregar |
| `plantilla` | (Opcional) Pieza de partida |
| `requisitos` | Al menos tres |

## Requisitos de piano roll y de encargo

Cada requisito es una línea de la lista de comprobación que el usuario ve cumplirse o no, con su explicación.

| `regla` | Qué comprueba | Campos |
| --- | --- | --- |
| `tonalidad` | Que las notas pertenezcan a una de estas tonalidades | `valores`, `minimo` (proporción de notas, 0,9 por defecto) |
| `compas` | El compás | `valor` |
| `compases` | La longitud | `valor` |
| `tempo` | Que el tempo esté en un margen | `min`, `max` |
| `pistas` | Que existan pistas con estos papeles | `roles` |
| `notas-minimas` | Un mínimo de notas en una pista | `pista` (un rol), `valor` |
| `rango` | Que una pista no se salga de un registro | `pista`, `min`, `max` (notas) |
| `densidad` | Notas por compás de una pista | `pista`, `min` y/o `max` |
| `polifonia` | Máximo de notas a la vez | `pista`, `max` |
| `bucle` | Que el bucle cierre: nada suena más allá del final y la melodía vuelve sin un salto brusco | — |
| `estructura` | La forma | `forma` (`AABA`), `compasesPorSeccion` |
| `empieza-en`, `termina-en` | El grado de la escala de la primera o la última nota | `pista`, `grados` (1–7) |
| `instrumentos` | Qué instrumentos se pueden usar | `permitidos` |

## Conceptos, glosario, fichas y prueba de nivel

### `conceptos.yaml`

Los conceptos son la unidad del repaso espaciado: cada ejercicio entrena uno y el repaso programa los que más se fallan.

```yaml
pulso:
  nombre: Pulso
  definicion: El latido regular que sostiene la música. Sigue ahí aunque nadie lo toque.
```

Un concepto que ningún ejercicio entrena produce un aviso.

### `glosario.yaml`

```yaml
bucle:
  termino: Bucle
  definicion: Fragmento de música pensado para repetirse sin fin y sin que se note la costura.
  ver: [compas]          # términos relacionados
  ejemplo: { … }         # una pieza, opcional
```

Se enlaza desde cualquier texto con `[[bucle]]`.

### Fichas (`fichas/nombre.yaml`)

Fichas de consulta rápida: `titulo`, `resumen` y una lista de `bloques`, cada uno con `titulo`, `texto` y, si conviene, un `ejemplo`.

### `prueba-de-nivel.yaml`

Una lista de bloques, uno por unidad que se puede saltar:

```yaml
- unidad: m00.u01
  aprobado: 0.8          # proporción de aciertos (por defecto, 0,8)
  pasos: [ … ]           # de 2 a 8 ejercicios de oído, ritmo, construcción o análisis, cada uno con su `concepto`
```

## Qué comprueba el compilador

Además de la forma de cada archivo (esquemas), comprueba la música y el conjunto. Los errores impiden publicar; los avisos no, salvo con `--estricto`.

**Música (cada pieza)**

- Cada compás está completo y todas las pistas y la línea de acordes duran lo que declara `compases`.
- Las notas caben en el registro de su instrumento.
- Las notas pertenecen a la tonalidad declarada (salvo las listadas en `cromatismos`; en menor se admiten el sexto y el séptimo grado elevados).
- Los acordes escritos coinciden con lo que tocan las pistas de armonía.
- Un bucle cierra: nada queda sonando más allá del final (error); la melodía no vuelve con más de una octava de salto y el último compás no está vacío (avisos).
- Un canal de chip no toca dos notas a la vez.
- Las secciones caen dentro de la pieza y no se pisan.

**Ejercicios**

- Las opciones no se repiten; hay al menos una correcta y una incorrecta.
- La respuesta correcta sale de la pieza y está entre las opciones (análisis).
- El hueco es único y las opciones lo llenan exactamente (construcción).
- Los registros, las tonalidades, los intervalos, los acordes y los grados existen y caben en el instrumento.
- En un ejercicio de capas, la pieza es un bucle, cada pista declara su capa y cada estado usa capas y secciones que existen.

**Conjunto**

- Una unidad publicada tiene al menos ocho lecciones y acaba en un encargo.
- Una lección tiene algún ejercicio, como mucho un encargo, y es el último paso.
- Los conceptos y los términos del glosario que se citan existen.
- Avisos: tres pasos de teoría seguidos, duración fuera de 5–10 minutos, concepto sin ningún ejercicio.

La verificación de audio (`npm run audio:check`) va un paso más allá: renderiza cada ejemplo con el motor real y mide que no satura, que no queda en silencio y qué sonoridad tiene.

## Cómo se escribe una buena lección

- **De cinco a diez minutos.** Entre cinco y ocho pasos suele bastar.
- **Teoría mínima.** Dos párrafos y un ejemplo que se oye y se toca. Si hace falta más texto, es otra lección.
- **Primero se oye, luego se nombra.** El ejemplo va con la primera mención de la idea, no después.
- **Cada idea, un ejercicio.** Después de cada paso de teoría, uno que la practique.
- **La pista orienta; la explicación enseña.** La pista dice dónde mirar o cómo escuchar. La explicación dice por qué la respuesta es la que es, de modo que sirva también a quien ha fallado.
- **Con oído de videojuego.** Los ejemplos se justifican por lo que hacen en un juego: qué pide una mazmorra, un combate, una tienda.
- **De tú, en frases cortas.** Español de España. Los términos técnicos, enlazados al glosario la primera vez que salen.
- **Cada unidad acaba en un encargo**, con al menos tres requisitos que se puedan comprobar con reglas. Ponle plantilla (las pistas que ya «vienen del estudio» y las vacías que escribe el usuario) y comprueba que se puede cumplir todo: las pruebas de navegador escriben los tres encargos del Mundo 0 nota a nota (`e2e/encargos.spec.ts`), y conviene hacer lo mismo con los nuevos.
- **El enunciado es un titular.** Se ve en mayúsculas y en letra grande: una frase corta, de una o dos líneas en el móvil. Lo largo va en la pista, la explicación o un paso de teoría.

## Errores frecuentes al escribir

Aprendido al escribir el Mundo 0:

- **«: » dentro de un texto sin comillas.** El YAML lo lee como otra clave y el error sale lejos. O se entrecomilla el valor o se usa el bloque `|`.
- **Un valor que empieza por una marca.** `{n:D5} a {n:A5}…` sin comillas es un objeto de YAML, no un texto. Se entrecomilla: `explicacion: "{n:D5} a {n:A5}: siete semitonos."`. Lo mismo en las listas: `opciones: ["{i:3M}", "{i:4J}"]`.
- **Nombrar dos veces.** `{i:3M}` ya se lee «3.ª mayor» y `{t:C mayor}`, «Do mayor»: no hace falta escribir el nombre al lado.
- **Texto que no coincide con lo que suena.** Si el texto dice «bombo», tiene que sonar el bombo; si dice «charles», la fila tiene que ser la del charles. Antes de dar una lección por buena, se escucha cada ejemplo con el texto delante (y se apunta en AUDIO_REVIEW.md lo que no se ha podido oír).
- **Opciones que se leen igual.** En `completar-melodia`, cada opción se enseña por sus notas («Fa♯5 – Mi5»). Si dos tienen las mismas notas y solo cambia el ritmo, la app añade a todas la figura de cada nota y los silencios («Do5 negra – silencio de negra»), pero es mejor que se distingan también al leerlas.

## Cómo se ve y se prueba una lección

- `npm run content:check` tiene que acabar con cero errores y cero avisos.
- `npm run shots -- --ruta=#/leccion/m00.u01.l03/1,#/leccion/m00.u01.l03/2` saca capturas de esos pasos en los dos esquemas y los dos tamaños, con todas las lecciones hechas (en Git Bash, con `MSYS_NO_PATHCONV=1` delante). Mira sobre todo el tamaño pequeño (360 × 640).
- `e2e/contenido.spec.ts` abre cada paso de cada lección real a 360 × 640 y falla si hay un error en la consola, si algo se sale por los lados o si el pie (con sus botones) queda fuera de la vista. Cubre las lecciones nuevas sin escribir otra prueba, pero no hace los ejercicios.
- `npm run audio:check` renderiza los ejemplos y mide que suenan (necesita ffmpeg). Lo que hay que juzgar de oído va a AUDIO_REVIEW.md.
