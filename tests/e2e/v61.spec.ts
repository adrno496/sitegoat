import { readerControl, readerTools } from "../helpers/reader";
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
test("V6.1 : onze boutons sans ancien marquage demandent confirmation, copie et lancement des onze questions", async ({
  page,
  context,
}) => {
  const outgoing: string[] = [];
  await page.addInitScript(() => {
    const calls: { url: string; active: boolean; features?: string }[] = [];
    (window as unknown as { launchCalls: typeof calls }).launchCalls = calls;
    const original = window.open.bind(window);
    window.open = (url, target, features) => {
      calls.push({
        url: String(url),
        active: navigator.userActivation.isActive,
        features,
      });
      return original(url, target, features);
    };
  });
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
    expect(outgoing).toHaveLength(i);
    await dialog(page)
      .getByRole("button", { name: "Copier la question", exact: true })
      .click();
    await expect(dialog(page)).toContainText("Question copiée");
    expect(
      await page.evaluate(
        () => (window as unknown as { copied: string }).copied,
      ),
    ).toBe(question);
    const query =
      i === 0 ? "Pourquoi le ciel est-il bleu ? + & % # @ 🙂" : question!;
    await dialog(page).getByRole("textbox").fill(query);
    const next = context.waitForEvent("page");
    await dialog(page)
      .getByRole("button", { name: "Lancer la question", exact: true })
      .click();
    const launched = await next;
    await launched.waitForLoadState("domcontentloaded");
    const url = new URL(launched.url());
    expect(url.origin + url.pathname).toBe("https://www.google.com/search");
    expect([...url.searchParams]).toEqual([
      ["hl", "fr"],
      ["udm", "50"],
      ["q", query],
    ]);
    expect(outgoing).toHaveLength(i + 1);
    expect(
      await launched.evaluate(
        () => opener === null && document.referrer === "",
      ),
    ).toBe(true);
    await expect(dialog(page)).toHaveCount(0);
    await launched.close();
  }
  const calls = await page.evaluate(
    () =>
      (
        window as unknown as {
          launchCalls: { url: string; active: boolean; features?: string }[];
        }
      ).launchCalls,
  );
  expect(calls).toHaveLength(11);
  expect(
    calls.every(
      (call) => call.active && call.features === "noopener,noreferrer",
    ),
  ).toBe(true);
  await buttons.first().click();
  const popup = context.waitForEvent("page");
  await dialog(page)
    .getByRole("button", { name: "Ouvrir Google Mode IA", exact: true })
    .click();
  const opened = await popup;
  await opened.waitForLoadState("domcontentloaded");
  expect(opened.url()).toBe("https://www.google.com/ai");
  expect(outgoing).toHaveLength(12);
  expect(outgoing.at(-1)).toBe("https://www.google.com/ai");
  expect(
    await opened.evaluate(() => opener === null && document.referrer === ""),
  ).toBe(true);
  await opened.close();
});
test("V6.1 : ancres sans JS, questions parent puis retour interactif et rechargement conservent le pont", async ({
  page,
}) => {
  let frame = await setup(page);
  await readerControl(page, "Désactiver JS");
  await expect(page.locator(".edition-frame")).toHaveAttribute("sandbox", "");
  await expect(frame.locator("script")).toHaveCount(0);
  for (const id of ["articles", "sentinel", "method"]) {
    await frame.locator(`nav a[href="about:srcdoc#${id}"]`).click();
    await expect(frame.locator("#index")).toHaveCount(1);
    expect(await frame.locator("body").evaluate(() => location.href)).toBe(
      `about:srcdoc#${id}`,
    );
  }
  await readerTools(page);
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
  await readerTools(page);
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
  await page
    .getByRole("button", { name: "Lecture pleine page", exact: true })
    .click();
  for (let i = 0; i < 2; i++) {
    frame = page.frameLocator(".edition-frame");
    await frame.locator("[data-article]").first().click();
    await expect(dialog(page)).toBeVisible();
    await dialog(page)
      .getByRole("button", { name: "Annuler", exact: true })
      .click();
    if (i === 0) await readerControl(page, "Recharger le HTML");
  }
});

test("V6.1 : préremplissage borné, offline et lien de repli conservent la question confirmée", async ({
  page,
  context,
}) => {
  const outgoing: string[] = [];
  await context.route("https://www.google.com/**", async (route) => {
    outgoing.push(route.request().url());
    await route.fulfill({
      contentType: "text/html",
      body: "<title>Google simulé</title>",
    });
  });
  const frame = await setup(page);
  await frame.locator("[data-article]").first().click();
  const modal = dialog(page);
  const input = modal.getByRole("textbox");
  const launch = modal.getByRole("button", {
    name: "Lancer la question",
    exact: true,
  });
  await input.fill("é".repeat(1000));
  await expect(launch).toBeDisabled();
  await expect(modal).toContainText("Raccourcissez-la");
  await expect(
    modal.getByRole("button", { name: "Copier la question", exact: true }),
  ).toBeEnabled();
  await input.fill("Question publique initiale");
  await context.setOffline(true);
  await launch.click();
  await expect(modal).toContainText("Hors ligne");
  expect(outgoing).toEqual([]);
  expect(context.pages()).toHaveLength(1);
  await context.setOffline(false);
  await page.evaluate(() => {
    window.open = () => {
      throw new Error("Popup blocked");
    };
  });
  await launch.click();
  await expect(modal).toContainText("Ouverture indisponible");
  const link = modal.getByRole("link", {
    name: "Ouvrir directement la question dans Google Mode IA",
    exact: true,
  });
  const query = "Question corrigée & + % # 🙂";
  await input.fill(query);
  const expected = new URL("https://www.google.com/search");
  expected.search = new URLSearchParams({
    hl: "fr",
    udm: "50",
    q: query,
  }).toString();
  await expect(link).toHaveAttribute("href", expected.href);
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  await expect(link).toHaveAttribute("target", "_blank");
  expect(outgoing).toEqual([]);
  await context.setOffline(true);
  await link.click();
  expect(context.pages()).toHaveLength(1);
  expect(outgoing).toEqual([]);
  await context.setOffline(false);
  const next = context.waitForEvent("page");
  await link.click();
  const popup = await next;
  await popup.waitForLoadState("domcontentloaded");
  expect(popup.url()).toBe(expected.href);
  expect(outgoing).toEqual([expected.href]);
  expect(
    await popup.evaluate(() => opener === null && document.referrer === ""),
  ).toBe(true);
  await popup.close();
});
