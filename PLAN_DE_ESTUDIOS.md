# Plan de estudios: mapa de unidades

El mapa del curso entero, del Mundo 1 al proyecto final: las unidades de cada mundo (título y objetivo) y, en cada unidad, ocho lecciones con una línea de lo que enseñan. La octava es siempre el encargo de la unidad. Es el punto de partida de la Fase 2: cada agente escribe una unidad a partir de su ficha, siguiendo [CONTENT_GUIDE.md](CONTENT_GUIDE.md).

Escrito al cerrar el Tramo B (8 de octubre de 2026), a partir del encargo original de Mario y de las descripciones de `content/mundos/`. **Es una propuesta: Mario la revisa en la Parada 2 antes de que se escriba nada.**

## Cómo se lee

- **Alcance por fases**, según el encargo: la **Fase 2** escribe el contenido de los **Mundos 1 a 7**; la **Fase 3**, el de los **Mundos 8 a 10 y el proyecto final**, además del pulido. Aquí están todos para que el plan se vea entero y no queden huecos entre mundos.
- **El Mundo 0 ya está escrito** (pulso, compás, figuras, notas, intervalos, escalas mayor y menor, tríadas, los acordes de la escala y tónica, subdominante y dominante). Nada de aquí lo repite: lo usa.
- **El Mundo 1 respeta lo escrito**: sus cuatro unidades son las que ya están declaradas en `content/mundos/m01-melodia/`, y las dos primeras lecciones de «La frase» son las de `m01.u01.l01` y `l02`.
- **Toda la música será original.** Las sagas y los compositores se pueden nombrar para recomendar escuchas y explicar técnicas, nunca para copiar una melodía, una progresión identificable o una letra.
- **Cada encargo** lleva entre paréntesis lo que se comprobaría. Lo que ya comprueba `src/musica/requisitos.ts` está en CONTENT_GUIDE.md («Requisitos»); lo que no, va marcado con **(regla nueva)** y está recogido al final, en «Lo que el motor tendrá que aprender».
- **Cifras**: 40 unidades y 320 lecciones, de cinco a diez minutos cada una.
- **Dificultad**: cada unidad sigue la curva de CONTENT_GUIDE.md («La curva de dificultad»): dos lecciones de entrada, cuatro de desarrollo, una de integración y el encargo. Entre mundos, la progresión la marca «El hilo de la canción», abajo.

| Mundo | Unidades | Fase |
| --- | ---: | --- |
| 1. Melodía y motivo | 4 | 2 |
| 2. Armonía funcional | 4 | 2 |
| 3. Color | 4 | 2 |
| 4. Ritmo y groove | 3 | 2 |
| 5. Orquestación | 4 | 2 |
| 6. Lenguajes de género | 4 | 2 |
| 7. Funciones de la música | 4 | 2 |
| 8. Música interactiva | 4 | 3 |
| 9. Flujo profesional | 4 | 3 |
| 10. Producción y DAW | 3 | 3 |
| Proyecto final | 2 | 3 |

## El hilo de la canción

El curso lleva a escribir una pieza completa sin ayuda. Cada mundo cierra con un encargo más grande y con menos hecho de antemano que el anterior: el andamiaje se va retirando. Quien escriba una unidad tiene que mirar esta tabla para no pedir de menos (ni saltarse un escalón).

| Mundo | Encargo que lo cierra | Largo | Viene hecho | Escribe el usuario |
| --- | --- | ---: | --- | --- |
| 0 | «El bucle de la aldea» | 4 compases | Acordes (colchón de cuerdas) y tempo | Melodía y bajo |
| 1 | «La heroína del faro» | 16 | Acordes y bajo | Tema de dos frases y su variación |
| 2 | «El templo del alba» | 8 | Solo la melodía | La armonía entera: acordes, bajo y voces interiores |
| 3 | «La revelación» | 16 | Tempo, compás e instrumentos | Melodía, acordes con color y bajo, con una modulación |
| 4 | «El garaje de la banda» | 16 | Tempo e instrumentos | La banda entera: batería, bajo, acordes y melodía |
| 5 | «Despedida en el puerto» | 16 | Una melodía suya de Mi repertorio | La orquestación (cuerda, madera, metal) y la dinámica |
| 6 | «El guardián del puente» | 16 a 24 | El brief y la plantilla vacía | Una pieza de combate de su género, de cero |
| 7 | «Tu primera pieza completa» | 32 | Solo el brief | Una pieza con forma (introducción, A, B, vuelta y final o bucle), todas sus pistas |
| 8 a 10 y final | (Fase 3) | — | — | Música adaptativa, entrega profesional, producción y la banda sonora del proyecto final |

Dentro de cada mundo, los encargos de las unidades anteriores suben hacia el del final: más compases, más pistas o menos ayuda que el de la unidad de antes.

---

## Mundo 1 · Melodía y motivo

*Una idea pequeña que se recuerda.* Cómo se construye una frase, qué dibujo traza una melodía y cómo se desarrolla un motivo hasta convertirlo en el tema de un personaje.

### m01.u01 · La frase

**Objetivo:** escribir frases que respiran, con una pregunta que queda abierta y una respuesta que la cierra.

1. **Frases que respiran** *(escrita)*: dónde empieza y acaba una frase, y por qué una melodía necesita respirar.
2. **Pregunta y respuesta** *(escrita)*: una frase que queda abierta y otra que la cierra en la tónica.
3. **Semifrases y cadencias melódicas**: la frase de cuatro compases partida en dos, con un reposo débil a la mitad y uno fuerte al final.
4. **El periodo de ocho compases**: dos frases emparejadas, con el mismo comienzo y finales distintos; la forma de casi todo tema de pueblo.
5. **Notas largas y notas de paso**: qué notas apoyan la frase y cuáles la mueven, sobre los acordes del Mundo 0.
6. **La anacrusa**: empezar antes del primer tiempo para que la frase entre con impulso.
7. **Alargar y acortar una frase**: repetir el final, añadir un compás de eco, encoger una respuesta; la frase de seis y la de diez.
8. **Encargo «El tablón de anuncios»**: tema de pueblo de ocho compases en forma de pregunta y respuesta, en Do o Sol mayor, en bucle (tonalidad, 8 compases, melodía a una voz, termina en la tónica, bucle; que el compás 4 no acabe en la tónica: **regla nueva**, grado en un compás).

### m01.u02 · El contorno

**Objetivo:** dar a una melodía un dibujo reconocible y decidir dónde está su punto más alto.

