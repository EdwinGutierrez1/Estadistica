'use strict';

const SUIT_SYMBOLS = {
  hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠', hidden: '?'
};

const RESULT_MESSAGES = {
  win:       { title: '¡GANASTE!',    emoji: '🏆', cls: 'win' },
  lose:      { title: 'PERDISTE',     emoji: '😞', cls: 'lose' },
  push:      { title: 'EMPATE',       emoji: '🤝', cls: 'push' },
  blackjack: { title: '¡BLACKJACK!',  emoji: '🃏', cls: 'blackjack' },
  bust:      { title: '¡TE PASASTE!', emoji: '💥', cls: 'bust' }
};

class SocketManager {
  constructor(gameId, roomId, playerId) {
    this.gameId   = gameId;
    this.roomId   = roomId;
    this.playerId = playerId;
    this.socket   = io('', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    this._registerHandlers();
  }

  _registerHandlers() {
    this.socket.on('connect', () => {
      console.log('[Socket] Conectado:', this.socket.id);
      this._joinRoom();
    });
    this.socket.on('disconnect', (reason) => {
      showToast('Conexión perdida. Reconectando...', 'error');
    });
    this.socket.on('reconnect', () => {
      showToast('¡Reconectado!', 'success');
      this._joinRoom();
    });
    this.socket.on('error',              (d) => { showToast(d.message, 'error'); });
    this.socket.on('connected',          (d) => this.onConnected(d));
    this.socket.on('player_joined',      (d) => this.onPlayerJoined(d));
    this.socket.on('player_left',        (d) => this.onPlayerLeft(d));
    this.socket.on('game_started',       (d) => this.onGameStarted(d));
    this.socket.on('game_state',         (d) => this.onGameState(d));
    this.socket.on('card_dealt',         (d) => this.onCardDealt(d));
    this.socket.on('player_stood',       (d) => this.onPlayerStood(d));
    this.socket.on('turn_changed',       (d) => this.onTurnChanged(d));
    this.socket.on('dealer_card_revealed',(d) => this.onDealerRevealed(d));
    this.socket.on('dealer_cards_dealt', (d) => this.onDealerCards(d));
    this.socket.on('game_finished',      (d) => this.onGameFinished(d));
    this.socket.on('prob_update',        (d) => this.onProbUpdate(d));
    this.socket.on('qr_generated',       (d) => this.onQrGenerated(d));
  }

  _joinRoom() { this.socket.emit('join_room', { room_id: this.roomId }); }
  hit()       { this.socket.emit('hit',   { game_id: this.gameId }); }
  stand()     { this.socket.emit('stand', { game_id: this.gameId }); }
  startGame() { this.socket.emit('start_game', { room_id: this.roomId }); }
  requestQr() {
    this.socket.emit('request_qr', { room_id: this.roomId, base_url: window.location.origin });
  }

  onConnected(d)      {}
  onPlayerJoined(d)   {}
  onPlayerLeft(d)     {}
  onGameStarted(d)    {}
  onGameState(d)      {}
  onCardDealt(d)      {}
  onPlayerStood(d)    {}
  onTurnChanged(d)    {}
  onDealerRevealed(d) {}
  onDealerCards(d)    {}
  onGameFinished(d)   {}
  onQrGenerated(d)    {}
  onProbUpdate(d)     {}
}

function renderCard(card, isNew = false) {
  if (!card || card.suit === 'hidden') {
    return `<div class="playing-card playing-card--hidden"></div>`;
  }
  const symbol = SUIT_SYMBOLS[card.suit] || card.suit;
  const suitCls = `playing-card--${card.suit}`;
  const newCls  = isNew ? 'playing-card--new' : '';
  return `
    <div class="playing-card ${suitCls} ${newCls}">
      <span class="playing-card__value">${card.value}</span>
      <span class="playing-card__suit">${symbol}</span>
      <span class="playing-card__value-bottom">${card.value}</span>
    </div>
  `;
}

function renderCardHand(cards, lastIsNew = false) {
  return cards.map((card, i) =>
    renderCard(card, lastIsNew && i === cards.length - 1)
  ).join('');
}

class ProbabilityUI {
  constructor() {
    this.chart = null;
    this.gaugeChart = null;
    this.chartData = { labels: [], win: [], bust: [], push: [], lose: [] };
    this.lastProbs = null;
    this._initChart();
    this._initGauge();
  }

