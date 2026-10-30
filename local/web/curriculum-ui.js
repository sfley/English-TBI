"use strict";
window.CurriculumUI = {
  token: null,
  async api(url, body) {
    if (body !== undefined && !this.token)
      this.token = (await this.api("/api/session")).token;
    const r = await fetch(
      url,
      body === undefined
        ? {}
        : {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Local-Token": this.token,
            },
            body: JSON.stringify(body),
          },
    );
    const d = await r.json();
    if (!r.ok) throw Error(d.error || "Action impossible.");
    return d;
  },
  el(tag, text, attrs = {}) {
    const e = document.createElement(tag);
    if (text !== null) e.textContent = text;
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    return e;
  },
  link(text, href) {
    return this.el("a", text, { href, class: "button" });
  },
  resources(host, initial = [], themes = []) {
    const self = this;
    const items = initial.map((x) => ({ ...x }));
    const list = this.el("div", null);
    host.append(list);
    function draw() {
      list.replaceChildren();
      items.forEach((r, i) => {
        const row = self.el("div", null, { class: "resource-row" });
        const name = self.el("input", null, {
          value: r.title,
          maxlength: "120",
          "aria-label": "Nom du document " + (i + 1),
        });
        name.oninput = () => {
          r.title = name.value;
        };
        row.append(
          name,
          self.el("small", r.local ? "Fichier local" : "Lien Internet"),
        );
        for (const [label, action] of [
          [
            "↑",
            () => {
              if (i) [items[i - 1], items[i]] = [items[i], items[i - 1]];
            },
          ],
          [
            "↓",
            () => {
              if (i < items.length - 1)
                [items[i + 1], items[i]] = [items[i], items[i + 1]];
            },
          ],
          ["Retirer", () => items.splice(i, 1)],
        ]) {
          const b = self.el("button", label, {
            type: "button",
            "aria-label": label + " " + r.title,
          });
          b.onclick = () => {
            action();
            draw();
            host.dispatchEvent(new Event("change", { bubbles: true }));
          };
          row.append(b);
        }
        list.append(row);
      });
    }
    const fields = this.el("div", null, { class: "resource-add" });
    const title = this.el("input", null, {
      placeholder: "Titre de la ressource",
      "aria-label": "Titre de la ressource",
      maxlength: "120",
    });
    const url = this.el("input", null, {
      placeholder: "https://…",
      "aria-label": "Lien de la ressource",
      type: "url",
    });
    const kind = this.el("select", null, {
      "aria-label": "Catégorie de la ressource",
    });
    for (const [k, l] of [
      ["song", "Chanson"],
      ["video", "Vidéo"],
      ["game", "Jeu en ligne"],
      ["prep", "Fiche de préparation / séance"],
      ["other", "Autre"],
    ])
      kind.append(this.el("option", l, { value: k }));
    const add = this.el("button", "Ajouter le lien", { type: "button" });
    const message = this.el("p", "", { role: "status" });
    add.onclick = () => {
      try {
        const parsed = new URL(url.value);
        if (
          !["https:", "http:"].includes(parsed.protocol) ||
          parsed.username ||
          parsed.password ||
          !title.value.trim()
        )
          throw Error("Indiquez un titre et une adresse HTTP/HTTPS.");
        items.push({
          title: title.value.trim(),
          url: parsed.href,
          kind: kind.value,
          notes: "",
          local: false,
        });
        title.value = "";
        url.value = "";
        draw();
        host.dispatchEvent(new Event("change", { bubbles: true }));
        message.textContent =
          "Lien ajouté à la fiche. Enregistrez pour le conserver.";
      } catch (e) {
        message.textContent = e.message;
      }
    };
    fields.append(title, kind, url, add);
    host.append(fields);
    if (themes.length) {
      const bank = this.el("select", null, {
        "aria-label": "Thème pour les ressources",
      });
      themes.forEach((t) =>
        bank.append(this.el("option", t.name, { value: t.id })),
      );
      const options = this.el("div", null);
      const refresh = async () => {
        try {
          const data = await self.api("/api/lesson/" + bank.value);
          options.replaceChildren();
          for (const r of data.resources || []) {
            const b = self.el("button", "Ajouter : " + r.title, {
              type: "button",
            });
            b.onclick = () => {
              items.push({ ...r });
              draw();
              host.dispatchEvent(new Event("change", { bubbles: true }));
            };
            options.append(b);
          }
        } catch (e) {
          message.textContent = e.message;
        }
      };
      bank.onchange = refresh;
      const upload = this.el("input", null, {
        type: "file",
        accept: ".mp3,.mp4,.webm,.ogg,.pdf",
        "aria-label": "Fichier de ressource locale",
      });
      const send = this.el("button", "Ajouter le fichier local", {
        type: "button",
      });
      send.onclick = async () => {
        send.disabled = true;
        try {
          const file = upload.files[0];
          if (!file || !title.value.trim())
            throw Error("Indiquez un titre et choisissez un fichier.");
          if (file.size > 64 * 1024 * 1024) throw Error("64 Mo maximum.");
          if (!self.token) self.token = (await self.api("/api/session")).token;
          const q = new URLSearchParams({
            theme: bank.value,
            title: title.value.trim(),
            kind: kind.value,
            mode: "file",
            ext: file.name.split(".").pop(),
          });
          const response = await fetch("/api/resource?" + q, {
            method: "POST",
            headers: { "X-Local-Token": self.token },
            body: await file.arrayBuffer(),
          });
          const d = await response.json();
          if (!response.ok) throw Error(d.error);
          items.push(d.resources.at(-1));
          draw();
          title.value = "";
          upload.value = "";
          host.dispatchEvent(new Event("change", { bubbles: true }));
          message.textContent =
            "Fichier ajouté à la fiche. Enregistrez pour le conserver.";
          await refresh();
        } catch (e) {
          message.textContent = e.message;
        } finally {
          send.disabled = false;
        }
      };
      host.append(
        this.el(
          "p",
          "Reprendre une ressource d’un thème ou ajouter un fichier local :",
        ),
        bank,
        options,
        upload,
        send,
      );
      refresh();
    }
    host.append(message);
    draw();
    return () => items.map((x) => ({ ...x }));
  },
  showResources(host, items) {
    const self = this;
    for (const r of items) {
      const box = this.el("article", null, { class: "resource" });
      box.append(this.el("h3", r.title));
      if (r.local && ["song", "video"].includes(r.kind)) {
        const m = this.el(r.kind === "song" ? "audio" : "video", null, {
          src: r.url,
          controls: "",
          preload: "none",
        });
        box.append(m);
      }
      box.append(
        this.link(
          r.kind === "prep"
            ? "Voir la fiche"
            : r.kind === "game"
              ? "Ouvrir le jeu en ligne"
              : r.kind === "song"
                ? "Ouvrir la chanson"
                : r.kind === "video"
                  ? "Ouvrir la vidéo"
                  : "Ouvrir le document",
          r.url,
        ),
      );
      const a = box.querySelector("a");
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      if (r.notes) box.append(this.el("p", r.notes));
      host.append(box);
    }
    if (!this.mediaWired) {
      this.mediaWired = true;
      document.addEventListener(
        "play",
        (e) =>
          document.querySelectorAll("audio,video").forEach((m) => {
            if (m !== e.target) m.pause();
          }),
        true,
      );
      window.addEventListener("pagehide", () =>
        document.querySelectorAll("audio,video").forEach((m) => m.pause()),
      );
    }
  },
};

