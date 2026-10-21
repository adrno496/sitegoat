import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
const [url, output, requestedCount] = process.argv.slice(2);
const count = requestedCount === undefined ? 200 : Number(requestedCount);
if (!Number.isInteger(count) || count < 20 || count > 1000 || count % 20)
  throw Error("Taille requise : multiple de 20, entre 20 et 1000");
if (!url || new URL(url).hostname !== "127.0.0.1" || !output)
  throw Error("Localhost et fichier de preuve requis");
const template = JSON.parse(
  await readFile("public/examples/future/EXEMPLE_FUTUR_IA_v1.json", "utf8"),
);
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
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Le Futur", exact: true })
    .click();
  const start = performance.now();
  for (let batch = 0; batch < count / 20; batch++) {
    await page.getByLabel("Fichiers HTML à importer").setInputFiles(
      Array.from({ length: 20 }, (_, j) => {
        const i = batch * 20 + j;
        return {
          name: `index-${i}.json`,
          mimeType: "application/json",
          buffer: Buffer.from(
            JSON.stringify({
              ...template,
              documentId: `index-benchmark-${i}`,
              title: `Index synthétique ${count} dossier ${i}`,
            }),
          ),
        };
      }),
    );
    await page.getByRole("button", { name: /Importer \d+ fichier/ }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
  }
  const importMs = performance.now() - start;
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Aujourd’hui", exact: true })
    .click();
  const w = page.locator(".unified-workspace");
  await w
    .getByRole("button", { name: "Recherche globale", exact: true })
    .waitFor();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Performance.enable");
  await cdp.send("HeapProfiler.collectGarbage");
  const get = async (name) =>
    (await cdp.send("Performance.getMetrics")).metrics.find(
      (m) => m.name === name,
    )?.value;
  const heapBefore = await get("JSHeapUsedSize"),
    cpuBefore = await get("TaskDuration"),
    indexStart = performance.now();
  await w
    .getByRole("button", { name: "Recherche globale", exact: true })
    .click();
  await w
    .getByRole("status")
    .filter({ hasText: `${count} résultat(s)` })
    .waitFor();
  const indexEntryMs = performance.now() - indexStart;
  const searchStart = performance.now();
  await w
    .getByLabel("Rechercher partout")
    .fill(`INDEX SYNTHETIQUE ${count} dossier 42`);
  await w.locator(".unified-result").first().waitFor();
  const searchMs = performance.now() - searchStart;
  await cdp.send("HeapProfiler.collectGarbage");
  const result = {
    environment: `Desktop Chromium. ${count} real UI imports of synthetic Future v1 JSON in a disposable browser context; no physical phone. Heap checkpoints after forced GC. No private data.`,
    documents: count,
    importMs,
    indexEntryMs,
    searchMs,
    visibleMatches: await w.locator(".unified-result").count(),
    heapBeforeIndexBytes: heapBefore,
    heapAfterIndexBytes: await get("JSHeapUsedSize"),
    indexAndSearchTaskSeconds: (await get("TaskDuration")) - cpuBefore,
    externalRequests: external,
  };
  if (external) throw Error("Requête externe détectée");
  await writeFile(output, JSON.stringify(result, null, 2) + "\n");
  console.log(result);
  await context.close();
} finally {
  await browser.close();
}
