// ─── Dice ─────────────────────────────────────────────────────────────────────

/** Roll two dice.  Returns 4 values for doubles, 2 for non-doubles. */
export function rollDice() {
  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  return d1 === d2 ? [d1, d1, d1, d1] : [d1, d2];
}

/** Opening roll: keep re-rolling until d1 ≠ d2 (no doubles to start). */
export function rollOpeningDice() {
  let d1, d2;
  do {
    d1 = Math.floor(Math.random() * 6) + 1;
    d2 = Math.floor(Math.random() * 6) + 1;
  } while (d1 === d2);
  return [d1, d2];
}

/** Determine which player moves first based on opening dice.
 *  Returns 'white' if d1 > d2, 'black' if d2 > d1. */
export function firstPlayer(d1, d2) {
  return d1 > d2 ? 'white' : 'black';
}
