import { chromium } from "@playwright/test";
import { mkdir, writeFile, readFile } from "node:fs/promises";
const [url, out] = process.argv.slice(2);
if (!url || new URL(url).hostname !== "127.0.0.1" || !out)
  throw Error("Localhost et dossier requis.");
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
try {
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await context.newPage();
  let external = 0;
  await page.route("**/*", (route) => {
    if (new URL(route.request().url()).hostname !== "127.0.0.1") {
      external++;
      return route.abort();
    }
    return route.continue();
  });
  await page.goto(url);
  const slots = ["08", "10", "12", "14", "16", "18", "20", "22"];
  await page
    .getByLabel("Fichiers HTML à importer")
    .setInputFiles(
      slots.map(
        (s) =>
          `public/examples/unified/JOURNAL360_2026-10-19_EDITION_${s}H00.html`,
      ),
    );
  await page
    .getByRole("button", {
      name: "Enregistrer dans ma bibliothèque",
      exact: true,
    })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  const close = page.getByRole("button", {
    name: "Fermer la notification",
    exact: true,
  });
  if (await close.isVisible()) await close.click();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Aujourd’hui", exact: true })
    .click();
  const w = page.locator(".unified-workspace");
  await w.getByRole("heading", { name: /Journal 360° Unifié/ }).waitFor();
  await page.locator(".working").waitFor({ state: "hidden" });
  await page.screenshot({
    animations: "disabled",
    path: out + "/today-light-desktop.png",
  });
  await page
    .getByRole("button", { name: "Activer le mode sombre", exact: true })
    .click();
  await page.waitForFunction(
    () => document.documentElement.dataset.theme === "dark",
  );
  await page.locator(".working").waitFor({ state: "hidden" });
  await page.screenshot({
    animations: "disabled",
    path: out + "/today-dark-desktop.png",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    animations: "disabled",
    path: out + "/today-dark-mobile.png",
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await w.getByRole("button", { name: "Économie", exact: true }).click();
  await page.screenshot({
    animations: "disabled",
    path: out + "/economy-desktop.png",
    fullPage: true,
  });
  await w.getByRole("button", { name: "Chronologie IA", exact: true }).click();
  await page.screenshot({
    animations: "disabled",
    path: out + "/timeline-desktop.png",
    fullPage: true,
  });
  await w.getByRole("button", { name: "Mes prompts .md", exact: true }).click();
  await w.locator(".unified-result").first().click();
  const card = w.locator(".prompt-card").first();
  await card.locator("summary").click();
  const expected = JSON.parse(
    await readFile("public/examples/unified/edition-2200.json", "utf8"),
  ).promptAssets[0].content;
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text) => {
          window.__copiedPrompt = text;
        },
      },
    }),
  );
  await card.getByRole("button", { name: "Copier", exact: true }).click();
  await card
    .getByRole("status")
    .filter({ hasText: "Prompt complet copié" })
    .waitFor();
  const success = await page.evaluate(
    (expected) => window.__copiedPrompt === expected,
    expected,
  );
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw Error("Clipboard deliberately blocked in test");
        },
      },
    }),
  );
  await card.getByRole("button", { name: "Copier", exact: true }).click();
  await card
    .getByRole("status")
    .filter({ hasText: "Texte sélectionné" })
    .waitFor();
  const fallback = await card
    .locator("textarea")
    .evaluate(
      (el) =>
        el === document.activeElement &&
        el.selectionStart === 0 &&
        el.selectionEnd === el.value.length,
    );
  await card.getByRole("button", { name: "Sélectionner", exact: true }).click();
  const select = await card
    .locator("textarea")
    .evaluate(
      (el) => el.selectionStart === 0 && el.selectionEnd === el.value.length,
    );
  await page.screenshot({
    animations: "disabled",
    path: out + "/prompts-desktop.png",
    fullPage: true,
  });
  await writeFile(out + "/accessibility.txt", await w.ariaSnapshot());
  await writeFile(
    out + "/prompt-controls.json",
    JSON.stringify(
      {
        clipboard:
          "Mocked in an isolated Chromium context; no system clipboard touched",
        fullTextEqual:
          (await card.locator("textarea").inputValue()) === expected,
        copySuccess: success,
        copyBlockedFallback: fallback,
        manualSelection: select,
        externalRequests: external,
      },
      null,
      2,
    ) + "\n",
  );
  if (!success || !fallback || !select || external)
    throw Error("Contrôle des prompts ou du réseau en échec.");
  console.log(
    "Captures locales, égalité du texte, copie simulée et sélection : PASS",
  );
  await context.close();
} finally {
  await browser.close();
}
