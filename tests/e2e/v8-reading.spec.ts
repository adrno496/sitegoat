import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { dynamicFixture, readingHours } from "../helpers/dynamic-unified";
async function add(page: Page, hour: (typeof readingHours)[number]) {
  const { bytes, p } = dynamicFixture(hour);
  await page.getByLabel("Fichiers HTML à importer").setInputFiles({
    name: `dynamic-${hour}.html`,
    mimeType: "text/html",
    buffer: bytes,
  });
  await page
    .getByRole("button", {
      name: "Enregistrer dans ma bibliothèque",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const close = page.getByRole("button", {
    name: "Fermer la notification",
    exact: true,
  });
  if (await close.isVisible()) await close.click();
  return p;
}
async function today(page: Page) {
  await page
    .locator(
      (await page.locator(".sidebar").isVisible()) ? ".sidebar" : ".mobile-nav",
    )
    .getByRole("button", { name: "Aujourd’hui", exact: true })
    .click();
}
for (const hour of readingHours)
  test(`Lecture réelle du cadre ${hour} h : tous les récits visibles sans activer les scripts, offline`, async ({
    page,
    context,
  }, info) => {
    await page.goto("/");
    const p = await add(page, hour);
    await today(page);
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await expect
      .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
      .toBe(true);
    await context.setOffline(true);
    await page
      .locator(".unified-workspace")
      .getByRole("button", { name: "Lire la dernière édition", exact: true })
      .click();
    const frame = page.frameLocator(".edition-frame");
    await expect(page.locator(".edition-frame")).toHaveAttribute("sandbox", "");
    await expect(frame.locator("[data-journal360-safe-unified]")).toBeVisible();
    await expect(frame.locator("article[data-journal360-article]")).toHaveCount(
      p.items.length,
    );
    for (const i of p.items) {
      const a = frame.locator(`[data-journal360-article="${i.id}"]`);
      await a
        .getByRole("heading", { name: i.title, exact: true })
        .scrollIntoViewIfNeeded();
      await expect(
        a.getByRole("heading", { name: i.title, exact: true }),
      ).toBeVisible();
      await expect(a).toContainText(i.plain);
      await expect(a).toContainText(i.detail);
    }
    expect(await frame.locator("script").count()).toBe(0);
    expect(
      await frame
        .locator("body")
        .evaluate(() => Object.hasOwn(globalThis, "importedRendererRan")),
    ).toBe(false);
    for (const pm of p.promptAssets)
      await expect(
        frame.locator(`textarea[data-prompt-id="${pm.promptId}"]`),
      ).toHaveValue(pm.content);
    await frame
      .getByRole("link", { name: p.items[0].title, exact: true })
      .click();
    await expect(page.locator(".edition-frame")).toHaveAttribute("sandbox", "");
    await expect(frame.locator("[data-journal360-safe-unified]")).toBeVisible();
    await expect(frame.locator("h1")).toHaveText(p.title);
    await page.screenshot({ path: info.outputPath("safe-reader.png") });
    await page
      .getByRole("button", { name: "Réduire la lecture", exact: true })
      .click();
    await page
      .locator(".reader")
      .getByRole("button", { name: "Aujourd’hui", exact: true })
      .click();
    await expect(page.locator(".unified-workspace")).toBeVisible();
  });
test("Développer utilise toute la largeur de la page et Réduire rétablit la carte", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await add(page, "10");
  await today(page);
  const list = page.locator(".event-list"),
    card = list.locator(".event-card").first();
  const compact = (await card.boundingBox())!;
  await card.getByRole("button", { name: "Développer", exact: true }).click();
  await expect(card).toHaveAttribute("data-expanded", "true");
  const expanded = (await card.boundingBox())!,
    width = (await list.boundingBox())!.width;
  expect(expanded.width).toBeGreaterThan(compact.width * 2);
  expect(Math.abs(expanded.width - width)).toBeLessThan(2);
  await expect(card.locator(".event-summary")).toBeVisible();
  await card.getByRole("button", { name: "Réduire", exact: true }).click();
  await expect(card).toHaveAttribute("data-expanded", "false");
  expect((await card.boundingBox())!.width).toBeLessThan(expanded.width / 2);
});
test("16 h : PARTIAL ne signifie pas contradiction ni article manquant ; prompts parent exacts", async ({
  page,
}) => {
  await page.goto("/");
  await add(page, "08");
  await add(page, "10");
  const p = await add(page, "16");
  await today(page);
  const w = page.locator(".unified-workspace");
  await expect(w.locator(".event-list .event-card")).toHaveCount(16);
  await expect(w).not.toContainText("partielle ou contradictoire");
  await expect(w).toContainText("12:00 / 14:00");
  await expect(w.locator("[data-autonomy]")).toHaveAttribute(
    "data-autonomy",
    "AUTONOMOUS",
  );
  await w.getByRole("button", { name: "Mes prompts .md", exact: true }).click();
  await w.locator(".unified-result").first().click();
  for (const [n, pm] of p.promptAssets.entries()) {
    const d = page.waitForEvent("download");
    await w
      .locator(".prompt-card")
      .nth(n)
      .getByRole("button", {
        name: "Télécharger le prompt VS Code (.md)",
        exact: true,
      })
      .click();
    expect(await readFile((await (await d).path())!, "utf8")).toBe(pm.content);
  }
});
