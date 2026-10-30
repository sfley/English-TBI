const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const base = process.env.LOCAL_TEST_URL || "http://127.0.0.1:8105/";
(async () => {
  const b = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  try {
    await p.goto(base);
    const fixture = await p.evaluate(async () => {
      const token = (await fetch("/api/session").then((r) => r.json())).token;
      const send = async (path, d) => {
        const r = await fetch(path, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Local-Token": token,
          },
          body: JSON.stringify(d),
        });
        if (!r.ok) throw Error(await r.text());
        return r.json();
      };
      const seq = await send("/api/curriculum/sequences", {
        title: "Progression de test",
      });
      const theme = (await fetch("/api/themes").then((r) => r.json()))
        .themes[0];
      const detail = await fetch("/api/themes/" + theme.id).then((r) =>
        r.json(),
      );
      const lesson = await send("/api/curriculum/lessons", {
        title: "Première séance",
        sequence_id: seq.id,
        sources: [
          {
            theme_id: theme.id,
            cards: detail.cards.slice(0, 6).map((c) => c.file),
          },
        ],
        stages: [{ title: "Rituel", kind: "offline", minutes: 5 }],
        sentence: "I like…",
      });
      return { seq, lesson };
    });
    await p.reload();
    await p.waitForSelector(".lesson-card");
    await p
      .locator(".lesson-card")
      .filter({ hasText: "Première séance" })
      .getByRole("link", { name: "Préparer", exact: true })
      .click();
    await p.waitForSelector("#editor-fields:not([disabled])");
    assert.equal(await p.locator("#sources input:checked").count(), 6);
    assert.equal(await p.locator(".stage-editor").count(), 1);
    assert.equal(await p.locator("#sentence").inputValue(), "I like…");
    console.log("PASS fiche unique avec sélection et déroulé enregistrés");
    await p.locator("#title").fill("Titre non enregistré");
    let guarded = false;
    p.once("dialog", async (d) => {
      guarded = d.type() === "beforeunload";
      await d.dismiss();
    });
    await p.locator(".app-brand").click({ noWaitAfter: true });
    await p.waitForTimeout(100);
    assert.ok(guarded);
    await p.locator("#title").fill("Première séance");
    await p.locator("#save").click();
    await p.waitForURL("**/lesson.html?id=*&saved=1");
    console.log("PASS protection des modifications et sauvegarde sur la fiche");
    await p.locator(".app-brand").click();
    await p.waitForSelector(".lesson-card");
    await p
      .locator(".lesson-card")
      .filter({ hasText: "Première séance" })
      .locator(".more-actions>summary")
      .click();
    await p.getByRole("button", { name: "Dupliquer", exact: true }).click();
    await p.waitForFunction(
      () =>
        document.querySelector("#title")?.value?.includes("copie") &&
        !document.querySelector("#editor-fields").disabled,
    );
    assert.equal(await p.locator("#sources input:checked").count(), 6);
    assert.equal(await p.locator(".stage-editor").count(), 1);
    await p.locator("#title").fill("Seconde séance");
    await p.locator("#save").click();
    await p.waitForURL("**/lesson.html?id=*&saved=1");
    await p.locator(".app-brand").click();
    await p.waitForFunction(
      () => document.querySelectorAll(".lesson-card").length === 2,
    );
    await p
      .locator(".lesson-card")
      .filter({ hasText: "Seconde séance" })
      .locator(".more-actions>summary")
      .click();
    await p
      .getByRole("button", { name: "Monter Seconde séance", exact: true })
      .click();
    await p.waitForFunction(
      () =>
        document.querySelector(".lesson-card h3")?.textContent ===
        "Seconde séance",
    );
    await p.reload();
    await p.waitForFunction(
      () => document.querySelectorAll(".lesson-card").length === 2,
    );
    assert.equal(
      await p.locator(".lesson-card h3").first().textContent(),
      "Seconde séance",
    );
    console.log("PASS duplication complète, réordonnancement et persistance");
    await p.locator("#search").fill("Seconde");
    assert.equal(await p.locator(".lesson-card").count(), 1);
    await p
      .locator(".lesson-card")
      .getByRole("link", { name: "Préparer", exact: true })
      .click();
    await p.waitForSelector("#editor-fields:not([disabled])");
    await p.locator(".app-brand").click();
    await p.waitForFunction(
      () => document.querySelector("#search")?.value === "Seconde",
    );
    assert.equal(await p.locator(".lesson-card").count(), 1);
    console.log("PASS recherche conservée au retour");
    assert.deepEqual(errors, []);
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
