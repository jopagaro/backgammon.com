// ─── main.js ──────────────────────────────────────────────────────────────────
// App entry point — wires up all modules and runs the game.

import { GameState, WHITE, BLACK, WHITE_BAR, BLACK_BAR, BEAR_OFF } from './game/GameState.js';
import { rollDice }                   from './game/Dice.js';
import { hasWon, winType, pointValue } from './game/Rules.js';
import {
  getLegalMoveSequences,
  getValidNextMoves,
  applyMoveToBoard,
} from './game/MoveGenerator.js';
import { Renderer }                   from './render/Renderer.js';
import { CANVAS_W, CANVAS_H }         from './render/BoardRenderer.js';
import { InputHandler }               from './ui/InputHandler.js';
import { UIController }               from './ui/UIController.js';
import { DoublingCube }               from './ui/DoublingCube.js';
import { GreedyAI, evaluate }         from './ai/GreedyAI.js';
import { analyzeGame }                from './game/GameReview.js';
import { ReviewPanel }                from './ui/ReviewPanel.js';

// ─── Canvas / DPI setup ───────────────────────────────────────────────────────
const canvas  = document.getElementById('board-canvas');
const dpr     = window.devicePixelRatio || 1;
canvas.width  = CANVAS_W * dpr;
canvas.height = CANVAS_H * dpr;
canvas.style.width  = CANVAS_W + 'px';
canvas.style.height = CANVAS_H + 'px';
canvas.getContext('2d').scale(dpr, dpr);

// ─── Module instances ─────────────────────────────────────────────────────────
const gs           = new GameState();
const renderer     = new Renderer(canvas);
const ui           = new UIController();
const cubeLogic    = new DoublingCube();
const ai           = new GreedyAI();
const reviewPanel  = new ReviewPanel(renderer, ui);

// ─── Render loop ──────────────────────────────────────────────────────────────
let reviewMode = false;   // suppress live render while review is showing

(function loop() {
  if (!reviewMode) renderer.render(gs);
  requestAnimationFrame(loop);
})();

// ─── Button wiring ────────────────────────────────────────────────────────────
document.getElementById('btn-vs-ai').addEventListener('click',      () => startGame('vsAI'));
document.getElementById('btn-hotseat').addEventListener('click',    () => startGame('hotseat'));
document.getElementById('btn-play-again').addEventListener('click', () => {
  ui.winOverlay.classList.add('hidden');
  startGame(gs.gameMode);
});
document.getElementById('btn-change-mode').addEventListener('click', () => ui.showModeSelect());
document.getElementById('btn-new-game').addEventListener('click',    () => ui.showModeSelect());

document.getElementById('btn-roll').addEventListener('click', () => {
  if (gs.phase !== 'rolling') return;
  if (isAITurn()) return;
  doRoll();
});

document.getElementById('btn-undo').addEventListener('click', () => {
  if (renderer.isAnimating()) return;
  undoMove();
});

document.getElementById('btn-double').addEventListener('click', () => {
  if (gs.phase !== 'rolling') return;
  if (isAITurn()) return;
  if (!cubeLogic.canOffer(gs.currentPlayer, gs.cube)) return;
  offerDouble();
});

document.getElementById('btn-accept').addEventListener('click',  () => acceptDouble());
document.getElementById('btn-decline').addEventListener('click', () => declineDouble());

document.getElementById('btn-review').addEventListener('click', () => startReview());

// ─── Board click handling ─────────────────────────────────────────────────────
new InputHandler(canvas, (idx) => {
  if (reviewMode)                    return;
  if (renderer.isAnimating())        return;
  if (gs.phase !== 'moving')         return;
  if (isAITurn())                    return;
  handleClick(idx);
});

// ═════════════════════════════════════════════════════════════════════════════
// Game flow
// ═════════════════════════════════════════════════════════════════════════════

function isAITurn() {
  return gs.gameMode === 'vsAI' && gs.currentPlayer === BLACK;
}

