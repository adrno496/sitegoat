// Local-only compatibility checks. User HTML is never copied into the repo,
// screenshots, logs, cloud or prompts. Only counts/check results are recorded.
import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { JSDOM, VirtualConsole } from "jsdom";
import { chromium, webkit, devices } from "playwright";
import { expect } from "@playwright/test";
const file = process.argv[2];
const baseURL = process.env.JOURNAL360_BASE_URL || "http://127.0.0.1:4181";
if (!file || !["127.0.0.1", "localhost"].includes(new URL(baseURL).hostname))
  throw new Error("Provide an HTML path and an isolated localhost preview.");
const bytes = fs.readFileSync(file);
const checksum = createHash("sha256").update(bytes).digest("hex");
const source = new JSDOM(bytes.toString("utf8"), {
  virtualConsole: new VirtualConsole(),
}).window.document;
let data;
try {
  data = JSON.parse(
    source.getElementById("editionData")?.textContent || "null",
  );
} catch {
  throw new Error("Invalid editionData JSON");
}
if (data?.schemaVersion !== "6.1")
  throw new Error("Unsupported producer schema");
const fragments = [
  ...new Set(
    [...source.querySelectorAll('nav a[href^="#"]')].map((a) =>
      a.getAttribute("href"),
    ),
  ),
];
const expectedQuestions = [
  ...source.querySelectorAll("button[data-article],button[data-topic]"),
].map((button) => {
  const raw = button.hasAttribute("data-article")
    ? data.items.find((i) => i.id === button.dataset.article)?.aiQuestion
    : source.getElementById(`public-${button.dataset.topic}`)?.textContent;
  assert.equal(typeof raw, "string");
  return raw.replace(/[ \t\r\n]+/g, " ").trim();
});
const results = [];
for (const [engine, type] of [
  ["chromium", chromium],
  ["webkit", webkit],
]) {
  if (process.env.JOURNAL360_ENGINE && process.env.JOURNAL360_ENGINE !== engine)
    continue;
  const browser = await type.launch();
  try {
    for (const mobile of process.env.JOURNAL360_VIEWPORT === "desktop"
      ? [false]
      : process.env.JOURNAL360_VIEWPORT === "mobile"
        ? [true]
        : [false, true]) {
      const context = await browser.newContext({
        ...(mobile
          ? devices[engine === "webkit" ? "iPhone 13" : "Pixel 7"]
          : {}),
        viewport: mobile
          ? { width: 390, height: 844 }
          : { width: 1440, height: 900 },
      });
      let step = "load";
      const errors = [];
      const external = [];
      await context.route("**/*", async (route) => {
        const url = route.request().url();
        if (url === "https://www.google.com/ai") {
          external.push("google-entry-without-query");
          return route.fulfill({
            contentType: "text/html",
            body: "<title>Google simulated</title>",
          });
        }
        if (new URL(url).origin === new URL(baseURL).origin)
          return route.continue();
        external.push("blocked-external");
        return route.abort();
      });
      await context.addInitScript(() => {
        window.__copied = [];
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: { writeText: async (text) => window.__copied.push(text) },
        });
      });
      context.setDefaultTimeout(10000);
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(e.name));
      try {
        await page.goto(baseURL);
        await page.getByLabel("Fichiers HTML à importer").setInputFiles(file);
        await page
          .getByRole("button", {
            name: "Enregistrer dans ma bibliothèque",
            exact: true,
          })
          .click();
        await expect(page.locator(".day-card")).toHaveCount(1);
        await page
          .getByRole("button", { name: /^Lire / })
          .first()
          .click();
        let frame = page.frameLocator(".edition-frame");
        await expect(page.locator(".edition-frame")).toHaveAttribute(
          "sandbox",
          "allow-scripts",
        );
        await frame
          .locator("body")
          .evaluate(() => (window.__readerProbe = "alive"));
        step = "all-native-fragments";
        for (const fragment of fragments) {
          await frame
            .locator(`nav a[href="${fragment}"]:visible`)
            .first()
            .click();
          await expect(frame.locator("#editionData")).toHaveCount(1);
          assert.equal(
            await frame.locator("body").evaluate(() => window.__readerProbe),
            "alive",
          );
          assert.equal(
            await frame.locator("body").evaluate(() => location.href),
            `about:srcdoc${fragment}`,
          );
        }
        step = "article-index-links";
        const articleLinks = frame.locator('#index a[href^="#"]');
        const articleLinkCount = await articleLinks.count();
        for (let i = 0; i < articleLinkCount; i++) {
          const fragment = await articleLinks.nth(i).getAttribute("href");
          await articleLinks.nth(i).click();
          await expect(frame.locator("#editionData")).toHaveCount(1);
          assert.equal(
            await frame.locator("body").evaluate(() => window.__readerProbe),
            "alive",
          );
          assert.equal(
            await frame.locator("body").evaluate(() => location.href),
            new URL(`about:srcdoc${fragment}`).href,
          );
        }
        step = "eight-themes-and-filters";
        for (const mode of ["light", "dark"])
          for (const accent of ["red", "blue", "green", "purple"]) {
            step = `theme-${mode}-${accent}`;
            await frame.locator("#mode").selectOption(mode);
            await frame.locator("#accent").selectOption(accent);
            await expect(frame.locator("html")).toHaveAttribute(
              "data-mode",
              mode,
            );
            await expect(frame.locator("html")).toHaveAttribute(
              "data-accent",
              accent,
            );
          }
        for (const label of ["Texte 94 %", "Texte 107 %", "Texte 100 %"]) {
          step = `density-${label}`;
          await frame.locator("#density").click();
          await expect(frame.locator("#density")).toHaveText(label);
        }
        step = "search-no-match";
        await frame.locator("#q").fill("synthetic-no-match-compatibility");
        await expect(frame.locator("#results")).toHaveText("0 résultat(s)");
        step = "search-reset";
        await frame.locator("#q").fill("");
        await expect(frame.locator("#results")).toHaveText(
          `${data.items.length} résultat(s)`,
        );
        step = "category";
        const category = await frame
          .locator("#cat option")
          .evaluateAll((options) => options.map((o) => o.value).find(Boolean));
        const count = await frame
          .locator("#index > *")
          .evaluateAll(
            (nodes, category) =>
              nodes.filter((e) => e.dataset.cat === category).length,
            category,
          );
        await frame.locator("#cat").selectOption(category);
        await expect(frame.locator("#results")).toHaveText(
          `${count} résultat(s)`,
        );
        await frame.locator("#cat").selectOption("");
        step = "sort-date";
        const chronological = await frame
          .locator("#sort option")
          .evaluateAll((options) =>
            options
              .map((o) => o.value)
              .find((value) => value && value !== "score"),
          );
        assert.equal(typeof chronological, "string");
        await frame.locator("#sort").selectOption(chronological);
        step = "all-google-buttons";
        const buttons = frame.locator(
          "button[data-article],button[data-topic]",
        );
        await expect(buttons).toHaveCount(expectedQuestions.length);
        for (let i = 0; i < expectedQuestions.length; i++) {
          await buttons.nth(i).click();
          const modal = page.getByRole("dialog", {
            name: "Ouvrir Google Mode IA dans votre navigateur ?",
          });
          await expect(modal).toBeVisible();
          assert.equal(
            await modal.getByRole("textbox").inputValue(),
            expectedQuestions[i],
          );
          assert.equal(
            await frame.locator("#googleDialog").evaluate((e) => e.open),
            false,
          );
          await modal
            .getByRole("button", { name: "Copier la question", exact: true })
            .click();
          await expect(modal).toContainText("Question copiée");
          assert.equal(
            await page.evaluate(() => window.__copied.at(-1)),
            expectedQuestions[i],
          );
          if (i === 0) {
            const next = context.waitForEvent("page");
            await modal
              .getByRole("button", {
                name: "Ouvrir Google Mode IA",
                exact: true,
              })
              .click();
            const popup = await next;
            await popup.waitForLoadState("domcontentloaded");
            assert.equal(popup.url(), "https://www.google.com/ai");
            assert(
              await popup.evaluate(
                () => opener === null && document.referrer === "",
              ),
            );
            await popup.close();
          }
          await modal
            .getByRole("button", { name: "Annuler", exact: true })
            .click();
        }
        step = "safe-mode-and-return";
        await page
          .getByRole("button", { name: "Désactiver JS", exact: true })
          .click();
        await expect(page.locator(".edition-frame")).toHaveAttribute(
          "sandbox",
          "",
        );
        await expect(frame.locator("script")).toHaveCount(0);
        for (const fragment of fragments) {
          await frame
            .locator(`nav a[href="about:srcdoc${fragment}"]:visible`)
            .first()
            .click();
          await expect(frame.locator("#index")).toHaveCount(1);
          assert.equal(
            await frame.locator("body").evaluate(() => location.href),
            `about:srcdoc${fragment}`,
          );
        }
        await page
          .getByText(
            `Questions Google disponibles (${expectedQuestions.length})`,
            { exact: true },
          )
          .click();
        await page
          .getByRole("button", { name: "Préparer la question 1", exact: true })
          .click();
        await page
          .getByRole("dialog")
          .getByRole("button", { name: "Annuler", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Interactif", exact: true })
          .click();
        await page
          .getByRole("button", {
            name: "Je fais confiance à ce fichier",
            exact: true,
          })
          .click();
        for (let i = 0; i < 2; i++) {
          frame = page.frameLocator(".edition-frame");
          await frame.locator("[data-article]").first().click();
          await expect(
            page.getByRole("dialog", {
              name: "Ouvrir Google Mode IA dans votre navigateur ?",
            }),
          ).toBeVisible();
          await page
            .getByRole("dialog")
            .getByRole("button", { name: "Annuler", exact: true })
            .click();
          if (i === 0)
            await page
              .getByRole("button", { name: "Recharger le HTML", exact: true })
              .click();
        }
        step = "offline-reader";
        await expect
          .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
          .toBe(true);
        await context.setOffline(true);
        await page.reload();
        await page
          .getByRole("button", { name: /^Lire / })
          .first()
          .click();
        frame = page.frameLocator(".edition-frame");
        await expect(frame.locator("#index")).toHaveCount(1);
        await frame.locator('nav a[href="#articles"]:visible').first().click();
        await expect(frame.locator("#editionData")).toHaveCount(1);
        await frame.locator("[data-article]").first().click();
        await expect(
          page.getByRole("dialog", {
            name: "Ouvrir Google Mode IA dans votre navigateur ?",
          }),
        ).toBeVisible();
        await page
          .getByRole("dialog")
          .getByRole("button", { name: "Ouvrir Google Mode IA", exact: true })
          .click();
        await expect(page.getByRole("dialog")).toContainText("Hors ligne");
        await page
          .getByRole("dialog")
          .getByRole("button", { name: "Annuler", exact: true })
          .click();
        await context.setOffline(false);
        step = "original-integrity";
        await page
          .getByRole("button", { name: "Réduire la lecture", exact: true })
          .click();
        const downloaded = page.waitForEvent("download");
        await page
          .getByRole("button", { name: "Original intact", exact: true })
          .click();
        assert(fs.readFileSync(await (await downloaded).path()).equals(bytes));
        assert.deepEqual(errors, []);
        assert.deepEqual(external, ["google-entry-without-query"]);
        results.push({
          engine,
          viewport: mobile ? "390x844 mobile simulated" : "1440x900 desktop",
          status: "PASS",
          fragments: fragments.length,
          articleLinks: articleLinkCount,
          googleButtons: expectedQuestions.length,
          themes: 8,
          safeMode: true,
          offlineReader: true,
          originalByteIdentical: true,
          externalRequestsSent: 0,
        });
        console.log("PASS", engine, mobile ? "mobile" : "desktop");
      } catch (error) {
        results.push({
          engine,
          viewport: mobile ? "mobile" : "desktop",
          status: "FAIL",
          step,
          errorType: error.name,
        });
        process.exitCode = 1;
        console.error(
          "FAIL",
          engine,
          mobile ? "mobile" : "desktop",
          step,
          error.name,
        );
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}
assert.equal(
  createHash("sha256").update(fs.readFileSync(file)).digest("hex"),
  checksum,
);
const output = process.env.JOURNAL360_EVIDENCE_FILE;
if (output)
  fs.writeFileSync(
    output,
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        sourceBytes: bytes.length,
        sourceChecksum: checksum,
        sourceChanged: false,
        userContentRecorded: false,
        cloudUsed: false,
        realGoogleUsed: false,
        physicalDevices: "NON TESTÉS",
        results,
      },
      null,
      2,
    ) + "\n",
  );
