import { readerControl, readerTools } from "../helpers/reader";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
const fixture = (name: string) => `tests/fixtures/${name}`;
async function nav(page: Page, label: string) {
  const reduce = page.getByRole("button", {
    name: "Réduire la lecture",
    exact: true,
  });
  if (await reduce.isVisible()) await reduce.click();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: label, exact: true })
    .click();
}
async function importFile(page: Page, name = "generic.html") {
  await page
    .getByLabel("Fichiers HTML à importer")
    .setInputFiles(fixture(name));
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "Enregistrer dans ma bibliothèque" })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
async function demo(page: Page) {
  await page
    .getByRole("button", { name: "Essayer avec 2 éditions démo" })
    .click();
  await page
    .getByRole("button", { name: "Enregistrer dans ma bibliothèque" })
    .click();
  await expect(page.locator(".edition-card")).toHaveCount(2);
}
test("parcours complet : import, lecture, notes, favori, recherche, offline, export et restauration", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Votre première édition vous attend." }),
  ).toBeVisible();
  await importFile(page);
  await page
    .getByRole("button", { name: "Lire Journal générique", exact: true })
    .click();
  await readerControl(page, "Désactiver JS");
  await page
    .getByRole("button", { name: "Réduire la lecture", exact: true })
    .click();
  await expect(page.locator("iframe")).toHaveAttribute("sandbox", "");
  await expect(
    page
      .frameLocator("iframe")
      .getByRole("heading", { name: "Journal générique" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Ajouter aux favoris", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Marquer comme lue", exact: true })
    .click();
  await page
    .getByLabel("Votre note", { exact: true })
    .fill("Décision : conserver cette édition galaxie.");
  await page
    .getByRole("button", { name: "Enregistrer la note", exact: true })
    .click();
  await expect(page.locator(".note")).toContainText("Décision : conserver");
  const originalDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Original intact" }).click();
  const original = await originalDownload;
  expect(readFileSync((await original.path())!)).toEqual(
    readFileSync(fixture("generic.html")),
  );
  await page.reload();
  await nav(page, "Mémoire");
  await expect(page.locator(".memory-link").first()).toContainText(
    "Journal générique",
  );
  await expect(page.locator(".memory-link").last()).toContainText(
    "Décision : conserver",
  );
  await nav(page, "Rechercher");
  await page.getByLabel("Rechercher dans tous les journaux").fill("GALAXIE");
  await expect(page.locator(".result-row")).toHaveCount(2);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText("Hors ligne", { exact: true })).toBeVisible();
  await nav(page, "Bibliothèque");
  await page
    .getByRole("button", { name: "Lire Journal générique", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Réduire la lecture", exact: true })
    .click();
  await expect(
    page
      .frameLocator("iframe")
      .getByRole("heading", { name: "Journal générique" }),
  ).toBeVisible();
  await context.setOffline(false);
  await nav(page, "Réglages");
  const exportEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exporter tout" }).click();
  const backupPath = (await exportEvent).path();
  const backup = readFileSync((await backupPath)!);
  const fresh = await context.browser()!.newContext();
  const freshPage = await fresh.newPage();
  await freshPage.goto("/");
  await nav(freshPage, "Réglages");
  await freshPage.getByLabel("Archive ZIP à restaurer").setInputFiles({
    name: "backup.zip",
    mimeType: "application/zip",
    buffer: backup,
  });
  await expect(freshPage.getByRole("dialog")).toContainText(
    "1 éditions · 1 notes · 1 états",
  );
  await freshPage
    .getByRole("button", { name: "Fusionner la sauvegarde" })
    .click();
  await nav(freshPage, "Mémoire");
  await expect(freshPage.locator(".memory-link")).toHaveCount(2);
  await fresh.close();
});
test("démonstrations, interaction explicite et mémoire basée sur event_id", async ({
  page,
}) => {
  await page.goto("/");
  await demo(page);
  await page
    .getByRole("button", {
      name: "Lire Observer. Comprendre. Agir.",
      exact: true,
    })
    .click();
  const frame = page.frameLocator("iframe");
  await expect(
    page.getByRole("button", { name: "Désactiver JS", exact: true }),
  ).toBeHidden();
  await expect(page.locator("#trust-title")).toHaveCount(0);
  await frame.getByRole("button", { name: "Tester l’interaction" }).click();
  await expect(frame.locator("#counter")).toHaveText("1");
  await readerControl(page, "Désactiver JS");
  await frame.getByRole("button", { name: "Tester l’interaction" }).click();
  await expect(frame.locator("#counter")).toHaveText("0");
  await readerTools(page);
  await page.getByRole("button", { name: "Interactif", exact: true }).click();
  await page
    .getByRole("button", { name: "Je fais confiance à ce fichier" })
    .click();
  await expect(page.locator("iframe")).toHaveAttribute(
    "sandbox",
    "allow-scripts",
  );
  await frame.getByRole("button", { name: "Tester l’interaction" }).click();
  await expect(frame.locator("#counter")).toHaveText("1");
  await nav(page, "Mémoire");
  await page.locator(".event-group summary").click();
  await expect(page.locator(".event-occurrence")).toHaveCount(2);
  await expect(page.locator(".comparison-label")).toContainText(
    "texte modifié",
  );
});
test("renommage doublon, version, archive et corbeille récupérable", async ({
  page,
}) => {
  await page.goto("/");
  await importFile(page);
  await page.getByLabel("Fichiers HTML à importer").setInputFiles({
    name: "renomme.html",
    mimeType: "text/html",
    buffer: readFileSync(fixture("generic.html")),
  });
  await expect(page.getByRole("dialog")).toContainText("Doublon exact");
  await page
    .getByRole("button", { name: "Enregistrer dans ma bibliothèque" })
    .click();
  await expect(page.locator(".edition-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Lire Journal générique", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Réduire la lecture", exact: true })
    .click();
  await page.getByRole("button", { name: "Archiver", exact: true }).click();
  await nav(page, "Bibliothèque");
  await expect(page.locator(".edition-card")).toHaveCount(0);
  await page.getByRole("button", { name: "Archives", exact: true }).click();
  await expect(page.locator(".edition-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Corbeille", exact: true })
    .last()
    .click();
  await page
    .getByRole("button", { name: "Corbeille", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Restaurer", exact: true }).click();
  await expect(page.locator(".edition-card")).toHaveCount(0);
});
test("sécurité : parent, stockage, fetch, ressources, top et popups bloqués", async ({
  page,
}) => {
  const network: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("example.com")) network.push(r.url());
  });
  await page.goto("/");
  await importFile(page, "hostile.html");
  await page
    .getByRole("button", { name: "Lire Test hostile", exact: true })
    .click();
  await expect(
    page.frameLocator("iframe").getByRole("heading", { name: "Test hostile" }),
  ).toBeVisible();
  await readerControl(page, "Désactiver JS");
  await page
    .frameLocator("iframe")
    .getByText("Lien externe", { exact: true })
    .click();
  expect(network).toEqual([]);
  await readerTools(page);
  await page.getByRole("button", { name: "Interactif", exact: true }).click();
  await page
    .getByRole("button", { name: "Je fais confiance à ce fichier" })
    .click();
  await expect(page.frameLocator("iframe").locator("#result")).toContainText(
    '"parent":false',
  );
  await expect(page.frameLocator("iframe").locator("#result")).toContainText(
    '"storage":false',
  );
  expect(await page.locator("body").getAttribute("data-pwned")).toBeNull();
  expect(network).toEqual([]);
  expect(page.url()).toBe(`${test.info().project.use.baseURL}/`);
  expect(page.context().pages()).toHaveLength(1);
});
test("responsive, thèmes et accessibilité sur six largeurs", async ({
  page,
}) => {
  await page.goto("/");
  await demo(page);
  await nav(page, "Aujourd’hui");
  const toastClose = page.getByRole("button", {
    name: "Fermer la notification",
  });
  if (await toastClose.isVisible()) await toastClose.click();
  for (const width of [320, 375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const result = await new AxeBuilder({ page }).analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
    await page.screenshot({
      path: `docs/screenshots/home-${width}.png`,
      fullPage: false,
    });
  }
  await page.getByRole("button", { name: "Activer le mode sombre" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const dark = await new AxeBuilder({ page }).analyze();
  expect(dark.violations.map((v) => v.id)).toEqual([]);
});
test("manifest et réception Web Share Target en service worker", async ({
  page,
}) => {
  await page.goto("/");
  const manifest = await (
    await page.request.get("/manifest.webmanifest")
  ).json();
  expect(manifest.file_handlers[0].accept["text/html"]).toEqual([
    ".html",
    ".htm",
  ]);
  expect(manifest.share_target.method).toBe("POST");
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual([
    "192x192",
    "512x512",
  ]);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  const html = readFileSync(fixture("generic.html"), "utf8");
  await page.evaluate(async (html) => {
    const f = new FormData();
    f.append(
      "journals",
      new File([html], "partage.html", { type: "text/html" }),
    );
    await fetch("/share-target", { method: "POST", body: f });
  }, html);
  await expect(page.getByRole("dialog")).toContainText("partage.html");
  await page
    .getByRole("button", { name: "Enregistrer dans ma bibliothèque" })
    .click();
  await expect(page.locator(".edition-card")).toHaveCount(1);
});
test("File Handling launchQueue traite un HTML via le même écran de vérification", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "launchQueue", {
      value: {
        setConsumer: (consumer: unknown) => {
          (window as unknown as { testConsumer: unknown }).testConsumer =
            consumer;
        },
      },
    });
  });
  await page.goto("/open");
  await expect(
    page.getByRole("heading", { name: "Votre première édition vous attend." }),
  ).toBeVisible();
  const html = readFileSync(fixture("generic.html"), "utf8");
  await page.evaluate((html) => {
    const w = window as unknown as {
      testConsumer: (params: {
        files: { getFile: () => Promise<File> }[];
      }) => void;
    };
    w.testConsumer({
      files: [
        {
          getFile: async () =>
            new File([html], "ouvert.html", { type: "text/html" }),
        },
      ],
    });
  }, html);
  await expect(page.getByRole("dialog")).toContainText("ouvert.html");
  await page
    .getByRole("button", { name: "Enregistrer dans ma bibliothèque" })
    .click();
  await expect(page.locator(".edition-card")).toHaveCount(1);
});