function startGame(mode) {
  reviewMode = false;
  gs.gameMode = mode;
  gs.initializeBoard();     // resets cube, turnHistory, _currentTurn too

  ui.setPlayerNames(
    mode === 'vsAI' ? 'You' : 'Player 1',
    mode === 'vsAI' ? 'Computer' : 'Player 2'
  );
  ui.showGame();
  ui.updateStats(gs);
  ui.hideAcceptDecline();
  // Position cube after layout settles
  setTimeout(() => ui.updateCube(gs.cube), 50);
  beginTurn();
}

// ── Turn start ────────────────────────────────────────────────────────────────
function beginTurn() {
  gs.phase             = 'rolling';
  gs.selected          = null;
  gs.validMoves        = [];
  gs.allMoveSequences  = [];
  gs.madeMovesThisTurn = [];
  gs.undoStack         = [];

  ui.setActivePlayer(gs.currentPlayer);
  ui.setUndoEnabled(false);

  if (isAITurn()) {
    ui.setRollEnabled(false);
    ui.setDoubleEnabled(false);

    // Maybe AI offers a double
    if (cubeLogic.canOffer(gs.currentPlayer, gs.cube)) {
      const aiScore = -evaluate(gs.board, gs.borneOff);  // from black's perspective
      if (aiScore > 20) {
        ui.setStatus('Computer is thinking about doubling…', 'info');
        setTimeout(() => {
          cubeLogic.offerDouble(gs);
          const offererName = 'Computer';
          ui.showAcceptDecline(offererName);
          // Human must respond — do nothing automatically
        }, 800);
        return;
      }
    }

    ui.setStatus('Computer is thinking…', 'info');
    setTimeout(doRoll, 800);
  } else {
    // Enable double button if allowed
    const canDouble = cubeLogic.canOffer(gs.currentPlayer, gs.cube);
    ui.setDoubleEnabled(canDouble);
    ui.setRollEnabled(true);
    ui.setStatus(`${playerLabel()} — click Roll Dice`, 'info');
  }
}

// ── Dice roll ─────────────────────────────────────────────────────────────────
function doRoll() {
  const values       = rollDice();
  gs.dice            = values;
  gs.movesLeft       = [...values];
  gs.phase           = 'moving';

  // Start turn history record
  gs._currentTurn = {
    player:        gs.currentPlayer,
    dice:          [...values],
    boardBefore:   [...gs.board],
    borneOffBefore: { ...gs.borneOff },
    cubeValue:     gs.cube.value,
    moves:         [],
  };

  ui.setRollEnabled(false);
  ui.setDoubleEnabled(false);

  renderer.startDiceRoll(values, afterRoll);
}

function afterRoll() {
  gs.allMoveSequences = getLegalMoveSequences(
    gs.board, gs.borneOff, gs.movesLeft, gs.currentPlayer
  );

  const noMoves = gs.allMoveSequences.length === 1 &&
                  gs.allMoveSequences[0].length === 0;

  if (noMoves) {
    ui.flashStatus('No legal moves — passing', 'warn', 1800);
    setTimeout(switchPlayer, 2000);
    return;
  }

  if (isAITurn()) {
    setTimeout(playAITurn, 500);
  } else {
    ui.setStatus('Select a checker to move');
    ui.setUndoEnabled(false);
  }
}

// ── AI turn ───────────────────────────────────────────────────────────────────
function playAITurn() {
  const seq = ai.chooseSequence(
    gs.allMoveSequences, gs.board, gs.borneOff, gs.currentPlayer
  );

  if (!seq || seq.length === 0) {
    setTimeout(switchPlayer, 400);
    return;
  }

  playSeqAnimated(seq, 0);
}

function playSeqAnimated(seq, idx) {
  if (idx >= seq.length) {
    if (hasWon(gs.borneOff, gs.currentPlayer)) { endGame(); return; }
    setTimeout(switchPlayer, 350);
    return;
  }
  executeMove(seq[idx], () => {
    if (hasWon(gs.borneOff, gs.currentPlayer)) { endGame(); return; }
    setTimeout(() => playSeqAnimated(seq, idx + 1), 280);
  });
}