1. **El dibujo de una melodía**: subir, bajar, arco, valle y ola, vistos en el piano roll y reconocidos de oído.
2. **Pasos y saltos**: cuándo una melodía camina y cuándo salta, y qué carácter da cada cosa.
3. **El salto compensado**: tras un salto grande, volver por pasos en dirección contraria.
4. **El punto culminante**: una sola nota más alta que todas, colocada hacia los dos tercios de la frase.
5. **El ámbito**: la distancia entre la nota más grave y la más aguda; melodías estrechas para la calma, anchas para la aventura.
6. **Notas repetidas y pedal melódico**: insistir en una nota para crear tensión o hipnotizar (mazmorra, reloj, pantalla de carga).
7. **Contorno y personaje**: el mismo ritmo con cuatro dibujos distintos, emparejados con cuatro personajes.
8. **Encargo «El mirador»**: melodía de exploración de ocho compases con un único punto culminante y un salto compensado (rango, polifonía 1, compases, tonalidad; un solo punto culminante y su posición: **regla nueva**).

### m01.u03 · El motivo

**Objetivo:** partir de una idea de tres o cuatro notas y desarrollarla por repetición, secuencia, inversión y cambio de ritmo.

1. **Qué es un motivo**: la idea mínima que se reconoce al volver; motivo rítmico y motivo melódico.
2. **Repetir y variar**: repetición literal, repetición con un final distinto y por qué la segunda no cansa.
3. **La secuencia**: el mismo motivo trasladado por grados de la escala, subiendo o bajando.
4. **La inversión**: el motivo cabeza abajo, con los intervalos en espejo.
5. **Aumentación y disminución**: el motivo con figuras el doble de largas o la mitad, para la calma o la prisa.
6. **Fragmentar**: quedarse con la cabeza del motivo y repetirla; cómo se hace crecer la tensión antes de un jefe.
7. **Un tema hecho de un motivo**: ocho compases construidos solo con transformaciones de cuatro notas.
8. **Encargo «La cueva de los ecos»**: tema de mazmorra de ocho compases que presenta un motivo de cuatro notas y lo desarrolla con secuencia e inversión (tonalidad menor, compases, polifonía 1, densidad; que el motivo reaparezca transformado: **regla nueva**, reconocimiento de motivo).

### m01.u04 · El leitmotiv

**Objetivo:** componer el tema de un personaje y transformarlo para que cuente lo que le pasa.

1. **Un tema para cada personaje**: qué es un leitmotiv y cómo lo usan las bandas sonoras para contar sin palabras.
2. **Intervalos con carácter**: la cuarta del héroe, la tercera menor de la pena, el tritono del villano; elegir el intervalo que define al personaje.
3. **El tema en mayor y en menor**: el mismo dibujo cambiado de modo, del día a la tragedia.
4. **Cambiar de tempo y de instrumento**: el tema lento en cuerdas para la despedida, rápido en chip para la persecución.
5. **El tema escondido**: citar solo la cabeza del tema dentro de otra música, en el bajo o en una voz interior.
6. **Dos temas que se encuentran**: el del héroe y el del villano en la misma pieza, alternados o superpuestos.
7. **El tema que cambia con la historia**: cuatro versiones de un tema a lo largo de un juego, de la presentación al final.
8. **Encargo «La heroína del faro»**: un tema de dieciséis compases (dos frases: pregunta y respuesta) sobre acordes y bajo dados, y su versión triste en menor (tema en mayor, variación en menor del mismo tema, compases, estructura, tonalidad de cada versión; que la variación conserve el dibujo: **regla nueva**, parecido entre melodías; **motor**: encargo con dos piezas).

---

## Mundo 2 · Armonía funcional

*Tensión, reposo y el camino entre ambos.* Grados, cadencias y progresiones habituales; inversiones, conducción de voces y el papel del bajo.

### m02.u01 · Grados y funciones

**Objetivo:** reconocer de oído y en el piano roll la función de cada acorde de la escala, en mayor y en menor.

1. **Siete acordes, tres familias**: tónica, subdominante y dominante, con todos los grados repartidos entre ellas.
2. **Los sustitutos de la tónica**: el vi y el iii, que reposan sin cerrar del todo.
3. **El ii, el otro camino a la dominante**: por qué ii–V suena tan natural.
4. **El V7 y su tritono**: la séptima de dominante y las dos notas que piden resolver.
5. **El vii° como dominante sin fundamental**: el acorde disminuido que empuja hacia la tónica.
6. **Los grados en menor**: la dominante mayor gracias a la sensible, y el VI y el VII que dan la épica.
7. **Escuchar funciones**: reconocer de oído si un acorde reposa, se aleja o tensa, en bucles de juego.
8. **Encargo «La posada»**: bucle de ocho compases con melodía y acordes en el que aparezcan las tres funciones y acabe en dominante (tonalidad, compases, bucle, melodía a una voz; funciones presentes y acorde final: **regla nueva**, análisis de los acordes escritos).

### m02.u02 · Cadencias y progresiones típicas

**Objetivo:** cerrar y dejar abiertas las frases con cadencias, y escribir las progresiones que más se oyen en los juegos.

1. **Cadencia auténtica**: V–I, el punto final.
2. **Semicadencia**: acabar en V, la frase que pregunta.
3. **Cadencia plagal y rota**: IV–I, el amén; V–vi, la sorpresa que alarga la historia.
4. **I–V–vi–IV y sus rotaciones**: la progresión del pop y cómo cambia de carácter según dónde empiece.
5. **El círculo de quintas**: vi–ii–V–I y las cadenas que caen de quinta en quinta.
6. **Progresiones de un solo color**: i–VI–VII de la épica menor y i–iv–v del lamento.
7. **El ritmo armónico**: cuántas veces cambia el acorde por compás y qué hace con el tempo percibido.
8. **Encargo «Créditos del primer capítulo»**: pieza de dieciséis compases con dos frases, la primera en semicadencia y la segunda en cadencia auténtica (tonalidad, compases, estructura, acordes; cadencia en los compases 8 y 16: **regla nueva**).

### m02.u03 · Inversiones y el bajo

**Objetivo:** escribir una línea de bajo que una los acordes y elegir la inversión que la hace cantar.

