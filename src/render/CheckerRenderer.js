import {
  INNER_X, INNER_Y, INNER_W, INNER_H,
  BAR_X, BAR_W, BEAR_OFF_X, BEAR_OFF_W,
  CHECKER_R, POINT_W, POINT_H,
  pointGeometry, checkerY,
  _drawChecker3D,
} from './BoardRenderer.js';
import { WHITE, BLACK, WHITE_BAR, BLACK_BAR, BEAR_OFF } from '../game/GameState.js';

export class CheckerRenderer {
  constructor(ctx) {
    this.ctx = ctx;
  }

  /**
   * Draw all checkers on the board.
   * @param {number[]} board  - board[0..25]
   * @param {Object}   borneOff - {white, black}
   * @param {number|null} selectedIdx - 0-indexed board point that's selected
   * @param {Set<number>} animatingPoints - point indices currently being animated (skip those)
   */
  draw(board, borneOff, selectedIdx, animatingPoints = new Set()) {
    const ctx = this.ctx;
    const t   = performance.now() / 1000;
    const pulse = 0.7 + 0.3 * Math.sin(t * 4);

    // Draw board points
    for (let i = 0; i <= 23; i++) {
      const count = board[i];
      if (count === 0) continue;

      const player = count > 0 ? WHITE : BLACK;
      const abs    = Math.abs(count);
      const pt     = i + 1;
      const { cx, isTop } = pointGeometry(pt);

      for (let k = 0; k < abs; k++) {
        const cy       = checkerY(isTop, abs, k);
        const isSelected = (i === selectedIdx) && k === abs - 1; // topmost checker

        if (animatingPoints.has(i) && k === abs - 1) continue; // skip if animating

        _drawChecker3D(ctx, cx, cy, CHECKER_R, player, isSelected, pulse);
      }

      // Stack count label if > 5
      if (abs > 5) {
        const topK  = abs - 1;
        const topCY = checkerY(isTop, abs, topK);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font      = `bold ${Math.floor(CHECKER_R * 0.7)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(abs), cx, topCY);
        ctx.textBaseline = 'alphabetic';
      }
    }

    // Bar checkers
    this._drawBar(board, animatingPoints);

    // Borne-off checkers
    this._drawBorneOff(borneOff);
  }

  _drawBar(board, animatingPoints) {
    const ctx = this.ctx;
    const cx  = BAR_X + BAR_W / 2;

    // White bar (bottom half)
    const wCount = board[WHITE_BAR];
    for (let k = 0; k < wCount; k++) {
      if (animatingPoints.has(WHITE_BAR) && k === wCount - 1) continue;
      const y = INNER_Y + INNER_H - CHECKER_R - k * CHECKER_R * 2;
      _drawChecker3D(ctx, cx, y, CHECKER_R, WHITE);
    }

    // Black bar (top half)
    const bCount = board[BLACK_BAR];
    for (let k = 0; k < bCount; k++) {
      if (animatingPoints.has(BLACK_BAR) && k === bCount - 1) continue;
      const y = INNER_Y + CHECKER_R + k * CHECKER_R * 2;
      _drawChecker3D(ctx, cx, y, CHECKER_R, BLACK);
    }
  }

  _drawBorneOff(borneOff) {
    const ctx = this.ctx;
    const cx  = BEAR_OFF_X + BEAR_OFF_W / 2;
    const r   = Math.min(CHECKER_R - 4, BEAR_OFF_W / 2 - 4);

    const drawStack = (player, count, isTop) => {
      const maxVisible = Math.min(count, 15);
      const spacing    = Math.min(r * 1.6, (INNER_H / 2 - r * 2) / Math.max(maxVisible - 1, 1));
      for (let k = 0; k < maxVisible; k++) {
        const y = isTop
          ? INNER_Y + r + k * spacing
          : INNER_Y + INNER_H - r - k * spacing;
        _drawChecker3D(ctx, cx, y, r, player);
      }
      if (count > 0) {
        const labelY = isTop
          ? INNER_Y + r + (maxVisible - 1) * spacing
          : INNER_Y + INNER_H - r - (maxVisible - 1) * spacing;
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font      = `bold ${Math.floor(r * 0.75)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(count), cx, labelY);
        ctx.textBaseline = 'alphabetic';
      }
    };

    if (borneOff.black > 0)  drawStack(BLACK, borneOff.black,  true);
    if (borneOff.white > 0)  drawStack(WHITE, borneOff.white, false);
  }
}
