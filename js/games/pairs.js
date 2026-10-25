
// /js/games/pairs.js
(function () {
  const { el, shuffleInPlace, playAudio } = window.Utils;
  const ID = 'pairs';
  const NAME = 'Paires – progressif';
  const DEFAULTS = { gridCols: 6, showLabel: false, cardScale: 100, startPairs: 10, addOnMatch: false };

  function ensurePairs(state) {
    if (!state.pairs) {
      state.pairs = { gridCols: DEFAULTS.gridCols, showLabel: DEFAULTS.showLabel, cardScale: DEFAULTS.cardScale, startPairs: DEFAULTS.startPairs, addOnMatch: DEFAULTS.addOnMatch, board: [], first: null, locked: false, gridTeardowns: new Set(), controlTeardowns: new Set() };
    }
    return state.pairs;
  }

  function positionsAvoidAdjacent(newId, board) { const pos = []; for (let i = 0; i <= board.length; i++) { const left = board[i - 1]?.id; const right = board[i]?.id; if (left !== newId && right !== newId) pos.push(i); } return pos.length ? pos : [board.length]; }
  function addPairs(state, count = 1) {
    const ps = ensurePairs(state);
    if (!Array.isArray(state.cards) || state.cards.length === 0) return;
    const presentIds = new Set(ps.board.map(t => t.id));
    const available = state.cards.filter(c => !presentIds.has(c.id));
    if (!available.length) return;
    shuffleInPlace(available);
    const chosen = available.slice(0, Math.min(count, available.length));
    chosen.forEach(card => { for (let k = 0; k < 2; k++) { const candidates = positionsAvoidAdjacent(card.id, ps.board); const idx = candidates[Math.floor(Math.random() * candidates.length)]; ps.board.splice(idx, 0, { id: card.id, card, matched: false }); } });
  }
  function startGame(state) { window.Utils.cancelGameWork(); const ps = ensurePairs(state); ps.board = []; ps.first = null; ps.locked = false; addPairs(state, ps.startPairs); }

  function render(stageEl, state) {
    const ps = ensurePairs(state);
    ps.gridTeardowns.forEach(fn => fn()); ps.gridTeardowns.clear();

    if (!document.getElementById('pairs-inline-styles')) { const style = document.createElement('style'); style.id = 'pairs-inline-styles'; style.textContent = `.card.correct{outline:3px solid #22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.25) inset}.card:focus-visible{outline:3px solid var(--accent,#38bdf8);outline-offset:2px}`; document.head.appendChild(style); }
    const container = document.getElementById('cardContainer') || stageEl; container.innerHTML = '';

    const cols = ps.gridCols ?? DEFAULTS.gridCols; const grid = el('div', { className: 'grid' }); grid.style.display = 'grid'; grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`; grid.style.gap = '12px';
    const scale = (ps.cardScale ?? DEFAULTS.cardScale) / 100; const showLabel = !!ps.showLabel;

    ps.board.forEach((tileObj) => {
      const tile = el('div', { className: 'card', attrs: { tabindex: '0', role: 'button' } });
      const frame = el('div', { className: 'card-media' }); Object.assign(frame.style, { width: '187px', height: '187px', transform: `scale(${scale})`, transformOrigin: 'center center', margin: '0 auto' });
      const img = el('img', { attrs: { src: tileObj.card.img || '', alt: tileObj.card.label || '' } }); img.loading='lazy'; img.decoding='async'; Object.assign(img.style, { width: '100%', height: '100%', objectFit: 'contain' });
      frame.appendChild(img); tile.appendChild(frame);
      if (showLabel && tileObj.card.label) { tile.appendChild(el('div', { className: 'tag', text: tileObj.card.label })); }
      if (tileObj.matched) { tile.classList.add('correct'); }

      const onPick = () => {
        if (ps.locked || tileObj.matched) return;
        if (!ps.first) { ps.first = { tile: tileObj, el: tile }; if (tileObj.card.audio) playAudio(tileObj.card.audio); return; }
        if (ps.first.tile === tileObj) return;
        ps.locked = true; if (tileObj.card.audio) playAudio(tileObj.card.audio);
        if (ps.first.tile.id === tileObj.id) {
          tile.classList.add('correct'); ps.first.el.classList.add('correct');
          window.Utils.gameTimeout(() => {
            const removeOne = (t) => { const i = ps.board.indexOf(t); if (i > -1) ps.board.splice(i, 1); };
            removeOne(tileObj); removeOne(ps.first.tile);
            ps.first = null; ps.locked = false; if (ps.addOnMatch) addPairs(state, 1); render(stageEl, state);
          }, 600);
        } else {
          window.Utils.gameTimeout(() => { ps.first = null; ps.locked = false; }, 800);
        }
      };
      const onKey = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(); } };
      tile.addEventListener('click', onPick); tile.addEventListener('keydown', onKey); ps.gridTeardowns.add(() => { tile.removeEventListener('click', onPick); tile.removeEventListener('keydown', onKey); });
      grid.appendChild(tile);
    });
    container.appendChild(grid);
  }

  function mountControls(controlsEl, state, setState, rerender) {
    const ps = ensurePairs(state);
    controlsEl.innerHTML = '';

    const rowHeader = el('div', { className: 'row' }); rowHeader.appendChild(el('span', { className: 'tag', text: 'Paires – progressif' })); controlsEl.appendChild(rowHeader);

    // Paires de démarrage
    controlsEl.appendChild(el('div', { className: 'row' }));
    const rowStart = el('div', { className: 'row' }); const lblStart = el('label', { html: 'Paires au démarrage ' });
    const inputStart = el('input', { attrs: { type: 'number', min: '1', max: '24', value: String(ps.startPairs ?? DEFAULTS.startPairs) } }); inputStart.style.width = '120px';
    const onStartChange = () => { const v = Math.max(1, Math.min(24, Number(inputStart.value) || DEFAULTS.startPairs)); setState({ pairs: { ...ps, startPairs: v } }); startGame(state); rerender(); };
    inputStart.addEventListener('change', onStartChange); ps.controlTeardowns.add(() => inputStart.removeEventListener('change', onStartChange)); rowStart.append(lblStart, inputStart); controlsEl.appendChild(rowStart);

    // Jeu infini
    const rowAuto = el('div', { className: 'row' }); const chkAuto = el('label', { html: `<input type="checkbox" ${ps.addOnMatch ? 'checked' : ''}/> jeu infini` });
    const cbAuto = chkAuto.querySelector('input'); const onAutoChange = (e) => { setState({ pairs: { ...ps, addOnMatch: e.target.checked } }); };
    cbAuto.addEventListener('change', onAutoChange); ps.controlTeardowns.add(() => cbAuto.removeEventListener('change', onAutoChange)); rowAuto.appendChild(chkAuto); controlsEl.appendChild(rowAuto);

    // Colonnes
    controlsEl.appendChild(el('div', { className: 'row' }));
    const rowCols = el('div', { className: 'row' }); const lblCols = el('label', { html: 'Colonnes ' });
    const inputCols = el('input', { attrs: { type: 'number', min: '2', max: '8', value: String(ps.gridCols ?? DEFAULTS.gridCols) } }); inputCols.style.width = '90px';
    const onColsChange = () => { const v = Math.max(2, Math.min(8, Number(inputCols.value) || DEFAULTS.gridCols)); setState({ pairs: { ...ps, gridCols: v } }); rerender(); };
    inputCols.addEventListener('change', onColsChange); ps.controlTeardowns.add(() => inputCols.removeEventListener('change', onColsChange)); rowCols.append(lblCols, inputCols); controlsEl.appendChild(rowCols);

    // Taille
    controlsEl.appendChild(el('div', { className: 'row' }));
    const rowScale = el('div', { className: 'row' }); const lblScale = el('label', { html: 'Taille ' });
    const inputScale = el('input', { attrs: { type: 'range', min: '60', max: '150', step: '10', value: String(ps.cardScale ?? DEFAULTS.cardScale) } });
    const onScaleInput = () => { setState({ pairs: { ...ps, cardScale: Number(inputScale.value) } }); rerender(); };
    inputScale.addEventListener('input', onScaleInput); ps.controlTeardowns.add(() => inputScale.removeEventListener('input', onScaleInput)); rowScale.append(lblScale, inputScale); controlsEl.appendChild(rowScale);

    // Afficher le mot
    controlsEl.appendChild(el('div', { className: 'row' }));
    const rowLabel = el('div', { className: 'row' }); const chkLabel = el('label', { html: `<input type="checkbox" ${ps.showLabel ? 'checked' : ''}/> Afficher le mot` });
    const cb = chkLabel.querySelector('input'); const onShowLabelChange = (e) => { setState({ pairs: { ...ps, showLabel: e.target.checked } }); rerender(); };
    cb.addEventListener('change', onShowLabelChange); ps.controlTeardowns.add(() => cb.removeEventListener('change', onShowLabelChange)); rowLabel.appendChild(chkLabel); controlsEl.appendChild(rowLabel);

    startGame(state);
  }

  function destroy(state) { const ps = ensurePairs(state); ps.gridTeardowns.forEach(fn => fn()); ps.controlTeardowns.forEach(fn => fn()); ps.gridTeardowns.clear(); ps.controlTeardowns.clear(); }
  window.GAME_REGISTRY = window.GAME_REGISTRY || {}; window.GAME_REGISTRY[ID] = { id: ID, name: NAME, mountControls, render, destroy };
})();
