
// /js/games/mask.js
(function () {
  const { el, shuffleInPlace, playAudio } = window.Utils;
  const ID = 'mask';
  const NAME = 'Masque & Révèle';
  const DEFAULTS = { gridCols: 6, showLabel: false, cardScale: 100, maskedCount: 1, nextRoundDelayMs: 1200 };

  function ensureMask(state) {
    if (!state.mask) {
      state.mask = {
        gridCols: DEFAULTS.gridCols,
        showLabel: DEFAULTS.showLabel,
        cardScale: DEFAULTS.cardScale,
        maskedCount: DEFAULTS.maskedCount,
        nextRoundDelayMs: DEFAULTS.nextRoundDelayMs,
        current: [],
        maskedIds: new Set(),
        remainingToReveal: 0,
        inputLocked: false,
        gridTeardowns: new Set(),
        controlTeardowns: new Set(),
        roundTimer: null
      };
    }
    return state.mask;
  }

  function startRound(state) { window.Utils.cancelGameWork();
    const ms = ensureMask(state);
    const base = (state.cards || []).slice();
    base.forEach((c, i) => { if (!c.id) c.id = c.label || c.img || String(i); });
    shuffleInPlace(base);
    ms.current = base;
    const toMask = Math.max(0, Math.min(ms.maskedCount ?? DEFAULTS.maskedCount, base.length));
    const indices = base.map((_, i) => i);
    shuffleInPlace(indices);
    const maskedIdx = new Set(indices.slice(0, toMask));
    ms.maskedIds.clear();
    base.forEach((c, i) => { if (maskedIdx.has(i)) ms.maskedIds.add(c.id); });
    ms.remainingToReveal = toMask;
    ms.inputLocked = false;
    if (ms.roundTimer) { clearTimeout(ms.roundTimer); ms.roundTimer = null; }
  }
  function startGame(state) { const ms = ensureMask(state); startRound(state); }

  function render(stageEl, state) {
    const ms = ensureMask(state);
    ms.gridTeardowns.forEach(fn => fn());
    ms.gridTeardowns.clear();

    if (!document.getElementById('mask-inline-styles')) {
      const style = document.createElement('style');
      style.id = 'mask-inline-styles';
      style.textContent = `
      .card.masked { position: relative; background: #0b1220; border: 2px dashed #64748b; }
      .card .mask { position: absolute; inset: 0; display: grid; place-items: center; font: 700 48px/1 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #e2e8f0; background: rgba(2,6,23,.66); }
      .card.correct { outline: 3px solid #22c55e; box-shadow: 0 0 0 3px rgba(34,197,94,.25) inset; }
      `;
      document.head.appendChild(style);
    }
    const container = document.getElementById('cardContainer') || stageEl;
    container.innerHTML = '';

    const cols = ms.gridCols ?? DEFAULTS.gridCols;
    const grid = el('div', { className: 'grid' });
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    grid.style.gap = '12px';
    const scale = (ms.cardScale ?? DEFAULTS.cardScale) / 100;
    const showLabel = !!ms.showLabel;

    ms.current.forEach(c => {
      const isMasked = ms.maskedIds.has(c.id);
      const tile = el('div', { className: 'card', attrs: { tabindex: '0', role: 'button' } });
      const frame = el('div', { className: 'card-media' });
      Object.assign(frame.style, { width: '187px', height: '187px', transform: `scale(${scale})`, transformOrigin: 'center center', margin: '0 auto' });
      const img = el('img', { attrs: { src: c.img || '', alt: c.label || '' } });
      img.loading = 'lazy'; img.decoding = 'async';
      Object.assign(img.style, { width: '100%', height: '100%', objectFit: 'contain' });
      frame.appendChild(img);
      tile.appendChild(frame);
      if (showLabel && c.label) { tile.appendChild(el('div', { className: 'tag', text: c.label })); }
      if (isMasked) { tile.classList.add('masked'); tile.appendChild(el('div', { className: 'mask', html: '?' })); }

      const reveal = () => {
        if (ms.inputLocked) return;
        if (!ms.maskedIds.has(c.id)) return;
        tile.classList.remove('masked');
        const m = tile.querySelector('.mask'); if (m) m.remove();
        tile.classList.add('correct');
        if (c.audio) playAudio(c.audio);
        ms.maskedIds.delete(c.id);
        ms.remainingToReveal = Math.max(0, ms.remainingToReveal - 1);
        if (ms.remainingToReveal === 0) {
          ms.inputLocked = true;
          ms.roundTimer = window.Utils.gameTimeout(() => { startRound(state); render(stageEl, state); }, ms.nextRoundDelayMs ?? DEFAULTS.nextRoundDelayMs);
        }
      };
      const onClick = () => { if (ms.maskedIds.has(c.id)) reveal(); };
      const onKey = (e) => { if ((e.key === 'Enter' || e.key === ' ') && ms.maskedIds.has(c.id)) { e.preventDefault(); reveal(); } };
      tile.addEventListener('click', onClick);
      tile.addEventListener('keydown', onKey);
      ms.gridTeardowns.add(() => { tile.removeEventListener('click', onClick); tile.removeEventListener('keydown', onKey); });
      grid.appendChild(tile);
    });
    container.appendChild(grid);
  }

  function mountControls(controlsEl, state, setState, rerender) {
    const ms = ensureMask(state);
    controlsEl.innerHTML = '';

    const rowHeader = el('div', { className: 'row' });
    rowHeader.appendChild(el('span', { className: 'tag', text: 'Masque & Révèle' }));
    controlsEl.appendChild(rowHeader);

    // Cartes masquées
    controlsEl.appendChild(el('div', { className: 'row' }));
    const rowMask = el('div', { className: 'row' });
    const lblMask = el('label', { html: 'Cartes masquées ' });
    const inputMask = el('input', { attrs: { type: 'number', min: '0', max: String((state.cards || []).length || 99), value: String(ms.maskedCount ?? DEFAULTS.maskedCount) } });
    inputMask.style.width = '110px';
    const onMaskChange = () => { const max = (state.cards || []).length || 0; const val = Math.max(0, Math.min(max, Number(inputMask.value) || 0)); setState({ mask: { ...ms, maskedCount: val } }); startRound(state); rerender(); };
    inputMask.addEventListener('change', onMaskChange);
    ms.controlTeardowns.add(() => inputMask.removeEventListener('change', onMaskChange));
    rowMask.append(lblMask, inputMask);
    controlsEl.appendChild(rowMask);

    // Colonnes
    controlsEl.appendChild(el('div', { className: 'row' }));
    const rowCols = el('div', { className: 'row' });
    const lblCols = el('label', { html: 'Colonnes ' });
    const inputCols = el('input', { attrs: { type: 'number', min: '2', max: '8', value: String(ms.gridCols ?? DEFAULTS.gridCols) } });
    inputCols.style.width = '90px';
    const onColsChange = () => { const v = Math.max(2, Math.min(8, Number(inputCols.value) || DEFAULTS.gridCols)); setState({ mask: { ...ms, gridCols: v } }); rerender(); };
    inputCols.addEventListener('change', onColsChange);
    ms.controlTeardowns.add(() => inputCols.removeEventListener('change', onColsChange));
    rowCols.append(lblCols, inputCols);
    controlsEl.appendChild(rowCols);

    // Taille
    controlsEl.appendChild(el('div', { className: 'row' }));
    const rowScale = el('div', { className: 'row' });
    const lblScale = el('label', { html: 'Taille ' });
    const inputScale = el('input', { attrs: { type: 'range', min: '60', max: '150', step: '10', value: String(ms.cardScale ?? DEFAULTS.cardScale) } });
    const onScaleInput = () => { setState({ mask: { ...ms, cardScale: Number(inputScale.value) } }); rerender(); };
    inputScale.addEventListener('input', onScaleInput);
    ms.controlTeardowns.add(() => inputScale.removeEventListener('input', onScaleInput));
    rowScale.append(lblScale, inputScale);
    controlsEl.appendChild(rowScale);

    // Afficher le mot
    controlsEl.appendChild(el('div', { className: 'row' }));
    const rowLabel = el('div', { className: 'row' });
    const chkLabel = el('label', { html: `<input type="checkbox" ${ms.showLabel ? 'checked' : ''}/> Afficher le mot` });
    const cb = chkLabel.querySelector('input');
    const onShowLabelChange = (e) => { setState({ mask: { ...ms, showLabel: e.target.checked } }); rerender(); };
    cb.addEventListener('change', onShowLabelChange);
    ms.controlTeardowns.add(() => cb.removeEventListener('change', onShowLabelChange));
    rowLabel.appendChild(chkLabel);
    controlsEl.appendChild(rowLabel);

    startGame(state);
  }

  function destroy(state) {
    const ms = ensureMask(state);
    if (ms.roundTimer) { clearTimeout(ms.roundTimer); ms.roundTimer = null; }
    ms.gridTeardowns.forEach(fn => fn());
    ms.controlTeardowns.forEach(fn => fn());
    ms.gridTeardowns.clear();
    ms.controlTeardowns.clear();
  }

  window.GAME_REGISTRY = window.GAME_REGISTRY || {};
  window.GAME_REGISTRY[ID] = { id: ID, name: NAME, mountControls, render, destroy };
})();
