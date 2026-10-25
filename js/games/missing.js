
// /js/games/missing.js
(function () {
  const { el, shuffleInPlace, playAudio } = window.Utils;
  const ID = 'missing';
  const NAME = 'Qui manque ?';
  const DEFAULTS = { gridCols: 6, showLabel: false, cardScale: 100, visibleCount: 6, gapMs: 120 };

  function ensureMissing(state) {
    if (!state.missing) {
      state.missing = {
        gridCols: DEFAULTS.gridCols,
        showLabel: DEFAULTS.showLabel,
        cardScale: DEFAULTS.cardScale,
        visibleCount: DEFAULTS.visibleCount,
        gapMs: DEFAULTS.gapMs,
        remaining: [],
        target: null,
        lastOrderIds: [],
        locked: false,
        gridTeardowns: new Set(),
        controlTeardowns: new Set()
      };
    }
    return state.missing;
  }

  function fixAdjacency(seq, orderIds) {
    const isAdj = (a, b) => { const i = orderIds.indexOf(a); if (i < 0) return false; return orderIds[i - 1] === b || orderIds[i + 1] === b; };
    for (let i = 0; i < seq.length - 1; i++) {
      const a = seq[i].id; const b = seq[i + 1].id;
      if (isAdj(a, b)) {
        let swapped = false;
        for (let k = i + 2; k < seq.length; k++) {
          const c = seq[k].id; const prev = seq[i - 1]?.id; const okPrev = prev ? !isAdj(prev, c) : true; const okA = !isAdj(a, c);
          if (okPrev && okA) { [seq[i + 1], seq[k]] = [seq[k], seq[i + 1]]; swapped = true; break; }
        }
      }
    }
    return seq;
  }
  function buildAudioSequenceExcept(target, cards, orderIds) {
    const pool = cards.filter(c => c.id !== target.id);
    let seq = pool.slice(); shuffleInPlace(seq);
    let tries = 0;
    while (tries < 10 && seq.length === orderIds.length && seq.every((c, i) => c.id === orderIds[i])) { shuffleInPlace(seq); tries++; }
    return fixAdjacency(seq, orderIds);
  }
  async function playSequence(seq, gapMs) {
    const token = window.Utils.workToken();
    for (const c of seq) {
      if (!window.Utils.isCurrent(token)) return;
      const played = await playAudio(c.audio);
      if (!played || !window.Utils.isCurrent(token)) return;
      if (gapMs && !await window.Utils.wait(gapMs)) return;
    }
  }

  function pickNewTarget(ms) { if (!ms.remaining.length) { ms.target = null; return; } ms.target = ms.remaining[Math.floor(Math.random() * ms.remaining.length)]; }
  function resetRound(state) {
    const ms = ensureMissing(state);
    const maxAvail = (state.cards || []).length || DEFAULTS.visibleCount;
    const N = Math.max(3, Math.min(12, Number(ms.visibleCount) || DEFAULTS.visibleCount, maxAvail));
    const base = (state.cards || []).slice(); shuffleInPlace(base);
    ms.remaining = base.slice(0, N);
    ms.remaining.forEach((c, i) => { if (!c.id) c.id = c.label || c.img || String(i); });
    pickNewTarget(ms);
  }
  function startGame(state) { window.Utils.cancelGameWork(); const ms = ensureMissing(state); ms.locked = false; resetRound(state); const playBtn = document.getElementById('missing-play-btn'); if (playBtn) playBtn.disabled = !ms.target; }

  function render(stageEl, state) {
    const ms = ensureMissing(state);
    ms.gridTeardowns.forEach(fn => fn()); ms.gridTeardowns.clear();

    if (!document.getElementById('missing-inline-styles')) {
      const style = document.createElement('style'); style.id = 'missing-inline-styles';
      style.textContent = `.card.correct{outline:3px solid #22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.25) inset}.card.wrong{outline:3px solid #ef4444;box-shadow:0 0 0 3px rgba(239,68,68,.25) inset}.card:focus-visible{outline:3px solid var(--accent,#38bdf8);outline-offset:2px}`;
      document.head.appendChild(style);
    }
    const container = document.getElementById('cardContainer') || stageEl;
    container.innerHTML = '';

    const order = ms.remaining.slice(); shuffleInPlace(order); ms.lastOrderIds = order.map(c => c.id);
    const cols = ms.gridCols ?? DEFAULTS.gridCols; const grid = el('div', { className: 'grid' });
    grid.style.display = 'grid'; grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`; grid.style.gap = '12px';
    const scale = (ms.cardScale ?? DEFAULTS.cardScale) / 100; const showLabel = !!ms.showLabel;

    order.forEach(c => {
      const btn = el('button', { className: 'card', attrs: { type: 'button', tabindex: '0', role: 'button', 'aria-label': c.label ? `Carte ${c.label}` : 'Carte', 'data-id': c.id } });
      const frame = el('div', { className: 'card-media' });
      Object.assign(frame.style, { width: '187px', height: '187px', transform: `scale(${scale})`, transformOrigin: 'center center', margin: '0 auto' });
      const img = el('img', { attrs: { src: c.img || c.image || '', alt: c.label || '' } }); img.loading='lazy'; img.decoding='async';
      Object.assign(img.style, { width: '100%', height: '100%', objectFit: 'contain' });
      frame.appendChild(img); btn.appendChild(frame);
      if (showLabel && c.label) { btn.appendChild(el('div', { className: 'tag', text: c.label })); }

      const onPick = () => {
        if (ms.locked || !ms.target) return;
        if (c.id === ms.target.id) {
          ms.locked = true;
          btn.classList.add('correct');
          const idxR = ms.remaining.findIndex(x => x.id === c.id); if (idxR > -1) ms.remaining.splice(idxR, 1);
          window.Utils.gameTimeout(() => {
            if (ms.remaining.length > 1) { ms.locked = false; pickNewTarget(ms); render(stageEl, state); const playBtn = document.getElementById('missing-play-btn'); if (playBtn) playBtn.disabled = false; }
            else {
              const gridEl = container.querySelector('.grid'); if (gridEl) gridEl.innerHTML = '';
              ms.remaining = []; ms.target = null; ms.locked = true; const playBtn = document.getElementById('missing-play-btn'); if (playBtn) playBtn.disabled = true;
            }
          }, 350);
        } else {
          btn.classList.add('wrong'); window.Utils.gameTimeout(() => btn.classList.remove('wrong'), 280);
        }
      };
      const onKey = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(); } };
      btn.addEventListener('click', onPick); btn.addEventListener('keydown', onKey);
      ms.gridTeardowns.add(() => { btn.removeEventListener('click', onPick); btn.removeEventListener('keydown', onKey); });
      grid.appendChild(btn);
    });
    container.appendChild(grid);
    const playBtn = document.getElementById('missing-play-btn'); if (playBtn) playBtn.disabled = !ms.target;
  }

  function mountControls(controlsEl, state, setState, rerender) {
    const ms = ensureMissing(state);
    controlsEl.innerHTML = '';

    const rowHeader = el('div', { className: 'row' }); rowHeader.appendChild(el('span', { className: 'tag', text: 'Qui manque ?' })); controlsEl.appendChild(rowHeader);

    const rowPlay = el('div', { className: 'row' });
    const playBtn = el('button', { className: 'btn', attrs: { id: 'missing-play-btn', type: 'button' }, html: '▶️ Énoncer les autres sons' });
    const onPlay = async () => {
      const ms = ensureMissing(state);
      if (!ms.target || ms.remaining.length <= 1 || ms.locked) return;
      ms.locked = true; playBtn.disabled = true;
      const token = window.Utils.workToken();
      try { const seq = buildAudioSequenceExcept(ms.target, ms.remaining, ms.lastOrderIds); await playSequence(seq, ms.gapMs ?? DEFAULTS.gapMs); }
      finally { if (window.Utils.isCurrent(token)) { ms.locked = false; playBtn.disabled = false; } }
    };
    playBtn.addEventListener('click', onPlay);
    ms.controlTeardowns.add(() => playBtn.removeEventListener('click', onPlay));
    rowPlay.appendChild(playBtn); controlsEl.appendChild(rowPlay);

    // Cartes visibles
    controlsEl.appendChild(el('div', { className: 'row' }));
    const rowNb = el('div', { className: 'row' });
    const lblNb = el('label', { html: 'Cartes visibles ' });
    const inputNb = el('input', { attrs: { type: 'number', min: '3', max: '12', value: String(ms.visibleCount ?? DEFAULTS.visibleCount) } });
    inputNb.style.width = '120px';
    const onNbChange = () => { const max = Math.min((state.cards || []).length || DEFAULTS.visibleCount, 12); const v = Math.max(3, Math.min(12, Number(inputNb.value) || DEFAULTS.visibleCount, max)); setState({ missing: { ...ms, visibleCount: v } }); startGame(state); rerender(); };
    inputNb.addEventListener('change', onNbChange);
    ms.controlTeardowns.add(() => inputNb.removeEventListener('change', onNbChange));
    rowNb.append(lblNb, inputNb); controlsEl.appendChild(rowNb);

    // Colonnes
    controlsEl.appendChild(el('div', { className: 'row' }));
    const rowCols = el('div', { className: 'row' });
    const lblCols = el('label', { html: 'Colonnes ' });
    const inputCols = el('input', { attrs: { type: 'number', min: '2', max: '8', value: String(ms.gridCols ?? DEFAULTS.gridCols) } });
    inputCols.style.width = '90px';
    const onColsChange = () => { const v = Math.max(2, Math.min(8, Number(inputCols.value) || DEFAULTS.gridCols)); setState({ missing: { ...ms, gridCols: v } }); rerender(); };
    inputCols.addEventListener('change', onColsChange);
    ms.controlTeardowns.add(() => inputCols.removeEventListener('change', onColsChange));
    rowCols.append(lblCols, inputCols); controlsEl.appendChild(rowCols);

    // Taille
    controlsEl.appendChild(el('div', { className: 'row' }));
    const rowScale = el('div', { className: 'row' });
    const lblScale = el('label', { html: 'Taille ' });
    const inputScale = el('input', { attrs: { type: 'range', min: '60', max: '150', step: '10', value: String(ms.cardScale ?? DEFAULTS.cardScale) } });
    const onScaleInput = () => { setState({ missing: { ...ms, cardScale: Number(inputScale.value) } }); rerender(); };
    inputScale.addEventListener('input', onScaleInput);
    ms.controlTeardowns.add(() => inputScale.removeEventListener('input', onScaleInput));
    rowScale.append(lblScale, inputScale); controlsEl.appendChild(rowScale);

    // Afficher le mot
    controlsEl.appendChild(el('div', { className: 'row' }));
    const rowLabel = el('div', { className: 'row' });
    const chkLabel = el('label', { html: `<input type="checkbox" ${ms.showLabel ? 'checked' : ''}/> Afficher le mot` });
    const cb = chkLabel.querySelector('input');
    const onShowLabelChange = (e) => { setState({ missing: { ...ms, showLabel: e.target.checked } }); rerender(); };
    cb.addEventListener('change', onShowLabelChange);
    ms.controlTeardowns.add(() => cb.removeEventListener('change', onShowLabelChange));
    rowLabel.appendChild(chkLabel); controlsEl.appendChild(rowLabel);

    startGame(state);
  }

  function destroy(state) { const ms = ensureMissing(state); ms.gridTeardowns.forEach(fn => fn()); ms.controlTeardowns.forEach(fn => fn()); ms.gridTeardowns.clear(); ms.controlTeardowns.clear(); }
  window.GAME_REGISTRY = window.GAME_REGISTRY || {}; window.GAME_REGISTRY[ID] = { id: ID, name: NAME, mountControls, render, destroy };
})();
