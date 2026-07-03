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

## Iteración 5 — Memoria a largo plazo, ojo crítico y termómetro de aprobado (completada)

Fase creativa del flujo §2.1: el subagente de ideas propuso 8 ideas; evaluación
del subagente evaluador (impacto usuario / encaje visión §1.3 / esfuerzo F0,
5 = barato / riesgo invertido, 5 = poco riesgo; total sobre 20):

| # | Idea | Imp. | Enc. | Esf. | Ries. | Total | Veredicto |
|---|------|------|------|------|-------|-------|-----------|
| 1 | Flashcards con cajas de Leitner | 5 | 5 | 3 | 4 | **17** | ✅ Seleccionada — ataca el backlog #1 («Repaso espaciado», el más antiguo) y da uso directo a los `facts` tipados que el parser ya extrae; 0 IA, 0 créditos, y el planificador `srs.js` (reloj inyectable, como `daily.js`) queda reutilizable para espaciar también preguntas falladas. |
| 2 | Cazador de erratas | 4 | 5 | 3 | 4 | **16** | ✅ Seleccionada — es el backlog #2 («Caza la errata / ¿Dónde está la trampa?»), aplazado desde it.3 y ya propuesto 3 veces por subagentes independientes; entrena justo la detección de erratas que alimenta la autorregulación §1.3. Coste menor de lo estimado: los mutadores ya están expuestos en la API de `generator.js`. |
| 8 | «¿Aprobarías hoy?» — medidor de preparación | 4 | 4 | 4 | 3 | **15** | ✅ Seleccionada — responde LA pregunta del opositor con datos que la it.4 ya persiste (`perQuestion`); núcleo `readiness.js` puro (RNG inyectable) barato. Riesgo real: estimar con pocos datos engaña → guard de datos mínimos obligatorio. Entra por delante de sus empates a 15 por ser S con core testeable (la 6 sería una tercera M; la 7 no tiene core). |
| 6 | Simulacro con hoja de examen real | 4 | 4 | 3 | 4 | **15** | → Backlog, fusionada con «Modo simulacro» (#3, ya fusión de it.4) — tercera propuesta independiente = señal fuerte; aporta hoja de respuestas con cuadrícula, marcar-para-revisar, aviso a 5 min y tiempo por pregunta. No entra para no meter tres M en la iteración; primera candidata para it.6. |
| 7 | Chuleta imprimible post-test | 3 | 4 | 4 | 4 | **15** | → Backlog — barata y bien anclada a la fuente (cita literal + tu error), pero es casi todo UI/CSS `@media print` sin núcleo testeable con `node --test`; ideal como relleno S de una iteración futura. |
| 5 | Completa el artículo (cloze) | 4 | 4 | 3 | 3 | **14** | → Backlog, fusionada con «texto desvanecido» (#4, it.4) — misma familia (memorización de literales con huecos); aporta los chips de opciones y la corrección coloreada sobre el texto. No entra para no duplicar modalidad de memorización con las flashcards seleccionadas. |
| 3 | Modo manos libres con voz | 3 | 3 | 4 | 3 | **13** | → Backlog — valor real para el opositor que estudia caminando/conduciendo y gratis (speechSynthesis), pero sin núcleo puro testeable y con riesgo de calidad/disponibilidad de voces en español según navegador y `file://`. |
| 4 | Duelo local a un dispositivo | 3 | 3 | 3 | 3 | **12** | → Backlog, fusionada con «Duelo fantasma» (#9) — variante más barata (pasar el móvil, sin grabación/reproducción), pero el «reto compartido» de la it.4 ya cubre la competición social a una fracción del coste; baja prioridad. |

### Seleccionadas y criterios de aceptación

**Idea 1 — Flashcards con cajas de Leitner** (esfuerzo M)
- Nuevo `core/srs.js` puro con reloj inyectable: cajas 1-5 con intervalos
  crecientes; «la sabía» sube de caja, «dudé» repite, «no la sabía» vuelve a la
  caja 1; transiciones e intervalos cubiertos con `node --test`.
- Las tarjetas se construyen desde los `facts` del parser (definiciones, plazos,
  enumeraciones) sin IA ni créditos; la vista «Repasar hoy» lista solo las
  vencidas según fecha y el estado persiste en `userState`/localStorage.
- El planificador (`dueCards`/próxima fecha) se expone de forma reutilizable
  para el futuro repaso espaciado de preguntas falladas (backlog #2).

**Idea 2 — Cazador de erratas** (esfuerzo M)
- `generator.js` anota `mutation` (tipo: negación/número/intercambio) por
  distractor en preguntas `origin:'demo'` sin romper la API existente (tests de
  regresión de la suite actual en verde).
- Nuevo `core/trapGame.js` puro: construye una ronda de 4 afirmaciones (3
  intactas + exactamente 1 saboteada con un mutador) y expone qué se cambió;
  tests: solo una saboteada, la saboteada difiere del original, material sin
  mutación anotada se descarta sin error.
- La corrección pide identificar la afirmación falsa y el tipo de cambio; al
  terminar, CTA para reportar erratas reales (enlaza con `quality.js`).

**Idea 8 — «¿Aprobarías hoy?»** (esfuerzo S)
- Nuevo `core/readiness.js` puro: `simulateExams(perQuestion, bank, opts)` con
  RNG inyectable → probabilidad de aprobar sobre N exámenes virtuales
  («aprobarías ~68 de 100») y top 3 artículos que más nota quitan; determinista
  con semilla fija en tests.
- Guard de datos mínimos: por debajo de un umbral de preguntas intentadas
  devuelve «sin datos suficientes» en vez de un número engañoso (testeado).
- Dial en «Mi cuenta» enlazado con la radiografía: clic en un artículo débil
  lanza un test filtrado de ese artículo.

## Iteración 6 — Simulacro de examen real y taller de edición comunitaria (completada)

Fase creativa del flujo §2.1: el subagente de ideas propuso 8 ideas; evaluación
del subagente evaluador (impacto usuario / encaje visión §1.3 / esfuerzo F0,
5 = barato / riesgo invertido, 5 = poco riesgo; total sobre 20):

| # | Idea | Imp. | Enc. | Esf. | Ries. | Total | Veredicto |
|---|------|------|------|------|-------|-------|-----------|
| 1 | Simulacro cronometrado con gestión del ritmo | 5 | 4 | 3 | 4 | **16** | ✅ Seleccionada — ES el backlog #1 con la **cuarta propuesta independiente** (backlog original + it.4 + it.5 + esta); tres iteraciones esperando es la señal acumulada más fuerte del proyecto. El core `timer.js` sigue el patrón de reloj inyectable ya probado en `daily.js`/`srs.js`. Candidata a primera diferencia funcional del plan Pro. |
| 2 | Taller de corrección de erratas | 4 | 5 | 3 | 4 | **16** | ✅ Seleccionada — cierra el ciclo de vida de calidad §3.3, que hoy muere en `review`: `quality.resolveErrata` (patch + reset de votos) ya existe y está testeado, falta solo la UI y la recompensa. Ajuste obligado: la recompensa al corrector debe respetar «créditos solo por calidad confirmada» (§1.3), no pagarse al guardar. |
| 3 | «Aporta tu pregunta»: editor manual | 3 | 4 | 4 | 4 | **15** | ✅ Seleccionada — es el backlog #5 (fusión it.3+it.4, ya rediseñado sin recompensa al publicar) y comparte ~80% del componente de edición con la idea 2: su coste marginal real es XS-S. Entra por sinergia, no habría entrado sola. |
| 5 | Dossier imprimible | 3 | 4 | 4 | 4 | **15** | → Backlog, fusionada con «chuleta imprimible» (it.5) — segunda propuesta independiente = señal; aporta la agrupación por ley/artículo y la inclusión de falsas certezas. Sube posiciones en el backlog. |
| 7 | Perfil de fallo | 4 | 4 | 3 | 3 | **14** | → Backlog — metacognición valiosa (¿plazos? ¿negaciones?), pero exige ampliar `perQuestion` con el índice elegido y la clasificación por heurística es frágil; los tags `mutation` que la it.5 ya anota por distractor (preguntas demo) la abaratarían — buena candidata para it.7. |
| 6 | El intruso: juego de enumeraciones | 3 | 4 | 3 | 4 | **14** | → Backlog — buen uso de las enumeraciones que el parser ya extrae y núcleo puro testeable, pero la familia de juegos está recién nutrida (reverse it.3, trapGame y flashcards it.5); no urge una cuarta modalidad. |
| 8 | Cuenta atrás al examen | 3 | 3 | 3 | 4 | **13** | → Backlog (baja prioridad) — el semáforo en-plazo/retrasado depende de estimaciones (`readiness`, racha) aún jóvenes; un pronóstico poco fiable puede desmotivar más que ayudar. Revisar cuando readiness tenga rodaje. |
| 4 | Modo audio manos libres | 3 | 3 | 3 | 3 | **12** | → Backlog, fusionada con «manos libres» (it.5) — re-propuesta; la novedad `core/audioQueue.js` (secuenciación testeable) responde a la objeción «sin core testeable» de it.5, pero el riesgo de voces en español desiguales por navegador/`file://` sigue intacto. |

### Seleccionadas y criterios de aceptación

**Idea 1 — Simulacro cronometrado con gestión del ritmo** (esfuerzo M)
- Nuevo `core/timer.js` puro con reloj inyectable (patrón `daily.js`/`srs.js`):
  cuenta atrás configurable, timestamp por respuesta, autoenvío al agotarse;
  transiciones de estado y cálculos de ritmo cubiertos con `node --test`.
- Modo examen: sin feedback hasta el final, hoja de respuestas con cuadrícula,
  marcar-para-revisar/saltar y aviso a 5 min (requisitos acumulados del
  backlog #1 en it.4 e it.5).
- Informe post-examen derivado en core (testeable): tiempo por pregunta,
  preguntas por encima del doble de tu mediana y proyección «a este ritmo
  habrías llegado a la X de Y». El gating Pro vía `credits.js` queda como
  extensión opcional si cabe en la iteración.

**Idea 2 — Taller de corrección de erratas** (esfuerzo M)
- Vista de preguntas en `review` con erratas abiertas; editor (texto, opciones,
  correcta, explicación, cita) con `validator.js` como linter en vivo; guardar
  aplica `quality.resolveErrata` con patch y la pregunta vuelve a `active`;
  rechazar la errata también la resuelve sin patch (ambos caminos testeados).
- El patch re-pasa `validator` y dedup (`similarity`) antes de aplicarse; un
  patch inválido no toca la pregunta ni resuelve la errata.
- Recompensa al corrector alineada con §1.3: no al guardar, sino cuando la
  pregunta corregida recupera score positivo (patrón `applyAuthorReward`,
  idempotente) o con tope diario tipo `rewardEvaluator`; testeada.

**Idea 3 — «Aporta tu pregunta»: editor manual** (esfuerzo S)
- Reutiliza el mismo componente de edición de la idea 2; alta con
  `validator.js` + dedup (`similarity`) contra el banco; entra como
  `origin: 'manual'`, coste 0 créditos.
- Sin recompensa al publicar — la recompensa llega por score comunitario
  (`quality.js`), según el rediseño ya acordado en el backlog (it.3+it.4).
- Tests: pregunta manual válida entra como `active`; duplicada o inválida se
  rechaza con mensaje claro sin tocar el banco.

## Iteración 7 — Memoria literal, chuleta sinóptica y muerte súbita (completada)

Fase creativa del flujo §2.1: el subagente de ideas propuso 8 ideas; evaluación
del subagente evaluador (impacto usuario / encaje visión §1.3 / esfuerzo F0,
5 = barato / riesgo invertido, 5 = poco riesgo; total sobre 20). Última
iteración del ciclo: prima cerrar bien (features completas, núcleos puros
testeados) sobre abrir frentes grandes.

| # | Idea | Imp. | Enc. | Esf. | Ries. | Total | Veredicto |
|---|------|------|------|------|-------|-------|-----------|
| 2 | Completa el literal (cloze con teclado) | 5 | 5 | 3 | 4 | **17** | ✅ Seleccionada — ES el backlog #2 en su **tercera aparición** independiente (it.4 «texto desvanecido» + it.5 «cloze» + esta); teclear en vez de elegir chips exige recuerdo activo (mejor para literales) y `similarity` ya da la corrección tolerante. Cierra un top-3 del backlog. |
| 6 | Chuleta sinóptica imprimible | 4 | 5 | 4 | 4 | **17** | ✅ Seleccionada — ≈ backlog #3 en su **tercera aparición** (it.5 + it.6 + esta); la versión sinóptica desde los `facts` del parser aporta el núcleo puro `cheatsheet.js` que respondía justo a la objeción de it.5 («casi todo UI/CSS sin core testeable»). Cierra otro top-3 del backlog. |
| 7 | Modo cadena (muerte súbita) | 4 | 4 | 5 | 4 | **17** | ✅ Seleccionada — S barato sobre el quiz existente, 0 IA/0 créditos, y alimenta el repaso (la que rompe la cadena entra prioritaria). No amplía la familia de juegos de hechos (objeción it.6 a «el intruso»): es un modo de test, como el reto diario. Relleno S perfecto para cerrar el ciclo. |
| 4 | Mapa de confusiones | 4 | 4 | 3 | 3 | **14** | → Backlog, fusionada con «Perfil de fallo» (#2) — misma familia y mismo prerrequisito (persistir la opción elegida en `perQuestion`; `scoreQuiz` ya devuelve `given`, falta guardarlo); los mini-drills binarios de discriminación son la mejor aportación nueva. No entra: tercera M abriría frente nuevo en la última iteración. |
| 5 | Modo manos libres (test por voz) | 3 | 3 | 4 | 3 | **13** | → Backlog, fusionada con «manos libres» (#4) — **tercera propuesta** (it.5 + it.6 + esta), señal real; pero esta versión «js/tts.js sin core» retrocede respecto al `audioQueue.js` testeable de it.6, y el riesgo de voces en español por navegador/`file://` sigue intacto. |
| 8 | Explícalo antes de mirar | 3 | 4 | 4 | 2 | **13** | → Backlog (nuevo) — la autoexplicación es la técnica de estudio con más evidencia y el anclaje a `explanation`+`sourceQuote` encaja con §1.3, pero el feedback por Jaccard sobre texto libre es frágil: «te faltaron estos conceptos» calculado por solape de tokens puede ser ruido frustrante. Prototipar cuando haya hueco. |
| 1 | Duelo fantasma con ritmo real | 3 | 3 | 3 | 3 | **12** | → Backlog, fusionada con «Duelo» (#9) — tercera re-propuesta (rechazada en it.3 e it.4); la novedad real es que `timer.js` (it.6) y `share.js` ya abaratan el ritmo y el transporte por URL. Aun así, el reto compartido (it.4) cubre la competición social a fracción del coste; sigue baja prioridad. |
| 3 | Plan de estudio con cuenta atrás | 4 | 3 | 2 | 2 | **11** | → Backlog, fusionada con «Cuenta atrás al examen» (#5) — versión más ambiciosa (L) de la idea que it.6 ya aplazó por depender de estimaciones jóvenes (`readiness` lleva una iteración de rodaje); un plan diario prescriptivo poco fiable desmotiva. L en la última iteración contradice «cerrar bien». La prescripción diaria concreta («hoy: 10 preguntas de arts. 13-18 + 12 tarjetas») es la aportación a conservar. |

### Seleccionadas y criterios de aceptación

**Idea 2 — Completa el literal (cloze con teclado)** (esfuerzo M)
- `textParser` expone posiciones de palabras clave (números, términos de
  definiciones, órganos) dentro de cada frase/hecho sin romper la API actual
  (suite de regresión en verde).
- Nuevo `core/cloze.js` puro: huecos deterministas con RNG inyectable y
  dificultad creciente (más huecos por ronda); corrección tolerante vía
  `similarity` (acepta variantes menores de la respuesta tecleada) y pistas
  progresivas (primera letra, longitud) modeladas en el core; todo con
  `node --test`.
- UI en la pestaña Repaso: se teclea la respuesta, corrección coloreada sobre
  el texto completo con su cita (`ref`); 0 créditos, 0 IA.

**Idea 6 — Chuleta sinóptica imprimible** (esfuerzo M)
- Nuevo `core/cheatsheet.js` puro: agrupa los `facts` del parser (plazos y
  números, definiciones, enumeraciones) por ley/artículo en una estructura de
  tabla determinista, cada fila con su cita/`ref` (anclaje §1.3); testeado con
  `node --test`.
- Integra los requisitos acumulados del backlog #3 (it.5+it.6): opción de
  chuleta personalizada cruzando con `failedIds`/`falseCertaintyIds` para
  destacar lo que el usuario falla.
- Vista imprimible con `@media print` (PDF vía diálogo del navegador),
  funcional desde `file://`.

**Idea 7 — Modo cadena (muerte súbita)** (esfuerzo S)
- Lógica de cadena en núcleo puro (`core/chain.js` o extensión de `quiz.js`):
  estado de racha, fin al primer fallo, anti-repetición dentro de la cadena,
  récord global y por ley; RNG inyectable y tests `node --test`.
- La pregunta que rompe la cadena entra en `failedIds` y como prioritaria del
  repaso (mecanismo `priorityIds` de `buildReviewQuiz`, ya existente).
- Récords persisten en `userState`/localStorage; solo preguntas activas del
  banco: 0 créditos, 0 IA.

## Backlog priorizado (siguientes iteraciones)

1. **Repaso espaciado de preguntas falladas**: priorizar falladas antiguas y
   aciertos con baja confianza. Baja de coste tras la it.5: el planificador de
   `srs.js` (cajas/intervalos) es reutilizable, y el termómetro (it.3) más el
   historial `perQuestion` (it.4) ya aportan los datos.
2. **Perfil de fallo + mapa de confusiones** (ideas subagente, it.6 + it.7,
   fusionadas): clasifica los errores acumulados (¿plazos? ¿negaciones?
   ¿términos?) y detecta pares de conceptos confundidos recurrentes
   comparando opción elegida y correcta, con mini-drills binarios de
   discriminación (aportación it.7). Prerrequisito común: guardar el índice
   elegido en `perQuestion` (`scoreQuiz` ya devuelve `given`); los tags
   `mutation` de la it.5 abaratan la clasificación en preguntas demo. Núcleos
   puros `errorProfile.js`/`confusions.js`.
3. **Test por distribución de temas en la UI** — el core ya lo soporta
   (`buildDistributedQuiz`, «40 de A, 30 de B, 30 de C»); falta la UI de reparto.
4. **Modo audio manos libres** (ideas subagente, it.5 + it.6 + it.7, tres
   propuestas independientes): speechSynthesis lee pregunta, opciones y
   corrección, respuesta con teclas y fallback silencioso. Mantener el
   `core/audioQueue.js` de it.6 (secuenciación testeable) frente al «sin core»
   de it.7. Persiste el riesgo de voces en español desiguales por navegador y
   `file://`; validar con prueba manual.
5. **Plan de estudio con cuenta atrás al examen** (ideas subagente, it.6 +
   it.7, fusionadas): fecha de examen + plan diario cruzando radiografía,
   Leitner y readiness, con prescripción concreta («hoy: 10 preguntas de
   arts. 13-18 + 12 tarjetas + reto»; aportación it.7) y semáforo
   en-plazo/retrasado (`core/planner.js`). Baja prioridad hasta que
   `readiness` tenga rodaje: un pronóstico poco fiable desmotiva. Esfuerzo L:
   trocear si entra.
6. **El intruso: juego de enumeraciones** (idea subagente, it.6): 3 elementos
   reales de una enumeración + 1 colado de otra; núcleo puro
   `intruderGame.js` sobre los `facts` del parser. Esperar a que la familia de
   juegos (reverse, trapGame, flashcards) demuestre uso antes de ampliarla.
7. **Explícalo antes de mirar** (idea subagente, it.7): al fallar (o acertar
   dudando) el usuario escribe su razonamiento y la app lo compara con
   `explanation`+`sourceQuote` (Jaccard) señalando conceptos ausentes; núcleo
   puro `selfExplain.js`. Riesgo: el feedback por solape de tokens sobre texto
   libre puede ser ruido; prototipar la calidad del feedback antes de
   comprometer UI.
8. **Import de PDF** (pdf.js) además de .txt — la mayoría de temarios son PDF.
9. **Multi-usuario simulado** para probar la mecánica comunitaria completa en F0
   (cambiar de usuario activo y ver votos/recompensas cruzadas).
10. **Duelo** (ideas subagente, it.3/it.4 «fantasma» + it.5 «local» + it.7
    «fantasma con ritmo real», fusionadas): la variante it.7 abarata la
    repetición (secuencia de tiempos/aciertos reproducida con `timer.js` y
    transportada en la URL de reto vía `share.js`), pero el «reto compartido»
    (it.4) ya cubre la competición social a una fracción del coste; baja
    prioridad salvo señal de demanda de usuarios.
11. **Verificador IA de segundo pase** (F1): cada pregunta generada se re-valida
    con un prompt barato («¿es la marcada la única respuesta correcta según la fuente?»).
12. **Taxonomía de leyes** con autocompletado (BOE) para que «Ley 39/2015» y
    «LPACAP» no fragmenten el banco.
13. **PWA** (manifest + service worker) para estudiar offline en el móvil.

Nota de fusión (it.4): el antiguo punto «Mapa de calor del temario» sale del
backlog al quedar absorbido por la «Radiografía del temario» seleccionada; el
«Modo simulacro» y el «Taller de autor» se fusionan con sus variantes propuestas
en it.4 (ver tabla de evaluación).

Nota de fusión (it.5): «Caza la errata / ¿Dónde está la trampa?» sale del
backlog al ser seleccionada como «Cazador de erratas»; el «simulacro con hoja
de examen real» y el «cloze» se fusionan con sus gemelos del backlog (#1 y #3);
el «duelo local» se fusiona con «Duelo fantasma» (#10); «chuleta imprimible» y
«modo manos libres con voz» entran como puntos nuevos (#6 y #7).

Nota de fusión (it.6): el «Modo simulacro cronometrado» (antiguo #1, cuatro
propuestas independientes acumuladas) y el «Taller de autor / pregunta manual»
(antiguo #5) salen del backlog al ser seleccionados; el «dossier imprimible» se
fusiona con la «chuleta» (#3) y el «modo audio» con «manos libres» (#6), ambas
segundas propuestas independientes; «perfil de fallo», «el intruso» y «cuenta
atrás al examen» entran como puntos nuevos (#4, #7 y #8).

Nota de fusión (it.7): el «cloze/texto desvanecido» (antiguo #2, tercera
aparición) y el «dossier/chuleta imprimible» (antiguo #3, tercera aparición)
salen del backlog al ser seleccionados; el «mapa de confusiones» se fusiona con
«perfil de fallo» (#2), el «manos libres por voz» con «modo audio» (#4), el
«plan de estudio» con «cuenta atrás al examen» (#5) y el «duelo fantasma con
ritmo real» con «Duelo» (#10); «explícalo antes de mirar» entra como punto
nuevo (#7).
