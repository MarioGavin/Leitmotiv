# Fase 2: cómo se hace

El procedimiento para escribir el contenido de los **Mundos 1 a 7**: en qué orden, quién hace qué, con qué esfuerzo, cuándo se para y qué cuenta como terminado. Está pensado para que cada sesión de trabajo lo lea y lo siga sin tener que preguntar lo mismo cada vez.

| Documento | Para qué |
| --- | --- |
| [docs/ENCARGO.md](ENCARGO.md) | El encargo original de Mario: el alcance |
| [PLAN_DE_ESTUDIOS.md](../PLAN_DE_ESTUDIOS.md) | Qué va en cada unidad y lección, «El hilo de la canción» y lo que el motor tiene que aprender |
| [CONTENT_GUIDE.md](../CONTENT_GUIDE.md) | Cómo se escribe una lección, con «La curva de dificultad» |
| [CLAUDE.md](../CLAUDE.md) | Las reglas del proyecto |
| [HANDOFF.md](../HANDOFF.md) | En qué punto está todo |
| `.claude/agents/` | Los cuatro agentes de la fase |

## Antes de empezar (una sola vez)

- [ ] Parada 2 cerrada: Mario ha revisado la Fase 1 y ha aprobado (o corregido) PLAN_DE_ESTUDIOS.md.
- [ ] Mario ha decidido qué entra de «Lo que el motor tendrá que aprender» y si el «rango de compositor» y los sellos por unidad se hacen ahora (tramo 0) o al final.
- [ ] ffmpeg instalado en la máquina (`ffmpeg -version` responde) y `npm run audio:check` en verde. Sin él, el revisor musical va a ciegas.
- [ ] `npm run check` y `npm run e2e` en verde sobre `main`.

## Cómo se reparte

### Mundos, tramos y sesiones

Se avanza **mundo a mundo**, del 1 al 7, porque cada mundo se apoya en el anterior. Cada mundo tiene tramos de dos clases:

- **Tramo de motor** (M): el código que necesita ese mundo y todavía no existe (reglas de corrección, funciones, instrumentos). Lo hace la sesión principal, con pruebas, sin subagentes. Un mundo puede necesitar más de uno.
- **Tramo de contenido** (C): las unidades del mundo, escritas y revisadas por los agentes, y el cierre del mundo.

Cada tramo es **una sesión nueva** de Claude Code (un prompt), y acaba en un commit por paso y un informe breve. Así cada sesión arranca con el contexto limpio y HANDOFF.md al día, que sale más barato que una conversación larga.

| Mundo | Tramos | Lo que pide el motor (resumen; el detalle, en PLAN_DE_ESTUDIOS.md) |
| --- | --- | --- |
| 0 (opcional) | **0**: gamificación | Rango de compositor y sellos por unidad, si Mario lo decide así |
| 1. Melodía y motivo | **M**, **C** | Grado en un compás, punto culminante, parecido entre melodías, reconocer un motivo; encargo con dos piezas |
| 2. Armonía funcional | **M**, **C** | Análisis de los acordes escritos (funciones, cadencias), notas del acorde en tiempos fuertes, inversiones, conducción de voces |
| 3. Color | **M**, **C** | Calidad de los acordes (séptimas, extensiones, préstamos, dominantes secundarias), tonalidad por secciones, nota característica de un modo |
| 4. Ritmo y groove | **M**, **C** | Proporción de contratiempos, repetición de un patrón, bajo y bombo juntos |
| 5. Orquestación | **M1** instrumentos, *parada de escucha*, **M2**, **C** | Madera, metal, percusión de orquesta y arpa; dinámica y curvas de expresión; doblajes; entrada escalonada; una pieza del repertorio como plantilla |
| 6. Lenguajes de género | **M1** instrumentos, *parada de escucha*, **C** | Canal de ruido de chip, teclado eléctrico, guitarra, metales de jazz y coro |
| 7. Funciones de la música | **M**, **C**, **crítico final** | Densidad por sección; lo que falte para «Tu primera pieza completa» |

Si al empezar un tramo de motor se ve que es más grande de lo previsto (más de cuatro reglas o funciones con su interfaz, o un instrumento nuevo), se parte en dos tramos. Si un tramo de contenido descubre que falta algo de motor, **no lo programa**: lo anota, sigue con lo que se puede comprobar y lo deja para un tramo M.

### Paradas

