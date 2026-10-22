import { diagnostics, navigate as nav } from "../helpers/navigation";
import { openReadingTools } from "../helpers/navigation";
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
  test(`Lecture réelle du cadre ${hour} h : HTML d’origine conservé, interactions uniquement après confirmation, offline`, async ({
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
    await expect(frame.locator("[data-journal360-safe-unified]")).toHaveCount(
      0,
    );
    await expect(frame.locator("#view")).toBeEmpty();
    expect(await frame.locator("script").count()).toBe(0);
    await page
      .getByRole("button", { name: "Afficher le HTML d’origine", exact: true })
      .click();
    const trust = page.getByRole("dialog", {
      name: "Activer les interactions ?",
    });
    await trust
      .getByRole("button", { name: "Rester en mode sécurisé", exact: true })
      .click();
    await expect(page.locator(".edition-frame")).toHaveAttribute("sandbox", "");
    await page
      .getByRole("button", { name: "Afficher le HTML d’origine", exact: true })
      .click();
    await trust
      .getByRole("button", {
        name: "Je fais confiance à ce fichier",
        exact: true,
      })
      .click();
    await expect(page.locator(".edition-frame")).toHaveAttribute(
      "sandbox",
      "allow-scripts",
    );
    await expect(page.locator(".original-html-notice")).toHaveCount(0);
    await expect(frame.locator("#view")).not.toBeEmpty();
    await expect(frame.locator("[data-journal360-safe-unified]")).toHaveCount(
      0,
    );
    await expect(frame.locator("#nav button").first()).toBeVisible();
    // Navigate with the publisher's own menu and article controls, not a host
    // projection. All three real files use this native article list.
    for (const i of p.items) {
      await frame
        .locator("#nav")
        .getByRole("button", { name: /^(Articles|Tous les articles)$/ })
        .click();
      const card = frame.locator("#view article").filter({
        has: frame.getByRole("heading", { name: i.title, exact: true }),
      });
      await card.getByRole("button", { name: /^Lire/ }).click();
      await expect(
        frame
          .locator("#view")
          .getByRole("heading", { name: i.title, exact: true }),
      ).toBeVisible();
      await expect(frame.locator("#view")).toContainText(i.plain);
      await expect(frame.locator("#view")).toContainText(i.detail);
    }
    await page.screenshot({ path: info.outputPath("original-reader.png") });
    await page
      .getByRole("button", { name: "Réduire la lecture", exact: true })
      .click();
    const originalDownload = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Original intact", exact: true })
      .click();
    expect(await readFile((await (await originalDownload).path())!)).toEqual(
      dynamicFixture(hour).bytes,
    );
    await page
      .locator(".reader")
      .getByRole("button", { name: "Aujourd’hui", exact: true })
      .click();
    await expect(page.locator(".unified-workspace")).toBeVisible();
    await page
      .getByRole("button", { name: "Lire la dernière édition", exact: true })
      .click();
    // A previous confirmation never silently enables scripts on a later visit.
    await expect(page.locator(".edition-frame")).toHaveAttribute("sandbox", "");
    await expect(page.locator(".original-html-notice")).toBeVisible();
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
  const diag = await diagnostics(page);
  await expect(diag).toContainText("12:00 / 14:00");
  await expect(diag.locator("[data-autonomy]")).toHaveAttribute(
    "data-autonomy",
    "AUTONOMOUS",
  );
  await nav(page, "Aujourd’hui");
  await openReadingTools(page);
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
