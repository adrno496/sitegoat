import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { auditBytes, auditPayload, auditLoadPayload } from "../helpers/audit";
import { summaryPreview } from "../../src/features/eventPresentation";
import type { UnifiedEdition } from "../../src/data/unified";
const w = (page: Page) => page.locator(".unified-workspace");
async function nav(page: Page, name: string) {
  await page
    .locator(
      (await page.locator(".sidebar").isVisible()) ? ".sidebar" : ".mobile-nav",
    )
    .getByRole("button", { name, exact: true })
    .click();
}
async function add(page: Page, hour: "08" | "10") {
  await page.getByLabel("Fichiers HTML à importer").setInputFiles({
    name: `audit-${hour}.html`,
    mimeType: "text/html",
    buffer: auditBytes(hour),
  });
  await page
    .getByRole("button", {
      name: "Enregistrer dans ma bibliothèque",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const close = page.getByRole("button", {
    name: "Fermer la notification",
    exact: true,
  });
  if (await close.isVisible()) await close.click();
}
function payload(hour: "08" | "10"): UnifiedEdition {
  if (!process.env.SITEGOAT_AUDIT_REAL_DIR) return auditPayload(hour);
  return JSON.parse(
    auditBytes(hour)
      .toString()
      .match(
        /<script[^>]*id=["']unifiedData["'][^>]*>([\s\S]*?)<\/script>/i,
      )![1],
  );
}
async function readyOffline(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
}
test("Audit P0/P1 : 10 h seul offline, huit cartes, résumés, fiches intégrales et trois Markdown exacts", async ({
  page,
  context,
}, info) => {
  await page.goto("/");
  await readyOffline(page);
  await context.setOffline(true);
  await add(page, "10");
  await nav(page, "Aujourd’hui");
  const p = payload("10"),
    root = w(page);
  await expect(root.locator(".event-card")).toHaveCount(8);
  await expect(root.locator(".unified-lead h2")).toContainText("10:00");
  await expect(root.locator(".unified-slots button").first()).toBeDisabled();
  await root
    .getByLabel("Première apparition", { exact: true })
    .selectOption("08:00");
  await expect(root.locator(".event-card")).toHaveCount(4);
  await expect(root.locator(".unified-lead h2")).toContainText("10:00");
  await root
    .getByLabel("Première apparition", { exact: true })
    .selectOption("");
  for (const i of p.items) {
    const card = root.locator(`[data-event-id="${i.eventId}"]`);
    await expect(card.locator(".event-preview")).toHaveText(
      summaryPreview(i.summary),
    );
    await card.getByRole("button", { name: i.title, exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(
      card.getByRole("button", { name: i.title, exact: true }),
    ).toHaveAttribute("aria-expanded", "true");
    await expect(card.locator(".event-summary")).toHaveText(i.summary);
    await card
      .getByRole("button", { name: "Lire l’article complet", exact: true })
      .click();
    const full = card.getByRole("region", {
      name: `Article complet : ${i.title}`,
      exact: true,
    });
    await expect(full).toBeVisible();
    await expect(full).toContainText(i.plain);
    await expect(full).toContainText(i.detail);
    await card.getByRole("button", { name: "Réduire", exact: true }).click();
    await expect(card.locator(".event-preview")).toBeVisible();
    await expect(
      card.getByRole("button", { name: i.title, exact: true }),
    ).toBeFocused();
  }
  await root.getByRole("button", { name: "Économie", exact: true }).click();
  await expect(root.locator(".economic-reading")).toHaveCount(4);
  await root
    .getByRole("button", { name: "Chronologie IA", exact: true })
    .click();
  await expect(root.locator(".unified-insights>article")).toHaveCount(6);
  await root
    .getByRole("button", { name: "Mes prompts .md", exact: true })
    .click();
  await root.locator(".unified-result").first().click();
  await expect(root.locator(".prompt-card")).toHaveCount(3);
  for (const [n, pm] of p.promptAssets.entries()) {
    const card = root.locator(".prompt-card").nth(n);
    await card
      .getByText("Voir et sélectionner le prompt complet", { exact: true })
      .click();
    await expect(card.locator("textarea")).toHaveValue(pm.content);
    const d = page.waitForEvent("download");
    await card
      .getByRole("button", {
        name: "Télécharger le prompt VS Code (.md)",
        exact: true,
      })
      .click();
    expect(await readFile((await (await d).path())!, "utf8")).toBe(pm.content);
  }
  await root
    .getByRole("button", { name: "Aujourd’hui en bref", exact: true })
    .click();
  await page.screenshot({
    path: info.outputPath("audit-today.png"),
    fullPage: true,
  });
});
test("Audit P0 : créneaux exacts, retour même filtre/position, historique navigateur et rechargement", async ({
  page,
}) => {
  await page.goto("/");
  await add(page, "10");
  await add(page, "08");
  await add(page, "10");
  await nav(page, "Aujourd’hui");
  const root = w(page);
  await expect(root.locator(".unified-lead h2")).toContainText("10:00");
  await root
    .getByLabel("Première apparition", { exact: true })
    .selectOption("08:00");
  await expect(root.locator(".event-card")).toHaveCount(4);
  await root.locator(".unified-slots button").first().scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => scrollY);
  await root.getByRole("button", { name: /^08:00 · Disponible/ }).click();
  await expect(page.locator(".reader h1")).toHaveText(payload("08").title);
  await page
    .getByRole("button", { name: "Retour à Aujourd’hui", exact: true })
    .click();
  await expect(root).toBeVisible();
  await expect(
    root.getByLabel("Première apparition", { exact: true }),
  ).toHaveValue("08:00");
  await expect
    .poll(() => page.evaluate(() => scrollY))
    .toBeGreaterThanOrEqual(before - 5);
  await root.getByRole("button", { name: /^10:00 · Disponible/ }).click();
  await expect(page.locator(".reader h1")).toHaveText(payload("10").title);
  await page.goBack();
  await expect(root).toBeVisible();
  await page.reload();
  await expect(w(page).locator(".unified-lead h2")).toContainText("10:00");
  await nav(page, "Articles");
  await expect(page.locator(".articles-total")).toContainText("8 articles");
  await nav(page, "Bibliothèque");
  await page
    .getByRole("button", { name: "Historique des éditions", exact: true })
    .click();
  await expect(page.locator(".day-history>article")).toHaveCount(2);
});
test("Audit P1/P2 : profils réversibles, offline, sept largeurs, clavier, contraste et mouvement réduit", async ({
  page,
  context,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await add(page, "10");
  await nav(page, "Réglages");
  const settings = page.locator(".interface-settings");
  await expect(
    settings.getByLabel("Profil d’interface", { exact: true }),
  ).toHaveValue("essential");
  await settings
    .getByLabel("Profil d’interface", { exact: true })
    .selectOption("complete");
  await nav(page, "Aujourd’hui");
  await expect(
    w(page).getByRole("heading", { name: "Les quatre univers", exact: true }),
  ).toBeVisible();
  await nav(page, "Réglages");
  await settings
    .getByLabel("Aperçu du radar économique", { exact: true })
    .uncheck();
  await expect(
    settings.getByLabel("Profil d’interface", { exact: true }),
  ).toHaveValue("custom");
  await settings
    .getByLabel("Sections de navigation secondaires", { exact: true })
    .uncheck();
  await readyOffline(page);
  await context.setOffline(true);
  await page.reload();
  await nav(page, "Réglages");
  await expect(
    settings.getByLabel("Aperçu du radar économique", { exact: true }),
  ).not.toBeChecked();
  await nav(page, "Aujourd’hui");
  await expect(
    w(page).getByRole("heading", {
      name: "Radar économique mondial",
      exact: true,
    }),
  ).toHaveCount(0);
  const navigation = page.locator(
    (await page.locator(".sidebar").isVisible()) ? ".sidebar" : ".mobile-nav",
  );
  await navigation
    .getByRole("button", { name: "Autres espaces", exact: true })
    .click();
  await nav(page, "Sentinel");
  await expect(
    page.getByRole("heading", { name: "Sentinel", exact: true }),
  ).toBeVisible();
  await nav(page, "Réglages");
  await settings
    .getByRole("button", {
      name: "Restaurer l’interface par défaut",
      exact: true,
    })
    .click();
  await nav(page, "Aujourd’hui");
  for (const width of [320, 360, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  const first = w(page).locator(".event-card").first();
  await first.locator(".title-button").focus();
  await page.keyboard.press("Space");
  await first
    .getByRole("button", { name: "Lire l’article complet", exact: true })
    .click();
  for (const dark of [false, true]) {
    if (dark)
      await page
        .getByRole("button", { name: "Activer le mode sombre", exact: true })
        .click();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
  await page.screenshot({
    path: info.outputPath("audit-dark.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: info.outputPath("audit-mobile.png"),
    fullPage: true,
  });
});

test("Audit P2 : import, rendu paginé et recherche de 500 puis 2000 articles synthétiques", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const measures = [];
  for (const count of [500, 2000]) {
    await page.goto("/");
    // Total library load: one 500-item snapshot, then three older 500-item snapshots.
    // A single rich 2000-item JSON exceeds the unchanged 60000-node budget.
    const dates =
      count === 500
        ? ["2026-10-19"]
        : ["2026-10-16", "2026-10-17", "2026-10-18"];
    let htmlBytes = 0;
    const files = dates.map((date) => {
      const p = auditLoadPayload(500, date);
      const json = JSON.stringify(p);
      expect(Buffer.byteLength(json)).toBeLessThanOrEqual(2 * 1024 * 1024);
      const html = `<h1>Charge SYNTHÉTIQUE</h1><script id="unifiedData" type="application/json">${json.replaceAll("<", "\\u003c")}</script>`;
      htmlBytes += Buffer.byteLength(html);
      return {
        name: `load-${date}.html`,
        mimeType: "text/html",
        buffer: Buffer.from(html),
      };
    });
    const started = Date.now();
    await page.getByLabel("Fichiers HTML à importer").setInputFiles(files);
    await expect(
      page.getByRole("button", {
        name: "Enregistrer dans ma bibliothèque",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: "Enregistrer dans ma bibliothèque",
        exact: true,
      })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const imported = Date.now();
    await nav(page, "Aujourd’hui");
    await expect(w(page).locator(".event-card")).toHaveCount(30);
    await expect(
      w(page).getByRole("button", {
        name: new RegExp("Afficher plus d’événements"),
      }),
    ).toBeVisible();
    const rendered = Date.now();
    await nav(page, "Articles");
    await expect(page.locator(".articles-total")).toContainText(
      `${count} articles`,
    );
    await page
      .getByRole("searchbox", { name: "Rechercher un article", exact: true })
      .fill(
        `Charge SYNTHÉTIQUE ${count === 500 ? "2026-10-19" : "2026-10-16"} 499`,
      );
    await expect(page.locator(".articles-grid .event-card")).toHaveCount(1);
    const queried = Date.now();
    measures.push({
      count,
      htmlBytes,
      snapshotsImported: dates.length,
      articlesPerSnapshot: 500,
      importMs: imported - started,
      renderMs: rendered - imported,
      openArticlesAndQueryMs: queried - rendered,
      heap: await page.evaluate(() =>
        "memory" in performance
          ? (performance as unknown as { memory: { usedJSHeapSize: number } })
              .memory.usedJSHeapSize
          : null,
      ),
    });
  }
  await info.attach("capacity.json", {
    body: JSON.stringify(measures, null, 2),
    contentType: "application/json",
  });
});

test("Audit P2 : texte hostile échappé et URL invalide rejetée sans perte", async ({
  page,
}) => {
  await page.goto("/");
  const p = auditPayload("10");
  p.items[0].title =
    '<img src=x onerror="globalThis.auditExecuted=true"> SYNTHÉTIQUE';
  p.items[0].summary =
    "Texte importé <script>globalThis.auditExecuted=true</script>. Seconde phrase. Troisième phrase.";
  const html = (data: unknown) =>
    Buffer.from(
      `<h1>SYNTHÉTIQUE</h1><script id="unifiedData" type="application/json">${JSON.stringify(data).replaceAll("<", "\\u003c")}</script>`,
    );
  await page.getByLabel("Fichiers HTML à importer").setInputFiles({
    name: "escaped.html",
    mimeType: "text/html",
    buffer: html(p),
  });
  await page
    .getByRole("button", {
      name: "Enregistrer dans ma bibliothèque",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await nav(page, "Aujourd’hui");
  const card = w(page).locator(".event-card").filter({ hasText: "<img src=x" });
  await expect(card).toHaveCount(1);
  await expect(card.locator("img,script")).toHaveCount(0);
  expect(
    await page.evaluate(() => Object.hasOwn(globalThis, "auditExecuted")),
  ).toBe(false);
  p.items[0].sourceRecords[0].url = "javascript:alert(1)";
  await page.getByLabel("Fichiers HTML à importer").setInputFiles({
    name: "invalid-url.html",
    mimeType: "text/html",
    buffer: html(p),
  });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(w(page).locator(".event-card")).toHaveCount(8);
  await nav(page, "Articles");
  await expect(page.locator(".articles-total")).toContainText("8 articles");
});
