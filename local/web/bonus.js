"use strict";
(async () => {
  const U = CurriculumUI,
    $ = (id) => document.getElementById(id),
    stage = $("bonus-stage");
  let sound = null,
    deck = [],
    at = -1,
    revealed = false,
    team = 0,
    scores = [0, 0],
    locked = false,
    tallies = [],
    undo = [],
    lastAnswer = -1000;
  const stop = () => {
    if (sound) {
      sound.pause();
      sound.currentTime = 0;
      sound = null;
    }
    document.querySelectorAll("audio,video").forEach((m) => m.pause());
  };
  window.addEventListener("pagehide", stop);
  try {
    const q = new URLSearchParams(location.search),
      id = q.get("lesson"),
      lesson = await U.api("/api/curriculum/lessons/" + id);
    let game = q.get("game");
    if (!["bingo", "oral", "survey", "teams"].includes(game)) game = "bingo";
    const cards = lesson.cards;
    U.write("last-lesson", id);
    $("return").href = "/lesson.html?id=" + id;
    $("lesson-flow").href = "/run.html?lesson=" + id;
    for (const [value, title] of U.games)
      $("activity").append(U.el("option", title, { value }));
    $("activity").value = game;
    $("activity").onchange = () => {
      stop();
      location.href = U.gameURL(id, $("activity").value);
    };
    const dialog = $("documents-dialog");
    $("documents-button").onclick = () => {
      stop();
      dialog.showModal();
    };
    $("close-documents").onclick = () => dialog.close();
    dialog.addEventListener("close", stop);
    for (const group of [lesson.sequence?.resources || [], lesson.resources])
      U.showResources($("game-documents"), group);
    $("fullscreen").onclick = () => {
      const op = document.fullscreenElement
        ? document.exitFullscreen()
        : document.documentElement.requestFullscreen?.();
      op?.catch(() => {});
    };
    const shuffle = (a) => {
      const out = a.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    };
    function play(c) {
      stop();
      sound = new Audio(c.audio);
      sound.play().catch(() => {
        const m = document.getElementById("game-message");
        if (m)
          m.textContent = "Son indisponible. Vous pouvez prononcer le mot.";
      });
    }
    function button(text, action, primary = false) {
      const b = U.el("button", text, {
        type: "button",
        class: primary ? "primary" : "",
      });
      b.onclick = action;
      return b;
    }
    function picture(c, word = false) {
      const box = U.el("div", null, { class: "bonus-picture" });
      box.append(
        U.el("img", null, {
          src: c.image,
          alt: word ? c.label : "Carte à nommer",
        }),
      );
      if (word) box.append(U.el("strong", c.label));
      return box;
    }
    function header(title) {
      stage.replaceChildren(U.el("h1", title));
      if (lesson.sentence)
        stage.append(U.el("p", lesson.sentence, { class: "sentence-banner" }));
      stage.append(U.el("p", "", { id: "game-message", role: "status" }));
    }
    function reset() {
      stop();
      deck = shuffle(cards);
      at = -1;
      revealed = false;
      team = 0;
      scores = [0, 0];
      locked = false;
      lastAnswer = -1000;
      tallies = cards.map(() => 0);
      undo = [];
      draw();
    }
    function next() {
      if (performance.now() - lastAnswer < 400) return;
      lastAnswer = performance.now();
      stop();
      if (at >= deck.length - 1) return;
      at++;
      revealed = false;
      locked = false;
      draw();
      if (game === "bingo") play(deck[at]);
    }
    function draw() {
      U.write("game:" + id, game);
      history.replaceState(null, "", "?lesson=" + id + "&game=" + game);
      const title = U.games.find(([k]) => k === game)[1];
      header(title);
      if (game === "bingo") {
        stage.append(
          U.el(
            "p",
            "Écoutez le mot et cherchez l’image sur votre grille imprimée.",
          ),
        );
        if (at >= 0) {
          if (revealed) stage.append(picture(deck[at], true));
          else stage.append(U.el("div", "?", { class: "mystery-picture" }));
        }
        const controls = U.el("div", null, { class: "bonus-controls" });
        controls.append(
          button(
            at < 0 ? "Tirer la première carte" : "Carte suivante",
            next,
            true,
          ),
        );
        controls.firstChild.disabled = at >= deck.length - 1;
        if (at >= 0)
          controls.append(
            button("Réécouter", () => play(deck[at])),
            button(revealed ? "Masquer l’image" : "Montrer l’image", () => {
              revealed = !revealed;
              draw();
            }),
          );
        controls.append(
          button("Recommencer", () => {
            if (at < 0 || confirm("Recommencer le tirage du loto ?")) reset();
          }),
        );
        stage.append(
          controls,
          U.el("p", `${at + 1} / ${deck.length} cartes tirées`),
        );
        const history = U.el("details", null);
        history.append(U.el("summary", "Historique des cartes tirées"));
        const list = U.el("div", null, { class: "history-cards" });
        deck.slice(0, at + 1).forEach((c) => list.append(picture(c, true)));
        history.append(list);
        stage.append(history);
        if (at === deck.length - 1)
          stage.append(U.el("p", "Toutes les cartes ont été tirées."));
      }
      if (game === "oral" || game === "teams") {
        if (at < 0) at = 0;
        const c = deck[at];
        if (game === "teams")
          stage.append(
            U.el(
              "p",
              `Équipe 1 : ${scores[0]} · Équipe 2 : ${scores[1]} · Tour de l’équipe ${team + 1}`,
              { class: "team-scores" },
            ),
          );
        stage.append(
          picture(c, revealed),
          U.el(
            "p",
            game === "oral"
              ? "Nomme l’image ou utilise la phrase modèle."
              : "Répondez à l’oral. L’enseignant valide la réponse.",
          ),
        );
        const controls = U.el("div", null, { class: "bonus-controls" });
        controls.append(
          button(revealed ? "Masquer le mot" : "Voir le mot", () => {
            revealed = !revealed;
            draw();
          }),
          button("Écouter", () => play(c)),
        );
        if (game === "oral") {
          controls.append(
            button(
              "Réponse validée →",
              () => {
                if (at < deck.length - 1) next();
                else {
                  $("game-message").textContent = "Défi terminé !";
                }
              },
              true,
            ),
          );
        } else
          for (const [text, points] of [
            ["Réponse validée +1", 1],
            ["Passer", 0],
          ]) {
            const b = button(
              text,
              () => {
                if (locked || performance.now() - lastAnswer < 400) return;
                lastAnswer = performance.now();
                locked = true;
                stop();
                scores[team] += points;
                team = 1 - team;
                if (at < deck.length - 1) {
                  at++;
                  revealed = false;
                  locked = false;
                  draw();
                } else {
                  draw();
                  $("game-message").textContent = "Défi terminé !";
                  stage
                    .querySelectorAll(".validate-team")
                    .forEach((x) => (x.disabled = true));
                }
              },
              points === 1,
            );
            b.classList.add("validate-team");
            b.disabled = locked;
            controls.append(b);
          }
        const restart = button("Recommencer", () => {
          if (confirm("Recommencer ce défi ?")) reset();
        });
        controls.append(restart);
        stage.append(controls, U.el("p", `Carte ${at + 1} sur ${deck.length}`));
      }
      if (game === "survey") {
        stage.append(
          U.el(
            "p",
            "Posez votre question, puis touchez une carte pour compter une réponse. Aucun nom d’élève n’est enregistré.",
          ),
        );
        const grid = U.el("div", null, { class: "survey-grid" }),
          max = Math.max(1, ...tallies);
        cards.forEach((c, i) => {
          const b = button("", () => {
            tallies[i]++;
            undo.push(i);
            draw();
          });
          b.append(
            picture(c, true),
            U.el("strong", String(tallies[i]), { class: "vote-count" }),
          );
          const bar = U.el("div", null, { class: "vote-bar" });
          bar.style.width = (tallies[i] / max) * 100 + "%";
          b.append(bar);
          grid.append(b);
        });
        stage.append(grid);
        const controls = U.el("div", null, { class: "bonus-controls" }),
          cancel = button("Annuler la dernière réponse", () => {
            if (undo.length) {
              tallies[undo.pop()]--;
              draw();
            }
          });
        cancel.disabled = !undo.length;
        controls.append(
          cancel,
          button("Remettre à zéro", () => {
            if (confirm("Effacer les réponses de ce sondage ?")) reset();
          }),
        );
        stage.append(
          U.el("p", tallies.reduce((a, b) => a + b, 0) + " réponses"),
          controls,
        );
      }
    }
    reset();
  } catch (e) {
    stage.replaceChildren(
      U.el("p", e.message, { role: "alert" }),
      U.link("← Accueil", "/"),
    );
  }
})();
