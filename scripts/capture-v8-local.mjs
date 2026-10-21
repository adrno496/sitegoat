import { chromium } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const [url, output] = process.argv.slice(2);
if (!url || new URL(url).hostname !== "127.0.0.1" || !output)
  throw Error("Serveur local et dossier requis");
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
  });
  const page = await context.newPage();
  let externalRequests = 0;
  await context.route("**/*", (route) => {
    if (new URL(route.request().url()).hostname !== "127.0.0.1") {
      externalRequests++;
      return route.abort();
    }
    return route.continue();
  });
  const raw = await readFile("tests/fixtures/v8/snapshot-22.html");
  const expected = JSON.parse(
    await readFile("tests/fixtures/v8/snapshot-22.json", "utf8"),
  );
  await page.goto(url);
  await page.locator(".unified-workspace").waitFor();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.getByLabel("Fichiers HTML à importer").setInputFiles({
    name: "snapshot-22.html",
    mimeType: "text/html",
    buffer: raw,
  });
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
  const nav = async (name) =>
    page
      .locator(
        (await page.locator(".sidebar").isVisible())
          ? ".sidebar"
          : ".mobile-nav",
      )
      .getByRole("button", { name, exact: true })
      .click();
  await nav("Articles");
  const articles = await page.locator(".articles-total").innerText();
  if (!articles.includes("8 articles")) throw Error("8 articles attendus");
  await nav("Aujourd’hui");
  const w = page.locator(".unified-workspace");
  const state = await w
    .locator("[data-autonomy]")
    .evaluate((el) => ({ ...el.dataset }));
  if (
    state.autonomy !== "AUTONOMOUS" ||
    state.coverage !== "UNKNOWN" ||
    state.history !== "SINGLE_SNAPSHOT"
  )
    throw Error("Statut du snapshot erroné");
  await page
    .getByRole("button", { name: "Activer le mode sombre", exact: true })
    .click();
  await page.locator('html[data-theme="dark"]').waitFor();
  const shot = async (name, fullPage = false) =>
    page.screenshot({
      path: output + "/" + name + ".png",
      fullPage,
      animations: "disabled",
    });
  await shot("today-dark-desktop");
  await shot("today-full-desktop", true);
  await page.setViewportSize({ width: 390, height: 1000 });
  await shot("today-dark-mobile");
  await page.setViewportSize({ width: 1440, height: 1100 });
  await w.getByRole("button", { name: "Économie", exact: true }).click();
  const economicRows = await w.locator(".economic-reading").count();
  await shot("economy");
  await w.getByRole("button", { name: "Chronologie IA", exact: true }).click();
  const insights = await w.locator(".unified-insights>article").count();
  await shot("timeline");
  await w.getByRole("button", { name: "Mes prompts .md", exact: true }).click();
  await w.locator(".unified-result").first().click();
  const promptCount = await w.locator(".prompt-card").count();
  const prompts = [];
  for (let i = 0; i < promptCount; i++) {
    const event = page.waitForEvent("download");
    await w
      .locator(".prompt-card")
      .nth(i)
      .getByRole("button", {
        name: "Télécharger le prompt VS Code (.md)",
        exact: true,
      })
      .click();
    const dl = await event;
    const bytes = await readFile(await dl.path());
    const exact = bytes.equals(
      Buffer.from(expected.promptAssets[i].content, "utf8"),
    );
    if (!exact) throw Error("Prompt tronqué");
    prompts.push({
      filename: dl.suggestedFilename(),
      bytes: bytes.length,
      exact,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }
  await shot("prompts");
  await w
    .getByRole("button", { name: "Recherche globale", exact: true })
    .click();
  await w.getByLabel("Rechercher partout").fill("alphav87");
  await w.locator(".unified-result").first().waitFor();
  await shot("search");
  await writeFile(
    output + "/accessibility.txt",
    await page.locator("main").ariaSnapshot(),
  );
  await nav("Bibliothèque");
  await page
    .getByRole("button", { name: "Historique des éditions", exact: true })
    .click();
  const importedFiles = await page.locator(".day-history>article").count();
  if (
    importedFiles !== 1 ||
    economicRows !== 4 ||
    insights !== 2 ||
    prompts.length !== 2 ||
    externalRequests
  )
    throw Error("Démonstration incomplète");
  await writeFile(
    output + "/t01.json",
    JSON.stringify(
      {
        scope:
          "Single synthetic 22h HTML imported into fresh isolated Chromium context. No private profile.",
        importedOffline: true,
        inputSha256: createHash("sha256").update(raw).digest("hex"),
        articles,
        importedFiles,
        state,
        economicRows,
        insights,
        prompts,
        externalRequests,
      },
      null,
      2,
    ) + "\n",
  );
  await context.close();
} finally {
  await browser.close();
}
console.log(
  "T01 : 1 HTML, 8 événements, 4 zones, 2 jalons et 2 prompts exacts : PASS",
);
