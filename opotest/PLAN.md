# OpoTest — Mega Plan del Proyecto

> Plataforma web de generación de tests para opositores y estudiantes: subes tu temario
> (leyes, temas), la aplicación genera preguntas tipo test con IA, la comunidad las evalúa,
> y todos se benefician de un banco de preguntas compartido y de calidad creciente.

---

## 1. Visión de producto

### 1.1 Problema
- Los opositores necesitan practicar con tests, pero crear buenas preguntas es lento y caro.
- Las academias venden bancos de preguntas cerrados, caros y que no cubren el temario exacto de cada convocatoria.
- Muchas oposiciones comparten leyes (Constitución, Ley 39/2015, Ley 40/2015, EBEP...), por lo que las preguntas son reutilizables entre colectivos (bomberos, policía, administrativos...).

### 1.2 Solución
1. El usuario sube un texto y **lo acota**: qué oposición, si es una ley (cuál), qué título/capítulo/artículos.
2. La IA genera **X preguntas tipo test** (10/20/50/30 según plan) con 4 opciones, respuesta correcta, explicación y **cita de la fuente** (artículo).
3. Un **sistema de calidad** valida las preguntas: validación automática (estructura, duplicados, anclaje al texto) + evaluación comunitaria (votos, erratas) + autocorrección.
4. Las preguntas alimentan un **banco comunitario** etiquetado por ley/título/capítulo/artículos, de modo que las leyes comunes generan valor para todas las oposiciones.
5. **Créditos y suscripción** controlan el coste de IA; se recompensa a quien aporta preguntas buenas y a quien evalúa.

### 1.3 Principios
- **Calidad sobre cantidad**: toda pregunta debe estar anclada a un fragmento concreto de la fuente.
- **Comunidad que se autorregula**: votos, reportes de erratas, retirada automática de preguntas malas, créditos como recompensa.
- **Coste de IA controlado**: límites por plan, deduplicación antes de generar (reciclar antes que regenerar), modelos baratos para clasificar y caros solo para generar/verificar.

---

## 2. Fases del proyecto

| Fase | Alcance | Estado |
|------|---------|--------|
| **F0 — Prototipo (este repo)** | App 100% frontend sin backend. Generador heurístico offline + proveedor Claude API opcional. Banco, tests, calidad y créditos simulados en `localStorage`. Suite de tests unitarios. | ✅ Implementado |
| **F1 — Beta privada** | Backend real (auth, banco compartido en BD, pagos), generación con Claude API en servidor, pipeline de calidad automática. Prueba con el grupo de bomberos. | Plan §8 |
| **F2 — Lanzamiento** | Suscripciones (Stripe), moderación comunitaria con reputación, taxonomía oficial de leyes (BOE), apps móviles PWA. | Plan §8 |
| **F3 — Escala** | Marketplace de tests, estadísticas comparativas entre opositores, simulacros oficiales cronometrados, recomendador de estudio. | Plan §8 |

La F0 (este repositorio) sirve para **validar la mecánica completa** del producto sin coste de infraestructura: todo el dominio (generación, deduplicación, calidad, créditos, corrección de tests) está implementado como módulos puros y testeados, listos para moverse a un backend en F1.

### 2.1 Flujo de cada iteración de desarrollo

Cada iteración arranca con un **agente director** que decide la naturaleza de
la iteración antes de tocar código: explorar (funcionalidad nueva) o pulir
(consolidar lo que ya existe). Después, cada rama tiene sus propios subagentes.

