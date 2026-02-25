// ─── Board geometry constants (exported for use by other modules) ─────────────
// All values are in logical (CSS) pixels — DPI scaling applied in main.js.

export const CANVAS_W   = 1000;
export const CANVAS_H   = 660;

// Outer wood frame rectangle
export const BOARD_X    = 14;
export const BOARD_Y    = 12;
export const BOARD_W    = 972;
export const BOARD_H    = 636;

// Frame thickness (wood → felt inset)
export const FRAME      = 18;

// Felt (inner playing surface)
export const INNER_X    = BOARD_X + FRAME;        // 32
export const INNER_Y    = BOARD_Y + FRAME;        // 30
export const INNER_W    = BOARD_W - FRAME * 2;    // 936  = 12×68 + 48 + 72
export const INNER_H    = BOARD_H - FRAME * 2;    // 600

// Per-point width (12 points total)
export const POINT_W    = 68;
// Triangle height (how far triangles reach towards centre)
export const POINT_H    = Math.floor(INNER_H * 0.43);   // ≈ 258

// Bar (runs top-to-bottom, between the two halves)
export const BAR_W      = 48;
export const BAR_X      = INNER_X + 6 * POINT_W;        // 32 + 408 = 440

// Bear-off tray (right of right-half points)
export const BEAR_OFF_W = 72;
export const BEAR_OFF_X = INNER_X + 6 * POINT_W + BAR_W + 6 * POINT_W; // 32+408+48+408=896

// Checker radius
export const CHECKER_R  = 28;

// Vertical mid-point of the board
export const MID_Y = INNER_Y + INNER_H / 2;

// ─── Geometry helpers ─────────────────────────────────────────────────────────

/**
 * Returns geometry for a 1-indexed board point (1–24).
 *   col     : 0-11, left-to-right screen column
 *   isTop   : true if this point is in the top half (triangles point down)
 *   baseX   : left pixel edge of the column
 *   baseY   : board edge the triangle attaches to (INNER_Y or INNER_Y+INNER_H)
 *   cx      : horizontal centre of the column
 */
export function pointGeometry(pt) {
  let col, isTop;

  if      (pt >= 13 && pt <= 18) { col = pt - 13;       isTop = true;  }
  else if (pt >= 19 && pt <= 24) { col = pt - 13;       isTop = true;  }  // 19→6..24→11
  else if (pt >=  7 && pt <= 12) { col = 12 - pt;       isTop = false; }  // 12→0..7→5
  else                            { col = 12 - pt;       isTop = false; }  // 6→6..1→11

  const baseX = INNER_X + col * POINT_W + (col >= 6 ? BAR_W : 0);
  const baseY = isTop ? INNER_Y : INNER_Y + INNER_H;
  const cx    = baseX + POINT_W / 2;

  return { col, isTop, baseX, baseY, cx };
}

/**
 * Y-coordinate of the centre of the k-th checker (0-indexed, stacked from edge).
 * Compresses spacing when more than 5 checkers share a point.
 */
export function checkerY(isTop, totalCount, k) {
  const maxFull  = 5;
  let spacing;
  if (totalCount <= maxFull) {
    spacing = CHECKER_R * 2;
  } else {
    spacing = Math.max(CHECKER_R * 0.65, (POINT_H - CHECKER_R) / (totalCount - 1));
  }

  if (isTop) {
    return INNER_Y + CHECKER_R + k * spacing;
  } else {
    return INNER_Y + INNER_H - CHECKER_R - k * spacing;
  }
}

// ─── Colours ──────────────────────────────────────────────────────────────────
const COLOR_LABEL = 'rgba(224,217,204,0.55)';

// ─── BoardRenderer class ───────────────────────────────────────────────────────
export class BoardRenderer {
  constructor(ctx) {
    this.ctx = ctx;
    this._frameGrad = this._makeFrameGrad(ctx);
  }

  _makeFrameGrad(ctx) {
    const g = ctx.createLinearGradient(BOARD_X, 0, BOARD_X + BOARD_W, 0);
    g.addColorStop(0,    '#1e0a00');
    g.addColorStop(0.06, '#4a2200');
    g.addColorStop(0.5,  '#6b3800');
    g.addColorStop(0.94, '#4a2200');
    g.addColorStop(1,    '#1e0a00');
    return g;
  }

  draw(selectedIdx, validMoveTargets) {
    this._drawFrame();
    this._drawFelt();
    this._drawTriangles();
    this._drawBar();
    this._drawBearOffTray();
    this._drawLabels();
    if (validMoveTargets) {
      this._drawHighlights(selectedIdx, validMoveTargets);
    }
  }

