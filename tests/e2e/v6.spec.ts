import { readerControl, readerTools } from "../helpers/reader";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { v6Html } from "../helpers/v6";
async function nav(page: Page, label = "Bibliothèque") {
  const back = page.getByRole("button", {
    name: "Retour à la bibliothèque",
    exact: true,
  });
  if (await back.isVisible()) await back.click();
  const mobile = await page.locator(".mobile-nav").isVisible();
  await page
    .locator(mobile ? ".mobile-nav" : ".sidebar")
    .getByRole("button", { name: label, exact: true })
    .click();
}
async function importRevision(
  page: Page,
  revision: number,
  extra: Parameters<typeof v6Html>[0] = {},
) {
  const html = v6Html({ revision, ...extra });
  await page.getByLabel("Fichiers HTML à importer").setInputFiles({
    name: `synthetic-v6-${revision}.html`,
    mimeType: "text/html",
    buffer: Buffer.from(html),
  });
  await expect(
    page.getByRole("dialog", { name: "Vérifier l’import" }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Enregistrer dans ma bibliothèque",
      exact: true,
    })
    .click();
  await expect(page.locator(".import-list")).toHaveCount(0);
  return html;
}
async function openCurrent(page: Page) {
  await page
    .getByRole("button", {
      name: "Lire Journal synthétique du 2026-10-14",
      exact: true,
    })
    .click();
}
async function dialog(page: Page) {
  const modal = page.getByRole("dialog", {
    name: "Ouvrir Google dans votre navigateur ?",
  });
  await expect(modal).toBeVisible();
  return modal;
}

