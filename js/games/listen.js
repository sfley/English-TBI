
// /js/games/listen.js
(function () {
  const { el, shuffleInPlace, playAudio } = window.Utils;
  const ID = 'listen';
  const NAME = 'Jeu d’écoute';
  const DEFAULTS = { gridCols: 6, showLabel: false, cardScale: 100 };

  function ensureListen(state) {
    if (!state.listen) {
      state.listen = {
        gridCols: DEFAULTS.gridCols,
        showLabel: DEFAULTS.showLabel,
        cardScale: DEFAULTS.cardScale,
        remaining: [],
        renderOrder: [],
        target: null,
        inputLocked: false,
        gridTeardowns: new Set(),
        controlTeardowns: new Set()
      };
    }
    return state.listen;
  }

  function pickNewTarget(ls) {
    if (!ls.remaining.length) { ls.target = null; return; }
    ls.target = ls.remaining[Math.floor(Math.random() * ls.remaining.length)];
  }
  function startGame(state) { window.Utils.cancelGameWork();
    const ls = ensureListen(state);
    ls.inputLocked = false;
    const base = (state.cards || []).slice();
    base.forEach((c, i) => { if (!c.id) c.id = c.label || c.img || String(i); });
    ls.remaining = base;
    ls.renderOrder = base.map(c => c.id);
    shuffleInPlace(ls.renderOrder);
    pickNewTarget(ls);
    const playBtn = document.getElementById('listen-play-btn');
    if (playBtn) playBtn.disabled = !ls.target;
  }
  function getById(arr, id) { return arr.find(c => c.id === id); }

  function renderGrid(stageEl, state) {
    const ls = ensureListen(state);
    ls.gridTeardowns.forEach(fn => fn());
    ls.gridTeardowns.clear();

    if (!document.getElementById('listen-inline-styles')) {
      const style = document.createElement('style');
      style.id = 'listen-inline-styles';
      style.textContent = `
      .card.correct { outline: 3px solid #22c55e; box-shadow: 0 0 0 3px rgba(34,197,94,.25) inset; }
      .card.wrong { outline: 3px solid #ef4444; box-shadow: 0 0 0 3px rgba(239,68,68,.25) inset; }
      `;
      document.head.appendChild(style);
    }
    const container = document.getElementById('cardContainer') || stageEl;
    container.innerHTML = '';

    const cols = ls.gridCols ?? DEFAULTS.gridCols;
    const grid = el('div', { className: 'grid' });
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    grid.style.gap = '12px';
    const scale = (ls.cardScale ?? DEFAULTS.cardScale) / 100;
    const showLabel = !!ls.showLabel;

    ls.renderOrder.forEach(id => {
      const c = getById(ls.remaining, id);
      if (!c) return;
      const tile = el('div', { className: 'card', attrs: { tabindex: '0', role: 'button' } });
      const frame = el('div', { className: 'card-media' });
      Object.assign(frame.style, { width: '187px', height: '187px', transform: `scale(${scale})`, transformOrigin: 'center center', margin: '0 auto' });
      const img = el('img', { attrs: { src: c.img || '', alt: c.label || '' } });
      img.loading = 'lazy'; img.decoding = 'async';
      Object.assign(img.style, { width: '100%', height: '100%', objectFit: 'contain' });
      frame.appendChild(img);
      tile.appendChild(frame);
      if (showLabel && c.label) { tile.appendChild(el('div', { className: 'tag', text: c.label })); }

      const onPick = () => {
        if (ls.inputLocked || !ls.target) return;
        if (c.id === ls.target.id) {
          ls.inputLocked = true;
          tile.classList.add('correct');
          if (c.audio) { playAudio(c.audio); }
          const idxR = ls.remaining.findIndex(x => x.id === c.id);
          if (idxR > -1) ls.remaining.splice(idxR, 1);
          const idxO = ls.renderOrder.indexOf(c.id);
          if (idxO > -1) ls.renderOrder.splice(idxO, 1);
          window.Utils.gameTimeout(() => {
            pickNewTarget(ls);
            renderGrid(stageEl, state);
            ls.inputLocked = false;
            const playBtn = document.getElementById('listen-play-btn');
            if (playBtn) playBtn.disabled = !ls.target;
          }, 700);
        } else {
          tile.classList.add('wrong');
          window.Utils.gameTimeout(() => tile.classList.remove('wrong'), 450);
        }
      };
      const onKey = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(); } };
      tile.addEventListener('click', onPick);
      tile.addEventListener('keydown', onKey);
      ls.gridTeardowns.add(() => { tile.removeEventListener('click', onPick); tile.removeEventListener('keydown', onKey); });
      grid.appendChild(tile);
    });
    container.appendChild(grid);
    const playBtn = document.getElementById('listen-play-btn');
    if (playBtn) playBtn.disabled = !ls.target;
  }

  function mountControls(controlsEl, state, setState, rerender) {
    const ls = ensureListen(state);
    controlsEl.innerHTML = '';

    const rowHeader = el('div', { className: 'row' });
    rowHeader.appendChild(el('span', { className: 'tag', text: 'Jeu d’écoute' }));
    controlsEl.appendChild(rowHeader);

    const rowPlay = el('div', { className: 'row' });
    const playBtn = el('button', { className: 'btn', attrs: { id: 'listen-play-btn', type: 'button' }, html: '▶️ Écouter' });
    const onPlayTarget = async () => { if (state.listen?.target?.audio) { await playAudio(state.listen.target.audio); } };
    playBtn.addEventListener('click', onPlayTarget);
    ls.controlTeardowns.add(() => playBtn.removeEventListener('click', onPlayTarget));
    rowPlay.appendChild(playBtn);
    controlsEl.appendChild(rowPlay);

    // Colonnes
    controlsEl.appendChild(el('div', { className: 'row' }));
    const rowCols = el('div', { className: 'row' });
    const lblCols = el('label', { html: 'Colonnes ' });
    const inputCols = el('input', { attrs: { type: 'number', min: '2', max: '8', value: String(ls.gridCols ?? DEFAULTS.gridCols) } });
    inputCols.style.width = '90px';
    const onColsChange = () => { const v = Math.max(2, Math.min(8, Number(inputCols.value) || DEFAULTS.gridCols)); setState({ listen: { ...ls, gridCols: v } }); rerender(); };
    inputCols.addEventListener('change', onColsChange);
    ls.controlTeardowns.add(() => inputCols.removeEventListener('change', onColsChange));
    rowCols.append(lblCols, inputCols);
    controlsEl.appendChild(rowCols);

    // Taille
    controlsEl.appendChild(el('div', { className: 'row' }));
    const rowScale = el('div', { className: 'row' });
    const lblScale = el('label', { html: 'Taille ' });
    const inputScale = el('input', { attrs: { type: 'range', min: '60', max: '150', step: '10', value: String(ls.cardScale ?? DEFAULTS.cardScale) } });
    const onScaleInput = () => { setState({ listen: { ...ls, cardScale: Number(inputScale.value) } }); rerender(); };
    inputScale.addEventListener('input', onScaleInput);
    ls.controlTeardowns.add(() => inputScale.removeEventListener('input', onScaleInput));
    rowScale.append(lblScale, inputScale);
    controlsEl.appendChild(rowScale);

    // Afficher le mot
    controlsEl.appendChild(el('div', { className: 'row' }));
    const rowLabel = el('div', { className: 'row' });
    const chkLabel = el('label', { html: `<input type="checkbox" ${ls.showLabel ? 'checked' : ''}/> Afficher le mot` });
    const cb = chkLabel.querySelector('input');
    const onShowLabelChange = (e) => { setState({ listen: { ...ls, showLabel: e.target.checked } }); rerender(); };
    cb.addEventListener('change', onShowLabelChange);
    ls.controlTeardowns.add(() => cb.removeEventListener('change', onShowLabelChange));
    rowLabel.appendChild(chkLabel);
    controlsEl.appendChild(rowLabel);

    startGame(state);
    playBtn.disabled = !state.listen?.target;
  }

  function render(stageEl, state) {
    const ls = ensureListen(state);
    renderGrid(stageEl, state);
    const playBtn = document.getElementById('listen-play-btn');
    if (playBtn) playBtn.disabled = !ls.target;
  }

  function destroy(state) {
    const ls = ensureListen(state);
    ls.gridTeardowns.forEach(fn => fn());
    ls.controlTeardowns.forEach(fn => fn());
    ls.gridTeardowns.clear();
    ls.controlTeardowns.clear();
  }

  window.GAME_REGISTRY = window.GAME_REGISTRY || {};
  window.GAME_REGISTRY[ID] = { id: ID, name: NAME, mountControls, render, destroy };
})();
