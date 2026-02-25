// ─── DoublingCube ─────────────────────────────────────────────────────────────
// Logic-only doubling-cube controller.  The visual cube is a DOM element
// managed by UIController; this class owns the rules.

export class DoublingCube {
  /**
   * Returns true when currentPlayer is entitled to offer a double.
   * Rule: cube must be centred (owner === null) OR owned by currentPlayer.
   */
  canOffer(currentPlayer, cube) {
    return cube.owner === null || cube.owner === currentPlayer;
  }

  /**
   * Offer a double.  Sets phase to 'doubling' so the opponent can respond.
   */
  offerDouble(gs) {
    gs._doubleOfferedBy = gs.currentPlayer;
    gs.phase = 'doubling';
  }

  /**
   * Opponent accepts the double.
   * Cube value doubles; ownership transfers to the accepting player.
   */
  acceptDouble(gs) {
    const accepting = gs._doubleOfferedBy === 'white' ? 'black' : 'white';
    gs.cube.value  *= 2;
    gs.cube.owner   = accepting;
    gs._doubleOfferedBy = null;
    gs.phase = 'rolling';
  }

  /**
   * Opponent declines the double.
   * The offering player wins immediately for the current cube value.
   * Calls endGameFn(winner, points).
   */
  declineDouble(gs, endGameFn) {
    const winner = gs._doubleOfferedBy;
    const pts    = gs.cube.value;
    gs._doubleOfferedBy = null;
    gs.phase = 'rolling';   // reset before endGame overrides it
    endGameFn(winner, pts);
  }
}
