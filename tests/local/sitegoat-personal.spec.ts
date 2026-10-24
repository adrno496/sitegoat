import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { navigate } from "../helpers/navigation";

test("SG-06 : trois exports UI, restauration dans un vrai contexte vierge, notes et recherches conservées", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Fichiers HTML à importer")
    .setInputFiles("tests/fixtures/generic.html");
  await page
    .getByRole("button", {
      name: "Enregistrer dans ma bibliothèque",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Lire Journal générique", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Réduire la lecture", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ajouter aux favoris", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Marquer comme lue", exact: true })
    .click();
  await page
    .getByLabel("Votre note", { exact: true })
    .fill("NOTE_SYNTHETIQUE_SG06");
  await page
    .getByRole("button", { name: "Enregistrer la note", exact: true })
    .click();
  await expect(page.locator(".note")).toContainText("NOTE_SYNTHETIQUE_SG06");
  await navigate(page, "Le Futur");
  await page.getByLabel("Fichiers HTML à importer").setInputFiles({
    name: "future.json",
    mimeType: "application/json",
    buffer: readFileSync("public/examples/future/EXEMPLE_FUTUR_IA_v1.json"),
  });
  await page.getByRole("button", { name: /Importer \d+ fichier/ }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await navigate(page, "Actualité rapide");
  await page.getByRole("tab", { name: "Récurrent", exact: true }).click();
  await page
    .getByRole("button", { name: "Ajouter une recherche", exact: true })
    .click();
  await page
    .getByLabel("Thème", { exact: true })
    .fill("RECHERCHE_SYNTHETIQUE_SG06");
  await page
    .getByRole("button", { name: "Ajouter la recherche", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "RECHERCHE_SYNTHETIQUE_SG06",
      exact: true,
    }),
  ).toBeVisible();
  await navigate(page, "Paramètres");
  await page.getByLabel("Animations", { exact: true }).uncheck();
  await page
    .getByText("Profils et options historiques", { exact: true })
    .click();
  await page
    .getByLabel("Profil d’interface", { exact: true })
    .selectOption("complete");
  await page
    .getByRole("button", { name: "Activer le mode sombre", exact: true })
    .click();
  async function save(label: string) {
    const event = page.waitForEvent("download");
    await page.getByRole("button", { name: label, exact: true }).click();
    return readFile((await (await event).path())!);
  }
  const journal = await save("Sauvegarder les journaux"),
    future = await save("Sauvegarder Le Futur ici"),
    settings = await save("Sauvegarder les réglages et recherches");
  expect(settings.toString()).not.toContain("reader-default");
  const fresh = await context.browser()!.newContext({
    storageState: { cookies: [], origins: [] },
    baseURL: "http://127.0.0.1:4184",
    viewport: { width: 390, height: 844 },
  });
  const p = await fresh.newPage();
  await p.route("**/*", (r) =>
    new URL(r.request().url()).hostname === "127.0.0.1"
      ? r.continue()
      : r.abort(),
  );
  try {
    await p.goto("/");
    await navigate(p, "Paramètres");
    await p.getByLabel("Archive ZIP à restaurer").setInputFiles({
      name: "journal.zip",
      mimeType: "application/zip",
      buffer: journal,
    });
    await expect(p.getByRole("dialog")).toContainText(
      "1 éditions · 1 notes · 1 états",
    );
    await p
      .getByRole("button", { name: "Fusionner la sauvegarde", exact: true })
      .click();
    await expect(p.getByRole("dialog")).toHaveCount(0);
    await p.getByLabel("Réglages personnels à restaurer").setInputFiles({
      name: "settings.json",
      mimeType: "application/json",
      buffer: settings,
    });
    for (const label of ["affichage", "interface", "recherches", "thème"]) {
      const b = p.getByRole("button", {
        name: "Confirmer : " + label,
        exact: true,
      });
      await expect(b).toBeEnabled();
      await b.click();
      await expect(
        p
          .getByRole("status")
          .filter({ hasText: "Espace " + label + " restauré." }),
      ).toBeVisible();
    }
    await p
      .getByRole("button", { name: "Fermer l’aperçu", exact: true })
      .click();
    await navigate(p, "Le Futur");
    await p.getByLabel("Sauvegarde Le Futur à restaurer").setInputFiles({
      name: "future.zip",
      mimeType: "application/zip",
      buffer: future,
    });
    await p
      .getByRole("button", { name: "Fusionner Le Futur", exact: true })
      .click();
    await expect(p.getByRole("dialog")).toHaveCount(0);
    await expect(p.locator(".future-card")).toHaveCount(1);
    await navigate(p, "Mémoire");
    await expect(p.locator(".memory-link")).toHaveCount(2);
    await expect(p.locator(".memory-link").last()).toContainText(
      "NOTE_SYNTHETIQUE_SG06",
    );
    await p.reload();
    await navigate(p, "Actualité rapide");
    await p.getByRole("tab", { name: "Récurrent", exact: true }).click();
    await expect(
      p.getByRole("heading", {
        name: "RECHERCHE_SYNTHETIQUE_SG06",
        exact: true,
      }),
    ).toBeVisible();
    await navigate(p, "Paramètres");
    await expect(p.getByLabel("Animations", { exact: true })).not.toBeChecked();
  } finally {
    await fresh.close();
  }
});
