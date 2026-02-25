// ─── AnimationEngine ──────────────────────────────────────────────────────────
// Manages checker movement animations (parabolic arc, 350 ms ease-in-out).

const DURATION = 350;  // ms

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export class AnimationEngine {
  constructor() {
    this._queue = [];   // pending animations
    this._active = null; // currently running animation
  }

  /**
   * Add a checker animation to the queue.
   * Returns the animation object so callers can tag extra properties (e.g. fromIdx).
   */
  enqueue(fromX, fromY, toX, toY, player, onComplete) {
    const anim = {
      fromX, fromY, toX, toY,
      player,
      onComplete,
      x: fromX, y: fromY,
      startTime: null,
      fromIdx: null,   // set by caller if needed
    };
    this._queue.push(anim);
    return anim;   // ← returned so caller can set anim.fromIdx
  }

  /**
   * Advance all animations.  Call once per frame.
   * Returns true while any animation is running or queued.
   */
  update(now) {
    // Start next queued animation when nothing is active
    if (!this._active && this._queue.length > 0) {
      this._active = this._queue.shift();
      this._active.startTime = now;
    }

    if (!this._active) return false;

    const elapsed = now - this._active.startTime;
    const t       = Math.min(elapsed / DURATION, 1);
    const et      = easeInOut(t);

    const dx   = this._active.toX - this._active.fromX;
    const dy   = this._active.toY - this._active.fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const arc  = -Math.sin(t * Math.PI) * Math.min(dist * 0.3, 70);

    this._active.x = this._active.fromX + dx * et;
    this._active.y = this._active.fromY + dy * et + arc;

    if (t >= 1) {
      this._active.x = this._active.toX;
      this._active.y = this._active.toY;
      if (this._active.onComplete) this._active.onComplete();
      this._active = null;
    }

    return this._active !== null || this._queue.length > 0;
  }

  /** Returns the currently-running animation, or null. */
  getActive() {
    return this._active;
  }

  isAnimating() {
    return this._active !== null || this._queue.length > 0;
  }

  clear() {
    this._queue  = [];
    this._active = null;
  }
}
