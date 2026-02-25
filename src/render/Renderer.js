// ─── Renderer ─────────────────────────────────────────────────────────────────
// Orchestrates all canvas drawing each frame.

import {
  BoardRenderer,
  CHECKER_R,
  INNER_X, INNER_Y, INNER_H, INNER_W,
  BAR_X, BAR_W,
  BEAR_OFF_X, BEAR_OFF_W,
  CANVAS_W, CANVAS_H,
  MID_Y,
  pointGeometry, checkerY,
  _drawChecker3D,
} from './BoardRenderer.js';
import { CheckerRenderer } from './CheckerRenderer.js';
import { DiceRenderer }    from './DiceRenderer.js';
import { AnimationEngine } from './AnimationEngine.js';
import { WHITE, BLACK, WHITE_BAR, BLACK_BAR, BEAR_OFF } from '../game/GameState.js';

export class Renderer {
  constructor(canvas) {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d');

    this.boardRenderer   = new BoardRenderer(this.ctx);
    this.checkerRenderer = new CheckerRenderer(this.ctx);
    this.diceRenderer    = new DiceRenderer(this.ctx);
    this.animEngine      = new AnimationEngine();
  }

  // ── Main render entry point (called every frame) ─────────────────────────
  render(gameState) {
    const ctx = this.ctx;
    const now = performance.now();

    // Advance animations & dice roll
    this.animEngine.update(now);
    this.diceRenderer.update(now);

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = '#161512';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Valid move targets for the current selection
    const validTargets = (gameState.selected !== null) ? gameState.validMoves : null;

    // Board (frame, felt, triangles, bar, tray, labels, highlights)
    this.boardRenderer.draw(gameState.selected, validTargets);

    // Determine which point is mid-animation (so we skip its top checker)
    const activeAnim = this.animEngine.getActive();
    const skipTop    = new Set();
    if (activeAnim && activeAnim.fromIdx !== null) {
      skipTop.add(activeAnim.fromIdx);
    }

    // Static checkers
    this.checkerRenderer.draw(
      gameState.board,
      gameState.borneOff,
      gameState.selected,
      skipTop
    );

    // Animated checker drawn on top of everything else
    if (activeAnim) {
      _drawChecker3D(ctx, activeAnim.x, activeAnim.y, CHECKER_R, activeAnim.player);
    }

    // Dice (drawn in the bar area)
    if (gameState.dice && gameState.dice.length > 0) {
      this.diceRenderer.draw(gameState.dice, gameState.movesLeft, gameState.currentPlayer);
    }

    // Turn arrow
    if (gameState.phase === 'rolling' || gameState.phase === 'moving') {
      this._drawTurnArrow(gameState.currentPlayer);
    }
  }

  // ── Animate a checker move ────────────────────────────────────────────────
  /**
   * @param {number} fromIdx - source point index (0-23, 24=WHITE_BAR, 25=BLACK_BAR)
   * @param {number} toIdx   - destination (0-23, 26=BEAR_OFF)
   * @param {string} player  - 'white' | 'black'
   * @param {number} fromCount - checker count at source BEFORE move (for y calc)
   * @param {number} toCount   - checker count at dest BEFORE move (for y calc)
   * @param {function} onComplete
   */
  animateMove(fromIdx, toIdx, player, fromCount, toCount, onComplete) {
    const fromPos = this._checkerPos(fromIdx, player, fromCount);
    const toPos   = this._checkerPos(toIdx,   player, toCount);

    const anim = this.animEngine.enqueue(
      fromPos.x, fromPos.y,
      toPos.x,   toPos.y,
      player, onComplete
    );
    anim.fromIdx = fromIdx;
  }

  /** Canvas position (x,y) of the top checker of a point/bar/tray. */
  _checkerPos(idx, player, count) {
    const abs = Math.abs(count);

    if (idx === WHITE_BAR) {
      return {
        x: BAR_X + BAR_W / 2,
        y: INNER_Y + INNER_H - CHECKER_R - Math.max(abs - 1, 0) * CHECKER_R * 2,
      };
    }
    if (idx === BLACK_BAR) {
      return {
        x: BAR_X + BAR_W / 2,
        y: INNER_Y + CHECKER_R + Math.max(abs - 1, 0) * CHECKER_R * 2,
      };
    }
    if (idx === BEAR_OFF) {
      return {
        x: BEAR_OFF_X + BEAR_OFF_W / 2,
        y: player === BLACK
          ? INNER_Y + CHECKER_R
          : INNER_Y + INNER_H - CHECKER_R,
      };
    }

    // Regular point (0-indexed)
    const { cx, isTop } = pointGeometry(idx + 1);
    const topK = Math.max(abs - 1, 0);
    return { x: cx, y: checkerY(isTop, abs || 1, topK) };
  }

  // ── Turn indicator arrow in bar ───────────────────────────────────────────
  _drawTurnArrow(player) {
    const ctx = this.ctx;
    const cx  = BAR_X + BAR_W / 2;
    const y   = player === WHITE
      ? MID_Y + INNER_H * 0.28
      : MID_Y - INNER_H * 0.28;
    const dir = player === WHITE ? 1 : -1;

    ctx.save();
    ctx.fillStyle = player === WHITE
      ? 'rgba(255,255,255,0.65)'
      : 'rgba(120,120,120,0.65)';
    ctx.beginPath();
    ctx.moveTo(cx,      y - 7 * dir);
    ctx.lineTo(cx + 9,  y + 7 * dir);
    ctx.lineTo(cx - 9,  y + 7 * dir);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  isAnimating() {
    return this.animEngine.isAnimating();
  }

  /** Trigger the dice-roll animation. `onDone` called when it finishes. */
  startDiceRoll(finalValues, onDone) {
    this.diceRenderer.startRoll(finalValues, onDone);
  }

  /**
   * Render a historical board position (for game review).
   * No selection highlights, no animations — static snapshot.
   *
   * @param {number[]} board
   * @param {{white:number, black:number}} borneOff
   * @param {number[]} dice
   * @param {string}   player  - 'white' | 'black'
   */
  renderHistorical(board, borneOff, dice, player) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = '#161512';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    this.boardRenderer.draw(null, null);
    this.checkerRenderer.draw(board, borneOff, null, new Set());

    // Show dice in their final (non-rolling) state with all moves remaining
    if (dice && dice.length > 0) {
      this.diceRenderer.draw(dice, dice, player);
    }
  }
}
