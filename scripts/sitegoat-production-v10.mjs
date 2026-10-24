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
]) {
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
  };
  await context.route("**/*", (r) => {
    const u = new URL(r.request().url());
    return u.origin === origin &&
      r.request().method() === "GET" &&
      !u.pathname.startsWith("/api/")
      ? r.continue()
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
    phase = "import";
    await page
      .getByLabel("Fichiers HTML à importer")
      .setInputFiles({
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
    result.native = [];
    phase = "native-prompts";
    for (const prompt of p?.promptAssets || []) {
      let button = f
        .locator(
          `button[data-prompt="${prompt.promptId}"],button[data-prompt-id="${prompt.promptId}"]`,
        )
        .first();
      if (!(await button.isVisible())) {
        const menu = f
          .getByRole("button", { name: /^Prompts(?:\s|$)/ })
          .first();
        if (await menu.isVisible()) await menu.click();
      }
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
        promptId: prompt.promptId,
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
    for (const [n, prompt] of p.promptAssets.entries()) {
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
    }
    result.fallbackExact = p.promptAssets.length;
    phase = "offline-reload";
    await page.reload();
    await nav("Aujourd’hui");
    await expect(page.locator(".unified-workspace .event-card")).toHaveCount(
      Math.min(30, p.items.length),
    );
    result.offlineReload = true;
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
      "audits/sitegoat/implementation-2026-10-24/preuves/production-v10.json",
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