  _initChart() {
    const canvas = document.getElementById('prob-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.chartData.labels,
        datasets: [
          { label: 'P(Ganar)', data: this.chartData.win,  borderColor: '#27ae60', backgroundColor: 'rgba(39,174,96,0.15)',  borderWidth: 2.5, fill: true, tension: 0.4, pointRadius: 4, pointHoverRadius: 6 },
          { label: 'P(Bust)',  data: this.chartData.bust, borderColor: '#e74c3c', backgroundColor: 'rgba(231,76,60,0.12)',  borderWidth: 2.5, fill: true, tension: 0.4, pointRadius: 4, pointHoverRadius: 6 },
          { label: 'P(Perder)',data: this.chartData.lose, borderColor: '#c0392b', backgroundColor: 'rgba(192,57,43,0.05)', borderWidth: 1.5, fill: false, tension: 0.4, pointRadius: 2, borderDash: [4,3] },
          { label: 'P(Empate)',data: this.chartData.push, borderColor: '#f39c12', backgroundColor: 'rgba(243,156,18,0.05)',borderWidth: 1.5, fill: false, tension: 0.4, pointRadius: 2 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: { duration: 500 },
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: {
            title: { display: true, text: 'Carta #', color: 'rgba(245,239,224,0.4)', font: { size: 9 } },
            ticks: { color: 'rgba(245,239,224,0.5)', font: { size: 10 } },
            grid: { color: 'rgba(255,255,255,0.05)' }
          },
          y: {
            min: 0, max: 1,
            title: { display: true, text: 'Probabilidad', color: 'rgba(245,239,224,0.4)', font: { size: 9 } },
            ticks: { color: 'rgba(245,239,224,0.5)', font: { size: 10 }, callback: (v) => `${(v*100).toFixed(0)}%` },
            grid: { color: 'rgba(255,255,255,0.05)' }
          }
        },
        plugins: {
          legend: { labels: { color: 'rgba(245,239,224,0.7)', font: { size: 10 }, boxWidth: 12 } },
          tooltip: {
            backgroundColor: 'rgba(0,0,0,0.85)',
            titleColor: '#c9a84c',
            bodyColor: 'rgba(245,239,224,0.9)',
            callbacks: { label: (ctx) => `${ctx.dataset.label}: ${(ctx.parsed.y*100).toFixed(1)}%` }
          }
        }
      }
    });
  }

