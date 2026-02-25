// ─── UIController ─────────────────────────────────────────────────────────────
// Manages all DOM panels, messages, buttons, and overlays.

import { WHITE, BLACK } from '../game/GameState.js';

export class UIController {
  constructor() {
    // Overlay screens
    this.modeSelect  = document.getElementById('mode-select');
    this.gameScreen  = document.getElementById('game-screen');
    this.winOverlay  = document.getElementById('win-overlay');

    // Player bars (active-player highlighting)
    this.barTop     = document.getElementById('player-bar-top');    // Black
    this.barBottom  = document.getElementById('player-bar-bottom'); // White
    this.turnBlack  = document.getElementById('turn-black');
    this.turnWhite  = document.getElementById('turn-white');

    // Player stat labels
    this.blackName  = document.getElementById('black-name');
    this.whiteName  = document.getElementById('white-name');
    this.blackScore = document.getElementById('black-score');
    this.whiteScore = document.getElementById('white-score');
    this.blackPips  = document.getElementById('black-pips');
    this.whitePips  = document.getElementById('white-pips');
    this.blackBorne = document.getElementById('black-borne');
    this.whiteBorne = document.getElementById('white-borne');

    // Controls
    this.btnDouble  = document.getElementById('btn-double');
    this.btnRoll    = document.getElementById('btn-roll');
    this.btnUndo    = document.getElementById('btn-undo');
    this.btnAccept  = document.getElementById('btn-accept');
    this.btnDecline = document.getElementById('btn-decline');
    this.btnNewGame = document.getElementById('btn-new-game');
    this.statusMsg  = document.getElementById('status-msg');

    // Cube DOM element
    this.cubeDisplay = document.getElementById('cube-display');
    this.cubeValue   = document.getElementById('cube-value');

    // Win overlay
    this.winTitle      = document.getElementById('win-title');
    this.winDesc       = document.getElementById('win-desc');
    this.winWhiteScore = document.getElementById('win-white-score');
    this.winBlackScore = document.getElementById('win-black-score');
  }

  // ── Screen transitions ────────────────────────────────────────────────────
  showModeSelect() {
    this.modeSelect.classList.remove('hidden');
    this.gameScreen.classList.add('hidden');
    this.winOverlay.classList.add('hidden');
  }

  showGame() {
    this.modeSelect.classList.add('hidden');
    this.gameScreen.classList.remove('hidden');
    this.winOverlay.classList.add('hidden');
  }

  showWin(winner, winType, score, points) {
    const name = winner === WHITE ? 'White' : 'Black';
    const type = winType === 'backgammon' ? 'Backgammon'
               : winType === 'gammon'     ? 'Gammon'
               :                           'Regular game';
    this.winTitle.textContent      = `${name} Wins!`;
    this.winDesc.textContent       = `${type} — ${points} point${points !== 1 ? 's' : ''}`;
    this.winWhiteScore.textContent = score.white;
    this.winBlackScore.textContent = score.black;
    this.winOverlay.classList.remove('hidden');
  }

  // ── Player name labels ────────────────────────────────────────────────────
  setPlayerNames(whiteName, blackName) {
    this.whiteName.textContent = whiteName;
    this.blackName.textContent = blackName;
  }

  // ── Active player indicator ───────────────────────────────────────────────
  setActivePlayer(player) {
    if (player === WHITE) {
      this.barBottom.classList.add('active');
      this.barTop.classList.remove('active');
      this.turnWhite.classList.remove('hidden');
      this.turnBlack.classList.add('hidden');
    } else {
      this.barTop.classList.add('active');
      this.barBottom.classList.remove('active');
      this.turnBlack.classList.remove('hidden');
      this.turnWhite.classList.add('hidden');
    }
  }

  clearActivePlayer() {
    this.barTop.classList.remove('active');
    this.barBottom.classList.remove('active');
    this.turnBlack.classList.add('hidden');
    this.turnWhite.classList.add('hidden');
  }

  // ── Statistics ─────────────────────────────────────────────────────────────
  updateStats(gameState) {
    this.blackScore.textContent = gameState.score.black;
    this.whiteScore.textContent = gameState.score.white;
    this.blackPips.textContent  = gameState.pipCount(BLACK);
    this.whitePips.textContent  = gameState.pipCount(WHITE);
    this.blackBorne.textContent = gameState.borneOff.black;
    this.whiteBorne.textContent = gameState.borneOff.white;
  }

