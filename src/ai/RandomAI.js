// ─── RandomAI ─────────────────────────────────────────────────────────────────
// Picks a random legal move sequence (useful for testing).

export class RandomAI {
  /**
   * Choose a complete move sequence.
   * @param {number[][]} sequences - array of move sequences
   * @returns {object[]} chosen sequence
   */
  chooseSequence(sequences) {
    if (!sequences || sequences.length === 0) return [];
    const idx = Math.floor(Math.random() * sequences.length);
    return sequences[idx];
  }
}
