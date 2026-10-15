import { test, expect, type Page } from "@playwright/test";
import { v61HTML, v61Sections } from "../helpers/v61";
async function setup(page: Page) {
  await page.goto("/");
  await page.getByLabel("Fichiers HTML à importer").setInputFiles({
    name: "synthetic-v61.html",
    mimeType: "text/html",
    buffer: Buffer.from(v61HTML()),
  });
  await expect(
    page.getByRole("dialog", { name: "Vérifier l’import" }),
  ).not.toContainText("version inconnue");
  await page
    .getByRole("button", {
      name: "Enregistrer dans ma bibliothèque",
      exact: true,
    })
    .click();
  await expect(page.locator(".day-card")).toHaveCount(1);
  await page
    .getByRole("button", {
      name: "Lire Compatibilité V6.1 synthétique",
      exact: true,
    })
    .click();
  await expect(page.locator(".edition-frame")).toHaveAttribute(
    "sandbox",
    "allow-scripts",
  );
  return page.frameLocator(".edition-frame");
}
const dialog = (page: Page) =>
  page.getByRole("dialog", {
    name: "Ouvrir Google Mode IA dans votre navigateur ?",
  });
test("V6.1 : les treize ancres conservent le document, le JS, les thèmes et les filtres", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.name));
  const frame = await setup(page);
  await frame.locator("#counter").click();
  for (const id of v61Sections) {
    await frame.locator(`nav a[href="#${id}"]`).click();
    await expect(frame.locator("#editionData")).toHaveCount(1);
    await expect(frame.locator("#counter")).toHaveText("1");
    expect(await frame.locator("body").evaluate(() => location.href)).toBe(
      `about:srcdoc#${id}`,
    );
  }
  await frame.locator("#custom-link").click();
  await expect(frame.locator("body")).toHaveAttribute("data-custom", "done");
  expect(await frame.locator("body").evaluate(() => location.hash)).toBe(
    "#method",
  );
  await frame.locator("#counter").click();
  await expect(frame.locator("#counter")).toHaveText("2");
  for (const mode of ["light", "dark"])
    for (const accent of ["red", "blue", "green", "purple"]) {
      await frame.locator("#mode").selectOption(mode);
      await frame.locator("#accent").selectOption(accent);
      await expect(frame.locator("html")).toHaveAttribute("data-mode", mode);
      await expect(frame.locator("html")).toHaveAttribute(
        "data-accent",
        accent,
      );
    }
  await frame.locator("#q").fill("aucun-résultat-de-test");
  await expect(frame.locator("#results")).toHaveText("0 résultat(s)");
  await frame.locator("#q").fill("");
  await frame.locator("#cat").selectOption("Science");
  await expect(frame.locator("#results")).toHaveText("4 résultat(s)");
  await frame.locator("#cat").selectOption("");
  await expect(frame.locator("#results")).toHaveText("9 résultat(s)");
  expect(errors).toEqual([]);
  await expect(page.locator(".edition-frame")).toHaveAttribute(
    "sandbox",
    "allow-scripts",
  );
});
test("V6.1 : onze boutons sans ancien marquage demandent confirmation, copie et entrée Google seule", async ({
  page,
  context,
}) => {
  const outgoing: string[] = [];
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          (window as unknown as { copied: string }).copied = text;
        },
      },
    }),
  );
  await context.route("https://www.google.com/**", async (route) => {
    outgoing.push(route.request().url());
    await route.fulfill({
      body: "<title>Google simulé</title>",
      contentType: "text/html",
    });
  });
  const frame = await setup(page);
  const buttons = frame.locator("[data-article],[data-topic]");
  await expect(buttons).toHaveCount(11);
  for (let i = 0; i < 11; i++) {
    const question = await buttons.nth(i).getAttribute("data-ai-question");
    await buttons.nth(i).click();
    await expect(dialog(page)).toBeVisible();
    await expect(dialog(page).getByRole("textbox")).toHaveValue(question!);
    expect(
      await frame
        .locator("#googleDialog")
        .evaluate((e: HTMLDialogElement) => e.open),
    ).toBe(false);
    expect(outgoing).toEqual([]);
    await dialog(page)
      .getByRole("button", { name: "Copier la question", exact: true })
      .click();
    await expect(dialog(page)).toContainText("Question copiée");
    expect(
      await page.evaluate(
        () => (window as unknown as { copied: string }).copied,
      ),
    ).toBe(question);
    await dialog(page)
      .getByRole("button", { name: "Annuler", exact: true })
      .click();
  }
  await buttons.first().click();
  const popup = context.waitForEvent("page");
  await dialog(page)
    .getByRole("button", { name: "Ouvrir Google Mode IA", exact: true })
    .click();
  const opened = await popup;
  await opened.waitForLoadState("domcontentloaded");
  expect(opened.url()).toBe("https://www.google.com/ai");
  expect(outgoing).toEqual(["https://www.google.com/ai"]);
  expect(
    await opened.evaluate(() => opener === null && document.referrer === ""),
  ).toBe(true);
  await opened.close();
});
test("V6.1 : ancres sans JS, questions parent puis retour interactif et rechargement conservent le pont", async ({
  page,
}) => {
  let frame = await setup(page);
  await page
    .getByRole("button", { name: "Désactiver JS", exact: true })
    .click();
  await expect(page.locator(".edition-frame")).toHaveAttribute("sandbox", "");
  await expect(frame.locator("script")).toHaveCount(0);
  for (const id of ["articles", "sentinel", "method"]) {
    await frame.locator(`nav a[href="about:srcdoc#${id}"]`).click();
    await expect(frame.locator("#index")).toHaveCount(1);
    expect(await frame.locator("body").evaluate(() => location.href)).toBe(
      `about:srcdoc#${id}`,
    );
  }
  await page
    .getByText("Questions Google disponibles (11)", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Préparer la question 1", exact: true })
    .click();
  await expect(dialog(page)).toBeVisible();
  await dialog(page)
    .getByRole("button", { name: "Annuler", exact: true })
    .click();
  await page.getByRole("button", { name: "Interactif", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Je fais confiance à ce fichier",
      exact: true,
    })
    .click();
  await expect(page.locator(".edition-frame")).toHaveAttribute(
    "sandbox",
    "allow-scripts",
  );
  for (let i = 0; i < 2; i++) {
    frame = page.frameLocator(".edition-frame");
    await frame.locator("[data-article]").first().click();
    await expect(dialog(page)).toBeVisible();
    await dialog(page)
      .getByRole("button", { name: "Annuler", exact: true })
      .click();
    if (i === 0)
      await page
        .getByRole("button", { name: "Recharger le HTML", exact: true })
        .click();
  }
});
