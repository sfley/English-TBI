"use strict";
(async () => {
  const isGame = location.pathname.startsWith("/app/"),
    isBonus = location.pathname === "/bonus.html",
    isPrint = location.pathname === "/print.html",
    query = new URLSearchParams(location.search);
  const read = (key, fallback = null) => {
      try {
        return (
          JSON.parse(localStorage.getItem("english-tbi:" + key)) ?? fallback
        );
      } catch {
        return fallback;
      }
    },
    write = (key, value) => {
      try {
        localStorage.setItem("english-tbi:" + key, JSON.stringify(value));
      } catch {}
    };
  const gameURL = (id, game = "tableau") =>
    (["bingo", "oral", "survey", "teams"].includes(game)
      ? "/bonus.html?"
      : "/app/?") +
    "lesson=" +
    id +
    "&game=" +
    game;
  const lessonId =
    query.get("lesson") ||
    (location.pathname === "/lesson.html" ? query.get("id") : null);
  const [lesson, themeData] = await Promise.all([
    lessonId
      ? fetch("/api/curriculum/lessons/" + lessonId)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      : null,
    fetch("/api/themes")
      .then((r) => r.json())
      .catch(() => ({ themes: [] })),
  ]);
  const themes = themeData.themes || [];
  let active =
    themes.find(
      (t) => t.id === query.get("theme") || t.key === query.get("theme"),
    ) || themes[0];
  const nav = document.createElement("header");
  nav.id = "app-navigation";
  const brand = document.createElement("a");
  brand.className = "app-brand";
  brand.href = "/";
  brand.textContent = "ENGLISH TBI";
  const modules = document.createElement("nav");
  modules.setAttribute("aria-label", "Navigation principale");
  const links = {};
  for (const [id, title, href] of [
    ["home", "Accueil", "/"],
    ["prepare", "Préparer", "/prepare.html"],
    ["play", "Jouer", "/?choose=play"],
    ["print", "Imprimer", "/?choose=print"],
  ]) {
    const a = document.createElement("a");
    a.textContent = title;
    a.href = href;
    a.dataset.module = id;
    const current =
      isGame || isBonus || location.pathname === "/run.html"
        ? "play"
        : isPrint
          ? "print"
          : ["/", "/index.html", "/home.html"].includes(location.pathname)
            ? "home"
            : "prepare";
    if (id === current) a.setAttribute("aria-current", "page");
    links[id] = a;
    modules.append(a);
  }
  const label = document.createElement("label");
  label.textContent = "Thème ";
  const select = document.createElement("select");
  select.id = "navigation-theme";
  themes.forEach((t) => {
    const o = document.createElement("option");
    o.value = t.id;
    o.textContent = t.name;
    select.append(o);
  });
  label.append(select);
  const count = document.createElement("small");
  count.id = "navigation-count";
  nav.append(brand, modules, label, count);
  document.body.prepend(nav);
  function update(t) {
    active = t;
    select.value = t.id;
    try {
      sessionStorage.setItem("active-theme", t.id);
    } catch {}
    links.prepare.href = "/lesson.html?theme=" + t.id;
    links.play.href = "/app/?theme=" + encodeURIComponent(t.key);
    links.print.href = "/print.html?theme=" + t.id;
  }
  const freeTheme =
    !lesson &&
    (isGame ||
      isPrint ||
      location.pathname === "/themes.html" ||
      location.pathname === "/session.html");
  label.hidden = !freeTheme;
  count.hidden = true;
  if (freeTheme && active) update(active);
  if (lesson) {
    write("last-lesson", lesson.id);
    const game = query.get("game");
    if (
      (isGame || isBonus) &&
      game &&
      [
        "tableau",
        "listen",
        "mask",
        "pairs",
        "order",
        "missing",
        "vf",
        "bingo",
        "oral",
        "survey",
        "teams",
      ].includes(game)
    )
      write("game:" + lesson.id, game);
    links.prepare.href = "/lesson.html?id=" + lesson.id;
    links.play.href = gameURL(lesson.id, read("game:" + lesson.id, "tableau"));
    links.print.href = "/print.html?lesson=" + lesson.id;
    label.hidden = true;
    if (!isGame && !isBonus) {
      const crumb = document.createElement("nav");
      crumb.className = "breadcrumbs";
      crumb.setAttribute("aria-label", "Fil d’Ariane");
      const home = document.createElement("a");
      home.href = "/";
      home.textContent = "Accueil";
      crumb.append(home, " › ");
      if (lesson.sequence) {
        const seq = document.createElement("a");
        seq.href = "/sequence.html?id=" + lesson.sequence.id;
        seq.textContent = lesson.sequence.title;
        crumb.append(seq, " › ");
      }
      crumb.append(lesson.title);
      nav.after(crumb);
    }
  }
  if (
    !lesson &&
    [
      "/prepare.html",
      "/themes.html",
      "/documents.html",
      "/sequence.html",
      "/lesson.html",
    ].includes(location.pathname)
  ) {
    const tabs = document.createElement("nav");
    tabs.className = "prepare-tabs";
    for (const [text, href] of [
      ["Séquences et séances", "/"],
      ["Thèmes et cartes", "/themes.html"],
      ["Documents et liens", "/documents.html"],
    ]) {
      const a = document.createElement("a");
      a.textContent = text;
      a.href = href;
      if (location.pathname === href) a.setAttribute("aria-current", "page");
      tabs.append(a);
    }
    nav.after(tabs);
  }
  if (query.has("choose")) {
    const msg = document.getElementById("message");
    if (msg)
      msg.textContent =
        "Choisissez une séance, puis cliquez sur " +
        (query.get("choose") === "print" ? "Imprimer." : "Jouer.");
  }
  select.onchange = () => {
    const t = themes.find((t) => t.id === select.value);
    if (!t) return;
    update(t);
    const owner = isGame
      ? document.querySelector("#globalTheme select")
      : document.getElementById("theme");
    if (owner) {
      owner.value = isGame ? t.key : t.id;
      owner.dispatchEvent(new Event("change", { bubbles: true }));
    } else location.href = "/themes.html?theme=" + t.id;
  };
  document.addEventListener("change", (e) => {
    if (!lesson && e.target.matches("#globalTheme select,#theme")) {
      const t = themes.find(
        (t) => t.id === e.target.value || t.key === e.target.value,
      );
      if (t) update(t);
    }
  });
  window.addEventListener("themechange", (e) => {
    let t = themes.find((t) => t.id === e.detail.id);
    if (!t) {
      t = { id: e.detail.id, key: e.detail.key, name: e.detail.name };
      themes.push(t);
      const o = document.createElement("option");
      o.value = t.id;
      select.append(o);
    }
    Object.assign(t, { name: e.detail.name, key: e.detail.key });
    [...select.options].find((o) => o.value === t.id).textContent = t.name;
    if (!lesson && freeTheme) update(t);
  });
  if (!lesson && active && freeTheme) {
    const owner = isGame
      ? document.querySelector("#globalTheme select")
      : document.getElementById("theme");
    if (owner) {
      let done = false;
      const sync = () => {
        if (done || !owner.options.length) return;
        done = true;
        const value = isGame ? active.key : active.id;
        if (owner.value !== value) {
          owner.value = value;
          owner.dispatchEvent(new Event("change", { bubbles: true }));
        }
      };
      sync();
      if (!done) {
        const observer = new MutationObserver(() => {
          sync();
          if (done) observer.disconnect();
        });
        observer.observe(owner, { childList: true });
      }
    }
  }
  if (isPrint) {
    const field = document.querySelector(".settings>label:first-child");
    if (field) field.hidden = true;
    const back = document.querySelector(".toolbar>a:first-child");
    if (back) {
      back.hidden = false;
      back.href = lesson ? "/lesson.html?id=" + lesson.id : "/";
      back.textContent = lesson ? "← Retour à la séance" : "← Accueil";
    }
  }
  if (!isGame) return;
  document.body.classList.add("play-mode");
  const layout = document.querySelector(".layout");
  const sidebar = document.querySelector(".sidebar");
  const bar = document.createElement("div");
  bar.className = "play-toolbar";
  const activity = document.createElement("details");
  activity.id = "activity-menu";
  const activityLabel = document.createElement("summary");
  activityLabel.textContent = "Choisir une activité";
  activity.append(activityLabel, document.querySelector(".games"));
  if (lesson) {
    for (const [game, title] of [
      ["bingo", "Bingo au TBI"],
      ["oral", "Défi oral"],
      ["survey", "Sondage de classe"],
      ["teams", "Défi par équipes"],
    ]) {
      const a = document.createElement("a");
      a.href = gameURL(lesson.id, game);
      a.textContent = title;
      a.className = "button";
      activity.querySelector("nav").append(a);
    }
  }
  const settings = document.createElement("details");
  settings.id = "game-settings";
  const summary = document.createElement("summary");
  summary.textContent = "Réglages";
  const panel = document.createElement("div");
  panel.className = "settings-panel";
  panel.append(
    document.getElementById("controls"),
    document.querySelector(".global-controls"),
  );
  settings.append(summary, panel);
  const menu = document.createElement("button");
  menu.textContent = "Menu";
  menu.className = "fullscreen-menu";
  menu.onclick = () => document.body.classList.toggle("show-navigation");
  const full = document.createElement("button");
  full.textContent = "Plein écran";
  full.onclick = () => {
    const operation = document.fullscreenElement
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen?.();
    operation?.catch(() => {});
  };
  const ritual = document.createElement("a");
  ritual.textContent = lesson ? "Retour à la séance" : "Préparer une séance";
  bar.append(menu, activity, settings, ritual, full);
  if (lesson) {
    const docs = document.createElement("button");
    docs.textContent = "Documents";
    docs.id = "play-documents";
    const drawer = document.createElement("dialog");
    drawer.id = "play-documents-dialog";
    const heading = document.createElement("h2");
    heading.textContent = "Documents de la séance";
    const close = document.createElement("button");
    close.textContent = "Fermer";
    close.onclick = () => drawer.close();
    drawer.append(heading, close);
    for (const resource of [
      ...(lesson.sequence?.resources || []),
      ...lesson.resources,
    ]) {
      const box = document.createElement("article");
      box.className = "resource";
      const title = document.createElement("h3");
      title.textContent = resource.title;
      box.append(title);
      if (resource.local && ["song", "video"].includes(resource.kind)) {
        const media = document.createElement(
          resource.kind === "song" ? "audio" : "video",
        );
        media.src = resource.url;
        media.controls = true;
        media.preload = "none";
        box.append(media);
      }
      const a = document.createElement("a");
      a.className = "button";
      a.textContent = "Ouvrir";
      a.href = resource.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      box.append(a);
      drawer.append(box);
    }
    const flow = document.createElement("a");
    flow.href = "/run.html?lesson=" + lesson.id;
    flow.textContent = "Ouvrir le déroulé de la séance";
    flow.className = "button";
    drawer.append(flow);
    document.body.append(drawer);
    docs.onclick = () => {
      window.Utils.cancelGameWork();
      activity.open = false;
      settings.open = false;
      drawer.showModal();
    };
    drawer.addEventListener("close", () => {
      drawer.querySelectorAll("audio,video").forEach((m) => m.pause());
      window.dispatchEvent(new Event("restartgame"));
    });
    drawer.addEventListener(
      "play",
      (e) =>
        drawer.querySelectorAll("audio,video").forEach((m) => {
          if (m !== e.target) m.pause();
        }),
      true,
    );
    bar.insertBefore(docs, ritual);
    if (lesson.sentence) {
      const phrase = document.createElement("span");
      phrase.className = "class-sentence";
      phrase.textContent = lesson.sentence;
      bar.append(phrase);
    }
  }
  layout.prepend(bar);
  const footer = document.createElement("footer");
  footer.className = "play-actions";
  const action = document.createElement("div");
  action.id = "game-actions";
  const restart = document.createElement("button");
  restart.textContent = "Recommencer";
  restart.id = "restart-game";
  restart.onclick = () => window.dispatchEvent(new Event("restartgame"));
  footer.append(action, restart);
  layout.append(footer);
  // Retain the theme selector as the application state owner, without displaying a second menu.
  sidebar.hidden = true;
  let automatic = true;
  function fit() {
    const grid = document.querySelector("#stage .grid");
    if (!grid) return;
    const count = grid.children.length;
    if (!count) return;
    const stage = document.getElementById("stage");
    const w = stage.clientWidth - 32,
      h = stage.clientHeight - 32;
    let cols = 1,
      best = 0;
    for (let c = 1; c <= Math.min(8, count); c++) {
      const size = Math.min(w / c - 36, h / Math.ceil(count / c) - 80);
      if (size > best) {
        best = size;
        cols = c;
      }
    }
    if (automatic)
      grid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
    else
      cols =
        Number(getComputedStyle(grid).gridTemplateColumns.split(" ").length) ||
        cols;
    const size = Math.max(
      45,
      Math.min(320, w / cols - 36, h / Math.ceil(count / cols) - 80),
    );
    grid.style.setProperty("--play-card-size", size + "px");
  }
  function controls() {
    action.replaceChildren();
    const play = document.querySelector('#controls [id$="-play-btn"]');
    if (play) action.append(play.closest(".row"));
    fit();
  }
  function rendered() {
    const selected = document.querySelector("#gameList button.active");
    activityLabel.textContent = selected?.textContent || "Choisir une activité";
    const tid =
      window.THEME_IDS?.[document.querySelector("#globalTheme select").value];
    ritual.href = lesson
      ? "/lesson.html?id=" + lesson.id
      : "/lesson.html?theme=" + tid;
    fit();
  }
  document.getElementById("gameList").addEventListener("click", () => {
    activity.open = false;
    const current = document.querySelector(
      "#gameList button.active",
    )?.textContent;
    const games = [
      "tableau",
      "listen",
      "mask",
      "pairs",
      "order",
      "missing",
      "vf",
    ];
    const pos = [...document.querySelectorAll("#gameList button")].findIndex(
      (b) => b.textContent === current,
    );
    if (lesson && pos >= 0) {
      write("game:" + lesson.id, games[pos]);
      history.replaceState(
        null,
        "",
        "?lesson=" + lesson.id + "&game=" + games[pos],
      );
    }
    rendered();
  });
  function positionSettings() {
    if (settings.open) {
      const top = Math.max(
        12,
        Math.min(bar.getBoundingClientRect().bottom + 8, innerHeight - 160),
      );
      panel.style.top = top + "px";
      panel.style.maxHeight = Math.max(100, innerHeight - top - 12) + "px";
    }
  }
  settings.addEventListener("toggle", positionSettings);
  window.addEventListener("resize", positionSettings);
  new ResizeObserver(positionSettings).observe(bar);
  settings.addEventListener("change", (e) => {
    const row = e.target.closest(".row");
    if (row?.textContent.includes("Colonnes")) {
      automatic = false;
      fit();
    }
  });
  document.addEventListener("click", (e) => {
    if (!activity.contains(e.target)) activity.open = false;
    if (!settings.contains(e.target)) settings.open = false;
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      activity.open = false;
      settings.open = false;
    }
  });
  window.addEventListener("localcontrols", controls);
  window.addEventListener("localrender", rendered);
  new MutationObserver(rendered).observe(
    document.getElementById("cardContainer"),
    { childList: true, subtree: true },
  );
  new ResizeObserver(fit).observe(document.getElementById("stage"));
  controls();
  rendered();
})();
