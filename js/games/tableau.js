
(function () {
  const { el, shuffleInPlace, playAudio } = window.Utils;
  const DEFAULTS = {
    gridCols: 6,
    showLabel: false,
    cardScale: 100
  };

  function mountControls(controlsEl, state, setState, rerender) {
    controlsEl.innerHTML = "";

    // Colonnes
    const rowCols = el("div", { className: "row" });
    const lblCols = el("label", { html: "Colonnes " });
    const inputCols = el("input", {
      attrs: {
        type: "number",
        min: "2",
        max: "8",
        value: String(state.tableau?.gridCols ?? DEFAULTS.gridCols)
      }
    });
    inputCols.style.width = "90px";
    inputCols.addEventListener("change", () => {
      const v = Math.max(2, Math.min(8, Number(inputCols.value) || DEFAULTS.gridCols));
      setState({ tableau: { ...state.tableau, gridCols: v } });
      rerender();
    });
    rowCols.append(lblCols, inputCols);
    controlsEl.appendChild(rowCols);

    // Taille
    const rowScale = el("div", { className: "row" });
    const lblScale = el("label", { html: "Taille " });
    const inputScale = el("input", {
      attrs: { type: "range", min: "60", max: "150", step: "10", value: String(state.tableau?.cardScale ?? DEFAULTS.cardScale) }
    });
    inputScale.addEventListener("input", () => {
      setState({ tableau: { ...state.tableau, cardScale: Number(inputScale.value) } });
      rerender();
    });
    rowScale.append(lblScale, inputScale);
    controlsEl.appendChild(rowScale);

    // Afficher le mot
    const rowOptions = el("div", { className: "row" });
    const chkLabel = el("label", { html: `<input type="checkbox" ${(state.tableau?.showLabel ?? DEFAULTS.showLabel) ? "checked" : ""}/> Afficher le mot` });
    chkLabel.querySelector("input").addEventListener("change", (e) => {
      setState({ tableau: { ...state.tableau, showLabel: e.target.checked } });
      rerender();
    });
    rowOptions.appendChild(chkLabel);
    controlsEl.appendChild(rowOptions);
  }

  function render(stageEl, state) {
    const container = document.getElementById("cardContainer");
    container.innerHTML = "";
    if (!state.tableau) { state.tableau = { ...DEFAULTS }; }
    let cards = (state.cards || []).slice();
    if (!cards.length) return;
    shuffleInPlace(cards);

    const cols = state.tableau.gridCols ?? DEFAULTS.gridCols;
    const grid = el("div", { className: "grid" });
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    grid.style.gap = "12px";
    const scale = (state.tableau.cardScale ?? DEFAULTS.cardScale) / 100;
    const showLabel = state.tableau.showLabel ?? DEFAULTS.showLabel;

    cards.forEach((c) => {
      const tile = el("div", { className: "card", attrs: { tabindex: "0", role: "button" } });
      const frame = el("div", { className: "card-media" });
      frame.style.transform = `scale(${scale})`;
      frame.style.transformOrigin = "center center";
      const img = el("img", { attrs: { src: c.img, alt: c.label || "" } });
      img.loading = 'lazy'; img.decoding = 'async';
      frame.appendChild(img);
      tile.appendChild(frame);
      if (showLabel && c.label) { tile.appendChild(el("div", { className: "tag", text: c.label })); }
      tile.addEventListener("click", () => { if (c.audio) playAudio(c.audio); });
      tile.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (c.audio) playAudio(c.audio); } });
      grid.appendChild(tile);
    });
    container.appendChild(grid);
  }

  window.GAME_REGISTRY = window.GAME_REGISTRY || {};
  window.GAME_REGISTRY["tableau"] = { id: "tableau", name: "Tableau – répétition", mountControls, render };
})();
