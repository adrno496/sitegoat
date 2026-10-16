import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { v643HTML } from "../helpers/v643";

async function nav(page: Page) {
  const navigation = page.locator(
    (await page.locator(".sidebar").isVisible()) ? ".sidebar" : ".mobile-nav",
  );
  await navigation
    .getByRole("button", { name: "Articles", exact: true })
    .click();
}
async function importHTML(page: Page, extra: Record<string, unknown> = {}) {
  await page.getByLabel("Fichiers HTML à importer").setInputFiles({
    name: "veille.html",
    mimeType: "text/html",
    buffer: Buffer.from(v643HTML(extra)),
  });
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
test("articles : import, filtres, lecture, sources, favoris, retour du journal et persistance", async ({
  page,
}) => {
  await page.goto("/");
  await nav(page);
  await expect(
    page.getByRole("heading", { name: "Vos articles, réunis ici." }),
  ).toBeVisible();
  await importHTML(page);
  await importHTML(page, {
    title: "Seconde veille",
    editionDate: "2026-10-16",
    items: [
      {
        id: "energy",
        title: "Transition électrique",
        category: "Énergie",
        plain: "Analyse renouvelable distincte",
        sources: [],
      },
    ],
  });
  await nav(page);
  await expect(page.locator(".article-card")).toHaveCount(4);
  await page.getByLabel("Rechercher un article").fill("ELECTRIQUE");
  await expect(page.locator(".article-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Effacer les filtres" }).click();
  await page
    .getByRole("combobox", { name: "Rubrique", exact: true })
    .selectOption("Science");
  await expect(page.locator(".article-card")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Article synthétique 1", exact: true })
    .click();
  await expect(page.locator(".article-detail")).toContainText(
    "Texte synthétique sans donnée privée.",
  );
  await expect(page.locator(".article-sources a")).toHaveAttribute(
    "href",
    "https://example.com/source-1",
  );
  await page
    .getByRole("button", { name: "Article suivant", exact: true })
    .click();
  await expect(page.locator(".article-detail h2")).toHaveText(
    "Article synthétique 2",
  );
  await page.getByRole("button", { name: "Favori", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Favori", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Marquer comme lu", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ouvrir le journal d’origine", exact: true })
    .click();
  await expect(page.locator(".edition-frame")).toBeVisible();
  await page
    .locator(".reading-surface")
    .getByRole("button", { name: "Retour aux articles", exact: true })
    .click();
  await expect(page.locator(".article-detail h2")).toHaveText(
    "Article synthétique 2",
  );
  await expect(
    page.getByRole("combobox", { name: "Rubrique", exact: true }),
  ).toHaveValue("Science");
  await page
    .getByRole("button", { name: "Retour aux articles", exact: true })
    .click();
  await page.getByLabel("État de lecture").selectOption("favorite");
  await expect(page.locator(".article-card")).toHaveCount(1);
  await page.reload();
  await nav(page);
  await page.getByLabel("État de lecture").selectOption("read");
  await expect(page.locator(".article-card")).toHaveCount(1);
  await expect(page.locator(".article-card h2")).toHaveText(
    "Article synthétique 2",
  );
  expect(
    (await new AxeBuilder({ page }).include(".articles-view").analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({
    path: test.info().outputPath("articles.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("articles : pagination et recherche dans tout l’index", async ({
  page,
}) => {
  await page.goto("/");
  await importHTML(page, {
    items: Array.from({ length: 35 }, (_, i) => ({
      id: `item-${i}`,
      title: `Sujet ${i + 1}`,
      category: "Science",
      plain: `Contenu du sujet ${i + 1}`,
      sources: [],
    })),
  });
  await nav(page);
  await expect(page.locator(".article-card")).toHaveCount(30);
  await page
    .getByRole("button", { name: "Page suivante", exact: true })
    .click();
  await expect(page.locator(".article-card")).toHaveCount(5);
  await page.getByLabel("Rechercher un article").fill("Sujet 35");
  await expect(page.locator(".article-card")).toHaveCount(1);
  await expect(page.locator(".article-card h2")).toHaveText("Sujet 35");
});
