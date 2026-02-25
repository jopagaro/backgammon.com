// ─── ReviewPanel ───────────────────────────────────────────────────────────────
// Fixed-position DOM panel for post-game move analysis.

import { WHITE } from '../game/GameState.js';

const GRADE_LABELS = {
  best:       'Best',
  good:       'Good',
  inaccuracy: 'Inaccuracy',
  mistake:    'Mistake',
  blunder:    'Blunder',
};

const GRADE_ICONS = {
  best:       '✓',
  good:       '●',
  inaccuracy: '△',
  mistake:    '✗',
  blunder:    '✗✗',
};

function fmtIdx(idx) {
  if (idx === 24 || idx === 25) return 'bar';
  if (idx === 26)               return 'off';
  return String(idx + 1);
}

function fmtSeq(moves) {
  if (!moves || moves.length === 0) return 'Pass';
  return moves.map(m => `${fmtIdx(m.from)}→${fmtIdx(m.to)}`).join(', ');
}

export class ReviewPanel {
  /**
   * @param {Renderer}      renderer  – to call renderHistorical()
   * @param {UIController}  ui        – to access winOverlay
   */
  constructor(renderer, ui) {
    this.renderer = renderer;
    this.ui       = ui;
    this.grades   = [];
    this.currentIdx = -1;

    // DOM refs
    this.panel       = document.getElementById('review-panel');
    this.accWhiteEl  = document.getElementById('acc-white-val');
    this.accBlackEl  = document.getElementById('acc-black-val');
    this.loadingEl   = document.getElementById('review-loading');
    this.loadingMsg  = document.getElementById('review-loading-msg');
    this.turnList    = document.getElementById('review-turn-list');
    this.navLabel    = document.getElementById('review-nav-label');
    this.detailCard  = document.getElementById('move-detail-card');

    document.getElementById('btn-close-review')
      .addEventListener('click', () => this.hide());
    document.getElementById('btn-review-prev')
      .addEventListener('click', () => this.navigate(-1));
    document.getElementById('btn-review-next')
      .addEventListener('click', () => this.navigate(1));
  }

  // ── Visibility ──────────────────────────────────────────────────────────────
  show() {
    this.panel.classList.remove('hidden');
    this.ui.winOverlay.classList.add('hidden');
    this._showLoading('Analysing game…');
  }

  hide() {
    this.panel.classList.add('hidden');
    this.detailCard.classList.add('hidden');
    this.ui.winOverlay.classList.remove('hidden');
  }

  // ── Loading state ───────────────────────────────────────────────────────────
  _showLoading(msg) {
    this.loadingEl.classList.remove('hidden');
    this.loadingMsg.textContent = msg;
    this.turnList.innerHTML     = '';
    this.accWhiteEl.textContent = '—';
    this.accBlackEl.textContent = '—';
  }

  updateLoadingProgress(done, total) {
    this.loadingMsg.textContent = `Analysing ${done} / ${total} turns…`;
  }

  // ── Show results ────────────────────────────────────────────────────────────
  showResults(grades, accuracy) {
    this.grades = grades;
    this.loadingEl.classList.add('hidden');

    this.accWhiteEl.textContent = accuracy.white;
    this.accBlackEl.textContent = accuracy.black;

    // Build turn list
    this.turnList.innerHTML = '';
    grades.forEach((grade, i) => {
      const row = document.createElement('div');
      row.className    = 'review-turn-row';
      row.dataset.idx  = i;

      row.innerHTML = `
        <span class="review-turn-num">T${i + 1}</span>
        <span class="review-player rp-${grade.player}">${grade.player === WHITE ? 'W' : 'B'}</span>
        <span class="review-dice">${grade.dice.join('-')}</span>
        <span class="review-grade-badge grade-${grade.rating}">${GRADE_ICONS[grade.rating]} ${GRADE_LABELS[grade.rating]}</span>
      `;

      row.addEventListener('click', () => this.selectTurn(i));
      this.turnList.appendChild(row);
    });

    if (grades.length > 0) this.selectTurn(0);
  }

  // ── Navigation ──────────────────────────────────────────────────────────────
  navigate(delta) {
    const newIdx = Math.max(0, Math.min(this.grades.length - 1, this.currentIdx + delta));
    this.selectTurn(newIdx);
  }

  selectTurn(idx) {
    if (this.grades.length === 0) return;
    this.currentIdx = idx;
    const grade = this.grades[idx];

    // Nav label
    this.navLabel.textContent = `${idx + 1} / ${this.grades.length}`;

    // Highlight row
    this.turnList.querySelectorAll('.review-turn-row').forEach((row, i) => {
      row.classList.toggle('selected', i === idx);
    });
    const sel = this.turnList.querySelector('.review-turn-row.selected');
    if (sel) sel.scrollIntoView({ block: 'nearest' });

    // Render historical board position
    this.renderer.renderHistorical(
      grade.boardBefore, grade.borneOffBefore, grade.dice, grade.player
    );

    // Show detail card
    this._showDetailCard(grade);
  }

  // ── Detail card ─────────────────────────────────────────────────────────────
  _showDetailCard(grade) {
    const played = fmtSeq(grade.moves);
    const best   = fmtSeq(grade.bestSeq);
    const isBest = grade.rating === 'best';

    this.detailCard.innerHTML = `
      <span class="detail-label">Played:</span>
      <span class="detail-played">${played}</span>
      <span class="detail-grade grade-${grade.rating}">${GRADE_ICONS[grade.rating]} ${GRADE_LABELS[grade.rating]}</span>
      ${!isBest ? `<span class="detail-label">Best:</span><span class="detail-best">${best}</span>` : ''}
    `;
    this.detailCard.classList.remove('hidden');
  }
}
