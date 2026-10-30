const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const base = process.env.LOCAL_TEST_URL || "http://127.0.0.1:8112/";
(async () => {
  const b = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const p = await b.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  try {
    const catalog = await (await fetch(base + "api/curriculum")).json(),
      id = catalog.lessons[0].id;
    // A blocked preference store must not block any local module.
    await p.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new DOMException("blocked", "SecurityError");
        },
      });
    });
    for (const route of [
      "",
      "documents.html",
      "lesson.html?id=" + id,
      "bonus.html?lesson=" + id + "&game=invalid",
    ]) {
      await p.goto(base + route);
      if (route.startsWith("lesson"))
        await p.waitForSelector("#editor-fields:not([disabled])");
      else if (route.startsWith("bonus"))
        await p.waitForSelector(".bonus-controls");
      else await p.waitForSelector("#app-navigation");
    }
    console.log(
      "PASS modules utilisables avec stockage navigateur indisponible et jeu invalide",
    );
    const detail = await (
      await fetch(base + "api/curriculum/lessons/" + id)
    ).json();
    for (const n of [18, 60]) {
      await p.route("**/api/curriculum/lessons/" + id, (r) =>
        r.fulfill({
          json: {
            ...detail,
            card_count: n,
            cards: Array.from({ length: n }, (_, i) => ({
              ...detail.cards[i % detail.cards.length],
              id: "fixture-" + i,
            })),
          },
        }),
      );
      await p.goto(base + "print.html?lesson=" + id);
      await p.waitForFunction(() => !document.querySelector("#print").disabled);
      await p.locator("#sets").fill(n === 18 ? "3" : "2");
      await p.locator("#sets").press("Tab");
      await p.locator("#generate").click();
      await p.waitForFunction(() => !document.querySelector("#print").disabled);
      assert.equal(await p.locator(".tile").count(), n * (n === 18 ? 3 : 2));
      if (n === 18) assert.equal(await p.locator(".sheet").count(), 1);
      const overflowing = await p
        .locator(".sheet,.pupil-set,.tile")
        .evaluateAll((es) =>
          es
            .filter((e) => e.scrollHeight > e.clientHeight + 3)
            .map((e) => e.className),
        );
      assert.deepEqual(overflowing, []);
      await p.unroute("**/api/curriculum/lessons/" + id);
    }
    console.log(
      "PASS 3 × 18 cartes sur une A4 et séance de 60 cartes sans perte",
    );
    const corrupt = await b.newPage();
    corrupt.on("pageerror", (e) => errors.push(e.message));
    await corrupt.addInitScript((id) => {
      localStorage.setItem("english-tbi:home-search", "[]");
      localStorage.setItem("english-tbi:documents-filter", "42");
      localStorage.setItem("english-tbi:stage:" + id, "0.5");
    }, id);
    await corrupt.goto(base);
    await corrupt.waitForSelector(".lesson-card");
    assert.equal(await corrupt.locator("#search").inputValue(), "");
    await corrupt.goto(base + "documents.html");
    await corrupt.waitForSelector("#app-navigation");
    await corrupt.goto(base + "run.html?lesson=" + id);
    await corrupt.waitForSelector("#current-stage");
    assert.match(
      await corrupt.locator("#step-position").textContent(),
      /Étape 1/,
    );
    await corrupt.close();
    console.log(
      "PASS préférences locales de mauvais type récupérées sans blocage",
    );
    const audio = await b.newPage();
    audio.on("pageerror", (e) => errors.push(e.message));
    await audio.addInitScript(() => {
      window.activeTestAudio = 0;
      window.Audio = class {
        constructor(src) {
          this.src = src;
          this.running = false;
        }
        play() {
          this.running = true;
          window.activeTestAudio++;
          return Promise.resolve();
        }
        pause() {
          if (this.running) {
            window.activeTestAudio--;
            this.running = false;
          }
        }
      };
    });
    await audio.goto(base + "bonus.html?lesson=" + id + "&game=bingo");
    await audio
      .getByRole("button", { name: "Tirer la première carte", exact: true })
      .click();
    assert.equal(await audio.evaluate(() => window.activeTestAudio), 1);
    await audio.locator("#documents-button").click();
    assert.equal(await audio.evaluate(() => window.activeTestAudio), 0);
    await audio.locator("#close-documents").click();
    await audio.getByRole("button", { name: "Réécouter", exact: true }).click();
    assert.equal(await audio.evaluate(() => window.activeTestAudio), 1);
    await audio.selectOption("#activity", "oral");
    await audio.waitForSelector(".bonus-picture");
    assert.equal(await audio.evaluate(() => window.activeTestAudio), 0);
    await audio.close();
    console.log(
      "PASS arrêt du son à l’ouverture des documents et au changement de jeu",
    );
    assert.deepEqual(errors, []);
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
