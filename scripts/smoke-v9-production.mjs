// Read-only public smoke check, isolated browser, no account and no imports.
import { chromium, expect } from "@playwright/test";
import { writeFileSync } from "node:fs";
const expectedCommit = process.argv[2];
if (!/^[a-f0-9]{40}$/.test(expectedCommit || ""))
  throw Error("Provide the expected deployed Git commit SHA.");
const output = process.argv[3];
if (!output) throw Error("Provide the local proof JSON path.");
const origin = "https://sitegoat.vercel.app";
const browser = await chromium.launch();
const context = await browser.newContext({
  serviceWorkers: "block",
  viewport: { width: 1440, height: 1000 },
});
const blocked = [];
try {
  await context.route("**/*", (route) => {
    const u = new URL(route.request().url());
    if (u.origin !== origin || u.pathname.startsWith("/api/")) {
      blocked.push(u.origin + u.pathname);
      return route.abort();
    }
    return route.continue();
  });
  const page = await context.newPage();
  const response = await page.goto(origin, { waitUntil: "networkidle" });
  expect(response.status()).toBe(200);
  const main = page.getByRole("navigation", {
    name: "Navigation principale",
    exact: true,
  });
  for (const name of ["Accueil", "Aujourd’hui", "Articles", "Paramètres"])
    await expect(main.getByRole("button", { name, exact: true })).toBeVisible();
  await expect(page.locator(".sidebar")).toContainText("2.1.0");
  await main.getByRole("button", { name: "Accueil", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Les points essentiels aujourd’hui",
      exact: true,
    }),
  ).toBeVisible();
  await main.getByRole("button", { name: "Aujourd’hui", exact: true }).click();
  await expect(
    page
      .locator(".unified-workspace")
      .getByRole("button", { name: "Actualité rapide", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".unified-workspace")).not.toContainText(
    "DERNIÈRE ÉDITION EFFECTIVEMENT REÇUE",
  );
  const headers = await response.allHeaders();
  expect(headers["content-security-policy"]).toContain("frame-src");
  writeFileSync(
    output,
    JSON.stringify(
      {
        expectedCommit,
        checkedAt: new Date().toISOString(),
        url: origin,
        httpStatus: response.status(),
        applicationVersion: "2.1.0",
        publicNavigation: "PASS",
        dashboard: "PASS",
        quickNewsEntry: "PASS",
        technicalBlockHidden: "PASS",
        isolatedProfile: true,
        personalDataOpened: false,
        imports: 0,
        apiAndExternalRequestsBlocked: blocked,
        securityHeaders: {
          csp: headers["content-security-policy"],
          referrerPolicy: headers["referrer-policy"],
        },
        assets: await page
          .locator("script[src]")
          .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("src"))),
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "PASS : interface publique 2.1.0, Accueil et Actualité rapide ; aucune donnée personnelle ni API cloud.",
  );
} finally {
  await context.close();
  await browser.close();
}