// ── Human click handling ──────────────────────────────────────────────────────
function handleClick(idx) {
  if (idx === null) return;

  if (idx === BEAR_OFF && gs.selected !== null) {
    const m = gs.validMoves.find(m => m.to === BEAR_OFF);
    if (m) { commitMove(m); return; }
  }

  if (gs.selected !== null) {
    const m = gs.validMoves.find(m => m.to === idx);
    if (m) { commitMove(m); return; }
  }

  if (canSelect(idx)) {
    gs.selected   = idx;
    gs.validMoves = getValidNextMoves(gs.allMoveSequences, gs.madeMovesThisTurn)
                      .filter(m => m.from === idx);

    if (gs.validMoves.length === 0) {
      gs.selected = null;
      ui.flashStatus('No moves available from there', 'warn');
    }
    return;
  }

  gs.selected   = null;
  gs.validMoves = [];
}

function canSelect(idx) {
  const barIdx = gs.currentPlayer === WHITE ? WHITE_BAR : BLACK_BAR;
  if (gs.board[barIdx] > 0 && idx !== barIdx) return false;

  if (idx === WHITE_BAR) return gs.currentPlayer === WHITE && gs.board[WHITE_BAR] > 0;
  if (idx === BLACK_BAR) return gs.currentPlayer === BLACK && gs.board[BLACK_BAR] > 0;
  if (idx < 0 || idx > 23) return false;

  if (gs.currentPlayer === WHITE) return gs.board[idx] > 0;
  return gs.board[idx] < 0;
}

// ── Commit a human move ───────────────────────────────────────────────────────
function commitMove(move) {
  gs.undoStack.push(gs.snapshot());
  ui.setUndoEnabled(true);

  gs.selected   = null;
  gs.validMoves = [];

  executeMove(move, afterHumanMove);
}

// ── Core move execution ───────────────────────────────────────────────────────
function executeMove(move, onDone) {
  const fromCountSnap = countAt(move.from);
  const toCountSnap   = countAt(move.to);
  const animToCount   = move.isHit ? 1 : toCountSnap + 1;

  const { board: newBoard, borneOff: newBO } = applyMoveToBoard(
    gs.board, gs.borneOff, move, gs.currentPlayer
  );

  gs.phase = 'animating';
  renderer.animateMove(
    move.from, move.to,
    gs.currentPlayer,
    fromCountSnap,
    animToCount,
    () => {
      gs.board    = newBoard;
      gs.borneOff = newBO;
      removeDie(move.die);
      gs.madeMovesThisTurn.push(move);
      gs.phase = 'moving';

      // Record move in turn history
      if (gs._currentTurn) gs._currentTurn.moves.push(move);

      ui.updateStats(gs);
      if (onDone) onDone();
    }
  );
}

function countAt(idx) {
  if (idx === WHITE_BAR) return gs.board[WHITE_BAR];
  if (idx === BLACK_BAR) return gs.board[BLACK_BAR];
  if (idx === BEAR_OFF)  return 0;
  return Math.abs(gs.board[idx]);
}

function removeDie(value) {
  const i = gs.movesLeft.indexOf(value);
  if (i !== -1) gs.movesLeft.splice(i, 1);
}

// ── After human move ──────────────────────────────────────────────────────────
function afterHumanMove() {
  if (hasWon(gs.borneOff, gs.currentPlayer)) {
    endGame();
    return;
  }

  const remaining = getValidNextMoves(gs.allMoveSequences, gs.madeMovesThisTurn);
  if (remaining.length === 0) {
    setTimeout(switchPlayer, 350);
  } else {
    ui.setStatus('Select next checker to move');
  }
}

// ── Switch player ─────────────────────────────────────────────────────────────
function switchPlayer() {
  // Flush turn history
  if (gs._currentTurn) {
    gs.turnHistory.push(gs._currentTurn);
    gs._currentTurn = null;
  }

  gs.currentPlayer     = gs.currentPlayer === WHITE ? BLACK : WHITE;
  gs.madeMovesThisTurn = [];
  beginTurn();
}

