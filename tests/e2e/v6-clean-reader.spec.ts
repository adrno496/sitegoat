import { test, expect, type Page } from "@playwright/test";
import { dailyFile } from "../helpers/daily";
async function setup(page: Page) {
  await page.goto("/");
  const file = dailyFile("08");
  // A tall document tests real scrolling, not just a swipe event callback.
  const html = file.html.replace(
    "</body>",
    '<div style="height:2400px">Suite publique fictive</div><a href="#release" id="local-anchor" style="display:block;text-align:center;padding:20px">Revenir au titre</a></body>',
  );
  await page.getByLabel("Fichiers HTML à importer").setInputFiles({
    name: file.name,
    mimeType: "text/html",
    buffer: Buffer.from(html),
  });
  await page
    .getByRole("button", {
      name: "Enregistrer dans ma bibliothèque",
      exact: true,
    })
    .click();
  await open(page);
}
async function open(page: Page) {
  await page
    .getByRole("button", {
      name: "Lire Journal synthétique 2026-10-15 08h",
      exact: true,
    })
    .click();
  await expect(
    page.frameLocator(".edition-frame").locator("#release"),
  ).toBeVisible();
}
async function drag(
  page: Page,
  x: number,
  y: number,
  toX: number,
  toY: number,
) {
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(toX, toY, { steps: 8 });
  await page.mouse.up();
}
test("HTML seul : deux petits contrôles, pleine hauteur, réduction et historique navigateur sans perte", async ({
  page,
  context,
}) => {
  await setup(page);
  const surface = page.locator(".reading-surface-expanded");
  await expect(surface.locator("button:visible")).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: "Retour à la bibliothèque", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Réduire la lecture", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".reading-context")).toBeHidden();
  await expect(page.locator(".reading-options")).toBeHidden();
  await page.screenshot({ path: test.info().outputPath("clean-reader.png") });
  const bounds = await page.locator(".edition-frame").boundingBox();
  expect(bounds!.y).toBe(0);
  expect(
    Math.abs(bounds!.height - (await page.evaluate(() => innerHeight))),
  ).toBeLessThan(1);
  await page.frameLocator(".edition-frame").locator("#counter").click();
  await page
    .getByRole("button", { name: "Réduire la lecture", exact: true })
    .click();
  await expect(page.getByLabel("Échelle du HTML")).toHaveText("70 %");
  await page
    .getByLabel("Votre note", { exact: true })
    .fill("Note synthétique du lecteur épuré");
  await page
    .getByRole("button", { name: "Enregistrer la note", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Lecture pleine page", exact: true })
    .click();
  await expect(
    page.frameLocator(".edition-frame").locator("#counter"),
  ).toHaveText("1");
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.evaluate(() => history.back());
  await expect(page.locator(".reader")).toHaveCount(0);
  await expect(page.locator(".day-card")).toHaveCount(1);
  await page.evaluate(() => history.forward());
  await expect(page.locator(".reading-surface-expanded")).toBeVisible();
  // Native fragment navigation must not trap the parent in the reader.
  await page.frameLocator(".edition-frame").locator("#local-anchor").click();
  await page
    .getByRole("button", { name: "Retour à la bibliothèque", exact: true })
    .click();
  await expect(page.locator(".reader")).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => history.state?.journal360Reader?.id))
    .toBeNull();
  await page.evaluate(() => history.back());
  await expect(page.locator(".reader")).toHaveCount(0);
  await open(page);
  await page
    .getByRole("button", { name: "Réduire la lecture", exact: true })
    .click();
  await expect(page.locator(".note")).toContainText(
    "Note synthétique du lecteur épuré",
  );
});
test("geste réservé au bord gauche : retour horizontal, mouvements verticaux et mauvais sens ignorés, même sans JS", async ({
  page,
}) => {
  await setup(page);
  const height = await page.evaluate(() => innerHeight);
  await drag(page, 5, height / 2, 8, height / 2 + 100);
  await expect(page.locator(".reader")).toBeVisible();
  await drag(page, 5, height / 2, 17, height / 2);
  await expect(page.locator(".reader")).toBeVisible();
  await page.frameLocator(".edition-frame").locator("#counter").click();
  await expect(
    page.frameLocator(".edition-frame").locator("#counter"),
  ).toHaveText("1");
  await drag(page, 5, height / 2, 140, height / 2 + 5);
  await expect(page.locator(".reader")).toHaveCount(0);
  await open(page);
  await page
    .getByRole("button", { name: "Réduire la lecture", exact: true })
    .click();
  await page.getByRole("button", { name: "Sécurisé", exact: true }).click();
  await page
    .getByRole("button", { name: "Lecture pleine page", exact: true })
    .click();
  await expect(page.locator(".edition-frame")).toHaveAttribute("sandbox", "");
  await drag(page, 5, height / 2, 140, height / 2 + 5);
  await expect(page.locator(".reader")).toHaveCount(0);
});
test("tactile Chromium réel : le défilement du HTML reste libre et le glissement au bord revient", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "WebKit : geste pointeur et historique testés ; Safari iOS physique NON TESTÉ.",
  );
  await setup(page);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true });
  const height = await page.evaluate(() => innerHeight);
  async function swipe(x: number, y: number, toX: number, toY: number) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    for (let i = 1; i <= 8; i++)
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          { x: x + ((toX - x) * i) / 8, y: y + ((toY - y) * i) / 8 },
        ],
      });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  }
  await swipe(160, height * 0.8, 160, height * 0.3);
  await expect
    .poll(() =>
      page
        .frameLocator(".edition-frame")
        .locator("body")
        .evaluate(() => scrollY),
    )
    .toBeGreaterThan(100);
  await expect(page.locator(".reader")).toBeVisible();
  await swipe(5, height / 2, 150, height / 2 + 4);
  await expect(page.locator(".reader")).toHaveCount(0);
});

test("les contrôles flottants laissent libre l’en-tête du HTML sur smartphone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await page
    .frameLocator(".edition-frame")
    .locator("body")
    .evaluate((body) => {
      const button = document.createElement("button");
      button.id = "sticky-header-control";
      button.textContent = "Navigation HTML";
      button.style.cssText =
        "position:fixed;right:8px;top:12px;z-index:9999;padding:10px";
      button.onclick = () => (button.textContent = "Navigation HTML activée");
      body.append(button);
    });
  await page
    .frameLocator(".edition-frame")
    .locator("#sticky-header-control")
    .click();
  await expect(
    page.frameLocator(".edition-frame").locator("#sticky-header-control"),
  ).toHaveText("Navigation HTML activée");
  await expect(page.locator(".reading-surface-expanded")).toBeVisible();
  await expect(
    page.locator(".reading-surface-expanded button:visible"),
  ).toHaveCount(2);
  await page
    .getByRole("button", { name: "Réduire la lecture", exact: true })
    .click();
  await expect(page.locator(".reading-options")).toBeVisible();
});
