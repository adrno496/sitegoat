import { test, expect } from "@playwright/test";
import { navigate } from "../helpers/navigation";
// API mocks need direct requests; real service-worker offline reload is exercised
// by the separate production V10/source test, without mocked providers.
test.use({ serviceWorkers: "block" });
test("Sources : récupération explicite, aucun journal envoyé, cache hors ligne et réponse inerte", async ({
  page,
  context,
}) => {
  let calls = 0,
    lookups = 0;
  await context.route("**/api/sources", async (route) => {
    const req = route.request();
    if (req.method() === "GET") {
      lookups++;
      return route.fulfill({
        json: {
          sources: [
            {
              id: "ecb",
              label: "Économie · devises BCE",
              search: false,
              private: false,
              available: true,
            },
            {
              id: "brave",
              label: "Actualités · Brave",
              search: true,
              private: true,
              available: true,
            },
          ],
        },
      });
    }
    calls++;
    expect(req.postDataJSON()).toEqual({ provider: "ecb" });
    expect(req.headers().authorization).toBeUndefined();
    return route.fulfill({
      json: {
        provider: "ecb",
        label: "Économie · devises BCE",
        query: "",
        retrievedAt: "2026-10-24T10:00:00Z",
        entries: [
          {
            title: "1 EUR = 1.1 USD",
            summary: "Taux de référence BCE.",
            publishedAt: "2026-10-23",
            url: "https://www.ecb.europa.eu/",
          },
          {
            title: "<img src=x onerror=alert(1)>",
            summary: "Texte non fiable",
            url: "javascript:alert(1)",
          },
        ],
      },
    });
  });
  await page.goto("/");
  await navigate(page, "Actualité rapide");
  expect(calls).toBe(0);
  expect(lookups).toBe(0);
  await page.getByRole("tab", { name: "Sources", exact: true }).click();
  await expect.poll(() => lookups).toBe(1);
  expect(calls).toBe(0);
  await page.getByRole("button", { name: "Récupérer", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "2 résultat(s) conservé(s)" }),
  ).toBeVisible();
  await expect(page.locator(".source-results article")).toHaveCount(2);
  await expect(page.locator(".source-results img")).toHaveCount(0);
  await expect(page.locator(".source-results a")).toHaveCount(1);
  await page
    .getByRole("combobox", { name: "Source", exact: true })
    .selectOption("brave");
  await expect(
    page.getByRole("button", { name: "Récupérer", exact: true }),
  ).toBeDisabled();
  expect(calls).toBe(1);
  await page.reload();
  await context.unroute("**/api/sources");
  await context.setOffline(true);
  await navigate(page, "Actualité rapide");
  await page.getByRole("tab", { name: "Sources", exact: true }).click();
  await expect(page.locator(".source-results")).toContainText(
    "1 EUR = 1.1 USD",
  );
  await expect(page.locator(".source-results img")).toHaveCount(0);
  await expect(
    page.getByRole("tab", { name: "Tous les titres", exact: true }),
  ).toBeVisible();
  expect(calls).toBe(1);
});