  _initGauge() {
    const canvas = document.getElementById('prob-gauge');
    if (!canvas || typeof Chart === 'undefined') return;
    const ctx = canvas.getContext('2d');
    this.gaugeChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [0, 0, 0, 100],
          backgroundColor: ['#27ae60', '#e74c3c', '#f39c12', 'rgba(255,255,255,0.05)'],
          borderWidth: 0,
          hoverOffset: 0,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '70%',
        rotation: -90, circumference: 180,
        animation: { duration: 600, easing: 'easeInOutCubic' },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        }
      }
    });

    // Popover de hover sobre el gauge
    canvas.addEventListener('mousemove', (e) => {
      const pop = document.getElementById('gauge-popover');
      if (!pop || !this.lastProbs) return;
      const rect = canvas.getBoundingClientRect();
      const p = this.lastProbs;
      const score   = p.current_score ?? '?';
      const n       = p.cards_remaining ?? '?';
      const win     = ((p.prob_win  || 0) * 100).toFixed(1);
      const bust    = ((p.prob_bust || 0) * 100).toFixed(1);
      const push    = ((p.prob_push || 0) * 100).toFixed(1);
      const lose    = ((p.prob_lose || 0) * 100).toFixed(1);
      const safe    = ((p.prob_safe_hit || 0) * 100).toFixed(1);
      pop.innerHTML = `
        <div style="font-size:0.65rem;color:var(--clr-gold);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:6px;font-weight:700">
          Modelo 3 — Árbol Condicional del Dealer
        </div>
        <div style="font-size:0.68rem;opacity:0.55;margin-bottom:8px;line-height:1.5">
          Simula las jugadas del dealer (regla: pide si score &lt; 17)<br>
          usando un árbol de decisiones de profundidad 3.<br>
          Pondera cada rama por su probabilidad en el mazo actual.
        </div>
        <div style="font-size:0.65rem;color:rgba(245,239,224,0.4);margin-bottom:6px;font-family:monospace">
          P(Ganar) = Σ P(rama) donde dealer pierde<br>
          P(Bust)  = cartas &gt; ${21 - score} / ${n} restantes<br>
          P(Empate)= Σ P(rama) donde dealer = ${score}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px 10px;font-size:0.72rem">
          <span style="color:#27ae60">● Ganar</span><strong style="color:#27ae60;text-align:right">${win}%</strong>
          <span style="color:#e74c3c">● Bust</span><strong style="color:#e74c3c;text-align:right">${bust}%</strong>
          <span style="color:#f39c12">● Empate</span><strong style="color:#f39c12;text-align:right">${push}%</strong>
          <span style="color:#c0392b;opacity:0.8">● Perder</span><strong style="color:#c0392b;text-align:right">${lose}%</strong>
        </div>
        <div style="margin-top:7px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.08);font-size:0.68rem;display:flex;justify-content:space-between">
          <span style="opacity:0.5">Score actual:</span><strong>${score}</strong>
        </div>
        <div style="font-size:0.68rem;display:flex;justify-content:space-between">
          <span style="opacity:0.5">Cartas restantes:</span><strong>${n}</strong>
        </div>
        <div style="font-size:0.68rem;display:flex;justify-content:space-between">
          <span style="opacity:0.5">P(carta segura) M1:</span><strong style="color:#27ae60">${safe}%</strong>
        </div>
      `;
      // Posicionar el popover a la derecha del canvas
      const panelRect = canvas.closest('.side-panel').getBoundingClientRect();
      pop.style.display = 'block';
      pop.style.top  = `${rect.top  - panelRect.top  + rect.height / 2 - 20}px`;
    });

    canvas.addEventListener('mouseleave', () => {
      const pop = document.getElementById('gauge-popover');
      if (pop) pop.style.display = 'none';
    });
  }


  update(probs, cardNum) {
    if (!probs) return;
    this.lastProbs = probs;

    this._updateBar('win',  probs.prob_win  || 0);
    this._updateBar('lose', probs.prob_lose || 0);
    this._updateBar('bust', probs.prob_bust || 0);
    this._updateBar('push', probs.prob_push || 0);
    this._updateValue('prob-win-val',  probs.prob_win);
    this._updateValue('prob-lose-val', probs.prob_lose);
    this._updateValue('prob-bust-val', probs.prob_bust);
    this._updateValue('prob-push-val', probs.prob_push);

    const evEl = document.getElementById('expected-value');
    if (evEl && probs.expected_value != null) evEl.textContent = probs.expected_value.toFixed(1);

    // Update gauge
    this._updateGauge(probs);

    // Update recommendation
    this._updateRecommendation(probs);

    // Update safe-hit indicator
    const safeEl = document.getElementById('safe-hit-val');
    if (safeEl && probs.prob_safe_hit != null) {
      safeEl.textContent = `${(probs.prob_safe_hit * 100).toFixed(1)}%`;
      safeEl.style.color = probs.prob_safe_hit > 0.5 ? '#27ae60' : '#e74c3c';
    }

    // Update chart
    if (this.chart && cardNum !== undefined) {
      this.chartData.labels.push(`#${cardNum}`);
      this.chartData.win.push(probs.prob_win   || 0);
      this.chartData.bust.push(probs.prob_bust || 0);
      this.chartData.lose.push(probs.prob_lose || 0);
      this.chartData.push.push(probs.prob_push || 0);
      this.chart.update();
    }

    if (probs.deck_distribution) this._updateDeckDistribution(probs.deck_distribution);
  }

  _updateGauge(probs) {
    if (!this.gaugeChart) return;
    const win  = (probs.prob_win  || 0) * 100;
    const bust = (probs.prob_bust || 0) * 100;
    const push = (probs.prob_push || 0) * 100;
    const rest = Math.max(0, 100 - win - bust - push);
    this.gaugeChart.data.datasets[0].data = [win, bust, push, rest];
    this.gaugeChart.update();

    // Centro del gauge
    const label = document.getElementById('gauge-center-label');
    if (label) {
      label.textContent = `${win.toFixed(0)}%`;
      label.style.color = win > 50 ? '#27ae60' : win > 30 ? '#f39c12' : '#e74c3c';
    }

    // Cursor de ayuda para indicar que tiene hover
    const canvas = document.getElementById('prob-gauge');
    if (canvas) canvas.style.cursor = 'help';
  }

  _updateRecommendation(probs) {
    const srcEl = document.getElementById('model-source-label');
    if (srcEl) {
      const score = probs.current_score != null ? probs.current_score : '?';
      const n     = probs.cards_remaining != null ? probs.cards_remaining : '?';
      srcEl.textContent = `Score: ${score} · Mazo restante: ${n} cartas`;
    }
  }

  _updateBar(name, value) {
    const fill = document.querySelector(`.prob-bar-fill--${name}`);
    if (fill) fill.style.width = `${Math.round(value * 100)}%`;
  }

  _updateValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = `${((value || 0) * 100).toFixed(1)}%`;
  }

  _updateDeckDistribution(distribution) {
    const container = document.getElementById('deck-distribution');
    if (!container) return;
    const maxCount = Math.max(...Object.values(distribution).map(d => d.count), 1);
    container.innerHTML = Object.entries(distribution).map(([val, data]) => {
      const pct = (data.probability * 100).toFixed(0);
      const barH = Math.round((data.count / maxCount) * 28);
      const isHigh = data.probability > 0.1;
      return `
        <div class="deck-dist-item" title="${val}: ${data.count} cartas (${pct}%)" style="${isHigh ? 'border-color:rgba(201,168,76,0.25)' : ''}">
          <div style="display:flex;align-items:flex-end;justify-content:center;height:28px;margin-bottom:2px">
            <div style="width:10px;background:${isHigh ? 'rgba(201,168,76,0.6)' : 'rgba(255,255,255,0.15)'};height:${barH}px;border-radius:2px 2px 0 0;transition:height 0.5s"></div>
          </div>
          <div class="deck-dist-item__value">${val}</div>
          <div class="deck-dist-item__count">${data.count}</div>
          <div style="font-size:0.6rem;opacity:0.5">${pct}%</div>
        </div>
      `;
    }).join('');
  }

  reset() {
    this.lastProbs = null;
    this.chartData = { labels: [], win: [], bust: [], push: [], lose: [] };
    if (this.chart) {
      this.chart.data.labels           = this.chartData.labels;
      this.chart.data.datasets[0].data = this.chartData.win;
      this.chart.data.datasets[1].data = this.chartData.bust;
      this.chart.data.datasets[2].data = this.chartData.lose;
      this.chart.data.datasets[3].data = this.chartData.push;
      this.chart.update();
    }
    if (this.gaugeChart) {
      this.gaugeChart.data.datasets[0].data = [0, 0, 0, 100];
      this.gaugeChart.update();
    }
    const recEl = document.getElementById('prob-recommendation');
    if (recEl) { recEl.textContent = '–'; recEl.style.background = 'transparent'; }
    const gaugeLabel = document.getElementById('gauge-center-label');
    if (gaugeLabel) { gaugeLabel.textContent = '–'; gaugeLabel.style.color = 'rgba(245,239,224,0.5)'; }
  }
}

