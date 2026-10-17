import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dailyFile } from "../helpers/daily";
const folder = "public/examples/future/";
const example = JSON.parse(
  readFileSync(folder + "EXEMPLE_FUTUR_IA_v1.json", "utf8"),
);
async function nav(page: Page, label = "Le Futur") {
  const surface = (await page.locator(".sidebar").isVisible())
    ? ".sidebar"
    : ".mobile-nav";
  await page
    .locator(surface)
    .getByRole("button", { name: label, exact: true })
    .click();
}
async function upload(page: Page, payload: unknown = example) {
  await page.getByLabel("Fichiers HTML à importer").setInputFiles({
    name: "future.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(payload)),
  });
  await expect(
    page.getByRole("dialog", { name: "Importer des dossiers" }),
  ).toBeVisible();
}
async function confirm(page: Page) {
  await page.getByRole("button", { name: /Importer \d+ fichier/ }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
async function open(page: Page, title = example.title) {
  await page.locator(".future-title").getByText(title, { exact: true }).click();
  await expect(page.locator(".future-detail")).toBeVisible();
}
async function closeToast(page: Page) {
  const b = page.getByRole("button", {
    name: "Fermer la notification",
    exact: true,
  });
  if (await b.isVisible()) await b.click();
}
test("Le Futur : HTML dédié, six modules, notes, révision confirmée, export, sauvegarde et offline", async ({
  page,
  context,
}) => {
  await page.goto("/");
  const customHTML = readFileSync(
    folder + "APERCU_FUTUR_IA_ANIME.html",
    "utf8",
  ).replace(
    "</head>",
    "<style>@keyframes foreign-motion{to{opacity:.1}}body{animation:foreign-motion 1s infinite;background:rgb(255,0,0)}</style></head>",
  );
  await page.getByLabel("Fichiers HTML à importer").setInputFiles({
    name: "APERCU_FUTUR_IA_ANIME.html",
    mimeType: "text/html",
    buffer: Buffer.from(customHTML),
  });
  await expect(page.getByRole("dialog")).toContainText("Nouveau dossier");
  await confirm(page);
  await closeToast(page);
  await expect(
    page.getByRole("heading", { name: "Le Futur", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".day-card")).toHaveCount(0);
  await open(page);
  await expect(page.locator(".future-module")).toHaveCount(6);
  await expect(page.locator("#future-module-scenarios")).toContainText(
    "Progression modérée",
  );
  await expect(page.locator("#future-module-signals")).toContainText(
    "Aucun contrôle automatique",
  );
  await page
    .getByRole("button", { name: "Ajouter aux favoris", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Retirer des favoris" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByLabel("Nouvelle note", { exact: true })
    .fill("Mon hypothèse à réexaminer");
  await page
    .getByRole("button", { name: "Ajouter ma note", exact: true })
    .click();
  await expect(page.locator(".future-personal")).toContainText(
    "Mon hypothèse à réexaminer",
  );
  await page
    .getByLabel("Suivi de « Tester un outil sur une tâche bornée »")
    .selectOption("doing");
  await expect(
    page.getByLabel("Suivi de « Tester un outil sur une tâche bornée »"),
  ).toHaveValue("doing");
  await page.getByRole("button", { name: "Voir l’aperçu HTML isolé" }).click();
  await expect(page.locator(".future-preview")).toHaveAttribute("sandbox", "");
  const previewBody = page.frameLocator(".future-preview").locator("body");
  await expect(previewBody).toBeVisible();
  expect(
    await previewBody.evaluate((e) => getComputedStyle(e).animationName),
  ).not.toContain("foreign-motion");
  expect(
    await previewBody.evaluate((e) => getComputedStyle(e).backgroundColor),
  ).not.toBe("rgb(255, 0, 0)");
  await expect(
    page
      .frameLocator(".future-preview")
      .getByRole("heading", { name: example.title, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Fermer l’aperçu", exact: true })
    .click();
  const jsonDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exporter JSON", exact: true })
    .click();
  expect(
    JSON.parse(readFileSync((await (await jsonDownload).path())!, "utf8"))
      .documentId,
  ).toBe(example.documentId);
  const update = {
    ...example,
    revision: 2,
    updatedAt: "2026-10-16T15:00:00Z",
    title: "Futur corrigé",
    signals: [
      ...example.signals,
      {
        ...example.signals[0],
        id: "contradiction-fictive",
        title: "Objection fictive à documenter",
        status: "contradicted",
        description:
          "Contre-signal synthétique pour tester la traçabilité ; aucune preuve réelle revendiquée.",
      },
    ],
  };
  await upload(page, update);
  await expect(page.getByRole("dialog")).toContainText("Mise à jour");
  await expect(
    page.getByRole("button", { name: /Importer \d+ fichier/ }),
  ).toBeDisabled();
  await page
    .getByLabel("J’ai lu les différences et confirme cette mise à jour.")
    .check();
  await confirm(page);
  await closeToast(page);
  await expect(page.locator(".future-detail h2").first()).toHaveText(
    "Futur corrigé",
  );
  await expect(page.locator("#future-module-sources")).toContainText(
    "Objection fictive à documenter",
  );
  await expect(page.locator(".future-personal")).toContainText(
    "Mon hypothèse à réexaminer",
  );
  await expect(
    page.getByRole("button", { name: "Retirer des favoris" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Version affichée").locator("option"),
  ).toHaveCount(2);
  const first = await page
    .getByLabel("Version affichée")
    .locator("option")
    .filter({ hasText: "Révision 1" })
    .getAttribute("value");
  await page.getByLabel("Version affichée").selectOption(first!);
  await expect(page.locator(".future-detail h2").first()).toHaveText(
    example.title,
  );
  await page.getByRole("button", { name: "← Tous les dossiers" }).click();
  const backup = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Sauvegarder Le Futur", exact: true })
    .click();
  const backupPath = (await (await backup).path())!;
  await page.getByLabel("Sauvegarde Le Futur à restaurer").setInputFiles({
    name: "future.zip",
    mimeType: "application/zip",
    buffer: readFileSync(backupPath),
  });
  await expect(page.getByRole("dialog")).toContainText("2 révisions");
  await page
    .getByRole("button", { name: "Fusionner Le Futur", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await nav(page);
  await open(page, "Futur corrigé");
  await expect(page.locator(".future-personal")).toContainText(
    "Mon hypothèse à réexaminer",
  );
  await expect(page.locator(".future-module")).toHaveCount(6);
});
test("Le Futur : conflits, hostile, doublons et transfert explicite des journaux", async ({
  page,
}) => {
  await page.goto("/");
  await nav(page);
  await upload(page);
  await confirm(page);
  await closeToast(page);
  await upload(page);
  await expect(page.getByRole("dialog")).toContainText("Doublon");
  await expect(
    page.getByRole("button", { name: /Importer \d+ fichier/ }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await upload(page, { ...example, title: "Conflit" });
  await expect(page.getByRole("dialog")).toContainText("Conflit");
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  const exfilRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("exfil.invalid"))
      exfilRequests.push(request.url());
  });
  const raw = readFileSync(
    folder + "APERCU_FUTUR_IA_ANIME.html",
    "utf8",
  ).replace(
    "</body>",
    '<img src="https://exfil.invalid/private-data"><script>parent.document.body.dataset.exfil="yes"</script></body>',
  );
  await page.getByLabel("Fichiers HTML à importer").setInputFiles({
    name: "hostile.html",
    mimeType: "text/html",
    buffer: Buffer.from(raw),
  });
  await expect(page.getByRole("dialog")).toContainText("Incompatible");
  await expect(
    page.getByRole("button", { name: /Importer \d+ fichier/ }),
  ).toBeDisabled();
  expect(await page.locator("body").getAttribute("data-exfil")).toBeNull();
  expect(exfilRequests).toEqual([]);
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  const daily = dailyFile("16");
  await page.getByLabel("Fichiers HTML à importer").setInputFiles({
    name: daily.name,
    mimeType: "text/html",
    buffer: Buffer.from(daily.html),
  });
  await expect(page.getByRole("dialog")).toContainText("journal standard");
  await page
    .getByRole("button", { name: "Transférer ce journal vers Bibliothèque" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Vérifier l’import" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Enregistrer dans ma bibliothèque" })
    .click();
  await expect(page.locator(".day-card")).toHaveCount(1);
  await nav(page);
  await expect(page.locator(".future-card")).toHaveCount(1);
});
test("Le Futur : clavier, axe, quatre largeurs, mouvement réduit et sombre", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await nav(page);
  await upload(page);
  await confirm(page);
  await closeToast(page);
  await open(page);
  expect(
    await page
      .locator(".future-module")
      .first()
      .evaluate((e) => getComputedStyle(e).animationName),
  ).toBe("none");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  const results = await new AxeBuilder({ page })
    .include(".future-workspace")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  await page
    .getByRole("button", { name: "Exporter JSON", exact: true })
    .focus();
  const keyboardDownload = page.waitForEvent("download");
  await page.keyboard.press("Enter");
  expect((await keyboardDownload).suggestedFilename()).toContain(".json");
  await page.keyboard.press("Tab");
  await expect(page.locator(".future-workspace :focus")).toHaveCount(1);
  const timelineLink = page
    .locator(".future-module-nav")
    .getByRole("link", { name: "Chronologie", exact: true });
  await timelineLink.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#future-module-timeline$/);
  await nav(page, "Réglages");
  await page
    .getByRole("button", { name: "Lecture sombre", exact: true })
    .click();
  await nav(page);
  await open(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const dark = await new AxeBuilder({ page })
    .include(".future-workspace")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(dark.violations).toEqual([]);
  const frames = await page.evaluate(
    () =>
      new Promise<number[]>((resolve) => {
        const frames: number[] = [];
        let last = performance.now();
        const sample = (at: number) => {
          frames.push(at - last);
          last = at;
          if (frames.length === 30) resolve(frames);
          else requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      }),
  );
  mkdirSync("docs/evidence/future", { recursive: true });
  writeFileSync(
    `docs/evidence/future/frames-${test.info().project.name}.json`,
    JSON.stringify(
      {
        project: test.info().project.name,
        environment:
          "headless local, reduced motion; not a physical phone or active animation benchmark",
        frames: frames.length,
        meanFrameMs: frames.reduce((a, b) => a + b, 0) / frames.length,
        maxFrameMs: Math.max(...frames),
      },
      null,
      2,
    ) + "\n",
  );
  await page.screenshot({
    path: `test-results/future-${test.info().project.name}.png`,
    fullPage: true,
  });
});

test("Le Futur : migration AI-RADAR explicite et revue personnelle distincte de la source déclarée", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Fichiers HTML à importer")
    .setInputFiles("tests/fixtures/future-legacy.html");
  await expect(page.getByRole("dialog")).toContainText("migration AI-RADAR");
  await expect(
    page.getByRole("button", { name: /Importer \d+ fichier/ }),
  ).toBeDisabled();
  await page
    .getByRole("checkbox", { name: /Je confirme la migration/ })
    .check();
  await confirm(page);
  await closeToast(page);
  await open(page, "Ancien AI-RADAR synthétique");
  await expect(page.locator("#future-module-signals")).toContainText("Inconnu");
  await expect(page.locator("#future-module-sources")).toContainText(
    "Consultation déclarée : non renseigné",
  );
  await page
    .getByLabel("Justifier ma consultation de « Exemple illustratif »")
    .fill("Consultation personnelle de l’exemple, sans certification du fait.");
  await page
    .getByRole("button", { name: "Enregistrer ma revue personnelle" })
    .click();
  await expect(page.locator("#future-module-sources")).toContainText(
    "Revue personnelle enregistrée",
  );
  await nav(page, "Bibliothèque");
  await expect(page.locator(".day-card")).toHaveCount(0);
});

test("Le Futur : capacité insuffisante et lot mixte avec un journal", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "storage", {
      configurable: true,
      value: { estimate: async () => ({ usage: 999999, quota: 1000000 }) },
    });
  });
  await page.goto("/");
  expect(
    await page.evaluate(async () => (await navigator.storage.estimate()).quota),
  ).toBe(1000000);
  await upload(page);
  await expect(page.getByRole("dialog")).toContainText(
    "Espace disponible insuffisant",
  );
  await expect(
    page.getByRole("button", { name: /Importer \d+ fichier/ }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await page.evaluate(() => {
    Object.defineProperty(navigator, "storage", {
      configurable: true,
      value: { estimate: async () => ({ usage: 0, quota: 100000000 }) },
    });
  });
  const daily = dailyFile("21", "2026-10-16");
  await page.getByLabel("Fichiers HTML à importer").setInputFiles([
    {
      name: daily.name,
      mimeType: "text/html",
      buffer: Buffer.from(daily.html),
    },
    {
      name: "future.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(example)),
    },
  ]);
  await expect(
    page.getByRole("dialog", { name: "Vérifier l’import" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Enregistrer dans ma bibliothèque" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Importer des dossiers" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await confirm(page);
  await closeToast(page);
  await expect(page.locator(".future-card")).toHaveCount(1);
  await nav(page, "Bibliothèque");
  await expect(page.locator(".day-card")).toHaveCount(1);
});

test("Le Futur : lot désordonné, doublon HTML/JSON et confirmations par révision", async ({
  page,
}) => {
  await page.goto("/");
  await nav(page);
  const update = {
    ...example,
    revision: 2,
    updatedAt: "2026-10-16T15:00:00Z",
    title: "Révision du lot",
  };
  await page.getByLabel("Fichiers HTML à importer").setInputFiles([
    {
      name: "revision-2.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(update)),
    },
    {
      name: "revision-1.html",
      mimeType: "text/html",
      buffer: readFileSync(folder + "APERCU_FUTUR_IA_ANIME.html"),
    },
    {
      name: "revision-1-copie.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(example)),
    },
  ]);
  const modal = page.getByRole("dialog");
  await expect(modal).toContainText("Nouveau dossier");
  await expect(modal).toContainText("Mise à jour");
  await expect(modal).toContainText("Doublon");
  await expect(
    page.getByRole("button", { name: /Importer 2 fichier/ }),
  ).toBeDisabled();
  await page
    .getByLabel("J’ai lu les différences et confirme cette mise à jour.")
    .check();
  await confirm(page);
  await expect(
    page.getByRole("status").filter({ hasText: "1 doublon ignoré" }),
  ).toBeVisible();
  await closeToast(page);
  await open(page, "Révision du lot");
  await expect(
    page.getByLabel("Version affichée").locator("option"),
  ).toHaveCount(2);
  const old = await page
    .getByLabel("Version affichée")
    .locator("option")
    .filter({ hasText: "Révision 1" })
    .getAttribute("value");
  await page.getByLabel("Version affichée").selectOption(old!);
  await expect(page.locator(".future-detail h2").first()).toHaveText(
    example.title,
  );
});
