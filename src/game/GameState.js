// ─── Constants ───────────────────────────────────────────────────────────────
export const WHITE = 'white';
export const BLACK = 'black';

// Special point indices used in move objects
export const WHITE_BAR  = 24;   // white checkers on the bar
export const BLACK_BAR  = 25;   // black checkers on the bar
export const BEAR_OFF   = 26;   // destination when bearing off

// ─── GameState class ─────────────────────────────────────────────────────────
export class GameState {
  constructor() {
    // board[0..23] : board points (index = point - 1).
    //   positive value → that many WHITE checkers
    //   negative value → that many BLACK checkers (stored as negative)
    // board[24]    : number of WHITE checkers on the bar (always ≥ 0)
    // board[25]    : number of BLACK checkers on the bar (always ≥ 0)
    this.board = new Array(26).fill(0);

    // Number of checkers each player has borne off
    this.borneOff = { white: 0, black: 0 };

    // Whose turn it is
    this.currentPlayer = WHITE;

    // Dice values for this turn  (2 or 4 values; 4 = doubles)
    this.dice = [];

    // Which dice values remain to be used this turn
    // (copy of this.dice, values removed as moves are played)
    this.movesLeft = [];

    // Game phase
    // 'start'      – mode-select screen (not yet initialised)
    // 'rolling'    – waiting for the player to click Roll
    // 'moving'     – dice rolled, player must make moves
    // 'animating'  – an animation is playing; input blocked
    // 'gameover'   – someone won
    this.phase = 'start';

    // Index of the currently-selected point (null = none)
    this.selected = null;

    // Valid moves computable from the *current* selection
    // Each move: { from, to, die, isHit }
    this.validMoves = [];

    // All maximal move sequences for this turn
    // (computed once when dice are rolled)
    this.allMoveSequences = [];

    // Moves made *so far this turn* (prefix for sequence-filtering)
    this.madeMovesThisTurn = [];

    // Game mode chosen by the player
    this.gameMode = 'vsAI';   // 'vsAI' | 'hotseat'

    // Cumulative scores across multiple games
    this.score = { white: 0, black: 0 };

    // Undo stack: array of board snapshots
    // Each entry: { board, borneOff, movesLeft, madeMovesThisTurn, allMoveSequences }
    this.undoStack = [];

    // Winner info
    this.winner   = null;        // WHITE | BLACK | null
    this.winType  = 'normal';    // 'normal' | 'gammon' | 'backgammon'

    // Doubling cube: value = 1/2/4/8/16/32/64; owner = null (centred) | 'white' | 'black'
    this.cube = { value: 1, owner: null };
    // Tracks who offered the current double (while phase === 'doubling')
    this._doubleOfferedBy = null;

    // Turn history for game review
    // Each entry: { player, dice, boardBefore, borneOffBefore, cubeValue, moves[] }
    this.turnHistory  = [];
    this._currentTurn = null;
  }

  // ── Board initialisation (standard starting position) ────────────────────
  initializeBoard() {
    this.board = new Array(26).fill(0);

    // White checkers (positive)
    this.board[23] =  2;   // point 24
    this.board[12] =  5;   // point 13
    this.board[7]  =  3;   // point 8
    this.board[5]  =  5;   // point 6

    // Black checkers (negative)
    this.board[0]  = -2;   // point 1
    this.board[11] = -5;   // point 12
    this.board[16] = -3;   // point 17
    this.board[18] = -5;   // point 19

    this.borneOff           = { white: 0, black: 0 };
    this.currentPlayer      = WHITE;
    this.dice               = [];
    this.movesLeft          = [];
    this.phase              = 'rolling';
    this.selected           = null;
    this.validMoves         = [];
    this.allMoveSequences   = [];
    this.madeMovesThisTurn  = [];
    this.undoStack          = [];
    this.winner             = null;
    this.winType            = 'normal';
    this.cube               = { value: 1, owner: null };
    this._doubleOfferedBy   = null;
    this.turnHistory        = [];
    this._currentTurn       = null;
  }

  // ── Lightweight snapshot (for undo) ──────────────────────────────────────
  snapshot() {
    return {
      board:              [...this.board],
      borneOff:           { ...this.borneOff },
      movesLeft:          [...this.movesLeft],
      madeMovesThisTurn:  [...this.madeMovesThisTurn],
      allMoveSequences:   this.allMoveSequences,   // reference is fine
      selected:           this.selected,
      validMoves:         [...this.validMoves],
    };
  }

  restoreSnapshot(snap) {
    this.board             = [...snap.board];
    this.borneOff          = { ...snap.borneOff };
    this.movesLeft         = [...snap.movesLeft];
    this.madeMovesThisTurn = [...snap.madeMovesThisTurn];
    this.allMoveSequences  = snap.allMoveSequences;
    this.selected          = snap.selected;
    this.validMoves        = [...snap.validMoves];
  }

  // ── Pip count (total travel distance remaining) ───────────────────────────
  pipCount(player) {
    let pips = 0;
    if (player === WHITE) {
      for (let i = 0; i <= 23; i++) {
        if (this.board[i] > 0) pips += this.board[i] * (i + 1);
      }
      pips += this.board[WHITE_BAR] * 25;
    } else {
      for (let i = 0; i <= 23; i++) {
        if (this.board[i] < 0) pips += (-this.board[i]) * (24 - i);
      }
      pips += this.board[BLACK_BAR] * 25;
    }
    return pips;
  }
}
