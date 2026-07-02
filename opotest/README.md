# OpoTest — Prototipo F0

Plataforma de tests para opositores: sube tu temario acotado (ley, título,
artículos), genera preguntas tipo test, y comparte un banco comunitario con
sistema de calidad y créditos.

- 📖 **Visión, arquitectura y roadmap**: [PLAN.md](PLAN.md)
- 🔁 **Backlog de mejoras por iteración**: [MEJORAS.md](MEJORAS.md)

## Ejecutar la aplicación

Abrir `index.html` directamente en el navegador (funciona desde `file://`,
sin servidor ni build). Pulsa **«🎓 Cargar ejemplo»** para probarla sin
material propio.

Todo el estado (banco de preguntas, créditos, historial) se guarda en
`localStorage` del navegador. En la fase F1 pasa a un backend real.

## Motores de generación

- **Demo** (por defecto): generador heurístico offline; extrae plazos,
  definiciones, enumeraciones y afirmaciones del texto y construye preguntas
  ancladas a la fuente. Gratis y sin red; simula el gasto de créditos.
- **Claude API**: usa tu propia API key para generar preguntas con IA.
  Pasa por el mismo control de calidad (validación + anclaje + deduplicación).

## Tests

```bash
cd opotest
node --test tests/*.test.js
```

Sin dependencias: solo el test runner nativo de Node (≥ 18). Los módulos de
`js/core/` son puros (sin DOM) y se cargan tanto en navegador como en Node.