1. **El bajo no es la fundamental**: acordes en primera y segunda inversión, y su cifrado con barra (C/E).
2. **Bajo por grados conjuntos**: unir acordes con un bajo que camina en vez de saltar.
3. **El bajo descendente**: la línea que baja por la escala, de la melancolía a la balada.
4. **El pedal**: un bajo que se queda quieto mientras los acordes cambian encima, para la tensión o la calma.
5. **Bajo con ritmo**: fundamental y quinta, octavas y notas de paso; el bajo que también es percusión.
6. **El bajo y la melodía**: movimiento contrario, paralelo y oblicuo entre las dos voces de fuera.
7. **Escribir el bajo de una melodía dada**: elegir acordes e inversiones para una melodía del Mundo 1.
8. **Encargo «La biblioteca del castillo»**: línea de bajo para una melodía y unos acordes dados, con al menos dos inversiones y un tramo por grados conjuntos (rango del bajo, polifonía 1, notas del acorde en tiempos fuertes: **regla nueva**; inversiones usadas: **regla nueva**).

### m02.u04 · Conducción de voces

**Objetivo:** enlazar acordes a cuatro voces con el menor movimiento y sin errores que se oigan.

1. **Cuatro voces**: soprano, contralto, tenor y bajo; registro y distancia entre ellas.
2. **La nota común**: dejar quieta la nota que comparten dos acordes y mover las demás lo menos posible.
3. **Quintas y octavas paralelas**: qué son, por qué se evitan en el coral y por qué el rock las usa a propósito.
4. **Resolver la sensible y la séptima**: la sensible sube, la séptima baja.
5. **Posición abierta y cerrada**: el mismo acorde con aire o apretado, y cuándo conviene cada uno.
6. **Voces en el colchón de cuerdas**: aplicar lo anterior a un pad de cuerdas en el piano roll.
7. **Voces para un coral de templo**: un himno breve a cuatro voces, escuchado y analizado.
8. **Encargo «El templo del alba»**: armonizar a cuatro voces una melodía dada de ocho compases: el usuario elige los acordes y escribe bajo y voces interiores, con una semicadencia a mitad y una cadencia auténtica al final (polifonía 4, rango de cada voz, tonalidad; sin quintas ni octavas paralelas, sensible resuelta y cadencias: **regla nueva**).

---

## Mundo 3 · Color

*La misma melodía, otra luz.* Modos y su carácter, séptimas y extensiones, intercambio modal, dominantes secundarias, modulación y cromatismo.

### m03.u01 · Los modos

**Objetivo:** reconocer y usar los modos por su nota característica y el color que dan a una escena.

1. **De la escala mayor a los modos**: los siete modos como siete puntos de partida, y por qué importa la nota característica.
2. **Dórico**: la sexta mayor en un modo menor; misterio con esperanza.
3. **Frigio**: la segunda menor; desierto, amenaza y ruinas.
4. **Lidio**: la cuarta aumentada; magia, cielo y asombro.
5. **Mixolidio**: la séptima menor en un modo mayor; aventura, taberna y viaje.
6. **Eólico y locrio**: el menor natural y el modo que casi nunca se usa, y por qué.
7. **Escribir en un modo**: un pedal en la tónica y la nota característica bien a la vista.
8. **Encargo «Las ruinas del desierto»**: bucle de ocho compases en un modo elegido (frigio o dórico) sobre un pedal (tonalidad con el modo, bucle, compases; nota característica presente en la melodía: **regla nueva**).

### m03.u02 · Séptimas y extensiones

**Objetivo:** reconocer y escribir acordes de séptima, novena y más, y saber qué color pone cada uno.

1. **Cuatro séptimas**: maj7, 7, m7 y m7b5, de oído y en el teclado.
2. **Séptimas en la escala**: los siete acordes de cuatro notas de la tonalidad.
3. **La novena**: el acorde que suena a ciudad de noche y a menú de RPG moderno.
4. **Oncena y trecena**: extensiones que se tocan sin la nota que choca.
5. **Acordes sus y add**: suspender la tercera para abrir el paisaje.
6. **Voicings de piano**: tocar un acorde extendido con dos manos sin embarrar el grave.
7. **ii–V–I con séptimas**: la progresión de jazz más usada, en mayor y en menor.
8. **Encargo «La cafetería del distrito»**: bucle de ocho compases con al menos cuatro acordes de séptima o novena y su melodía (acordes con extensiones, polifonía del colchón, bucle, tonalidad: **regla nueva** para calidad de acordes escritos).

### m03.u03 · Intercambio modal y dominantes secundarias

**Objetivo:** tomar prestados acordes y crear dominantes de paso para dar color a una progresión.

1. **El acorde prestado**: iv en mayor, el que pone nostalgia al final de la aventura.
2. **bVI y bVII**: los acordes heroicos tomados del menor.
3. **La tercera de picardía**: acabar en mayor una pieza en menor.
4. **Dominantes secundarias**: V/V, V/ii y V/vi, las dominantes de cualquier grado.
5. **Cadenas de dominantes**: dominantes que llevan a otras dominantes antes de volver.
6. **Escuchar el préstamo**: reconocer de oído qué acorde no es de la tonalidad.
7. **Reharmonizar**: la misma melodía del Mundo 1 con tres armonías distintas.
8. **Encargo «El regreso a casa»**: tema de dieciséis compases con un acorde prestado y una dominante secundaria (tonalidad con `cromatismos` controlados, compases, acordes; acorde prestado y dominante secundaria presentes: **regla nueva**).

### m03.u04 · Modulación y cromatismo

**Objetivo:** cambiar de tonalidad dentro de una pieza y usar el cromatismo para la tensión y la sorpresa.

1. **Qué es modular**: cambiar de casa sin perderse; tonalidades vecinas.
2. **Modulación por acorde común**: el acorde que pertenece a las dos tonalidades.
3. **Modulación directa**: el salto sin preparación, un semitono o un tono arriba para la última vuelta.
4. **La relativa y la homónima**: de Do mayor a La menor y de Do mayor a Do menor.
5. **Notas cromáticas de paso y de adorno**: el color sin cambiar de tonalidad.
6. **El cromatismo de la amenaza**: líneas cromáticas en el bajo y en las cuerdas para la tensión.
7. **Mediantes cromáticas**: acordes a una tercera que suenan a revelación y a espacio.
8. **Encargo «La revelación»**: escena de dieciséis compases que modula a mitad y termina en la tonalidad nueva (dos tonalidades por tramos, compases, cadencia final: **regla nueva**, tonalidad por secciones).

---

## Mundo 4 · Ritmo y groove

*Lo que hace mover el pie.* Síncopa, compases irregulares, ostinatos y la pareja que lo sostiene todo: batería y bajo.

### m04.u01 · Síncopa y subdivisión

**Objetivo:** tocar y escribir ritmos sincopados, con swing y sin él, sin perder el pulso.