class GameController {
  constructor(config) {
    this.roomId    = config.roomId;
    this.gameId    = config.gameId || null;
    this.playerId  = config.playerId;
    this.isAdmin   = config.isAdmin;
    this.players   = {};
    this.cardCount = 0;
    this.probUI    = new ProbabilityUI();
    this.socket    = new SocketManager(this.gameId, this.roomId, this.playerId);
    this._bindSocketHandlers();
    this._bindUIHandlers();
  }

  _bindSocketHandlers() {
    const s = this.socket;

    s.onPlayerJoined = (data) => {
      this.players[data.player.id] = data.player;
      this._renderLobbyPlayers(data.all_players);
      this._syncStartButton(data.room);
      showToast(`${data.player.username} se unió a la sala`);
    };

    s.onPlayerLeft = (data) => {
      delete this.players[data.player_id];
      showToast('Un jugador abandonó la sala', 'error');
    };

    s.onGameStarted = (data) => {
      this.gameId        = data.game_id;
      this.socket.gameId = data.game_id;
      this.cardCount     = 0;
      this.probUI.reset();
      this._showGameTable();
      this._updateTurnIndicator(data.current_turn);
      const isMyTurn = data.current_turn == this.playerId;
      this._setActionButtons(isMyTurn);
      showToast('¡La partida ha comenzado!', 'success');
    };

    s.onGameState = (data) => {
      this._showGameTable();
      this._renderFullState(data);
    };

    s.onCardDealt = (data) => {
      this.cardCount++;
      this._addCardToPlayer(data.player_id, data.card);
      const scoreEl = document.getElementById(`score-${data.player_id}`);
      if (scoreEl) {
        scoreEl.textContent = data.new_score;
        if (data.busted) {
          scoreEl.className = 'player-seat__score player-seat__score--bust';
          const seat = document.getElementById(`seat-${data.player_id}`);
          if (seat) seat.classList.add('player-seat--bust');
          showToast(`${this._getPlayerName(data.player_id)} se pasó de 21!`, 'error');
        }
      }
      if (data.player_id == this.playerId && data.probabilities) {
        this.probUI.update(data.probabilities, this.cardCount);
      }
      const deckEl = document.getElementById('deck-count');
      if (deckEl) deckEl.textContent = data.deck_remaining;
    };

    s.onPlayerStood = (data) => {
      const scoreEl = document.getElementById(`score-${data.player_id}`);
      if (scoreEl) scoreEl.textContent = data.score;
      const isMe = data.player_id == this.playerId;
      const scoreDisplay = isMe ? data.score : '?';
      showToast(`${this._getPlayerName(data.player_id)} se plantó con ${scoreDisplay}`);
    };

    s.onTurnChanged = (data) => {
      this._updateTurnIndicator(data.current_turn);
      const isMyTurn = data.current_turn == this.playerId;
      this._setActionButtons(isMyTurn);
      if (isMyTurn) showToast('¡Es tu turno!', 'success');
    };

    s.onProbUpdate = (data) => {
      // Probabilidades enviadas al inicio del turno del jugador actual
      if (data.probabilities && Object.keys(data.probabilities).length > 0) {
        this.probUI.update(data.probabilities, null); // null = no agrega punto al gráfico
      }
      const deckEl = document.getElementById('deck-count');
      if (deckEl && data.deck_remaining != null) deckEl.textContent = data.deck_remaining;
    };

    s.onDealerRevealed = (data) => {
      // Revelar la carta oculta del dealer con animación
      const dealerCards = document.getElementById('dealer-cards');
      if (dealerCards) {
        dealerCards.innerHTML = '';
        data.dealer_hand.forEach((card, i) => {
          setTimeout(() => {
            dealerCards.insertAdjacentHTML('beforeend', renderCard(card, true));
          }, i * 400);
        });
      }
      setTimeout(() => {
        const dealerScore = document.getElementById('dealer-score');
        if (dealerScore) dealerScore.textContent = data.dealer_score;
      }, data.dealer_hand.length * 400);
      // Guardar para saber cuántas cartas ya se mostraron
      this._dealerRevealedCount = data.dealer_hand.length;
    };

    s.onDealerCards = (data) => {
      // Cartas nuevas del dealer: mostrar una por una con delay
      this._pendingFinish = null; // se llenará cuando llegue game_finished
      const baseDelay = (this._dealerRevealedCount || 0) * 400 + 300;
      data.new_cards.forEach((card, i) => {
        setTimeout(() => {
          const dealerCards = document.getElementById('dealer-cards');
          if (dealerCards) dealerCards.insertAdjacentHTML('beforeend', renderCard(card, true));
          // Actualizar score progresivamente
          const dealerScore = document.getElementById('dealer-score');
          if (dealerScore && i === data.new_cards.length - 1) {
            dealerScore.textContent = data.final_score;
          }
        }, baseDelay + i * 800);
      });
      // Calcular cuánto tiempo total toma la animación del dealer
      this._dealerAnimationMs = baseDelay + data.new_cards.length * 800 + 600;
    };

    s.onGameFinished = (data) => {
      this._setActionButtons(false);
      // Revelar cartas de todos los jugadores al finalizar la partida
      if (data.results) {
        Object.entries(data.results).forEach(([pid, res]) => {
          if (pid != this.playerId && res.cards) {
            const cardsEl = document.getElementById(`cards-${pid}`);
            const scoreEl = document.getElementById(`score-${pid}`);
            if (cardsEl) cardsEl.innerHTML = renderCardHand(res.cards);
            if (scoreEl) scoreEl.textContent = res.score;
          }
        });
      }
      // Esperar a que terminen las animaciones del dealer antes de mostrar resultado
      const wait = this._dealerAnimationMs || 1200;
      setTimeout(() => {
        this._showResults(data);
      }, wait);
      // Resetear para la próxima mano
      this._dealerAnimationMs = 0;
      this._dealerRevealedCount = 0;
    };

    s.onQrGenerated = (data) => {
      const qrImg = document.getElementById('qr-image');
      if (qrImg) qrImg.src = data.qr;
      const qrContainer = document.getElementById('qr-container');
      if (qrContainer) qrContainer.style.display = 'flex';
      const urlEl = document.getElementById('invite-url');
      if (urlEl) urlEl.value = data.url;
    };
  }

