// ─── GreedyAI ─────────────────────────────────────────────────────────────────
// Evaluates all legal move sequences and picks the best one.
// Evaluation is from WHITE's perspective; negated for BLACK.

import { WHITE, BLACK, WHITE_BAR, BLACK_BAR, BEAR_OFF } from '../game/GameState.js';
import { applyMoveToBoard } from '../game/MoveGenerator.js';

// ─── Position evaluator ───────────────────────────────────────────────────────
export function evaluate(board, borneOff) {
  // Pip count differential (lower is better for that player)
  let whitePip = 0, blackPip = 0;
  for (let i = 0; i <= 23; i++) {
    if (board[i] > 0) whitePip +=  board[i] * (i + 1);
    if (board[i] < 0) blackPip += -board[i] * (24 - i);
  }
  whitePip += board[WHITE_BAR] * 25;
  blackPip += board[BLACK_BAR] * 25;

  const pipDiff = blackPip - whitePip;   // positive = better for white

  // Blot penalties (exposed single checker)
  let whiteBlots = 0, blackBlots = 0;
  for (let i = 0; i <= 23; i++) {
    if (board[i] === 1)  whiteBlots++;
    if (board[i] === -1) blackBlots++;
  }
  const blotScore = (blackBlots - whiteBlots) * 8;

  // Anchor bonus (2+ checkers on a point)
  let whiteAnchors = 0, blackAnchors = 0;
  for (let i = 0; i <= 23; i++) {
    if (board[i] >= 2)  whiteAnchors++;
    if (board[i] <= -2) blackAnchors++;
  }
  const anchorScore = (whiteAnchors - blackAnchors) * 4;

  // Prime strength (consecutive blocked points)
  let whitePrime = 0, blackPrime = 0;
  let wRun = 0, bRun = 0;
  for (let i = 0; i <= 23; i++) {
    if (board[i] >= 2) { wRun++; if (wRun >= 2) whitePrime += 6; }
    else wRun = 0;
    if (board[i] <= -2) { bRun++; if (bRun >= 2) blackPrime += 6; }
    else bRun = 0;
  }
  const primeScore = whitePrime - blackPrime;

  // Bar penalty
  const barScore = (board[BLACK_BAR] - board[WHITE_BAR]) * 15;

  // Bear-off progress
  const bearScore = (borneOff.white - borneOff.black) * 10;

  return pipDiff + blotScore + anchorScore + primeScore + barScore + bearScore;
}

// ─── Apply a full sequence to a board ────────────────────────────────────────
function applySequence(board, borneOff, sequence, player) {
  let b  = board;
  let bo = borneOff;
  for (const move of sequence) {
    const result = applyMoveToBoard(b, bo, move, player);
    b  = result.board;
    bo = result.borneOff;
  }
  return { board: b, borneOff: bo };
}

// ─── GreedyAI class ───────────────────────────────────────────────────────────
export class GreedyAI {
  /**
   * Choose the best move sequence by evaluating each resulting position.
   * @param {number[][]} sequences - legal move sequences
   * @param {number[]}   board     - current board
   * @param {Object}     borneOff  - current borne-off counts
   * @param {string}     player    - current player
   * @returns {object[]} chosen sequence
   */
  chooseSequence(sequences, board, borneOff, player) {
    if (!sequences || sequences.length === 0) return [];

    let best     = null;
    let bestScore = -Infinity;

    for (const seq of sequences) {
      const { board: nb, borneOff: nbo } = applySequence(board, borneOff, seq, player);
      let score = evaluate(nb, nbo);

      // Negate for black (evaluate is from white's perspective)
      if (player === BLACK) score = -score;

      // Add tiny random noise to break ties
      score += (Math.random() - 0.5) * 0.5;

      if (score > bestScore) {
        bestScore = score;
        best      = seq;
      }
    }

    return best || sequences[0];
  }
}