// ── End game ──────────────────────────────────────────────────────────────────
/**
 * @param {string|null} forceWinner  - override winner (used for double decline)
 * @param {number|null} pointOverride - override point value (used for double decline)
 */
function endGame(forceWinner = null, pointOverride = null) {
  // Flush current turn history
  if (gs._currentTurn) {
    gs.turnHistory.push(gs._currentTurn);
    gs._currentTurn = null;
  }

  gs.phase = 'gameover';
  const winner = forceWinner ?? gs.currentPlayer;
  const type   = forceWinner ? 'normal' : winType(gs.board, gs.borneOff, winner);
  const pts    = pointOverride ?? pointValue(type, gs.cube.value);

  gs.winner  = winner;
  gs.winType = type;

  if (winner === WHITE) gs.score.white += pts;
  else                  gs.score.black += pts;

  ui.clearActivePlayer();
  ui.setRollEnabled(false);
  ui.setUndoEnabled(false);
  ui.setDoubleEnabled(false);
  ui.clearStatus();
  ui.hideAcceptDecline();

  setTimeout(() => ui.showWin(winner, type, gs.score, pts), 600);
}

// ── Undo ──────────────────────────────────────────────────────────────────────
function undoMove() {
  if (gs.undoStack.length === 0) return;
  const snap = gs.undoStack.pop();
  gs.restoreSnapshot(snap);
  // Also undo the move from the current turn record
  if (gs._currentTurn && gs._currentTurn.moves.length > 0) {
    gs._currentTurn.moves.pop();
  }
  gs.phase = 'moving';
  ui.updateStats(gs);
  ui.setUndoEnabled(gs.undoStack.length > 0);
  ui.setStatus('Select a checker to move');
}

// ─── Doubling cube logic ──────────────────────────────────────────────────────
function offerDouble() {
  cubeLogic.offerDouble(gs);
  const offererName = playerLabel();
  ui.showAcceptDecline(offererName);

  // In vsAI mode and human just offered to AI — AI auto-responds
  if (gs.gameMode === 'vsAI' && gs._doubleOfferedBy === WHITE) {
    setTimeout(() => {
      // AI (black) evaluates: if AI has advantage (score < -15 from white's perspective) decline
      const score = evaluate(gs.board, gs.borneOff);  // positive = good for white
      if (score > -15) {
        acceptDouble();
      } else {
        declineDouble();
      }
    }, 900);
  }
}

function acceptDouble() {
  cubeLogic.acceptDouble(gs);
  ui.hideAcceptDecline();
  ui.updateCube(gs.cube);

  // It remains the original offerer's turn — re-enter rolling phase
  const canDouble = cubeLogic.canOffer(gs.currentPlayer, gs.cube);
  ui.setDoubleEnabled(canDouble);

  if (isAITurn()) {
    ui.setRollEnabled(false);
    ui.setStatus('Computer is thinking…', 'info');
    setTimeout(doRoll, 800);
  } else {
    ui.setRollEnabled(true);
    ui.setStatus(`${playerLabel()} — click Roll Dice`, 'info');
  }
}

function declineDouble() {
  cubeLogic.declineDouble(gs, (winner, pts) => endGame(winner, pts));
}

// ─── Game review ──────────────────────────────────────────────────────────────
function startReview() {
  if (gs.turnHistory.length === 0) return;
  reviewMode = true;
  reviewPanel.show();

  // Analyse asynchronously in small chunks to avoid blocking the UI
  const history = gs.turnHistory.slice();  // snapshot
  let i = 0;
  const CHUNK = 4;

  function processChunk() {
    if (i >= history.length) {
      // All done — run full analysis
      const { grades, accuracy } = analyzeGame(history, ai);
      reviewPanel.showResults(grades, accuracy);
      return;
    }

    reviewPanel.updateLoadingProgress(i, history.length);
    i += CHUNK;
    setTimeout(processChunk, 0);
  }

  setTimeout(processChunk, 50);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function playerLabel() {
  return gs.currentPlayer === WHITE ? 'White' : 'Black';
}