  _bindUIHandlers() {
    const hitBtn = document.getElementById('btn-hit');
    if (hitBtn) hitBtn.addEventListener('click', () => { if (!hitBtn.disabled) this.socket.hit(); });

    const standBtn = document.getElementById('btn-stand');
    if (standBtn) standBtn.addEventListener('click', () => { if (!standBtn.disabled) this.socket.stand(); });

    const startBtn = document.getElementById('btn-start');
    if (startBtn) startBtn.addEventListener('click', () => {
      startBtn.disabled = true;
      startBtn.textContent = 'Iniciando...';
      this.socket.startGame();
    });

    const qrBtn = document.getElementById('btn-qr');
    if (qrBtn) qrBtn.addEventListener('click', () => this.socket.requestQr());

    const copyBtn = document.getElementById('btn-copy-url');
    if (copyBtn) copyBtn.addEventListener('click', () => {
      const urlEl = document.getElementById('invite-url');
      if (urlEl) {
        navigator.clipboard.writeText(urlEl.value).then(() => showToast('URL copiada', 'success'));
      }
    });

    const newGameBtn = document.getElementById('btn-new-game');
    if (newGameBtn) newGameBtn.addEventListener('click', () => {
      document.getElementById('result-overlay').classList.remove('result-overlay--show');
      this._showLobby();
      if (this.isAdmin) {
        const startBtn = document.getElementById('btn-start');
        if (startBtn) startBtn.disabled = false;
      }
    });
  }