1. **El contratiempo**: tocar entre los pulsos; la corchea que empuja.
2. **La síncopa**: notas que nacen en parte débil y se alargan sobre la fuerte.
3. **Anticipar el acorde**: el cambio de acorde que llega una corchea antes.
4. **Semicorcheas y la rejilla de dieciséis**: los huecos donde vive el funk.
5. **Swing y recto**: la misma frase tocada de las dos maneras; el campo `swing` de la app.
6. **Tresillos y polirritmo de tres contra dos**: el ritmo que flota sobre el pulso.
7. **Notas fantasma y acentos**: la dinámica que hace respirar un patrón.
8. **Encargo «La persecución por los tejados»**: riff de cuatro compases con síncopas y anticipaciones sobre un pulso firme, en bucle (tempo, compases, bucle, densidad; proporción de notas a contratiempo: **regla nueva**).

### m04.u02 · Compases irregulares y ostinatos

**Objetivo:** sentir y escribir compases de 5, 7 y cambiantes, y construir ostinatos que sostienen una escena.

1. **El 5/4 y el 5/8**: contar en 3+2 y 2+3.
2. **El 7/8**: el compás cojo de las batallas inquietas.
3. **Compases que cambian**: alternar 4/4 y 3/4 sin que el oyente se pierda.
4. **El ostinato**: una figura corta que se repite y sostiene toda la escena.
5. **Ostinatos que se desplazan**: un patrón de tres sobre un compás de cuatro.
6. **Capas de ostinatos**: tres figuras distintas que encajan como engranajes.
7. **Hemiolia**: dos compases de tres que se oyen como tres de dos.
8. **Encargo «La forja de los enanos»**: ostinato en 7/8 con dos capas rítmicas y un bajo (compás, compases, bucle, pistas, densidad; ostinato que se repite: **regla nueva**, repetición de patrón).

### m04.u03 · Batería y bajo

**Objetivo:** escribir la base de batería y bajo de los estilos que más se usan en juegos.

1. **El patrón básico de rock**: bombo, caja y charles; variarlo sin romperlo.
2. **El bajo que se pega al bombo**: hacer que bajo y bombo coincidan.
3. **Funk**: semicorcheas en el charles, notas fantasma en la caja y un bajo que se mueve.
4. **Shuffle y swing**: el charles con swing y el walking bass del jazz.
5. **Los rellenos**: el último compás de la frase, que anuncia lo que viene.
6. **El drum and bass y el breakbeat**: tempos altos con la caja desplazada, para la velocidad.
7. **Menos es más**: quitar golpes hasta que el groove respire.
8. **Encargo «El garaje de la banda»**: la banda entera en un bucle de dieciséis compases de estilo funk, de cero: batería con un relleno al final de cada ocho compases, bajo sincopado, acordes y una melodía (pistas, compases, tempo, bucle, densidad del bajo, estructura AB; coincidencia de bajo y bombo en los tiempos fuertes y síncopas: **regla nueva**).

---

## Mundo 5 · Orquestación

*Quién toca qué, y dónde.* Familias de instrumentos, registros, doblajes y texturas; la plantilla orquestal y cómo escribir para muestras.

### m05.u01 · Familias y registros

**Objetivo:** reconocer de oído las familias de la orquesta y escribir cada instrumento en su registro cómodo.

1. **Las cuatro familias**: cuerda, madera, metal y percusión, y el papel de cada una en un juego.
2. **La cuerda**: violines, violas, chelos y contrabajos; registro y tesitura brillante.
3. **La madera**: flauta, oboe, clarinete y fagot; el color de cada uno.
4. **El metal**: trompa, trompeta, trombón y tuba; heroísmo y amenaza.
5. **La percusión de orquesta**: timbales, platos, bombo y láminas.
6. **Teclas, arpa y coro**: los colores que completan la plantilla.
7. **Escuchar timbres**: reconocer el instrumento que lleva la melodía.
8. **Encargo «El castillo de la reina»**: el mismo tema de ocho compases escrito tres veces, cada vez en una familia, dentro de su registro (rango por instrumento, instrumentos permitidos; **instrumentos nuevos**: madera y metal).

### m05.u02 · Doblajes y texturas

**Objetivo:** reforzar una melodía con doblajes y elegir la textura que pide cada momento.

1. **Doblar al unísono y a la octava**: dar cuerpo a una melodía sin cambiar sus notas.
2. **Doblar a la tercera y a la sexta**: el dúo que endulza.
3. **Monodia, homofonía y polifonía**: una voz, voces juntas, voces independientes.
4. **Melodía y acompañamiento**: arpegios, acordes repetidos y notas largas.
5. **Contramelodía**: una segunda voz que responde cuando la primera descansa.
6. **El tutti y el solo**: cuándo suena todo y cuándo queda un instrumento solo.
7. **Densidad y espacio**: dejar sitio en el registro medio para que la melodía se oiga.
8. **Encargo «La plaza mayor en fiestas»**: tema de dieciséis compases con melodía doblada, contramelodía y acompañamiento (pistas con sus roles, rango de cada una, densidad; melodía doblada: **regla nueva**).

### m05.u03 · La plantilla orquestal

**Objetivo:** repartir una pieza entre la orquesta entera, de la partitura de piano a la versión orquestal.

1. **Leer una reducción**: la pieza a dos manos que hay que orquestar.
2. **Repartir funciones**: melodía, armonía, bajo y ritmo, cada una en su sección.
3. **La cuerda como base**: escribir el colchón y el bajo con la sección de cuerda.
4. **Los metales para el clímax**: cuándo entran y cuándo callan.
5. **La madera para el color**: pequeñas frases y adornos.
6. **La percusión para la forma**: marcar las secciones y los finales.
7. **Crescendo orquestal**: construir una subida añadiendo secciones.
8. **Encargo «El ejército sale de la ciudad»**: orquestar una reducción de ocho compases para cuerda, metal y percusión, con un crescendo (pistas e instrumentos, rango, compases; entrada escalonada de secciones: **regla nueva**).

### m05.u04 · Escribir para muestras

**Objetivo:** escribir para bibliotecas de muestras con articulaciones, dinámicas y controles que suenen naturales.

1. **Las muestras no son músicos**: por qué una melodía escrita «en plano» suena a máquina.
2. **Velocidad**: dinámica nota a nota, acentos y frases que respiran.
3. **Articulaciones**: legato, staccato, pizzicato y trémolo, y cómo se eligen en una biblioteca.
4. **Expresión continua**: los controles CC1 y CC11, curvas de crescendo y diminuendo.
5. **El tiempo humano**: desplazar notas unos milisegundos y variar las duraciones.
6. **Capas de muestras**: sumar dos instrumentos para un ataque y un cuerpo mejores.
7. **Exportar a MIDI para la biblioteca**: lo que viaja en el archivo y lo que hay que hacer en el DAW.
8. **Encargo «Despedida en el puerto»**: orquestar una melodía propia de dieciséis compases (de Mi repertorio o nueva) para cuerda, madera y metal, con la dinámica escrita nota a nota y un crescendo hacia el final (pistas e instrumentos, rango de cada uno, densidad; **regla nueva**: curva de dinámica; **motor**: abrir una pieza del repertorio como plantilla, matices y curvas de expresión).

