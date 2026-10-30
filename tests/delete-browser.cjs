const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const base = process.env.LOCAL_TEST_URL || "http://127.0.0.1:8106/";
(async () => {
  const b = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const p = await b.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  try {
    await p.goto(base);
    const items = await p.evaluate(async () => {
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
        title: "Séquence à supprimer",
      });
      const themes = (await fetch("/api/themes").then((r) => r.json())).themes;
      const theme = await fetch("/api/themes/" + themes[0].id).then((r) =>
        r.json(),
      );
      const source = {
        theme_id: theme.id,
        cards: theme.cards.slice(0, 6).map((c) => c.file),
      };
      const a = await send("/api/curriculum/lessons", {
        title: "Séance conservée",
        sequence_id: seq.id,
        sources: [source],
      });
      const c = await send("/api/curriculum/lessons", {
        title: "Séance à supprimer",
        sequence_id: seq.id,
        sources: [source],
      });
      return { seq, a, c };
    });
    await p.reload();
    await p.waitForFunction(
      () => document.querySelectorAll(".lesson-card").length === 2,
    );
    await p
      .locator(".lesson-card")
      .filter({ hasText: "Séance à supprimer" })
      .locator(".more-actions>summary")
      .click();
    p.once("dialog", (d) => d.dismiss());
    await p
      .getByRole("button", {
        name: "Supprimer Séance à supprimer",
        exact: true,
      })
      .click();
    assert.equal(await p.locator(".lesson-card").count(), 2);
    console.log("PASS annuler la confirmation conserve la séance");
    p.once("dialog", (d) => d.accept());
    await p
      .getByRole("button", {
        name: "Supprimer Séance à supprimer",
        exact: true,
      })
      .click();
    await p.waitForFunction(
      () => document.querySelectorAll(".lesson-card").length === 1,
    );
    assert.equal(
      await p.locator(".lesson-card h3").textContent(),
      "Séance conservée",
    );
    console.log("PASS suppression ciblée de la séance");
    await p
      .locator(".sequence-card")
      .filter({ hasText: "Séquence à supprimer" })
      .locator(":scope > .section-title .more-actions>summary")
      .click();
    let message = "";
    p.once("dialog", async (d) => {
      message = d.message();
      await d.accept();
    });
    await p
      .getByRole("button", {
        name: "Supprimer Séquence à supprimer",
        exact: true,
      })
      .click();
    await p.waitForFunction(
      () =>
        document.querySelectorAll(".lesson-card").length === 1 &&
        document.querySelectorAll("button.danger").length === 1,
    );
    assert.ok(message.includes("indépendantes"));
    assert.equal(
      await p.locator(".lesson-card h3").textContent(),
      "Séance conservée",
    );
    await p
      .locator(".lesson-card")
      .getByRole("link", { name: "Préparer", exact: true })
      .click();
    await p.waitForFunction(
      () =>
        document.querySelector("#title")?.value === "Séance conservée" &&
        !document.querySelector("#editor-fields").disabled,
    );
    assert.equal(await p.locator("#sources input:checked").count(), 6);
    assert.deepEqual(errors, []);
    console.log(
      "PASS suppression de la séquence, séance indépendante toujours utilisable",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