  _renderLobbyPlayers(players) {
    const list = document.getElementById('players-list');
    if (!list) return;
    list.innerHTML = players.map(rp => `
      <li class="players-list__item">
        <div class="players-list__avatar">${rp.player.username[0].toUpperCase()}</div>
        <div>
          <div class="players-list__name">${rp.player.username}</div>
          <div style="font-size:0.75rem;opacity:0.5">🪙 ${rp.player.chips} fichas</div>
        </div>
        <span class="players-list__seat">Asiento ${rp.seat_number}</span>
        ${rp.player.id == this.playerId ? '<span class="players-list__badge">TÚ</span>' : ''}
      </li>
    `).join('');
  }

  _renderFullState(state) {
    const dealerCards = document.getElementById('dealer-cards');
    if (dealerCards) dealerCards.innerHTML = renderCardHand((state.dealer && state.dealer.cards) || []);
    const dealerScore = document.getElementById('dealer-score');
    if (dealerScore) dealerScore.textContent = (state.dealer && state.dealer.score !== undefined) ? state.dealer.score : '–';

    Object.entries(state.players || {}).forEach(([pid, pstate]) => {
      const cardsEl = document.getElementById(`cards-${pid}`);
      const scoreEl = document.getElementById(`score-${pid}`);
      if (cardsEl) cardsEl.innerHTML = renderCardHand(pstate.cards || []);
      if (scoreEl) scoreEl.textContent = pstate.score ?? '–';

      const seatEl = document.getElementById(`seat-${pid}`);
      if (seatEl) seatEl.classList.remove('player-seat--bust');
      if (scoreEl) scoreEl.className = 'player-seat__score';

      if (pstate.busted) {
        if (seatEl) seatEl.classList.add('player-seat--bust');
        if (scoreEl) scoreEl.className = 'player-seat__score player-seat__score--bust';
      }
    });

    if (state.probabilities && Object.keys(state.probabilities).length > 0) {
      this.probUI.update(state.probabilities, this.cardCount);
    }
    const deckEl = document.getElementById('deck-count');
    if (deckEl) deckEl.textContent = state.deck_remaining;
    this._updateTurnIndicator(state.current_turn);
    const isMyTurn = state.current_turn == this.playerId && state.phase === 'player_turns';
    this._setActionButtons(isMyTurn);
  }