```
                          ┌──────────────────────────────────────┐
                          │ 0 · AGENTE DIRECTOR                  │
                          │ Analiza estado real del proyecto     │
                          │ (código, MEJORAS.md, deuda, ratio    │
                          │ explorar/pulir) y elige la rama.     │
                          │ Justifica la decisión en MEJORAS.md. │
                          └──────────────┬───────────────────────┘
                 ┌───────────────────────┴───────────────────────┐
                 ▼ RAMA EXPLORAR                                 ▼ RAMA PULIR
┌────────────────────────────┐                  ┌────────────────────────────────┐
│ A1 · SUBAGENTE IDEAS       │                  │ B1 · SUBAGENTES AUDITORES      │
│ Propone 5-8 ideas          │                  │ Revisan lo YA construido, cada │
│ originales sin ver el      │                  │ uno con una lente: correctness │
│ backlog (≥50% no           │                  │ y bugs · UX y coherencia ·     │
│ evolutivas)                │                  │ calidad de preguntas/generador │
└────────────┬───────────────┘                  └────────────┬───────────────────┘
             ▼                                               ▼
┌────────────────────────────┐                  ┌────────────────────────────────┐
│ A2 · SUBAGENTE EVALUADOR   │                  │ B2 · SUBAGENTE PRIORIZADOR     │
│ Puntúa impacto/encaje/     │                  │ Deduplica y puntúa hallazgos   │
│ esfuerzo/riesgo (…/20),    │                  │ (gravedad × frecuencia de uso  │
│ selecciona 1-3 y registra  │                  │ ÷ coste), selecciona el lote   │
│ criterios de aceptación    │                  │ de pulido de la iteración y    │
│ en MEJORAS.md              │                  │ lo registra en MEJORAS.md      │
└────────────┬───────────────┘                  └────────────┬───────────────────┘
             └───────────────────────┬───────────────────────┘
                                     ▼
                     ┌───────────────────────────────┐
                     │ 3 · DESARROLLO                │
                     │ Implementa lo seleccionado,   │
                     │ tests de regresión, E2E,      │
                     │ suite en verde, commit + push │
                     └───────────────────────────────┘
```

**El agente director** elige la rama con criterios explícitos, no por turno fijo:
- Señales a favor de **pulir**: llevar ≥2-3 iteraciones seguidas explorando;
  hallazgos pendientes de QA o erratas conocidas; features publicadas sin usar
  por fricción de UX; módulos con cobertura floja o sin E2E; deuda anotada en
  MEJORAS.md («mitigado, solución completa en F1», TODOs); superficie de la app
  creciendo más rápido que la suite.
- Señales a favor de **explorar**: la app está estable y testeada de punta a
  punta; el backlog de pulido está vacío o es menor; hay huecos de propuesta de
  valor evidentes frente a la visión §1; una iteración de pulido acaba de cerrar.
- El director NO propone contenido (ni ideas ni arreglos): solo decide la rama,
  fija el foco («pulir: el flujo de test y la economía de créditos») y deja su
  decisión razonada en MEJORAS.md, para que la alternancia sea auditable.

Reglas de la **rama explorar** (como hasta ahora):
- El **subagente de ideas** trabaja sin ver el backlog (para no anclarse) — solo
  conoce la visión del producto y el estado actual del código. Se le pide
  originalidad: al menos la mitad de las ideas no deben ser evolutivas.
- El **subagente evaluador** puntúa cada idea (impacto usuario, esfuerzo F0,
  encaje con la visión y los principios §1.3, riesgo) y decide qué entra. Su
  veredicto queda en MEJORAS.md, también para las descartadas.

Reglas de la **rama pulir**:
- Los **auditores** (2-3 en paralelo, lentes distintas) revisan la app REAL —
  código y comportamiento, idealmente ejercitándola — y devuelven hallazgos
  concretos y reproducibles: bug con pasos, fricción de UX con pantalla,
  pregunta generada de mala calidad con ejemplo. No proponen features.
- El **priorizador** deduplica los hallazgos entre auditores, los puntúa
  (gravedad × frecuencia de uso estimada ÷ coste de arreglo) y selecciona un
  lote realista para la iteración, con criterios de aceptación en MEJORAS.md.
  Todo hallazgo no seleccionado queda en el backlog con su veredicto.
- Un arreglo de pulido siempre incluye su test de regresión: lo que se pule no
  puede volver a romperse en silencio.
