import { test, expect, type BrowserContext } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { navigate } from "../helpers/navigation";
test.use({ serviceWorkers: "block" });
async function mockSources(context: BrowserContext) {
  const calls: string[] = [];
  let fail = false;
  await context.route("**/api/sources", async (route) => {
    const req = route.request();
    if (req.method() === "GET")
      return route.fulfill({
        json: {
          sources: [
            {
              id: "worldbank",
              label: "Économie · Banque mondiale",
              search: false,
              private: false,
              available: true,
            },
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
    const data = req.postDataJSON();
    expect(Object.keys(data)).toEqual(["provider"]);
    expect(req.headers().authorization).toBeUndefined();
    calls.push(data.provider);
    if (fail)
      return route.fulfill({ status: 429, json: { code: "RATE_LIMITED" } });
    return route.fulfill({
      json: {
        provider: data.provider,
        label:
          data.provider === "ecb"
            ? "Économie · devises BCE"
            : "Économie · Banque mondiale",
        query: "",
        retrievedAt: "2026-10-25T08:00:00Z",
        entries:
          data.provider === "ecb"
            ? [
                {
                  title: "1 EUR = 1.1 USD",
                  summary: "Taux BCE",
                  url: "https://www.ecb.europa.eu/",
                  publishedAt: "2026-10-23",
                },
              ]
            : [
                {
                  title: "France · Croissance du PIB",
                  summary:
                    "2025 : 1,5 % · 2024 : -0,5 % · variation : 2 point(s).",
                  url: "https://data.worldbank.org/indicator/NY.GDP.MKTP.KD.ZG?locations=FRA",
                },
                {
                  title: "<img src=x onerror=alert(1)>",
                  summary: "Texte inerte",
                  url: "javascript:alert(1)",
                },
              ],
      },
    });
  });
  return {
    calls,
    setFail: () => {
      fail = true;
    },
  };
}
test("En direct : départ explicite, radar accessible, quotas protégés et dernier résultat conservé après erreur", async ({
  page,
  context,
}) => {
  const { calls, setFail } = await mockSources(context);
  await page.goto("/");
  await navigate(page, "En direct");
  await expect(
    page.getByRole("heading", { name: "Veille en direct" }),
  ).toBeVisible();
  expect(calls).toEqual([]);
  await page
    .getByText("Choisir les sources et la recherche", { exact: true })
    .click();
  await expect(
    page.getByRole("checkbox", {
      name: "Actualités · Brave · connexion requise",
    }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Actualiser maintenant", exact: true })
    .click();
  await expect(page.locator(".live-entry-grid article")).toHaveCount(3);
  await expect(
    page
      .locator(".live-controls")
      .getByRole("status")
      .filter({ hasText: "Suivi en pause" }),
  ).toBeVisible();
  expect([...calls].sort()).toEqual(["ecb", "worldbank"]);
  expect(await page.locator(".live-results img").count()).toBe(0);
  await expect(page.locator(".live-results a")).toHaveCount(2);
  await page.getByRole("tab", { name: "Flux API", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Radar économique mondial", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toContainText("2025 : 1,5 %");
  await expect(page.getByRole("tabpanel")).toContainText(
    "pas des cotations en temps réel",
  );
  await expect(
    page.getByText("Indicateurs de mes éditions", { exact: true }),
  ).toBeVisible();
  setFail();
  await page
    .getByRole("button", { name: "Actualiser maintenant", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveCount(2);
  await expect(page.getByRole("tabpanel")).toContainText("2025 : 1,5 %");
  expect(calls).toHaveLength(4);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    (await new AxeBuilder({ page }).include(".live-watch").analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({
    path: test.info().outputPath("live-radar.png"),
    fullPage: true,
  });
  await page.reload();
  // With the service worker deliberately blocked, wait for the lazy module.
  // A separate production test reloads fully offline using the real worker.
  await expect(
    page.getByRole("heading", { name: "Veille en direct" }),
  ).toBeVisible();
  await context.setOffline(true);
  await navigate(page, "En direct");
  await expect(page.locator(".live-results")).toContainText("2025 : 1,5 %");
  await expect(
    page
      .locator(".live-controls")
      .getByRole("status")
      .filter({ hasText: "Hors ligne" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Démarrer le suivi", exact: true }),
  ).toBeDisabled();
  expect(calls).toHaveLength(4);
});
test("En direct : cadence, suspension hors ligne, arrêt et sortie sans appels en arrière-plan", async ({
  page,
  context,
}) => {
  const { calls } = await mockSources(context);
  await page.goto("/");
  await navigate(page, "En direct");
  await page
    .getByText("Choisir les sources et la recherche", { exact: true })
    .click();
  await page.clock.install();
  await page
    .getByRole("button", { name: "Démarrer le suivi", exact: true })
    .click();
  await page.clock.runFor(30);
  await expect.poll(() => calls.length).toBe(2);
  await expect(
    page
      .locator(".live-controls")
      .getByRole("status")
      .filter({ hasText: "Suivi actif" }),
  ).toBeVisible();
  await page.clock.fastForward(29 * 60000);
  expect(calls).toHaveLength(2);
  await page.clock.fastForward(61000);
  await expect.poll(() => calls.length).toBe(4);
  await expect(
    page
      .locator(".live-controls")
      .getByRole("status")
      .filter({ hasText: "Suivi actif" }),
  ).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(
    page.locator(".live-controls").getByRole("status"),
  ).toContainText("onglet masqué");
  await page.clock.fastForward(31 * 60000);
  expect(calls).toHaveLength(4);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(30);
  await expect.poll(() => calls.length).toBe(6);
  await expect(
    page.locator(".live-controls").getByRole("status"),
  ).toContainText("Suivi actif");
  await context.setOffline(true);
  await expect(
    page
      .locator(".live-controls")
      .getByRole("status")
      .filter({ hasText: "Hors ligne" }),
  ).toBeVisible();
  await page.clock.fastForward(31 * 60000);
  expect(calls).toHaveLength(6);
  await context.setOffline(false);
  await page.clock.runFor(30);
  await expect.poll(() => calls.length).toBe(8);
  await expect(
    page
      .locator(".live-controls")
      .getByRole("status")
      .filter({ hasText: "Suivi actif" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Mettre en pause", exact: true })
    .click();
  await page.clock.fastForward(31 * 60000);
  expect(calls).toHaveLength(8);
  await page
    .getByRole("button", { name: "Démarrer le suivi", exact: true })
    .click();
  await page.clock.runFor(30);
  await expect.poll(() => calls.length).toBe(10);
  await expect(
    page
      .locator(".live-controls")
      .getByRole("status")
      .filter({ hasText: "Suivi actif" }),
  ).toBeVisible();
  await navigate(page, "Accueil");
  await page.clock.fastForward(31 * 60000);
  expect(calls).toHaveLength(10);
  await navigate(page, "En direct");
  await expect(
    page
      .locator(".live-controls")
      .getByRole("status")
      .filter({ hasText: "Suivi en pause" }),
  ).toBeVisible();
  await page.clock.fastForward(31 * 60000);
  expect(calls).toHaveLength(10);
});

test("En direct : un arrêt annule la récupération en cours sans écriture tardive", async ({
  page,
  context,
}) => {
  await page.addInitScript(() => {
    const observed = window as Window & {
      watchAbortProbe?: { aborted: boolean; outcome: string; reason?: string };
    };
    const nativeFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      if (String(input) !== "/api/sources" || init?.method !== "POST")
        return nativeFetch(input, init);
      const probe = { aborted: false, outcome: "pending", reason: "" };
      observed.watchAbortProbe = probe;
      init.signal?.addEventListener("abort", () => {
        probe.aborted = true;
      });
      try {
        const response = await nativeFetch(input, init);
        probe.outcome = "resolved";
        return response;
      } catch (error) {
        probe.outcome = "rejected";
        probe.reason = error instanceof DOMException ? error.name : "Unknown";
        throw error;
      }
    };
  });
  let release!: () => void;
  let calls = 0;
  await context.route("**/api/sources", async (route) => {
    if (route.request().method() === "GET")
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
          ],
        },
      });
    calls++;
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await route
      .fulfill({
        json: {
          provider: "ecb",
          label: "Économie · devises BCE",
          query: "",
          retrievedAt: "2026-10-25T08:00:00Z",
          entries: [
            {
              title: "Réponse tardive",
              summary: "Ne doit pas remplacer le cache",
              url: "https://www.ecb.europa.eu/",
            },
          ],
        },
      })
      .catch(() => {});
  });
  await page.goto("/");
  await navigate(page, "En direct");
  await page
    .getByText("Choisir les sources et la recherche", { exact: true })
    .click();
  await expect(
    page.getByRole("checkbox", { name: "Économie · devises BCE", exact: true }),
  ).toBeChecked();
  await page
    .getByRole("button", { name: "Démarrer le suivi", exact: true })
    .click();
  await expect.poll(() => calls).toBe(1);
  await page
    .getByRole("button", { name: "Mettre en pause", exact: true })
    .click();
  // Observe the real Fetch rejection; WebKit does not emit Playwright's
  // requestfailed event consistently for a held route cancelled by the page.
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { watchAbortProbe?: unknown }).watchAbortProbe,
      ),
    )
    .toEqual({ aborted: true, outcome: "rejected", reason: "AbortError" });
  release();
  await expect(page.locator(".live-controls").getByRole("status")).toHaveText(
    "Suivi en pause",
  );
  expect(
    await page.evaluate(() =>
      localStorage.getItem("journal360.online-sources.v1"),
    ),
  ).toBeNull();
  await expect(page.locator(".live-results article")).toHaveCount(0);
});
