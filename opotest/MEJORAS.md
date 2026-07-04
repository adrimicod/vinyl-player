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

## Iteración 8 — Rama PULIR: flujo end-to-end de las modalidades y consolidación de la UI (completada)

**Decisión del agente director**: PULIR.
Las iteraciones 3-7 han sido **cinco iteraciones seguidas de la rama explorar** (el
umbral de §2.1 es ≥2-3), que han sumado ~13 features y 12 módulos nuevos de core sin
una sola pasada de consolidación; la superficie de UI crece más rápido que la
verificación: `app.js` está en 1.345 líneas sin ningún test propio ni E2E desde el
manual de la iteración 1, mientras la suite (182 tests, en verde) solo cubre `core/`.
Hay deuda anotada sin cerrar: el mutador de intercambio quedó «Mitigado…; solución
completa en F1 con verificador IA» (it.1 #3), y los propios evaluadores señalaron
riesgos que nadie ha verificado con rodaje («estimar con pocos datos engaña» en
`readiness`, it.5; «readiness lleva una iteración de rodaje… un pronóstico poco
fiable desmotiva», it.6-7). Además, features recién publicadas (simulacro, taller de
erratas, cloze, chuleta, cadena) no tienen constancia de QA sobre la app real.
**Foco encargado a los agentes de la rama**: pulir el flujo end-to-end de las
modalidades de estudio acumuladas en it.3-7 (test normal, reto diario, simulacro
cronometrado, repaso/flashcards/cloze, juegos reverse/trapGame/cadena, taller de
erratas y editor manual) y la coherencia de la UI orquestadora: los auditores deben
ejercitar la app real con las lentes correctness/bugs, UX-coherencia-persistencia de
`userState`, y calidad de preguntas del generador; el lote resultante debe incluir
tests de regresión y dejar cubierta E2E de los flujos clave.

**Priorización de la auditoría** (subagente priorizador). Tres auditores
(correctness / UX-persistencia / calidad del generador) aportaron 27 hallazgos;
deduplicados quedan 24 (B1=U2 son el mismo defecto visto por dos lentes; Q6 se
arregla con Q2 —ambos nacen del doble-extract del `textParser`—; Q4 reutiliza el
replace con contornos que `cloze.js` ya tiene). Puntuación: gravedad (1-5) ×
frecuencia de uso estimada (1-5) ÷ coste (XS=1, S=2, M=4; rangos al punto medio:
XS-S=1,5 · S-M=3).

| Id | Hallazgo | G×F÷C | Puntos | Veredicto |
|----|----------|-------|--------|-----------|
| B1/U2 | «Reto de hoy» visible y activo durante un test/simulacro/cadena: lo destruye sin confirmación (CONF ×2 auditores) | 5×4÷1 | **20,0** | ✅ Lote |
| U3 | El hash `#share=` nunca se limpia: la oferta reaparece en cada recarga y el reimport da «0 añadidas» como falso error | 3×4÷1 | **12,0** | ✅ Lote |
| U1 | Generar consume los 10 créditos del mes en un clic sin previsualización de coste (`#genCost` existe y nunca se rellena) | 4×4÷1,5 | **10,7** | ✅ Lote |
| Q2+Q6 | Fuga de respuestas: los ítems a) b) c) se extraen como enumeración Y como statement/number → preguntas del mismo lote que se chivan la respuesta; además statements de ítem suelto sin contexto (12/33 en SAMPLE_LAW) | 5×4÷2 | **10,0** | ✅ Lote |
| Q3 | El «dato» preguntado puede ser el número de la propia ley citada («¿Ley __/2015?») en vez del plazo; contamina generador, cloze, SRS y chuleta | 4×4÷2 | **8,0** | ✅ Lote |
| Q1 | 51% de los distractores swap/combo agramaticales o absurdos: la correcta se adivina por gramática (deuda anotada desde it.1 #3) | 5×5÷4 | **6,3** | ✅ Lote (mitigación heurística; arreglo completo sigue en F1, backlog #11) |
| B2 | Granja de créditos: alternar 👍/👎 en la misma pregunta paga recompensa de evaluador cada vez | 3×2÷1 | **6,0** | ✅ Lote |
| B4 | Cazador de erratas: botones de tipo de sabotaje no se deshabilitan tras responder → ✅ garantizado probando los 3 | 3×2÷1 | **6,0** | ✅ Lote |
| B5 | Compartir trunca silenciosamente a 10 preguntas: el receptor de un reto compite con nota de un test de 20-30 jugando 10 | 3×2÷1 | **6,0** | ✅ Lote (avisar) |
| B7 | Cloze: «✔ Corregir» repulsable escribe la solución en el input y re-evalúa contaminado | 2×3÷1 | **6,0** | ✅ Lote |
| B8 | El reto diario cuenta racha aunque se entregue todo en blanco (`completeDaily` incondicional) | 2×3÷1 | **6,0** | ✅ Lote |
| Q4 | El hueco puede caer dentro de una sigla («A__1»): `replace` sin contorno en `generator.js:169` y `srs.js:37` (`cloze.js` ya protege) | 3×2÷1 | **6,0** | ✅ Lote |
| U9 | El pill muestra créditos decimales («0.2 créditos») que sugieren poder generar cuando no se puede | 2×3÷1 | **6,0** | ✅ Lote |
| Q10 | Se piden 20 preguntas y llegan 5-11 sin aviso de material insuficiente | 2×3÷1 | **6,0** | ✅ Lote |
| B3 | La cadena infla `stats.tests`: `updateHistory` por respuesta (una cadena de 30 = 30 «tests hechos») | 3×3÷2 | **4,5** | ✅ Lote — desempata sobre sus iguales porque corrompe datos persistidos que alimentan readiness y radiografía y no se auto-reparan |
| Q5 | Definiciones sin coma → términos basura de 60 chars (`DEFINITION_RE` codicioso) | 3×3÷2 | **4,5** | → Backlog #14 — el cupo de fondo del generador (3) ya está cubierto por Q1+Q2/Q6+Q3; primera candidata it.9 |
| Q7 | Distractores numéricos sin concordancia («1 años») o delatores (entero entre decimales) | 3×3÷2 | **4,5** | → Backlog #14 — misma razón que Q5 |
| U6 | La pestaña «Repaso» no contiene ni enlaza el «Repaso de falladas» (vive en Hacer test) | 3×3÷2 | **4,5** | → Backlog #17 — reorganización de UI sin core, mejor junto a U5 |
| U7 | La cadena muestra la clave interna «todas» y el récord no aparece en Mis estadísticas | 2×2÷1 | **4,0** | → Backlog #19 — cosmético, por debajo del corte XS (≥6) |
| B6 | `generateBtn` ignora el retorno de `credits.spend()` y ClaudeProvider no recorta a `affordable` (PROBABLE, no confirmado) | 3×2÷2 | **3,0** | → Backlog #18 — único hallazgo sin confirmar; verificar con proveedor real antes de arreglar |
| U10 | Menores: «1 ejercicios», Banco lista 100 de N sin indicarlo, exportar sin feedback | 1×3÷1 | **3,0** | → Backlog #19 |
| U4 | Recargar durante un simulacro pierde el examen sin aviso (sin persistencia ni `beforeunload`) | 4×2÷3 | **2,7** | → Backlog #15 — el único S-M de estado; merece diseño propio (persistir vs. avisar), no cabe tras Q1 |
| U5 | Feedback inconsistente alert()/prompt() vs inline; en `file://` compartir cae a prompt de ~14.000 chars | 3×3÷4 | **2,3** | → Backlog #16 — M transversal; U1/U3/B5 del lote ya recortan sus peores casos |
| Q8 | Test inverso inventa artículos inexistentes y repite opciones | 2×2÷2 | **2,0** | → Backlog #14 |
| Q9 | La chuleta clasifica cualquier número como «plazo» | 2×2÷2 | **2,0** | → Backlog #14 |
| U8 | «📊 Ver en radiografía» no resalta ni desplaza al artículo débil | 2×2÷2 | **2,0** | → Backlog #19 |
| B9 | Colisión `OpoCore.THRESHOLDS` entre `quality.js` y `coverage.js` (hoy sin consumidor en navegador) | 1×1÷1 | **1,0** | → Backlog #20 — latente, sin síntoma actual |

### Lote seleccionado y criterios de aceptación

15 arreglos: los 11 XS confirmados con puntos ≥6, tres S (Q2+Q6, Q3, B3) y una M
(Q1, la deuda del generador anotada desde it.1). Corte razonado: el generador es
el corazón del producto (§1.3) y se lleva los arreglos de fondo Q1+Q2/Q6+Q3; B3
entra por integridad de datos persistidos; todo lo demás con coste ≥S espera.
Todo arreglo incluye su test de regresión (`node --test` para core; E2E/Playwright
para flujos de UI, que era el encargo expreso del director).

**B1/U2 — Ocultar el reto diario durante una sesión** (XS)
- Con un test/simulacro/cadena en curso, `#dailyCard` no está visible ni operable;
  al terminar o abandonar la sesión reaparece.
- Test de regresión E2E: iniciar test → la tarjeta no existe en el DOM →
  corregir → reaparece.

**U3 — Limpiar `#share=` tras consumirlo** (XS)
- Tras aceptar o rechazar la oferta, el hash desaparece de la URL
  (`history.replaceState`) y recargar no la re-muestra.
- Reimportar un test ya importado dice «ya lo tenías en el banco» en vez de
  «0 añadidas»; con test de regresión (core de import + E2E de recarga).

**U1 — Previsualización de coste al generar** (XS-S)
- `#genCost` muestra coste estimado y saldo antes del clic y se actualiza al
  cambiar la cantidad pedida; si créditos < pedido, aviso previo de recorte.
- Test de regresión E2E: el texto de coste refleja cantidad y saldo.

**Q2+Q6 — Cortar la doble extracción del parser** (S)
- Los ítems de enumeración no se re-extraen como facts statement/number: en
  SAMPLE_LAW, ningún par de preguntas del mismo lote comparte `sourceQuote`
  (los 9 pares actuales desaparecen); con test de regresión.
- Ningún statement generado procede de un ítem suelto de enumeración (los 12/33
  actuales pasan a 0); suite existente del parser/generador en verde.

**Q3 — Excluir citas legales como «dato» preguntado** (S)
- Regex de exclusión compartida (generador, cloze, SRS, chuleta): «Ley N/AAAA»,
  años y números de artículo no son seleccionables como hueco/valor.
- En SAMPLE_LAW no se genera ninguna pregunta «¿Ley __/2015?»; con test de
  regresión sobre los cuatro consumidores.

**Q1 — Mitigación heurística del swap agramatical** (M)
- `mutateSwap` preserva la puntuación final, exige terminación morfológica
  aproximada compatible y filtra candidatos; el % de distractores swap/combo
  inválidos sobre SAMPLE_LAW baja del 51% medido (umbral objetivo ≤20%,
  medido por el mismo procedimiento del auditor); con tests de regresión de
  los mutadores y suite actual en verde.
- Si tras filtrar no hay 3 distractores válidos, la pregunta se descarta con
  `reason` (no entra degradada al banco).

**B2 — Recompensa de evaluador idempotente por pregunta** (XS)
- Alternar 👍/👎 N veces sobre la misma pregunta paga como máximo una vez;
  con test de regresión en core (`rewardEvaluator`/quality).

**B4 — Deshabilitar tipos de sabotaje tras el veredicto** (XS)
- Tras responder, los botones de tipo quedan deshabilitados y solo se puntúa el
  primer veredicto; con test de regresión (core de trapGame + E2E).

**B5 — Avisar del truncado al compartir** (XS)
- Si el test supera MAX_SHARE, el emisor ve «se compartirán 10 de N» antes de
  copiar, y el enlace de reto indica sobre cuántas preguntas es la nota a batir;
  con test de regresión.

**B7 — «✔ Corregir» de cloze de un solo uso** (XS)
- Corregir deshabilita input y botón; la solución se muestra fuera del input y
  no se re-evalúa; con test de regresión.

**B8 — Racha solo con reto realmente respondido** (XS)
- `completeDaily` no cuenta si todas las respuestas están en blanco (criterio
  mínimo: ≥1 respuesta dada); con test de regresión en `daily.js`.

**Q4 — Huecos con contorno de palabra** (XS)
- `generator.js` y `srs.js` reutilizan el replace con lookarounds de `cloze.js`
  (helper compartido); «A-1» nunca produce «A__1»; con test de regresión.

**U9 — Pill de créditos sin decimales engañosos** (XS)
- El pill muestra el entero disponible (floor) o «<1»; nunca «0.2 créditos»;
  con test de regresión del formateo.

**Q10 — Aviso de material insuficiente** (XS)
- Si llegan menos preguntas de las pedidas, mensaje explícito con `factsUsed`
  («el texto solo da para N»); con test de regresión.

**B3 — La cadena no infla `stats.tests`** (S)
- Una cadena completa cuenta como 1 en `stats.tests` (o categoría propia),
  manteniendo el historial por pregunta para radiografía/readiness; con test de
  regresión: cadena de 30 → `stats.tests` +1, `perQuestion` con 30 registros.

## Iteración 9 — Rama PULIR: segunda tanda del generador y robustez de estado/feedback (completada)

**Decisión del agente director**: PULIR.
Aunque «una iteración de pulido acaba de cerrar» es señal pro-explorar (§2.1) y la
suite está en verde (190/190 tras el lote it.8), pesa más la señal pro-pulir de
«hallazgos pendientes de QA»: quedan 7 hallazgos CONFIRMADOS de la auditoría it.8
sin arreglar (#14-#20), cuatro de ellos (Q5/Q7/Q8/Q9) en el generador — el corazón
del producto según §1.3 («calidad sobre cantidad») — y el propio priorizador los
marcó «primeras candidatas para it.9», además de pedir verificar el efecto medible
de Q1+Q2/Q6+Q3; su corte fue por capacidad del lote, no por falta de valor. A ello
se suman U4 (gravedad 4: recargar pierde el simulacro, la feature insignia del plan
Pro) y un ratio acumulado de 5 explorar : 1 pulir tras ~13 features: la condición
pro-explorar «el backlog de pulido está vacío o es menor» NO se cumple. Segunda y
última pasada de consolidación antes de volver a explorar.
**Foco encargado a los agentes de la rama**: cerrar la deuda de auditoría it.8 en
dos frentes — (1) calidad del generador, segunda tanda (backlog #14: Q5 términos
basura de `DEFINITION_RE`, Q7 distractores numéricos sin concordancia o delatores,
Q8 test inverso con artículos inventados/opciones repetidas, Q9 chuleta que llama
«plazo» a cualquier número), verificando además con el procedimiento del auditor
que Q1+Q2/Q6+Q3 del lote it.8 lograron su efecto; y (2) robustez de estado y
feedback en flujos clave (backlog #15 U4: persistir o avisar en el simulacro en
curso; adelantar el peor caso de #16 U5: compartir en `file://` cae a un prompt de
~14.000 caracteres; #17 U6: la pestaña «Repaso» debe contener o enlazar el repaso
de falladas). Los auditores re-verifican estos hallazgos sobre la app real y pueden
aportar hallazgos nuevos de las mismas lentes; el priorizador compone el lote; todo
arreglo con su test de regresión (`node --test` en core, E2E en flujos de UI) y
suite en verde al cierre.

### Lote seleccionado (heredado de la auditoría it.8) y criterios de aceptación

Los hallazgos ya fueron auditados y puntuados en it.8 (backlog #14-#17): no se
relanzan auditores; el priorizador de it.8 los dejó como «primeras candidatas
para it.9». Todos con test de regresión y suite en verde al cierre.

**Q5 — Definiciones sin coma** — `DEFINITION_RE` corta el término ante el
determinante que abre la definición («todo/toda/aquel/aquella/el/la…»):
«vehículo de motor» en vez de 60 caracteres de basura; el caso con coma
(«interesado, aquella persona…») no cambia.

**Q7 — Distractores numéricos** — los decimales conservan el número de
decimales del original (nada de «31» entre «15,5»); sin alternativa «1» en
mutaciones dentro de frase (evita «1 años»); sin n×2 para n ≥ 60 (evita
«240 km/h»).

**Q8 — Test inverso** — los artículos inventados de relleno se limitan a
adyacentes plausibles (n±1..3) del artículo real, nunca n×2/n+10.

**Q9 — Chuleta** — nueva sección «Otras cifras»: solo van a «Plazos» los
números con contexto de plazo (plazo/término/antelación/prórroga o
día/mes/hora); «18 años» (edad) o «300 diputados» dejan de ser plazos.

**U4 — Simulacro** — aviso `beforeunload` mientras hay un simulacro en curso
sin corregir (la persistencia completa queda en backlog como decisión F1).

**U5 (caso peor) — Compartir** — fin del `prompt()` con URL de ~14.000
caracteres: caja inline con el enlace, botón «Copiar» y estado del
portapapeles, también en `file://`.

**U6 — Pestaña Repaso** — tarjeta «Falladas pendientes (N)» con acceso
directo al modo repaso de falladas desde la pestaña Repaso.

**Verificación del efecto it.8** — test de regresión anti-fuga: ninguna
opción correcta se repite entre preguntas del mismo lote generado.

## Iteración 10 — Rama EXPLORAR: personalización del estudio sobre los datos ya persistidos (completada)

**Decisión del agente director**: EXPLORAR.
Las tres condiciones pro-explorar de §2.1 se cumplen a la vez: (1) dos pasadas de
pulido consecutivas acaban de cerrar (it.8 con lote de 15 + it.9 con los 7 hallazgos
confirmados restantes de la auditoría, commit `c99d1aa`) y el backlog de pulido quedó
drenado — lo que resta no justifica una tercera pasada (#18 es el único PROBABLE sin
confirmar y exige proveedor real, #19 son menudencias XS de barrido, #20 es latente
sin consumidor en navegador); (2) la app está estable y verificada: suite en verde
198/198 (`node --test`, 22 ficheros) con los E2E de flujos clave que encargó it.8;
(3) hay huecos de propuesta de valor evidentes frente a la visión §1: el backlog de
features acumula señales fuertes sin atender (repaso espaciado de falladas como #1
histórico, perfil de fallo/confusiones con propuestas independientes en it.6 e it.7),
y la app ya persiste datos ricos (`perQuestion` con historial por pregunta, confianza,
tags `mutation`, cajas SRS) que ninguna feature explota aún de forma transversal. El
ratio acumulado queda en 5 explorar : 2 pulir, dentro del umbral de §2.1.
**Foco encargado a los agentes de la rama**: explorar la personalización del estudio
a partir de los datos que la app ya persiste (historial por pregunta, confianza,
falladas, SRS, radiografía, readiness) — que el subagente de ideas proponga, sin ver
el backlog, funcionalidades que conviertan esos datos en decisiones de estudio para
el opositor; el evaluador puntuará contra §1.3 (0 IA / 0 créditos preferente, núcleo
puro testeable) y compondrá la selección con sus criterios de aceptación.

Fase creativa del flujo §2.1: el subagente de ideas propuso 8 ideas dentro del
foco; evaluación del subagente evaluador (impacto usuario / encaje visión §1.3 /
esfuerzo F0, 5 = barato / riesgo invertido, 5 = poco riesgo; total sobre 20):

| # | Idea | Imp. | Enc. | Esf. | Ries. | Total | Veredicto |
|---|------|------|------|------|-------|-------|-----------|
| 4 | Talón de Aquiles: perfil por tipo de dato | 4 | 5 | 5 | 4 | **18** | ✅ Seleccionada — ES la mitad «perfil de fallo» del backlog #2 en su **tercera señal** (it.6 + it.7 + esta), y más barata que la versión del backlog: el `kind` (number/definition/enumeration/statement) ya viaja en cada pregunta generada, así que cruzarlo con `perQuestion` es un core puro trivial (`profile.js`) sin prerrequisitos. El botón «Entrenar solo plazos» convierte el diagnóstico en decisión de estudio: exactamente el foco del director. |
| 3 | Radar de olvido | 5 | 5 | 3 | 4 | **17** | ✅ Seleccionada — el olvido de lo dominado es el único dato ya persistido que ninguna feature explota (todas miran falladas, ninguna lo que se enfría) y conecta con el backlog #1 histórico («repaso espaciado», **tercera señal**). La posición en `seenIds` da la recencia sin migración de datos, y el mismo `staleness.js` ordena también las falladas por antigüedad → absorbe el núcleo del backlog #1 y lo cierra tras cuatro iteraciones en cabeza. |
| 5 | Parejas confundibles | 4 | 5 | 3 | 3 | **15** | ✅ Seleccionada — ES la mitad «mapa de confusiones» del backlog #2 en su **tercera propuesta independiente**; la variante «`similarity.js` al revés» esquiva el prerrequisito que encarecía la versión del backlog (persistir el índice elegido) y el modo «Gemelas» materializa los mini-drills de discriminación aportados en it.7. Con la 4 cierra el backlog #2 completo. Riesgo real: pares espurios o escasos en bancos pequeños → umbral testeado y degradación explícita. Desempata sobre la 1 (mismo total) por señal acumulada: cierra backlog histórico, la 1 no. |
| 1 | Némesis: «las 10 que creo que vas a fallar» | 3 | 4 | 5 | 3 | **15** | → Backlog (nuevo) — reutiliza bien `readiness` (successProbability sobre `perQuestion`), es S y la predicción-con-veredicto es un gancho metacognitivo original que además rescata las preguntas de acierto mediocre que nunca entran en `failedIds`. Pero no cierra ninguna señal histórica y hereda el riesgo ya documentado de readiness («estimar con pocos datos engaña», it.5): exigiría el mismo guard de datos mínimos. Primer candidato S para un hueco futuro. |
| 7 | Sesión a medida «estudia 15 min, elijo yo» | 4 | 4 | 3 | 3 | **14** | → Backlog, fusionada con «Plan de estudio» (#1 nuevo) — es exactamente la «prescripción diaria concreta» que it.7 pidió conservar, sin la cuenta atrás: al prescribir desde datos actuales (no pronósticos) esquiva la objeción de «estimaciones jóvenes». Cuarta señal de la familia planificación (it.6 + it.7 + it.10×2); pasa a ser la vía de entrada recomendada de esa fusión. No entra: sería una tercera M y solaparía con las tres seleccionadas, que ya convierten los mismos datos en decisiones. |
| 6 | Cinturones por artículo | 3 | 3 | 3 | 4 | **13** | → Backlog (nuevo) — la vitrina motiva, pero es gamificación sin decisión de estudio nueva (la radiografía ya dice dónde flojeas y readiness cuánto te falta), fuera del foco de la iteración. La aportación a conservar es el «examen de cinturón» como rito de consolidación (5 preguntas, mín. 4, muerte al 2º fallo). Esperar señal de uso, como se hizo con la familia de juegos (it.6). |
| 2 | Duelo contra tu yo pasado (fantasma) | 3 | 3 | 3 | 3 | **12** | → Backlog, fusionada con «Duelo» (#10) — **cuarta re-propuesta** (it.3, it.4, it.7). La novedad real (fantasma simulado desde la probabilidad histórica por pregunta, determinista con semilla del día) abarata la repetición frente a grabar ritmo real y sube el esfuerzo invertido respecto a it.3 (3 vs 2), pero el veredicto de fondo no cambia: el reto compartido (it.4) cubre la competición social a fracción del coste. Sin señal de demanda de usuarios, sigue baja. |
| 8 | Cuenta atrás: plan hasta el examen | 3 | 3 | 2 | 2 | **10** | → Backlog, fusionada con «Plan de estudio» (#1 nuevo) — **tercera vez rechazada** (it.6 #8, it.7 #3): sigue siendo L, `readiness` sigue sin el rodaje que ambas iteraciones pidieron, y un reparto de lo pendiente sobre estimaciones poco fiables desmotiva. La parte valiosa (prescribir qué estudiar hoy) ya la aporta la idea 7 dentro de la misma fusión, sin depender de fecha de examen. |

### Seleccionadas y criterios de aceptación

**Idea 4 — Talón de Aquiles: perfil por tipo de dato** (esfuerzo S)
- Nuevo `core/profile.js` puro: `buildKindProfile(bank, perQuestion)` cruza el
  `kind` de cada pregunta activa con intentos/aciertos → % de acierto y volumen
  por tipo; ignora preguntas sin `kind` o sin intentos y exige un mínimo de
  intentos por tipo para emitir diagnóstico (por debajo → «sin datos», nunca un
  número engañoso); determinista y cubierto con `node --test`.
- Diagnóstico visible en Mi cuenta/Repaso («Plazos: 38% · Definiciones: 82%…»)
  con el tipo más débil destacado; botón «Entrenar [tipo]» lanza un test
  filtrado por `kind` sobre preguntas activas (0 IA, 0 créditos).
- Tests: perfil correcto sobre un `perQuestion` sintético; el guard de datos
  mínimos; el filtro por `kind` solo sirve preguntas activas de ese tipo.

**Idea 3 — Radar de olvido** (esfuerzo M)
- Nuevo `core/staleness.js` puro: clasifica como «en riesgo de olvido» las
  preguntas dominadas (≥80% de acierto con un mínimo de intentos) cuya posición
  en `seenIds` indica recencia baja (recencia relativa: sin migración de
  datos ni timestamps nuevos); umbrales y casos límite cubiertos con
  `node --test`.
- Cierra el backlog #1 («repaso espaciado de falladas»): el mismo módulo ordena
  las falladas por antigüedad para `buildReviewQuiz`, y los aciertos cuya
  última confianza fue «dudo/adivino» no cuentan como dominio pleno
  (`perQuestion` se extiende de forma tolerante con estados previos, patrón
  it.4); ambos comportamientos testeados.
- Tarjeta en Repaso «N dominadas se están enfriando» con modo «Antióxido»
  (test solo con esas preguntas) y matiz ❄️ en las celdas de la radiografía
  con dominadas frías; 0 IA, 0 créditos.

**Idea 5 — Parejas confundibles** (esfuerzo M)
- Nuevo `core/confusables.js` puro: detecta pares de preguntas activas con
  similitud ≥ umbral (reutiliza `similarity.js`) donde al menos una esté en
  `failedIds`/`falseCertaintyIds`; salida determinista, sin pares duplicados
  (A–B ≡ B–A) ni auto-pares; tests de umbral (par claro detectado, par por
  debajo descartado).
- Modo «Gemelas» en Repaso: presenta las dos preguntas del par seguidas y, al
  corregir, muestra lado a lado ambos enunciados con sus citas (`sourceQuote`)
  señalando en qué difieren; el resultado alimenta el historial normal
  (`updateHistory`), sin contadores paralelos.
- Degradación explícita testeada: banco sin pares suficientes → «sin parejas
  confundibles todavía», sin romper la app ni ofrecer el modo vacío.

## Iteración 11 — Rama EXPLORAR: la sesión de estudio guiada (completada)

**Decisión del agente director**: EXPLORAR.
La superficie nueva de it.10 (profile, staleness, confusables + wiring en Mi
cuenta, Repaso y radiografía) aún no tiene auditoría, pero una sola iteración
de exploración no acumula la deuda que motivó it.8 (aquella pasada llegó tras
cinco iteraciones seguidas y rindió 27 hallazgos): la suite está en verde
211/211 (`node --test`, 22 ficheros, +13 tests aportados por it.10) y los tres
módulos entraron con núcleo puro testeado, así que la señal pro-pulir «≥2-3
iteraciones seguidas explorando» no se cumple. Sí se cumplen las pro-explorar:
el backlog de pulido es menor (#14-#18 son residuales anotados como F1, un
único PROBABLE sin confirmar que exige proveedor real, y barridos XS) y hay
huecos de valor con señal fuerte sin atender — el #1 del backlog («Plan de
estudio: sesión a medida», cuatro señales acumuladas it.6+it.7+it.10×2) es la
familia más propuesta del proyecto, seguido de «Modo audio» (tres señales) y
«Distribución por temas» (core `buildDistributedQuiz` ya hecho, falta solo UI).
Siendo esta la penúltima iteración del ciclo, explorar ahora y reservar it.12
para una pasada PULIR que audite junta la superficie de it.10+it.11 deja el
ciclo bien cerrado; el orden inverso lo terminaría con features sin auditar.
El ratio acumulado queda en 6 explorar : 2 pulir, asumible solo con it.12
apuntada a consolidar.
**Foco encargado a los agentes de la rama**: la sesión de estudio guiada —
convertir todo lo que la app ya sabe del opositor (historial, falladas, falsas
certezas, SRS, staleness, perfil por tipo, radiografía) en la decisión «qué
estudiar ahora mismo y por qué»; el subagente de ideas propone sin ver el
backlog funcionalidades de planificación/orquestación de la sesión (0 IA /
0 créditos preferente, núcleo puro testeable), y el evaluador puntúa contra
§1.3 cruzando con las señales acumuladas del backlog, dimensionando el lote en
S-M: la penúltima iteración no abre frentes L que it.12 no pueda consolidar.

Fase creativa del flujo §2.1: el subagente de ideas propuso 7 ideas dentro del
foco; evaluación del subagente evaluador (impacto usuario / encaje visión §1.3 /
esfuerzo F0, 5 = barato / riesgo invertido, 5 = poco riesgo; total sobre 20):

| # | Idea | Imp. | Enc. | Esf. | Ries. | Total | Veredicto |
|---|------|------|------|------|-------|-------|-----------|
| 1 | «Estudia ahora»: compositor de sesión con presupuesto de tiempo | 5 | 5 | 3 | 4 | **17** | ✅ Seleccionada — ES la mitad «sesión a medida» del backlog #1 en su **quinta señal** (it.6 + it.7 + it.10 ×2 + esta), la familia más propuesta del proyecto, y responde literalmente al foco del director («qué estudiar ahora mismo y por qué»). Todos los ingredientes existen ya como módulos puros (`srs.dueCards`, `staleness.coldIds`/`orderFailedByAge`, falsas certezas, `daily`): el compositor es orquestación pura sobre datos actuales, sin pronósticos — esquiva la objeción de «estimaciones jóvenes» exactamente como pedía la fusión it.10. Columna vertebral de la iteración. |
| 2 | Ticket de salida | 4 | 5 | 4 | 4 | **17** | ✅ Seleccionada — la verificación diferida (una fallada solo se «rescata» si se acierta al cerrar la sesión) es retrieval real, la técnica con más evidencia, y arregla de paso un sesgo actual: hoy un acierto inmediato post-fallo saca la pregunta de `failedIds` sin demostrar retención. Cierre natural de la sesión del compositor (idea 1). Riesgo acotado: el flag no-rescatar en `quiz.updateHistory` es opt-in y no cambia el comportamiento por defecto. |
| 6 | Detector de estudio-confort | 4 | 5 | 4 | 4 | **17** | ✅ Seleccionada — ataca la trampa nº1 del opositor (repasar lo ya sabido para sentirse bien) con la honestidad de §1.3 («calidad sobre cantidad» aplicada al propio estudio); reutiliza el criterio de dominio de `staleness.isMastered` y su CTA convierte el diagnóstico en decisión: enlaza con el bloque útil del compositor. S barato que completa el arco de la sesión guiada: componer (1) → avisar si no aporta (6) → verificar al salir (2). |
| 5 | Diagnóstico exprés (placement) | 3 | 4 | 4 | 4 | **15** | → Backlog (nuevo) — buen alimentador del compositor, pero solo sirve en el arranque en frío, una ventana de uso estrecha en F0 (el usuario genera su banco antes de tener volumen que estratificar), y el criterio de degradación a usuario nuevo de la idea 1 ya cubre parte del hueco. Esperar a que el compositor demuestre uso. |
| 3 | Previsión de carga semanal | 3 | 4 | 4 | 3 | **14** | → Backlog, fusionada con «cuenta atrás» (#3 nuevo, familia proyección temporal) — la mitad sólida es proyectar vencimientos Leitner (el estado SRS sí tiene fechas reales); la mitad frágil es el «cruce al tercio frío»: `staleness` es posicional (recencia relativa en `seenIds`), no temporal, así que ese cruce no es proyectable a 7 días sin inventar datos. Como primer paso barato de la familia, anotada en la fusión. |
| 4 | Cuenta atrás: ritmo hasta el examen | 4 | 3 | 3 | 2 | **12** | → Backlog, fusionada con #3 nuevo — **cuarta vez rechazada** (it.6 #8, it.7 #3, it.10 #8). El «rodaje» que las tres iteraciones pidieron para `readiness` no se ha producido: rodaje significa uso real que valide las estimaciones, y F0 sigue sin usuarios; además el «ritmo observado» que esta versión introduce necesita datos que hoy no existen (no hay log con timestamps — lo señala la propia idea 7). Estrenar un pronóstico motivacional justo antes de la pasada PULIR de it.12 es el peor encaje de calendario posible. |
| 7 | Bitácora de sesiones + momento óptimo del día | 3 | 3 | 3 | 2 | **11** | → Backlog (nuevo) — infraestructura nueva (log append-only con timestamps) cuyo valor aparece tras semanas de datos que la iteración no puede verificar, y el «momento óptimo del día» es propenso a ruido incluso con umbral (pocas sesiones por franja). Lo valioso a conservar: la bitácora es el prerrequisito del «ritmo observado» de la cuenta atrás — anotada como tal. |

### Seleccionadas y criterios de aceptación

**Idea 1 — «Estudia ahora»: compositor de sesión con presupuesto** (esfuerzo M)
- Nuevo `core/sessionPlanner.js` puro: `composeSession(budgetMinutes, inputs)`
  con entradas explícitas (falsas certezas, falladas ordenadas por antigüedad
  vía `staleness.orderFailedByAge`, tarjetas vencidas de `srs.dueCards`, frías
  de `staleness.coldIds`, reto diario si no está hecho) → agenda ordenada de
  bloques cuya duración estimada nunca excede el presupuesto (10/20/40);
  determinista con RNG y reloj inyectables (patrón `daily.js`/`srs.js`);
  presupuestos, prioridades entre fuentes y fuentes vacías cubiertos con
  `node --test`.
- Cada bloque lleva su `reason` textual («12 tarjetas vencidas», «4 falsas
  certezas de la Ley 39/2015») visible en la agenda; los bloques se encadenan
  automáticamente con barra de progreso y cada resultado alimenta los
  mecanismos existentes (`updateHistory`, `srs.review`) sin contadores
  paralelos.
- Guard de usuario nuevo testeado: sin historial suficiente la sesión degrada
  a bloques genéricos (reto diario + nunca vistas) sin romper ni prometer
  diagnóstico; 0 IA, 0 créditos.

**Idea 2 — Ticket de salida** (esfuerzo S)
- Nuevo `core/exitTicket.js` puro: `buildExitTicket(sessionIds, scored, bank)`
  selecciona hasta 3 preguntas SOLO de lo trabajado en la sesión/test recién
  cerrado, priorizando falladas y falsas certezas; RNG inyectable; tests:
  nunca incluye preguntas ajenas a la sesión, prioriza falladas sobre
  acertadas, sesión con <3 candidatas produce ticket menor o vacío sin error.
- Rescate diferido: una fallada solo sale de `failedIds` si se acierta en el
  ticket; `quiz.updateHistory` acepta un flag opt-in (no-rescatar) cuyo
  comportamiento por defecto no cambia (suite de regresión actual en verde);
  ambos caminos —con y sin flag— testeados con `node --test`.
- Declinar el ticket no penaliza: las falladas simplemente quedan pendientes
  de rescate para la siguiente sesión; integrado como cierre tanto del
  compositor (idea 1) como de un test normal.

**Idea 6 — Detector de estudio-confort** (esfuerzo S)
- Nuevo `core/comfort.js` puro: `assessSession(scored, perQuestion, opts)` →
  fracción del test que ya estaba dominada antes de empezar (criterio de
  dominio reutilizado de `staleness.isMastered`), con umbral configurable
  (defecto 70%) y guard de datos mínimos: por debajo de un mínimo de preguntas
  con historial devuelve «sin veredicto», nunca un falso aviso; testeado con
  `node --test` (sesión de confort detectada, sesión útil no marcada, guard).
- El aviso aparece solo tras corregir, con tono informativo («N de M ya las
  dominabas: este test te ha enseñado poco nuevo») y CTA que lanza el bloque
  útil del compositor (idea 1) o, en su defecto, el repaso de falladas; nunca
  bloquea ni penaliza.
- 0 IA, 0 créditos; solo lee datos ya persistidos (`perQuestion`).

## Iteración 12 — Rama PULIR: auditoría end-to-end de la superficie it.10-11 y cierre consolidado del ciclo (en curso)

**Decisión del agente director**: PULIR.
Se cumple la señal pro-pulir «≥2-3 iteraciones seguidas explorando» que it.11
ya anticipó al dejar «it.12 apuntada a PULIR para cerrar el ciclo consolidado»:
it.10 + it.11 han sumado 6 módulos de core nuevos (profile, staleness,
confusables, sessionPlanner, exitTicket, comfort) y ~260 líneas de wiring en
`app.js` (ya en 1.823 líneas: compositor con encadenado de bloques, tarjetas
dentro de sesión, ticket de salida, avisos de confort) sin una sola pasada de
auditoría ni cobertura E2E — la superficie crece más rápido que la
verificación, exactamente el patrón que rindió 27 hallazgos en it.8. La suite
está en verde (225/225, `node --test`, 24 ficheros) pero solo cubre `core/`:
el flujo integrado de la sesión guiada (agenda → bloques → confort → ticket) y
sus interacciones con los mecanismos preexistentes (rescate diferido de
`failedIds`, `updateHistory` con flag opt-in, reto diario dentro del
compositor) nunca se han ejercitado sobre la app real. Además el backlog
conserva hallazgos confirmados de auditorías previas sin cerrar (#19
menudencias XS, #20 colisión `THRESHOLDS` latente) que un lote de pulido puede
barrer. Siendo la ÚLTIMA iteración del ciclo, prima cerrar consolidado (§2.1):
terminar explorando dejaría dos iteraciones de features sin auditar; el ratio
queda en 6 explorar : 3 pulir.
**Foco encargado a los agentes de la rama**: auditar y pulir end-to-end la
superficie de it.10-11 — el flujo completo de la sesión guiada (compositor →
bloques encadenados → aviso de confort → ticket de salida y su rescate
diferido) y la integración de profile/staleness/confusables en Mi cuenta,
Repaso y radiografía; los auditores (lentes correctness/bugs, UX-coherencia y
persistencia de `userState`, calidad de las decisiones de estudio que emiten
los módulos nuevos) deben ejercitar la app real; el priorizador compone el
lote incluyendo, si cabe, el barrido de residuales confirmados (#19, #20);
todo arreglo con su test de regresión y cobertura E2E de la sesión guiada,
suite en verde al cierre.

## Backlog priorizado (siguientes iteraciones)

1. **Modo audio manos libres** (ideas subagente, it.5 + it.6 + it.7, tres
   propuestas independientes): speechSynthesis lee pregunta, opciones y
   corrección, respuesta con teclas y fallback silencioso. Mantener el
   `core/audioQueue.js` de it.6 (secuenciación testeable) frente al «sin core»
   de it.7. Persiste el riesgo de voces en español desiguales por navegador y
   `file://`; validar con prueba manual.
2. **Test por distribución de temas en la UI** — el core ya lo soporta
   (`buildDistributedQuiz`, «40 de A, 30 de B, 30 de C»); falta la UI de reparto.
3. **Cuenta atrás al examen + previsión de carga** (resto del antiguo #1 tras
   seleccionarse la «sesión a medida» en it.11, fusionado con las ideas 3 y 4
   del subagente it.11 — cuarta vez rechazada la cuenta atrás: it.6 + it.7 +
   it.10 + it.11): fecha de examen + volumen restante ÷ días + ritmo observado
   con semáforo (`pacing.js`), y previsión de 7 días de vencimientos Leitner
   con «adelanta N hoy» (`forecast.js`). Primer paso barato si se desbloquea:
   la previsión de vencimientos SRS (fechas reales ya persistidas); el «cruce
   al tercio frío» NO es proyectable (staleness es posicional, no temporal).
   Bloqueada por dos prerrequisitos: rodaje real de `readiness` y la bitácora
   con timestamps (#9) para el «ritmo observado».
4. **Némesis: «las 10 que creo que vas a fallar»** (idea subagente, it.10):
   test con las preguntas de menor probabilidad personal (`successProbability`
   de readiness sobre `perQuestion`), con predicción de nota antes y veredicto
   al corregir; rescata las preguntas de acierto mediocre que nunca entran en
   `failedIds`. Núcleo puro `nemesis.js`, esfuerzo S. Requiere el mismo guard
   de datos mínimos que readiness (it.5).
5. **Diagnóstico exprés (placement)** (idea subagente, it.11): test
   estratificado de ~10 maximizando señal (1 por artículo sin intentos, ≥1 por
   `kind`) para el arranque en frío; al corregir, salta al compositor de
   sesión. Núcleo puro `placement.js`, esfuerzo S. Esperar a que el compositor
   (it.11) demuestre uso: su guard de usuario nuevo ya cubre parte del hueco.
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
8. **Cinturones por artículo** (idea subagente, it.10): 🥉/🥈/🥇 por celda de
   radiografía según acierto+intentos, con «examen de cinturón» para subir
   (5 preguntas, mín. 4, muerte al 2º fallo) y vitrina en Mi cuenta. Núcleo
   puro `mastery.js`. Gamificación sin decisión de estudio nueva: esperar
   señal de uso, como con la familia de juegos.
9. **Bitácora de sesiones + momento óptimo del día** (idea subagente, it.11):
   log append-only con timestamps de cada sesión (hoy no existe) → bitácora
   semanal y franja horaria de mayor acierto con umbral anti-ruido
   (`sessionLog.js`, M). Su valor aparece tras semanas de datos; es además el
   prerrequisito del «ritmo observado» de la cuenta atrás (#3).
10. **Import de PDF** (pdf.js) además de .txt — la mayoría de temarios son PDF.
11. **Multi-usuario simulado** para probar la mecánica comunitaria completa en F0
    (cambiar de usuario activo y ver votos/recompensas cruzadas).
12. **Duelo** (ideas subagente, it.3/it.4 «fantasma» + it.5 «local» + it.7
    «fantasma con ritmo real» + it.10 «duelo contra tu yo pasado», fusionadas
    — cuarta re-propuesta): la variante it.10 abarata la repetición (fantasma
    simulado desde la probabilidad histórica por pregunta, determinista con
    semilla del día, `core/ghost.js`) frente a grabar ritmo real, pero el
    «reto compartido» (it.4) sigue cubriendo la competición social a una
    fracción del coste; baja prioridad salvo señal de demanda de usuarios.
13. **Verificador IA de segundo pase** (F1): cada pregunta generada se re-valida
    con un prompt barato («¿es la marcada la única respuesta correcta según la fuente?»).
14. **Taxonomía de leyes** con autocompletado (BOE) para que «Ley 39/2015» y
    «LPACAP» no fragmenten el banco.
15. **PWA** (manifest + service worker) para estudiar offline en el móvil.
16. **Persistencia completa del simulacro en curso** (resto de la auditoría
    it.8 U4): it.9 añadió el aviso `beforeunload`; persistir el estado del
    examen (timer incluido) en `userState` queda como decisión de diseño
    propia (S-M), anotada como candidata F1.
17. **Unificar la capa de feedback** (resto de la auditoría it.8 U5): mitad
    `alert()`/`prompt()` nativos, mitad UI inline; el peor caso (compartir en
    `file://` caía a un prompt de ~14.000 caracteres) quedó cerrado en it.9;
    resta la unificación M transversal.
18. **Cobro robusto del generador IA** (auditoría it.8: B6, PROBABLE, único
    hallazgo sin confirmar): `generateBtn` ignora el retorno de
    `credits.spend()` y ClaudeProvider no recorta su salida a `affordable` →
    preguntas gratis si el modelo devuelve de más. Confirmar con proveedor
    real (hoy solo Demo lo recorta) y arreglar ambos extremos.
19. **Menudencias de UI** (auditoría it.8: U7, U8, U10): clave interna «todas»
    visible en la cadena y récord ausente de Mis estadísticas; «Ver en
    radiografía» sin resalte ni scroll al artículo débil; «1 ejercicios» sin
    singular; el Banco lista 100 de N sin indicarlo; exportar sin feedback.
    Lote XS-S de barrido para cualquier hueco de iteración.
20. **Higiene de namespace en `OpoCore`** (auditoría it.8: B9): colisión
    `THRESHOLDS` entre `quality.js` y `coverage.js`; hoy sin consumidor en
    navegador, arreglar antes de que alguno lo consuma.

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

Nota de fusión (it.10): el «Repaso espaciado de preguntas falladas» (antiguo
#1, el más antiguo del backlog) sale al quedar absorbido por el «Radar de
olvido» seleccionado (sus dos requisitos — falladas antiguas primero y
aciertos con baja confianza — están en los criterios de aceptación); el
«Perfil de fallo + mapa de confusiones» (antiguo #2, tercera señal) sale al
ser seleccionado en sus dos mitades como «Talón de Aquiles» y «Parejas
confundibles»; la «sesión a medida» y la «cuenta atrás» se fusionan con el
«plan de estudio» (#1 nuevo, cuatro señales acumuladas) y el «duelo contra tu
yo pasado» con «Duelo» (#10, cuarta re-propuesta); «Némesis» y «Cinturones por
artículo» entran como puntos nuevos (#4 y #7). Además, los antiguos #14
(calidad del generador, segunda tanda) y #17 (pestaña Repaso) salen al quedar
cerrados por la it.9, y #15/#16 se reescriben como residuales de lo que it.9
dejó hecho.

Nota de fusión (it.11): la «sesión a medida» (la mitad del antiguo #1, cuatro
señales acumuladas) sale del backlog al ser seleccionada como «Estudia ahora»;
la «cuenta atrás» (la otra mitad, cuarta vez rechazada) permanece fusionada con
la «previsión de carga semanal» (idea 3 del subagente it.11) como #3, familia
de proyección temporal con dos prerrequisitos anotados; «diagnóstico exprés» y
«bitácora de sesiones» entran como puntos nuevos (#5 y #9). El «ticket de
salida» y el «detector de estudio-confort», seleccionados, no dejan rastro en
el backlog al ser ideas nuevas sin gemelas previas.