  // ── Button states ─────────────────────────────────────────────────────────
  setRollEnabled(enabled) {
    this.btnRoll.disabled = !enabled;
  }

  setUndoEnabled(enabled) {
    this.btnUndo.disabled = !enabled;
  }

  setDoubleEnabled(enabled) {
    this.btnDouble.disabled = !enabled;
  }

  // ── Doubling cube offer UI ────────────────────────────────────────────────
  /** Show Accept/Decline buttons (opponent responds to double offer). */
  showAcceptDecline(offererName) {
    this.btnDouble.classList.add('hidden');
    this.btnRoll.classList.add('hidden');
    this.btnUndo.classList.add('hidden');
    this.btnAccept.classList.remove('hidden');
    this.btnDecline.classList.remove('hidden');
    this.setStatus(`${offererName} offers a double — accept or decline?`, 'info');
  }

  hideAcceptDecline() {
    this.btnAccept.classList.add('hidden');
    this.btnDecline.classList.add('hidden');
    this.btnDouble.classList.remove('hidden');
    this.btnRoll.classList.remove('hidden');
    this.btnUndo.classList.remove('hidden');
  }

  // ── Doubling cube DOM element ─────────────────────────────────────────────
  /**
   * Update the cube display value and position.
   * cube.owner === null  → centred on controls bar
   * cube.owner === 'black' → near top player bar
   * cube.owner === 'white' → near bottom player bar
   */
  updateCube(cube) {
    // Face value: 64 when value=1 (not yet used), else the current value
    this.cubeValue.textContent = cube.value === 1 ? '64' : String(cube.value);

    const el = this.cubeDisplay;

    // Remove position classes then set the right one
    el.classList.remove('cube-neutral', 'cube-black', 'cube-white');

    if (cube.owner === 'black') {
      el.classList.add('cube-black');
    } else if (cube.owner === 'white') {
      el.classList.add('cube-white');
    } else {
      el.classList.add('cube-neutral');
    }

    // Compute pixel position dynamically
    const topBar    = document.getElementById('player-bar-top');
    const botBar    = document.getElementById('player-bar-bottom');
    const ctrlBar   = document.getElementById('controls-bar');

    if (!topBar) return;

    const cubeW = el.offsetWidth  || 40;
    const cubeH = el.offsetHeight || 40;

    // Horizontal: right side of the bar, inside the canvas width centre
    const canvasContainer = document.getElementById('canvas-container');
    const ccRect = canvasContainer ? canvasContainer.getBoundingClientRect() : null;
    const appRect = document.getElementById('app').getBoundingClientRect();

    const leftPx = ccRect
      ? ccRect.right - appRect.left - cubeW - 16
      : window.innerWidth / 2 - cubeW / 2;

    let topPx;
    if (cube.owner === 'black') {
      const r = topBar.getBoundingClientRect();
      topPx = r.top - appRect.top + (r.height - cubeH) / 2;
    } else if (cube.owner === 'white') {
      const r = botBar.getBoundingClientRect();
      topPx = r.top - appRect.top + (r.height - cubeH) / 2;
    } else {
      // Neutral — centre vertically between bottom player bar and controls bar
      const r = ctrlBar ? ctrlBar.getBoundingClientRect() : botBar.getBoundingClientRect();
      topPx = r.top - appRect.top + (r.height - cubeH) / 2;
    }

    el.style.left = leftPx + 'px';
    el.style.top  = topPx  + 'px';
  }

  // ── Status message ─────────────────────────────────────────────────────────
  setStatus(msg, type = '') {
    this.statusMsg.textContent = msg;
    this.statusMsg.className   = 'status-message' + (type ? ` ${type}` : '');
  }

  clearStatus() { this.setStatus(''); }

  flashStatus(msg, type = 'info', duration = 2500) {
    this.setStatus(msg, type);
    clearTimeout(this._statusTimer);
    this._statusTimer = setTimeout(() => this.clearStatus(), duration);
  }
}
