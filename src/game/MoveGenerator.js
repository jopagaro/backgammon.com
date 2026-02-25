import { WHITE, BLACK, WHITE_BAR, BLACK_BAR, BEAR_OFF } from './GameState.js';
import { isBlocked, hasBar, canBearOff } from './Rules.js';

// ─── Apply a single move to a cloned board ────────────────────────────────────
// Returns { board: number[], borneOff: {white,black} }
export function applyMoveToBoard(board, borneOff, move, player) {
  const b = [...board];
  const bo = { ...borneOff };
  const { from, to } = move;

  // Remove from source
  if (from === WHITE_BAR) {
    b[WHITE_BAR]--;
  } else if (from === BLACK_BAR) {
    b[BLACK_BAR]--;
  } else {
    if (player === WHITE) b[from]--;
    else                  b[from]++;
  }

  // Destination
  if (to === BEAR_OFF) {
    if (player === WHITE) bo.white++;
    else                  bo.black++;
    return { board: b, borneOff: bo };
  }

  // Check for a hit
  if (player === WHITE && b[to] === -1) {
    b[to] = 0;
    b[BLACK_BAR]++;
  } else if (player === BLACK && b[to] === 1) {
    b[to] = 0;
    b[WHITE_BAR]++;
  }

  if (player === WHITE) b[to]++;
  else                  b[to]--;

  return { board: b, borneOff: bo };
}

// ─── Single-die legal moves ───────────────────────────────────────────────────
export function singleDieMoves(board, borneOff, die, player) {
  const moves = [];

  if (player === WHITE) {
    // Bar entry takes priority
    if (board[WHITE_BAR] > 0) {
      // White enters opponent home board: point = 25 - die → index = 24 - die
      const to = 24 - die;            // die 1 → index 23, die 6 → index 18
      if (to >= 0 && to <= 23 && !isBlocked(board, to, WHITE)) {
        moves.push({
          from: WHITE_BAR, to, die,
          isHit: board[to] === -1,
        });
      }
      return moves;   // must enter bar first — no other moves allowed
    }

    // Bear-off
    if (canBearOff(board, player)) {
      for (let i = 0; i <= 5; i++) {
        if (board[i] <= 0) continue;
        const dist = i + 1;           // distance to bear off = point number
        if (dist === die) {
          moves.push({ from: i, to: BEAR_OFF, die, isHit: false });
        } else if (die > dist) {
          // Overshoot: only allowed if no checker on a higher point
          let higherExists = false;
          for (let j = i + 1; j <= 5; j++) {
            if (board[j] > 0) { higherExists = true; break; }
          }
          if (!higherExists) {
            moves.push({ from: i, to: BEAR_OFF, die, isHit: false });
          }
        }
      }
    }

    // Regular moves: white moves from high index → low index
    for (let i = 23; i >= 0; i--) {
      if (board[i] <= 0) continue;
      const to = i - die;
      if (to >= 0 && !isBlocked(board, to, WHITE)) {
        moves.push({ from: i, to, die, isHit: board[to] === -1 });
      }
    }

  } else {
    // BLACK
    if (board[BLACK_BAR] > 0) {
      const to = die - 1;             // die 1 → index 0, die 6 → index 5
      if (to >= 0 && to <= 23 && !isBlocked(board, to, BLACK)) {
        moves.push({
          from: BLACK_BAR, to, die,
          isHit: board[to] === 1,
        });
      }
      return moves;
    }

    if (canBearOff(board, player)) {
      for (let i = 23; i >= 18; i--) {
        if (board[i] >= 0) continue;
        const dist = 24 - i;          // point 24 (index 23) → dist 1
        if (dist === die) {
          moves.push({ from: i, to: BEAR_OFF, die, isHit: false });
        } else if (die > dist) {
          let furtherExists = false;
          for (let j = i + 1; j <= 23; j++) {
            if (board[j] < 0) { furtherExists = true; break; }
          }
          if (!furtherExists) {
            moves.push({ from: i, to: BEAR_OFF, die, isHit: false });
          }
        }
      }
    }

    // Regular: black moves from low index → high index
    for (let i = 0; i <= 23; i++) {
      if (board[i] >= 0) continue;
      const to = i + die;
      if (to <= 23 && !isBlocked(board, to, BLACK)) {
        moves.push({ from: i, to, die, isHit: board[to] === 1 });
      }
    }
  }

  return moves;
}

// ─── Recursive sequence generator ────────────────────────────────────────────
function generateAll(board, borneOff, diceLeft, player, prefix) {
  if (diceLeft.length === 0) {
    return [prefix];
  }

  const sequences = [];
  const tried = new Set();

  for (let i = 0; i < diceLeft.length; i++) {
    const die = diceLeft[i];
    if (tried.has(die)) continue;
    tried.add(die);

    const moves = singleDieMoves(board, borneOff, die, player);
    for (const m of moves) {
      const { board: nb, borneOff: nbo } = applyMoveToBoard(board, borneOff, m, player);
      const remaining = diceLeft.filter((_, j) => j !== i);
      const sub = generateAll(nb, nbo, remaining, player, [...prefix, m]);
      sequences.push(...sub);
    }
  }

  // If no move was possible with any die, end the sequence here
  if (sequences.length === 0) {
    sequences.push(prefix);
  }

  return sequences;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns all MAXIMAL legal move sequences for the current position.
 * "Maximal" = uses the greatest possible number of dice.
 * Applies the rule: when only one die can be used, must use the higher one.
 */
export function getLegalMoveSequences(board, borneOff, dice, player) {
  const all = generateAll(board, borneOff, dice, player, []);

  if (all.length === 0) return [[]];

  // Keep only max-length sequences
  const maxLen = Math.max(...all.map(s => s.length));
  let best = all.filter(s => s.length === maxLen);

  // Special rule: if only one die can be used and dice differ, must use higher
  if (maxLen === 1 && dice.length === 2 && dice[0] !== dice[1]) {
    const highDie = Math.max(...dice);
    const withHigh = best.filter(s => s[0].die === highDie);
    if (withHigh.length > 0) best = withHigh;
  }

  return best;
}

/**
 * Given a set of available sequences and the moves made so far this turn,
 * returns the set of valid NEXT moves (deduplicated by from→to).
 */
export function getValidNextMoves(sequences, madePrefix) {
  // Filter sequences that are consistent with the moves already made
  const compatible = sequences.filter(seq => {
    if (seq.length < madePrefix.length) return false;
    for (let i = 0; i < madePrefix.length; i++) {
      if (seq[i].from !== madePrefix[i].from || seq[i].to !== madePrefix[i].to) {
        return false;
      }
    }
    return true;
  });

  const idx = madePrefix.length;
  const seen = new Map();   // key = "from,to"

  for (const seq of compatible) {
    if (seq.length > idx) {
      const m = seq[idx];
      const key = `${m.from},${m.to}`;
      if (!seen.has(key)) seen.set(key, m);
    }
  }

  return [...seen.values()];
}

/**
 * Returns true if there are no legal moves at all with the given dice
 * (the player must pass).
 */
export function hasNoMoves(board, borneOff, dice, player) {
  for (const die of [...new Set(dice)]) {
    if (singleDieMoves(board, borneOff, die, player).length > 0) return false;
  }
  return true;
}
