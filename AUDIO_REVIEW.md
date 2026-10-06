# Revisión de audio: lo que hay que comprobar de oído

Quien ha construido el audio de Leitmotiv no puede oírlo. Todo lo que se puede medir está medido (ver [Lo que ya está comprobado](#lo-que-ya-está-comprobado)), pero «suena bien» no es una medida: esta lista dice qué escuchar, dónde y qué sería un problema. Marca cada punto cuando lo hayas oído y anota lo que no convenza.

**Dónde se escucha cada cosa**

- Instrumentos sueltos y sonidos de interfaz: **Ajustes → Diagnóstico de audio**.
- Ejemplos de las lecciones: **Mapa → Repaso exprés → Entrar**, lecciones «El pulso» y «El tempo».
- La pieza con cuatro pistas: **Repertorio → Abrir el piano roll de prueba**.
- Para oír un ejemplo fuera de la app, `npm run audio:check -- --guardar` deja un WAV de cada caso en `informes/tmp`.

Conviene hacer la revisión dos veces: con auriculares y con el altavoz del móvil.

## Lo que ya está comprobado

`npm run audio:check` renderiza con el motor real, sin altavoces, y mide. En la última ejecución: **56 comprobaciones, 0 fallos** (`informes/audio.json`).

| Qué se mide | Resultado |
| --- | --- |
| Afinación de cada instrumento en seis notas de su registro | Dentro de ±6 cents, salvo el piano en su nota más aguda (ver A1) |
| Que cada nota empieza cuando se le pide | Desviación máxima de 2,4 ms |
| Que cada pieza de la batería suena y a qué nivel | Las once suenan |
| Que no suena nada antes de la primera nota | Silencio digital |
| Que ocho golpes iguales suenan iguales a 60, 96, 120 y 150 BPM | Diferencia máxima de 0,01 dB |
| Sonoridad y pico real de cada ejemplo del contenido | De −16,6 a −27,8 LUFS; ninguno satura |

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

- [ ] **B7. Ejercicios de ritmo** («El pulso», pasos 2 y 4; «El tempo», pasos 4 y 5). Suena una cuenta previa y el patrón; hay que tocar el pad grande. *Escucha*: haz uno en el móvil, con altavoz y con auriculares. *Problema*: que la cuenta previa no se distinga del patrón, o que tus golpes salgan corregidos como adelantados o atrasados cuando tú los sientes a tiempo (sería el retardo del dispositivo; la calibración todavía no está hecha).
- [ ] **B8. Mezcla por capas** (aún sin lección que la use; se prueba en cuanto haya una). Al marcar un estado de juego, las capas entran y salen con un fundido de medio segundo al empezar el compás siguiente. *Problema*: un golpe de volumen, un corte en seco o que el cambio llegue a destiempo.

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

## Cómo anotar lo que encuentres

Escribe debajo de cada punto lo que has oído, con el móvil y los auriculares que usaste. Lo que sea un problema pasa a «Problemas conocidos» de HANDOFF.md para arreglarlo en la fase siguiente.
