import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
const root = "tests/fixtures/v8/";
async function nav(page: Page, name: string) {
  await page
    .locator(
      (await page.locator(".sidebar").isVisible()) ? ".sidebar" : ".mobile-nav",
    )
    .getByRole("button", { name, exact: true })
    .click();
}
async function add(page: Page, hour: string) {
  await page
    .getByLabel("Fichiers HTML à importer")
    .setInputFiles(root + `snapshot-${hour}.html`);
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
const workspace = (page: Page) => page.locator(".unified-workspace");
test("T01/T04/T09/T15 : SEUL fichier 22 h dans une base vide, huit événements et toutes les annexes offline", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await add(page, "22");
  await nav(page, "Articles");
  await expect(page.locator(".articles-total")).toContainText("8 articles");
  for (const letter of "ABCDEFGH")
    await expect(
      page.getByRole("button", {
        name: `Événement ${letter} SYNTHÉTIQUE`,
        exact: true,
      }),
    ).toBeVisible();
  await nav(page, "Aujourd’hui");
  const w = workspace(page);
  await expect(w.locator("[data-autonomy]")).toHaveAttribute(
    "data-autonomy",
    "AUTONOMOUS",
  );
  await expect(w.locator("[data-coverage]")).toHaveAttribute(
    "data-coverage",
    "UNKNOWN",
  );
  await expect(w.locator("[data-history]")).toHaveAttribute(
    "data-history",
    "SINGLE_SNAPSHOT",
  );
  await expect(w).toContainText("1 fichier(s) distinct(s) importé(s)");
  await expect(w).toContainText(
    "Comparaison avec une édition antérieure : NON DISPONIBLE",
  );
  await expect(w).not.toContainText("Créneaux manquants");
  await expect(w.locator(".unified-slots button:enabled")).toHaveCount(1);
  await expect(w.locator(".unified-slots button").first()).toContainText(
    "Non importé (facultatif)",
  );
  for (const zone of ["France", "Europe / zone euro", "États-Unis", "Chine"])
    await expect(
      w.getByRole("heading", { name: zone, exact: true }),
    ).toBeVisible();
  await w.getByRole("button", { name: "Chronologie IA", exact: true }).click();
  await expect(w.locator(".unified-insights>article")).toHaveCount(2);
  await w
    .getByText("Transférer un dossier Future validé", { exact: true })
    .click();
  await w.getByText(/^Dossier embarqué :/).click();
  await expect(w.getByLabel("Contenu intégral du dossier")).toContainText(
    "journal360.future",
  );
  await w
    .getByRole("button", { name: "Recherche globale", exact: true })
    .click();
  for (const query of ["alphav87", "Jalon 2", "NE RIEN CHANGER"]) {
    await w.getByLabel("Rechercher partout").fill(query);
    await expect(w.locator(".unified-result").first()).toBeVisible();
  }
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText("Hors ligne", { exact: true })).toBeVisible();
  await w.getByRole("button", { name: "Mes prompts .md", exact: true }).click();
  await w.locator(".unified-result").first().click();
  await expect(w.locator(".prompt-card")).toHaveCount(2);
  const data = JSON.parse(await readFile(root + "snapshot-22.json", "utf8"));
  for (let i = 0; i < 2; i++) {
    const event = page.waitForEvent("download");
    await w
      .locator(".prompt-card")
      .nth(i)
      .getByRole("button", {
        name: "Télécharger le prompt VS Code (.md)",
        exact: true,
      })
      .click();
    const download = await event;
    expect(await readFile((await download.path())!, "utf8")).toBe(
      data.promptAssets[i].content,
    );
  }
  await context.setOffline(false);
  await nav(page, "Bibliothèque");
  await page
    .getByRole("button", { name: "Historique des éditions", exact: true })
    .click();
  await expect(page.locator(".day-history>article")).toHaveCount(1);
});
test("T02/T03 : un seul 12 h ou 18 h, puis arrivée désordonnée sans rétrogradation", async ({
  page,
}) => {
  await page.goto("/");
  await add(page, "12");
  await nav(page, "Articles");
  await expect(page.locator(".articles-total")).toContainText("3 articles");
  await add(page, "18");
  await nav(page, "Aujourd’hui");
  await expect(workspace(page).locator("[data-autonomy]")).toHaveAttribute(
    "data-autonomy",
    "AUTONOMOUS",
  );
  await nav(page, "Articles");
  await expect(page.locator(".articles-total")).toContainText("6 articles");
  await add(page, "22");
  await add(page, "10");
  await add(page, "18");
  await add(page, "22");
  await nav(page, "Bibliothèque");
  await expect(page.locator(".day-card h3")).toContainText("22:00");
  await expect(page.locator(".day-card [data-coverage]")).toHaveAttribute(
    "data-coverage",
    "UNKNOWN",
  );
  await page
    .getByRole("button", { name: "Historique des éditions", exact: true })
    .click();
  await expect(page.locator(".day-history>article")).toHaveCount(4);
});
test("T16 : snapshot autonome clavier, axe, sept largeurs, zoom CSS 200 %, thèmes et mouvement réduit", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await add(page, "22");
  await nav(page, "Aujourd’hui");
  const w = workspace(page);
  await expect(w.locator(".snapshot-status .small-note").first()).toHaveCSS(
    "font-size",
    "14px",
  );
  for (const width of [320, 360, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.evaluate(() => (document.documentElement.style.zoom = "2"));
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => (document.documentElement.style.zoom = "1"));
  await w.getByRole("button", { name: "Chronologie IA", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(
    w.getByRole("button", { name: "2026", exact: true }),
  ).toBeVisible();
  for (const dark of [false, true]) {
    if (dark)
      await page
        .getByRole("button", { name: "Activer le mode sombre", exact: true })
        .click();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  }
});

test("T05/T06/T07 : omissions réelles avec provenance et conflit de révision visibles", async ({
  page,
}) => {
  await page.goto("/");
  await add(page, "12");
  const p = JSON.parse(await readFile(root + "snapshot-22.json", "utf8"));
  p.items = p.items.filter(
    (i: { eventId: string }) => i.eventId !== "event-v8-C",
  );
  p.synthesis.eventIds = p.items.map((i: { eventId: string }) => i.eventId);
  p.items[0].detail = "Ancienne formulation retentionalpha synthétique";
  p.promptAssets = [];
  p.futureInsights = [];
  p.futureDocuments = [];
  p.economicSnapshots = [];
  const importPayload = async (p: unknown) => {
    const html = `<h1>SYNTHÉTIQUE</h1><script id="unifiedData" type="application/json">${JSON.stringify(p).replaceAll("<", "\\u003c")}</script>`;
    await page.getByLabel("Fichiers HTML à importer").setInputFiles({
      name: "snapshot-22-omitted.html",
      mimeType: "text/html",
      buffer: Buffer.from(html),
    });
    await page
      .getByRole("button", {
        name: "Enregistrer dans ma bibliothèque",
        exact: true,
      })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  };
  await importPayload(p);
  await nav(page, "Aujourd’hui");
  const w = workspace(page);
  await expect(w.locator("[data-autonomy]")).toHaveAttribute(
    "data-autonomy",
    "INCOMPLETE",
  );
  await expect(w).toContainText("Contenu du snapshot incomplet");
  await expect(w).toContainText("event-v8-C");
  await w.getByRole("button", { name: "Mes prompts .md", exact: true }).click();
  await w.locator(".unified-result").first().click();
  await expect(w.locator(".prompt-card")).toHaveCount(2);
  await w.getByRole("button", { name: "Chronologie IA", exact: true }).click();
  await expect(w.locator(".unified-insights>article")).toHaveCount(2);
  await expect(w).toContainText("Original : 12:00");
  await w.getByRole("button", { name: "Économie", exact: true }).click();
  await expect(w.locator(".economic-reading")).toHaveCount(4);
  await w
    .getByRole("button", { name: "Recherche globale", exact: true })
    .click();
  await w.getByLabel("Rechercher partout").fill("alphav82");
  await expect(w.locator(".unified-result")).toHaveCount(1);
  await expect(w.locator(".unified-result")).toContainText("Événement C");
  p.items[0].detail = "Branche concurrente à contrôler";
  await importPayload(p);
  await nav(page, "Aujourd’hui");
  await expect(w).toContainText("contenus concurrents");
  await w
    .getByRole("button", { name: "Recherche globale", exact: true })
    .click();
  await w.getByLabel("Rechercher partout").fill("retentionalpha");
  await expect(w.locator(".unified-result")).toHaveCount(1);
  await expect(w.locator(".unified-result")).toContainText("historique");
  await nav(page, "Bibliothèque");
  await page
    .getByRole("button", { name: "Historique des éditions", exact: true })
    .click();
  await expect(page.locator(".day-history>article")).toHaveCount(3);
});