  _addCardToPlayer(playerId, card) {
    const cardsEl = document.getElementById(`cards-${playerId}`);
    if (cardsEl) cardsEl.insertAdjacentHTML('beforeend', renderCard(card, true));
  }

  _updateTurnIndicator(currentPlayerId) {
    document.querySelectorAll('.player-seat').forEach(el => el.classList.remove('player-seat--active'));
    if (currentPlayerId) {
      const activeEl = document.getElementById(`seat-${currentPlayerId}`);
      if (activeEl) activeEl.classList.add('player-seat--active');
    }
  }

  _setActionButtons(enabled) {
    const hitBtn   = document.getElementById('btn-hit');
    const standBtn = document.getElementById('btn-stand');
    if (hitBtn)   hitBtn.disabled   = !enabled;
    if (standBtn) standBtn.disabled = !enabled;
  }

  _syncStartButton(roomData) {
    if (!this.isAdmin || !roomData) return;
    const startBtn = document.getElementById('btn-start');
    if (!startBtn) return;

    const canStart = roomData.player_count >= 3;
    startBtn.disabled = !canStart;
    startBtn.textContent = canStart
      ? '🃏 Iniciar Partida'
      : `Esperando mínimo 3 jugadores (${roomData.player_count}/3)`;
  }

  _showGameTable() {
    const lobby = document.getElementById('lobby-section');
    const table = document.getElementById('game-section');
    if (lobby) lobby.style.display = 'none';
    if (table) table.style.display = 'block';
  }

  _showLobby() {
    const lobby = document.getElementById('lobby-section');
    const table = document.getElementById('game-section');
    if (lobby) lobby.style.display = 'block';
    if (table) table.style.display = 'none';
  }

