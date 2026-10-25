import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { v9Fixture } from "../helpers/v9";
import { auditHTML } from "../helpers/audit";
import { navigate } from "../helpers/navigation";
test("orange : tout le dernier créneau, anciens neutres, détail, filtres, reload et thème sombre", async ({
  page,
}) => {
  const { p, q } = v9Fixture();
  p.items[4].publishedAt = `${p.editionDate}T10:03:00+02:00`;
  p.items[5].publishedAt = `${p.editionDate}T10:47:00+02:00`;
  p.items[6].firstSeenSlot = "08:00";
  p.items[6].publishedAt = `${p.editionDate}T08:00:00+02:00`;
  p.items[6].lastChangedAt = `${p.editionDate}T10:15:00+02:00`;
  p.items[7].firstSeenSlot = "08:00";
  p.items[7].publishedAt =
    p.items[7].lastChangedAt = `${p.editionDate}T08:00:00+02:00`;
  p.coverageWindow.to = `${p.editionDate}T10:59:00+02:00`;
  const bytes = Buffer.concat([
    auditHTML(p),
    Buffer.from(
      `<script id="quickBriefsData" type="application/json">${JSON.stringify(q)}</script>`,
    ),
  ]);
  await page.goto("/");
  await page
    .getByLabel("Fichiers HTML à importer")
    .setInputFiles({
      name: "orange-synthetique.html",
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
  const expected = p.items
    .slice(4, 7)
    .map((i) => i.eventId)
    .sort();
  await navigate(page, "Aujourd’hui");
  const cards = page.locator('.event-list .event-card[data-latest="true"]');
  await expect(cards).toHaveCount(3);
  expect(
    (
      await cards.evaluateAll((nodes) =>
        nodes.map((n) => n.getAttribute("data-event-id")),
      )
    ).sort(),
  ).toEqual(expected);
  const old = page.locator(
    `.event-list [data-event-id="${p.items[0].eventId}"]`,
  );
  await expect(old).not.toHaveAttribute("data-latest", "true");
  const orange = await cards
    .first()
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(orange).toBe("rgb(255, 240, 220)");
  await navigate(page, "Actualité rapide");
  await expect(page.locator('.brief-card[data-latest="true"]')).toHaveCount(4);
  await page.getByLabel("Rechercher un titre").fill(p.items[0].title);
  await expect(page.locator('.brief-card[data-latest="true"]')).toHaveCount(0);
  await navigate(page, "Articles");
  await expect(
    page.locator('.articles-grid .event-card[data-latest="true"]'),
  ).toHaveCount(3);
  await page
    .locator('.articles-grid .event-card[data-latest="true"]')
    .first()
    .getByRole("button", { name: "Lire l’article complet", exact: true })
    .click();
  await expect(page.locator(".article-detail")).toHaveAttribute(
    "data-latest",
    "true",
  );
  await page.reload();
  await navigate(page, "Aujourd’hui");
  await expect(cards).toHaveCount(3);
  await page
    .getByRole("button", { name: "Activer le mode sombre", exact: true })
    .click();
  await expect
    .poll(() =>
      cards.first().evaluate((el) => getComputedStyle(el).backgroundColor),
    )
    .toBe("rgb(73, 48, 30)");
  expect(
    (await new AxeBuilder({ page }).include(".unified-workspace").analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({
    path: test.info().outputPath("orange-dark.png"),
    fullPage: true,
  });
});
