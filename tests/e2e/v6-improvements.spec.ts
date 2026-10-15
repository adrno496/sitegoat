import { test, expect, type Page } from "@playwright/test";
import { dailyFile } from "../helpers/daily";
async function upload(page: Page, hour: string) {
  const file = dailyFile(hour);
  await page.getByLabel("Fichiers HTML à importer").setInputFiles({
    name: file.name,
    mimeType: "text/html",
    buffer: Buffer.from(file.html),
  });
  await page
    .getByRole("button", {
      name: "Enregistrer dans ma bibliothèque",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Vérifier l’import" }),
  ).toHaveCount(0);
}
async function open(page: Page, hour: string) {
  await page
    .getByRole("button", {
      name: `Lire Journal synthétique 2026-10-15 ${hour}h`,
      exact: true,
    })
    .click();
  await expect(page.locator(".edition-frame")).toHaveAttribute(
    "sandbox",
    "allow-scripts",
  );
}
async function back(page: Page) {
  await page
    .getByRole("button", { name: "Retour à la bibliothèque", exact: true })
    .click();
}
test("nouveautés en carte et dans les options, HTML épuré, repère conservé au rechargement et hors ligne", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await upload(page, "08");
  await open(page, "08");
  await expect(page.locator(".reading-context")).toBeHidden();
  await page
    .getByRole("button", { name: "Réduire la lecture", exact: true })
    .click();
  await expect(page.locator(".reading-updates summary")).toHaveText(
    "Première lecture de cette journée",
  );
  await page
    .getByRole("button", { name: "Lecture pleine page", exact: true })
    .click();
  await back(page);
  await upload(page, "12");
  await upload(page, "21");
  await expect(page.locator(".day-card .update-badge")).toHaveText(
    "3 nouveautés · 0 mise à jour",
  );
  await page.reload();
  const surface = (await page.locator(".mobile-nav").isVisible())
    ? ".mobile-nav"
    : ".sidebar";
  await page
    .locator(surface)
    .getByRole("button", { name: "Bibliothèque", exact: true })
    .click();
  await open(page, "21");
  await expect(page.locator(".reading-context")).toBeHidden();
  await page
    .getByRole("button", { name: "Réduire la lecture", exact: true })
    .click();
  await expect(page.locator(".reading-updates summary")).toHaveText(
    "3 nouveautés · 0 mise à jour",
  );
  await page.locator(".reading-updates summary").click();
  await expect(page.locator(".reading-updates article")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Lecture pleine page", exact: true })
    .click();
  await page.frameLocator(".edition-frame").locator("#counter").click();
  await expect(
    page.frameLocator(".edition-frame").locator("#counter"),
  ).toHaveText("1");
  await page
    .getByRole("button", { name: "Réduire la lecture", exact: true })
    .click();
  await expect(page.locator(".reading-updates article")).toHaveCount(3);
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await expect(page.locator(".topbar .sync-indicator")).toContainText(
    "Hors ligne",
  );
  await page
    .getByRole("button", { name: "Lecture pleine page", exact: true })
    .click();
  await back(page);
  await open(page, "21");
  await expect(page.locator(".reading-updates")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Réduire la lecture", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Marquer comme lue", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Échelle du HTML")).toHaveText("70 %");
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
});

async function syntheticAccount(page: Page) {
  const owner = "11111111-1111-4111-8111-111111111111";
  const expires = Math.floor(Date.now() / 1000) + 3600;
  const token = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: owner, exp: expires })).toString("base64url")}.synthetic-local-test-signature`;
  await page.addInitScript(
    ({ owner, expires, token }) => {
      localStorage.setItem(
        "sb-guevmgdxznrvxcjvvzyu-auth-token",
        JSON.stringify({
          access_token: token,
          refresh_token: "synthetic-local-refresh",
          token_type: "bearer",
          expires_at: expires,
          user: {
            id: owner,
            aud: "authenticated",
            role: "authenticated",
            email: "synthetic@example.invalid",
          },
        }),
      );
    },
    { owner, expires, token },
  );
  return owner;
}
test.describe("Cloud simulé sans interception par le service worker", () => {
  test.use({ serviceWorkers: "block" });
  test("sync visible : en cours, échec, clic réessayer, succès daté, changements en attente et automatique désactivée", async ({
    page,
  }) => {
    let fail = true;
    let release: (() => void) | undefined;
    let hold = true;
    await syntheticAccount(page);
    await page.route("**/api/backup", async (route) => {
      if (hold) {
        hold = false;
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      }
      await route.fulfill({
        status: fail ? 503 : 200,
        contentType: "application/json",
        body: JSON.stringify(
          fail
            ? { error: "Échec réseau synthétique" }
            : { snapshots: [], nextOffset: null },
        ),
      });
    });
    await page.goto("/");
    const indicator = page.locator(".topbar .sync-indicator");
    await expect(indicator).toContainText("Synchronisation…");
    await expect.poll(() => !!release).toBe(true);
    release!();
    await expect(indicator).toContainText("Échec · Réessayer");
    await expect(indicator).toHaveAttribute(
      "title",
      "Échec réseau synthétique",
    );
    fail = false;
    await indicator.click();
    await expect(indicator).toContainText("Synchronisé");
    await expect(indicator).toContainText("Dernier succès :");
    const surface = (await page.locator(".mobile-nav").isVisible())
      ? ".mobile-nav"
      : ".sidebar";
    await page
      .locator(surface)
      .getByRole("button", { name: "Réglages", exact: true })
      .click();
    const automatic = page.getByLabel(
      "Synchroniser automatiquement cet appareil",
    );
    await expect(automatic).toBeChecked();
    await automatic.click();
    await expect(automatic).not.toBeChecked();
    await expect(indicator).toContainText("Automatique désactivée");
    await upload(page, "08");
    await expect(indicator).toContainText("Modifications en attente");
    await expect(indicator).not.toContainText("Synchronisé");
    await page.evaluate(() => window.scrollTo(0, 0));
    for (const width of [320, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: test.info().outputPath("sync-pending.png") });
  });
});
