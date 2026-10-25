
(function () {
  const { el, requestFullscreen } = window.Utils;
  const requestedGame = window.BOOT_GAME || new URLSearchParams(location.search).get('game');
  const bootGame = Object.hasOwn(window.GAME_REGISTRY, requestedGame) ? requestedGame : 'tableau';
  let persisted = {};
  try {
    const value = JSON.parse(localStorage.getItem('ui_prefs') || '{}');
    if (value && typeof value === 'object' && !Array.isArray(value)) persisted = value;
  } catch { /* Storage may be corrupt or blocked; use session defaults. */ }

  // ---- UI labels (English titles only, NO icons)
  const GAME_UI = {
    tableau: { name: 'Visual Board' },
    listen:  { name: 'Listen' },
    mask:    { name: "What's Hidden?" },
    pairs:   { name: 'Memory Match' },
    order:   { name: 'Sequence' },
    missing: { name: "What's Missing?" },
    vf:      { name: 'True or False' }
  };

  const state = {
    currentGameId: bootGame,
    setKey: Object.hasOwn(window.CARD_SETS, new URLSearchParams(location.search).get('theme'))
      ? new URLSearchParams(location.search).get('theme')
      : (window.DEFAULT_CONFIG && window.DEFAULT_CONFIG.set) || Object.keys(window.CARD_SETS)[0],
    cards: [], index: 0,
    showLabel: window.DEFAULT_CONFIG?.showLabel ?? false,
    sound: window.DEFAULT_CONFIG?.sound ?? false,
    autoplay: window.DEFAULT_CONFIG?.autoplay ?? false,
    autoplayMs: window.DEFAULT_CONFIG?.autoplayMs ?? 3000,
    shuffle: window.DEFAULT_CONFIG?.shuffle ?? false,
    _autoTimer: null,
    // Display prefs
    tbi: persisted.tbi === true,
    highContrast: persisted.highContrast === true,
    setState(patch, reloadCards = false) {
      const prevSet = state.setKey;
      for (const [key, value] of Object.entries(patch)) {
        if (Object.hasOwn(window.GAME_REGISTRY, key) && state[key] && value) Object.assign(state[key], value);
        else state[key] = value;
      }
      if (reloadCards) { loadCards(); state.index = 0; state.memory = null; }
      if (patch.setKey !== undefined && patch.setKey !== prevSet) { renderGlobalTheme(); }
      persistPrefs();
    }
  };

  function persistPrefs() {
    try { localStorage.setItem('ui_prefs', JSON.stringify({ tbi: state.tbi, highContrast: state.highContrast })); } catch {}
  }
  function applyDisplayClasses() {
    document.body.classList.toggle('tbi', !!state.tbi);
    document.body.classList.toggle('high-contrast', !!state.highContrast);
  }
  function loadCards() {
    const base = (window.CARD_SETS[state.setKey] || []).slice();
    if (state.shuffle) { window.Utils.shuffleInPlace(base); }
    state.cards = base;
  }

  // Ensure a divider sits right after the Theme section
  function ensureAfterThemeDivider() {
    const theme = document.getElementById('globalTheme');
    let hr = document.getElementById('afterThemeDivider');
    if (!hr) { hr = document.createElement('hr'); hr.id = 'afterThemeDivider'; hr.className = 'divider'; }
    if (theme && theme.nextElementSibling !== hr) {
      theme.insertAdjacentElement('afterend', hr);
    }
  }

  function renderGlobalTheme() {
    let host = document.getElementById('globalTheme');
    if (!host) {
      const sidebar = document.querySelector('.sidebar');
      host = el('section', { attrs: { id: 'globalTheme' }, className: 'controls' });
      const navGames = document.querySelector('.games');
      sidebar.insertBefore(host, navGames);
    }
    host.innerHTML = '';

    const row = el('div', { className: 'row' });
    row.appendChild(el('span', { className: 'tag', text: 'Theme' }));

    const select = el('select', { className: 'block', attrs: { 'aria-label': 'Global theme selection' } });
    const sets = window.CARD_SETS || {};
    Object.keys(sets).forEach(key => {
      const opt = el('option', { text: window.THEME_NAMES?.[key] || key, attrs: { value: key } });
      if (key === state.setKey) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener('change', () => {
      destroyCurrentGame();
      state.setState({ setKey: select.value }, true);
      mountControls();
      render();
    });

    host.appendChild(row);
    host.appendChild(select);
    if (window.THEME_IDS?.[state.setKey]) {
      const tid = window.THEME_IDS[state.setKey];
      host.appendChild(el('a', {text:'Préparer la séance · '+state.cards.length+' cartes', attrs:{href:'/session.html?theme='+tid},className:'local-link'}));
      host.appendChild(el('a', {text:'Imprimer cette sélection',attrs:{href:'/print.html?theme='+tid},className:'local-link'}));
    }

    ensureAfterThemeDivider();
  }

  function gameButtonLabel(game) {
    const conf = GAME_UI[game.id] || { name: game.name || game.id };
    return conf.name;
  }

  function buildGameList() {
    const ul = document.getElementById('gameList');
    ul.innerHTML = '';
    Object.values(window.GAME_REGISTRY).forEach((game) => {
      const li = el('li');
      const btn = el('button', { text: gameButtonLabel(game), attrs: { 'aria-pressed': String(state.currentGameId === game.id) } });
      if (state.currentGameId === game.id) btn.classList.add('active');
      btn.addEventListener('click', () => { switchGame(game.id); });
      li.appendChild(btn);
      ul.appendChild(li);
    });
  }

  function destroyCurrentGame() {
    window.Utils.cancelGameWork();
    const game = window.GAME_REGISTRY[state.currentGameId];
    if (game?.destroy) game.destroy(state);
    // Keep display settings; mounting rebuilds each game's round from current cards.
    for (const key of ['listen', 'mask', 'pairs', 'order', 'missing']) {
      if (state[key]) { state[key].locked = false; state[key].inputLocked = false; }
    }
  }

  function switchGame(gameId) {
    if (state.currentGameId === gameId) return;
    if (!Object.hasOwn(window.GAME_REGISTRY, gameId)) return;
    destroyCurrentGame();
    state.currentGameId = gameId;
    state.index = 0; state.memory = null;
    buildGameList(); mountControls(); render();
  }

  function mountControls() {
    const wrap = document.getElementById('controls');
    const game = window.GAME_REGISTRY[state.currentGameId];
    wrap.innerHTML = '';
    game.mountControls(wrap, state, state.setState, render);
    window.dispatchEvent(new Event('localcontrols'));
  }

  function renderDisplayControls() {
    const wrap = document.querySelector('.global-controls');
    if (!wrap) return;
    wrap.innerHTML = '';

    // Row 1: toggles
    const row1 = el('div', { className: 'row' });

    const tbiLabel = el('label');
    const tbiCb = el('input', { attrs: { type: 'checkbox', id: 'toggleTBI' } });
    tbiCb.checked = !!state.tbi;
    tbiCb.addEventListener('change', () => { state.setState({ tbi: tbiCb.checked }); applyDisplayClasses(); });
    tbiLabel.appendChild(tbiCb);
    tbiLabel.appendChild(document.createTextNode(' TBI mode'));

    const hcLabel = el('label');
    const hcCb = el('input', { attrs: { type: 'checkbox', id: 'toggleHC' } });
    hcCb.checked = !!state.highContrast;
    hcCb.addEventListener('change', () => { state.setState({ highContrast: hcCb.checked }); applyDisplayClasses(); });
    hcLabel.appendChild(hcCb);
    hcLabel.appendChild(document.createTextNode(' High contrast'));

    row1.appendChild(tbiLabel);
    row1.appendChild(hcLabel);

    // Row 2: fullscreen
    const row2 = el('div', { className: 'row' });
    const btnFS = el('button', { className: 'btn block', text: 'Fullscreen', attrs: { id: 'btnFullscreen' } });
    btnFS.addEventListener('click', () => requestFullscreen());
    row2.appendChild(btnFS);

    wrap.appendChild(row1);
    wrap.appendChild(row2);
  }

  function render() {
    const game = window.GAME_REGISTRY[state.currentGameId];
    game.render(document.getElementById('stage'), state);

    window.dispatchEvent(new Event('localrender'));
    // Sync active state
    document.querySelectorAll('#gameList button').forEach(b => {
      const isActive = b.textContent === (GAME_UI[state.currentGameId]?.name || game.name || state.currentGameId);
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-pressed', String(isActive));
    });
  }

  function wireGlobals() {
    window.addEventListener('keydown', (e) => {
      if (state.currentGameId === 'flip' && state.cards.length) {
        if (e.key === 'ArrowRight') { state.setState({ index: (state.index + 1) % state.cards.length }); render(); }
        if (e.key === 'ArrowLeft') { state.setState({ index: (state.index - 1 + state.cards.length) % state.cards.length }); render(); }
      }
      if (e.defaultPrevented || /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
      const k = e.key?.toLowerCase?.();
      if (k === 'f') requestFullscreen();
      if (k === 'g') { const sel = document.querySelector('#globalTheme select'); if (sel) sel.focus(); }
      if (k === 'h') { state.setState({ highContrast: !state.highContrast }); applyDisplayClasses(); const hc = document.getElementById('toggleHC'); if (hc) hc.checked = state.highContrast; }
      if (k === 't') { state.setState({ tbi: !state.tbi }); applyDisplayClasses(); const tbi = document.getElementById('toggleTBI'); if (tbi) tbi.checked = state.tbi; }
    });
  }

  function init() {
    loadCards();
    renderGlobalTheme();
    buildGameList();
    mountControls();
    applyDisplayClasses();
    renderDisplayControls();
    render();
    wireGlobals();
    window.addEventListener('restartgame', () => { destroyCurrentGame(); mountControls(); render(); });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
