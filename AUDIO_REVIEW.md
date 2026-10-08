# Revisión de audio: lo que hay que comprobar de oído

Quien ha construido el audio de Leitmotiv no puede oírlo. Todo lo que se puede medir está medido (ver [Lo que ya está comprobado](#lo-que-ya-está-comprobado)), pero «suena bien» no es una medida: esta lista dice qué escuchar, dónde y qué sería un problema. Marca cada punto cuando lo hayas oído y anota lo que no convenza.

**Dónde se escucha cada cosa**

- Instrumentos sueltos y sonidos de interfaz: **Ajustes → Diagnóstico de audio**.
- Ejemplos de las lecciones: **Mapa → Repaso exprés → Entrar**. Para abrir una lección sin hacer las anteriores, supera su unidad en la prueba de nivel (**Ajustes → Prueba de nivel**).
- Fichas: **Glosario → Fichas**.
- Una pieza con cuatro pistas: **Glosario → Bucle → Escuchar**. En **Repertorio → Pieza nueva** se puede escribir una y oírla en el piano roll.
- La claqueta de la calibración: **Ajustes → Retardo del sonido → Calibrar**.
- Para oír un ejemplo fuera de la app, `npm run audio:check -- --guardar` deja un WAV de cada caso en `informes/tmp`.

Conviene hacer la revisión dos veces: con auriculares y con el altavoz del móvil.

## Lo que ya está comprobado

`npm run audio:check` renderiza con el motor real, sin altavoces, y mide. En la última ejecución, el 5 de octubre de 2026, al terminar el motor de audio del Tramo B: **70 comprobaciones, 0 fallos** (`informes/audio.json`). **Desde entonces no se ha podido volver a ejecutar**: la máquina de trabajo de B6, B7 y B8 no tiene ffmpeg. Las cifras de la tabla son, por tanto, de antes del contenido del Mundo 0: los ejemplos de la sección F no están medidos.

| Qué se mide | Resultado |
| --- | --- |
| Afinación de cada instrumento en seis notas de su registro | Dentro de ±6 cents, salvo el piano en su nota más aguda (ver A1) |
| Que cada nota empieza cuando se le pide | Desviación máxima de 2,4 ms |
| Que cada pieza de la batería suena y a qué nivel | Las once suenan |
| Que no suena nada antes de la primera nota | Silencio digital |
| Que ocho golpes iguales suenan iguales a 60, 96, 120 y 150 BPM | Diferencia máxima de 0,01 dB |
| Sonoridad y pico real de cada ejemplo del contenido que había entonces (dos lecciones) | De −16,6 a −27,8 LUFS; ninguno satura |

Lo que estas medidas **no** dicen: si un timbre es agradable, si la mezcla está equilibrada, si un bucle se nota al repetirse, si el sonido llega a tiempo cuando se toca la pantalla.

## A. Instrumentos

En **Diagnóstico de audio → Probar**. Para oír más notas, usa el piano roll: cambia de pista y toca casillas.

- [ ] **A1. Piano, afinación.** Las muestras de origen estaban entre 3 y 52 cents altas; se ha bajado todo el piano 8 cents y se ha conservado su afinación estirada (más alta cuanto más agudo, como en un piano real). En el registro central queda clavado; la tecla más aguda (Do8) mide +42 cents. *Escucha*: una melodía en el registro agudo junto a las cuerdas. *Problema*: que el piano suene desafinado contra los demás instrumentos.
- [ ] **A2. Piano, saltos entre muestras.** Hay una muestra cada tres semitonos o más; las notas intermedias se obtienen cambiando la velocidad de la más cercana. *Escucha*: una escala cromática lenta. *Problema*: que alguna nota cambie de color de golpe respecto a la anterior.
- [ ] **A3. Piano, final de las notas largas.** Las muestras se cortan a 5 segundos con un fundido. *Escucha*: una redonda a tempo lento en el registro grave. *Problema*: que la nota se apague de forma artificial antes de tiempo.
- [ ] **A4. Cuerdas, costura del bucle.** Las notas sostenidas se repiten en un bucle de unos 2,2 segundos con fundido cruzado. Medido, el salto en la costura es pequeño (el mayor, −27,9 dB, en la muestra de Re6; el que más destaca sobre su propia onda, en la de Fa♯1), pero en las notas de violín el sonido de antes y el de después de la costura se parecen poco (correlación de 0,28 a 0,46 en Sol3, Re4, Fa♯4, Sol5, Si5 y Re6). *Escucha*: un acorde agudo mantenido cuatro compases a 60 BPM. *Problema*: un «latido» o un cambio de timbre que se repite cada dos segundos.
- [ ] **A5. Cuerdas, paso entre instrumentos.** El registro grave son contrabajos; el medio, violonchelos; del Sol3 hacia arriba, violines. *Escucha*: una escala de Do2 a Do5. *Problema*: un escalón de volumen o de timbre al cambiar de instrumento (alrededor de Do2 y de Sol3).
- [ ] **A6. Cuerdas, ataque.** Conservan el ataque natural del arco: tardan un momento en llegar a su volumen. *Escucha*: corcheas a 140 BPM. *Problema*: que en pasajes rápidos lleguen tarde o no se entiendan.
- [ ] **A7. Bajo.** La cuerda más grave (Mi1) estaba 25 cents alta en origen y se ha corregido. *Escucha*: una línea con Mi1, La1 y Re2. *Problema*: desafinación, o que en el altavoz del móvil el bajo desaparezca (es de esperar que se oiga poco: decide si hace falta doblarlo una octava arriba en las lecciones).
- [ ] **A8. Batería, capas.** Bombo, caja y charles tienen dos capas: suave (matices `pp`, `p` y `mp`, y la `o` de las rejillas) y fuerte (de `mf` en adelante, y la `x` y la `X`). *Escucha*: un patrón de charles con `x` y `o` alternadas, como el de «Camino de la pradera». *Problema*: que el paso de una capa a otra suene a dos baterías distintas.
- [ ] **A9. Batería, charles.** El charles abierto se corta cuando suena el cerrado o el pedal, como en una batería real. El cerrado alterna entre dos golpes para no sonar a metralleta. *Problema*: cortes bruscos o repetición mecánica.
- [ ] **A10. Batería, equilibrio del kit.** Los platos y el pedal de charles están entre 13 y 16 dB por debajo del bombo y la caja. *Problema*: que el ride o el crash no se oigan, o que tapen.
- [ ] **A11. Chips.** La onda de pulso (ciclo del 25 %) y la triangular se sintetizan. *Escucha*: los dos en Diagnóstico. *Problema*: que el pulso resulte hiriente al lado de los instrumentos muestreados, o la triangular inaudible en el altavoz del móvil.

## B. Mezcla de los ejemplos

Niveles de partida por papel: melodía 0 dB, bajo −1, contramelodía −3, percusión −4, armonía −5, efecto −6, colchón −7. Un limitador a −1,5 dB protege la salida.

- [ ] **B1. «El pulso», paso 1** (piano y bombo; −17,6 LUFS). *Problema*: que el bombo tape la melodía o no se distinga el pulso.
- [ ] **B2. «El pulso», paso 3** (piano con silencios, bombo y pedal de charles; −19,1 LUFS). El pedal de charles es muy flojo: *comprueba que se oye* marcando los tiempos 2, 3 y 4.
- [ ] **B3. «El pulso», paso 5 y «El tempo», paso 2** (solo batería; de −24,7 a −27,8 LUFS). Quedan entre 8 y 10 dB por debajo de los ejemplos con melodía. *Problema*: que al pasar de un ejemplo a una pregunta haya que subir el volumen.
- [ ] **B4. «El tempo», paso 1** (piano, bombo y aro; −16,8 LUFS). El aro es un golpe seco y corto: comprueba que marca los tiempos 2 y 4.
- [ ] **B5. «El tempo», paso 3** (cuerdas, bajo y batería; −21,1 LUFS). *Escucha*: sube el tempo de 80 a 150 como pide la lección. *Problema*: que a 150 las cuerdas no lleguen a sonar o el bajo se emborrone.
- [ ] **B6. «Camino de la pradera»** (piano, cuerdas, bajo y batería; −16,6 LUFS, pico real de −1,2 dB). Es el ejemplo más denso y el que más trabaja el limitador. *Problema*: que la música «bombee» (baje de volumen con cada bombo) o suene comprimida.
- [ ] **B7. Costura del bucle.** En el piano roll, deja sonar «Camino de la pradera» varias vueltas. *Problema*: un hueco, un golpe doble o una nota cortada al volver al principio.
- [ ] **B8. La composición.** «Camino de la pradera» y las melodías de las dos lecciones son originales y sencillas a propósito. *Decide*: si suenan a música o a ejercicio, y si el nivel de partida es el adecuado para ti.

- [ ] **B9. Ejercicios de ritmo** («El pulso», pasos 2 y 4; «El tempo», pasos 4 y 5). Suena una cuenta previa y el patrón; hay que tocar el pad grande. *Escucha*: haz uno en el móvil, con altavoz y con auriculares. *Problema*: que la cuenta previa no se distinga del patrón, o que tus golpes salgan corregidos como adelantados o atrasados cuando tú los sientes a tiempo (sería el retardo del dispositivo: calíbralo en **Ajustes → Retardo del sonido**).
- [ ] **B10. Mezcla por capas** («La feria del pueblo», paso 2; ver F8). Al marcar un estado de juego, las capas entran y salen con un fundido de medio segundo al empezar el compás siguiente. *Problema*: un golpe de volumen, un corte en seco o que el cambio llegue a destiempo.

## C. Sonidos de la interfaz

En **Diagnóstico de audio → Sonidos de interfaz**, con cada uno de los dos timbres (se cambian en **Ajustes → Sonidos de la interfaz**): «Chip» es una onda de pulso y «Campana», una campana FM.

- [ ] **C1. El motivo.** «Inicio» toca La, Mi, Si, Mi. *Decide*: si te gusta como firma de la app.
- [ ] **C2. Cursor.** Suena cada vez que se mueve la selección. *Problema*: que canse en una sesión de diez minutos.
- [ ] **C3. Acierto y fallo.** *Problema*: que el de fallo suene a castigo, o que no se distingan sin mirar.
- [ ] **C4. Nivel.** El nivel de los sonidos de interfaz se ha fijado por cálculo, no de oído, para quedar por debajo de la música. *Problema*: que sobresalgan o que no se oigan.
- [ ] **C5. Encima de la música.** Toca botones mientras suena un ejemplo. *Problema*: choques desagradables (el motivo son cuartas y quintas para evitarlos, pero no se ha oído).

## D. En el móvil

Esto no se ha podido probar en ningún teléfono: ver «No comprobado» en HANDOFF.md.

- [ ] **D1. Arranque.** Tras «Empezar» debe oírse el motivo. Si no suena nada, mira qué dice Diagnóstico de audio.
- [ ] **D2. Retardo al tocar.** En el piano roll, toca una casilla. *Problema*: que la nota tarde en sonar lo bastante como para molestar. Apunta lo que diga «Latencia de salida declarada» en Diagnóstico: hará falta para calibrar los ejercicios de ritmo.
- [ ] **D3. Segundo plano.** Con un bucle sonando, cambia de app y vuelve. Debe pararse al salir y poder reanudarse al volver, sin quedarse mudo.
- [ ] **D4. Bloqueo de pantalla y llamada.** Lo mismo al bloquear y desbloquear, y si entra una llamada o una notificación con sonido.
- [ ] **D5. Auriculares Bluetooth.** Añaden entre 100 y 300 ms de retardo. *Comprueba*: que la música suena bien y qué pasa con el retardo al tocar.
- [ ] **D6. Modo silencio.** Con el móvil en silencio o en vibración, comprueba si la app suena (en Android depende del volumen multimedia).
- [ ] **D7. Primera carga con datos móviles.** El primer ejemplo con piano descarga 0,9 MB. *Problema*: una espera larga sin que se entienda qué pasa (debe leerse «Cargando…»).
- [ ] **D8. Sin conexión.** Después de usar la app un rato con conexión, ponla en modo avión y ábrela. Deben sonar todos los instrumentos.

## E. Pantallas nuevas del paso B6

- [ ] **E1. Claqueta de la calibración.** Suena el golpe de aro de la batería a 90 BPM, más fuerte en el primer tiempo de cada compás. *Problema*: que no se oiga bien en el altavoz del móvil o que cueste distinguir el tiempo fuerte.
- [ ] **E2. Retardo medido.** Calibra con el altavoz y luego con auriculares Bluetooth y apunta las dos cifras. *Problema*: que con Bluetooth salga parecido al altavoz (debería salir 100 ms o más por encima), o que tras calibrar los ejercicios de ritmo sigan diciendo «vas por detrás».
- [ ] **E3. Cambiar de instrumento con el ejemplo sonando.** Desde B7 lo piden muchas lecciones; la más clara es «La octava y el registro», paso 3 (la melodía empieza en cuerdas). *Problema*: un chasquido o un hueco al cambiar, o que el instrumento nuevo suene mucho más fuerte o más flojo que el anterior (la onda de pulso, sobre todo).
- [ ] **E4. Teclado que se enciende.** En un ejemplo con `vista: teclado`, las teclas se encienden al sonar. *Problema*: que la luz vaya visiblemente por delante o por detrás de lo que se oye.
- [ ] **E5. Repaso y prueba de nivel.** Repiten ejercicios de las lecciones, con su mismo sonido: basta con comprobar que suenan igual que dentro de la lección.

## F. Contenido del paso B7

Toda la música es original, escrita para la app. Nada de esto se ha oído, y `npm run audio:check` no se pudo ejecutar ni en B7 ni en B8 (la máquina de trabajo no tiene ffmpeg): tampoco hay medidas de sonoridad de los ejemplos nuevos. Lo primero, cuando haya ffmpeg: `npm run audio:check` y comprobar que ningún ejemplo nuevo satura ni queda muy por debajo de los demás.

Revisado al cerrar el Tramo B (B8): el contenido no ha cambiado de sonido. Solo cambian dos textos y una etiqueta, anotados en F2 y F6.

En **todos los ejercicios de ritmo** la cuenta previa suena con el golpe de aro y el patrón con la caja (`src/audio/ritmo.ts`). En el modo **eco** primero suena el patrón con la claqueta y después solo la claqueta mientras tocas; en el modo **leer** solo suena la claqueta. *Problema general*: que el aro y la caja se confundan, o que en el eco no quede claro cuándo empieza tu turno.

**Pulso y compás (m00.u01)**

- [ ] **F1. «El pulso».** El texto se ha corregido: ahora dice caja y golpe de aro donde antes decía bombo. Comprueba que cada paso dice lo que se oye.
- [ ] **F2. «Redondas, blancas y negras».** Paso 1, «La posada del cruce» en pentagrama con pedal de charles: ¿se oye el pedal como pulso? Paso 2, una nota larga de piano sobre el pedal: *problema*, que la redonda se apague antes de los cuatro pulsos (A3). Paso 3, la rejilla: el texto dice ahora «el pedal del charles (la fila «Pedal»)», que es lo que suena; comprueba que se oye como pulso de fondo bajo la caja. Paso 4, ritmo **leer** a 80 con blancas y una redonda; paso 5, **eco** a 84. Los dos se superan tocando a tiempo en las pruebas automáticas, pero eso no dice si el eco deja claro cuándo empieza tu turno.
- [ ] **F3. «Corcheas y semicorcheas».** Paso 1, solo batería, con el charles en corcheas y luego en semicorcheas: *problema*, que suene a metralleta (A9). Paso 4, «Emboscada en el desfiladero», chip de pulso en semicorcheas a 120 con triangular y batería: *problema*, que el chip resulte hiriente o tape a los demás. Ritmos: seguir corcheas a 92, eco a 88 y seguir semicorcheas a 76.
- [ ] **F4. «El compás, en cuatro y en tres».** Paso 1, marcha de batería con acentos. Paso 3, «Vals de la taberna» a 138 en 3/4, con las cuerdas en el dos y el tres: *problema*, que no lleguen a tiempo por su ataque lento (A6). Paso 4, oído de compás generado (4/4 o 3/4). Paso 5, «La caja de música», piano agudo hasta Do6.
- [ ] **F5. «El 6/8».** «El muelle al amanecer» (piano, bajo y batería) y «Camino del valle» (chips). Ritmo seguir en 6/8 a 120: la claqueta da las seis corcheas; *problema*, que sea tan densa que no deje sentir los dos pulsos. Eco del galope. Oído de compás 3/4 contra 6/8: *decide* si se distinguen bien con el patrón generado.
- [ ] **F6. «Silencios y puntillo».** «Pasillos del castillo» (piano con silencios y bajo) y «La guardia del puerto» (piano y caja con puntillo). Construcción: escucha las tres opciones en el hueco. Desde B8 se leen «Do5 negra – silencio de negra», «Do5 corchea – …» y «Do5 blanca»: *decide* si al oírlas en el hueco se distingue lo que dicen.
- [ ] **F7. «La feria del pueblo».** «La plaza del mercado» (piano, cuerdas, bajo y batería) es el ejemplo más denso de la unidad: *problema*, que el limitador bombee (B6).
- [ ] **F8. Capas en «La feria del pueblo».** Tres estados: solo fondo (cuerdas y bajo); fondo y melodía; todo, con batería. *Problema*: golpes de volumen al entrar o salir la batería, o un fondo que suena vacío.
- [ ] **F9. Ordenar secciones** («La feria del pueblo» y «Casa, viaje y tensión»). *Problema*: que al escuchar un fragmento suelto se corte la última nota o arranque a destiempo. Desde B8, «Escuchar» (el conjunto, en el orden puesto) está debajo de la pieza y no en el pie.
- [ ] **F9b. Los tres encargos** («El bucle de la feria», «La llamada del héroe» y «El bucle de la aldea»). Escribe algo en cada uno y escúchalo en bucle en el piano roll mientras editas. *Problema*: que al poner notas con la música sonando se oigan cortes, que una nota puesta con la música parada no suene al ponerla, o que el bucle dé un salto al volver al principio.

**Notas e intervalos (m00.u02)**

- [ ] **F10. Oído generado de contorno, intervalo y timbre.** Contorno («Las siete notas», paso 2) e intervalos (en «Teclas negras», «Segundas y terceras», «Cuartas, quintas y octavas», «Sextas y séptimas», «Reposo y tensión» y «La llamada del héroe»), en piano, de Do4 a Do5 más el salto. *Problema*: que en los intervalos armónicos una nota tape a la otra, o que los saltos al agudo cambien de color de golpe (A2). Timbre («La octava y el registro», paso 4): piano, cuerdas y chip de pulso con la misma frase; *decide* si se distinguen y si el chip suena mucho más fuerte.
- [ ] **F11. Ejemplos con vista de teclado** («Las siete notas», «Teclas negras», «Segundas y terceras», «Sextas y séptimas», «Reposo y tensión» y varios de la unidad 3): las teclas deben encenderse a la vez que suenan (E4). «El pasillo del fantasma» y «La cripta» son cromáticos a propósito.
- [ ] **F12. «Antes de la batalla»** («Cuartas, quintas y octavas», paso 3): quintas vacías de cuerda grave, bajo, toms y platillo. *Problema*: que los toms o el platillo no se oigan en el móvil, o que la cuerda grave retumbe.
- [ ] **F13. «Eco en la cueva»** («La octava y el registro», paso 1): el mismo motivo en tres octavas de piano, hasta Do6. *Problema*: un salto de timbre entre octavas.
- [ ] **F14. «El faro del norte»** («La llamada del héroe»): chip de pulso hasta Fa♯6, triangular y batería. *Problema*: que las notas más agudas del chip resulten estridentes.

**Escalas y tríadas (m00.u03)**

- [ ] **F15. Oído generado de escala, acorde y progresión.** Escalas mayor y menor, como escala y como melodía («La escala menor»); tríadas en bloque, en arpegio y de las dos formas («Tríadas mayores y menores», «Tríadas disminuida y aumentada», «Los acordes de la escala»); progresiones de cuatro acordes en piano («Casa, viaje y tensión»). *Problema*: acordes en bloque embarrados en el grave (la fundamental baja hasta Do3), o progresiones en las que el bajo tapa la mano derecha.
- [ ] **F16. Armonías con cuerdas** («La tienda de la esquina», «El bosque de los susurros», «El hechizo despierta», «Créditos finales», «La ciudadela» y «La aldea del molino»): *problema*, la costura del bucle de las cuerdas en acordes largos (A4) y el equilibrio entre melodía y colchón.
- [ ] **F17. «Pantalla de continuar»**: arpegio de chip en semicorcheas a 120. *Decide* si el oído junta las notas en un acorde, que es lo que dice el texto.
- [ ] **F18. Transposición** («La tienda de la esquina», «El molino del río» y «Créditos finales»): sube y baja varios semitonos con el ejemplo sonando. *Problema*: un chasquido al cambiar o notas que se quedan colgadas.

**Mundo 1 (m01.u01, dos lecciones)**

- [ ] **F19. «El pueblo costero» y «Día de mercado»** (ocho compases, piano, cuerdas y bajo), y «La caravana» y «Mazmorra de 8 bits» (chips). *Decide* si las respiraciones y los finales de pregunta y de respuesta se oyen como dicen los textos.

**Fichas, glosario y prueba de nivel**

- [ ] **F20. Fichas.** Cada bloque de «Compases y figuras», «Intervalos» y «Escalas y tríadas» tiene un ejemplo corto. En «Compases y figuras» las figuras van sobre el pedal de charles: comprueba que las semicorcheas del final se entienden.
- [ ] **F21. Glosario.** Diez términos tienen ejemplo: Arpegio, Bucle, Cadencia, Compás compuesto, Escala mayor, Escala menor, Intervalo, Ostinato, Tríada y Tritono.
- [ ] **F22. Prueba de nivel.** Quince ejercicios propios: un bajo con batería a 152 y a 64, semicorcheas de cuerda (*problema*: que las cuerdas no articulen las semicorcheas, A6), intervalos armónicos de cuerda, escalas con tónica en Si♭ y tríadas desde Re3.

## Cómo anotar lo que encuentres

Escribe debajo de cada punto lo que has oído, con el móvil y los auriculares que usaste. Lo que sea un problema pasa a «Problemas conocidos» de HANDOFF.md para arreglarlo en la fase siguiente.
