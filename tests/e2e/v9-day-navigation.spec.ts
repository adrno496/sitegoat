import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { v9Fixture } from "../helpers/v9";
import { auditHTML } from "../helpers/audit";
import { navigate } from "../helpers/navigation";

function edition(date: string, slot: "08:00" | "10:00" = "10:00") {
  const fixture = v9Fixture(slot);
  const p = JSON.parse(
    JSON.stringify(fixture.p).replaceAll(fixture.p.editionDate, date),
  ) as typeof fixture.p;
  p.title = `Journal SYNTHÉTIQUE ${date} ${slot}`;
  p.items.forEach((i) => {
    i.title = `${date} ${slot} ${i.title}`;
  });
  p.economicSnapshots.forEach((e) => {
    e.indicator = `Indicateur SYNTHÉTIQUE ${date}`;
  });
  return {
    p,
    name: `journal-${date}-${slot.replace(":", "")}.html`,
    mimeType: "text/html",
    buffer: auditHTML(p),
  };
}

test("jours : un choix par date, dernier créneau, filtres réinitialisés, radar et retour au dernier journal", async ({
  page,
}) => {
  const newest = edition("2026-10-19"),
    previous = edition("2026-10-17"),
    oldest = edition("2026-10-16");
  await page.goto("/");
  await page
    .getByLabel("Fichiers HTML à importer")
    .setInputFiles([newest, previous, oldest, edition("2026-10-17", "08:00")]);
  await page
    .getByRole("button", {
      name: "Enregistrer dans ma bibliothèque",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await navigate(page, "Aujourd’hui");
  const w = page.locator(".unified-workspace");
  const date = w.getByLabel("Jour consulté", { exact: true });
  const prev = w.getByRole("button", { name: "← Jour précédent", exact: true });
  const next = w.getByRole("button", { name: "Jour suivant →", exact: true });
  await expect(date.locator("option")).toHaveText([
    "19 octobre 2026",
    "17 octobre 2026",
    "16 octobre 2026",
  ]);
  await expect(next).toBeDisabled();
  await expect(w.locator('.event-list [data-latest="true"]')).toHaveCount(4);
  await w
    .getByLabel("Rechercher dans les articles du jour")
    .fill("introuvable");
  await expect(w.locator(".event-list .event-card")).toHaveCount(0);
  await prev.click();
  await expect(date).toHaveValue("journal360-day-2026-10-17");
  await expect(
    w.getByLabel("Rechercher dans les articles du jour"),
  ).toHaveValue("");
  await expect(w.locator(".event-list .event-card")).toHaveCount(8);
  await expect(w.locator(".event-list")).toContainText(
    previous.p.items[0].title,
  );
  await expect(w.locator('.event-list [data-latest="true"]')).toHaveCount(0);
  await expect(w.locator(".warning")).toHaveCount(0);
  await w.getByRole("button", { name: "Économie", exact: true }).click();
  await expect(w.locator(".economic-reading").first()).toContainText(
    "Indicateur SYNTHÉTIQUE 2026-10-17",
  );
  await expect(w.locator(".economic-reading")).not.toContainText([
    "Indicateur SYNTHÉTIQUE 2026-10-19",
  ]);
  await w.getByRole("button", { name: "À la une", exact: true }).click();
  await prev.click();
  await expect(date).toHaveValue("journal360-day-2026-10-16");
  await expect(prev).toBeDisabled();
  await expect(next).toBeEnabled();
  await next.click();
  await expect(date).toHaveValue("journal360-day-2026-10-17");
  await date.selectOption("journal360-day-2026-10-16");
  await expect(w.locator(".event-list")).toContainText(oldest.p.items[0].title);
  await w
    .getByRole("button", { name: "Revenir à la dernière édition", exact: true })
    .click();
  await expect(date).toHaveValue("journal360-day-2026-10-19");
  await expect(next).toBeDisabled();
  await expect(
    w.getByRole("button", { name: "Lire la dernière édition", exact: true }),
  ).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).include(".unified-workspace").analyze())
      .violations,
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await prev.click();
  await page.screenshot({
    path: test.info().outputPath("jours-precedents.png"),
    fullPage: false,
  });
  await page.evaluate(() =>
    navigator.serviceWorker.ready.then(() => undefined),
  );
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await page.context().setOffline(true);
  await w
    .getByRole("button", { name: "Lire cette édition", exact: true })
    .click();
  await expect(
    page
      .frameLocator(".edition-frame")
      .getByRole("heading", { name: previous.p.title, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Retour à Aujourd’hui", exact: true })
    .click();
  await expect(date).toHaveValue("journal360-day-2026-10-17");
  await page.reload();
  await navigate(page, "Aujourd’hui");
  await expect(date).toHaveValue("journal360-day-2026-10-19");
  await prev.click();
  await expect(date).toHaveValue("journal360-day-2026-10-17");
  await expect(w.locator(".event-list")).toContainText(
    previous.p.items[0].title,
  );
});

test("jours : bibliothèque vide et une seule journée, sans navigation impossible", async ({
  page,
}) => {
  await page.goto("/");
  await navigate(page, "Aujourd’hui");
  await expect(
    page.getByRole("navigation", { name: "Choisir le jour du journal" }),
  ).toHaveCount(0);
  await page
    .getByLabel("Fichiers HTML à importer")
    .setInputFiles(edition("2026-10-19"));
  await page
    .getByRole("button", {
      name: "Enregistrer dans ma bibliothèque",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await navigate(page, "Aujourd’hui");
  const nav = page.getByRole("navigation", {
    name: "Choisir le jour du journal",
  });
  await expect(
    nav.getByRole("button", { name: "← Jour précédent", exact: true }),
  ).toBeDisabled();
  await expect(
    nav.getByRole("button", { name: "Jour suivant →", exact: true }),
  ).toBeDisabled();
  await expect(nav.getByLabel("Jour consulté").locator("option")).toHaveCount(
    1,
  );
});