Object.assign(CurriculumUI, {
  games: [
    ["tableau", "Voir les cartes"],
    ["listen", "Écouter et trouver"],
    ["mask", "Image cachée"],
    ["pairs", "Memory"],
    ["order", "Écouter une suite"],
    ["missing", "Carte disparue"],
    ["vf", "Vrai ou faux"],
    ["bingo", "Bingo au TBI"],
    ["oral", "Défi oral"],
    ["survey", "Sondage de classe"],
    ["teams", "Défi par équipes"],
  ],
  read(key, fallback = null) {
    try {
      const value = JSON.parse(localStorage.getItem("english-tbi:" + key));
      if (value === null) return fallback;
      if (
        fallback !== null &&
        (typeof value !== typeof fallback ||
          Array.isArray(value) !== Array.isArray(fallback))
      )
        return fallback;
      if (typeof value === "number" && !Number.isFinite(value)) return fallback;
      return value;
    } catch {
      return fallback;
    }
  },
  write(key, value) {
    try {
      localStorage.setItem("english-tbi:" + key, JSON.stringify(value));
    } catch {}
  },
  gameURL(id, game = "tableau") {
    return (
      (["bingo", "oral", "survey", "teams"].includes(game)
        ? "/bonus.html?"
        : "/app/?") +
      "lesson=" +
      id +
      "&game=" +
      game
    );
  },
  playURL(id) {
    const game = this.read("game:" + id, "tableau");
    return this.gameURL(
      id,
      this.games.some(([k]) => k === game) ? game : "tableau",
    );
  },
  stopMedia() {
    document.querySelectorAll("audio,video").forEach((m) => m.pause());
    window.Utils?.cancelGameWork();
  },
  stages(host, initial, getResources) {
    const self = this,
      items = initial.map((s) => ({
        ...s,
        resource: s.resource ? { ...s.resource } : undefined,
      }));
    function changed() {
      host.dispatchEvent(new Event("change", { bubbles: true }));
    }
    function draw() {
      host.replaceChildren();
      items.forEach((s, i) => {
        const box = self.el("section", null, { class: "stage-editor" }),
          head = self.el("div", null, { class: "stage-heading" });
        const title = self.el("input", null, {
          value: s.title,
          required: "",
          maxlength: "120",
          "aria-label": "Titre de l’étape " + (i + 1),
        });
        title.oninput = () => (s.title = title.value);
        const minutes = self.el("input", null, {
          type: "number",
          min: "1",
          max: "180",
          value: s.minutes || 5,
          "aria-label": "Minutes de l’étape " + (i + 1),
        });
        minutes.oninput = () => (s.minutes = Number(minutes.value));
        head.append(
          self.el("strong", String(i + 1)),
          title,
          minutes,
          self.el("span", "min"),
        );
        for (const [text, action] of [
          [
            "↑",
            () => {
              if (i) [items[i - 1], items[i]] = [items[i], items[i - 1]];
            },
          ],
          [
            "↓",
            () => {
              if (i < items.length - 1)
                [items[i + 1], items[i]] = [items[i], items[i + 1]];
            },
          ],
          ["Retirer", () => items.splice(i, 1)],
        ]) {
          const b = self.el("button", text, {
            type: "button",
            "aria-label": text + " l’étape " + (i + 1),
          });
          b.onclick = () => {
            action();
            draw();
            changed();
          };
          head.append(b);
        }
        box.append(head);
        const kind = self.el("select", null, {
          "aria-label": "Type de l’étape " + (i + 1),
        });
        for (const [v, t] of [
          ["offline", "Consigne / activité sans écran"],
          ["game", "Jeu au TBI"],
          ["resource", "Document ou lien"],
        ])
          kind.append(self.el("option", t, { value: v }));
        kind.value = s.kind;
        kind.onchange = () => {
          s.kind = kind.value;
          if (s.kind === "game") s.game = s.game || "listen";
          if (s.kind === "resource" && !s.resource)
            s.resource = getResources()[0];
          draw();
          changed();
        };
        box.append(kind);
        if (s.kind === "game") {
          const game = self.el("select", null, {
            "aria-label": "Jeu de l’étape " + (i + 1),
          });
          self.games.forEach(([v, t]) =>
            game.append(self.el("option", t, { value: v })),
          );
          game.value = s.game || "listen";
          game.onchange = () => (s.game = game.value);
          box.append(game);
        }
        if (s.kind === "resource") {
          const select = self.el("select", null, {
            "aria-label": "Document de l’étape " + (i + 1),
          });
          const all = getResources();
          if (s.resource && !all.some((r) => r.url === s.resource.url))
            all.push(s.resource);
          select.append(
            self.el("option", "Choisir un document…", { value: "" }),
          );
          all.forEach((r, n) =>
            select.append(self.el("option", r.title, { value: String(n) })),
          );
          select.value = s.resource
            ? String(all.findIndex((r) => r.url === s.resource.url))
            : "";
          select.onchange = () => {
            s.resource =
              select.value === "" ? undefined : all[Number(select.value)];
          };
          select.onfocus = () => {
            const current = s.resource;
            const latest = getResources();
            if (current && !latest.some((r) => r.url === current.url))
              latest.push(current);
            all.splice(0, all.length, ...latest);
            select.replaceChildren(
              self.el("option", "Choisir un document…", { value: "" }),
            );
            all.forEach((r, n) =>
              select.append(self.el("option", r.title, { value: String(n) })),
            );
            select.value = current
              ? String(all.findIndex((r) => r.url === current.url))
              : "";
          };
          box.append(select);
        }
        const notes = self.el("textarea", s.instructions || "", {
          rows: "2",
          maxlength: "5000",
          placeholder: "Consigne ou déroulement de cette étape",
          "aria-label": "Consigne de l’étape " + (i + 1),
        });
        notes.oninput = () => (s.instructions = notes.value);
        box.append(notes);
        host.append(box);
      });
      const actions = self.el("div", null, { class: "lesson-actions" }),
        add = self.el("button", "Ajouter une étape", { type: "button" }),
        model = self.el("button", "Utiliser le modèle rituel → bilan", {
          type: "button",
        });
      add.onclick = () => {
        if (items.length >= 30) return;
        items.push({
          title: "Nouvelle étape",
          minutes: 5,
          kind: "offline",
          instructions: "",
        });
        draw();
        changed();
      };
      model.onclick = () => {
        if (
          items.length &&
          !confirm("Remplacer le déroulé actuel par le modèle ?")
        )
          return;
        items.splice(
          0,
          items.length,
          ...["Rituel", "Découverte", "Entraînement", "Bilan"].map((title) => ({
            title,
            minutes: 5,
            kind: "offline",
            instructions: "",
          })),
        );
        draw();
        changed();
      };
      actions.append(add, model);
      host.append(actions);
      if (!items.length)
        host.prepend(
          self.el(
            "p",
            "Facultatif : préparez les étapes pour les retrouver dans l’ordre pendant la classe.",
          ),
        );
    }
    draw();
    return () => items.map((s) => ({ ...s }));
  },
});
