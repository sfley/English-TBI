"use strict";
const $ = (id) => document.getElementById(id);
let cards = [],
  name = "",
  lesson = null;
let revision = 0,
  loadRevision = 0;
function status(text) {
  $("status").textContent = text;
}
function invalidate() {
  revision++;
  $("preview").replaceChildren();
  $("print").disabled = true;
  status("Préparez les pages avec vos nouveaux réglages.");
}
function shuffle(values) {
  const result = values.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    const j = random[0] % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function tile(card) {
  const box = document.createElement("div");
  box.className = "tile";
  const picture = document.createElement("div");
  picture.className = "picture";
  const image = document.createElement("img");
  image.src = card.image;
  image.alt = card.label;
  picture.append(image);
  box.append(picture);
  if ($("show-label").checked) {
    const word = document.createElement("div");
    word.className = "word";
    word.textContent = card.label;
    box.append(word);
  }
  return box;
}
function sheet(number) {
  const page = document.createElement("section");
  page.className = "sheet";
  const header = document.createElement("div");
  header.className = "sheet-header";
  const title = document.createElement("strong");
  title.textContent = name;
  const count = document.createElement("span");
  count.textContent = "Page " + number;
  header.append(title, count);
  page.append(header);
  $("preview").append(page);
  return page;
}
function grid(cols, rows) {
  const g = document.createElement("div");
  g.className = "print-grid";
  g.style.gridTemplateColumns = `repeat(${cols},minmax(0,1fr))`;
  g.style.gridTemplateRows = `repeat(${rows},minmax(0,1fr))`;
  return g;
}
async function generate() {
  const run = ++revision;
  $("print").disabled = true;
  $("preview").replaceChildren();
  if (!cards.length) {
    status("Choisissez un thème.");
    return;
  }
  try {
    if ($("kind").value === "cards") {
      if ($("layout").value === "class") {
        const sets = Number($("sets").value);
        if (!Number.isInteger(sets) || sets < 1 || sets > 40)
          throw Error("Choisissez de 1 à 40 séries.");
        const cols = 6;
        let page,
          used = 0,
          pageNo = 0;
        for (let pupil = 0; pupil < sets; pupil++)
          for (let start = 0; start < cards.length; start += 18) {
            const block = cards.slice(start, start + 18),
              rows = Math.ceil(block.length / cols),
              height = rows * 30;
            if (!page || used + height + 3 > 280) {
              page = sheet(++pageNo);
              page.classList.add("economy");
              used = 0;
            }
            const set = document.createElement("section");
            set.className = "pupil-set";
            set.style.height = height + "mm";
            const title = document.createElement("small");
            title.textContent =
              "Série " +
              (pupil + 1) +
              (cards.length > 18
                ? " · partie " + (Math.floor(start / 18) + 1)
                : "");
            set.append(title);
            const g = grid(cols, rows);
            block.forEach((c) => g.append(tile(c)));
            set.append(g);
            page.append(set);
            used += height + 3;
          }
      } else {
        const n = Number($("per-page").value);
        const cols = n === 2 ? 1 : 2;
        for (let start = 0; start < cards.length; start += n) {
          const page = sheet(start / n + 1);
          const g = grid(cols, n / cols);
          cards.slice(start, start + n).forEach((c) => g.append(tile(c)));
          page.append(g);
        }
      }
    } else if ($("kind").value === "bingo") {
      const [cols, rows] = $("grid-size").value.split(",").map(Number);
      const cells = cols * rows;
      const quantity = Number($("quantity").value);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 30)
        throw Error("Choisissez de 1 à 30 grilles.");
      if (cells > cards.length)
        throw Error(
          `Ce thème contient ${cards.length} cartes : choisissez une grille plus petite.`,
        );
      const seen = new Set();
      let page;
      for (let i = 0; i < quantity; i++) {
        let selected,
          key,
          tries = 0;
        do {
          selected = shuffle(cards).slice(0, cells);
          key = selected.map((c) => c.id).join("|");
          tries++;
        } while (seen.has(key) && tries < 500);
        if (seen.has(key))
          throw Error(
            "Pas assez de combinaisons pour autant de grilles. Diminuez leur nombre.",
          );
        seen.add(key);
        if (i % 2 === 0) {
          page = sheet(Math.floor(i / 2) + 1);
          const boards = document.createElement("div");
          boards.className = "boards";
          page.append(boards);
        }
        const board = document.createElement("section");
        board.className = "board";
        const title = document.createElement("div");
        title.className = "board-title";
        title.textContent = "Loto · Grille " + (i + 1);
        const g = grid(cols, rows);
        selected.forEach((c) => g.append(tile(c)));
        board.append(title, g);
        page.querySelector(".boards").append(board);
      }
    }
    if (!["cards", "bingo"].includes($("kind").value)) generateExtras();
    status("Chargement des images…");
    await Promise.all(
      [...document.querySelectorAll("#preview img")].map((i) => i.decode()),
    );
    if (run !== revision) return;
    $("print").disabled = false;
    status(
      `${document.querySelectorAll(".sheet").length} page(s) prête(s). Papier A4, portrait, échelle 100 %, sans en-têtes ni pieds de page du navigateur.`,
    );
  } catch (e) {
    if (run !== revision) return;
    $("preview").replaceChildren();
    status(e.message);
  }
}
async function loadTheme() {
  const loading = ++loadRevision;
  invalidate();
  cards = [];
  name = "";
  try {
    const response = await fetch(
      new URLSearchParams(location.search).get("lesson")
        ? "/api/curriculum/lessons/" +
            new URLSearchParams(location.search).get("lesson")
        : "/api/themes/" + $("theme").value + "?selection=1",
    );
    if (!response.ok) throw Error("Thème indisponible.");
    const data = await response.json();
    if (loading !== loadRevision) return;
    cards = data.cards;
    name = data.name || data.title;
    lesson = data;
    $("selection-note").textContent =
      cards.length +
      " cartes de la séance · modifiez les cartes dans « Préparer ».";
    await generate();
  } catch (e) {
    status(e.message);
  }
}
$("generate").onclick = generate;
$("print").onclick = () => window.print();
$("theme").onchange = loadTheme;
function settings() {
  invalidate();
  const kind = $("kind").value,
    bingo = kind === "bingo",
    standard = kind === "cards";
  $("cards-settings").hidden = !standard || $("layout").value === "class";
  $("layout-settings").hidden = !standard;
  $("sets-settings").hidden = !standard || $("layout").value !== "class";
  $("bingo-settings").hidden = !bingo;
  $("quantity-settings").hidden = !bingo;
  $("exercise-settings").hidden = kind !== "worksheet";
  $("show-label").closest("label").hidden = ["domino", "fold", "prep"].includes(
    kind,
  );
  const hints = {
    fold: "Impression simple face : découpez les cartes, pliez sur le trait central, puis collez dos à dos.",
    book: "Découpez les petites pages, classez-les par numéro puis agrafez-les pour former le mini-livre.",
    domino:
      "Découpez les dominos. Chaque mot correspond à l’image d’un autre domino : reconstituez la chaîne.",
    worksheet:
      "Pour les exercices d’écoute, l’enseignant choisit les mots à dicter.",
    prep: "La fiche reprend la préparation de la séance et les objectifs de sa séquence.",
  };
  $("support-hint").textContent =
    hints[kind] ||
    "Papier A4 · les cartes retenues pour votre séance sont utilisées.";
}
for (const id of [
  "kind",
  "layout",
  "sets",
  "per-page",
  "grid-size",
  "quantity",
  "show-label",
  "exercise",
])
  $(id).onchange = settings;
