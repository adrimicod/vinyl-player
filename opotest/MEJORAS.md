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

## Backlog priorizado (siguientes iteraciones)

1. **Repaso espaciado**: priorizar falladas antiguas y aciertos con baja confianza
   (sube de prioridad: el termómetro de la iteración 3 aporta justo el dato de
   confianza que faltaba; el historial `seenIds`/`failedIds` ya da la base).
2. **Test por distribución de temas en la UI** — el core ya lo soporta
   (`buildDistributedQuiz`, «40 de A, 30 de B, 30 de C»); falta la UI de reparto.
3. **Modo «Caza la errata»** (idea subagente, it.3): la app corrompe una pregunta
   buena reutilizando los mutadores del generador y el usuario detecta el fallo;
   entrena la detección de erratas que alimenta el sistema de calidad.
4. **Modo simulacro**: cronómetro, sin feedback hasta el final, baremo configurable
   por oposición (algunas restan 1/4 en vez de 1/3).
5. **Mapa de calor del temario** (idea subagente, it.3): rejilla ley → artículo por
   cobertura del banco y tasa de fallo personal; clic = test o Generar precargado.
   Refuerza «reciclar antes que generar».
6. **Import de PDF** (pdf.js) además de .txt — la mayoría de temarios son PDF.
7. **Taller de autor** (idea subagente, it.3): redactar preguntas a mano con
   `validator.js` como linter en vivo; la recompensa debe llegar por score
   comunitario (no al publicar) para respetar «créditos solo por calidad confirmada».
8. **Multi-usuario simulado** para probar la mecánica comunitaria completa en F0
   (cambiar de usuario activo y ver votos/recompensas cruzadas).
9. **Duelo fantasma** (idea subagente, it.3): repetir un test contra tu propia
   «repetición» grabada, exportable como JSON para retar a amigos; baja prioridad
   por coste de UI frente a valor de estudio.
10. **Verificador IA de segundo pase** (F1): cada pregunta generada se re-valida
    con un prompt barato («¿es la marcada la única respuesta correcta según la fuente?»).
11. **Taxonomía de leyes** con autocompletado (BOE) para que «Ley 39/2015» y
    «LPACAP» no fragmenten el banco.
12. **PWA** (manifest + service worker) para estudiar offline en el móvil.
