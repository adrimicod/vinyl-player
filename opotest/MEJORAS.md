# MEJORAS.md — Backlog vivo por iteración

Registro del bucle plan → desarrollo → test → revisión → mejoras (PLAN.md §2).

## Iteración 1 — MVP (completada)

Núcleo de dominio + UI + 83 tests + E2E manual con Playwright. Hallazgos de la
revisión de calidad sobre la app funcionando:

| # | Hallazgo | Acción |
|---|----------|--------|
| 1 | Las frases de enumeraciones arrastran el prefijo «d)» al usarse como afirmación/opción | ✅ Corregido en iteración 2 (parser limpia el marcador) |
| 2 | Las frases introductorias que terminan en «:» («…los siguientes derechos:») se usaban como afirmaciones completas | ✅ Corregido en iteración 2 (se excluyen como hechos tipo statement) |
| 3 | El mutador de intercambio puede producir distractores agramaticales («Las utilizar tienen…») | ✅ Mitigado en iteración 2 (solo intercambia palabras con la misma capitalización); solución completa en F1 con verificador IA |
| 4 | Probar la app requiere tener un texto legal a mano | ✅ Corregido en iteración 2 (botón «Cargar ejemplo») |

## Iteración 2 — Calidad del generador + onboarding (completada)

Implementa los 4 hallazgos anteriores y añade sus tests de regresión.

## Iteración 3 — Metacognición y comunidad sin servidor (completada)

Fase creativa del flujo §2.1: el subagente de ideas propuso 8 ideas; evaluación
del subagente evaluador (impacto usuario / encaje visión §1.3 / esfuerzo F0,
5 = barato / riesgo invertido, 5 = poco riesgo; total sobre 20):

| # | Idea | Imp. | Enc. | Esf. | Ries. | Total | Veredicto |
|---|------|------|------|------|-------|-------|-----------|
| 4 | Termómetro de confianza | 4 | 5 | 5 | 5 | **19** | ✅ Seleccionada — barata, núcleo puro, y desbloquea el «repaso espaciado» del backlog (que ya pedía "aciertos con baja confianza"). |
| 3 | Compartir test por enlace | 4 | 5 | 4 | 4 | **17** | ✅ Seleccionada — comunidad sin backend, encaje total con F0; núcleo (`share.js`) 100% testeable; riesgo acotado a límites de tamaño de URL. |
| 5 | Modo inverso «¿Qué artículo es?» | 3 | 4 | 5 | 4 | **16** | ✅ Seleccionada — refuerza el anclaje a la fuente, 0 créditos (retención gratis), esfuerzo S. |
| 1 | Caza la errata | 4 | 5 | 3 | 4 | **16** | → Backlog — excelente encaje (entrena a la comunidad a detectar erratas reutilizando los mutadores), pero es la M más grande y no cabe con las 3 elegidas. Primera candidata para it. 4. |
| 6 | Mapa de calor del temario | 4 | 4 | 3 | 4 | **15** | → Backlog — apoya «reciclar antes que generar», pero requiere bastante UI/CSS además del core `coverage.js`. |
| 7 | Taller de autor | 3 | 4 | 3 | 3 | **13** | → Backlog — buena idea comunitaria, pero el crédito al publicar choca con «créditos solo por calidad confirmada» (§1.3); rediseñar para recompensar vía score comunitario (quality.js ya lo hace). |
| 2 | Duelo fantasma | 3 | 3 | 2 | 3 | **11** | → Backlog (baja prioridad) — divertido, pero la UI de repetición comparativa es cara y el valor de estudio real es menor que el de las alternativas. |
| 8 | Contrato de estudio | 2 | 2 | 4 | 2 | **10** | ❌ Descartada — la loss aversion con créditos castiga al usuario que falla (riesgo de frustración/abandono) y no encaja con ningún principio §1.3; la retención debe venir del valor del banco, no de penalizaciones. |

### Seleccionadas y criterios de aceptación

**Idea 4 — Termómetro de confianza** (esfuerzo S)
- Antes de confirmar cada respuesta el usuario marca «Seguro / Dudo / Adivino»;
  la confianza viaja junto a `answers` y `scoreQuiz` la incorpora a `results`.
- El informe final cruza confianza × resultado y destaca las **falsas certezas**
  (fallo marcado como «Seguro»); se persisten en `userState`.
- `buildReviewQuiz` prioriza falsas certezas sobre el resto de falladas; lógica
  en módulo puro con tests `node --test` (suite en verde).

**Idea 3 — Compartir un test por enlace** (esfuerzo S-M)
- Nuevo `core/share.js` puro: `encodeShare(questions)` / `decodeShare(fragment)`
  simétricos (round-trip testeado), máximo 10 preguntas, campo de versión de formato.