---

## Mundo 6 · Lenguajes de género

*Cuatro maneras de sonar a videojuego.* Aventura orquestal y JRPG clásico, jazz y funk urbano de RPG moderno, chiptune con sus límites de canales y épica de combate. Analizados por sus técnicas.

### m06.u01 · Aventura orquestal y JRPG clásico

**Objetivo:** escribir con las técnicas del JRPG orquestal clásico: temas largos, armonía clara y orquesta de sintetizador.

1. **Escuchar el género**: qué tiene en común la música de los JRPG de los noventa (obras para escuchar por cuenta propia).
2. **El tema de campo**: melodías largas, periodo de dieciséis compases y bucle amplio.
3. **La armonía del JRPG**: progresiones con IV, bVII y modulación a la última vuelta.
4. **Arpegios de arpa y cuerda pulsada**: el acompañamiento que mueve sin empujar.
5. **El vals y el 6/8 del pueblo**: el compás ternario de la vida tranquila.
6. **La fanfarria de victoria**: metales, tresillos y un acorde final brillante.
7. **Orquesta con pocos recursos**: sonar grande con cuatro o cinco pistas.
8. **Encargo «El primer pueblo»**: tema de pueblo de dieciséis compases en 3/4 con melodía, arpegios y bajo, en bucle (compás, compases, estructura AABA o ABAB, pistas, bucle, tonalidad).

### m06.u02 · Jazz, funk y pop urbano

**Objetivo:** escribir con el lenguaje del jazz, el funk y el pop de los RPG urbanos modernos.

1. **Escuchar el género**: acid jazz, funk y pop en los RPG ambientados en ciudades (escuchas recomendadas).
2. **Acordes extendidos y voicings**: novenas, oncenas y trecenas con el teclado eléctrico.
3. **La línea de bajo**: octavas, notas fantasma y el slap.
4. **Metales en bloque**: los golpes de sección de trompetas y saxos.
5. **La voz y la melodía pop**: frases cortas, ganchos y repetición.
6. **La progresión del menú**: ii–V–I, el acorde de paso y el giro que no acaba de cerrar.
7. **Groove y swing**: la batería de jazz y el charles de funk en la misma pieza.
8. **Encargo «La estación de metro»**: bucle de ocho compases con acordes de novena, bajo con síncopas y batería funk (acordes, pistas, compases, tempo, bucle, swing; **instrumentos nuevos**: teclado eléctrico, guitarra, sección de metales).

### m06.u03 · Chiptune

**Objetivo:** escribir para las limitaciones de una consola de 8 bits y convertirlas en estilo.

1. **Escuchar el género**: las consolas de 8 y 16 bits y lo que obligaban a hacer (escuchas recomendadas).
2. **Cuatro canales**: dos de pulso, uno triangular y uno de ruido; quién hace qué.
3. **Ciclo de trabajo**: el timbre del pulso al 12,5, 25 y 50 %.
4. **Arpegios rápidos**: el acorde imposible convertido en una nota que vibra.
5. **El bajo triangular y la percusión de ruido**: la base con dos canales.
6. **Ecos y vibratos falsos**: repetir una nota más baja para fingir reverberación.
7. **Del orquestal al chip**: reducir un tema de cinco pistas a cuatro canales.
8. **Encargo «La mazmorra de 8 bits»**: bucle de ocho compases con tres canales de chip y percusión de ruido, sin pasar de una nota por canal (instrumentos permitidos, polifonía por pista, bucle, compases; **instrumento nuevo**: canal de ruido).

### m06.u04 · Épica de combate

**Objetivo:** escribir música de combate épica con ostinatos, metales, percusión y coro.

1. **Escuchar el género**: la épica de las peleas contra jefes (escuchas recomendadas).
2. **El ostinato de cuerda**: semicorcheas incansables en el registro medio.
3. **Los metales del héroe**: la melodía en trompas y trombones, en octavas.
4. **Percusión de guerra**: taikos, timbales y caja en patrones que empujan.
5. **El coro**: vocales largas que dan solemnidad (sin letra reconocible).
6. **Armonía de combate**: i–VI–VII, el bVI y el tritono del enemigo.
7. **Construir la intensidad**: capas que entran durante la pelea.
8. **Encargo «El guardián del puente»**: tema de combate de dieciséis a veinticuatro compases, de cero (solo el brief y la plantilla con los instrumentos), con ostinato, metales y percusión, en menor y en bucle (tempo, pistas, tonalidad, densidad del ostinato, bucle, estructura; **instrumentos nuevos**: metales, percusión de orquesta, coro).

---

## Mundo 7 · Funciones de la música

*Cada pantalla pide algo distinto.* Título, pueblo, mundo abierto, mazmorra, combate, jefe, tienda, guardado, tensión, tristeza, victoria, derrota y los jingles: qué pide cada uno y por qué.

### m07.u01 · Lugares

**Objetivo:** escribir la música de los lugares de un juego sabiendo qué pide cada uno.

1. **La pantalla de título**: presentar el tema principal y dejar al jugador esperando sin cansarse.
2. **El pueblo**: calma, melodía clara y bucle largo.
3. **El mundo abierto**: espacio, ritmo de viaje y una melodía que no satura en una hora de juego.
4. **La mazmorra**: ambiente, poca melodía y tensión sostenida.
5. **La tienda**: un bucle corto, simpático y que no moleste.
6. **Relax y guardado**: la música de la hoguera, del santuario y de la posada.
7. **El bucle que no cansa**: duración, variación interna y silencios dentro del bucle.
8. **Encargo «El santuario del bosque»**: música de guardado de dieciséis compases, lenta y en bucle, con la melodía en el registro medio (tempo máximo, densidad máxima, rango, bucle, compases).

### m07.u02 · Peligro y combate

**Objetivo:** escribir para el combate normal, el jefe, el jefe final y los momentos de tensión.

