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

## Backlog priorizado (siguientes iteraciones)

1. **Test por distribución de temas en la UI** — el core ya lo soporta
   (`buildDistributedQuiz`, «40 de A, 30 de B, 30 de C»); falta la UI de reparto.
2. **Modo simulacro**: cronómetro, sin feedback hasta el final, baremo configurable
   por oposición (algunas restan 1/4 en vez de 1/3).
3. **Repaso espaciado**: priorizar falladas antiguas y aciertos con baja confianza
   (el historial `seenIds`/`failedIds` ya da la base).
4. **Multi-usuario simulado** para probar la mecánica comunitaria completa en F0
   (cambiar de usuario activo y ver votos/recompensas cruzadas).
5. **Verificador IA de segundo pase** (F1): cada pregunta generada se re-valida
   con un prompt barato («¿es la marcada la única respuesta correcta según la fuente?»).
6. **Import de PDF** (pdf.js) además de .txt — la mayoría de temarios son PDF.
7. **Taxonomía de leyes** con autocompletado (BOE) para que «Ley 39/2015» y
   «LPACAP» no fragmenten el banco.
8. **PWA** (manifest + service worker) para estudiar offline en el móvil.
