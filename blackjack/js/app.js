/* ==========================================================
   Blackjack - hasta 11 jugadores + caja, en un solo movil
   Vanilla JS, sin dependencias, compatible con file://
   ========================================================== */

(function () {
    'use strict';

    /* ================= Constantes ================= */

    const SUITS = [
        { char: '♠', color: 'black' }, // picas
        { char: '♥', color: 'red' },   // corazones
        { char: '♦', color: 'red' },   // diamantes
        { char: '♣', color: 'black' }  // treboles
    ];
    const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

    const NUM_DECKS = 6;        // zapato de 6 barajas
    const PENETRATION = 0.25;   // se baraja cuando queda este % de cartas
    const MIN_BET = 5;
    const MAX_PLAYERS = 11;     // jugadores sin contar la caja
    const MAX_SEATS = MAX_PLAYERS + 1;
    const MAX_HANDS = 4;        // 3 divisiones como maximo
    const CHIP_VALUES = [5, 25, 100, 500];
    const REBUY = 200;
    const BANK_REBUY = 500;

    /* ================= Utilidades ================= */

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    function cardValue(rank) {
        if (rank === 'A') return 11;
        if (rank === 'J' || rank === 'Q' || rank === 'K') return 10;
        return parseInt(rank, 10);
    }

    // Devuelve el mejor total posible y si la mano es "blanda" (un As vale 11)
    function handValue(cards) {
        let total = 0;
        let aces = 0;
        for (const card of cards) {
            total += cardValue(card.rank);
            if (card.rank === 'A') aces++;
        }
        while (total > 21 && aces > 0) {
            total -= 10;
            aces--;
        }
        return { total: total, soft: aces > 0 };
    }

    function isNatural(cards) {
        return cards.length === 2 && handValue(cards).total === 21;
    }

    function totalText(cards) {
        if (!cards.length) return '';
        const value = handValue(cards);
        if (isNatural(cards)) return 'BJ';
        if (value.soft && value.total <= 21) return (value.total - 10) + '/' + value.total;
        return String(value.total);
    }

    function escapeHTML(text) {
        return String(text).replace(/[&<>"']/g, (ch) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[ch]);
    }

    /* ================= Zapato de cartas ================= */

    class Shoe {
        constructor(numDecks) {
            this.numDecks = numDecks;
            this.cards = [];
            this.shuffle();
        }

        get size() {
            return this.numDecks * 52;
        }

        shuffle() {
            this.cards = [];
            for (let d = 0; d < this.numDecks; d++) {
                for (const suit of SUITS) {
                    for (const rank of RANKS) {
                        this.cards.push({ rank: rank, suit: suit.char, color: suit.color });
                    }
                }
            }
            // Fisher-Yates
            for (let i = this.cards.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                const tmp = this.cards[i];
                this.cards[i] = this.cards[j];
                this.cards[j] = tmp;
            }
            this.cutPoint = Math.floor(this.size * PENETRATION);
        }

        needsShuffle() {
            return this.cards.length <= this.cutPoint;
        }

        remainingPercent() {
            return Math.round((this.cards.length / this.size) * 100);
        }

        draw() {
            if (!this.cards.length) this.shuffle();
            const card = this.cards.pop();
            card._new = true;
            return card;
        }
    }

    /* ================= Modelo de mano ================= */

    function createHand(bet) {
        return {
            cards: [],
            bet: bet,
            doubled: false,
            fromSplit: false,
            aceSplit: false,
            done: false,
            busted: false,
            result: null
        };
    }

    /* ================= Motor del juego ================= */

    class BlackjackGame {
        constructor() {
            this.shoe = new Shoe(NUM_DECKS);
            this.players = [];
            this.bank = { name: 'Caja', chips: 0, cards: [], holeHidden: true, delta: 0 };
            this.round = 0;
            this.phase = 'setup'; // setup|betting|dealing|insurance|playing|bank|results
            this.turnIndex = 0;
            this.handIndex = 0;
            this.betIndex = 0;
            this.insuranceIndex = 0;
            this.busy = false;
            this.message = '';
            this.onChange = function () {};
        }

        emit() {
            this.onChange();
        }

        say(text) {
            this.message = text;
        }

        draw() {
            return this.shoe.draw();
        }

        /* ---------- inicio ---------- */

        setup(participants, bankIndex, bankroll) {
            const names = participants.slice(0, MAX_SEATS);
            this.bank = {
                name: names[bankIndex],
                chips: bankroll * Math.max(1, names.length - 1),
                cards: [],
                holeHidden: true,
                delta: 0
            };
            this.players = names
                .filter((name, i) => i !== bankIndex)
                .map((name, i) => ({
                    id: i,
                    name: name,
                    chips: bankroll,
                    lastBet: MIN_BET,
                    pendingBet: MIN_BET,
                    hands: [],
                    insurance: 0,
                    inRound: false,
                    delta: 0
                }));
            this.round = 0;
        }

        startRound() {
            this.round++;
            this.bank.cards = [];
            this.bank.holeHidden = true;
            this.bank.delta = 0;

            if (this.shoe.needsShuffle()) {
                this.shoe.shuffle();
                this.say('Zapato nuevo: cartas barajadas.');
            } else {
                this.say('');
            }

            for (const player of this.players) {
                player.hands = [];
                player.insurance = 0;
                player.inRound = false;
                player.delta = 0;
                player.pendingBet = Math.min(player.lastBet || MIN_BET, player.chips);
                if (player.pendingBet < MIN_BET) player.pendingBet = 0;
            }

            this.phase = 'betting';
            this.betIndex = 0;
            this.emit();
        }

        /* ---------- apuestas ---------- */

        currentBettor() {
            return this.players[this.betIndex] || null;
        }

        adjustBet(amount) {
            const player = this.currentBettor();
            if (!player || this.phase !== 'betting') return;
            const next = player.pendingBet + amount;
            if (next > player.chips) return;
            player.pendingBet = next;
            this.emit();
        }

        clearBet() {
            const player = this.currentBettor();
            if (!player) return;
            player.pendingBet = 0;
            this.emit();
        }

        repeatBet() {
            const player = this.currentBettor();
            if (!player) return;
            player.pendingBet = Math.min(player.lastBet, player.chips);
            this.emit();
        }

        confirmBet() {
            const player = this.currentBettor();
            if (!player || this.phase !== 'betting') return;
            if (player.pendingBet < MIN_BET || player.pendingBet > player.chips) return;
            this.commitBet(player, player.pendingBet);
            this.betIndex++;
            this.afterBetting();
        }

        // Atajo: aplica la apuesta actual al resto de jugadores
        betSameForAll() {
            const player = this.currentBettor();
            if (!player || this.phase !== 'betting') return;
            const amount = player.pendingBet;
            if (amount < MIN_BET) return;
            for (let i = this.betIndex; i < this.players.length; i++) {
                const other = this.players[i];
                const bet = Math.min(amount, other.chips);
                if (bet >= MIN_BET) this.commitBet(other, bet);
            }
            this.betIndex = this.players.length;
            this.afterBetting();
        }

        commitBet(player, amount) {
            player.chips -= amount;
            player.lastBet = amount;
            player.pendingBet = amount;
            player.inRound = true;
            player.hands = [createHand(amount)];
        }

        passBet() {
            if (this.phase !== 'betting') return;
            const player = this.currentBettor();
            if (player) player.pendingBet = 0;
            this.betIndex++;
            this.afterBetting();
        }

        rebuy() {
            const player = this.currentBettor();
            if (!player) return;
            player.chips += REBUY;
            player.pendingBet = Math.min(MIN_BET, player.chips);
            this.emit();
        }

        rebuyBank() {
            this.bank.chips += BANK_REBUY;
            this.emit();
        }

        afterBetting() {
            if (this.betIndex < this.players.length) {
                this.emit();
                return;
            }
            if (!this.players.some((p) => p.inRound)) {
                this.say('Nadie ha apostado en esta ronda.');
                this.phase = 'results';
                this.emit();
                return;
            }
            this.deal();
        }

        /* ---------- reparto ---------- */

        async deal() {
            this.phase = 'dealing';
            this.busy = true;
            this.say('Reparte ' + this.bank.name + '...');
            this.emit();

            const active = this.players.filter((p) => p.inRound);
            for (let pass = 0; pass < 2; pass++) {
                for (const player of active) {
                    player.hands[0].cards.push(this.draw());
                    this.emit();
                    await sleep(150);
                }
                this.bank.cards.push(this.draw());
                this.emit();
                await sleep(150);
            }

            this.busy = false;
            const upCard = this.bank.cards[0];

            if (upCard.rank === 'A') {
                this.startInsurance();
                return;
            }
            if (cardValue(upCard.rank) === 10 && this.bankHasNatural()) {
                this.say('Blackjack de la caja.');
                this.revealAndSettle();
                return;
            }
            this.say('');
            this.startPlay();
        }

        bankHasNatural() {
            return isNatural(this.bank.cards);
        }

        /* ---------- seguro ---------- */

        startInsurance() {
            this.phase = 'insurance';
            this.insuranceIndex = 0;
            this.say('La caja muestra un As. Se ofrece seguro.');
            this.skipInsuranceIfNeeded();
        }

        currentInsurer() {
            return this.players[this.insuranceIndex] || null;
        }

        insuranceCost(player) {
            if (!player || !player.inRound || !player.hands.length) return 0;
            return Math.floor(player.hands[0].bet / 2);
        }

        skipInsuranceIfNeeded() {
            while (this.insuranceIndex < this.players.length) {
                const player = this.players[this.insuranceIndex];
                const cost = this.insuranceCost(player);
                if (player.inRound && cost > 0 && player.chips >= cost) break;
                this.insuranceIndex++;
            }
            if (this.insuranceIndex >= this.players.length) {
                this.resolveInsurance();
                return;
            }
            this.emit();
        }

        answerInsurance(takeIt) {
            if (this.phase !== 'insurance') return;
            const player = this.currentInsurer();
            if (!player) return;
            if (takeIt) {
                const cost = this.insuranceCost(player);
                if (cost > 0 && player.chips >= cost) {
                    player.chips -= cost;
                    player.insurance = cost;
                }
            }
            this.insuranceIndex++;
            this.skipInsuranceIfNeeded();
        }

        async resolveInsurance() {
            this.busy = true;
            this.say(this.bank.name + ' comprueba su carta tapada...');
            this.emit();
            await sleep(700);
            this.busy = false;

            if (this.bankHasNatural()) {
                this.say('Blackjack de la caja. El seguro paga 2:1.');
                this.revealAndSettle();
                return;
            }
            this.say('No hay blackjack. Los seguros se pierden.');
            this.startPlay();
        }

        /* ---------- turno de los jugadores ---------- */

        startPlay() {
            this.phase = 'playing';
            for (const player of this.players) {
                if (!player.inRound) continue;
                for (const hand of player.hands) {
                    if (isNatural(hand.cards)) hand.done = true;
                }
            }
            this.turnIndex = 0;
            this.handIndex = -1;
            this.advance();
        }

        currentPlayer() {
            return this.players[this.turnIndex] || null;
        }

        currentHand() {
            const player = this.currentPlayer();
            if (!player) return null;
            return player.hands[this.handIndex] || null;
        }

        async advance() {
            let p = this.turnIndex;
            let h = this.handIndex + 1;
            while (p < this.players.length) {
                const player = this.players[p];
                if (player.inRound) {
                    while (h < player.hands.length) {
                        if (!player.hands[h].done) {
                            this.turnIndex = p;
                            this.handIndex = h;
                            await this.prepareHand();
                            return;
                        }
                        h++;
                    }
                }
                p++;
                h = 0;
            }
            this.startBankTurn();
        }

        // Completa la mano recien dividida y cierra las que ya no pueden jugar
        async prepareHand() {
            const hand = this.currentHand();
            if (!hand) return;

            if (hand.cards.length === 1) {
                this.busy = true;
                this.emit();
                await sleep(250);
                hand.cards.push(this.draw());
                this.busy = false;
                this.emit();
                await sleep(250);
            }

            const value = handValue(hand.cards);
            if (hand.aceSplit || value.total >= 21) {
                hand.done = true;
                if (value.total > 21) hand.busted = true;
                await this.advance();
                return;
            }
            this.emit();
        }

        canDouble() {
            const player = this.currentPlayer();
            const hand = this.currentHand();
            if (this.phase !== 'playing' || this.busy || !hand) return false;
            return hand.cards.length === 2 && !hand.aceSplit && player.chips >= hand.bet;
        }

        canSplit() {
            const player = this.currentPlayer();
            const hand = this.currentHand();
            if (this.phase !== 'playing' || this.busy || !hand) return false;
            if (hand.cards.length !== 2) return false;
            if (player.hands.length >= MAX_HANDS) return false;
            if (player.chips < hand.bet) return false;
            return cardValue(hand.cards[0].rank) === cardValue(hand.cards[1].rank);
        }

        async hit() {
            if (this.busy || this.phase !== 'playing') return;
            const hand = this.currentHand();
            if (!hand) return;

            this.busy = true;
            hand.cards.push(this.draw());
            this.emit();
            await sleep(300);
            this.busy = false;

            const value = handValue(hand.cards);
            if (value.total > 21) {
                hand.busted = true;
                hand.done = true;
                this.say(this.currentPlayer().name + ' se pasa con ' + value.total + '.');
                await this.advance();
                return;
            }
            if (value.total === 21) {
                hand.done = true;
                await this.advance();
                return;
            }
            this.emit();
        }

        async stand() {
            if (this.busy || this.phase !== 'playing') return;
            const hand = this.currentHand();
            if (!hand) return;
            hand.done = true;
            await this.advance();
        }

        async double() {
            if (!this.canDouble()) return;
            const player = this.currentPlayer();
            const hand = this.currentHand();

            player.chips -= hand.bet;
            hand.bet *= 2;
            hand.doubled = true;

            this.busy = true;
            hand.cards.push(this.draw());
            this.emit();
            await sleep(450);
            this.busy = false;

            hand.done = true;
            const value = handValue(hand.cards);
            if (value.total > 21) {
                hand.busted = true;
                this.say(player.name + ' dobla y se pasa con ' + value.total + '.');
            } else {
                this.say(player.name + ' dobla y se planta con ' + value.total + '.');
            }
            await this.advance();
        }

        async split() {
            if (!this.canSplit()) return;
            const player = this.currentPlayer();
            const hand = this.currentHand();

            player.chips -= hand.bet;
            const moved = hand.cards.pop();
            const splittingAces = hand.cards[0].rank === 'A';

            const newHand = createHand(hand.bet);
            newHand.cards.push(moved);
            newHand.fromSplit = true;
            newHand.aceSplit = splittingAces;

            hand.fromSplit = true;
            hand.aceSplit = splittingAces;

            player.hands.splice(this.handIndex + 1, 0, newHand);
            this.say(player.name + ' divide la mano.');

            // Retrocedemos para que advance() vuelva a esta misma mano y la complete
            this.handIndex--;
            await this.advance();
        }

        /* ---------- turno de la caja ---------- */

        async startBankTurn() {
            this.phase = 'bank';
            this.busy = true;
            this.bank.holeHidden = false;
            this.say('Turno de ' + this.bank.name + '.');
            this.emit();
            await sleep(600);
            this.busy = false;
            this.emit();
        }

        someonePending() {
            return this.players.some((p) => p.inRound && p.hands.some((h) => !h.busted));
        }

        bankMustHit() {
            return handValue(this.bank.cards).total < 17;
        }

        async bankHit() {
            if (this.phase !== 'bank' || this.busy || !this.bankMustHit()) return;
            this.busy = true;
            this.bank.cards.push(this.draw());
            this.emit();
            await sleep(350);
            this.busy = false;
            const value = handValue(this.bank.cards);
            if (value.total > 21) this.say('La caja se pasa con ' + value.total + '.');
            this.emit();
        }

        bankStand() {
            if (this.phase !== 'bank' || this.busy) return;
            if (this.bankMustHit() && this.someonePending()) return;
            this.settle();
        }

        revealAndSettle() {
            this.bank.holeHidden = false;
            this.settle();
        }

        /* ---------- pagos ---------- */

        settle() {
            const bankBJ = this.bankHasNatural();
            const bankTotal = handValue(this.bank.cards).total;
            this.bank.holeHidden = false;

            let bankDelta = 0;

            for (const player of this.players) {
                if (!player.inRound) continue;
                let delta = 0;

                if (player.insurance > 0) {
                    if (bankBJ) {
                        player.chips += player.insurance * 3; // apuesta + 2:1
                        delta += player.insurance * 2;
                    } else {
                        delta -= player.insurance;
                    }
                }

                for (const hand of player.hands) {
                    const total = handValue(hand.cards).total;
                    const playerBJ = isNatural(hand.cards) && !hand.fromSplit;

                    if (hand.busted) {
                        hand.result = 'lose';
                        delta -= hand.bet;
                    } else if (playerBJ && bankBJ) {
                        hand.result = 'push';
                        player.chips += hand.bet;
                    } else if (playerBJ) {
                        const profit = Math.floor(hand.bet * 1.5); // blackjack paga 3:2
                        hand.result = 'blackjack';
                        player.chips += hand.bet + profit;
                        delta += profit;
                    } else if (bankBJ) {
                        hand.result = 'lose';
                        delta -= hand.bet;
                    } else if (bankTotal > 21 || total > bankTotal) {
                        hand.result = 'win';
                        player.chips += hand.bet * 2;
                        delta += hand.bet;
                    } else if (total === bankTotal) {
                        hand.result = 'push';
                        player.chips += hand.bet;
                    } else {
                        hand.result = 'lose';
                        delta -= hand.bet;
                    }
                }

                player.delta = delta;
                bankDelta -= delta;
            }

            this.bank.delta = bankDelta;
            this.bank.chips += bankDelta;

            this.phase = 'results';
            if (this.bank.chips <= 0) {
                this.say('La caja se ha quedado sin fichas. Recargala desde el menu.');
            } else {
                this.say('');
            }
            this.emit();
        }
    }

    /* ================= Textos ================= */

    const RULES_HTML = [
        '<h3>Objetivo</h3>',
        '<p>Acercarte a 21 mas que la caja sin pasarte. Cada jugador juega contra la caja, no contra los demas.</p>',
        '<h3>Valores</h3>',
        '<ul>',
        '<li>Del 2 al 10 valen su numero.</li>',
        '<li>J, Q y K valen 10.</li>',
        '<li>El As vale 11 o 1, lo que mas convenga.</li>',
        '</ul>',
        '<h3>Blackjack</h3>',
        '<p>As + carta de 10 en las dos primeras cartas. Paga 3:2. Si la caja tambien lo tiene, empate.</p>',
        '<h3>Jugadas</h3>',
        '<ul>',
        '<li><b>Pedir</b>: otra carta. Si pasas de 21, pierdes la apuesta.</li>',
        '<li><b>Plantarse</b>: te quedas con tu total.</li>',
        '<li><b>Doblar</b>: solo con dos cartas. Doblas la apuesta y recibes exactamente una carta.</li>',
        '<li><b>Dividir</b>: con dos cartas del mismo valor. Se juegan como manos separadas (hasta 4). Los ases divididos reciben una sola carta cada uno y un 21 asi no cuenta como blackjack.</li>',
        '<li><b>Seguro</b>: si la caja muestra un As, puedes pagar la mitad de tu apuesta; paga 2:1 si la caja tiene blackjack.</li>',
        '</ul>',
        '<h3>La caja</h3>',
        '<ul>',
        '<li>Reparte, recibe una carta tapada y paga o cobra a todos.</li>',
        '<li>Esta obligada a pedir con 16 o menos y a plantarse en cualquier 17, incluido el 17 blando.</li>',
        '<li>Si se pasa, gana todo el que siga en juego.</li>',
        '</ul>',
        '<h3>Mesa</h3>',
        '<ul>',
        '<li>Zapato de 6 barajas, se baraja al llegar al corte.</li>',
        '<li>Apuesta minima ' + MIN_BET + ' fichas.</li>',
        '<li>Empate: recuperas tu apuesta.</li>',
        '</ul>'
    ].join('');

    const RESULT_LABEL = {
        blackjack: 'Blackjack',
        win: 'Gana',
        lose: 'Pierde',
        push: 'Empate'
    };

    const RESULT_CLASS = {
        blackjack: 'tag-win',
        win: 'tag-win',
        lose: 'tag-lose',
        push: 'tag-push'
    };

    /* ================= Render de cartas ================= */

    function cardHTML(card, options) {
        options = options || {};
        let size = '';
        if (options.big) size = ' big';
        else if (options.tiny) size = ' tiny';

        if (!card || options.hidden) return '<div class="pcard back' + size + '"></div>';

        // La animacion de reparto se reserva a las cartas grandes; las de los
        // asientos se dibujan sin tocar la marca para no consumirla antes.
        if (options.tiny) {
            return '<div class="pcard ' + card.color + size + '">' +
                '<span class="r">' + card.rank + '</span>' +
                '<span class="s">' + card.suit + '</span>' +
                '</div>';
        }

        const isNew = card._new ? ' deal-in' : '';
        card._new = false;
        return '<div class="pcard ' + card.color + size + isNew + '">' +
            '<span class="r">' + card.rank + '</span>' +
            '<span class="pip">' + card.suit + '</span>' +
            '<span class="s">' + card.suit + '</span>' +
            '</div>';
    }

    /* ================= Interfaz ================= */

    class TableUI {
        constructor(game) {
            this.game = game;
            this.el = {
                step1: document.getElementById('setupStep1'),
                step2: document.getElementById('setupStep2'),
                gameScreen: document.getElementById('gameScreen'),
                playerCount: document.getElementById('playerCount'),
                nameInputs: document.getElementById('nameInputs'),
                bankrollOptions: document.getElementById('bankrollOptions'),
                roleList: document.getElementById('roleList'),
                bankHint: document.getElementById('bankHint'),
                roundLabel: document.getElementById('roundLabel'),
                shoeLabel: document.getElementById('shoeLabel'),
                bankArea: document.getElementById('bankArea'),
                bankName: document.getElementById('bankName'),
                bankTotal: document.getElementById('bankTotal'),
                bankChips: document.getElementById('bankChips'),
                bankCards: document.getElementById('bankCards'),
                banner: document.getElementById('banner'),
                stage: document.getElementById('stage'),
                seats: document.getElementById('seats'),
                modal: document.getElementById('modal'),
                modalTitle: document.getElementById('modalTitle'),
                modalBody: document.getElementById('modalBody')
            };
        }

        /* ---------- pantallas ---------- */

        show(screen) {
            this.el.step1.classList.toggle('hidden', screen !== 'step1');
            this.el.step2.classList.toggle('hidden', screen !== 'step2');
            this.el.gameScreen.classList.toggle('hidden', screen !== 'game');
        }

        renderNameInputs(count) {
            const previous = Array.prototype.map.call(
                this.el.nameInputs.querySelectorAll('input'),
                (input) => input.value
            );
            let html = '';
            for (let i = 0; i < count; i++) {
                const value = previous[i] ? escapeHTML(previous[i]) : '';
                html += '<input type="text" maxlength="12" value="' + value +
                    '" placeholder="Jugador ' + (i + 1) + '">';
            }
            this.el.nameInputs.innerHTML = html;
        }

        readNames() {
            return Array.prototype.map.call(
                this.el.nameInputs.querySelectorAll('input'),
                (input, i) => (input.value.trim() || 'Jugador ' + (i + 1))
            );
        }

        renderRoleList(names, bankIndex, bankroll) {
            let html = '';
            names.forEach((name, index) => {
                const isBank = index === bankIndex;
                html += '<button type="button" class="role-option' + (isBank ? ' is-bank' : '') +
                    '" data-index="' + index + '">' +
                    '<span class="role-option-name">' + escapeHTML(name) + '</span>' +
                    '<span class="role-option-tag">' + (isBank ? 'Caja' : 'Jugador') + '</span>' +
                    '</button>';
            });
            this.el.roleList.innerHTML = html;

            const players = names.length - 1;
            this.el.bankHint.textContent =
                players + (players === 1 ? ' jugador' : ' jugadores') + ' con ' + bankroll +
                ' fichas cada uno. La caja empieza con ' + (bankroll * players) + '.';
        }

        /* ---------- mesa ---------- */

        render() {
            const game = this.game;
            this.el.roundLabel.textContent = 'Ronda ' + game.round;
            this.el.shoeLabel.textContent = 'Zapato ' + game.shoe.remainingPercent() + '%';
            this.el.banner.textContent = game.message || '';
            this.renderBank();
            this.renderSeats();
            this.renderStage();
        }

        renderBank() {
            const bank = this.game.bank;
            let html = '';
            bank.cards.forEach((card, index) => {
                const hidden = bank.holeHidden && index === 1;
                html += cardHTML(card, { hidden: hidden });
            });
            this.el.bankCards.innerHTML = html || '<span class="seat-empty">Sin cartas</span>';

            this.el.bankName.textContent = 'Caja: ' + bank.name;
            this.el.bankChips.textContent = bank.chips + ' fichas';
            this.el.bankTotal.textContent = bank.cards.length
                ? (bank.holeHidden ? totalText([bank.cards[0]]) : totalText(bank.cards))
                : '';
            this.el.bankArea.classList.toggle('is-turn', this.game.phase === 'bank');
        }

        // Todos los jugadores se ven siempre, con sus cartas boca arriba
        renderSeats() {
            const game = this.game;
            let html = '';

            game.players.forEach((player, index) => {
                let classes = 'seat';
                const isTurn =
                    (game.phase === 'betting' && index === game.betIndex) ||
                    (game.phase === 'insurance' && index === game.insuranceIndex) ||
                    (game.phase === 'playing' && index === game.turnIndex);
                if (isTurn) classes += ' is-turn';
                if (!player.inRound && game.phase !== 'betting') classes += ' is-out';

                let body = '';
                if (player.inRound && player.hands.length) {
                    player.hands.forEach((hand, handIndex) => {
                        const activeHand = game.phase === 'playing' &&
                            index === game.turnIndex && handIndex === game.handIndex;
                        let tag;
                        if (game.phase === 'results' && hand.result) {
                            tag = '<span class="seat-tag ' + (RESULT_CLASS[hand.result] || '') + '">' +
                                RESULT_LABEL[hand.result] + '</span>';
                        } else {
                            tag = '<span class="seat-tag">' + (totalText(hand.cards) || '-') +
                                (activeHand ? ' &#9654;' : '') + '</span>';
                        }
                        body += '<div class="seat-hand">' +
                            '<div class="seat-line"><span>' + hand.bet + '</span>' + tag + '</div>' +
                            '<div class="seat-cards">' +
                            (hand.cards.map((c) => cardHTML(c, { tiny: true })).join('') ||
                                '<span class="seat-empty">-</span>') +
                            '</div>' +
                            '</div>';
                    });
                } else {
                    const text = game.phase === 'betting' ? 'apostando...' : 'fuera de la ronda';
                    body = '<div class="seat-cards"><span class="seat-empty">' + text + '</span></div>';
                }

                html += '<div class="' + classes + '">' +
                    '<div class="seat-name">' + escapeHTML(player.name) + '</div>' +
                    '<div class="seat-line"><span class="seat-chips">' + player.chips + '</span>' +
                    (game.phase === 'results' && player.inRound
                        ? '<span class="seat-tag ' + (player.delta > 0 ? 'tag-win' : (player.delta < 0 ? 'tag-lose' : 'tag-push')) + '">' +
                          (player.delta > 0 ? '+' : '') + player.delta + '</span>'
                        : '<span class="seat-tag"></span>') +
                    '</div>' +
                    body +
                    '</div>';
            });

            this.el.seats.innerHTML = html;
        }

        renderStage() {
            const game = this.game;
            let html = '';
            switch (game.phase) {
                case 'betting': html = this.stageBetting(); break;
                case 'dealing': html = this.stageWaiting('Repartiendo cartas...'); break;
                case 'insurance': html = this.stageInsurance(); break;
                case 'playing': html = this.stagePlaying(); break;
                case 'bank': html = this.stageBank(); break;
                case 'results': html = this.stageResults(); break;
                default: html = '';
            }
            this.el.stage.innerHTML = html;
        }

        stageWaiting(text) {
            return '<div class="stage-head"><span class="stage-name">' + text + '</span></div>';
        }

        stageHead(name, subtitle, chips) {
            return '<div class="stage-head">' +
                '<div><div class="stage-name">' + escapeHTML(name) + '</div>' +
                '<div class="stage-sub">' + subtitle + '</div></div>' +
                '<div class="stage-chips">' + chips + ' fichas</div>' +
                '</div>';
        }

        stageBetting() {
            const game = this.game;
            const player = game.currentBettor();
            if (!player) return '';

            const head = this.stageHead(player.name, 'Haz tu apuesta y pasa el movil', player.chips);

            if (player.chips < MIN_BET) {
                return head +
                    '<p class="stage-sub">Sin fichas para la apuesta minima (' + MIN_BET + ').</p>' +
                    '<div class="actions">' +
                    '<button type="button" class="btn" data-act="pass">Se retira</button>' +
                    '<button type="button" class="btn btn-primary" data-act="rebuy">Recargar +' + REBUY + '</button>' +
                    '</div>';
            }

            let chips = '<div class="chip-row">';
            for (const value of CHIP_VALUES) {
                const disabled = player.pendingBet + value > player.chips ? ' disabled' : '';
                chips += '<button type="button" class="chip chip-' + value +
                    '" data-act="chip" data-value="' + value + '"' + disabled + '>' + value + '</button>';
            }
            chips += '</div>';

            const canConfirm = player.pendingBet >= MIN_BET;
            const remaining = game.players.length - game.betIndex;

            let actions = '<div class="actions">' +
                '<button type="button" class="btn btn-sm" data-act="clear">Borrar</button>' +
                '<button type="button" class="btn btn-sm" data-act="repeat">Repetir ' + player.lastBet + '</button>' +
                '<button type="button" class="btn btn-primary full" data-act="bet"' +
                (canConfirm ? '' : ' disabled') + '>Apostar ' + player.pendingBet + '</button>';
            if (remaining > 1) {
                actions += '<button type="button" class="btn btn-sm full" data-act="betall"' +
                    (canConfirm ? '' : ' disabled') + '>Misma apuesta para los ' + remaining + ' que faltan</button>';
            }
            actions += '<button type="button" class="btn btn-sm full btn-ghost" data-act="pass">Pasar ronda</button>' +
                '</div>';

            return head + '<div class="bet-display">' + player.pendingBet + '</div>' + chips + actions;
        }

        stageInsurance() {
            const game = this.game;
            const player = game.currentInsurer();
            if (!player) return '';
            const cost = game.insuranceCost(player);

            return this.stageHead(player.name, 'La caja muestra un As', player.chips) +
                '<div class="cards-row">' +
                player.hands[0].cards.map((c) => cardHTML(c)).join('') +
                '</div>' +
                '<p class="stage-sub">Seguro por ' + cost + ' fichas. Paga 2:1 si la caja tiene blackjack.</p>' +
                '<div class="actions">' +
                '<button type="button" class="btn" data-act="noins">No</button>' +
                '<button type="button" class="btn btn-primary" data-act="ins">Si, asegurar</button>' +
                '</div>';
        }

        stagePlaying() {
            const game = this.game;
            const player = game.currentPlayer();
            const current = game.currentHand();
            if (!player || !current) return this.stageWaiting('...');

            let html = this.stageHead(player.name, 'Es tu turno', player.chips);

            html += '<div>';
            player.hands.forEach((hand, index) => {
                const active = index === game.handIndex;
                let classes = 'hand-block';
                if (active) classes += ' is-active';
                else if (hand.done) classes += ' is-done';

                html += '<div class="' + classes + '">' +
                    '<div class="hand-head">' +
                    '<span>' + (player.hands.length > 1 ? 'Mano ' + (index + 1) : 'Tu mano') +
                    (hand.doubled ? ' (doblada)' : '') + '</span>' +
                    '<span><span class="bet-amount">' + hand.bet + '</span> &middot; ' +
                    (totalText(hand.cards) || '-') + '</span>' +
                    '</div>' +
                    '<div class="cards-row">' +
                    hand.cards.map((c) => cardHTML(c, { big: active })).join('') +
                    '</div>' +
                    '</div>';
            });
            html += '</div>';

            const disabled = game.busy ? ' disabled' : '';
            html += '<div class="actions">' +
                '<button type="button" class="btn btn-primary" data-act="hit"' + disabled + '>Pedir</button>' +
                '<button type="button" class="btn" data-act="stand"' + disabled + '>Plantarse</button>' +
                '<button type="button" class="btn" data-act="double"' +
                (game.canDouble() ? '' : ' disabled') + '>Doblar</button>' +
                '<button type="button" class="btn" data-act="split"' +
                (game.canSplit() ? '' : ' disabled') + '>Dividir</button>' +
                '</div>';

            return html;
        }

        stageBank() {
            const game = this.game;
            const bank = game.bank;
            const value = handValue(bank.cards);
            const mustHit = game.bankMustHit();
            const alive = game.someonePending();

            let subtitle;
            if (!alive) subtitle = 'Todos se han pasado, no hace falta robar';
            else if (mustHit) subtitle = 'Con ' + value.total + ' estas obligada a pedir';
            else subtitle = 'Con ' + value.total + ' te tienes que plantar';

            const closeLabel = value.total > 21 ? 'Me paso, ver resultado'
                : (alive ? 'Plantarse' : 'Ver resultado');

            return this.stageHead(bank.name + ' (caja)', subtitle, bank.chips) +
                '<div class="cards-row">' +
                bank.cards.map((c) => cardHTML(c, { big: true })).join('') +
                '</div>' +
                '<div class="actions">' +
                '<button type="button" class="btn btn-primary" data-act="bankhit"' +
                (mustHit && alive && !game.busy ? '' : ' disabled') + '>Robar carta</button>' +
                '<button type="button" class="btn" data-act="bankstand"' +
                ((!mustHit || !alive) && !game.busy ? '' : ' disabled') + '>' + closeLabel + '</button>' +
                '</div>';
        }

        stageResults() {
            const game = this.game;
            let rows = '';

            for (const player of game.players) {
                if (!player.inRound) continue;
                const detail = player.hands.map((hand) => {
                    return totalText(hand.cards) + ' ' + (RESULT_LABEL[hand.result] || '');
                }).join(' &middot; ');

                const sign = player.delta > 0 ? '+' : '';
                const cls = player.delta > 0 ? 'tag-win' : (player.delta < 0 ? 'tag-lose' : 'tag-push');

                rows += '<div class="result-row">' +
                    '<div><div class="result-name">' + escapeHTML(player.name) + '</div>' +
                    '<div class="result-detail">' + detail +
                    (player.insurance ? ' &middot; seguro ' + player.insurance : '') + '</div></div>' +
                    '<div class="result-delta ' + cls + '">' + sign + player.delta + '</div>' +
                    '</div>';
            }

            if (!rows) {
                rows = '<p class="stage-sub">Ronda sin apuestas.</p>';
            } else {
                const bank = game.bank;
                const sign = bank.delta > 0 ? '+' : '';
                const cls = bank.delta > 0 ? 'tag-win' : (bank.delta < 0 ? 'tag-lose' : 'tag-push');
                rows += '<div class="result-row">' +
                    '<div><div class="result-name">' + escapeHTML(bank.name) + ' (caja)</div>' +
                    '<div class="result-detail">' + totalText(bank.cards) + ' &middot; ' +
                    bank.chips + ' fichas</div></div>' +
                    '<div class="result-delta ' + cls + '">' + sign + bank.delta + '</div>' +
                    '</div>';
            }

            return '<div class="stage-head"><span class="stage-name">Resultado</span></div>' +
                '<div class="results-list">' + rows + '</div>' +
                '<div class="actions">' +
                '<button type="button" class="btn btn-primary full" data-act="next">Siguiente ronda</button>' +
                '</div>';
        }

        /* ---------- modal ---------- */

        openModal(title, bodyHTML) {
            this.el.modalTitle.textContent = title;
            this.el.modalBody.innerHTML = bodyHTML;
            this.el.modal.classList.remove('hidden');
        }

        closeModal() {
            this.el.modal.classList.add('hidden');
        }
    }

    /* ================= Aplicacion ================= */

    class BlackjackApp {
        constructor() {
            this.game = new BlackjackGame();
            this.ui = new TableUI(this.game);
            this.seatCount = 4;
            this.bankroll = 500;
            this.bankIndex = 0;
            this.names = [];

            this.game.onChange = () => this.ui.render();

            this.bindSetup();
            this.bindGame();

            this.ui.renderNameInputs(this.seatCount);
        }

        /* ---------- configuracion ---------- */

        bindSetup() {
            const ui = this.ui;

            document.getElementById('lessPlayers').addEventListener('click', () => {
                if (this.seatCount <= 2) return;
                this.seatCount--;
                ui.el.playerCount.textContent = this.seatCount;
                ui.renderNameInputs(this.seatCount);
            });

            document.getElementById('morePlayers').addEventListener('click', () => {
                if (this.seatCount >= MAX_SEATS) return;
                this.seatCount++;
                ui.el.playerCount.textContent = this.seatCount;
                ui.renderNameInputs(this.seatCount);
            });

            ui.el.bankrollOptions.addEventListener('click', (event) => {
                const button = event.target.closest('.segment');
                if (!button) return;
                this.bankroll = parseInt(button.dataset.bankroll, 10);
                Array.prototype.forEach.call(
                    ui.el.bankrollOptions.querySelectorAll('.segment'),
                    (segment) => segment.classList.toggle('is-active', segment === button)
                );
            });

            document.getElementById('toStep2Btn').addEventListener('click', () => {
                this.names = ui.readNames();
                if (this.bankIndex >= this.names.length) this.bankIndex = 0;
                ui.renderRoleList(this.names, this.bankIndex, this.bankroll);
                ui.show('step2');
            });

            ui.el.roleList.addEventListener('click', (event) => {
                const option = event.target.closest('.role-option');
                if (!option) return;
                this.bankIndex = parseInt(option.dataset.index, 10);
                ui.renderRoleList(this.names, this.bankIndex, this.bankroll);
            });

            document.getElementById('backToStep1Btn').addEventListener('click', () => {
                ui.show('step1');
            });

            document.getElementById('startGameBtn').addEventListener('click', () => {
                this.game.setup(this.names, this.bankIndex, this.bankroll);
                ui.show('game');
                this.game.startRound();
            });

            document.getElementById('setupRulesBtn').addEventListener('click', () => {
                ui.openModal('Reglas', RULES_HTML);
            });
        }

        /* ---------- mesa ---------- */

        bindGame() {
            const ui = this.ui;
            const game = this.game;

            ui.el.stage.addEventListener('click', (event) => {
                const button = event.target.closest('[data-act]');
                if (!button || button.disabled) return;
                this.handleAction(button.dataset.act, button.dataset);
            });

            document.getElementById('rulesBtn').addEventListener('click', () => {
                ui.openModal('Reglas', RULES_HTML);
            });

            document.getElementById('menuBtn').addEventListener('click', () => {
                const list = game.players
                    .map((p) => '<li>' + escapeHTML(p.name) + ': <b>' + p.chips + '</b></li>')
                    .join('');
                ui.openModal('Partida',
                    '<h3>Fichas</h3>' +
                    '<ul><li>' + escapeHTML(game.bank.name) + ' (caja): <b>' + game.bank.chips + '</b></li>' +
                    list + '</ul>' +
                    '<button type="button" class="btn btn-block" data-act="bankrebuy">Recargar caja +' + BANK_REBUY + '</button>' +
                    '<button type="button" class="btn btn-block" data-act="newgame">Nueva partida</button>');
            });

            ui.el.modal.addEventListener('click', (event) => {
                if (event.target.dataset.close) {
                    ui.closeModal();
                    return;
                }
                const button = event.target.closest('[data-act]');
                if (!button) return;
                if (button.dataset.act === 'newgame') {
                    ui.closeModal();
                    ui.show('step1');
                } else if (button.dataset.act === 'bankrebuy') {
                    game.rebuyBank();
                    ui.closeModal();
                }
            });

            document.getElementById('modalClose').addEventListener('click', () => ui.closeModal());
        }

        handleAction(action, data) {
            const game = this.game;
            switch (action) {
                case 'chip': game.adjustBet(parseInt(data.value, 10)); break;
                case 'clear': game.clearBet(); break;
                case 'repeat': game.repeatBet(); break;
                case 'bet': game.confirmBet(); break;
                case 'betall': game.betSameForAll(); break;
                case 'pass': game.passBet(); break;
                case 'rebuy': game.rebuy(); break;
                case 'ins': game.answerInsurance(true); break;
                case 'noins': game.answerInsurance(false); break;
                case 'hit': game.hit(); break;
                case 'stand': game.stand(); break;
                case 'double': game.double(); break;
                case 'split': game.split(); break;
                case 'bankhit': game.bankHit(); break;
                case 'bankstand': game.bankStand(); break;
                case 'next': game.startRound(); break;
                default: break;
            }
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        window.blackjackApp = new BlackjackApp();
    });
})();
