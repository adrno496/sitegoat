// Requires JOURNAL360_TEST_PORT=4181 npm run preview (or the isolated E2E server).
// Capture only synthetic V9 data in an isolated profile; never production.
import { registerHooks } from "node:module";
import { existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";
registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (error) {
      if (specifier.startsWith(".") && context.parentURL) {
        const candidate = new URL(specifier + ".ts", context.parentURL);
        if (
          candidate.protocol === "file:" &&
          existsSync(fileURLToPath(candidate))
        )
          return next(specifier + ".ts", context);
      }
      throw error;
    }
  },
});
const { interactiveV9Fixture } = await import("../tests/helpers/v9.ts");
const fixture = interactiveV9Fixture();
if (!fixture.p.synthetic) throw Error("Synthetic fixture required");
const root = "docs/evidence/v9/screenshots";
mkdirSync(root, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ serviceWorkers: "block" });
try {
  await context.route("**/*", (route) =>
    new URL(route.request().url()).origin === "http://127.0.0.1:4181"
      ? route.continue()
      : route.abort(),
  );
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4181");
  await page.getByLabel("Fichiers HTML à importer").setInputFiles({
    name: "V9-SYNTHETIQUE.html",
    mimeType: "text/html",
    buffer: fixture.bytes,
  });
  await page
    .getByRole("button", {
      name: "Enregistrer dans ma bibliothèque",
      exact: true,
    })
    .click();
  const close = page.getByRole("button", {
    name: "Fermer la notification",
    exact: true,
  });
  await expect(close).toBeVisible();
  await close.click();
  await expect(close).toHaveCount(0);
  async function nav(label) {
    const scope = page.locator(
      (await page.locator(".sidebar").isVisible()) ? ".sidebar" : ".mobile-nav",
    );
    await scope.getByRole("button", { name: label, exact: true }).click();
  }
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await nav("Accueil");
    await page.screenshot({
      path: `${root}/accueil-${width}.png`,
      fullPage: true,
    });
    await nav("Aujourd’hui");
    await page.screenshot({
      path: `${root}/aujourdhui-${width}.png`,
      fullPage: true,
    });
  }
  await page
    .locator(".unified-workspace")
    .getByRole("button", { name: "Actualité rapide", exact: true })
    .click();
  await page.screenshot({ path: `${root}/breves-1440.png`, fullPage: true });
  await nav("Paramètres");
  await page.screenshot({
    path: `${root}/parametres-1440.png`,
    fullPage: true,
  });
  console.log("8 captures locales synthétiques créées.");
} finally {
  await context.close();
  await browser.close();
}
