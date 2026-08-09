# Blackjack

Blackjack para jugar entre amigos con **un solo movil**, pasandoselo por turnos.
HTML, CSS y JavaScript sin dependencias: se abre `blackjack/index.html` en cualquier
navegador, tambien desde `file://`.

## Como se juega

1. **Paso 1**: eliges cuanta gente hay en la mesa (de 2 a 12), sus nombres y las fichas
   iniciales de cada jugador.
2. **Paso 2**: eliges **quien lleva la caja**. Esa persona reparte, recibe carta tapada y
   paga o cobra a los demas. El resto (hasta 11) son jugadores.
3. Cada ronda: apuestas por turnos (hay atajo de "misma apuesta para todos"), reparto,
   turno de cada jugador, turno de la caja y liquidacion.

Las cartas de **todos** los jugadores estan visibles en la mesa durante toda la ronda,
asi que quien tiene el movil ve tambien las manos de los demas.

## Reglas implementadas

- Zapato de 6 barajas, se baraja al llegar al corte (25% restante).
- El As vale 11 o 1; J, Q y K valen 10.
- Blackjack (As + 10 en las dos primeras cartas) paga **3:2**. Blackjack contra
  blackjack de la caja es empate.
- La caja mira su carta tapada cuando enseña As o figura de 10: si tiene blackjack,
  la ronda se cierra ahi.
- **Seguro** cuando la caja enseña As: cuesta la mitad de la apuesta y paga 2:1.
- **Doblar** con dos cartas: se dobla la apuesta y se recibe exactamente una carta.
- **Dividir** parejas del mismo valor, hasta 4 manos. Se permite doblar despues de
  dividir. Los ases divididos reciben una sola carta cada uno, no se vuelven a dividir
  y un 21 asi no cuenta como blackjack.
- La caja esta obligada a pedir con 16 o menos y a plantarse en cualquier 17,
  incluido el 17 blando (S17). La app no deja saltarse esa regla.
- Si la caja se pasa, gana todo el que siga en juego. Empate: se recupera la apuesta.
- No hay rendicion (surrender).

Las fichas son un sistema cerrado: lo que gana un jugador sale de la caja y al reves.
Si alguien se queda sin fichas puede recargar desde su turno de apuesta, y la caja
desde el menu.

## Estructura

```
blackjack/
├── index.html          Pantallas: configuracion, eleccion de caja y mesa
├── css/styles.css      Layout, tapete, asientos, apuestas
├── css/cards.css       Cartas (tres tamaños) y animacion de reparto
└── js/app.js           Shoe, BlackjackGame, TableUI, BlackjackApp
```

- `Shoe`: zapato de 6 barajas, mezcla Fisher-Yates y punto de corte.
- `BlackjackGame`: todo el estado y las reglas. Emite `onChange` en cada cambio.
- `TableUI`: dibuja tapete, asientos y el panel de turno. Sin estado propio.
- `BlackjackApp`: conecta ambos y gestiona los eventos de la interfaz.