1. **La tensión**: pedales, cromatismo y ritmo que se detiene.
2. **El combate normal**: un bucle corto, enérgico y que se repite cientos de veces.
3. **El jefe**: más capas, más grave y un motivo propio.
4. **El jefe final**: el tema principal transformado, en su versión más oscura.
5. **Fases de un jefe**: la música que cambia cuando el jefe cambia.
6. **La emboscada**: la entrada brusca del combate y cómo no asustar en falso.
7. **Ritmo y tempo del peligro**: cuánto empuja cada tempo y por qué.
8. **Encargo «El jefe del templo hundido»**: tema de jefe de dieciséis compases con dos secciones (fase 1 y fase 2) que contrastan (estructura AB, tempo, tonalidad menor, pistas, densidad por sección: **regla nueva**).

### m07.u03 · Momentos, jingles y stingers

**Objetivo:** escribir las piezas cortas que marcan los momentos del juego.

1. **La tristeza**: tempo lento, modo menor y una melodía que no resuelve.
2. **La victoria**: el jingle de unos segundos que recompensa.
3. **La derrota**: el jingle de «fin de la partida» que no humilla.
4. **El objeto conseguido**: el stinger de dos segundos que se reconoce siempre.
5. **Subir de nivel y abrir un cofre**: jingles pequeños con identidad.
6. **El motivo de la saga en los jingles**: usar el tema principal en miniatura.
7. **Jingles que encajan con la música**: que suenen bien sobre cualquier bucle de fondo.
8. **Encargo «Los jingles del gremio»**: tres jingles de dos compases (victoria, derrota y objeto) a partir de un mismo motivo (compases, tonalidad de cada uno, termina en un grado; motivo común: **regla nueva**; **motor**: encargo con varias piezas).

### m07.u04 · La pieza completa

**Objetivo:** escribir de principio a fin una pieza de juego con forma, a partir de un encargo y sin plantilla: lo que se ha aprendido en los Mundos 0 a 7, junto.

1. **Del brief al plan**: leer un encargo y decidir función, tempo, tonalidad, compás, instrumentos y forma antes de escribir una nota.
2. **La forma de una pieza**: introducción, A, B, vuelta a A y final (o bucle); cuánto dura cada parte y qué cambia entre ellas.
3. **Empezar por el tema**: escribir la melodía de A y su armonía; comprobar que se sostiene sola.
4. **El contraste de B**: otra tonalidad, otro registro u otro ritmo, sin perder el aire de la pieza.
5. **La base**: bajo y batería que sostienen A y B, con un relleno en cada cambio de sección.
6. **El arreglo**: repartir la pieza entre los instrumentos, doblajes y lo que entra y sale en cada sección.
7. **Introducción, transiciones y final**: la entrada que prepara, los enlaces entre secciones y un final que cierra o vuelve al principio sin costura.
8. **Encargo «Tu primera pieza completa»**: una pieza de treinta y dos compases para un lugar del juego elegido entre tres briefs, con introducción, A, B, vuelta a A y final o bucle, y al menos cuatro pistas, de cero (estructura con secciones, compases, pistas, tonalidad, tempo, rango y polifonía de cada pista, bucle si lo pide el brief; que A y su vuelta se parezcan y B contraste: lo comprueba `estructura`, con secciones del mismo largo).

---

## Mundo 8 · Música interactiva *(Fase 3)*

*La partitura que escucha al jugador.* Bucles sin costura, introducción más bucle, capas verticales, resecuenciación horizontal, transiciones, estados y parámetros, música generativa y los límites de memoria y CPU.

### m08.u01 · Bucles e introducción más bucle

**Objetivo:** escribir bucles que no se notan y piezas que tienen una introducción antes de entrar en bucle.

1. **La costura**: por qué se oye el salto al volver y cómo evitarlo.
2. **Colas que cruzan el final**: la reverberación y las notas largas que deben sonar al empezar otra vez.
3. **Intro más bucle**: la entrada que suena una vez y el bucle que la sigue.
4. **Bucles de distinta longitud**: cuándo cuatro compases y cuándo dos minutos.
5. **Variación dentro del bucle**: que la cuarta vuelta no suene igual que la primera.
6. **Puntos de entrada y salida**: dónde puede empezar y acabar la música en el juego.
7. **Medir el bucle**: duración en segundos, tempo y compases.
8. **Encargo «La cantera»**: pieza con introducción de dos compases y bucle de ocho, sin costura (estructura intro+bucle: **regla nueva**; bucle, compases, nada suena más allá del final).

### m08.u02 · Capas verticales

**Objetivo:** escribir una pieza en capas que entran y salen según lo que pasa en el juego.

1. **Capas, no pistas**: agrupar los instrumentos por intensidad.
2. **La capa base**: lo que suena siempre y tiene que funcionar sola.
3. **Capas de intensidad**: percusión, ostinato y metales que entran con el peligro.
4. **Fundidos y cuantización**: cuándo entra una capa (ya, en el tiempo, en el compás).
5. **Capas que no chocan**: armonía común para cualquier combinación.
6. **Estados de juego**: explorar, alerta y combate con las mismas capas.
7. **Mezclar capas en la app**: el ejercicio de capas por dentro.
8. **Encargo «El bosque vigilado»**: bucle de ocho compases con tres capas (base, alerta y combate) que funcionan en las tres combinaciones (capas declaradas, bucle, armonía compatible: **regla nueva**; **motor**: encargo de capas, hoy solo es ejercicio de escuchar).

### m08.u03 · Resecuenciación horizontal y transiciones

**Objetivo:** dividir la música en secciones que se encadenan según el juego, con transiciones y stingers que las unen.

1. **Secciones que se reordenan**: la pieza como un mapa de bloques.
2. **Transición en el compás, en el tiempo o en la sección**: qué se espera y qué se corta.
3. **El stinger de transición**: una frase corta que tapa el cambio.
4. **Fundido cruzado**: cuándo basta y cuándo suena a error.
5. **Ramas**: la sección de victoria y la de derrota al final del combate.
6. **Diseñar el grafo**: qué sección puede ir después de cuál.
7. **Probar las transiciones**: todas las parejas posibles.
8. **Encargo «De explorar a combatir»**: dos secciones de ocho compases y un stinger de transición entre ellas (secciones, compases, tonalidades compatibles; **motor**: transiciones escritas por el usuario).

### m08.u04 · Estados, parámetros, música generativa y límites

**Objetivo:** pensar la música como un sistema que reacciona a parámetros, y conocer sus límites técnicos.

1. **Parámetros continuos**: salud, velocidad, distancia al enemigo; música que cambia sin saltos.
2. **Máquina de estados**: los estados de la música y sus transiciones.
3. **Música generativa**: reglas que eligen la siguiente nota o el siguiente fragmento.
4. **Azar controlado**: variaciones aleatorias que no rompen la armonía.
5. **Memoria**: cuántas muestras caben y qué se carga cuándo.
6. **CPU y voces**: polifonía máxima y por qué un juego limita las voces.
7. **Documentar el sistema**: el esquema que se le entrega al programador.
8. **Encargo «La cueva viva»**: un sistema de cuatro fragmentos de dos compases que se pueden encadenar en cualquier orden (secciones, tonalidad común, que cada final enlace con cada principio: **regla nueva**).

