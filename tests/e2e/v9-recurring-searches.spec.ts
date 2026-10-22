import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { navigate } from "../helpers/navigation";

const key = "journal360.recurring-searches.v1";

test("Récurrent : thèmes, édition, recherche Google récente, persistance et suppression", async ({
  page,
  context,
}, info) => {
  await context.route("https://www.google.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<h1>Recherche Google de test</h1>",
    }),
  );
  await page.goto("/");
  await navigate(page, "Actualité rapide");
  const tabs = page.getByRole("tablist", {
    name: "Rubriques d’Actualité rapide",
  });
  await tabs.getByRole("tab", { name: "Tous les titres", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  const recurring = tabs.getByRole("tab", { name: "Récurrent", exact: true });
  await expect(recurring).toBeFocused();
  await expect(recurring).toHaveAttribute("aria-selected", "true");
  const panel = page.getByRole("tabpanel", { name: "Récurrent", exact: true });
  await panel
    .getByLabel("Thème", { exact: true })
    .fill("Intelligence artificielle");
  const query = 'IA & énergie "France" + recherche ?';
  await panel
    .getByLabel("Mots clés de la recherche", { exact: true })
    .fill(query);
  await panel.getByLabel("Fréquence", { exact: true }).selectOption("weekly");
  await panel
    .getByRole("button", { name: "Ajouter la recherche", exact: true })
    .click();
  await panel.getByLabel("Thème", { exact: true }).fill("Cybersécurité");
  await panel
    .getByRole("button", { name: "Ajouter la recherche", exact: true })
    .click();
  await expect(panel.locator(".recurring-search-card")).toHaveCount(2);
  const card = panel.locator(".recurring-search-card").filter({
    has: page.getByRole("heading", {
      name: "Intelligence artificielle",
      exact: true,
    }),
  });
  const link = card.getByRole("link", {
    name: "Rechercher sur Google",
    exact: true,
  });
  const url = new URL((await link.getAttribute("href"))!);
  expect(url.searchParams.get("q")).toBe(query);
  expect(url.searchParams.get("tbs")).toBe("qdr:w");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  const popupPromise = page.waitForEvent("popup");
  await link.click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(url.href);
  await popup.close();
  await expect(card).toContainText("Dernière consultation :");
  await expect(card).toContainText("À jour");
  await card.getByRole("button", { name: "Modifier", exact: true }).click();
  await panel.getByLabel("Thème", { exact: true }).fill("IA et énergie");
  await panel.getByLabel("Fréquence", { exact: true }).selectOption("monthly");
  await panel
    .getByRole("button", { name: "Enregistrer les modifications", exact: true })
    .click();
  await page.reload();
  await navigate(page, "Actualité rapide");
  await page.getByRole("tab", { name: "Récurrent", exact: true }).click();
  await expect(panel.locator(".recurring-search-card")).toHaveCount(2);
  const edited = panel.locator(".recurring-search-card").filter({
    has: page.getByRole("heading", { name: "IA et énergie", exact: true }),
  });
  await expect(edited).toContainText("Chaque mois");
  expect(
    new URL(
      (await edited.getByRole("link").getAttribute("href"))!,
    ).searchParams.get("tbs"),
  ).toBe("qdr:m");
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    axe.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  for (const width of [360, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`recurring-${width}.png`),
      fullPage: true,
    });
  }
  await edited.getByRole("button", { name: "Supprimer", exact: true }).click();
  await expect(panel.locator(".recurring-search-card")).toHaveCount(1);
  await page.reload();
  await navigate(page, "Actualité rapide");
  await page.getByRole("tab", { name: "Récurrent", exact: true }).click();
  await expect(panel.locator(".recurring-search-card")).toHaveCount(1);
  await expect(panel.locator(".recurring-search-card")).toContainText(
    "Cybersécurité",
  );
  await page.getByRole("tab", { name: "Tous les titres", exact: true }).click();
  await expect(
    page.getByLabel("Rechercher un titre", { exact: true }),
  ).toBeVisible();
});

test("Récurrent : stockage indisponible, recherches utilisables pendant la session", async ({
  page,
}) => {
  await page.addInitScript((storageKey) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === storageKey)
        throw new DOMException("Quota", "QuotaExceededError");
      return original.call(this, k, v);
    };
  }, key);
  await page.goto("/");
  await navigate(page, "Actualité rapide");
  await page.getByRole("tab", { name: "Récurrent", exact: true }).click();
  const panel = page.getByRole("tabpanel", { name: "Récurrent", exact: true });
  await panel.getByLabel("Thème", { exact: true }).fill("Énergie");
  await panel
    .getByRole("button", { name: "Ajouter la recherche", exact: true })
    .click();
  await expect(panel.getByRole("alert")).toContainText(
    "conservées pour cette session",
  );
  await expect(panel.locator(".recurring-search-card")).toHaveCount(1);
  await expect(
    panel.getByRole("link", { name: "Rechercher sur Google", exact: true }),
  ).toHaveAttribute("href", /q=%C3%89nergie/);
});