- Al cerrar cada mundo: informe y HANDOFF.md al día; Mario lo prueba y da el visto bueno antes del mundo siguiente.
- Tras un tramo de instrumentos (Mundos 5 y 6): **parada de escucha**. Mario oye los instrumentos nuevos (sección nueva en AUDIO_REVIEW.md) antes de que se escriba música con ellos.
- Cuando algo obliga a cambiar el plan (una unidad que no se puede enseñar con lo que hay, un encargo imposible de comprobar), se pregunta a Mario antes de seguir.

## El tramo de contenido, paso a paso

Lo dirige la sesión principal. Por cada unidad del mundo, **en orden** (la u02 se escribe viendo la u01 ya escrita, y así la progresión sale sola):

1. **Escribir**: lanza `escritor-de-unidad` con el identificador de la unidad y los cambios que pidiera Mario. Devuelve un informe de quince líneas.
2. **Revisar**: lanza a la vez `revisor-musical` y `revisor-pedagogico` sobre esa unidad. Devuelven hallazgos `archivo:línea — qué — cómo`.
3. **Corregir**: manda los hallazgos al **mismo** escritor (continuarlo con SendMessage, no lanzar otro: ya tiene la unidad en contexto, y empezar de cero cuesta el doble). Los **[grave]** se corrigen siempre; las **[mejora]**, salvo que el escritor explique por qué no.
4. **Comprobar y publicar**: `npm run content:check` con 0 errores y 0 avisos, la prueba del encargo en verde; quita `estado: borrador` del `unidad.yaml`; un commit por unidad.

Al acabar las unidades, el **cierre del mundo**:

5. Une y repasa lo que los escritores añadieron a `conceptos.yaml` y `glosario.yaml` (duplicados, definiciones que se contradicen). Si conviene, una ficha nueva en `content/fichas/`.
6. Lanza `critico-del-plan` sobre el mundo; arregla lo que sea del mundo y anota en PLAN_DE_ESTUDIOS.md lo que afecte a mundos siguientes.
7. `npm run check`, `npm run e2e` (también con `BASE_PATH=/leitmotiv/`) y `npm run audio:check`, todo en verde.
8. Capturas: una hoja por unidad, solo a 360 × 640 (`npm run shots -- --ruta=… --tam=360x640 --hoja=mNN-uNN`). Se miran, y lo que se vea mal se arregla.
9. AUDIO_REVIEW.md con una sección nueva para el mundo (qué escuchar y dónde) y HANDOFF.md al día. Informe a Mario con hecho, no hecho y no comprobado. **Parada.**

## Agentes, modelos y esfuerzo

| Quién | Modelo | Esfuerzo | Por qué |
| --- | --- | --- | --- |
| Sesión principal en un tramo de motor | El de la app | **Alto** (`high`; `xhigh` si el tramo es delicado) | Es código con pruebas, y un fallo aquí se arrastra a todas las lecciones |
| Sesión principal en un tramo de contenido | El de la app | **Medio** | Reparte, une y ejecuta comprobaciones; lo creativo lo hacen los agentes |
| `escritor-de-unidad` | Opus | Medio | Pedagogía y música original: es donde se juega la calidad. El compilador y las pruebas atrapan los errores mecánicos |
| `revisor-musical` | Sonnet | Medio | Ejecuta validadores y lee con una lista de comprobación |
| `revisor-pedagogico` | Sonnet | Medio | Lectura atenta con una lista de comprobación |
| `critico-del-plan` | Opus | Alto | Mira el conjunto: tiene que razonar sobre todo el curso |

El esfuerzo de la sesión principal se elige en la app antes de mandar el prompt. El de los agentes viene de su archivo en `.claude/agents/`: no hace falta decirlo en el prompt. Si un agente se queda corto, se sube su `effort` en el archivo, no en toda la sesión. El esfuerzo máximo (`max`) se reserva para un fallo que se resista.

## Qué cuenta como terminado

**Una unidad**

- [ ] Ocho lecciones que siguen su ficha (o un desvío explicado) y la curva de dificultad.
- [ ] `npm run content:check`: 0 errores, 0 avisos.
- [ ] El encargo, resuelto en `e2e/encargos.spec.ts`, pide más que el de la unidad anterior y no se cumple al azar.
- [ ] Revisada por los dos revisores, con los [grave] corregidos.
- [ ] Publicada (sin `estado: borrador`) y en su commit.

**Un mundo**