  _drawFrame() {
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowColor   = 'rgba(0,0,0,0.75)';
    ctx.shadowBlur    = 28;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = this._frameGrad;
    ctx.beginPath();
    ctx.roundRect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H, 10);
    ctx.fill();
    ctx.restore();

    // Subtle inner highlight
    ctx.save();
    ctx.strokeStyle = 'rgba(255,180,80,0.15)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.roundRect(BOARD_X + 2, BOARD_Y + 2, BOARD_W - 4, BOARD_H - 4, 9);
    ctx.stroke();
    ctx.restore();
  }

  _drawFelt() {
    const ctx = this.ctx;
    const feltW = INNER_W - BEAR_OFF_W;   // exclude bear-off tray

    const grad = ctx.createRadialGradient(
      INNER_X + feltW / 2, MID_Y, 30,
      INNER_X + feltW / 2, MID_Y, feltW * 0.65
    );
    grad.addColorStop(0, '#357a30');
    grad.addColorStop(1, '#1e4a1a');

    ctx.fillStyle = grad;
    ctx.fillRect(INNER_X, INNER_Y, feltW, INNER_H);
  }

  _drawTriangles() {
    const ctx = this.ctx;
    for (let pt = 1; pt <= 24; pt++) {
      const { baseX, baseY, cx, isTop } = pointGeometry(pt);
      const tipY    = isTop ? baseY + POINT_H : baseY - POINT_H;
      const isBurg  = pt % 2 === 1;

      const grad = ctx.createLinearGradient(cx, baseY, cx, tipY);
      if (isBurg) {
        grad.addColorStop(0,   '#8f1818');
        grad.addColorStop(0.6, '#7a1515');
        grad.addColorStop(1,   '#550e0e');
      } else {
        grad.addColorStop(0,   '#d4b896');
        grad.addColorStop(0.6, '#c5a880');
        grad.addColorStop(1,   '#a88c60');
      }

      ctx.beginPath();
      ctx.moveTo(baseX,           baseY);
      ctx.lineTo(baseX + POINT_W, baseY);
      ctx.lineTo(cx,              tipY);
      ctx.closePath();

      ctx.fillStyle   = grad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.22)';
      ctx.lineWidth   = 0.5;
      ctx.stroke();
    }
  }

  _drawBar() {
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(BAR_X, 0, BAR_X + BAR_W, 0);
    grad.addColorStop(0,   '#0e0400');
    grad.addColorStop(0.4, '#241004');
    grad.addColorStop(0.6, '#241004');
    grad.addColorStop(1,   '#0e0400');

    ctx.fillStyle = grad;
    ctx.fillRect(BAR_X, INNER_Y, BAR_W, INNER_H);

    ctx.strokeStyle = 'rgba(255,140,50,0.14)';
    ctx.lineWidth   = 1;
    ctx.strokeRect(BAR_X, INNER_Y, BAR_W, INNER_H);

    // Horizontal mid-divider
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(BAR_X,          MID_Y);
    ctx.lineTo(BAR_X + BAR_W,  MID_Y);
    ctx.stroke();
  }

  _drawBearOffTray() {
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(BEAR_OFF_X, 0, BEAR_OFF_X + BEAR_OFF_W, 0);
    grad.addColorStop(0,   '#100600');
    grad.addColorStop(0.5, '#1e0c00');
    grad.addColorStop(1,   '#080400');

    ctx.fillStyle = grad;
    ctx.fillRect(BEAR_OFF_X, INNER_Y, BEAR_OFF_W, INNER_H);

    ctx.strokeStyle = 'rgba(255,140,50,0.18)';
    ctx.lineWidth   = 1;
    ctx.strokeRect(BEAR_OFF_X, INNER_Y, BEAR_OFF_W, INNER_H);

    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(BEAR_OFF_X,              MID_Y);
    ctx.lineTo(BEAR_OFF_X + BEAR_OFF_W, MID_Y);
    ctx.stroke();

    // Labels
    ctx.fillStyle    = COLOR_LABEL;
    ctx.font         = 'bold 10px sans-serif';
    ctx.textAlign    = 'center';
    ctx.fillText('OFF', BEAR_OFF_X + BEAR_OFF_W / 2, INNER_Y + 13);
    ctx.fillText('OFF', BEAR_OFF_X + BEAR_OFF_W / 2, INNER_Y + INNER_H - 4);
  }

  _drawLabels() {
    const ctx = this.ctx;
    ctx.fillStyle = COLOR_LABEL;
    ctx.font      = 'bold 10px sans-serif';
    ctx.textAlign = 'center';

    for (let pt = 1; pt <= 24; pt++) {
      const { cx, isTop } = pointGeometry(pt);
      const y = isTop
        ? BOARD_Y + FRAME - 5
        : BOARD_Y + BOARD_H - FRAME + 14;
      ctx.fillText(String(pt), cx, y);
    }
  }

  _drawHighlights(selectedIdx, validMoveTargets) {
    const t     = performance.now() / 1000;
    const pulse = 0.55 + 0.45 * Math.sin(t * 3.5);

    for (const move of validMoveTargets) {
      if (move.to >= 0 && move.to <= 23) {
        this._highlightPoint(move.to + 1, pulse, '#4ade80');
      }
      // Bear-off destination — draw a glow on the tray
      if (move.to === 26 /*BEAR_OFF*/) {
        this._highlightBearOff(pulse, '#4ade80');
      }
    }

    // Selected point
    if (selectedIdx !== null && selectedIdx >= 0 && selectedIdx <= 23) {
      this._highlightPoint(selectedIdx + 1, 0.9, '#facc15');
    }
    if (selectedIdx === 24) this._highlightBar('white', 0.9);
    if (selectedIdx === 25) this._highlightBar('black', 0.9);
  }

  _highlightPoint(pt, alpha, color) {
    const { baseX, baseY, cx, isTop } = pointGeometry(pt);
    const tipY = isTop ? baseY + POINT_H : baseY - POINT_H;
    const ctx  = this.ctx;

    ctx.save();
    ctx.globalAlpha = alpha * 0.5;
    ctx.fillStyle   = color;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.lineTo(baseX + POINT_W, baseY);
    ctx.lineTo(cx, tipY);
    ctx.closePath();
    ctx.fill();

    // Dot at tip
    ctx.globalAlpha = alpha * 0.9;
    ctx.beginPath();
    ctx.arc(cx, tipY + (isTop ? -7 : 7), 5.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  _highlightBearOff(alpha, color) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha   = alpha * 0.4;
    ctx.fillStyle     = color;
    ctx.fillRect(BEAR_OFF_X, INNER_Y, BEAR_OFF_W, INNER_H);
    ctx.restore();
  }

  _highlightBar(player, alpha) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha * 0.4;
    ctx.fillStyle   = '#facc15';
    const y = player === 'black' ? INNER_Y : MID_Y;
    ctx.fillRect(BAR_X, y, BAR_W, INNER_H / 2);
    ctx.restore();
  }
}

