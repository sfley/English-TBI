
// /js/games/order.js
(function () {
  const { el, shuffleInPlace, playAudio } = window.Utils;
  const ID = 'order';
  const NAME = 'Ordre correct';
  const DEFAULTS = { gridCols: 6, showLabel: false, cardScale: 100, seqLen: 2, minPool: 6, gapMs: 200 };

  function ensureOrder(state) {
    if (!state.order) {
      state.order = { gridCols: DEFAULTS.gridCols, showLabel: DEFAULTS.showLabel, cardScale: DEFAULTS.cardScale, seqLen: DEFAULTS.seqLen, minPool: DEFAULTS.minPool, gapMs: DEFAULTS.gapMs, pool: [], sequence: [], expectIndex: 0, locked: false, gridTeardowns: new Set(), controlTeardowns: new Set(), roundTimer: null };
    }
    return state.order;
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

  function newRound(state) {
    const od = ensureOrder(state);
    const L = Math.max(2, Math.min(8, Number(od.seqLen) || DEFAULTS.seqLen));
    const base = (state.cards || []).slice(); shuffleInPlace(base);
    od.pool = base.slice(0, Math.max(L, od.minPool));
    const tmp = od.pool.slice(); shuffleInPlace(tmp); od.sequence = tmp.slice(0, L);
    od.expectIndex = 0;
  }
  function startGame(state) { window.Utils.cancelGameWork(); const od = ensureOrder(state); od.locked = false; const playBtn = document.getElementById('order-play-btn'); if (playBtn) playBtn.disabled = false; if (od.roundTimer) { clearTimeout(od.roundTimer); od.roundTimer = null; } newRound(state); }

  function render(stageEl, state) {
    const od = ensureOrder(state);
    od.gridTeardowns.forEach(fn => fn()); od.gridTeardowns.clear();

    if (!document.getElementById('order-inline-styles')) {
      const style = document.createElement('style'); style.id = 'order-inline-styles'; style.textContent = `.card.correct{outline:3px solid #22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.25) inset}.card.wrong{outline:3px solid #ef4444;box-shadow:0 0 0 3px rgba(239,68,68,.25) inset}.card:focus-visible{outline:3px solid var(--accent,#38bdf8);outline-offset:2px}`; document.head.appendChild(style);
    }
    const container = document.getElementById('cardContainer') || stageEl; container.innerHTML = '';

    const cols = od.gridCols ?? DEFAULTS.gridCols; const grid = el('div', { className: 'grid' }); grid.style.display = 'grid'; grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`; grid.style.gap = '12px';
    const scale = (od.cardScale ?? DEFAULTS.cardScale) / 100; const showLabel = !!od.showLabel;

    od.pool.forEach(c => {
      const tile = el('button', { className: 'card', attrs: { type: 'button', tabindex: '0', role: 'button', 'aria-label': c.label ? `Carte ${c.label}` : 'Carte' } });
      const frame = el('div', { className: 'card-media' }); Object.assign(frame.style, { width: '187px', height: '187px', transform: `scale(${scale})`, transformOrigin: 'center center', margin: '0 auto' });
      const img = el('img', { attrs: { src: c.img || c.image || '', alt: c.label || '' } }); img.loading='lazy'; img.decoding='async'; Object.assign(img.style, { width: '100%', height: '100%', objectFit: 'contain' });
      frame.appendChild(img); tile.appendChild(frame);
      if (showLabel && c.label) { tile.appendChild(el('div', { className: 'tag', text: c.label })); }

      const onPick = () => {
        if (od.locked || !od.sequence.length) return;
        const expected = od.sequence[od.expectIndex];
        if (c.id === expected.id) {
          tile.classList.add('correct'); window.Utils.gameTimeout(() => tile.classList.remove('correct'), 180); od.expectIndex++;
          if (od.expectIndex === od.sequence.length) {
            od.locked = true; const delayMs = 450; od.roundTimer = window.Utils.gameTimeout(() => { newRound(state); od.locked = false; render(stageEl, state); }, delayMs);
          }
        } else {
          tile.classList.add('wrong'); window.Utils.gameTimeout(() => tile.classList.remove('wrong'), 220); od.expectIndex = 0;
        }
      };
      const onKey = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(); } };
      tile.addEventListener('click', onPick); tile.addEventListener('keydown', onKey); od.gridTeardowns.add(() => { tile.removeEventListener('click', onPick); tile.removeEventListener('keydown', onKey); });
      grid.appendChild(tile);
    });
    container.appendChild(grid);
  }

  function mountControls(controlsEl, state, setState, rerender) {
    const od = ensureOrder(state);
    controlsEl.innerHTML = '';

    const rowHeader = el('div', { className: 'row' }); rowHeader.appendChild(el('span', { className: 'tag', text: 'Ordre correct' })); controlsEl.appendChild(rowHeader);

    const rowPlay = el('div', { className: 'row' });
    const playBtn = el('button', { className: 'btn', attrs: { id: 'order-play-btn', type: 'button' }, html: '▶️ Lire la séquence' });
    const onPlay = async () => {
      if (!state.order?.sequence?.length) return; const od = ensureOrder(state); if (od.locked) return; od.locked = true; playBtn.disabled = true; const token = window.Utils.workToken(); try { await playSequence(od.sequence, od.gapMs ?? DEFAULTS.gapMs); } finally { if (window.Utils.isCurrent(token)) { od.locked = false; playBtn.disabled = false; } }
    };
    playBtn.addEventListener('click', onPlay); od.controlTeardowns.add(() => playBtn.removeEventListener('click', onPlay)); rowPlay.appendChild(playBtn); controlsEl.appendChild(rowPlay);

    // Longueur de séquence
    controlsEl.appendChild(el('div', { className: 'row' }));
    const rowLen = el('div', { className: 'row' }); const lblLen = el('label', { html: 'Longueur de la séquence ' });
    const inputLen = el('input', { attrs: { type: 'number', min: '2', max: '8', value: String(od.seqLen ?? DEFAULTS.seqLen) } }); inputLen.style.width = '120px';
    const onLenChange = () => { const v = Math.max(2, Math.min(8, Number(inputLen.value) || DEFAULTS.seqLen)); setState({ order: { ...od, seqLen: v } }); startGame(state); rerender(); };
    inputLen.addEventListener('change', onLenChange); od.controlTeardowns.add(() => inputLen.removeEventListener('change', onLenChange)); rowLen.append(lblLen, inputLen); controlsEl.appendChild(rowLen);

    // Colonnes
    controlsEl.appendChild(el('div', { className: 'row' }));
    const rowCols = el('div', { className: 'row' }); const lblCols = el('label', { html: 'Colonnes ' });
    const inputCols = el('input', { attrs: { type: 'number', min: '2', max: '8', value: String(od.gridCols ?? DEFAULTS.gridCols) } }); inputCols.style.width = '90px';
    const onColsChange = () => { const v = Math.max(2, Math.min(8, Number(inputCols.value) || DEFAULTS.gridCols)); setState({ order: { ...od, gridCols: v } }); rerender(); };
    inputCols.addEventListener('change', onColsChange); od.controlTeardowns.add(() => inputCols.removeEventListener('change', onColsChange)); rowCols.append(lblCols, inputCols); controlsEl.appendChild(rowCols);

    // Taille
    controlsEl.appendChild(el('div', { className: 'row' }));
    const rowScale = el('div', { className: 'row' }); const lblScale = el('label', { html: 'Taille ' });
    const inputScale = el('input', { attrs: { type: 'range', min: '60', max: '150', step: '10', value: String(od.cardScale ?? DEFAULTS.cardScale) } });
    const onScaleInput = () => { setState({ order: { ...od, cardScale: Number(inputScale.value) } }); rerender(); };
    inputScale.addEventListener('input', onScaleInput); od.controlTeardowns.add(() => inputScale.removeEventListener('input', onScaleInput)); rowScale.append(lblScale, inputScale); controlsEl.appendChild(rowScale);

    // Afficher le mot
    controlsEl.appendChild(el('div', { className: 'row' }));
    const rowLabel = el('div', { className: 'row' }); const chkLabel = el('label', { html: `<input type="checkbox" ${od.showLabel ? 'checked' : ''}/> Afficher le mot` });
    const cb = chkLabel.querySelector('input'); const onShowLabelChange = (e) => { setState({ order: { ...od, showLabel: e.target.checked } }); rerender(); };
    cb.addEventListener('change', onShowLabelChange); od.controlTeardowns.add(() => cb.removeEventListener('change', onShowLabelChange)); rowLabel.appendChild(chkLabel); controlsEl.appendChild(rowLabel);

    startGame(state);
  }

  function destroy(state) { const od = ensureOrder(state); if (od.roundTimer) { clearTimeout(od.roundTimer); od.roundTimer = null; } od.gridTeardowns.forEach(fn => fn()); od.controlTeardowns.forEach(fn => fn()); od.gridTeardowns.clear(); od.controlTeardowns.clear(); }
  window.GAME_REGISTRY = window.GAME_REGISTRY || {}; window.GAME_REGISTRY[ID] = { id: ID, name: NAME, mountControls, render, destroy };
})();