test("lecture pleine page : tout le viewport, interactions conservées et retour sur mobile", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const append = Node.prototype.appendChild;
    Node.prototype.appendChild = function <T extends Node>(node: T): T {
      if (
        node instanceof HTMLIFrameElement &&
        node.classList.contains("edition-frame") &&
        !node.srcdoc
      ) {
        document.documentElement.dataset.emptyReaderFrame = "true";
      }
      return append.call(this, node) as T;
    };
  });
  await page.goto("/");
  await demo(page);
  await page
    .getByRole("button", {
      name: "Lire Observer. Comprendre. Agir.",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "Désactiver JS", exact: true }),
  ).toBeHidden();
  await expect(page.locator("#trust-title")).toHaveCount(0);
  const frame = page.frameLocator("iframe");
  await frame.getByRole("button", { name: "Tester l’interaction" }).click();
  await expect(frame.locator("#counter")).toHaveText("1");
  await page
    .getByRole("button", { name: "Réduire la lecture", exact: true })
    .click();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page
      .getByRole("button", { name: "Lecture pleine page", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    const bounds = await page.locator("iframe").boundingBox();
    expect(bounds?.x).toBe(0);
    expect(Math.abs(bounds!.width - width)).toBeLessThan(1);
    expect(bounds?.height).toBeGreaterThan(600);
    expect(Math.abs(bounds!.y + bounds!.height - 844)).toBeLessThan(1);
    await expect(
      page.getByLabel("Échelle du HTML", { exact: true }),
    ).toHaveText("70 %");
    await readerControl(page, "Dézoomer le HTML");
    await expect(
      page.getByLabel("Échelle du HTML", { exact: true }),
    ).toHaveText("60 %");
    await expect(frame.locator("#counter")).toHaveText("1");
    await readerControl(page, "Zoomer le HTML");
    await expect(page.locator("iframe")).toHaveAttribute(
      "sandbox",
      "allow-scripts",
    );
    await expect(frame.locator("#counter")).toHaveText("1");
    const a11y = await new AxeBuilder({ page }).analyze();
    expect(a11y.violations).toEqual([]);
    await page.screenshot({
      path: `docs/screenshots/reader-full-page-${width}.png`,
      fullPage: false,
    });
    await page
      .getByRole("button", { name: "Réduire la lecture", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(frame.locator("#counter")).toHaveText("1");
  }
  await page
    .getByRole("button", { name: "Lecture pleine page", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.locator("html").getAttribute("data-empty-reader-frame"),
  ).toBeNull();
  await page.reload();
  await page
    .getByRole("button", {
      name: "Lire Observer. Comprendre. Agir.",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "Désactiver JS", exact: true }),
  ).toBeHidden();
  await frame.getByRole("button", { name: "Tester l’interaction" }).click();
  await expect(frame.locator("#counter")).toHaveText("1");
  expect(
    await page.locator("html").getAttribute("data-empty-reader-frame"),
  ).toBeNull();
  await readerControl(page, "Recharger le HTML");
  await expect(frame.locator("#counter")).toHaveText("0");
  await expect(page.getByLabel("Échelle du HTML", { exact: true })).toHaveText(
    "70 %",
  );
  await expect(
    page.getByRole("button", { name: "Désactiver JS", exact: true }),
  ).toBeHidden();
});

test("mode interactif automatique, choix sécurisé conservé après rechargement et nouvelle édition interactive", async ({
  page,
}) => {
  await page.goto("/");
  await demo(page);
  await page
    .getByRole("button", {
      name: "Lire Observer. Comprendre. Agir.",
      exact: true,
    })
    .click();
  await expect(page.locator("iframe")).toHaveAttribute(
    "sandbox",
    "allow-scripts",
  );
  await expect(page.locator("#trust-title")).toHaveCount(0);
  await page
    .frameLocator("iframe")
    .getByRole("button", { name: "Tester l’interaction" })
    .click();
  await expect(page.frameLocator("iframe").locator("#counter")).toHaveText("1");
  await readerControl(page, "Désactiver JS");
  await expect(page.locator("iframe")).toHaveAttribute("sandbox", "");
  await page.reload();
  await page
    .getByRole("button", {
      name: "Lire Observer. Comprendre. Agir.",
      exact: true,
    })
    .click();
  await expect(page.locator("iframe")).toHaveAttribute("sandbox", "");
  await page
    .frameLocator("iframe")
    .getByRole("button", { name: "Tester l’interaction" })
    .click();
  await expect(page.frameLocator("iframe").locator("#counter")).toHaveText("0");
  await page
    .getByRole("button", { name: "Retour à la bibliothèque", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Lire Les idées passent. Gardez le fil.",
      exact: true,
    })
    .click();
  await expect(page.locator("iframe")).toHaveAttribute(
    "sandbox",
    "allow-scripts",
  );
  await expect(page.locator("#trust-title")).toHaveCount(0);
});