- Abrir `index.html#share=…` ofrece hacer el test al momento y/o importarlo al
  banco con deduplicación (`similarity`) y `origin: 'import'`.
- Fragmentos corruptos o de versión desconocida fallan con mensaje claro sin
  romper la app; tests de los casos de error.

**Idea 5 — Modo inverso «¿Qué artículo es?»** (esfuerzo S)
- Nuevo `core/reverse.js` puro: construye preguntas «¿de qué artículo/ley procede
  esta cita?» a partir de `sourceQuote` + `topic` de preguntas activas del banco,
  con 4 opciones únicas construidas desde los topics de otras preguntas.
- No consume créditos ni llama al proveedor IA; se descartan preguntas sin
  metadatos suficientes para 4 opciones distintas.
- Tests: opciones únicas, correcta presente, descarte por metadatos insuficientes.

## Iteración 4 — Hábito diario, reto social y radiografía del temario (completada)

Fase creativa del flujo §2.1: el subagente de ideas propuso 8 ideas; evaluación
del subagente evaluador (impacto usuario / encaje visión §1.3 / esfuerzo F0,
5 = barato / riesgo invertido, 5 = poco riesgo; total sobre 20):

| # | Idea | Imp. | Enc. | Esf. | Ries. | Total | Veredicto |
|---|------|------|------|------|-------|-------|-----------|
| 6 | Reto compartido con marcador a batir | 4 | 5 | 5 | 4 | **18** | ✅ Seleccionada — bucle viral encima del `share.js` que ya existe; solo un campo `challenge` versionado + banner. Comunidad sin backend a coste mínimo. |
| 5 | Reto diario con racha | 5 | 4 | 4 | 4 | **17** | ✅ Seleccionada — el hábito diario es LA palanca de retención de un opositor; usa el banco (0 créditos, 0 IA) y el núcleo `daily.js` (semilla por fecha, reloj inyectable) es puro y testeable. |
| 2 | Radiografía del temario | 4 | 5 | 3 | 4 | **16** | ✅ Seleccionada — coincide con el «mapa de calor» del backlog (it.3): dos subagentes independientes la proponen = señal fuerte de valor. Refuerza «reciclar antes que generar»; absorbe la entrada del backlog. |
| 1 | Memorización «texto desvanecido» | 4 | 4 | 3 | 4 | **15** | → Backlog — memorizar literales es dolor real del opositor y no consume IA, pero abre una modalidad nueva (estudio, no test) que merece iteración propia; la selección de palabras clave necesita afinado para no frustrar. |
| 4 | «¿Dónde está la trampa?» | 4 | 5 | 3 | 3 | **15** | → Backlog, fusionada con «Caza la errata» (it.3) — misma familia (metacognición sobre los mutadores del generador); anotar `mutation` por distractor solo cubre preguntas `origin:'demo'` y la UX de señalar palabra es delicada. No entra para no duplicar esfuerzo con su gemela. |
| 7 | Simulacro cronometrado (Pro) | 4 | 4 | 3 | 3 | **14** | → Backlog, fusionada con «Modo simulacro» ya existente — segunda propuesta independiente = señal de valor; aporta la idea nueva de usarlo como primera diferencia funcional del plan Pro (barra de ritmo, gating vía `credits.js`). |
| 8 | Aportar pregunta manual | 3 | 4 | 4 | 4 | **15** | → Backlog, fusionada con «Taller de autor» (it.3) — su versión «gratis y sin recompensa al publicar» resuelve justo la objeción §1.3 que tenía el taller (créditos solo por calidad confirmada); reutiliza validator + dedup + bank.add. |
| 3 | Duelo fantasma | 3 | 3 | 2 | 3 | **11** | ❌ No seleccionada (ya estaba en backlog con el mismo veredicto en it.3) — re-propuesta sin cambios que alteren el juicio: UI de repetición comparativa cara para un valor de estudio menor; permanece en backlog con baja prioridad. |

### Seleccionadas y criterios de aceptación

**Idea 6 — Reto compartido con marcador a batir** (esfuerzo S)
- `share.js` sube a formato v2 con campo opcional `challenge: {alias, score10}`;
  los enlaces v1 existentes se siguen decodificando (retrocompatibilidad testeada)
  y un `challenge` malformado degrada a compartir normal sin romper la app.
- Al corregir un test abierto desde un enlace con reto, banner de
  victoria/derrota/empate comparando `score10` con el del retador, e invitación
  a recompartir el enlace con tu nota y alias.
- Round-trip `encodeShare`/`decodeShare` con y sin reto cubierto con `node --test`.

