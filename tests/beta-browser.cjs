const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const base = process.env.LOCAL_TEST_URL || "http://127.0.0.1:8111/";
(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const p = await browser.newPage({
    viewport: { width: 1366, height: 768 },
    acceptDownloads: true,
  });
  const errors = [];
  p.on("pageerror", (e) => {
    errors.push(e.message);
    console.error(e.stack);
  });
  let checks = 0;
  const pass = (t) => {
    checks++;
    console.log("PASS " + t);
  };
  try {
    await p.goto(base);
    await p
      .getByRole("link", { name: "Nouvelle séquence", exact: true })
      .click();
    await p.waitForSelector("#editor-fields:not([disabled])");
    await p.locator("#title").fill("Feelings CP — bêta");
    await p.locator("#level").fill("CP");
    await p.locator("#final_task").fill("Jouer un dialogue à deux");
    await p
      .getByText("Objectifs pédagogiques et culturels", { exact: true })
      .click();
    await p.locator("#culture").fill("Découvrir un album");
    await p.locator("#structures").fill("How are you? I’m happy.");
    await p.locator("#criteria").fill("Je comprends et je réponds.");
    await p.getByLabel("Échanger à l’oral", { exact: true }).check();
    await p.locator("#save").click();
    await p.waitForURL("**/sequence.html?id=*&saved=1");
    const sequence = new URL(p.url()).searchParams.get("id");
    assert.equal(
      await p.locator("#final_task").inputValue(),
      "Jouer un dialogue à deux",
    );
    pass("séquence pédagogique enregistrée et reprise");
    await p
      .locator("#suggestions a")
      .filter({ hasText: /^Découvrir$/ })
      .click();
    await p.waitForSelector("#editor-fields:not([disabled])");
    assert.equal(await p.locator(".stage-editor").count(), 4);
    assert.equal(
      await p.locator("#sentence").inputValue(),
      "How are you? I’m happy.",
    );
    await p.locator("#title").fill("Découvrir — bêta");
    await p.waitForFunction(
      () => document.querySelectorAll("#bank option").length >= 2,
    );
    await p.locator("#add-theme").click();
    await p.waitForSelector("#sources input[type=checkbox]");
    await p.locator("#sources input[type=number]").fill("6");
    await p
      .getByRole("button", { name: "Choisir ce nombre", exact: true })
      .click();
    assert.equal(await p.locator("#sources input:checked").count(), 6);
    await p.locator("#resource-editor>summary").click();
    await p
      .getByRole("textbox", { name: "Titre de la ressource", exact: true })
      .fill("Chanson du rituel");
    await p
      .getByRole("textbox", { name: "Lien de la ressource", exact: true })
      .fill("https://example.org/rituel");
    await p
      .getByRole("button", { name: "Ajouter le lien", exact: true })
      .click();
    await p
      .getByLabel("Type de l’étape 2", { exact: true })
      .selectOption("game");
    await p
      .getByLabel("Jeu de l’étape 2", { exact: true })
      .selectOption("listen");
    await p
      .getByLabel("Type de l’étape 3", { exact: true })
      .selectOption("resource");
    await p
      .getByLabel("Document de l’étape 3", { exact: true })
      .selectOption("0");
    await p
      .getByLabel("Consigne de l’étape 1", { exact: true })
      .fill("Se saluer puis chanter.");
    await p.locator("#save").click();
    await p.waitForURL("**/lesson.html?id=*&saved=1");
    await p.waitForSelector("#editor-fields:not([disabled])");
    const id = new URL(p.url()).searchParams.get("id");
    assert.equal(await p.locator("#sources input:checked").count(), 6);
    assert.equal(await p.locator(".stage-editor").count(), 4);
    pass("séance complète, sélection et déroulé conservés sur une fiche");
    await p.locator("#app-navigation [data-module=home]").click();
    await p.waitForSelector(".lesson-card");
    const row = p
      .locator(".lesson-card")
      .filter({ hasText: "Découvrir — bêta" });
    assert.equal(
      await row.getByRole("link", { name: "Jouer", exact: true }).count(),
      1,
    );
    await row.getByRole("link", { name: "Jouer", exact: true }).click();
    await p.waitForSelector(".play-mode");
    assert.equal(await p.locator("#stage .card").count(), 6);
    assert.equal(await p.locator("#navigation-theme").isVisible(), false);
    await p.locator("#activity-menu>summary").click();
    await p
      .locator("#gameList button")
      .filter({ hasText: /^Listen$/ })
      .click();
    await p.getByRole("button", { name: "Documents", exact: true }).click();
    await p.waitForSelector("#play-documents-dialog[open]");
    await p
      .locator("#play-documents-dialog")
      .getByRole("button", { name: "Fermer", exact: true })
      .click();
    assert.equal(await p.locator("#stage .card").count(), 6);
    for (const [w, h] of [
      [1366, 768],
      [640, 600],
    ]) {
      await p.setViewportSize({ width: w, height: h });
      await p.locator("#game-settings summary").click();
      await p.waitForTimeout(80);
      const box = await p.locator(".settings-panel").boundingBox();
      assert.ok(
        box.x >= 0 &&
          box.x + box.width <= w + 1 &&
          box.y >= 0 &&
          box.y + box.height <= h + 1,
        JSON.stringify(box),
      );
      await p.keyboard.press("Escape");
    }
    await p.setViewportSize({ width: 1366, height: 768 });
    pass(
      "jeu en un clic, documents sur place et réglages contenus dans l’écran",
    );
    await p
      .getByRole("link", { name: "Retour à la séance", exact: true })
      .click();
    await p.waitForSelector("#editor-fields:not([disabled])");
    await p
      .locator("#lesson-shortcuts")
      .getByRole("link", { name: "Déroulé", exact: true })
      .click();
    await p.waitForSelector("#current-stage");
    assert.match(await p.locator("#current-stage").textContent(), /Se saluer/);
    await p.locator("#next").click();
    assert.match(
      await p.locator("#current-stage").textContent(),
      /Écouter et trouver/,
    );
    await p.reload();
    await p.waitForSelector("#current-stage");
    assert.match(await p.locator("#step-position").textContent(), /Étape 2\/4/);
    await p.locator("#next").click();
    assert.equal(
      await p.locator("#current-stage a").getAttribute("href"),
      "https://example.org/rituel",
    );
    pass("déroulé étape par étape, document et reprise au bon endroit");
    for (const game of [
      "tableau",
      "listen",
      "mask",
      "pairs",
      "order",
      "missing",
      "vf",
    ]) {
      await p.goto(base + "app/?lesson=" + id + "&game=" + game);
      await p.waitForSelector(".play-mode");
      assert.ok((await p.locator("#stage").textContent()) !== null);
    }
    pass("sept activités historiques disponibles avec la séance");
    await p.goto(base + "bonus.html?lesson=" + id + "&game=bingo");
    await p
      .getByRole("button", { name: "Tirer la première carte", exact: true })
      .click();
    assert.match(
      await p.locator("#bonus-stage").textContent(),
      /1 \/ 6 cartes tirées/,
    );
    await p
      .getByRole("button", { name: "Montrer l’image", exact: true })
      .click();
    assert.equal(await p.locator(".bonus-picture>img").count(), 2);
    await p
      .getByRole("button", { name: "Documents et déroulé", exact: true })
      .click();
    await p.locator("#close-documents").click();
    for (let i = 1; i < 6; i++) {
      await p.waitForTimeout(410);
      await p
        .getByRole("button", { name: "Carte suivante", exact: true })
        .click();
    }
    assert.equal(
      await p
        .getByRole("button", { name: "Carte suivante", exact: true })
        .isDisabled(),
      true,
    );
    assert.equal(await p.locator(".history-cards img").count(), 6);
    const history = await p
      .locator(".history-cards img")
      .evaluateAll((es) => es.map((e) => e.alt));
    assert.equal(new Set(history).size, 6);
    pass("bingo sans répétition, historique et fin du tirage");
    await p.selectOption("#activity", "oral");
    await p.waitForSelector(".bonus-picture");
    await p.getByRole("button", { name: "Voir le mot", exact: true }).click();
    assert.ok(await p.locator(".bonus-picture>strong").textContent());
    await p
      .getByRole("button", { name: "Réponse validée →", exact: true })
      .click();
    assert.match(
      await p.locator("#bonus-stage").textContent(),
      /Carte 2 sur 6/,
    );
    await p.selectOption("#activity", "teams");
    await p.waitForSelector(".team-scores");
    await p
      .getByRole("button", { name: "Réponse validée +1", exact: true })
      .dblclick();
    assert.match(
      await p.locator(".team-scores").textContent(),
      /Équipe 1 : 1 · Équipe 2 : 0/,
    );
    await p.waitForTimeout(420);
    await p.getByRole("button", { name: "Passer", exact: true }).click();
    assert.match(
      await p.locator("#bonus-stage").textContent(),
      /Carte 3 sur 6/,
    );
    await p.selectOption("#activity", "survey");
    await p.waitForSelector(".survey-grid>button");
    await p.locator(".survey-grid>button").first().click();
    await p.locator(".survey-grid>button").first().click();
    assert.equal(await p.locator(".vote-count").first().textContent(), "2");
    await p
      .getByRole("button", { name: "Annuler la dernière réponse", exact: true })
      .click();
    assert.equal(await p.locator(".vote-count").first().textContent(), "1");
    pass(
      "défi oral, équipes protégées des doubles réponses, sondage annulable",
    );
    await p.goto(base + "documents.html");
    await p.waitForSelector(".document-bank .editor");
    await p.locator("#search").fill("Chanson du rituel");
    assert.equal(await p.locator(".document-bank .editor").count(), 1);
    await p.locator(".document-bank summary").click();
    await p.getByRole("button", { name: "Associer", exact: true }).click();
    await p.waitForFunction(() =>
      document.querySelector("#message").textContent.includes("ajouté"),
    );
    await p.reload();
    await p.waitForFunction(
      () => document.querySelector("#search").value === "Chanson du rituel",
    );
    pass("bibliothèque recherchable et association à une séance");
    await p.goto(base + "print.html?lesson=" + id);
    await p.waitForFunction(() => !document.querySelector("#print").disabled);
    assert.equal(await p.locator(".tile").count(), 12);
    for (const kind of [
      "cards",
      "bingo",
      "domino",
      "fold",
      "book",
      "worksheet",
      "cut",
      "teacher",
      "prep",
    ]) {
      await p.selectOption("#kind", kind);
      if (kind === "bingo") {
        await p.locator("#quantity").fill("3");
        await p.locator("#quantity").press("Tab");
      }
      await p.locator("#generate").click();
      await p.waitForFunction(() => !document.querySelector("#print").disabled);
      const count = await p.locator(".sheet").count();
      assert.ok(count > 0);
      const pdf = "/tmp/beta-" + kind + ".pdf";
      await p.pdf({
        path: pdf,
        preferCSSPageSize: true,
        displayHeaderFooter: false,
        printBackground: true,
      });
      const info = execFileSync("pdfinfo", [pdf], { encoding: "utf8" });
      assert.match(info, new RegExp("Pages:\\s+" + count + "\\b"), kind);
      assert.match(info, /Page size:.*A4/);
      const overflow = await p
        .locator(".sheet,.tile,.prep-body")
        .evaluateAll((es) =>
          es
            .filter((e) => e.scrollHeight > e.clientHeight + 3)
            .map((e) => ({
              class: e.className,
              scroll: e.scrollHeight,
              client: e.clientHeight,
            })),
        );
      assert.deepEqual(overflow, [], kind);
      if (kind === "prep")
        assert.match(
          execFileSync("pdftotext", [pdf, "-"], { encoding: "utf8" }),
          /Jouer un dialogue/,
        );
    }
    for (const exercise of ["circle", "number", "write"]) {
      await p.selectOption("#kind", "worksheet");
      await p.selectOption("#exercise", exercise);
      await p.locator("#generate").click();
      await p.waitForFunction(() => !document.querySelector("#print").disabled);
      assert.equal(await p.locator(".tile").count(), 6);
    }
    pass(
      "neuf supports d’impression et quatre exercices, PDF A4 sans débordement",
    );
    await p.goto(base);
    await p.waitForSelector(".lesson-card");
    const download = p.waitForEvent("download");
    await p.locator("#backup").click();
    const saved = await download;
    await saved.saveAs("/tmp/english-beta-backup.zip");
    assert.ok(fs.statSync("/tmp/english-beta-backup.zip").size > 0);
    pass("sauvegarde complète téléchargée");
    await p.locator(".lesson-card .more-actions>summary").first().click();
    p.once("dialog", (d) => d.dismiss());
    await p
      .locator(".lesson-card")
      .first()
      .getByRole("button", { name: /^Supprimer / })
      .click();
    assert.ok((await p.locator(".lesson-card").count()) > 0);
    await p
      .locator(".sequence-card")
      .filter({ hasText: "Feelings CP — bêta" })
      .locator(":scope > .section-title .more-actions>summary")
      .click();
    p.once("dialog", (d) => d.accept());
    await p
      .getByRole("button", {
        name: "Supprimer Feelings CP — bêta",
        exact: true,
      })
      .click();
    await p.waitForFunction(
      () => !document.querySelector(".sequence-card h2 a"),
    );
    assert.equal(await p.locator(".lesson-card").count(), 1);
    pass("suppression confirmée et conservation des séances indépendantes");
    await p.setViewportSize({ width: 640, height: 600 });
    await p.screenshot({ path: "/tmp/beta-home-small.png", fullPage: true });
    assert.ok(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    assert.deepEqual(errors, []);
    console.log(checks + " parcours bêta réussis.");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