---

## Mundo 9 · Flujo profesional *(Fase 3)*

*Del encargo a la entrega.* Leer un brief, la hoja de música, temas y variaciones para un juego entero, maqueta y revisiones, stems, formatos, middleware, trabajo en equipo, derechos y portfolio.

### m09.u01 · Del brief a la hoja de música

**Objetivo:** leer un brief, hacer las preguntas que faltan y convertirlo en una hoja de música (cue sheet).

1. **Leer un brief**: qué dice, qué no dice y qué hay que preguntar.
2. **Referencias**: pedirlas y usarlas sin copiar.
3. **La hoja de música**: lista de piezas con su función, duración, bucle e intensidad.
4. **Estimar el trabajo**: minutos de música, versiones y plazos.
5. **El tono del juego**: un documento de una página que dice cómo suena.
6. **Prioridades**: qué piezas primero y cuáles pueden esperar.
7. **Del brief al primer boceto**: un esbozo de dieciséis compases para validar el tono.
8. **Encargo «Pitch para Faro Norte»**: a partir de un brief, la hoja de música de cinco piezas y el boceto de la principal (la hoja como texto estructurado; el boceto con compases, tonalidad y tempo; **motor**: encargo con un formulario además del piano roll).

### m09.u02 · Temas y variaciones para todo un juego

**Objetivo:** planificar los temas de un juego y sus variaciones para que la banda sonora tenga unidad.

1. **El tema principal**: la pieza que lo contiene todo.
2. **Temas de personajes y de lugares**: quién tiene tema y quién no.
3. **La matriz de variaciones**: cada tema en cada situación.
4. **Variar sin repetir**: tempo, modo, instrumento, armonía y fragmentación.
5. **La paleta del juego**: instrumentos y sonidos que comparte toda la banda sonora.
6. **Excepciones**: la pieza que rompe la paleta a propósito.
7. **Revisar la unidad**: escuchar todas las piezas seguidas.
8. **Encargo «Tres caras de un tema»**: un tema y dos variaciones (pueblo y combate) con el mismo motivo (parecido entre melodías: **regla nueva**; tempo y tonalidad de cada versión; **motor**: encargo con varias piezas).

### m09.u03 · Maqueta, revisión y entrega

**Objetivo:** pasar de la maqueta a la entrega, con revisiones, stems, formatos, loudness y nombres de archivo.

1. **Maqueta y versión final**: qué se espera en cada fase.
2. **Recibir comentarios**: traducir «más épico» en cambios concretos.
3. **Versiones y revisiones**: numerar, guardar y no perder trabajo.
4. **Stems**: exportar por grupos para que el juego mezcle.
5. **Formatos**: WAV, Ogg y frecuencias de muestreo; qué pide cada plataforma.
6. **Loudness**: LUFS, picos reales y por qué se miden (como hace `npm run audio:check`).
7. **Nombrar archivos**: un sistema que entiende todo el equipo.
8. **Encargo «La entrega del capítulo 1»**: la lista de entrega de tres piezas con stems, formatos y nombres (comprobación de la lista con reglas de nombres y formatos: **regla nueva**; **motor**: exportar stems desde la app, si se decide).

### m09.u04 · Middleware, equipo, derechos y portfolio

**Objetivo:** entender cómo se integra la música en un motor, cómo se trabaja con el equipo, lo básico de derechos y cómo enseñar el trabajo.

1. **Middleware**: qué hacen Wwise y FMOD, eventos y parámetros, sin depender de ninguno.
2. **El audio lead y los diseñadores**: quién decide qué y cómo se pide.
3. **Integración**: el programador, los eventos y las pruebas en el juego.
4. **Derechos de autor**: lo básico de quién es dueño de la música y cómo se licencia.
5. **El contrato**: alcance, revisiones, plazos y pagos, a nivel introductorio.
6. **El portfolio**: qué piezas enseñar y cómo presentarlas.
7. **Rehacer una escena**: practicar con un vídeo de juego propio o de un juego libre.
8. **Encargo «Tu carta de presentación»**: elegir tres piezas de Mi repertorio y escribir su ficha de portfolio (función, técnica, duración; **motor**: exportar una selección del repertorio).

---

## Mundo 10 · Producción y DAW *(Fase 3)*

*De la idea al archivo que suena.* Síntesis sustractiva y FM, muestreo, mezcla básica, reverberación y espacio, y cómo llevar un MIDI de la app a FL Studio, Reaper o Cubase.

### m10.u01 · Síntesis

**Objetivo:** entender la síntesis sustractiva y la FM lo bastante para diseñar los sonidos de un juego.

1. **Oscilador**: seno, triangular, cuadrada y sierra; armónicos y timbre.
2. **Filtro**: paso bajo, resonancia y el brillo que se abre y se cierra.
3. **Envolvente**: ataque, caída, sostenimiento y relajación.
4. **LFO**: vibrato, trémolo y el filtro que respira.
5. **Síntesis FM**: un oscilador que modula a otro; campanas y metales de 16 bits.
6. **Diseñar un pad, un bajo y un lead**: tres sonidos básicos paso a paso.
7. **Sonidos de interfaz**: los de la propia app, desmontados.
8. **Encargo «La paleta sintética»**: un bucle de ocho compases con pad, bajo y lead sintetizados, cada uno con su envolvente (pistas, bucle, compases; **motor**: sintetizador con parámetros editables).

### m10.u02 · Muestreo, mezcla y espacio

**Objetivo:** usar muestras, equilibrar una mezcla sencilla y colocar los instrumentos en un espacio.

1. **El muestreo**: grabar, recortar, afinar y hacer bucle (como se hizo el banco de la app).
2. **Niveles**: equilibrar las pistas antes de tocar nada más.
3. **Paneo**: izquierda, derecha y el centro para el bajo y la melodía.
4. **Ecualización**: quitar lo que sobra para que todo quepa.
5. **Compresión**: controlar los picos sin aplastar.
6. **Reverberación y espacio**: cerca, lejos, sala pequeña y catedral.
7. **Mezclar para el móvil y para los auriculares**: qué se pierde en cada uno.
8. **Encargo «La mezcla de la taberna»**: mezclar una pieza de cinco pistas dada con niveles y paneo (volumen y paneo de cada pista, sonoridad final en un margen: **regla nueva**; **motor**: mezclador con volumen y paneo por pista).

