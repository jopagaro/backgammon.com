// ─── GameReview ────────────────────────────────────────────────────────────────
// Analyses a completed game's turn history and grades each move.

import { WHITE, BLACK } from './GameState.js';
import { getLegalMoveSequences, applyMoveToBoard } from './MoveGenerator.js';
import { evaluate } from '../ai/GreedyAI.js';

// Rating thresholds (eval-score difference vs. best play)
const THRESHOLDS = [
  { max: 3,        rating: 'best'       },
  { max: 8,        rating: 'good'       },
  { max: 18,       rating: 'inaccuracy' },
  { max: 35,       rating: 'mistake'    },
  { max: Infinity, rating: 'blunder'    },
];

function rateMove(scoreDiff) {
  for (const t of THRESHOLDS) {
    if (scoreDiff <= t.max) return t.rating;
  }
  return 'blunder';
}

function applySequence(board, borneOff, seq, player) {
  let b  = [...board];
  let bo = { ...borneOff };
  for (const move of seq) {
    const r = applyMoveToBoard(b, bo, move, player);
    b  = r.board;
    bo = r.borneOff;
  }
  return { board: b, borneOff: bo };
}

/**
 * Analyse every turn in turnHistory.
 *
 * @param {object[]} turnHistory  - gs.turnHistory
 * @param {object}   ai           - GreedyAI instance (has chooseSequence)
 * @returns {{ grades: object[], accuracy: {white:number, black:number} }}
 */
export function analyzeGame(turnHistory, ai) {
  const grades = [];
  let whiteTurns = 0, whiteGood = 0;
  let blackTurns = 0, blackGood = 0;

  for (const turn of turnHistory) {
    const { player, dice, boardBefore, borneOffBefore, moves } = turn;

    // All legal sequences from this position
    const allSeqs = getLegalMoveSequences(boardBefore, borneOffBefore, dice, player);

    // Best sequence according to AI
    const bestSeq = ai.chooseSequence(allSeqs, boardBefore, borneOffBefore, player) || [];

    // Board after actual moves
    const { board: boardActual, borneOff: boActual } =
      applySequence(boardBefore, borneOffBefore, moves, player);

    // Board after best moves
    const { board: boardBest, borneOff: boBest } =
      applySequence(boardBefore, borneOffBefore, bestSeq, player);

    // Score differential (always from the acting player's perspective)
    const scoreActual = evaluate(boardActual, boActual);
    const scoreBest   = evaluate(boardBest,   boBest);
    let   scoreDiff   = scoreBest - scoreActual;
    if (player === BLACK) scoreDiff = -scoreDiff;   // negate for black

    const rating = rateMove(Math.max(0, scoreDiff));

    if (player === WHITE) {
      whiteTurns++;
      if (rating === 'best' || rating === 'good') whiteGood++;
    } else {
      blackTurns++;
      if (rating === 'best' || rating === 'good') blackGood++;
    }

    grades.push({ ...turn, bestSeq, scoreDiff, rating });
  }

  const accuracy = {
    white: whiteTurns > 0 ? Math.round((whiteGood / whiteTurns) * 100) : 100,
    black: blackTurns > 0 ? Math.round((blackGood / blackTurns) * 100) : 100,
  };

  return { grades, accuracy };
}
