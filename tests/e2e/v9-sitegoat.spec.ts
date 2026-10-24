import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { interactiveV9Fixture } from "../helpers/v9";

for (const detached of [false, true])
  test(`SG-13 : lien ${detached ? "détaché" : "attaché"}, refus, confirmation, contenu exact et hors ligne`, async ({
    page,
    context,
  }) => {
    await page.route("**/*", (r) =>
      new URL(r.request().url()).hostname === "127.0.0.1"
        ? r.continue()
        : r.abort(),
    );
    const { p, bytes } = interactiveV9Fixture(detached);
    await page.goto("/");
    await page.getByLabel("Fichiers HTML à importer").setInputFiles({
      name: "synthetic.html",
      mimeType: "text/html",
      buffer: bytes,
    });
    await page
      .getByRole("button", {
        name: "Enregistrer dans ma bibliothèque",
        exact: true,
      })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const nav = page.locator(
      (await page.locator(".sidebar").isVisible()) ? ".sidebar" : ".mobile-nav",
    );
    await nav.getByRole("button", { name: "Aujourd’hui", exact: true }).click();
    await page
      .locator(".unified-workspace")
      .getByRole("button", { name: "Lire la dernière édition", exact: true })
      .click();
    await expect(page.locator(".edition-frame")).toHaveAttribute(
      "sandbox",
      "allow-scripts",
    );
    await page.evaluate(() => navigator.serviceWorker.ready);
    await expect
      .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
      .toBe(true);
    await context.setOffline(true);
    let downloads = 0;
    page.on("download", () => downloads++);
    const f = page.frameLocator(".edition-frame");
    await f.locator('[data-panel="prompts"]').click();
    const buttons = f.locator("#promptsList button");
    const dialog = page.getByRole("dialog", {
      name: "Action du document original",
      exact: true,
    });
    await buttons.first().click();
    await expect(dialog).toBeVisible();
    expect(downloads).toBe(0);
    await dialog.getByRole("button", { name: "Annuler", exact: true }).click();
    expect(downloads).toBe(0);
    for (const [n, prompt] of p.promptAssets.entries()) {
      await buttons.nth(n).click();
      await expect(dialog).toBeVisible();
      const d = page.waitForEvent("download");
      await dialog
        .getByRole("button", { name: "Télécharger .md", exact: true })
        .dblclick();
      const dl = await d;
      const content = await readFile((await dl.path())!);
      expect(content.toString("utf8")).toBe(prompt.content);
      expect(createHash("sha256").update(content).digest("hex")).toBe(
        createHash("sha256").update(prompt.content).digest("hex"),
      );
      expect(dl.suggestedFilename()).toBe(prompt.filename);
      await expect(dialog).toHaveCount(0);
    }
    expect(downloads).toBe(p.promptAssets.length);
    // Unknown Blob and forged messages can never initiate a parent download.
    await f.locator("body").evaluate(() => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob(["INCONNU"]));
      a.download = "evil.md";
      a.click();
      parent.postMessage(
        {
          type: "journal360:reader-action:v1",
          hash: "fake",
          revision: 0,
          kind: "prompt",
          value: "fake",
        },
        "*",
      );
    });
    await expect(dialog).toHaveCount(0);
    expect(downloads).toBe(p.promptAssets.length);
  });

test.describe("SG-04 : profil neuf sans confiance mémorisée", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test("choix avant exécution, refus mémorisé et révocable", async ({
    page,
  }) => {
    const { bytes } = interactiveV9Fixture();
    await page.goto("/");
    await page.getByLabel("Fichiers HTML à importer").setInputFiles({
      name: "unknown.html",
      mimeType: "text/html",
      buffer: bytes,
    });
    await page
      .getByRole("button", {
        name: "Enregistrer dans ma bibliothèque",
        exact: true,
      })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const nav = page.locator(
      (await page.locator(".sidebar").isVisible()) ? ".sidebar" : ".mobile-nav",
    );
    await nav.getByRole("button", { name: "Aujourd’hui", exact: true }).click();
    await page
      .locator(".unified-workspace")
      .getByRole("button", { name: "Lire la dernière édition", exact: true })
      .click();
    const trust = page.getByRole("dialog", {
      name: "Activer les interactions ?",
      exact: true,
    });
    await expect(trust).toBeVisible();
    await expect(page.locator(".edition-frame")).toHaveAttribute("sandbox", "");
    await expect(
      page.frameLocator(".edition-frame").locator("#articlesList>article"),
    ).toHaveCount(0);
    await trust
      .getByRole("button", { name: "Rester en mode sécurisé", exact: true })
      .click();
    await expect(trust).toHaveCount(0);
    await page
      .getByRole("button", { name: "Réduire la lecture", exact: true })
      .click();
    await page.getByRole("button", { name: "Interactif", exact: true }).click();
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
    await expect(
      page.frameLocator(".edition-frame").locator("#articlesList>article"),
    ).not.toHaveCount(0);
  });
});