### m10.u03 · Del MIDI al DAW

**Objetivo:** llevar una pieza de la app a un DAW y terminarla allí, sea FL Studio, Reaper o Cubase.

1. **Qué es un DAW**: pistas, instrumentos virtuales y la línea de tiempo.
2. **Exportar el MIDI de la app**: qué lleva el archivo (tempo, compás, armadura, pistas y programas).
3. **Importar en FL Studio**: el Channel Rack y el Piano roll.
4. **Importar en Reaper**: pistas, ítems y el editor MIDI.
5. **Importar en Cubase**: pistas de instrumento y el editor de teclas.
6. **Instrumentos virtuales gratuitos**: sustituir el piano y las cuerdas de la app.
7. **Renderizar**: exportar el audio final con la sonoridad adecuada.
8. **Encargo «Del bolsillo al estudio»**: exportar una pieza de Mi repertorio y entregar la lista de pasos seguidos en el DAW elegido (lista de comprobación marcada por el usuario; **motor**: encargo de tipo lista, sin piano roll).

---

## Proyecto final *(Fase 3)*

Banda sonora mínima de un juego ficticio: de seis a ocho piezas con tema principal, variaciones y un tema adaptativo de exploración a combate.

El mapa del mundo ya tiene su nodo («F», `src/ui/mapa/nodos.ts`), pero en `content/` no hay carpeta para él: está por decidir cómo se guarda (una carpeta `m11-proyecto-final` lo haría un mundo más, con la insignia «11» en vez de «F»). Abajo, sus unidades se llaman `final.u01` y `final.u02` solo para el plan.

### final.u01 · Preproducción y tema principal

**Objetivo:** definir el juego, su hoja de música y su tema principal.

1. **El juego ficticio**: género, mundo, personajes y tono, en una página.
2. **La hoja de música**: seis a ocho piezas con su función.
3. **La paleta**: instrumentos y sonidos de toda la banda sonora.
4. **El motivo**: cuatro notas que lo van a unir todo.
5. **El tema principal, primera versión**: dieciséis compases.
6. **Revisión del tema**: contorno, armonía y orquestación con lo aprendido.
7. **El tema de título**: la versión que abre el juego.
8. **Encargo «El tema principal»**: el tema principal definitivo (estructura, compases, tonalidad, pistas, bucle; se guarda en Mi repertorio como primera pieza del proyecto).

### final.u02 · La banda sonora

**Objetivo:** escribir el resto de las piezas, con el tema adaptativo, y presentar la banda sonora entera.

1. **El pueblo**: una variación tranquila del tema.
2. **El mundo abierto**: el tema en viaje.
3. **La mazmorra**: el motivo fragmentado.
4. **El combate**: la variación épica.
5. **El tema adaptativo, capas**: exploración y combate en la misma pieza.
6. **El tema adaptativo, transiciones**: de una a otra sin cortes.
7. **Los jingles**: victoria, derrota y objeto, con el motivo.
8. **Encargo «La banda sonora de [tu juego]»**: las seis a ocho piezas en Mi repertorio, con la adaptativa en capas, y su hoja de música (**motor**: proyecto con varias piezas, revisión de cada una con sus reglas).

---

## Lo que el motor tendrá que aprender

El plan pide cosas que la app aún no hace. Se recogen aquí para decidir en la Parada 2 cuáles entran y en qué fase.

### Instrumentos nuevos

Cada uno, con la licencia comprobada en origen (ver «Bancos descartados» en CREDITS.md):

- **Canal de ruido de chip** (Mundo 6, chiptune).
- **Madera**: flauta, oboe, clarinete y fagot (Mundo 5).
- **Metal**: trompa, trompeta, trombón y tuba, y sección de metales de jazz (Mundos 5 y 6).
- **Percusión de orquesta**: timbales, platos de choque, láminas y taikos (Mundos 5 y 6).
- **Coro** en vocales, sin letra (Mundo 6).
- **Teclado eléctrico, guitarra y saxo** (Mundo 6, jazz y funk).
- **Arpa** (Mundos 5 y 6).

### Reglas de corrección nuevas (`requisitos.ts`)

- Grado o acorde en un compás concreto (cadencias, semicadencias, acorde final).
- Calidad de los acordes escritos (séptimas, extensiones, préstamos, dominantes secundarias).
- Tonalidad por secciones (modulación) y nota característica de un modo.
- Punto culminante (único y su posición) y parecido entre dos melodías (variaciones, leitmotiv, motivo común).
- Reconocimiento de un motivo y sus transformaciones (secuencia, inversión).
- Proporción de notas a contratiempo, repetición de un patrón (ostinato), coincidencia de bajo y bombo.
- Conducción de voces: quintas y octavas paralelas, resolución de la sensible.
- Notas del acorde en los tiempos fuertes del bajo, inversiones usadas.
- Doblaje de la melodía, entrada escalonada de secciones, densidad por sección.
- Dinámica (variedad de velocidades, curvas).
- Estructura intro más bucle, y enlaces entre fragmentos (música generativa).

### Funciones nuevas

- **Encargo con varias piezas** (jingles, variaciones, proyecto final).
- **Una pieza de Mi repertorio como plantilla de un encargo** (Mundo 5: orquestar una melodía propia).
- **Encargo de capas y de transiciones** escritas por el usuario (Mundo 8): hoy las capas son un ejercicio de escuchar.
- **Matices y curvas de expresión** en el piano roll y en el MIDI exportado (Mundo 5).
- **Encargos sin piano roll**: formulario (hoja de música) y lista de comprobación (DAW, entrega).
- **Mezclador** con volumen y paneo por pista y medida de sonoridad (Mundo 10).
- **Sintetizador con parámetros editables** (Mundo 10).
- **Exportar stems o una selección del repertorio** (Mundo 9), si se decide.
- **Gamificación del encargo original pendiente**: el «rango de compositor» (hoy solo hay nivel) y los **sellos por unidad**.

### Cosas que conviene decidir antes de escribir

- Si los Mundos 8 a 10, que piden más motor que contenido, se adelantan en parte a la Fase 2 o se quedan en la 3.
- Qué reglas nuevas son imprescindibles para la Fase 2 (las de los Mundos 1 a 7) y cuáles pueden esperar: sin ellas, el encargo se queda con las reglas que ya hay y la parte que no se puede comprobar se explica en el texto.
- Los conceptos nuevos de `conceptos.yaml` y los términos del glosario que necesita cada unidad: los escribe el agente de la unidad y los revisa el crítico final.
