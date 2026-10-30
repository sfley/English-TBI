"use strict";
(async () => {
  const U = CurriculumUI,
    $ = (id) => document.getElementById(id);
  try {
    const id = new URLSearchParams(location.search).get("lesson"),
      data = await U.api("/api/curriculum/lessons/" + id);
    U.write("last-lesson", id);
    $("title").textContent = data.title;
    $("summary").textContent =
      `${data.card_count} cartes · ${data.duration} minutes · ${data.status}`;
    $("objective").textContent = data.objective;
    $("instructions").textContent = data.instructions || "";
    if (data.sentence) {
      $("sentence").hidden = false;
      $("sentence").textContent = data.sentence;
    }
    $("actions").append(
      U.link("← Retour à la séance", "/lesson.html?id=" + id),
      U.link("Imprimer", "/print.html?lesson=" + id),
    );
    for (const [game, title] of U.games)
      $("games").append(U.link(title, U.gameURL(id, game)));
    for (const c of data.cards) {
      const tile = U.el("div", null);
      tile.append(
        U.el("img", null, { src: c.image, alt: c.label }),
        U.el("span", c.label),
      );
      $("cards").append(tile);
    }
    if (data.sequence?.resources.length) {
      $("shared").append(U.el("p", "Commun à la séquence", { class: "hint" }));
      U.showResources($("shared"), data.sequence.resources);
    }
    U.showResources($("resources"), data.resources);
    if (!data.resources.length && !data.sequence?.resources.length)
      $("resources").textContent =
        "Aucun document associé. Ajoutez-en depuis la préparation de la séance.";
    $("success").querySelector("p").textContent =
      data.criteria ||
      data.sequence?.criteria ||
      "À renseigner dans la préparation.";
    const stages = data.stages || [];
    if (stages.length) {
      $("stage-player").hidden = false;
      $("free-games").open = false;
      let at = Math.max(
        0,
        Math.min(stages.length - 1, Math.floor(U.read("stage:" + id, 0))),
      );
      function show() {
        U.stopMedia();
        U.write("stage:" + id, at);
        const s = stages[at];
        $("step-position").textContent =
          `Étape ${at + 1}/${stages.length} · ${s.minutes} min`;
        $("current-stage").replaceChildren(
          U.el("h2", s.title),
          U.el("p", s.instructions || "", { class: "pre-wrap" }),
        );
        if (s.kind === "game")
          $("current-stage").append(
            U.link(
              "Lancer : " +
                (U.games.find(([k]) => k === s.game)?.[1] || "Lancer le jeu"),
              U.gameURL(id, s.game),
            ),
          );
        if (s.kind === "resource")
          U.showResources($("current-stage"), [s.resource]);
        if (s.kind === "offline")
          $("current-stage").append(
            U.el(
              "small",
              "Activité en classe · passez à la suite quand vous êtes prêt.",
            ),
          );
        $("previous").disabled = at === 0;
        $("next").disabled = at === stages.length - 1;
        $("stage-list").replaceChildren();
        stages.forEach((step, i) => {
          const b = U.el("button", i + 1 + ". " + step.title, {
            type: "button",
            "aria-current": i === at ? "step" : "false",
          });
          b.onclick = () => {
            at = i;
            show();
          };
          $("stage-list").append(b);
        });
      }
      $("previous").onclick = () => {
        if (at) {
          at--;
          show();
        }
      };
      $("next").onclick = () => {
        if (at < stages.length - 1) {
          at++;
          show();
        }
      };
      show();
    }
  } catch (e) {
    $("message").textContent = e.message;
  }
})();
