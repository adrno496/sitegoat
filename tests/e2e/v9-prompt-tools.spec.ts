import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import { navigate, openReadingTools } from "../helpers/navigation";
import { auditHTML, auditPayload } from "../helpers/audit";

async function importFiles(page: Page) {
  const payloads = [auditPayload("08"), auditPayload("10")];
  // Special characters must remain part of the title sent to Google.
  for (const p of payloads)
    p.items[0].title = "Énergie & IA : coût + bénéfices ?";
  await page.getByLabel("Fichiers HTML à importer").setInputFiles(
    payloads.map((p) => ({
      name: `edition-${p.editionSlot.replace(":", "h")}.html`,
      mimeType: "text/html",
      buffer: auditHTML(p),
    })),
  );
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
  await navigate(page, "Aujourd’hui");
  await openReadingTools(page);
  return payloads;
}

test("tous les prompts sont téléchargés en un ZIP, même avec un filtre actif et hors ligne", async ({
  page,
  context,
}) => {
  await page.goto("/");
  const payloads = await importFiles(page);
  const w = page.locator(".unified-workspace");
  await w.getByRole("button", { name: "Mes prompts .md", exact: true }).click();
  await w
    .getByLabel("Rechercher un prompt")
    .fill("aucun-document-ne-correspond");
  await expect(w.locator(".unified-result")).toHaveCount(0);
  await context.setOffline(true);
  const event = page.waitForEvent("download");
  await w
    .getByRole("button", {
      name: "Télécharger tous les prompts (.zip)",
      exact: true,
    })
    .click();
  const download = await event;
  expect(download.suggestedFilename()).toBe("mes-prompts.zip");
  const zip = await JSZip.loadAsync(await readFile((await download.path())!));
  const contents = await Promise.all(
    Object.values(zip.files)
      .filter((f) => !f.dir)
      .map((f) => f.async("string")),
  );
  expect(contents.sort()).toEqual(
    payloads.flatMap((p) => p.promptAssets.map((a) => a.content)).sort(),
  );
  await expect(
    w.getByRole("status").filter({ hasText: "mes-prompts.zip" }),
  ).toContainText("5 prompt(s)");
});

test("un article ouvert depuis la recherche globale permet de rechercher son titre exact sur Google", async ({
  page,
  context,
}) => {
  await page.goto("/");
  const payloads = await importFiles(page);
  const w = page.locator(".unified-workspace");
  await w
    .getByRole("button", { name: "Recherche globale", exact: true })
    .click();
  const title = payloads[1].items[0].title;
  await w.getByLabel("Rechercher partout").fill(title);
  await w
    .locator(".unified-result")
    .filter({ has: page.getByText(title, { exact: true }) })
    .click();
  const link = page
    .locator(".reading-surface-header")
    .getByRole("link", { name: "Recherche Google", exact: true });
  await expect(link).toBeVisible();
  const href = (await link.getAttribute("href"))!;
  const url = new URL(href);
  expect(url.origin + url.pathname).toBe("https://www.google.com/search");
  expect(url.searchParams.get("q")).toBe(title);
  expect(url.searchParams.get("udm")).toBeNull();
  await context.route("https://www.google.com/**", (route) =>
    route.fulfill({ body: "Recherche de test" }),
  );
  const opened = context.waitForEvent("page");
  await link.click();
  const google = await opened;
  await expect(google).toHaveURL(href);
  await google.close();
  await page
    .getByRole("button", { name: "Réduire la lecture", exact: true })
    .click();
  await expect(link).toBeVisible();
});
