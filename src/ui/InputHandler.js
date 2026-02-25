// ─── InputHandler ─────────────────────────────────────────────────────────────
// Translates canvas click / touch events into game-logic point indices.

import {
  INNER_X, INNER_Y, INNER_W, INNER_H,
  BAR_X,   BAR_W,
  BEAR_OFF_X,
  POINT_W,
} from '../render/BoardRenderer.js';
import { WHITE_BAR, BLACK_BAR, BEAR_OFF } from '../game/GameState.js';

export class InputHandler {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {function} onClick  called with the logical point index:
   *   0-23  = board point (0-indexed, index = point - 1)
   *   24    = WHITE_BAR
   *   25    = BLACK_BAR
   *   26    = BEAR_OFF
   *   null  = outside playable area
   */
  constructor(canvas, onClick) {
    this.canvas  = canvas;
    this.onClick = onClick;
    this._bind();
  }

  _bind() {
    this.canvas.addEventListener('click', e => {
      const { x, y } = this._logicalPos(e);
      this.onClick(this._hitTest(x, y));
    });

    this.canvas.addEventListener('touchend', e => {
      e.preventDefault();
      const { x, y } = this._logicalPos(e.changedTouches[0]);
      this.onClick(this._hitTest(x, y));
    }, { passive: false });
  }

  /** Convert a pointer event to logical (un-DPI-scaled) canvas coordinates. */
  _logicalPos(event) {
    const rect  = this.canvas.getBoundingClientRect();
    // canvas.style.width/height already set to logical size, so:
    const scaleX = INNER_W / rect.width  * (rect.width  / (this.canvas.width  / (window.devicePixelRatio || 1)));
    const scaleY = INNER_H / rect.height * (rect.height / (this.canvas.height / (window.devicePixelRatio || 1)));
    // Simpler: map from CSS px → logical px
    const lw = this.canvas.width  / (window.devicePixelRatio || 1);
    const lh = this.canvas.height / (window.devicePixelRatio || 1);
    return {
      x: (event.clientX - rect.left)  * (lw / rect.width),
      y: (event.clientY - rect.top)   * (lh / rect.height),
    };
  }

  /** Map logical (x,y) → point index or special constant. */
  _hitTest(x, y) {
    // Must be inside inner board
    if (x < INNER_X || x > INNER_X + INNER_W ||
        y < INNER_Y || y > INNER_Y + INNER_H) {
      return null;
    }

    // Bear-off tray (right strip)
    if (x >= BEAR_OFF_X) return BEAR_OFF;

    // Bar (vertical strip in middle)
    if (x >= BAR_X && x < BAR_X + BAR_W) {
      return y < INNER_Y + INNER_H / 2 ? BLACK_BAR : WHITE_BAR;
    }

    // Board points
    // Map x → column 0-11 (skip bar gap)
    let relX = x - INNER_X;
    const leftHalfW = 6 * POINT_W;

    if (relX < leftHalfW) {
      // Left half: columns 0-5
      const col  = Math.floor(relX / POINT_W);
      return this._colRowToIndex(col, y);
    } else if (relX >= leftHalfW + BAR_W) {
      // Right half: columns 6-11
      const col  = 6 + Math.floor((relX - leftHalfW - BAR_W) / POINT_W);
      return this._colRowToIndex(col, y);
    }

    return null;  // landed on bar (shouldn't happen after the bar check above)
  }

  _colRowToIndex(col, y) {
    if (col < 0 || col > 11) return null;
    const isTop = y < INNER_Y + INNER_H / 2;
    if (isTop) {
      // col 0 → point 13 → index 12
      // col 11 → point 24 → index 23
      return col + 12;
    } else {
      // col 0 → point 12 → index 11
      // col 11 → point 1 → index 0
      return 11 - col;
    }
  }
}
