import { navigate } from "../helpers/navigation";
import { test, expect, type Page } from "@playwright/test";
import { dailyFile } from "../helpers/daily";
async function nav(page: Page, label = "Bibliothèque") {
  return navigate(page, label);
}
async function importFiles(
  page: Page,
  hours: string[],
  date = "2026-10-15",
  extras: Record<string, unknown> = {},
) {
  await page.getByLabel("Fichiers HTML à importer").setInputFiles(
    hours.map((hour) => {
      const file = dailyFile(hour, date, extras);
      return {
        name: file.name,
        mimeType: "text/html",
        buffer: Buffer.from(file.html),
      };
    }),
  );
  const modal = page.getByRole("dialog", { name: "Vérifier l’import" });
  await expect(modal).toContainText("Une seule édition par jour");
  await expect(
    modal.getByRole("option", {
      name: "Conserver comme édition indépendante",
      exact: true,
    }),
  ).toHaveCount(0);
  await modal
    .getByRole("button", {
      name: "Enregistrer dans ma bibliothèque",
      exact: true,
    })
    .click();
  await expect(modal).toHaveCount(0);
}
async function open(page: Page, hour = "21") {
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
  await expect(
    page.frameLocator(".edition-frame").locator("#release"),
  ).toContainText(`Édition ${hour}h`);
}
test("un HTML par jour : quatre imports successifs remplacent la carte, JS/offline et annotations restent disponibles", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await importFiles(page, ["08"]);
  await open(page, "08");
  await page
    .getByRole("button", { name: "Réduire la lecture", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ajouter aux favoris", exact: true })
    .click();
  await page
    .getByLabel("Votre note", { exact: true })
    .fill("Note privée fictive du matin conservée");
  await page
    .getByRole("button", { name: "Enregistrer la note", exact: true })
    .click();
  await expect(page.locator(".note")).toHaveCount(1);
  await nav(page);
  for (const hour of ["12", "16", "21"]) {
    await importFiles(page, [hour]);
    await expect(page.locator(".edition-card")).toHaveCount(1);
    await expect(page.locator(".day-card h3")).toHaveText(
      `Journal synthétique 2026-10-15 ${hour}h`,
    );
  }
  await nav(page, "Accueil");
  await page.getByRole("button", { name: "Reprendre", exact: true }).click();
  await expect(
    page.frameLocator(".edition-frame").locator("#release"),
  ).toContainText("Édition 21h");
  await nav(page);
  await open(page);
  await page.frameLocator(".edition-frame").locator("#counter").click();
  await expect(
    page.frameLocator(".edition-frame").locator("#counter"),
  ).toHaveText("1");
  await nav(page);
  await page
    .getByRole("button", { name: "Historique des éditions", exact: true })
    .click();
  await expect(page.locator(".day-history article")).toHaveCount(4);
  await expect(
    page.getByText("Note privée fictive du matin conservée", { exact: true }),
  ).toBeVisible();
  await nav(page, "Mémoire");
  await expect(
    page
      .locator(".memory-link")
      .filter({ hasText: "Journal synthétique 2026-10-15 08h" }),
  ).toBeVisible();
  await nav(page);
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await nav(page);
  await expect(page.locator(".edition-card")).toHaveCount(1);
  await open(page);
});
test("lot désordonné, doublon renommé et nouvelle journée : la dernière édition reste seule, recherche limitée au HTML courant", async ({
  page,
}) => {
  await page.goto("/");
  await importFiles(page, ["08"], "2026-10-15", {
    title: "Ancien marquage disparu",
  });
  await importFiles(page, ["21", "08", "16", "12"]);
  await page.getByLabel("Fichiers HTML à importer").setInputFiles({
    name: "copie-renommee.html",
    mimeType: "text/html",
    buffer: Buffer.from(dailyFile("21").html),
  });
  await expect(page.getByRole("dialog")).toContainText("Doublon exact");
  await page
    .getByRole("button", {
      name: "Enregistrer dans ma bibliothèque",
      exact: true,
    })
    .click();
  await expect(page.locator(".day-card")).toContainText("5 version(s)");
  await expect(page.locator(".edition-card")).toHaveCount(1);
  await expect(page.locator(".day-card h3")).toHaveText(
    "Journal synthétique 2026-10-15 21h",
  );
  await importFiles(page, ["08"], "2026-10-16");
  await expect(page.locator(".edition-card")).toHaveCount(2);
  await page
    .getByRole("textbox", {
      name: "Rechercher dans la bibliothèque",
      exact: true,
    })
    .fill("Ancien marquage disparu");
  await expect(page.locator(".edition-card")).toHaveCount(0);
  await nav(page, "Rechercher");
  await expect(page.locator(".result-row")).toHaveCount(0);
  await nav(page);
  await page
    .getByRole("textbox", {
      name: "Rechercher dans la bibliothèque",
      exact: true,
    })
    .fill("");
  await expect(page.locator(".edition-card")).toHaveCount(2);
  // Manually dating an otherwise undated HTML also enforces one daily card.
  // Clearing that date restores validation of the still-selected version mode.
  const undated = dailyFile("08", "2026-10-15", { editionDate: undefined });
  await page.getByLabel("Fichiers HTML à importer").setInputFiles({
    name: "sans-date.html",
    mimeType: "text/html",
    buffer: Buffer.from(undated.html),
  });
  const modal = page.getByRole("dialog").filter({
    has: page.getByRole("heading", {
      name: "Vérifier l’import",
      exact: true,
    }),
  });
  const date = modal.getByLabel(/^Date éditoriale/);
  const save = modal.getByRole("button", {
    name: "Enregistrer dans ma bibliothèque",
    exact: true,
  });
  await modal
    .getByRole("combobox", { name: "Conservation", exact: true })
    .selectOption("version");
  await expect(save).toBeDisabled();
  await date.fill("2026-10-17");
  await expect(save).toBeEnabled();
  await expect(
    modal.getByRole("combobox", { name: "Conservation", exact: true }),
  ).toHaveValue("day");
  await date.fill("");
  await expect(save).toBeDisabled();
  await date.fill("2026-10-17");
  await save.click();
  await expect(page.locator(".edition-card")).toHaveCount(3);
});
test("mise à jour des anciens imports indépendants : regroupement immédiat sans migration des UUID ni réimport", async ({
  page,
}) => {
  await page.goto("/");
  await importFiles(page, ["08", "12", "16", "21"]);
  const before = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("journal360-private");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const tx = db.transaction("editions", "readwrite"),
        store = tx.objectStore("editions");
      const rows = await new Promise<Record<string, unknown>[]>(
        (resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        },
      );
      for (const row of rows) {
        delete row.dayKey;
        row.independent = true;
        row.date = null;
        row.familyId = row.id;
        store.put(row);
      }
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      return rows;
    } finally {
      db.close();
    }
  });
  await page.reload();
  await nav(page);
  await expect(page.locator(".edition-card")).toHaveCount(1);
  await open(page);
  await nav(page);
  await page
    .getByRole("button", { name: "Historique des éditions", exact: true })
    .click();
  await expect(page.locator(".day-history article")).toHaveCount(4);
  const after = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("journal360-private");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<Record<string, unknown>[]>((resolve, reject) => {
        const request = db
          .transaction("editions", "readonly")
          .objectStore("editions")
          .getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  });
  expect(after).toEqual(before);
});
test("archiver, corbeille et restaurer une journée ne font pas réapparaître une ancienne carte", async ({
  page,
}) => {
  await page.goto("/");
  await importFiles(page, ["08", "12"]);
  await open(page, "12");
  await page
    .getByRole("button", { name: "Réduire la lecture", exact: true })
    .click();
  await page.getByRole("button", { name: "Archiver", exact: true }).click();
  await nav(page);
  await expect(page.locator(".edition-card")).toHaveCount(0);
  await page.getByRole("button", { name: "Archives", exact: true }).click();
  await expect(page.locator(".edition-card")).toHaveCount(1);
  await page
    .locator(".day-card")
    .getByRole("button", { name: "Corbeille", exact: true })
    .click();
  await expect(page.locator(".edition-card")).toHaveCount(0);
  await page.getByRole("button", { name: "Corbeille", exact: true }).click();
  await expect(page.locator(".edition-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Restaurer", exact: true }).click();
  await page.getByRole("button", { name: "Éditions", exact: true }).click();
  await expect(page.locator(".edition-card")).toHaveCount(0);
  await page.getByRole("button", { name: "Archives", exact: true }).click();
  await expect(page.locator(".day-card h3")).toHaveText(
    "Journal synthétique 2026-10-15 12h",
  );
});
