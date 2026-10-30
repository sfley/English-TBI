"use strict";
(async () => {
  const U = CurriculumUI,
    $ = (id) => document.getElementById(id);
  try {
    const data = await U.api("/api/curriculum"),
      wanted = new URLSearchParams(location.search).get("sequence"),
      host = $("content");
    const error = (e) => ($("message").textContent = e.message);
    function more(label) {
      const d = U.el("details", null, { class: "more-actions" });
      d.append(
        U.el("summary", "⋯", { "aria-label": "Autres actions " + label }),
        U.el("div", null, { class: "more-panel" }),
      );
      return d;
    }
    function del(kind, item) {
      const b = U.el("button", "Supprimer", {
        type: "button",
        class: "danger",
        "aria-label": "Supprimer " + item.title,
      });
      b.onclick = async () => {
        const question =
          kind === "sequences"
            ? `Supprimer la séquence « ${item.title} » ? Ses séances seront conservées comme séances indépendantes, avec leurs documents.`
            : `Supprimer la séance « ${item.title} » ?`;
        if (!confirm(question)) return;
        b.disabled = true;
        try {
          await U.api("/api/curriculum/delete", { kind, id: item.id });
          location.reload();
        } catch (e) {
          b.disabled = false;
          error(e);
        }
      };
      return b;
    }
    function lesson(l) {
      const row = U.el("article", null, { class: "lesson-card" }),
        info = U.el("div", null, { class: "lesson-info" }),
        title = U.el("h3", null);
      title.append(U.el("a", l.title, { href: "/lesson.html?id=" + l.id }));
      info.append(
        title,
        U.el(
          "small",
          `${l.card_count} cartes · ${l.duration} min · ${l.status}`,
        ),
      );
      const actions = U.el("div", null, { class: "row-actions" }),
        play = U.link("Jouer", U.playURL(l.id));
      play.classList.add("primary");
      actions.append(
        U.link("Préparer", "/lesson.html?id=" + l.id),
        play,
        U.link("Imprimer", "/print.html?lesson=" + l.id),
      );
      const menu = more(l.title),
        dup = U.el("button", "Dupliquer", { type: "button" });
      dup.onclick = async () => {
        try {
          const copy = await U.api("/api/curriculum/duplicate", { id: l.id });
          location.href = "/lesson.html?id=" + copy.id;
        } catch (e) {
          error(e);
        }
      };
      menu
        .querySelector(".more-panel")
        .append(
          U.link("Déroulé de la séance", "/run.html?lesson=" + l.id),
          dup,
          del("lessons", l),
        );
      const group = data.lessons.filter((x) => x.sequence_id === l.sequence_id),
        at = group.findIndex((x) => x.id === l.id);
      for (const [label, delta] of [
        ["↑ Monter", -1],
        ["↓ Descendre", 1],
      ]) {
        const b = U.el("button", label, {
          type: "button",
          "aria-label": (delta < 0 ? "Monter " : "Descendre ") + l.title,
        });
        b.disabled = at + delta < 0 || at + delta >= group.length;
        b.onclick = async () => {
          try {
            const ids = group.map((x) => x.id);
            [ids[at], ids[at + delta]] = [ids[at + delta], ids[at]];
            await U.api("/api/curriculum/reorder", {
              sequence_id: l.sequence_id,
              ids,
            });
            location.reload();
          } catch (e) {
            error(e);
          }
        };
        menu.querySelector(".more-panel").append(b);
      }
      actions.append(menu);
      row.append(info, actions);
      return row;
    }
    function draw() {
      host.replaceChildren();
      const term = $("search").value.trim().toLocaleLowerCase("fr");
      let count = 0;
      for (const seq of data.sequences.filter(
        (s) => !wanted || s.id === wanted,
      )) {
        const children = data.lessons.filter(
          (l) =>
            l.sequence_id === seq.id &&
            (!term ||
              (seq.title + " " + l.title + " " + l.objective)
                .toLocaleLowerCase("fr")
                .includes(term)),
        );
        if (
          term &&
          !children.length &&
          !seq.title.toLocaleLowerCase("fr").includes(term)
        )
          continue;
        const section = U.el("section", null, { class: "sequence-card" }),
          head = U.el("div", null, { class: "section-title" }),
          title = U.el("h2", null);
        title.append(
          U.el("a", seq.title, { href: "/sequence.html?id=" + seq.id }),
        );
        head.append(
          title,
          U.el("small", (seq.level || "Tous niveaux") + " · " + seq.status),
        );
        const menu = more(seq.title);
        menu
          .querySelector(".more-panel")
          .append(
            U.link("Préparer la séquence", "/sequence.html?id=" + seq.id),
            del("sequences", seq),
          );
        head.append(menu);
        section.append(head);
        if (seq.final_task)
          section.append(
            U.el("p", "Projet : " + seq.final_task, { class: "hint" }),
          );
        const list = U.el("div", null, { class: "lesson-list" });
        children.forEach((l) => {
          list.append(lesson(l));
          count++;
        });
        if (!children.length)
          list.append(U.el("p", "Ajoutez votre première séance."));
        section.append(
          list,
          U.link("＋ Ajouter une séance", "/lesson.html?sequence=" + seq.id),
        );
        host.append(section);
      }
      if (!wanted) {
        const section = U.el("section", null, { class: "sequence-card" }),
          list = U.el("div", null, { class: "lesson-list" });
        section.append(U.el("h2", "Séances indépendantes"));
        data.lessons
          .filter(
            (l) =>
              !l.sequence_id &&
              (!term ||
                (l.title + " " + l.objective)
                  .toLocaleLowerCase("fr")
                  .includes(term)),
          )
          .forEach((l) => {
            list.append(lesson(l));
            count++;
          });
        section.append(list);
        if (!list.childElementCount)
          section.append(
            U.el(
              "p",
              term
                ? "Aucune séance correspondante."
                : "Un rituel, une révision ? Créez une séance indépendante.",
            ),
          );
        host.append(section);
      }
      if (term && !count)
        host.prepend(U.el("p", "Aucune séance trouvée. Essayez un autre mot."));
    }
    $("search").value = U.read("home-search", "");
    $("search").oninput = () => {
      U.write("home-search", $("search").value);
      draw();
    };
    draw();
    const last = U.read("last-lesson"),
      recent = data.lessons.find((l) => l.id === last);
    if (recent) {
      const bar = U.el("div", null, { class: "resume-bar" });
      bar.append(
        U.el("span", "Dernière séance : " + recent.title),
        U.link("Reprendre", U.playURL(recent.id)),
      );
      $("resume").append(bar);
    }
    if (wanted && !data.sequences.some((s) => s.id === wanted))
      throw Error("Séquence introuvable. Revenez à l’accueil.");
    $("message").textContent = data.warnings.join("\n");
    const choose = new URLSearchParams(location.search).get("choose");
    if (choose && !data.warnings.length)
      $("message").textContent =
        "Choisissez une séance puis cliquez sur " +
        (choose === "print" ? "Imprimer." : "Jouer.");
    document.addEventListener("click", (e) =>
      document.querySelectorAll(".more-actions[open]").forEach((d) => {
        if (!d.contains(e.target)) d.open = false;
      }),
    );
    const previous = U.read("backup-date");
    if (previous)
      $("backup-state").textContent =
        "Dernière sauvegarde téléchargée : " +
        new Date(previous).toLocaleString("fr-FR");
    $("backup").onclick = async (e) => {
      e.preventDefault();
      const a = e.currentTarget;
      if (a.dataset.busy) return;
      a.dataset.busy = "1";
      a.textContent = "Sauvegarde en cours…";
      try {
        const r = await fetch("/api/backup");
        if (!r.ok) throw Error("Sauvegarde impossible.");
        const blob = await r.blob(),
          url = URL.createObjectURL(blob),
          download = U.el("a", "", {
            href: url,
            download:
              /filename="([^"]+)"/.exec(
                r.headers.get("Content-Disposition"),
              )?.[1] || "english-tbi-sauvegarde.zip",
          });
        document.body.append(download);
        download.click();
        download.remove();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
        U.write("backup-date", new Date().toISOString());
        $("backup-state").textContent =
          "Sauvegarde téléchargée. Conservez le ZIP dans un endroit sûr.";
      } catch (e) {
        error(e);
      } finally {
        delete a.dataset.busy;
        a.textContent = "Sauvegarder tout";
      }
    };
    let restore = true;
    window.addEventListener("pagehide", () => U.write("home-scroll", scrollY));
    window.addEventListener("pageshow", () => {
      if (restore) {
        scrollTo(0, U.read("home-scroll", 0));
        restore = false;
      }
    });
    requestAnimationFrame(() => scrollTo(0, U.read("home-scroll", 0)));
  } catch (e) {
    $("message").textContent = e.message;
  }
})();
