// Local-only, synthetic browser benchmark. Run against an already built preview.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const [url, output] = process.argv.slice(2);
if (!url || new URL(url).hostname !== "127.0.0.1" || !output)
  throw Error(
    "Usage: node scripts/measure-future-atlas.mjs http://127.0.0.1:PORT output-directory",
  );
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const width of [1440, 768, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
    });
    const page = await context.newPage();
    await page.route("**/*", (route) =>
      new URL(route.request().url()).hostname === "127.0.0.1"
        ? route.continue()
        : route.abort(),
    );
    await page.addInitScript(() => {
      window.__atlasMetrics = { cls: 0, lcp: null };
      try {
        new PerformanceObserver((list) => {
          for (const e of list.getEntries())
            if (!e.hadRecentInput) window.__atlasMetrics.cls += e.value;
        }).observe({ type: "layout-shift", buffered: true });
        new PerformanceObserver((list) => {
          window.__atlasMetrics.lcp = list.getEntries().at(-1)?.startTime;
        }).observe({ type: "largest-contentful-paint", buffered: true });
      } catch {
        /* browser support is reported */
      }
    });
    await page.goto(url);
    await page
      .getByLabel("Fichiers HTML à importer")
      .setInputFiles(
        resolve("public/examples/future/EXEMPLE_FUTUR_IA_v1.json"),
      );
    await page.getByRole("button", { name: /Importer \d+ fichier/ }).click();
    await page.locator(".future-title").waitFor();
    const toast = page.getByRole("button", {
      name: "Fermer la notification",
      exact: true,
    });
    if (await toast.isVisible()) await toast.click();
    const nav = async (name) => {
      const surface = (await page.locator(".sidebar").isVisible())
        ? ".sidebar"
        : ".mobile-nav";
      await page
        .locator(surface)
        .getByRole("button", { name, exact: true })
        .click();
    };
    const cdp = await context.newCDPSession(page);
    await cdp.send("Performance.enable");
    const getCPU = async () =>
      (await cdp.send("Performance.getMetrics")).metrics.find(
        (m) => m.name === "TaskDuration",
      )?.value;
    const entryMs = [],
      detailMs = [];
    const cpuStart = await getCPU();
    for (let i = 0; i < 5; i++) {
      await nav("Bibliothèque");
      const start = performance.now();
      await nav("Le Futur");
      await page.locator(".future-title").waitFor();
      entryMs.push(performance.now() - start);
      const detailStart = performance.now();
      await page.locator(".future-title").click();
      await page.locator(".future-detail h2").first().waitFor();
      detailMs.push(performance.now() - detailStart);
      await page.getByRole("button", { name: "← Tous les dossiers" }).click();
    }
    await page.screenshot({
      path: output + "/home-" + width + ".png",
      fullPage: true,
    });
    await page.locator(".future-title").click();
    await page.locator(".future-detail h2").first().waitFor();
    await page.screenshot({
      path: output + "/detail-" + width + ".png",
      fullPage: true,
    });
    const scroll = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const samples = [];
          let previous, started;
          const initialY = window.scrollY;
          const tick = (at) => {
            if (previous !== undefined) {
              samples.push(at - previous);
              window.scrollBy(0, 110);
            } else started = at;
            previous = at;
            if (samples.length === 40) {
              const distancePx = window.scrollY - initialY;
              window.scrollTo(0, 0);
              resolve({
                frames: samples,
                distancePx,
                durationMs: at - started,
              });
            } else requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }),
    );
    const metrics = await page.evaluate(() => ({
      paint: window.__atlasMetrics,
      heap: performance.memory?.usedJSHeapSize ?? null,
      resources: performance
        .getEntriesByType("resource")
        .filter((r) => /\.(js|css)(\?|$)/.test(r.name))
        .map((r) => ({
          name: new URL(r.name).pathname,
          transferSize: r.transferSize,
          decodedBodySize: r.decodedBodySize,
        })),
      overflow: document.documentElement.scrollWidth > innerWidth,
    }));
    results.push({
      width,
      entryMs,
      detailMs,
      taskDurationSeconds: (await getCPU()) - cpuStart,
      heapUsedBytes:
        (await cdp.send("Performance.getMetrics")).metrics.find(
          (m) => m.name === "JSHeapUsedSize",
        )?.value ?? null,
      scrollFramesMs: scroll.frames,
      scrollDistancePx: scroll.distancePx,
      scrollDurationMs: scroll.durationMs,
      scrollPixelsPerSecond: (scroll.distancePx / scroll.durationMs) * 1000,
      ...metrics,
    });
    await context.close();
  }
  await writeFile(
    output + "/browser-performance.json",
    JSON.stringify(
      {
        environment:
          "Chromium headless, synthetic example, 5 warm navigations, 40 scripted scroll frames; not a phone or user study. LCP/CLS describe initial shell, not the SPA tab. Heap includes browser context, not screen-only memory.",
        results,
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser.close();
}
