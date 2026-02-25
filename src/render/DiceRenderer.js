// ─── DiceRenderer ─────────────────────────────────────────────────────────────
// Draws up to 4 dice in the bar area.

import { BAR_X, BAR_W, INNER_Y, INNER_H } from './BoardRenderer.js';

const DIE_SIZE   = 38;
const DIE_RADIUS = 6;
const DOT_R      = 3.5;
const SPACING    = 6;

// Dot positions for each face (normalized 0-1 within die)
const DOT_PATTERNS = {
  1: [[0.5, 0.5]],
  2: [[0.25, 0.25], [0.75, 0.75]],
  3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.25, 0.2], [0.75, 0.2], [0.25, 0.5], [0.75, 0.5], [0.25, 0.8], [0.75, 0.8]],
};

export class DiceRenderer {
  constructor(ctx) {
    this.ctx = ctx;
    // Animation state
    this._rolling    = false;
    this._rollStart  = 0;
    this._rollDuration = 700;
    this._animDice   = [];   // random values shown during animation
    this._finalDice  = [];
    this._onDone     = null;
  }

  /**
   * Start a roll animation, call onDone() when finished.
   * finalValues = the actual rolled values to show at the end.
   */
  startRoll(finalValues, onDone) {
    this._rolling     = true;
    this._rollStart   = performance.now();
    this._finalDice   = finalValues;
    this._animDice    = finalValues.map(() => Math.ceil(Math.random() * 6));
    this._onDone      = onDone;
  }

  /** Update each frame. Returns true while still animating. */
  update(now) {
    if (!this._rolling) return false;
    const elapsed = now - this._rollStart;
    if (elapsed >= this._rollDuration) {
      this._rolling = false;
      if (this._onDone) { this._onDone(); this._onDone = null; }
      return false;
    }
    // Shuffle random faces during roll
    if (Math.floor(elapsed / 80) !== Math.floor((elapsed - 16) / 80)) {
      this._animDice = this._finalDice.map(() => Math.ceil(Math.random() * 6));
    }
    return true;
  }

  /**
   * Draw dice.
   * @param {number[]} dice      - array of die values (2 or 4)
   * @param {number[]} movesLeft - remaining moves (used-up dice are greyed)
   * @param {string}   player    - 'white'|'black' (determines dice colour)
   */
  draw(dice, movesLeft, player) {
    if (!dice || dice.length === 0) return;

    const values  = this._rolling ? this._animDice : dice;
    const ctx     = this.ctx;
    const isWhite = player === 'white';

    const n     = values.length;
    const total = n * DIE_SIZE + (n - 1) * SPACING;
    const startX = BAR_X + BAR_W / 2 - total / 2;

    // Determine which dice are still available (greyed if used)
    // movesLeft shows how many dice remain; the last (n - movesLeft.length) are used
    const usedCount = dice.length - (movesLeft ? movesLeft.length : 0);

    for (let i = 0; i < n; i++) {
      const x   = startX + i * (DIE_SIZE + SPACING);
      const y   = INNER_Y + INNER_H / 2 - DIE_SIZE / 2 - 4;
      const used = !this._rolling && i < usedCount;
      const val  = values[i] || 1;

      this._drawDie(x, y, val, isWhite, used, this._rolling);
    }
  }

  _drawDie(x, y, value, isWhite, used, rolling) {
    const ctx = this.ctx;

    // Shadow
    ctx.save();
    ctx.shadowColor  = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur   = 8;
    ctx.shadowOffsetY = 3;

    // Background
    let bgColor, dotColor;
    if (used) {
      bgColor  = isWhite ? 'rgba(200,200,200,0.3)' : 'rgba(50,50,50,0.3)';
      dotColor = 'rgba(128,128,128,0.4)';
    } else if (rolling) {
      bgColor  = isWhite ? '#fffde0' : '#1a1a1a';
      dotColor = isWhite ? '#222' : '#ddd';
    } else {
      bgColor  = isWhite ? '#f5f5f0' : '#1e1e1e';
      dotColor = isWhite ? '#1a1a1a' : '#e0e0e0';
    }

    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(x, y, DIE_SIZE, DIE_SIZE, DIE_RADIUS);
    ctx.fill();
    ctx.restore();

    // Border
    ctx.save();
    ctx.strokeStyle = used ? 'rgba(128,128,128,0.2)' : (isWhite ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.2)');
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, DIE_SIZE, DIE_SIZE, DIE_RADIUS);
    ctx.stroke();
    ctx.restore();

    // Dots
    if (rolling) {
      // During roll: just show a spinner blur instead
      ctx.save();
      ctx.globalAlpha = 0.5;
    }

    const dots = DOT_PATTERNS[value] || DOT_PATTERNS[1];
    ctx.fillStyle = dotColor;
    for (const [nx, ny] of dots) {
      ctx.beginPath();
      ctx.arc(x + nx * DIE_SIZE, y + ny * DIE_SIZE, DOT_R, 0, Math.PI * 2);
      ctx.fill();
    }

    if (rolling) ctx.restore();
  }
}
