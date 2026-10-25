// Explicit post-publication validation on fresh profiles. The imported document
// is never sent to a server, executed in Node, or added to the repository.
import { chromium, webkit, expect } from "@playwright/test";
import { JSDOM } from "jsdom";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const filename = process.env.SITEGOAT_V10_HTML;
if (!filename)
  throw Error("SITEGOAT_V10_HTML required after the authorized main push.");
const origin =
  process.env.SITEGOAT_PRODUCTION_URL || "https://sitegoat.vercel.app";
const raw = await readFile(filename),
  digest = (b) => createHash("sha256").update(b).digest("hex");
const document = new JSDOM(raw.toString("utf8")).window.document;
const p = JSON.parse(
  document.querySelector("script#unifiedData")?.textContent || "null",
);
const q = JSON.parse(
  document.querySelector("script#quickBriefsData")?.textContent || "null",
);
const results = [];
for (const [name, type, width] of [
  ["chromium", chromium, 1440],
  ["webkit", webkit, 390],
  ["chromium-mobile", chromium, 360],
].filter(
  ([name]) =>
    !process.env.SITEGOAT_TEST_BROWSERS ||
    process.env.SITEGOAT_TEST_BROWSERS.split(",").includes(name),
)) {
  const browser = await type.launch({ headless: true }),
    context = await browser.newContext({
      viewport: { width, height: 900 },
      acceptDownloads: true,
      timezoneId: "Europe/Paris",
    }),
    page = await context.newPage();
  let phase = "shell";
  const result = {
    browser: name,
    version: browser.version(),
    sourceBytes: raw.length,
    sourceSha256: digest(raw),
    sourceArticles: p?.items?.length || 0,
    sourceBriefs: q?.items?.length || 0,
    sourcePrompts: p?.promptAssets?.length || 0,
    cloudTransfers: 0,
    publicApiCalls: [],
    downloadIntervalMs: Number(
      process.env.SITEGOAT_DOWNLOAD_INTERVAL_MS ?? 1100,
    ),
  };
  result.downloadThrottleWarnings = 0;
  page.on("console", (message) => {
    if (/throttl.*download|download.*throttl/i.test(message.text()))
      result.downloadThrottleWarnings++;
  });
  const pace = async () => {
    if (result.downloadIntervalMs)
      await new Promise((resolve) =>
        setTimeout(resolve, result.downloadIntervalMs),
      );
  };
  await context.route("**/*", (r) => {
    const u = new URL(r.request().url());
    return u.origin === origin &&
      r.request().method() === "GET" &&
      (!u.pathname.startsWith("/api/") || u.pathname === "/api/sources")
      ? r.continue()
      : u.origin === origin &&
          u.pathname === "/api/sources" &&
          r.request().method() === "POST" &&
          ["ecb", "worldbank"].some(
            (provider) =>
              r.request().postData() === JSON.stringify({ provider }),
          )
        ? (result.publicApiCalls.push(
            JSON.parse(r.request().postData()).provider,
          ),
          r.continue())
        : r.abort();
  });
  const nav = async (label) => {
    const reduce = page.getByRole("button", {
      name: "Réduire la lecture",
      exact: true,
    });
    if (await reduce.isVisible()) await reduce.click();
    const n = page.locator(
      (await page.locator(".sidebar").isVisible()) ? ".sidebar" : ".mobile-nav",
    );
    const button = n.getByRole("button", { name: label, exact: true });
    if (!(await button.isVisible()))
      await n
        .getByRole("button", { name: "Autres espaces", exact: true })
        .click();
    await button.click();
  };
  try {
    const response = await page.goto(origin);
    expect(response.status()).toBe(200);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await expect
      .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), {
        timeout: 30000,
      })
      .toBe(true);
    phase = "live-radar";
    await nav("En direct");
    await expect(
      page.getByRole("heading", { name: "Veille en direct" }),
    ).toBeVisible();
    expect(result.publicApiCalls).toHaveLength(0);
    await page
      .getByRole("button", { name: "Actualiser maintenant", exact: true })
      .click();
    await expect(page.locator(".live-results article")).toHaveCount(16);
    await expect(page.locator(".live-controls").getByRole("status")).toHaveText(
      "Suivi en pause",
    );
    await page
      .getByRole("tab", { name: "Radar économique mondial", exact: true })
      .click();
    await expect(page.getByRole("tabpanel")).toContainText(
      "France · Croissance du PIB",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    result.liveRadarRows = 16;
    await page.screenshot({
      path: `audits/sitegoat/implementation-2026-10-24/preuves/production-live-${name}.png`,
      fullPage: true,
    });
    phase = "public-api";
    await nav("Actualité rapide");
    await page.getByRole("tab", { name: "Sources", exact: true }).click();
    await page.getByRole("button", { name: "Récupérer", exact: true }).click();
    await expect(page.locator(".source-results article")).toHaveCount(6);
    result.publicSourceRows = 6;
    await nav("Accueil");
    phase = "import";
    await page.getByLabel("Fichiers HTML à importer").setInputFiles({
      name: "journal-v10.html",
      mimeType: "text/html",
      buffer: raw,
    });
    await expect(
      page.getByRole("dialog", { name: "Vérifier l’import", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: "Enregistrer dans ma bibliothèque",
        exact: true,
      })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    // No scripts have run at import. From here on all networking is disabled.
    await context.setOffline(true);
    phase = "index";
    await nav("Aujourd’hui");
    if (p)
      await expect(page.locator(".unified-workspace .event-card")).toHaveCount(
        Math.min(30, p.items.length),
      );
    result.stored = await page.evaluate(
      () =>
        new Promise((resolve, reject) => {
          const request = indexedDB.open("journal360-private");
          request.onerror = () => reject(Error("IDB"));
          request.onsuccess = () => {
            const db = request.result,
              tx = db.transaction(["editions", "originals"]);
            const req = tx.objectStore("editions").getAll();
            req.onsuccess = () => {
              const list = req.result;
              resolve({
                editions: list.length,
                articles: list.reduce((n, e) => n + e.articles.length, 0),
                briefs: list.reduce(
                  (n, e) => n + (e.quickBriefs?.items.length || 0),
                  0,
                ),
                prompts: list.reduce(
                  (n, e) => n + (e.unified?.promptAssets.length || 0),
                  0,
                ),
              });
              db.close();
            };
            req.onerror = () => reject(Error("IDB"));
          };
        }),
    );
    expect(result.stored.editions).toBe(1);
    if (p) {
      expect(result.stored.articles).toBe(p.items.length);
      expect(result.stored.prompts).toBe(p.promptAssets.length);
    }
    if (q) expect(result.stored.briefs).toBe(q.items.length);
    phase = "trust";
    await page
      .locator(".unified-workspace")
      .getByRole("button", { name: "Lire la dernière édition", exact: true })
      .click();
    await expect(page.locator(".edition-frame")).toHaveAttribute("sandbox", "");
    const trust = page.getByRole("dialog", {
      name: "Activer les interactions ?",
      exact: true,
    });
    await expect(trust).toBeVisible();
    await trust
      .getByRole("button", {
        name: "Je fais confiance à ce fichier",
        exact: true,
      })
      .click();
    await expect(page.locator(".edition-frame")).toHaveAttribute(
      "sandbox",
      "allow-scripts",
    );
    const f = page.frameLocator(".edition-frame");
    phase = "native-navigation";
    result.navigationAnchors = 0;
    for (const link of document.querySelectorAll('nav a[href^="#"]')) {
      const href = link.getAttribute("href");
      await f.locator(`nav a[href="${href}"]`).click();
      await expect
        .poll(() => f.locator("body").evaluate(() => location.hash))
        .toBe(href);
      result.navigationAnchors++;
    }
    const sourceArticles = document.querySelectorAll("details.article").length;
    if (sourceArticles) {
      await expect(f.locator("details.article")).toHaveCount(sourceArticles);
      const article = f.locator("details.article").first();
      if ((await article.getAttribute("open")) === null)
        await article.locator(":scope > summary").click();
      await expect(article).toHaveAttribute("open", "");
      result.nativeAccordion = true;
    }
    result.native = [];
    phase = "native-prompts";
    for (const prompt of p?.promptAssets || []) {
      let button = f
        .locator(
          `button[data-prompt="${prompt.promptId}"],button[data-prompt-id="${prompt.promptId}"],button[data-filename="${prompt.filename}"]`,
        )
        .first();
      if (!(await button.isVisible())) {
        const menu = f
          .getByRole("button", { name: /^Prompts(?:\s|$)/ })
          .first();
        if (await menu.isVisible()) await menu.click();
      }
      const details = button.locator("xpath=ancestor::details[1]");
      if (
        (await details.count()) &&
        (await details.getAttribute("open")) === null
      )
        await details.locator(":scope > summary").click();
      await pace();
      await button.click();
      const confirm = page.getByRole("dialog", {
        name: "Action du document original",
        exact: true,
      });
      await expect(confirm).toBeVisible();
      const event = page.waitForEvent("download");
      await confirm
        .getByRole("button", { name: "Télécharger .md", exact: true })
        .click();
      const file = await event,
        bytes = await readFile(await file.path());
      expect(bytes.toString("utf8")).toBe(prompt.content);
      expect(digest(bytes)).toBe(
        prompt.sha256 || digest(Buffer.from(prompt.content)),
      );
      result.native.push({
        promptNumber: result.native.length + 1,
        bytes: bytes.length,
        shaValid: true,
      });
    }
    phase = "original";
    await page
      .getByRole("button", { name: "Réduire la lecture", exact: true })
      .click();
    const original = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Original intact", exact: true })
      .click();
    expect(digest(await readFile(await (await original).path()))).toBe(
      digest(raw),
    );
    result.originalExact = true;
    phase = "fallback";
    await nav("Aujourd’hui");
    const w = page.locator(".unified-workspace");
    await w.locator(".v9-reading-tools summary").click();
    await w
      .getByRole("button", { name: "Mes prompts .md", exact: true })
      .click();
    await w.locator(".unified-result").first().click();
    await expect(w.locator(".prompt-card")).toHaveCount(p.promptAssets.length);
    result.fallback = [];
    for (const [n, prompt] of p.promptAssets.entries()) {
      phase = `fallback-${n + 1}`;
      await pace();
      const event = page.waitForEvent("download");
      await w
        .locator(".prompt-card")
        .nth(n)
        .getByRole("button", {
          name: "Télécharger le prompt VS Code (.md)",
          exact: true,
        })
        .click();
      expect(
        (await readFile(await (await event).path())).toString("utf8"),
      ).toBe(prompt.content);
      result.fallback.push({ promptNumber: n + 1, exact: true });
    }
    result.fallbackExact = p.promptAssets.length;
    phase = "offline-reload";
    await page.reload();
    await nav("Aujourd’hui");
    await expect(page.locator(".unified-workspace .event-card")).toHaveCount(
      Math.min(30, p.items.length),
    );
    result.offlineReload = true;
    await nav("Actualité rapide");
    await page.getByRole("tab", { name: "Sources", exact: true }).click();
    await expect(page.locator(".source-results article")).toHaveCount(6);
    result.publicSourceOfflineReload = true;
    await nav("En direct");
    await expect(page.locator(".live-results article")).toHaveCount(16);
    await expect(
      page.locator(".live-controls").getByRole("status"),
    ).toContainText("Hors ligne");
    await expect(
      page.getByRole("button", { name: "Démarrer le suivi", exact: true }),
    ).toBeDisabled();
    await page
      .getByRole("tab", { name: "Radar économique mondial", exact: true })
      .click();
    await expect(page.getByRole("tabpanel")).toContainText(
      "France · Croissance du PIB",
    );
    result.liveRadarOfflineReload = true;
    await nav("Aujourd’hui");
    const metadata = page.locator(".event-card .editorial-metadata").first();
    await expect(metadata.locator("time")).toHaveCount(1);
    for (const clutter of [
      "Publié le",
      "Vérification déclarée",
      "Fait du",
      "Statut déclaré",
      "Europe/Paris",
      "heure non fournie",
    ])
      await expect(metadata).not.toContainText(clutter);
    expect(
      await page
        .locator(".event-card .title-button")
        .first()
        .evaluate((el) => Number(getComputedStyle(el).fontWeight)),
    ).toBeGreaterThanOrEqual(700);
    result.compactDateAndBoldTitle = true;
    result.status = "PASS";
  } catch (e) {
    result.status = "FAIL";
    result.phase = phase;
    result.error =
      String(e.name) + ": " + String(e.message).split("\n")[0].slice(0, 160);
  } finally {
    await context.close();
    await browser.close();
    results.push(result);
    await writeFile(
      "audits/sitegoat/implementation-2026-10-24/preuves/production-v10-followup.json",
      JSON.stringify(
        {
          origin,
          codeCommit: process.env.SITEGOAT_CODE_COMMIT || null,
          results,
        },
        null,
        2,
      ),
    );
  }
}
console.log(JSON.stringify(results));
if (results.some((r) => r.status !== "PASS")) process.exitCode = 1;