**Idea 5 — Reto diario con racha** (esfuerzo S)
- Nuevo `core/daily.js` puro: semilla determinista derivada de la fecha local
  (mismo día + mismo banco → mismo test), reloj inyectable, tests `node --test`.
- Racha: suma solo al completar el primer reto de cada día natural; se rompe al
  saltarse un día; racha y últimos días completados persisten en `userState` y
  alimentan el mini-calendario de «Mi cuenta».
- Solo usa preguntas activas del banco: 0 créditos, 0 llamadas a IA.

**Idea 2 — Radiografía del temario** (esfuerzo M)
- `quiz.updateHistory` pasa a guardar resultado por pregunta (intentos/aciertos
  por id) de forma tolerante con el `userState` previo (sin migración rompedora).
- Nuevo `core/coverage.js` puro: `buildCoverageGrid(bank, historial)` → celdas
  ley × artículo con estado gris (sin preguntas) / azul (sin intentar) /
  verde-ámbar-rojo por % de acierto, con umbrales testeados con `node --test`.
- Clic en celda con preguntas lanza un test filtrado de ese artículo; celda gris
  enlaza a «Generar» precargado con la ley/artículo («reciclar antes que generar»).

## Backlog priorizado (siguientes iteraciones)

1. **Repaso espaciado**: priorizar falladas antiguas y aciertos con baja confianza
   (sube de prioridad: el termómetro de la iteración 3 aporta justo el dato de
   confianza que faltaba; el historial `seenIds`/`failedIds` ya da la base, y el
   historial por pregunta de la radiografía (it.4) añade el dato de intentos).
2. **Modo «Caza la errata» / «¿Dónde está la trampa?»** (ideas subagente, it.3 +
   it.4, fusionadas): dos caras del mismo músculo metacognitivo reutilizando los
   mutadores del generador — (a) la app corrompe una pregunta buena y el usuario
   detecta el fallo; (b) al fallar, el generador revela cómo fabricó el distractor
   (negación/número/intercambio) y te reta a señalar la palabra trampa. Entrena la
   detección de erratas que alimenta el sistema de calidad. Requiere anotar
   `mutation` por distractor en `generator.js` (solo preguntas `origin:'demo'`).
3. **Modo simulacro cronometrado** (fusionada con idea subagente, it.4): tiempo
   total realista, sin feedback hasta el final, barra de ritmo, autocorrección al
   agotarse, baremo configurable por oposición (algunas restan 1/4 en vez de 1/3).
   Candidata a primera diferencia funcional del plan Pro (gating vía `credits.js`).
4. **Memorización literal «texto desvanecido»** (idea subagente, it.4): modo de
   estudio en el que el artículo pegado oculta palabras clave (números, términos,
   verbos) en 3 rondas de dificultad creciente; gratis y sin IA. Núcleo `fade.js`
   puro (huecos deterministas, RNG inyectable).
5. **Test por distribución de temas en la UI** — el core ya lo soporta
   (`buildDistributedQuiz`, «40 de A, 30 de B, 30 de C»); falta la UI de reparto.
6. **Taller de autor / aportar pregunta manual** (ideas subagente, it.3 + it.4,
   fusionadas): formulario «Escribir pregunta» con `validator.js` como linter en
   vivo y dedup (`similarity`) antes de entrar al banco como `origin:'manual'`;
   gratis y **sin recompensa al publicar** — la recompensa llega por score
   comunitario (quality.js), respetando «créditos solo por calidad confirmada».
7. **Import de PDF** (pdf.js) además de .txt — la mayoría de temarios son PDF.
8. **Multi-usuario simulado** para probar la mecánica comunitaria completa en F0
   (cambiar de usuario activo y ver votos/recompensas cruzadas).
9. **Duelo fantasma** (idea subagente, it.3; re-propuesta en it.4): repetir un
   test contra tu propia «repetición» grabada, exportable como JSON para retar a
   amigos; baja prioridad por coste de UI frente a valor de estudio. El «reto
   compartido» de la it.4 cubre la parte social a una fracción del coste.
10. **Verificador IA de segundo pase** (F1): cada pregunta generada se re-valida
    con un prompt barato («¿es la marcada la única respuesta correcta según la fuente?»).
11. **Taxonomía de leyes** con autocompletado (BOE) para que «Ley 39/2015» y
    «LPACAP» no fragmenten el banco.
12. **PWA** (manifest + service worker) para estudiar offline en el móvil.

Nota de fusión (it.4): el antiguo punto «Mapa de calor del temario» sale del
backlog al quedar absorbido por la «Radiografía del temario» seleccionada; el
«Modo simulacro» y el «Taller de autor» se fusionan con sus variantes propuestas
en it.4 (ver tabla de evaluación).
