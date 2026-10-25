
// /js/games/vf.js
(function () {
  const { el, shuffleInPlace, playAudio } = window.Utils;
  const ID = 'vf';
  const NAME = 'Vrai / Faux';
  const DEFAULTS = { gridCols: 6, showLabel: false, cardScale: 100, nCards: 6, nTrue: 3 };

  function ensureVF(state) {
    if (!state.vf) {
      state.vf = { gridCols: DEFAULTS.gridCols, showLabel: DEFAULTS.showLabel, cardScale: DEFAULTS.cardScale, nCards: DEFAULTS.nCards, nTrue: DEFAULTS.nTrue, pool: [], asgns: [], gridTeardowns: new Set(), controlTeardowns: new Set() };
    }
    return state.vf;
  }

  function avoidMirrorFaux(asgns, pool, allCards) {
    for (let i = 0; i < asgns.length; i++) {
      for (let j = i + 1; j < asgns.length; j++) {
        const a = asgns[i], b = asgns[j];
        if (!a.isTrue && !b.isTrue && a.card.id === b.target.id && b.card.id === a.target.id) {
          const autres = pool.filter(c => c.id !== b.card.id && c.id !== a.card.id);
          const choix = (autres.length ? autres : allCards.filter(c => c.id !== b.card.id));
          if (choix.length) { const pick = shuffleInPlace(choix.slice())[0]; b.target = pick; }
        }
      }
    }
  }

  function buildRound(state) { window.Utils.cancelGameWork();
    const vf = ensureVF(state);
    const all = (state.cards || []).slice();
    const maxCards = Math.min(16, all.length);
    const N = Math.max(2, Math.min(Number(vf.nCards) || DEFAULTS.nCards, maxCards));
    const T = Math.max(0, Math.min((Number.isFinite(Number(vf.nTrue)) ? Number(vf.nTrue) : DEFAULTS.nTrue), N));
    shuffleInPlace(all);
    vf.pool = all.slice(0, N);
    const indices = [...Array(N).keys()]; shuffleInPlace(indices);
    const vraiIdx = new Set(indices.slice(0, T));
    vf.asgns = vf.pool.map((card, idx) => {
      const isTrue = vraiIdx.has(idx);
      let target = card;
      if (!isTrue) {
        const autres = vf.pool.filter(c => c.id !== card.id);
        const choix = autres.length ? autres : all.filter(c => c.id !== card.id);
        target = choix.length ? shuffleInPlace(choix.slice())[0] : card;
      }
      return { card, target, isTrue, answered: false };
    });
    avoidMirrorFaux(vf.asgns, vf.pool, all);
  }

  function render(stageEl, state) {
    const vf = ensureVF(state);
    vf.gridTeardowns.forEach(fn => fn()); vf.gridTeardowns.clear();

    if (!document.getElementById('vf-inline-styles')) {
      const style = document.createElement('style'); style.id = 'vf-inline-styles';
      style.textContent = `.card.correct{outline:3px solid #22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.25) inset}.card.wrong{outline:3px solid #ef4444;box-shadow:0 0 0 3px rgba(239,68,68,.25) inset}.card.vf{position:relative;padding:12px}.card.vf .thumb{display:grid;place-items:center;margin-bottom:8px}.card.vf img{width:187px;height:187px;object-fit:contain;border-radius:10px}.vf-badge{display:grid;place-items:center;gap:8px;padding:10px;border-radius:12px;border:2px dashed #334155;background:#0b1220}.vf-badge--correct{border-color:#22c55e}.vf-badge--wrong{border-color:#ef4444}.vf-controls{display:flex;gap:8px}.vf-controls button{background:#334155;color:#e2e8f0;border:none;padding:8px 10px;border-radius:8px;cursor:pointer;font-weight:700}.vf-controls button:disabled{opacity:.6;cursor:not-allowed}.vf-badge-correction{position:absolute;top:8px;right:8px;background:#0ea5e9;color:#001018;font-weight:800;border-radius:999px;padding:4px 10px}`;
      document.head.appendChild(style);
    }

    const container = document.getElementById('cardContainer') || stageEl; container.innerHTML = '';
    const cols = vf.gridCols ?? DEFAULTS.gridCols; const grid = el('div', { className: 'grid' }); grid.style.display='grid'; grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`; grid.style.gap='12px';
    const scale = (vf.cardScale ?? DEFAULTS.cardScale) / 100; const showLabel = !!vf.showLabel;

    vf.asgns.forEach(asgn => {
      const wrapper = el('div', { className: 'card vf', attrs: { tabindex: '0', role: 'group' } });
      const thumb = el('div', { className: 'thumb' });
      const frame = el('div', { className: 'card-media' });
      Object.assign(frame.style, { width: '187px', height: '187px', transform: `scale(${scale})`, transformOrigin: 'center center', margin: '0 auto' });
      const img = el('img', { attrs: { src: asgn.card.img || asgn.card.image || '', alt: asgn.card.label || '' } }); img.loading='lazy'; img.decoding='async';
      frame.appendChild(img); thumb.appendChild(frame); wrapper.appendChild(thumb);
      if (showLabel && asgn.card.label) { wrapper.appendChild(el('div', { className: 'tag', text: asgn.card.label })); }

      const corrBadge = el('div', { className: 'vf-badge-correction', text: '✅ Correction' }); corrBadge.style.display = 'none'; wrapper.appendChild(corrBadge);

      const onImgClick = () => { if (!asgn.answered && asgn.target?.audio) playAudio(asgn.target.audio); };
      img.addEventListener('click', onImgClick); vf.gridTeardowns.add(() => img.removeEventListener('click', onImgClick));

      const badgeWrap = el('div', { className: 'vf-badge' });
      const controls = el('div', { className: 'vf-controls' });
      const btnVrai = el('button', { text: 'Vrai', attrs: { type: 'button' } });
      const btnFaux = el('button', { text: 'Faux', attrs: { type: 'button' } });
      const lock = () => { btnVrai.disabled = true; btnFaux.disabled = true; };
      const repondre = (choixVrai) => {
        if (asgn.answered) return;
        asgn.answered = true;
        const ok = (choixVrai === asgn.isTrue);
        const newSrc = asgn.target?.img || asgn.target?.image; if (newSrc) img.src = newSrc;
        corrBadge.style.display = 'block';
        if (asgn.target?.audio) playAudio(asgn.target.audio);
        if (ok) { wrapper.classList.add('correct'); badgeWrap.classList.add('vf-badge--correct'); }
        else { wrapper.classList.add('wrong'); badgeWrap.classList.add('vf-badge--wrong'); }
        lock();
      };
      const onVrai = () => repondre(true);
      const onFaux = () => repondre(false);
      btnVrai.addEventListener('click', onVrai); btnFaux.addEventListener('click', onFaux);
      vf.gridTeardowns.add(() => { btnVrai.removeEventListener('click', onVrai); btnFaux.removeEventListener('click', onFaux); });
      const onKey = (e) => { if (e.target.tagName === 'BUTTON') return; const k = e.key?.toLowerCase?.(); if (k === 'v') { e.preventDefault(); repondre(true); } else if (k === 'f') { e.preventDefault(); e.stopPropagation(); repondre(false); } else if ((e.key === 'Enter' || e.key === ' ') && !asgn.answered) { e.preventDefault(); if (asgn.target?.audio) playAudio(asgn.target.audio); } };
      wrapper.addEventListener('keydown', onKey); vf.gridTeardowns.add(() => wrapper.removeEventListener('keydown', onKey));
      controls.appendChild(btnVrai); controls.appendChild(btnFaux); badgeWrap.appendChild(controls); wrapper.appendChild(badgeWrap); grid.appendChild(wrapper);
    });
    container.appendChild(grid);
  }

  function mountControls(controlsEl, state, setState, rerender) {
    const vf = ensureVF(state);
    controlsEl.innerHTML = '';

    const rowHeader = el('div', { className: 'row' }); rowHeader.appendChild(el('span', { className: 'tag', text: NAME })); controlsEl.appendChild(rowHeader);

    // Nb cartes
    controlsEl.appendChild(el('div', { className: 'row' }));
    const rowCards = el('div', { className: 'row' }); rowCards.appendChild(el('label', { html: 'Cartes ' }));
    const inputCards = el('input', { attrs: { type: 'number', min: '2', max: '16', value: String(vf.nCards ?? DEFAULTS.nCards) } }); inputCards.style.width = '120px';
    const onCardsChange = () => { const max = Math.min(16, (state.cards || []).length || 16); const v = Math.max(2, Math.min(max, Number(inputCards.value) || DEFAULTS.nCards)); setState({ vf: { ...vf, nCards: v, nTrue: Math.min(vf.nTrue, v) } }); inputTrue.max = String(v); inputTrue.value = String(vf.nTrue); buildRound(state); rerender(); };
    inputCards.addEventListener('change', onCardsChange); vf.controlTeardowns.add(() => inputCards.removeEventListener('change', onCardsChange)); rowCards.appendChild(inputCards); controlsEl.appendChild(rowCards);

    // Nb "Vrai"
    const rowTrue = el('div', { className: 'row' }); rowTrue.appendChild(el('label', { html: 'Nombre de "Vrai" ' }));
    const inputTrue = el('input', { attrs: { type: 'number', min: '0', max: String(vf.nCards ?? DEFAULTS.nCards), value: String(vf.nTrue ?? DEFAULTS.nTrue) } }); inputTrue.style.width = '120px';
    const onTrueChange = () => { const v = Math.max(0, Math.min((Number(inputCards.value) || vf.nCards || DEFAULTS.nCards), (Number.isFinite(inputTrue.valueAsNumber) ? inputTrue.valueAsNumber : DEFAULTS.nTrue))); setState({ vf: { ...vf, nTrue: v } }); buildRound(state); rerender(); };
    inputTrue.addEventListener('change', onTrueChange); vf.controlTeardowns.add(() => inputTrue.removeEventListener('change', onTrueChange)); rowTrue.appendChild(inputTrue); controlsEl.appendChild(rowTrue);

    // Colonnes
    controlsEl.appendChild(el('div', { className: 'row' }));
    const rowCols = el('div', { className: 'row' }); rowCols.appendChild(el('label', { html: 'Colonnes ' }));
    const inputCols = el('input', { attrs: { type: 'number', min: '2', max: '8', value: String(vf.gridCols ?? DEFAULTS.gridCols) } }); inputCols.style.width = '90px';
    const onColsChange = () => { const v = Math.max(2, Math.min(8, Number(inputCols.value) || DEFAULTS.gridCols)); setState({ vf: { ...vf, gridCols: v } }); rerender(); };
    inputCols.addEventListener('change', onColsChange); vf.controlTeardowns.add(() => inputCols.removeEventListener('change', onColsChange)); rowCols.appendChild(inputCols); controlsEl.appendChild(rowCols);

    // Taille
    controlsEl.appendChild(el('div', { className: 'row' }));
    const rowScale = el('div', { className: 'row' }); rowScale.appendChild(el('label', { html: 'Taille ' }));
    const inputScale = el('input', { attrs: { type: 'range', min: '60', max: '150', step: '10', value: String(vf.cardScale ?? DEFAULTS.cardScale) } });
    const onScaleInput = () => { setState({ vf: { ...vf, cardScale: Number(inputScale.value) } }); rerender(); };
    inputScale.addEventListener('input', onScaleInput); vf.controlTeardowns.add(() => inputScale.removeEventListener('input', onScaleInput)); rowScale.appendChild(inputScale); controlsEl.appendChild(rowScale);

    // Afficher le mot
    controlsEl.appendChild(el('div', { className: 'row' }));
    const rowLabel = el('div', { className: 'row' }); const chkLabel = el('label', { html: `<input type="checkbox" ${vf.showLabel ? 'checked' : ''}/> Afficher le mot` });
    const cb = chkLabel.querySelector('input'); const onShowLabelChange = (e) => { setState({ vf: { ...vf, showLabel: e.target.checked } }); rerender(); };
    cb.addEventListener('change', onShowLabelChange); vf.controlTeardowns.add(() => cb.removeEventListener('change', onShowLabelChange)); rowLabel.appendChild(chkLabel); controlsEl.appendChild(rowLabel);

    buildRound(state); rerender();
  }

  function destroy(state) { const vf = ensureVF(state); vf.gridTeardowns.forEach(fn => fn()); vf.controlTeardowns.forEach(fn => fn()); vf.gridTeardowns.clear(); vf.controlTeardowns.clear(); }
  window.GAME_REGISTRY = window.GAME_REGISTRY || {}; window.GAME_REGISTRY[ID] = { id: ID, name: NAME, mountControls, render, destroy };
})();
