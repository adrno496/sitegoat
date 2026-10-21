import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { v643HTML, v643Question } from "../helpers/v643";
import { magazineHTML } from "../helpers/magazine";

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
  await page.locator(".articles-filter-options summary").click();
  await page
    .getByRole("combobox", { name: "Rubrique", exact: true })
    .selectOption("Science");
  await expect(page.locator(".article-card")).toHaveCount(3);
  await page
    .getByRole("button", {
      name: "Lire ici : Article synthétique 1",
      exact: true,
    })
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
  await page.locator(".articles-filter-options summary").click();
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
  await expect(
    page
      .getByRole("navigation", { name: "Sommaire des articles" })
      .getByRole("button"),
  ).toHaveCount(30);
  await page
    .getByRole("button", { name: "Page suivante", exact: true })
    .click();
  await expect(page.locator(".article-card")).toHaveCount(5);
  await expect(
    page
      .getByRole("navigation", { name: "Sommaire des articles" })
      .getByRole("button"),
  ).toHaveCount(5);
  await expect(
    page.getByRole("button", {
      name: "Ouvrir dans le journal : Sujet 35",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByLabel("Rechercher un article").fill("Sujet 35");
  await expect(page.locator(".article-card")).toHaveCount(1);
  await expect(page.locator(".article-card h2")).toHaveText("Sujet 35");
});

test("questions Google depuis les articles : question exacte, édition, copie, ouverture volontaire et hors ligne", async ({
  page,
  context,
}) => {
  const requests: string[] = [];
  await context.route("https://www.google.com/**", async (route) => {
    requests.push(route.request().url());
    await route.fulfill({
      contentType: "text/html",
      body: "<title>Google simulé</title>",
    });
  });
  await page.goto("/");
  await importHTML(page);
  await nav(page);
  const question = page.getByRole("button", {
    name: "Question Google : Article synthétique 3",
    exact: true,
  });
  await question.click();
  const dialog = page.getByRole("dialog", {
    name: "Ouvrir Google dans votre navigateur ?",
    exact: true,
  });
  await expect(dialog.getByRole("textbox")).toHaveValue(v643Question(3));
  expect(requests).toEqual([]);
  expect(context.pages()).toHaveLength(1);
  await dialog.getByRole("textbox").fill("Question publique modifiée ?");
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          (window as unknown as { copied: string }).copied = text;
        },
      },
    });
  });
  await dialog
    .getByRole("button", { name: "Copier la question", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { copied: string }).copied),
    )
    .toBe("Question publique modifiée ?");
  const next = context.waitForEvent("page");
  await dialog
    .getByRole("button", { name: "Rechercher sur Google", exact: true })
    .click();
  const external = await next;
  await external.waitForLoadState();
  expect(new URL(external.url()).searchParams.get("q")).toBe(
    "Question publique modifiée ?",
  );
  await external.close();
  const ai = context.waitForEvent("page");
  await dialog
    .getByRole("button", { name: "Ouvrir Google Mode IA", exact: true })
    .click();
  const aiPage = await ai;
  await aiPage.waitForLoadState();
  expect(aiPage.url()).toBe("https://www.google.com/ai");
  await aiPage.close();
  await dialog.getByRole("textbox").fill("token=sk_live_example123");
  await expect(
    dialog.getByRole("button", { name: "Rechercher sur Google", exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole("button", { name: "Ouvrir Google Mode IA", exact: true }),
  ).toBeDisabled();
  await dialog.getByRole("textbox").fill(v643Question(3));
  await context.setOffline(true);
  await dialog
    .getByRole("button", { name: "Rechercher sur Google", exact: true })
    .click();
  await expect(dialog).toContainText("Hors ligne");
  expect(requests).toHaveLength(2);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await context.setOffline(false);
  await page
    .getByRole("button", {
      name: "Lire ici : Article synthétique 2",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: "Question Google : Article synthétique 2",
      exact: true,
    })
    .click();
  await expect(dialog.getByRole("textbox")).toHaveValue(v643Question(2));
  expect(
    (await new AxeBuilder({ page }).include(".google-ai-dialog").analyze())
      .violations,
  ).toEqual([]);
});