(async () => {
  try {
    const response = await fetch("/api/themes");
    if (!response.ok) throw Error("Atelier indisponible.");
    const data = await response.json();
    for (const t of data.themes) {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = t.name;
      $("theme").append(opt);
    }
    const requested = new URLSearchParams(location.search).get("theme");
    if (data.themes.some((t) => t.id === requested))
      $("theme").value = requested;
    await loadTheme();
  } catch (e) {
    status(e.message);
  }
})();

function textElement(tag, text, className = "") {
  const e = document.createElement(tag);
  e.textContent = text;
  if (className) e.className = className;
  return e;
}
function generateExtras() {
  const kind = $("kind").value;
  function paged(items, n, cols, draw) {
    for (let start = 0; start < items.length; start += n) {
      const p = sheet(start / n + 1);
      p.classList.add("support-" + kind);
      const g = grid(cols, Math.ceil(n / cols));
      items
        .slice(start, start + n)
        .forEach((c, i) => g.append(draw(c, start + i)));
      p.append(g);
    }
  }
  if (kind === "domino")
    paged(cards, 10, 2, (c, i) => {
      const d = document.createElement("div");
      d.className = "domino";
      const picture = tile(c);
      picture.querySelector(".word")?.remove();
      d.append(
        picture,
        textElement("div", cards[(i + 1) % cards.length].label, "domino-word"),
      );
      return d;
    });
  if (kind === "fold")
    paged(cards, 8, 2, (c) => {
      const d = document.createElement("div");
      d.className = "fold-card";
      const picture = tile(c);
      picture.querySelector(".word")?.remove();
      d.append(picture, textElement("div", c.label, "fold-word"));
      return d;
    });
  if (kind === "cut") paged(cards, 24, 4, (c) => tile(c));
  if (kind === "teacher") {
    const p = sheet(1);
    p.classList.add("support-teacher");
    if (lesson?.sentence)
      p.append(textElement("p", lesson.sentence, "printed-sentence"));
    const cols = cards.length > 30 ? 6 : cards.length > 12 ? 5 : 4,
      g = grid(cols, Math.ceil(cards.length / cols));
    cards.forEach((c) => g.append(tile(c)));
    p.append(g);
  }
  if (kind === "book") {
    const pages = [null, ...cards];
    paged(pages, 4, 2, (c, i) => {
      const panel = document.createElement("div");
      panel.className = "book-page";
      panel.append(textElement("small", "Page " + (i + 1)));
      if (c) {
        panel.append(tile(c));
        if (lesson?.sentence) panel.append(textElement("p", lesson.sentence));
        panel.append(textElement("p", "________________________________"));
      } else {
        panel.append(
          textElement("h2", name),
          textElement("p", "My English book"),
          textElement("p", "Prénom : ____________________"),
          textElement("p", "Découpe, range les pages par numéro et agrafe."),
        );
      }
      return panel;
    });
  }
  if (kind === "worksheet") {
    const exercise = $("exercise").value,
      per = exercise === "match" ? 6 : 12;
    for (let start = 0; start < cards.length; start += per) {
      const p = sheet(Math.floor(start / per) + 1);
      p.classList.add("support-worksheet");
      p.append(
        textElement(
          "p",
          "Prénom : ____________________   Date : ______________",
        ),
      );
      const instructions = {
        match: "Relie chaque image au mot correspondant.",
        circle: "Écoute et entoure les images demandées.",
        number: "Numérote les images dans l’ordre dicté.",
        write: "Écris le mot sous chaque image.",
      };
      p.append(textElement("p", instructions[exercise]));
      const block = cards.slice(start, start + per),
        g = grid(exercise === "match" ? 2 : 3, exercise === "match" ? 6 : 4);
      if (exercise === "match") {
        const words = shuffle(block);
        block.forEach((c, i) => {
          const t = tile(c);
          t.querySelector(".word")?.remove();
          g.append(t, textElement("div", "●  " + words[i].label, "match-word"));
        });
      } else
        block.forEach((c) => {
          const t = tile(c);
          t.querySelector(".word")?.remove();
          if (exercise === "write")
            t.append(textElement("p", "________________"));
          if (exercise === "number") t.append(textElement("p", "N° ____"));
          g.append(t);
        });
      p.append(g);
    }
  }
  if (kind === "prep") {
    if (!new URLSearchParams(location.search).has("lesson"))
      throw Error(
        "Choisissez une séance depuis l’accueil pour imprimer sa préparation.",
      );
    let page = sheet(1),
      body = document.createElement("div"),
      number = 1;
    body.className = "prep-body";
    page.append(body);
    const add = (title, value) => {
      if (!value) return;
      for (const paragraph of String(value).match(
        /[^\n]{1,700}(?:\s|$)|[^\n]{1,700}/g,
      ) || []) {
        const block = document.createElement("section");
        if (title) block.append(textElement("h3", title));
        block.append(textElement("p", paragraph));
        body.append(block);
        if (body.scrollHeight > body.clientHeight + 1) {
          block.remove();
          page = sheet(++number);
          body = document.createElement("div");
          body.className = "prep-body";
          page.append(body);
          body.append(block);
        }
        title = "";
      }
    };
    const seq = lesson.sequence;
    add("Séquence", seq?.title);
    add("Niveau", seq?.level);
    add("Entrée culturelle", seq?.culture);
    add("Projet final", seq?.final_task);
    add("Activités langagières", seq?.skills?.join(" · "));
    add("Lexique", seq?.lexicon);
    add("Structures", seq?.structures);
    add("Phonologie", seq?.phonology);
    add("Objectif de la séance", lesson.objective);
    add("Phrase modèle", lesson.sentence);
    add("Consigne", lesson.instructions);
    add("Durée", lesson.duration + " minutes");
    add("Cartes", cards.map((c) => c.label).join(", "));
    for (const [i, s] of (lesson.stages || []).entries())
      add(
        `${i + 1}. ${s.title} · ${s.minutes} min`,
        s.instructions || s.resource?.title || s.game || "Activité en classe",
      );
    add("Critères de réussite", lesson.criteria || seq?.criteria);
    for (const r of [...(seq?.resources || []), ...(lesson.resources || [])])
      add(
        "Document : " + r.title,
        r.url.startsWith("/")
          ? "Fichier conservé dans l’application locale."
          : r.url,
      );
    add("Notes", lesson.notes);
  }
}