// ─── Shared 3D checker drawing (used by multiple renderers) ──────────────────
export function _drawChecker3D(ctx, cx, cy, r, player, selected = false, pulse = 1) {
  const isWhite = player === 'white';

  ctx.save();

  // Drop shadow / outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = isWhite ? '#777' : '#050505';
  ctx.fill();

  // Main radial gradient
  const grad = ctx.createRadialGradient(
    cx - r * 0.3, cy - r * 0.3, r * 0.05,
    cx,           cy,           r * 0.95
  );
  if (isWhite) {
    grad.addColorStop(0,    '#ffffff');
    grad.addColorStop(0.45, '#e4e4e4');
    grad.addColorStop(0.85, '#bdbdbd');
    grad.addColorStop(1,    '#8e8e8e');
  } else {
    grad.addColorStop(0,    '#5a5a5a');
    grad.addColorStop(0.45, '#2e2e2e');
    grad.addColorStop(0.85, '#181818');
    grad.addColorStop(1,    '#080808');
  }

  ctx.beginPath();
  ctx.arc(cx, cy, r - 1.5, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Specular highlight
  const spec = ctx.createRadialGradient(
    cx - r * 0.28, cy - r * 0.28, 0,
    cx - r * 0.18, cy - r * 0.18, r * 0.5
  );
  spec.addColorStop(0,   isWhite ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.38)');
  spec.addColorStop(0.5, isWhite ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)');
  spec.addColorStop(1,   'rgba(255,255,255,0)');

  ctx.beginPath();
  ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
  ctx.fillStyle = spec;
  ctx.fill();

  // Inner groove ring
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.58, 0, Math.PI * 2);
  ctx.strokeStyle = isWhite ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.07)';
  ctx.lineWidth   = 1;
  ctx.stroke();

  // Selection glow
  if (selected) {
    ctx.beginPath();
    ctx.arc(cx, cy, r + 3 * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(250,204,21,${0.75 * pulse})`;
    ctx.lineWidth   = 2.5;
    ctx.stroke();
  }

  ctx.restore();
}
