import { chromium } from "playwright";
import fs from "node:fs";
import { performance } from "node:perf_hooks";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const results = [];
try {
  let at = performance.now();
  await page.goto("http://127.0.0.1:4173");
  await page
    .getByRole("heading", { name: "Votre première édition vous attend." })
    .waitFor();
  results.push({
    metric: "Première ouverture navigateur local",
    milliseconds: Math.round(performance.now() - at),
  });
  let total = 0;
  for (const [from, to] of [
    [0, 10],
    [10, 30],
    [30, 50],
    [50, 70],
    [70, 90],
    [90, 100],
  ]) {
    at = performance.now();
    const files = [];
    for (let i = from; i < to; i++) {
      const html = `<!doctype html><html><head><title>Performance synthétique ${i}</title></head><body><h1>Performance synthétique ${i}</h1><p>${"Texte de mesure sans donnée réelle. ".repeat(3000)}</p></body></html>`;
      const buffer = Buffer.from(html);
      total += buffer.length;
      files.push({ name: `mesure-${i}.html`, mimeType: "text/html", buffer });
    }
    await page.getByLabel("Fichiers HTML à importer").setInputFiles(files);
    await page
      .getByRole("button", { name: "Enregistrer dans ma bibliothèque" })
      .click();
    await page
      .locator(".edition-card")
      .nth(to - 1)
      .waitFor();
    results.push({
      metric: `Import et rendu ${to - from} éditions synthétiques (${to} cumulées)`,
      milliseconds: Math.round(performance.now() - at),
    });
  }
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Rechercher", exact: true })
    .click();
  at = performance.now();
  await page
    .getByLabel("Rechercher dans tous les journaux")
    .fill("Performance synthétique 99");
  await page.locator(".result-row").waitFor();
  results.push({
    metric: "Recherche dans 100 éditions",
    milliseconds: Math.round(performance.now() - at),
  });
  const storage = await page.evaluate(() => navigator.storage.estimate());
  results.push(
    { metric: "Originaux synthétiques importés", bytes: total },
    { metric: "Stockage site estimé après 100 éditions", bytes: storage.usage },
  );
  fs.mkdirSync("docs/evidence", { recursive: true });
  fs.writeFileSync(
    "docs/evidence/performance.json",
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        environment:
          "Chromium local sur Mac, aucune simulation de CPU téléphone",
        results,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
