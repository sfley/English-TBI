const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const p = await b.newPage({ viewport: { width: 640, height: 600 } });
  const base = process.env.LOCAL_TEST_URL || "http://127.0.0.1:8117/";
  const data = await (await fetch(base + "api/curriculum")).json();
  const id = data.lessons[0].id;
  try {
    for (const game of ["oral", "teams"]) {
      await p.goto(base + "bonus.html?lesson=" + id + "&game=" + game);
      await p.waitForSelector(".bonus-controls");
      const button = p.getByRole("button", {
        name: game === "oral" ? "Réponse validée →" : "Réponse validée +1",
        exact: true,
      });
      const box = await button.boundingBox();
      assert.ok(box.y + box.height <= 600, game + JSON.stringify(box));
    }
    await p.goto(base + "lesson.html?id=" + id);
    await p.waitForSelector("#editor-fields:not([disabled])");
    let calls = 0;
    await p.route("**/api/curriculum/lessons", async (route) => {
      calls++;
      await new Promise((r) => setTimeout(r, 150));
      await route.continue();
    });
    await p.locator("#save").evaluate((button) => {
      const form = button.form;
      for (let i = 0; i < 2; i++)
        form.dispatchEvent(
          new SubmitEvent("submit", {
            bubbles: true,
            cancelable: true,
            submitter: button,
          }),
        );
    });
    await p.waitForURL("**/lesson.html?id=*&saved=1");
    assert.equal(calls, 1);
    console.log(
      "PASS commandes visibles à 640×600 et double enregistrement bloqué",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
