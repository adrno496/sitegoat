import { test, expect, type Locator, type Page } from "@playwright/test";
import { v61HTML } from "../helpers/v61";
import { v643HTML, v643Question, v643Title } from "../helpers/v643";

const entry = "https://www.google.com/ai";
const search = (q: string) =>
  "https://www.google.com/search?" + new URLSearchParams({ hl: "fr", q });
const modal = (page: Page) =>
  page.getByRole("dialog", {
    name: "Ouvrir Google dans votre navigateur ?",
    exact: true,
  });
async function frameUrl(page: Page) {
  return (await (await page
    .locator(".edition-frame")
    .elementHandle())!.contentFrame())!.url();
}
// The floating reader controls may cover the edges: click from the centre.
async function press(target: Locator) {
  await target.evaluate((element) =>
    element.scrollIntoView({ block: "center" }),
  );
  await target.click();
}
async function importHTML(page: Page, name: string, html: string) {
  await page.getByLabel("Fichiers HTML à importer").setInputFiles({
    name,
    mimeType: "text/html",
    buffer: Buffer.from(html),
  });
  await page
    .getByRole("button", {
      name: "Enregistrer dans ma bibliothèque",
      exact: true,
    })
    .click();
}
async function read(page: Page, html: string, title: string) {
  await page.goto("/");
  await importHTML(page, "synthetique.html", html);
  await page
    .getByRole("button", { name: `Lire ${title}`, exact: true })
    .click();
  await expect(page.locator(".edition-frame")).toHaveAttribute(
    "sandbox",
    "allow-scripts",
  );
  const child = page.frameLocator(".edition-frame");
  await expect(child.locator("#editionData")).toBeAttached();
  return child;
}
let requests: string[];
test.beforeEach(async ({ context }) => {
  requests = [];
  await context.route("https://www.google.com/**", (route) => {
    requests.push(route.request().url());
    return route.fulfill({
      contentType: "text/html",
      body: "<title>Google simulé</title>",
    });
  });
});

test("6.4.3 : le lien Mode IA d’un article ouvre la confirmation PWA avec sa question, puis Google Mode IA et la recherche Google", async ({
  page,
  context,
}) => {
  const child = await read(page, v643HTML(), v643Title);
  await press(child.locator("#story-article-2 .google-ai-open"));
  await expect(modal(page)).toBeVisible();
  await expect(modal(page).getByRole("textbox")).toHaveValue(v643Question(2));
  expect(requests).toEqual([]);
  expect(context.pages()).toHaveLength(1);
  expect(await frameUrl(page)).toBe("about:srcdoc");
  const ai = context.waitForEvent("page");
  await modal(page)
    .getByRole("button", { name: "Ouvrir Google Mode IA", exact: true })
    .click();
  const aiPage = await ai;
  await aiPage.waitForLoadState("domcontentloaded");
  expect(aiPage.url()).toBe(entry);
  expect(await aiPage.evaluate(() => opener === null)).toBe(true);
  await aiPage.close();
  const searched = context.waitForEvent("page");
  await modal(page)
    .getByRole("button", { name: "Rechercher sur Google", exact: true })
    .click();
  const searchPage = await searched;
  await searchPage.waitForLoadState("domcontentloaded");
  expect(searchPage.url()).toBe(search(v643Question(2)));
  await searchPage.close();
  expect(requests).toEqual([entry, search(v643Question(2))]);
  // No navigation of the journal frame: no grey error page in the reader.
  expect(await frameUrl(page)).toBe("about:srcdoc");
  await page.screenshot({
    path: test.info().outputPath("v643-google-confirmation.png"),
  });
});

test("6.4.3 : « En savoir plus » reste local et le lien de l’approfondissement reprend la question affichée", async ({
  page,
}) => {
  const child = await read(page, v643HTML(), v643Title);
  await press(child.locator('button[data-topic="axdia"]'));
  await expect(modal(page)).toBeHidden();
  await expect(child.locator("#deepQuestion")).toHaveValue(
    "Question publique synthétique de dossier deux : sélection de texte sur mobile.",
  );
  await press(child.locator('button[data-article="article-1"]'));
  await expect(child.locator("#deepQuestion")).toHaveValue(
    "Question publique synthétique 1 :\n isolation des cadres HTML ?",
  );
  await press(child.locator("#approfondir .google-ai-open"));
  await expect(modal(page).getByRole("textbox")).toHaveValue(v643Question(1));
  expect(requests).toEqual([]);
  expect(await frameUrl(page)).toBe("about:srcdoc#approfondir");
});

test("lien Mode IA sans question : la confirmation s’ouvre quand même et Google Mode IA reste disponible", async ({
  page,
  context,
}) => {
  const child = await read(page, v643HTML(), v643Title);
  await press(child.locator("#approfondir .google-ai-open"));
  await expect(modal(page)).toBeVisible();
  await expect(modal(page).getByRole("textbox")).toHaveValue("");
  await expect(
    modal(page).getByRole("button", {
      name: "Rechercher sur Google",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(
    modal(page).getByRole("button", {
      name: "Copier la question",
      exact: true,
    }),
  ).toBeDisabled();
  const ai = context.waitForEvent("page");
  await modal(page)
    .getByRole("button", { name: "Ouvrir Google Mode IA", exact: true })
    .click();
  const aiPage = await ai;
  await aiPage.waitForLoadState("domcontentloaded");
  expect(aiPage.url()).toBe(entry);
  await aiPage.close();
  await expect(
    modal(page).getByRole("link", {
      name: "Ouvrir directement Google Mode IA",
      exact: true,
    }),
  ).toHaveAttribute("href", entry);
  expect(requests).toEqual([entry]);
});

test("6.4 à fenêtre (6.4.1) : « En savoir plus » ouvre directement la confirmation PWA, la fenêtre du journal reste fermée", async ({
  page,
}) => {
  const child = await read(
    page,
    v61HTML({ schemaVersion: "6.4" }),
    "Compatibilité V6.1 synthétique",
  );
  await press(child.locator('button[data-article="a3"]'));
  await expect(modal(page).getByRole("textbox")).toHaveValue(
    "Question publique synthétique 3",
  );
  expect(
    await child
      .locator("#googleDialog")
      .evaluate((dialog: HTMLDialogElement) => dialog.open),
  ).toBe(false);
  expect(requests).toEqual([]);
});

test("doublon exact réimporté : le dernier import remplace l’ancienne copie, une seule édition reste", async ({
  page,
}) => {
  await page.goto("/");
  await importHTML(
    page,
    "LE_JOURNAL_360_2026-10-15_EDITION_21H.html",
    v643HTML(),
  );
  await expect(page.locator(".day-card")).toHaveCount(1);
  await page.getByLabel("Fichiers HTML à importer").setInputFiles({
    name: "copie.html",
    mimeType: "text/html",
    buffer: Buffer.from(v643HTML()),
  });
  const dialog = page.getByRole("dialog", { name: "Vérifier l’import" });
  await expect(dialog).toContainText("Doublon exact");
  await expect(dialog).toContainText("remplacera l’ancienne copie");
  await expect(
    dialog.getByRole("combobox", { name: "Conservation", exact: true }),
  ).toHaveValue("day");
  await dialog
    .getByRole("button", {
      name: "Enregistrer dans ma bibliothèque",
      exact: true,
    })
    .click();
  await expect(page.locator(".toast")).toContainText(
    "1 édition importée · 1 ancienne copie remplacée.",
  );
  await expect(page.locator(".day-card")).toHaveCount(1);
  await expect(page.locator(".edition-card")).toHaveCount(1);
});
