import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const [url, output] = process.argv.slice(2);
if (!url || new URL(url).hostname !== "127.0.0.1" || !output)
  throw Error("Localhost et dossier de sortie requis");
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
        viewport: { width, height: 1000 },
      }),
      page = await context.newPage();
    let externalRequests = 0;
    await page.route("**/*", (route) => {
      if (new URL(route.request().url()).hostname !== "127.0.0.1") {
        externalRequests++;
        return route.abort();
      }
      return route.continue();
    });
    await page.addInitScript(() => {
      window.__v7Paint = { lcp: null, cls: 0 };
      try {
        new PerformanceObserver((list) => {
          window.__v7Paint.lcp = list.getEntries().at(-1).startTime;
        }).observe({ type: "largest-contentful-paint", buffered: true });
        new PerformanceObserver((list) => {
          for (const e of list.getEntries())
            if (!e.hadRecentInput) window.__v7Paint.cls += e.value;
        }).observe({ type: "layout-shift", buffered: true });
      } catch {}
    });
    await page.goto(url);
    await page
      .getByRole("button", {
        name: "Essayer avec 2 éditions démo",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", {
        name: "Enregistrer dans ma bibliothèque",
        exact: true,
      })
      .click();
    await page.locator(".edition-card").first().waitFor();
    const nav = async (label) => {
      await page
        .locator(
          (await page.locator(".sidebar").isVisible())
            ? ".sidebar"
            : ".mobile-nav",
        )
        .getByRole("button", { name: label, exact: true })
        .click();
    };
    const cdp = await context.newCDPSession(page);
    await cdp.send("Performance.enable");
    const metric = async (key) =>
      (await cdp.send("Performance.getMetrics")).metrics.find(
        (m) => m.name === key,
      )?.value;
    const entryMs = [],
      cpuStart = await metric("TaskDuration");
    for (let i = 0; i < 5; i++) {
      await nav("Bibliothèque");
      const start = performance.now();
      await nav("Aujourd’hui");
      await page.locator(".edition-card").first().waitFor();
      entryMs.push(performance.now() - start);
    }
    const scroll = await page.evaluate(
      () =>
        new Promise((resolve) => {
          let before;
          const samples = [];
          const startY = scrollY;
          function tick(at) {
            if (before !== undefined) {
              samples.push(at - before);
              scrollBy(0, 110);
            }
            before = at;
            if (samples.length === 40) {
              const distance = scrollY - startY;
              scrollTo(0, 0);
              resolve({ samples, distancePx: distance });
            } else requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        }),
    );
    const close = page.getByRole("button", {
      name: "Fermer la notification",
      exact: true,
    });
    if (await close.isVisible()) await close.click();
    await page.screenshot({
      path: output + "/today-" + width + ".png",
      fullPage: false,
    });
    const cpuEnd = await metric("TaskDuration");
    await cdp.send("HeapProfiler.collectGarbage");
    results.push({
      width,
      entryMs,
      entryMedianMs: [...entryMs].sort((a, b) => a - b)[2],
      taskDurationSeconds: cpuEnd - cpuStart,
      heapUsedBytes: await metric("JSHeapUsedSize"),
      paint: await page.evaluate(() => window.__v7Paint),
      scroll,
      externalRequests,
      overflow: await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    });
    await context.close();
  }
  await writeFile(
    output + "/performance.json",
    JSON.stringify(
      {
        environment:
          "Desktop Chromium, resized viewport; five warm navigations with the same two synthetic legacy demos. Heap checkpoint after forced GC, not peak browser memory. Scripted scroll, not a physical phone or user study. Extra dashboard content changes scroll length.",
        results,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    results.map((r) => ({
      width: r.width,
      entryMedianMs: r.entryMedianMs,
      heapUsedBytes: r.heapUsedBytes,
      externalRequests: r.externalRequests,
      overflow: r.overflow,
    })),
  );
} finally {
  await browser.close();
}
