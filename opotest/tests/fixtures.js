/** Texto legal de ejemplo para los tests (estilo Ley 39/2015). */
const SAMPLE_LAW = `TÍTULO PRELIMINAR. Disposiciones generales.

Artículo 1. Objeto de la Ley.
La presente Ley tiene por objeto regular los requisitos de validez y eficacia de los actos administrativos de las Administraciones Públicas. El plazo máximo para resolver y notificar será de 6 meses desde la fecha de entrada de la solicitud en el registro electrónico.

Artículo 2. Definiciones.
Se entiende por interesado, aquella persona física o jurídica que promueve el procedimiento como titular de derechos o intereses legítimos individuales o colectivos. Los menores de 18 años podrán actuar mediante su representante legal ante las Administraciones Públicas.

Artículo 3. Derechos de las personas.
Las personas tienen los siguientes derechos en sus relaciones con las Administraciones Públicas:
a) A comunicarse con las Administraciones Públicas a través de un Punto de Acceso General electrónico de la Administración.
b) A ser asistidos en el uso de medios electrónicos en sus relaciones con las Administraciones Públicas.
c) A utilizar las lenguas oficiales en el territorio de su Comunidad Autónoma de residencia.
d) Al acceso a la información pública, a los archivos y a los registros administrativos.

Artículo 4 bis. Cómputo de plazos.
Cuando el plazo se fije en 15 días naturales deberá constar expresamente esta circunstancia en la correspondiente notificación. Las notificaciones deberán practicarse en un plazo de 10 días a partir de la fecha en que el acto haya sido dictado por el órgano competente.`;

const SAMPLE_TOPIC = {
  oposicion: 'Bombero',
  tipo: 'ley',
  ley: 'Ley 39/2015',
  tituloCapitulo: 'Título Preliminar',
  articulos: '1-4',
};

/** Pregunta bien formada para tests de validador/banco. */
function goodQuestion(overrides) {
  return Object.assign({
    text: 'Según el artículo 1 de la Ley 39/2015, ¿cuál es el plazo máximo para resolver y notificar?',
    options: ['6 meses', '3 meses', '12 meses', '1 mes'],
    correctIndex: 0,
    explanation: 'El artículo 1 fija el plazo máximo en 6 meses.',
    sourceQuote: 'El plazo máximo para resolver y notificar será de 6 meses',
    topic: SAMPLE_TOPIC,
    kind: 'number',
  }, overrides || {});
}

module.exports = { SAMPLE_LAW, SAMPLE_TOPIC, goodQuestion };
