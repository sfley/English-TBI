"use strict";
(async () => {
  const U = CurriculumUI,
    $ = (id) => document.getElementById(id);
  try {
    const [bank, catalog] = await Promise.all([
      U.api("/api/documents"),
      U.api("/api/curriculum"),
    ]);
    const names = [...new Set(bank.documents.flatMap((d) => d.themes))].sort();
    names.forEach((n) => $("theme").append(U.el("option", n, { value: n })));
    const saved = U.read("documents-filter", {});
    for (const f of ["search", "kind", "theme"])
      if (saved[f]) $(f).value = saved[f];
    function draw() {
      U.stopMedia();
      $("documents").replaceChildren();
      const filter = {
        search: $("search").value,
        kind: $("kind").value,
        theme: $("theme").value,
      };
      U.write("documents-filter", filter);
      let count = 0;
      for (const d of bank.documents) {
        if (
          (filter.kind && d.kind !== filter.kind) ||
          (filter.theme && !d.themes.includes(filter.theme)) ||
          (d.title + " " + d.uses.map((u) => u.title).join(" "))
            .toLocaleLowerCase("fr")
            .indexOf(filter.search.toLocaleLowerCase("fr")) < 0
        )
          continue;
        count++;
        const card = U.el("section", null, { class: "editor" });
        U.showResources(card, [d]);
        const uses = U.el("p", null, { class: "hint" });
        uses.append("Utilisé dans : ");
        for (const use of d.uses)
          uses.append(U.el("a", use.title, { href: use.href }), " ");
        card.append(uses);
        const details = U.el("details", null);
        details.append(U.el("summary", "Associer à une séance"));
        const select = U.el("select", null, {
          "aria-label": "Séance pour " + d.title,
        });
        for (const l of catalog.lessons)
          select.append(U.el("option", l.title, { value: l.id }));
        const add = U.el("button", "Associer", { type: "button" });
        add.disabled = !catalog.lessons.length;
        add.onclick = async () => {
          add.disabled = true;
          try {
            await U.api("/api/curriculum/attach", {
              lesson_id: select.value,
              resource: d,
            });
            $("message").textContent = "Document ajouté à la séance.";
          } catch (e) {
            $("message").textContent = e.message;
          } finally {
            add.disabled = false;
          }
        };
        details.append(select, add);
        card.append(details);
        $("documents").append(card);
      }
      if (!count)
        $("documents").append(
          U.el(
            "p",
            bank.documents.length
              ? "Aucun document ne correspond aux filtres."
              : "Ajoutez votre première chanson, vidéo ou fiche depuis une séance.",
          ),
        );
    }
    for (const f of ["search", "kind", "theme"])
      $(f).addEventListener(f === "search" ? "input" : "change", draw);
    draw();
    if (bank.warnings.length)
      $("message").textContent = bank.warnings.join("\n");
  } catch (e) {
    $("message").textContent = e.message;
  }
})();