- La fase 3 solo implementa lo seleccionado, con sus tests, y cierra con la
  suite completa en verde antes del commit.

---

## 3. Arquitectura del prototipo (F0)

Coherente con el estilo del repo: **vanilla JS, sin build tools, compatible `file://`**.
Los módulos de dominio son puros (sin DOM) y se cargan tanto en el navegador (globales)
como en Node (CommonJS) para poder testearlos con `node --test`.

```
opotest/
├── index.html            SPA con pestañas: Generar · Hacer test · Banco · Mi cuenta
├── css/styles.css        Estilos (variables CSS, responsive)
├── js/
│   ├── core/             ← Dominio puro, testeado, sin DOM
│   │   ├── textParser.js       Parseo del temario: artículos, frases, términos clave
│   │   ├── generator.js        Generador heurístico de preguntas (modo demo, gratis)
│   │   ├── similarity.js       Normalización + Jaccard para deduplicación
│   │   ├── validator.js        Validación automática de calidad de una pregunta
│   │   ├── bank.js             Banco de preguntas: CRUD, filtros, export/import, vistas por usuario
│   │   ├── quality.js          Votos, erratas, ciclo de vida (activa→revisión→retirada), recompensas
│   │   ├── credits.js          Planes, créditos mensuales, coste por pregunta, recompensas
│   │   └── quiz.js             Construcción de tests (anti-repetición), corrección, estadísticas
│   ├── aiProvider.js     Interfaz de proveedor: DemoProvider (offline) y ClaudeProvider (API key propia)
│   └── app.js            Orquestador de UI (único fichero con DOM)
├── tests/                node --test (sin dependencias)
├── PLAN.md               Este documento
└── MEJORAS.md            Backlog vivo de mejoras propuestas por iteración
```

### 3.1 Modelo de datos (F0, JSON en localStorage; en F1 pasa a BD)

```js
Question {
  id, text, options: [4], correctIndex,
  explanation, sourceQuote,            // anclaje a la fuente
  topic: { oposicion, tipo, ley, tituloCapitulo, articulos },
  authorId, createdAt, origin: 'demo'|'claude'|'import',
  quality: { up, down, erratas: [...], status: 'active'|'review'|'retired', score }
}
UserState { credits, plan, seenQuestionIds, failedQuestionIds, stats, rewardsLog }
```

### 3.2 Flujo de generación (el corazón del producto)

```
Texto + metadatos
  → textParser: trocea en artículos/frases, extrae hechos (números, plazos, definiciones, enumeraciones)
  → ¿Hay ya preguntas del mismo tema en el banco?  → ofrecer reciclar (gratis) antes de generar (créditos)
  → Proveedor (Demo o Claude) genera candidatas
  → validator: estructura correcta, 4 opciones, sin duplicar opciones, anclada al texto
  → similarity: descarta duplicadas contra el banco (Jaccard sobre texto normalizado)
  → Se cobran créditos SOLO por las preguntas aceptadas
  → Entran al banco como 'active' y quedan sujetas a evaluación comunitaria
```

### 3.3 Sistema de calidad (autorregulación)

- **Validación automática** al crear: estructura, opciones no duplicadas, longitud, anclaje (la cita debe existir en el texto fuente), respuesta correcta presente.
- **Votos comunitarios**: 👍/👎. Score = up − down.
- **Erratas**: cualquier usuario reporta texto libre; la pregunta pasa a `review`.
- **Ciclo de vida**: `active` → (score ≤ −3 o errata) `review` → (corregida) `active` | (score ≤ −5) `retired`. Las retiradas no salen en tests.
- **Recompensas**: +1 crédito al autor cuando su pregunta alcanza score +5 (una vez); +0.2 créditos por evaluar (con tope diario) — en F0 simulado localmente.

### 3.4 Créditos y planes (control de coste de IA)

| Plan | €/mes | Créditos/mes | Genera preguntas | Tests del banco |
|------|-------|--------------|------------------|-----------------|
| Gratis | 0 | 10 | 1 crédito = 1 pregunta | Ilimitados |
| Básico | 9,99 | 100 | igual | Ilimitados |
| Pro | 19,99 | 300 | igual | Ilimitados + simulacros |

