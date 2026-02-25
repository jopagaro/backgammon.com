import { WHITE, BLACK, WHITE_BAR, BLACK_BAR, BEAR_OFF } from './GameState.js';

// ─── Basic rule checks ────────────────────────────────────────────────────────

/** True if the given point is blocked for `player` (≥ 2 opponent checkers). */
export function isBlocked(board, to, player) {
  if (to === BEAR_OFF) return false;
  const v = board[to];
  if (player === WHITE) return v <= -2;
  return v >= 2;
}

/** True if `player` has at least one checker on the bar. */
export function hasBar(board, player) {
  return player === WHITE ? board[WHITE_BAR] > 0 : board[BLACK_BAR] > 0;
}

/** True if ALL of `player`'s checkers are in their home board
 *  (and not on the bar), allowing bear-off. */
export function canBearOff(board, player) {
  if (hasBar(board, player)) return false;
  if (player === WHITE) {
    // home board: points 1-6 → indices 0-5
    for (let i = 6; i <= 23; i++) {
      if (board[i] > 0) return false;
    }
    return true;
  } else {
    // home board: points 19-24 → indices 18-23
    for (let i = 0; i <= 17; i++) {
      if (board[i] < 0) return false;
    }
    return true;
  }
}

// ─── Win / gammon / backgammon detection ─────────────────────────────────────

/** True if `player` has borne off all 15 checkers. */
export function hasWon(borneOff, player) {
  return player === WHITE
    ? borneOff.white >= 15
    : borneOff.black >= 15;
}

/** Returns 'normal' | 'gammon' | 'backgammon' for the winner. */
export function winType(board, borneOff, winner) {
  const loser = winner === WHITE ? BLACK : WHITE;

  if (loser === BLACK && borneOff.black === 0) {
    // Black hasn't borne off any — gammon or backgammon
    if (board[BLACK_BAR] > 0) return 'backgammon';
    for (let i = 0; i <= 5; i++) {
      if (board[i] < 0) return 'backgammon';  // checker in white's home
    }
    return 'gammon';
  }

  if (loser === WHITE && borneOff.white === 0) {
    if (board[WHITE_BAR] > 0) return 'backgammon';
    for (let i = 18; i <= 23; i++) {
      if (board[i] > 0) return 'backgammon';  // checker in black's home
    }
    return 'gammon';
  }

  return 'normal';
}

/** Point value for win type and (optional) cube value. */
export function pointValue(type, cube = 1) {
  const base = type === 'backgammon' ? 3 : type === 'gammon' ? 2 : 1;
  return base * cube;
}
