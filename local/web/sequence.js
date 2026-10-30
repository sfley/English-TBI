"use strict";
(async () => {
  const U = CurriculumUI,
    $ = (id) => document.getElementById(id);
  let dirty = false;
  window.addEventListener("beforeunload", (e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  try {
    const id = new URLSearchParams(location.search).get("id"),
      existing = id ? await U.api("/api/curriculum/sequences/" + id) : {};
    const fields = [
      "title",
      "level",
      "objective",
      "notes",
      "status",
      "culture",
      "final_task",
      "lexicon",
      "structures",
      "phonology",
      "criteria",
    ];
    for (const f of fields) if (existing[f]) $(f).value = existing[f];
    for (const skill of [
      "Comprendre à l’oral",
      "Lire et comprendre",
      "Parler en continu",
      "Échanger à l’oral",
      "Écrire",
    ]) {
      const label = U.el("label", null, { class: "inline-check" }),
        cb = U.el("input", null, { type: "checkbox", value: skill });
      cb.checked = existing.skills?.includes(skill) || false;
      label.append(cb, U.el("span", skill));
      $("skills").append(label);
    }
    const themes = (await U.api("/api/themes")).themes,
      resources = U.resources($("resources"), existing.resources || [], themes);
    if (id) {
      $("sequence-lessons").hidden = false;
      const catalog = await U.api("/api/curriculum");
      for (const l of catalog.lessons.filter((l) => l.sequence_id === id)) {
        const row = U.el("div", null, { class: "resource-row" });
        row.append(
          U.link(l.title, "/lesson.html?id=" + l.id),
          U.link("Jouer", U.playURL(l.id)),
          U.link("Imprimer", "/print.html?lesson=" + l.id),
        );
        $("sequence-list").append(row);
      }
      for (const [title, objective] of [
        ["Découvrir", "Découvrir le support culturel et le projet."],
        ["Comprendre", "Écouter et reconnaître les mots et structures."],
        ["S’entraîner", "Réutiliser la langue dans des échanges."],
        ["Réaliser le projet", "Réaliser la tâche finale et faire le bilan."],
      ])
        $("suggestions").append(
          U.link(
            title,
            "/lesson.html?" +
              new URLSearchParams({
                sequence: id,
                title,
                objective,
                model: "1",
              }),
          ),
        );
      $("suggestions").append(
        U.link("Séance libre", "/lesson.html?sequence=" + id),
      );
    }
    $("editor").addEventListener("input", () => (dirty = true));
    $("editor").addEventListener("change", () => (dirty = true));
    $("editor").onsubmit = async (e) => {
      e.preventDefault();
      $("save").disabled = true;
      try {
        const payload = {
          id,
          resources: resources(),
          position: existing.position || 0,
          skills: [...$("skills").querySelectorAll("input:checked")].map(
            (e) => e.value,
          ),
        };
        for (const f of fields) payload[f] = $(f).value;
        const saved = await U.api("/api/curriculum/sequences", payload);
        dirty = false;
        location.href = "/sequence.html?id=" + saved.id + "&saved=1";
      } catch (err) {
        $("message").textContent = err.message;
      } finally {
        $("save").disabled = false;
      }
    };
    $("editor-fields").disabled = false;
    if (new URLSearchParams(location.search).has("saved"))
      $("message").textContent =
        "Séquence enregistrée. Ajoutez ou ouvrez vos séances ci-dessous.";
  } catch (e) {
    $("message").textContent = e.message;
  }
})();