- [ ] Todas sus unidades terminadas, con sus conceptos y términos.
- [ ] El encargo del mundo cumple su fila de «El hilo de la canción».
- [ ] `npm run check`, `npm run e2e` (raíz y `/leitmotiv/`) y `npm run audio:check` en verde.
- [ ] Capturas revisadas, AUDIO_REVIEW.md y HANDOFF.md al día, informe a Mario.

## Para gastar menos y hacerlo mejor

- **Una sesión por tramo.** No sigas en la misma conversación al acabar un tramo: abre otra. HANDOFF.md ya lleva lo necesario.
- **Los agentes leen solo lo suyo.** Sus archivos ya lo dicen; no les pidas «mira el proyecto».
- **Continuar, no relanzar.** Las correcciones van al escritor que ya tiene la unidad en contexto.
- **Unidades en orden, revisores en paralelo.** Escribir dos unidades a la vez ahorra tiempo, no tokens, y pierde la progresión.
- **Pruebas de navegador puntuales** mientras se trabaja (`contenido.spec.ts` y la del encargo); la tanda completa, solo al cerrar el mundo.
- **Pocas imágenes.** Una hoja de capturas por unidad, a 360 × 640. Las capturas sueltas y a todos los tamaños son lo más caro.
- **Informes cortos en el chat**; el detalle, en HANDOFF.md.
- **Commits en inglés**, uno por unidad y uno por paso de motor, con la etiqueta del tramo: `feat: write unit m02.u03 (F2-M2-C3)`.

## Si algo falla

- **Las pruebas de ritmo fallan todas a la vez**: mira «El reloj de audio» en CLAUDE.md antes de tocar el código.
- **Un encargo no se puede cumplir** con las reglas que hay: el escritor lo dice; la sesión principal decide si se rebaja el encargo (y se explica en el brief) o se para para un tramo de motor.
- **Un agente se sale de lo suyo** (toca `src/`, reescribe `conceptos.yaml` entero, hace commits): se deshace con git y se le vuelve a dar la tarea con la regla delante.
- **El contenido no cabe en la ficha**: se adapta la ficha y se anota el cambio en PLAN_DE_ESTUDIOS.md; si cambia el alcance, se pregunta a Mario.

## Prompts

Se pegan en una sesión nueva, con el esfuerzo de la tabla de arriba elegido en la app. Cambia N por el mundo.

**Tramo de motor** (esfuerzo alto):

> Lee CLAUDE.md, HANDOFF.md y docs/FASE_2.md. Haz el tramo de motor del Mundo N: lo que pide su fila de docs/FASE_2.md y su parte de «Lo que el motor tendrá que aprender» en PLAN_DE_ESTUDIOS.md, con lo que decidió Mario. Pártelo en pasos con un commit cada uno, cada regla o función con sus pruebas y documentada en CONTENT_GUIDE.md. Si es más grande de lo previsto, dímelo antes de seguir. Al acabar: npm run check, npm run e2e y npm run audio:check en verde, HANDOFF.md al día e informe breve. Para ahí.

**Tramo de instrumentos** (Mundos 5 y 6, esfuerzo alto):

> Lee CLAUDE.md, HANDOFF.md, CREDITS.md («Bancos descartados») y docs/FASE_2.md. Añade los instrumentos del Mundo N que pide docs/FASE_2.md, con la receta «Instrumento nuevo» de CLAUDE.md. Antes de usar un banco, comprueba su licencia en origen y dime cuáles propones. Afina, iguala niveles, pasa npm run audio:check y deja en AUDIO_REVIEW.md qué escuchar de cada uno. Para ahí: no se escribe música con ellos hasta que los oiga.

**Tramo de contenido** (esfuerzo medio):

> Lee CLAUDE.md, HANDOFF.md y docs/FASE_2.md. Haz el tramo de contenido del Mundo N siguiendo «El tramo de contenido, paso a paso», con los agentes de .claude/agents/. Cambios que pido sobre el plan: [ninguno | …]. Un commit por unidad. Al acabar, el cierre del mundo completo y el informe. Para ahí.

**Crítico final** (al acabar el Mundo 7, esfuerzo alto):

> Lee docs/FASE_2.md. Lanza critico-del-plan sobre el curso entero (Mundos 0 a 7 escritos y el plan de los 8 a 10). Con su informe, propónme qué cambiar antes de la Fase 3, ordenado por importancia. No toques nada hasta que lo apruebe.