Claves económicas:
- **Hacer test del banco es gratis o casi**: no consume IA. Es lo que genera comunidad y retención.
- **Generar consume créditos**: cubre el coste real de la API (≈0,01–0,03 €/pregunta con Claude, margen suficiente en todos los planes).
- **Reciclaje primero**: si el tema ya tiene preguntas suficientes, se ofrecen antes de gastar créditos.
- Recompensas por calidad devuelven créditos → incentiva aportar bien, no mucho.

---

## 4. Generación con IA (diseño del proveedor Claude)

- Modelo: `claude-sonnet-5` para generar (calidad/precio), `claude-haiku-4-5` para clasificar/deduplicar semánticamente en F1.
- Prompt con contrato estricto: JSON con `text, options[4], correctIndex, explanation, sourceQuote`, exigiendo que `sourceQuote` sea literal del texto y estilo de examen oficial (enunciados cerrados, distractores plausibles: números perturbados, órganos/plazos confundibles, negaciones).
- **Doble pase en F1**: un segundo prompt "verificador" comprueba cada pregunta contra la fuente (¿la respuesta marcada es la única correcta según el texto?) antes de publicarla. En F0 lo cubre `validator.js` de forma sintáctica.
- En F0 el `ClaudeProvider` funciona con API key propia del usuario (llamada directa desde navegador); el `DemoProvider` heurístico permite usar y probar TODO el producto sin coste ni conexión.

---

## 5. Estrategia de tests (F0)

- `node --test` sin dependencias. Módulos de dominio 100% cubiertos:
  - parser (artículos, frases, extracción de hechos), generador (estructura y anclaje de cada tipo de pregunta),
  - similitud/deduplicación (umbrales, falsos positivos), validador, banco (CRUD, filtros, export/import),
  - calidad (ciclo de vida, recompensas, idempotencia), créditos (límites, renovación mensual, gasto/ganancia),
  - quiz (anti-repetición, reparto por temas, corrección con penalización de oposición, repaso de falladas).
- La UI queda fina (solo wiring) precisamente para que lo testeable esté en `core/`.

## 6. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Coste de IA > ingresos de suscripción | Créditos duros por plan; reciclaje del banco antes de generar; modelos por tarea |
| Preguntas incorrectas dañan la confianza | Anclaje obligatorio a la fuente + verificador IA (F1) + erratas comunitarias + retirada automática |
| Contenido con copyright (temarios de academias) | Solo textos legales (BOE, dominio público) en el banco común; material privado se queda privado |
| Banco contaminado por spam | Validación automática + reputación de autor (F2) + créditos solo por calidad confirmada |
| RGPD / datos de usuarios | F1: backend UE, mínimos datos, borrado a petición |
| Preguntas repetidas aburren | Historial `seen` por usuario + deduplicación al generar + aleatorización |

## 7. Métricas de éxito (beta F1)
- ≥70% de preguntas generadas superan la evaluación comunitaria sin errata.
- Coste medio de IA por usuario de pago < 30% de su cuota.
- Retención semana 4 > 40% en el grupo piloto de bomberos.
- ≥50% de los tests realizados usan preguntas recicladas del banco (no generación nueva).

## 8. Roadmap post-prototipo
1. **F1 Beta**: backend (Node/Postgres o Supabase), auth, banco compartido real, generación server-side con doble pase verificador, límites por plan reales. Piloto con bomberos.
2. **F2 Lanzamiento**: Stripe, reputación y roles de moderación, taxonomía BOE (importar leyes por referencia oficial), PWA offline.
3. **F3 Escala**: simulacros cronometrados con baremo oficial, estadísticas comparativas, recomendador de repaso (espaciado), marketplace.

---

*Documento vivo: cada iteración de desarrollo actualiza MEJORAS.md y, si cambia el rumbo, este plan.*
