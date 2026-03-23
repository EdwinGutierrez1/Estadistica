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
    this.chartData = { labels: [], win: [], bust: [], push: [] };
    this._initChart();
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
          { label: 'P(Ganar)', data: this.chartData.win,  borderColor: '#27ae60', backgroundColor: 'rgba(39,174,96,0.1)',  borderWidth: 2, fill: true, tension: 0.4, pointRadius: 3 },
          { label: 'P(Bust)',  data: this.chartData.bust, borderColor: '#e74c3c', backgroundColor: 'rgba(231,76,60,0.1)',  borderWidth: 2, fill: true, tension: 0.4, pointRadius: 3 },
          { label: 'P(Empate)',data: this.chartData.push, borderColor: '#f39c12', backgroundColor: 'rgba(243,156,18,0.05)',borderWidth: 1.5, fill: false, tension: 0.4, pointRadius: 2 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: { duration: 400 },
        scales: {
          x: { ticks: { color: 'rgba(245,239,224,0.5)', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { min: 0, max: 1, ticks: { color: 'rgba(245,239,224,0.5)', font: { size: 10 }, callback: (v) => `${(v*100).toFixed(0)}%` }, grid: { color: 'rgba(255,255,255,0.05)' } }
        },
        plugins: {
          legend: { labels: { color: 'rgba(245,239,224,0.7)', font: { size: 10 } } },
          tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${(ctx.parsed.y*100).toFixed(1)}%` } }
        }
      }
    });
  }

  update(probs, cardNum) {
    if (!probs) return;
    this._updateBar('win',  probs.prob_win  || 0);
    this._updateBar('lose', probs.prob_lose || 0);
    this._updateBar('bust', probs.prob_bust || 0);
    this._updateBar('push', probs.prob_push || 0);
    this._updateValue('prob-win-val',  probs.prob_win);
    this._updateValue('prob-lose-val', probs.prob_lose);
    this._updateValue('prob-bust-val', probs.prob_bust);
    this._updateValue('prob-push-val', probs.prob_push);
    const evEl = document.getElementById('expected-value');
    if (evEl && probs.expected_value) evEl.textContent = probs.expected_value.toFixed(1);
    if (this.chart && cardNum !== undefined) {
      this.chartData.labels.push(cardNum);
      this.chartData.win.push(probs.prob_win   || 0);
      this.chartData.bust.push(probs.prob_bust || 0);
      this.chartData.push.push(probs.prob_push || 0);
      this.chart.update();
    }
    if (probs.deck_distribution) this._updateDeckDistribution(probs.deck_distribution);
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
    container.innerHTML = Object.entries(distribution).map(([val, data]) => `
      <div class="deck-dist-item">
        <div class="deck-dist-item__value">${val}</div>
        <div class="deck-dist-item__count">${data.count}</div>
        <div style="font-size:0.6rem;opacity:0.5">${(data.probability*100).toFixed(0)}%</div>
      </div>
    `).join('');
  }

  reset() {
    this.chartData = { labels: [], win: [], bust: [], push: [] };
    if (this.chart) {
      this.chart.data.labels          = this.chartData.labels;
      this.chart.data.datasets[0].data = this.chartData.win;
      this.chart.data.datasets[1].data = this.chartData.bust;
      this.chart.data.datasets[2].data = this.chartData.push;
      this.chart.update();
    }
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

    s.onGameState = (data) => { this._renderFullState(data); };

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
      showToast(`${this._getPlayerName(data.player_id)} se plantó con ${data.score}`);
    };

    s.onTurnChanged = (data) => {
      this._updateTurnIndicator(data.current_turn);
      const isMyTurn = data.current_turn == this.playerId;
      this._setActionButtons(isMyTurn);
      if (isMyTurn) showToast('¡Es tu turno!', 'success');
    };

    s.onDealerRevealed = (data) => {
      const dealerCards = document.getElementById('dealer-cards');
      if (dealerCards) dealerCards.innerHTML = renderCardHand(data.dealer_hand);
      const dealerScore = document.getElementById('dealer-score');
      if (dealerScore) dealerScore.textContent = data.dealer_score;
    };

    s.onDealerCards = (data) => {
      data.new_cards.forEach(card => {
        const dealerCards = document.getElementById('dealer-cards');
        if (dealerCards) dealerCards.insertAdjacentHTML('beforeend', renderCard(card, true));
      });
      const dealerScore = document.getElementById('dealer-score');
      if (dealerScore) dealerScore.textContent = data.final_score;
    };

    s.onGameFinished = (data) => {
      this._setActionButtons(false);
      this._showResults(data);
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
    if (dealerCards) dealerCards.innerHTML = renderCardHand(state.dealer.cards);
    const dealerScore = document.getElementById('dealer-score');
    if (dealerScore) dealerScore.textContent = state.dealer.score;

    Object.entries(state.players).forEach(([pid, pstate]) => {
      const cardsEl = document.getElementById(`cards-${pid}`);
      const scoreEl = document.getElementById(`score-${pid}`);
      if (cardsEl) cardsEl.innerHTML = renderCardHand(pstate.cards);
      if (scoreEl) scoreEl.textContent = pstate.score;
      if (pstate.busted) {
        const seatEl = document.getElementById(`seat-${pid}`);
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
    const msg = RESULT_MESSAGES[myResult.result] || RESULT_MESSAGES.lose;
    const delta = myResult.chips_delta;
    const deltaStr = delta > 0 ? `+${delta}` : `${delta}`;
    const deltaCls = delta >= 0 ? 'positive' : 'negative';

    document.getElementById('result-emoji').textContent = msg.emoji;
    document.getElementById('result-title').textContent = msg.title;
    document.getElementById('result-title').className   = `result-card__title result-card__title--${msg.cls}`;
    document.getElementById('result-delta').textContent = `${deltaStr} fichas`;
    document.getElementById('result-delta').className   = `result-card__delta result-card__delta--${deltaCls}`;
    document.getElementById('result-score').textContent = `Tu puntuación: ${myResult.score}`;

    const allResults = document.getElementById('all-results');
    if (allResults) {
      allResults.innerHTML = Object.entries(data.results).map(([pid, res]) => {
        const d = res.chips_delta;
        return `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
          <span>${this._getPlayerName(pid)}</span>
          <span style="color:${d >= 0 ? '#27ae60' : '#e74c3c'}">${d >= 0 ? '+' : ''}${d} fichas</span>
          <span>${res.result}</span>
        </div>`;
      }).join('');
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