  _showResults(data) {
    const myResult = data.results[this.playerId];
    if (!myResult) return;
    const msg      = RESULT_MESSAGES[myResult.result] || RESULT_MESSAGES.lose;
    const delta    = myResult.chips_delta;
    const deltaStr = delta > 0 ? `+${delta}` : `${delta}`;
    const deltaCls = delta >= 0 ? 'positive' : 'negative';

    document.getElementById('result-emoji').textContent   = msg.emoji;
    document.getElementById('result-title').textContent   = msg.title;
    document.getElementById('result-title').className     = `result-card__title result-card__title--${msg.cls}`;
    document.getElementById('result-delta').textContent   = `${deltaStr} fichas`;
    document.getElementById('result-delta').className     = `result-card__delta result-card__delta--${deltaCls}`;
    document.getElementById('result-score').textContent   = `Tu puntuación: ${myResult.score}`;

    const SUIT_SYMBOL = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
    const SUIT_COLOR  = { hearts: '#e74c3c', diamonds: '#e74c3c', clubs: '#f0ede0', spades: '#f0ede0' };

    const renderMiniCards = (cards) => {
      if (!cards || cards.length === 0) return '<span style="opacity:0.4">–</span>';
      return cards.map(c => {
        const sym   = SUIT_SYMBOL[c.suit] || '?';
        const color = SUIT_COLOR[c.suit]  || '#f0ede0';
        return `<span style="
          display:inline-flex;align-items:center;gap:1px;
          background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);
          border-radius:4px;padding:2px 5px;font-size:0.75rem;
          font-family:var(--font-display);color:${color};margin:1px;
        ">${c.value}<span style="font-size:0.7rem">${sym}</span></span>`;
      }).join('');
    };

    const resultLabel = {
      win:       { text: 'GANA',    color: '#27ae60' },
      blackjack: { text: 'BLACKJACK', color: '#ffd700' },
      bust:      { text: 'BUST',    color: '#e74c3c' },
      lose:      { text: 'PIERDE',  color: '#c0392b' },
      push:      { text: 'EMPATE',  color: '#f39c12' },
    };

    const allResults = document.getElementById('all-results');
    if (allResults) {
      // Fila del dealer primero
      const dealerCards = data.dealer_hand || [];
      const dealerScore = data.dealer_score;
      const dealerBust  = dealerScore > 21;

      let html = `
        <div style="margin-bottom:10px;padding-bottom:10px;border-bottom:2px solid rgba(201,168,76,0.2)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-size:0.7rem;letter-spacing:0.1em;text-transform:uppercase;opacity:0.5">DEALER</span>
              <span style="font-size:0.72rem;opacity:0.6">${dealerCards.length} carta${dealerCards.length !== 1 ? 's' : ''}</span>
            </div>
            <span style="font-family:var(--font-display);font-size:1rem;color:${dealerBust ? '#e74c3c' : 'var(--clr-gold)'};font-weight:700">
              ${dealerScore}${dealerBust ? ' — BUST' : ''}
            </span>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:2px">${renderMiniCards(dealerCards)}</div>
        </div>
      `;

      // Filas de jugadores
      html += Object.entries(data.results).map(([pid, res]) => {
        const lbl    = resultLabel[res.result] || { text: res.result.toUpperCase(), color: '#aaa' };
        const d      = res.chips_delta;
        const isMe   = pid == this.playerId;
        const name   = this._getPlayerName(pid);
        const cards  = res.cards || [];
        const score  = res.score;
        return `
          <div style="
            padding:10px 0;
            border-bottom:1px solid rgba(255,255,255,0.05);
            ${isMe ? 'background:rgba(201,168,76,0.04);margin:0 -4px;padding:10px 4px;border-radius:6px;' : ''}
          ">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
              <div style="display:flex;align-items:center;gap:8px">
                <span style="font-weight:${isMe ? '700' : '400'};font-size:0.88rem">
                  ${name}${isMe ? ' <span style="font-size:0.65rem;color:var(--clr-gold);opacity:0.8">(TÚ)</span>' : ''}
                </span>
                <span style="font-size:0.7rem;opacity:0.5">${cards.length} carta${cards.length !== 1 ? 's' : ''}</span>
              </div>
              <div style="display:flex;align-items:center;gap:8px">
                <span style="font-family:var(--font-display);font-size:1rem;font-weight:700">${score}</span>
                <span style="
                  font-size:0.65rem;font-weight:700;letter-spacing:0.08em;
                  color:${lbl.color};padding:2px 6px;border-radius:4px;
                  background:${lbl.color}22;border:1px solid ${lbl.color}44;
                ">${lbl.text}</span>
                <span style="font-size:0.8rem;color:${d >= 0 ? '#27ae60' : '#e74c3c'};font-weight:600">
                  ${d >= 0 ? '+' : ''}${d}🪙
                </span>
              </div>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:2px">${renderMiniCards(cards)}</div>
          </div>
        `;
      }).join('');

      allResults.innerHTML = html;
    }

    document.getElementById('result-overlay').classList.add('result-overlay--show');
  }

  _getPlayerName(playerId) {
    const p = this.players[playerId];
    return p ? p.username : `Jugador ${playerId}`;
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof window.GAME_CONFIG !== 'undefined') {
    window.gameController = new GameController(window.GAME_CONFIG);
  }
});