test("SG-02 : minuit Paris et retour au premier plan sans rechargement", async ({
  page,
}) => {
  const { p, bytes } = interactiveV9Fixture();
  await page.clock.install({ time: new Date(`${p.editionDate}T21:59:58Z`) });
  await page.goto("/");
  await page.getByLabel("Fichiers HTML à importer").setInputFiles({
    name: "dated.html",
    mimeType: "text/html",
    buffer: bytes,
  });
  await page
    .getByRole("button", {
      name: "Enregistrer dans ma bibliothèque",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const nav = page.locator(
    (await page.locator(".sidebar").isVisible()) ? ".sidebar" : ".mobile-nav",
  );
  await nav.getByRole("button", { name: "Accueil", exact: true }).click();
  await expect(page.getByText(/Aucune édition reçue aujourd’hui/)).toHaveCount(
    0,
  );
  await page.clock.fastForward(3000);
  await expect(
    page.getByText(/Aucune édition reçue aujourd’hui/),
  ).toBeVisible();
  await page.clock.setSystemTime(new Date(`${p.editionDate}T12:00:00Z`));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByText(/Aucune édition reçue aujourd’hui/)).toHaveCount(
    0,
  );
});

test("SG-08 : deux vrais onglets, ajouts simultanés et conflit sur le même ID", async ({
  page,
  context,
}) => {
  const other = await context.newPage();
  async function open(p: typeof page) {
    await p.goto("/");
    const nav = p.locator(
      (await p.locator(".sidebar").isVisible()) ? ".sidebar" : ".mobile-nav",
    );
    if (
      !(await nav
        .getByRole("button", { name: "Actualité rapide", exact: true })
        .isVisible())
    )
      await nav
        .getByRole("button", { name: "Autres espaces", exact: true })
        .click();
    await nav
      .getByRole("button", { name: "Actualité rapide", exact: true })
      .click();
    await p.getByRole("tab", { name: "Récurrent", exact: true }).click();
  }
  async function prepare(p: typeof page, name: string) {
    await p
      .getByRole("button", { name: "Ajouter une recherche", exact: true })
      .click();
    await p.getByLabel("Thème", { exact: true }).fill(name);
  }
  await open(page);
  await open(other);
  await prepare(page, "TEST_A_SYNTHETIQUE");
  await prepare(other, "TEST_B_SYNTHETIQUE");
  await Promise.all([
    page
      .getByRole("button", { name: "Ajouter la recherche", exact: true })
      .click(),
    other
      .getByRole("button", { name: "Ajouter la recherche", exact: true })
      .click(),
  ]);
  for (const p of [page, other]) {
    await expect(
      p.getByRole("heading", { name: "TEST_A_SYNTHETIQUE", exact: true }),
    ).toBeVisible();
    await expect(
      p.getByRole("heading", { name: "TEST_B_SYNTHETIQUE", exact: true }),
    ).toBeVisible();
  }
  const card = (p: typeof page) =>
    p.locator(".recurring-search-card").filter({
      has: p.getByRole("heading", {
        name: "TEST_A_SYNTHETIQUE",
        exact: true,
      }),
    });
  await card(page)
    .getByRole("button", { name: "Modifier", exact: true })
    .click();
  await card(other)
    .getByRole("button", { name: "Modifier", exact: true })
    .click();
  await page.getByLabel("Thème", { exact: true }).fill("MODIFICATION_A");
  await page
    .getByRole("button", { name: "Enregistrer les modifications", exact: true })
    .click();
  await other.getByLabel("Thème", { exact: true }).fill("MODIFICATION_B");
  await other
    .getByRole("button", { name: "Enregistrer les modifications", exact: true })
    .click();
  await expect(other.getByRole("alert")).toContainText("autre onglet");
  await open(page);
  await expect(
    page.getByRole("heading", { name: "MODIFICATION_A", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "TEST_B_SYNTHETIQUE", exact: true }),
  ).toBeVisible();
  await other.close();
});

test("SG-01/09/14 : filtres accessibles, instants réels et date compacte en lecture", async ({
  page,
}) => {
  const { auditPayload, auditHTML } = await import("../helpers/audit");
  const p = auditPayload("10");
  p.items = p.items.slice(0, 2).map((i, n) => ({
    ...i,
    title: n ? "B_09H_PLUS02_SYNTHETIQUE" : "A_08H_Z_SYNTHETIQUE",
    publishedAt: n ? "2026-10-19T09:00:00+02:00" : "2026-10-19T08:00:00Z",
    evidenceStatus: n ? "hypothesis" : "sourced",
    actions: [],
    relatedEventIds: [],
  }));
  p.synthesis.eventIds = p.items.map((i) => i.eventId);
  p.futureInsights = [];
  p.futureDocuments = [];
  p.promptAssets = [];
  p.economicSnapshots = [];
  await page.goto("/");
  await page.getByLabel("Fichiers HTML à importer").setInputFiles({
    name: "offset.html",
    mimeType: "text/html",
    buffer: auditHTML(p),
  });
  await page
    .getByRole("button", {
      name: "Enregistrer dans ma bibliothèque",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const nav = page.locator(
    (await page.locator(".sidebar").isVisible()) ? ".sidebar" : ".mobile-nav",
  );
  await nav.getByRole("button", { name: "Articles", exact: true }).click();
  const filter = page.locator(".articles-filter-options summary");
  await filter.focus();
  await page.keyboard.press("Enter");
  await page
    .getByLabel("Trier les articles", { exact: true })
    .selectOption("published");
  await expect(page.locator(".article-index-link").first()).toHaveText(
    "A_08H_Z_SYNTHETIQUE",
  );
  await page
    .locator(".articles-grid .event-card")
    .filter({ hasText: "B_09H_PLUS02_SYNTHETIQUE" })
    .getByRole("button", { name: "Lire l’article complet", exact: true })
    .click();
  await expect(
    page.locator(".article-detail .editorial-metadata time"),
  ).toHaveAttribute("datetime", p.items[1].publishedAt);
  await expect(
    page.locator(".article-detail .editorial-metadata"),
  ).not.toContainText("Publié le");
  await expect(page.locator(".article-detail")).not.toContainText(
    "Statut déclaré par le producteur",
  );
  expect(
    await page
      .locator(".article-detail h2")
      .evaluate((el) => Number(getComputedStyle(el).fontWeight)),
  ).toBeGreaterThanOrEqual(700);
});