test("V6 : 08→16→21, une carte journée, historique, recherche, original, notes et doublon", async ({
  page,
  context,
}) => {
  await page.goto("/");
  const original8 = await importRevision(page, 1);
  await openCurrent(page);
  await expect(page.locator("iframe")).toHaveAttribute(
    "sandbox",
    "allow-scripts",
  );
  await page
    .getByRole("button", { name: "Réduire la lecture", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ajouter aux favoris", exact: true })
    .click();
  await page
    .getByLabel("Votre note", { exact: true })
    .fill("Note privée de la version 08, jamais envoyée à Google");
  await page
    .getByRole("button", { name: "Enregistrer la note", exact: true })
    .click();
  await expect(page.locator(".note")).toHaveCount(1);
  await nav(page);
  await importRevision(page, 2);
  await importRevision(page, 3);
  await expect(page.locator(".day-card")).toHaveCount(1);
  await expect(page.locator(".day-card")).toContainText("3 version(s)");
  await expect(page.locator(".day-card")).toContainText("CUMUL COMPLETE");
  await page
    .getByRole("button", { name: "Historique des éditions", exact: true })
    .click();
  await expect(page.locator(".day-history article")).toHaveCount(3);
  await expect(page.locator(".day-view")).toContainText(
    "Note privée de la version 08",
  );
  await page
    .getByLabel("Rechercher dans la journée", { exact: true })
    .fill("Article fictif c");
  await expect(page.locator(".day-view")).toContainText("1 résultat(s)");
  await page
    .getByRole("button", { name: "Consulter la révision 1", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Lire cette version", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Réduire la lecture", exact: true })
    .click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Original intact", exact: true })
    .click();
  expect(readFileSync((await (await download).path())!, "utf8")).toBe(
    original8,
  );
  await expect(
    page.getByRole("button", { name: "En favoris", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".note")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Dernière version fiable", exact: true })
    .click();
  await expect(page.locator(".reader")).toContainText("révision externe 3");
  await nav(page);
  await importRevision(page, 3);
  await expect(page.locator(".day-card")).toContainText("3 version(s)");
  // ZIP export and a completely fresh browser database preserve V6 histories.
  await nav(page, "Réglages");
  const zipEvent = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exporter tout", exact: true })
    .click();
  const zip = readFileSync((await (await zipEvent).path())!);
  const fresh = await context.browser()!.newContext();
  const clean = await fresh.newPage();
  await clean.goto(test.info().project.use.baseURL!);
  await nav(clean, "Réglages");
  await clean.getByLabel("Archive ZIP à restaurer").setInputFiles({
    name: "synthetic-v6.zip",
    mimeType: "application/zip",
    buffer: zip,
  });
  await clean
    .getByRole("button", { name: "Fusionner la sauvegarde", exact: true })
    .click();
  await nav(clean);
  await expect(clean.locator(".day-card")).toContainText("3 version(s)");
  await fresh.close();
});

test("V6 : dernière édition affichée malgré les avertissements, historique fiable et nouvelle journée conservés", async ({
  page,
}) => {
  await page.goto("/");
  await importRevision(page, 1);
  await importRevision(page, 2);
  await importRevision(page, 3, { ids: ["c"] });
  await expect(page.locator(".day-card")).toContainText("révision externe 3");
  await expect(page.locator(".day-card")).toContainText(
    "Conflit ou version partielle",
  );
  await importRevision(page, 2, { ids: ["a", "branch"] });
  await expect(page.locator(".day-card")).toContainText("révision externe 3");
  await importRevision(page, 1, { date: "2026-10-15", ids: [] });
  await expect(page.locator(".day-card")).toHaveCount(2);
  await expect(
    page.locator(".day-card").filter({ hasText: "2026-10-15" }),
  ).toContainText("0 éléments indexés");
});

test("V6 : onglets, huit thèmes, image embarquée, zoom jusqu’à 200 %, offline et neuf largeurs", async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  await page.goto("/");
  await importRevision(page, 1);
  await openCurrent(page);
  const frame = page.frameLocator("iframe");
  for (const theme of ["light", "dark"])
    for (const accent of ["red", "blue", "green", "purple"]) {
      await frame
        .getByRole("button", { name: `Thème ${theme}`, exact: true })
        .click();
      await frame
        .getByRole("button", { name: `Accent ${accent}`, exact: true })
        .click();
      await expect(frame.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(frame.locator("html")).toHaveAttribute(
        "data-accent",
        accent,
      );
    }
  expect(
    await frame
      .getByAltText("Pixel de test embarqué")
      .evaluate(
        (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
      ),
  ).toBe(true);
  for (let zoom = 70; zoom < 200; zoom += 10)
    await readerControl(page, "Zoomer le HTML");
  await expect(page.getByLabel("Échelle du HTML", { exact: true })).toHaveText(
    "200 %",
  );
  for (let zoom = 200; zoom > 70; zoom -= 10)
    await readerControl(page, "Dézoomer le HTML");
  for (const width of [320, 360, 390, 430, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("button", { name: "Réduire la lecture", exact: true }),
    ).toBeVisible();
  }
  await page.setViewportSize({ width: 900, height: 430 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await openCurrent(page);
  await expect(
    frame.getByRole("heading", {
      name: "Journal synthétique du 2026-10-14",
      exact: true,
    }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/v6-reader-${test.info().project.name}.png`,
  });
  await context.setOffline(false);
  await nav(page);
  await page
    .getByRole("button", { name: "Historique des éditions", exact: true })
    .click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.setViewportSize({
    width: test.info().project.name === "chromium-mobile" ? 390 : 1440,
    height: 900,
  });
  await page.screenshot({
    path: `test-results/v6-day-${test.info().project.name}.png`,
    fullPage: true,
  });
});

test("V6 : tous les boutons de section, v2 question seule, copie corrigée et entrée Google sans données privées", async ({
  page,
  context,
}) => {
  const opens: string[] = [];
  const copies: string[] = [];
  await page.exposeFunction("capturePublicCopy", (value: string) =>
    copies.push(value),
  );
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: (text: string) =>
          (
            window as unknown as {
              capturePublicCopy: (s: string) => Promise<void>;
            }
          ).capturePublicCopy(text),
      },
    });
  });
  await context.route("https://www.google.com/**", async (route) => {
    opens.push(route.request().url());
    await route.fulfill({
      contentType: "text/html",
      body: "<title>Entrée Google simulée</title>",
    });
  });
  await page.goto("/");
  await importRevision(page, 1);
  await openCurrent(page);
  const frame = page.frameLocator("iframe");
  const content = await (await page
    .locator("iframe")
    .elementHandle())!.contentFrame();
  const reply = await content!.evaluate(
    () =>
      new Promise((resolve) => {
        addEventListener("message", function received(event) {
          if (
            event.source === parent &&
            event.data?.type === "journal360:google-ai:capability"
          ) {
            removeEventListener("message", received);
            resolve(event.data);
          }
        });
        parent.postMessage(
          { type: "journal360:google-ai:capability-request", version: 2 },
          "*",
        );
      }),
  );
  expect(reply).toEqual({
    type: "journal360:google-ai:capability",
    version: 2,
    enabled: true,
    actions: ["copy-question", "open-entry", "open-question"],
    entryUrl: "https://www.google.com/ai",
    maxQuestionLength: 2000,
  });
  for (const section of [
    "À la une",
    "Articles",
    "Business",
    "SENTINEL",
    "AXDIA",
    "Mes décisions",
    "Sources & méthode",
  ]) {
    await frame.getByRole("button", { name: section, exact: true }).click();
    await frame
      .getByRole("link", { name: "En savoir plus", exact: true })
      .click();
    const modal = await dialog(page);
    await expect(
      modal.getByRole("textbox", {
        name: "Question publique à vérifier",
        exact: true,
      }),
    ).toHaveValue(
      `Question publique fictive pour ${section === "SENTINEL" ? "la sécurité logicielle" : section === "AXDIA" ? "les assistants locaux" : section}`,
    );
    expect(opens).toEqual([]);
    await modal.getByRole("button", { name: "Annuler", exact: true }).click();
  }
  await frame
    .getByRole("link", { name: "En savoir plus", exact: true })
    .click();
  const modal = await dialog(page);
  await modal
    .getByRole("textbox", { name: "Question publique à vérifier", exact: true })
    .fill("Question publique corrigée");
  await modal
    .getByRole("button", { name: "Copier la question", exact: true })
    .click();
  await expect(modal).toContainText("Question copiée");
  expect(copies).toEqual(["Question publique corrigée"]);
  expect(opens).toEqual([]);
  const popupEvent = context.waitForEvent("page");
  await modal
    .getByRole("button", { name: "Ouvrir Google Mode IA", exact: true })
    .click();
  const popup = await popupEvent;
  await popup.waitForLoadState("domcontentloaded");
  expect(popup.url()).toBe("https://www.google.com/ai");
  expect(opens).toEqual(["https://www.google.com/ai"]);
  expect(
    await popup.evaluate(
      () => window.opener === null && document.referrer === "",
    ),
  ).toBe(true);
  await expect(
    modal.getByRole("button", { name: "Ouvrir Google Mode IA", exact: true }),
  ).toBeEnabled();
  await popup.close();
});

test("V6 : mode sécurisé, presse-papier refusé, popup bloquée et offline ont un repli manuel", async ({
  page,
  context,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("Permission denied");
        },
      },
    });
  });
  await page.goto("/");
  await importRevision(page, 1);
  await openCurrent(page);
  await readerControl(page, "Désactiver JS");
  await expect(page.locator("iframe")).toHaveAttribute("sandbox", "");
  await readerTools(page);
  await page
    .getByText("Questions Google disponibles (7)", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Préparer la question 1", exact: true })
    .click();
  const modal = await dialog(page);
  await modal
    .getByRole("button", { name: "Copier la question", exact: true })
    .click();
  await expect(modal).toContainText("Copie indisponible");
  await context.setOffline(true);
  await modal
    .getByRole("button", { name: "Ouvrir Google Mode IA", exact: true })
    .click();
  await expect(modal).toContainText("Hors ligne");
  expect(context.pages()).toHaveLength(1);
  await context.setOffline(false);
  await page.evaluate(() => {
    window.open = () => {
      throw new Error("Popup blocked");
    };
  });
  await modal
    .getByRole("button", { name: "Ouvrir Google Mode IA", exact: true })
    .click();
  await expect(modal).toContainText("Ouverture indisponible");
  await expect(
    modal.getByRole("link", {
      name: "Ouvrir directement Google Mode IA",
      exact: true,
    }),
  ).toHaveAttribute("href", "https://www.google.com/ai");
  expect(context.pages()).toHaveLength(1);
});
