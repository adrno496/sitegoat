import { test, expect } from "@playwright/test";
import { auditPayload, auditHTML } from "../helpers/audit";
import { navigate } from "../helpers/navigation";

test("importe un journal avec 100 avertissements et retrouve ses articles après rechargement", async ({
  page,
}) => {
  const p = auditPayload("10");
  p.warnings = Array.from(
    { length: 100 },
    (_, n) => `Avertissement SYNTHÉTIQUE ${n}`,
  );
  await page.goto("/");
  await page
    .getByLabel("Fichiers HTML à importer")
    .setInputFiles({
      name: "journal-100-warnings.html",
      mimeType: "text/html",
      buffer: auditHTML(p),
    });
  await page
    .getByRole("button", {
      name: "Enregistrer dans ma bibliothèque",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await navigate(page, "Aujourd’hui");
  await expect(page.locator(".event-list .event-card")).toHaveCount(
    p.items.length,
  );
  await page.reload();
  await navigate(page, "Aujourd’hui");
  await expect(page.locator(".event-list .event-card")).toHaveCount(
    p.items.length,
  );
  await expect(page.locator(".event-list")).toContainText(p.items[0].title);
});
