"use strict";
(async () => {
  const U = CurriculumUI,
    $ = (id) => document.getElementById(id);
  let dirty = false;
  const sources = [];
  window.addEventListener("beforeunload", (e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  try {
    const query = new URLSearchParams(location.search);
    const id = query.get("id");
    const existing = id ? await U.api("/api/curriculum/lessons/" + id) : {};
    const catalog = await U.api("/api/curriculum");
    const themes = (await U.api("/api/themes")).themes;
    for (const seq of catalog.sequences)
      $("sequence").append(U.el("option", seq.title, { value: seq.id }));
    $("sequence").value = existing.sequence_id || query.get("sequence") || "";
    for (const f of [
      "title",
      "duration",
      "status",
      "objective",
      "instructions",
      "notes",
      "position",
      "sentence",
      "criteria",
    ])
      if (existing[f] !== undefined) $(f).value = existing[f];
    if (!id && $("sequence").value)
      $("position").value =
        catalog.lessons.filter((l) => l.sequence_id === $("sequence").value)
          .length + 1;
    if (!id) {
      for (const f of ["title", "objective"])
        if (query.has(f)) $(f).value = query.get(f);
    }
    let sequence = catalog.sequences.find((s) => s.id === $("sequence").value);
    if (!existing.sentence && sequence?.structures)
      $("sentence").value = sequence.structures;
    if (id) {
      $("page-title").textContent = existing.title;
      $("lesson-shortcuts").append(
        U.link("Jouer", U.playURL(id)),
        U.link("Imprimer", "/print.html?lesson=" + id),
        U.link("Déroulé", "/run.html?lesson=" + id),
      );
    }
    if (sequence) {
      $("back").href = "/?sequence=" + sequence.id;
      $("back").textContent = "← Retour à " + sequence.title;
    }
    for (const theme of themes)
      $("bank").append(U.el("option", theme.name, { value: theme.id }));
    function updateCount() {
      $("count").textContent =
        "Cartes sélectionnées : " +
        sources.reduce((n, s) => n + s.selected.size, 0) +
        " sur " +
        sources.reduce((n, s) => n + s.total, 0) +
        " · 2 à 60 par séance";
    }
    async function addTheme(tid, selected) {
      if (sources.some((s) => s.theme_id === tid)) return;
      const bank = await U.api("/api/themes/" + tid);
      if (sources.some((s) => s.theme_id === tid)) return;
      const group = {
        theme_id: tid,
        total: bank.cards.length,
        selected: new Set(selected || bank.cards.map((c) => c.file || c.id)),
      };
      sources.push(group);
      const box = U.el("section", null, { class: "source-group" });
      box.append(U.el("h3", bank.name));
      const actions = U.el("div", null, { class: "lesson-actions" });
      const number = U.el("input", null, {
        type: "number",
        min: "2",
        max: String(bank.cards.length),
        value: String(Math.min(6, bank.cards.length)),
        "aria-label": "Nombre de cartes " + bank.name,
      });
      const choose = U.el("button", "Choisir ce nombre", { type: "button" }),
        all = U.el("button", "Toutes", { type: "button" }),
        remove = U.el("button", "Retirer ce thème", { type: "button" });
      actions.append(number, choose, all, remove);
      box.append(actions);
      const choices = U.el("div", null, { class: "choices" });
      const available = new Map(bank.cards.map((c) => [c.file || c.id, c]));
      for (const key of group.selected)
        if (!available.has(key))
          available.set(key, {
            label: "Carte retirée du thème : " + key,
            missing: true,
          });
      for (const [key, c] of available) {
        const label = U.el("label", null);
        const cb = U.el("input", null, { type: "checkbox", value: key });
        cb.checked = group.selected.has(key);
        cb.onchange = () => {
          if (cb.checked) group.selected.add(key);
          else group.selected.delete(key);
          dirty = true;
          updateCount();
        };
        label.append(cb);
        if (c.image) label.append(U.el("img", null, { src: c.image, alt: "" }));
        label.append(U.el("span", c.label));
        if (c.missing)
          label.append(
            U.el(
              "small",
              "Conservée dans la séance enregistrée. Décochez-la pour la remplacer.",
            ),
          );
        choices.append(label);
      }
      box.append(choices);
      $("sources").append(box);
      choose.onclick = () => {
        const n = Number(number.value);
        if (!Number.isInteger(n) || n < 2 || n > bank.cards.length) {
          $("message").textContent = "Nombre de cartes invalide.";
          return;
        }
        const keys = [...bank.cards.map((c) => c.file || c.id)];
        for (let i = keys.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [keys[i], keys[j]] = [keys[j], keys[i]];
        }
        group.selected = new Set(keys.slice(0, n));
        choices
          .querySelectorAll("input")
          .forEach((e) => (e.checked = group.selected.has(e.value)));
        dirty = true;
        updateCount();
      };
      all.onclick = () => {
        group.selected = new Set(bank.cards.map((c) => c.file || c.id));
        choices
          .querySelectorAll("input")
          .forEach((e) => (e.checked = group.selected.has(e.value)));
        dirty = true;
        updateCount();
      };
      remove.onclick = () => {
        sources.splice(sources.indexOf(group), 1);
        box.remove();
        dirty = true;
        updateCount();
      };
      updateCount();
    }
    if (existing.sources)
      for (const source of existing.sources)
        await addTheme(source.theme_id, source.cards);
    else if (query.get("theme")) await addTheme(query.get("theme"));
    $("add-theme").onclick = async () => {
      $("add-theme").disabled = true;
      try {
        await addTheme($("bank").value);
        dirty = true;
      } catch (e) {
        $("message").textContent = e.message;
      } finally {
        $("add-theme").disabled = false;
      }
    };
    const resources = U.resources(
      $("resources"),
      existing.resources || [],
      themes,
    );
    U.showResources($("shared-resources"), sequence?.resources || []);
    if (sequence?.resources.length)
      $("shared-resources").prepend(
        U.el("p", "Commun à la séquence", { class: "hint" }),
      );
    U.showResources($("resource-preview"), existing.resources || []);
    $("resources").addEventListener("change", () => {
      $("resource-preview").replaceChildren();
      U.showResources($("resource-preview"), resources());
    });
    $("sequence").addEventListener("change", () => {
      sequence = catalog.sequences.find((s) => s.id === $("sequence").value);
      U.stopMedia();
      $("shared-resources").replaceChildren();
      U.showResources($("shared-resources"), sequence?.resources || []);
      if (sequence?.resources.length)
        $("shared-resources").prepend(
          U.el("p", "Commun à la séquence", { class: "hint" }),
        );
      $("back").href = sequence ? "/?sequence=" + sequence.id : "/";
      $("back").textContent = sequence
        ? "← Retour à " + sequence.title
        : "← Accueil";
      if (!$("sentence").value && sequence?.structures)
        $("sentence").value = sequence.structures;
    });
    const stages = U.stages(
      $("stages"),
      existing.stages ||
        (query.has("model")
          ? ["Rituel", "Découverte", "Entraînement", "Bilan"].map((title) => ({
              title,
              minutes: 5,
              kind: "offline",
              instructions: "",
            }))
          : []),
      () => [...(sequence?.resources || []), ...resources()],
    );
    $("editor").addEventListener("input", () => (dirty = true));
    $("editor").addEventListener("change", () => (dirty = true));
    let saving = false;
    $("editor").onsubmit = async (e) => {
      e.preventDefault();
      if (saving) return;
      saving = true;
      $("save").disabled = true;
      $("save-play").disabled = true;
      try {
        const payload = {
          id,
          sequence_id: $("sequence").value || null,
          position: Number($("position").value),
          duration: Number($("duration").value),
          sources: sources.map((s) => ({
            theme_id: s.theme_id,
            cards: [...s.selected],
          })),
          resources: resources(),
          refresh: $("refresh").checked,
          stages: stages(),
          sentence: $("sentence").value,
          criteria: $("criteria").value,
        };
        for (const f of [
          "title",
          "status",
          "objective",
          "instructions",
          "notes",
        ])
          payload[f] = $(f).value;
        const result = await U.api("/api/curriculum/lessons", payload);
        dirty = false;
        U.write("last-lesson", result.id);
        const next = e.submitter?.value;
        location.href =
          next === "play"
            ? U.playURL(result.id)
            : next === "run"
              ? "/run.html?lesson=" + result.id
              : "/lesson.html?id=" + result.id + "&saved=1";
      } catch (err) {
        $("message").textContent = err.message;
      } finally {
        saving = false;
        $("save").disabled = false;
        $("save-play").disabled = false;
      }
    };
    $("editor-fields").disabled = false;
    updateCount();
    if (query.has("saved")) $("message").textContent = "Séance enregistrée.";
  } catch (e) {
    $("message").textContent = e.message;
  }
})();