test("sommaire : ouvre l’analyse complète dans le HTML dynamique et conserve les questions Google du journal", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Fichiers HTML à importer").setInputFiles({
    name: "magazine.html",
    mimeType: "text/html",
    buffer: Buffer.from(magazineHTML()),
  });
  await page
    .getByRole("button", {
      name: "Enregistrer dans ma bibliothèque",
      exact: true,
    })
    .click();
  const notification = page.getByRole("button", {
    name: "Fermer la notification",
    exact: true,
  });
  if (await notification.isVisible()) await notification.click();
  await nav(page);
  await expect(page.locator(".articles-filter-options")).not.toHaveAttribute(
    "open",
    "",
  );
  const index = page.getByRole("navigation", { name: "Sommaire des articles" });
  await expect(index).toBeVisible();
  await index
    .getByRole("button", {
      name: "Ouvrir dans le journal : Analyse magazine 3",
      exact: true,
    })
    .click();
  const frame = page.frameLocator(".edition-frame");
  await expect(frame.locator("#reader.active #readerBody h1")).toHaveText(
    "Analyse magazine 3",
  );
  await expect(frame.locator("#readerBody")).toContainText(
    "Analyse détaillée 3",
  );
  await expect(page.locator(".edition-frame")).toHaveAttribute(
    "sandbox",
    "allow-scripts",
  );
  await frame
    .locator("#readerBody")
    .evaluate((node) => node.setAttribute("data-runtime-marker", "kept"));
  await page
    .getByRole("button", { name: "Réduire la lecture", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Marquer comme lue", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Marquée lue", exact: true }),
  ).toBeVisible();
  await expect(frame.locator("#readerBody")).toHaveAttribute(
    "data-runtime-marker",
    "kept",
  );
  await page
    .getByRole("button", { name: "Lecture pleine page", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", {
      name: "Ouvrir Google dans votre navigateur ?",
      exact: true,
    }),
  ).toHaveCount(0);
  await frame
    .getByRole("link", { name: "Mode IA avec la question", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Ouvrir Google dans votre navigateur ?",
    exact: true,
  });
  await expect(dialog.getByRole("textbox")).toHaveValue(
    "Question publique magazine 3 ?",
  );
  await dialog.getByRole("button", { name: "Annuler", exact: true }).click();
  await page
    .locator(".reading-surface")
    .getByRole("button", { name: "Retour aux articles", exact: true })
    .click();
  await index
    .getByRole("button", {
      name: "Ouvrir dans le journal : Analyse magazine 1",
      exact: true,
    })
    .click();
  await expect(frame.locator("#reader.active #readerBody h1")).toHaveText(
    "Analyse magazine 1",
  );
  await page
    .getByRole("button", { name: "Réduire la lecture", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Désactiver JS", exact: true })
    .click();
  await expect(page.locator(".edition-frame")).toHaveAttribute("sandbox", "");
  await expect(frame.locator("#journal360-requested-article h1")).toHaveText(
    "Analyse magazine 1",
  );
  await expect(frame.locator("script")).toHaveCount(0);
});

test("sans question préparée : saisie manuelle, sans inventer depuis le titre ou les notes", async ({
  page,
}) => {
  await page.goto("/");
  await importHTML(page, {
    items: [
      {
        id: "manual",
        title: "Titre confidentiel",
        category: "Science",
        plain: "Texte privé",
        sources: [],
      },
    ],
  });
  await nav(page);
  await page
    .getByRole("button", {
      name: "Question Google : Titre confidentiel",
      exact: true,
    })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Ouvrir Google dans votre navigateur ?",
    exact: true,
  });
  await expect(dialog.getByRole("textbox")).toHaveValue("");
  await expect(
    dialog.getByRole("button", { name: "Rechercher sur Google", exact: true }),
  ).toBeDisabled();
  await dialog.getByRole("textbox").fill("Une question publique ?");
  await expect(
    dialog.getByRole("button", { name: "Rechercher sur Google", exact: true }),
  ).toBeEnabled();
});
