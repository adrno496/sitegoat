import { navigate } from "../helpers/navigation";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
const example = JSON.parse(
  readFileSync("public/examples/future/EXEMPLE_FUTUR_IA_v1.json", "utf8"),
);
async function nav(page: Page, label = "Le Futur") {
  return navigate(page, label);
}
async function upload(page: Page, payload = example) {
  await page.getByLabel("Fichiers HTML à importer").setInputFiles({
    name: "atlas.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(payload)),
  });
  await page.getByRole("button", { name: /Importer \d+ fichier/ }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const toast = page.getByRole("button", {
    name: "Fermer la notification",
    exact: true,
  });
  if (await toast.isVisible()) await toast.click();
}
async function open(page: Page) {
  await page.locator(".future-title").first().click();
  await expect(page.locator(".future-detail")).toBeVisible();
}
async function init(page: Page, payload = example) {
  await page.goto("/");
  await nav(page);
  await upload(page, payload);
  await open(page);
}
async function reducedGuard(page: Page) {
  const animated = await page.locator(".future-workspace").evaluate((root) =>
    [...root.querySelectorAll("*")].some((el) => {
      const s = getComputedStyle(el);
      return (
        s.animationName !== "none" &&
        s.animationDuration.split(",").some((t) => parseFloat(t) > 0)
      );
    }),
  );
  if (animated) throw Error("Mouvement actif malgré la réduction");
}
async function railKeyboardGuard(page: Page) {
  const b = page.locator(".future-horizon-rail button");
  await b.first().focus();
  await page.keyboard.press("ArrowRight");
  if (!(await b.nth(1).evaluate((el) => el === document.activeElement)))
    throw Error("Horizon inaccessible au clavier");
}
test("Atlas P0 : compteurs réels, filtres, favoris, pagination et retour du focus", async ({
  page,
}) => {
  await page.goto("/");
  await nav(page);
  await expect(page.locator(".future-empty")).toContainText(
    "Votre premier dossier",
  );
  await expect(page.locator(".future-summary strong")).toHaveText([
    "0",
    "0",
    "0",
  ]);
  await upload(page);
  await expect(page.locator(".future-summary strong")).toHaveText([
    "0",
    "10",
    "3",
  ]);
  await expect(page.locator(".future-changed")).toContainText(
    /Première visite|Aucun nouveau/,
  );
  const filter = page.locator(".future-filter-panel");
  if (!(await filter.evaluate((e) => (e as HTMLDetailsElement).open)))
    await filter.locator("summary").click();
  await page.getByLabel("Rechercher un dossier").fill("introuvable");
  await expect(page.locator(".future-card")).toHaveCount(0);
  await filter.getByRole("button", { name: "Effacer les filtres" }).click();
  await expect(page.locator(".future-card")).toHaveCount(1);
  await open(page);
  await expect(page.locator(".future-dossier-header h2")).toBeFocused();
  await page
    .getByRole("button", { name: "Ajouter aux favoris", exact: true })
    .click();
  await page.getByRole("button", { name: "← Tous les dossiers" }).click();
  await expect(page.locator(".future-title")).toBeFocused();
  await page.getByLabel("Favoris", { exact: true }).check();
  await expect(page.locator(".future-card")).toHaveCount(1);
  await page.getByLabel("Rechercher un dossier").fill("evaluation critique");
  await expect(page.locator(".future-card")).toHaveCount(1);
  await open(page);
  await page
    .getByRole("button", { name: "Retirer des favoris", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Ajouter aux favoris", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "← Tous les dossiers" }).click();
  await expect(page.locator(".future-card")).toHaveCount(0);
  await expect(page.locator("#future-collection-heading")).toBeFocused();
  await filter.getByRole("button", { name: "Effacer les filtres" }).click();
  const files = Array.from({ length: 20 }, (_, i) => ({
    name: "atlas-" + i + ".json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        ...example,
        documentId: "atlas-" + i,
        title: "Dossier synthétique " + i,
      }),
    ),
  }));
  await page.getByLabel("Fichiers HTML à importer").setInputFiles(files);
  await page.getByRole("button", { name: /Importer 20 fichier/ }).click();
  await expect(page.locator(".future-card")).toHaveCount(20);
  await expect(page.locator(".future-summary strong")).toHaveText([
    "0",
    "210",
    "63",
  ]);
  await page
    .getByRole("button", { name: "Page suivante", exact: true })
    .click();
  await expect(page.locator(".future-card")).toHaveCount(1);
});
test("Atlas P1 : frise fidèle, clavier, liens déclarés et comparateur", async ({
  page,
}) => {
  await init(page);
  const rail = page.locator(".future-horizon-rail");
  await expect(rail.locator("button")).toHaveCount(4);
  await expect(page.locator(".future-milestone")).toHaveCount(1);
  await railKeyboardGuard(page);
  await expect(rail.locator("button").nth(1)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(".future-milestone")).toHaveCount(2);
  await page.keyboard.press("End");
  await expect(rail.locator("button").last()).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(".future-milestone")).toContainText("2040");
  await page.keyboard.press("Home");
  await page.locator(".future-related").click();
  await expect(page.locator("#future-item-jalon-moderate-2030")).toBeFocused();
  await expect(rail.locator("button").nth(1)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(".future-scenario")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Vue détaillée", exact: true })
    .click();
  for (const lane of ["Accélération", "Progression modérée", "Ralentissement"])
    await expect(
      page
        .getByRole("region", { name: lane, exact: true })
        .locator("details")
        .first(),
    ).toHaveAttribute("open", "");
  for (const scenario of example.scenarios) {
    const card = page.locator("#future-item-" + scenario.id);
    await expect(card).toContainText(scenario.summary);
    await expect(card).toContainText(scenario.objections[0]);
  }
  await expect(page.locator(".future-signal-radar")).toContainText(
    "À surveiller",
  );
  await expect(page.locator(".future-signal-questions")).toContainText(
    "Non renseigné",
  );
});
test("Atlas P1 : préparation enregistrée, erreur de quota et brouillon conservé", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (
      ...args: Parameters<IDBObjectStore["put"]>
    ) {
      if (this.name === "personal" && Reflect.get(window, "__failAtlasSave"))
        throw new DOMException("Quota de test", "QuotaExceededError");
      return original.apply(this, args);
    };
  });
  await init(page);
  const action = page.locator(".future-action").first();
  await action.getByLabel(/Suivi de/).selectOption("done");
  await action
    .getByLabel(/Résultat de/)
    .fill("Résultat synthétique conservé après échec");
  await page.evaluate(() => Reflect.set(window, "__failAtlasSave", true));
  await action
    .getByRole("button", { name: "Enregistrer l’action", exact: true })
    .click();
  await expect(action.getByRole("alert")).toContainText(
    "Vos saisies sont conservées",
  );
  await expect(action.getByLabel(/Résultat de/)).toHaveValue(
    "Résultat synthétique conservé après échec",
  );
  await expect(page.locator(".future-progress")).toContainText("0 / 3");
  await page.evaluate(() => Reflect.set(window, "__failAtlasSave", false));
  await action
    .getByRole("button", { name: "Enregistrer l’action", exact: true })
    .click();
  await expect(action.getByRole("status")).toContainText("Action enregistrée");
  await expect(page.locator(".future-progress")).toContainText("1 / 3");
  await page.reload();
  await nav(page);
  await open(page);
  await expect(
    page
      .locator(".future-action")
      .first()
      .getByLabel(/Suivi de/),
  ).toHaveValue("done");
  await expect(
    page
      .locator(".future-action")
      .first()
      .getByLabel(/Résultat de/),
  ).toHaveValue("Résultat synthétique conservé après échec");
});
test("Atlas : zéro, un, beaucoup de jalons, autres scénarios et absence de source", async ({
  page,
}) => {
  const p = structuredClone(example);
  p.documentId = "atlas-limites";
  p.scenarios = [p.scenarios[0]];
  p.scenarios[0].path = "other";
  p.scenarios[0].signalIds = [];
  p.scenarios[0].milestones = Array.from({ length: 30 }, (_, i) => ({
    ...example.scenarios[0].milestones[0],
    id: "jalon-many-" + i,
    year: 2028,
  }));
  p.signals = [];
  p.actions = [];
  p.visualization.links = [];
  await init(page, p);
  await expect(page.locator(".future-milestone")).toHaveCount(12);
  await page
    .getByRole("button", { name: /Afficher 12 jalons de plus/ })
    .click();
  await expect(page.locator(".future-milestone")).toHaveCount(24);
  await page
    .getByRole("button", { name: /Afficher 12 jalons de plus/ })
    .click();
  await expect(page.locator(".future-milestone")).toHaveCount(30);
  await expect(page.locator(".future-other")).toContainText(
    p.scenarios[0].title,
  );
  await page.locator(".future-milestone").first().locator("summary").click();
  await expect(page.locator(".future-milestone").first()).toContainText(
    "Aucune source renseignée",
  );
  await expect(page.locator(".future-progress")).toContainText("0 / 0");
  const q = {
    ...p,
    documentId: "atlas-vide",
    title: "Dossier vide synthétique",
    scenarios: [],
  };
  await upload(page, q);
  await page.getByRole("button", { name: "← Tous les dossiers" }).click();
  await page
    .locator(".future-title")
    .getByText(q.title, { exact: true })
    .click();
  await expect(page.locator(".future-timeline")).toContainText(
    "Aucun jalon renseigné",
  );
  await expect(page.locator("#future-module-scenarios")).toContainText(
    "Aucun scénario fourni",
  );
});
test("Atlas : WCAG sur parcours, reflow, mouvement réduit et tests des tests", async ({
  page,
}, info) => {
  await init(page);
  await railKeyboardGuard(page);
  await page
    .locator(".future-horizon-rail button")
    .nth(1)
    .evaluate((e) => ((e as HTMLButtonElement).disabled = true));
  await expect(railKeyboardGuard(page)).rejects.toThrow("Horizon inaccessible");
  await page
    .locator(".future-horizon-rail button")
    .nth(1)
    .evaluate((e) => ((e as HTMLButtonElement).disabled = false));
  await railKeyboardGuard(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page
    .getByRole("button", { name: "Horizon suivant →", exact: true })
    .click();
  await reducedGuard(page);
  const injected = await page.addStyleTag({
    content:
      "@keyframes atlas-mutant{to{opacity:.5}}.future-workspace[data-motion] .future-timeline{animation:atlas-mutant 2s infinite!important}",
  });
  await expect(reducedGuard(page)).rejects.toThrow("Mouvement actif");
  await injected.evaluate((e) => (e as Element).remove());
  await reducedGuard(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByLabel("Animations", { exact: true }).selectOption("off");
  await page
    .getByRole("button", { name: "Horizon précédent", exact: false })
    .click();
  await reducedGuard(page);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const small = await page
      .locator(
        ".future-workspace button:visible,.future-workspace summary:visible,.future-workspace select:visible",
      )
      .evaluateAll((els) =>
        els
          .filter((e) => {
            const r = e.getBoundingClientRect();
            return r.width < 24 || r.height < 24;
          })
          .map((e) => e.textContent),
      );
    expect(small).toEqual([]);
  }
  for (const theme of ["light", "dark"]) {
    if (theme === "dark") {
      await nav(page, "Réglages");
      await page
        .getByRole("button", { name: "Lecture sombre", exact: true })
        .click();
      await nav(page);
      await open(page);
    }
    const result = await new AxeBuilder({ page })
      .include(".future-workspace")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(result.violations).toEqual([]);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator(".future-workspace").evaluate((e) => {
    e.style.zoom = "2";
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator(".future-workspace").evaluate((e) => {
    e.style.zoom = "";
  });
  const accessibility = await page.locator(".future-workspace").ariaSnapshot();
  expect(accessibility).toContain('navigation "Modules du dossier"');
  mkdirSync("docs/evidence/future-atlas", { recursive: true });
  writeFileSync(
    "docs/evidence/future-atlas/accessibility-" + info.project.name + ".txt",
    accessibility,
  );
  writeFileSync(
    "docs/evidence/future-atlas/mutations-" + info.project.name + ".json",
    JSON.stringify(
      {
        keyboard: "injected failure detected, restored pass",
        motion: "injected failure detected, restored pass",
        scope: "isolated browser only",
      },
      null,
      2,
    ) + "\n",
  );
  await page.reload();
  await nav(page);
  await expect(page.getByLabel("Animations", { exact: true })).toHaveValue(
    "off",
  );
});
test("Atlas : base Le Futur indisponible, erreur visible et autres onglets accessibles", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = indexedDB.open.bind(indexedDB);
    indexedDB.open = function (...args: Parameters<IDBFactory["open"]>) {
      if (args[0] === "journal360-future-private")
        throw new DOMException(
          "IndexedDB indisponible (test)",
          "InvalidStateError",
        );
      return original(...args);
    };
  });
  await page.goto("/");
  await nav(page);
  await expect(page.getByRole("alert").first()).toContainText(
    /indisponible|InvalidState/,
  );
  await nav(page, "Bibliothèque");
  await expect(page.locator(".future-workspace")).toHaveCount(0);
});

test("Atlas : parcours clavier des contrôles principaux, import annulable et focus rendu", async ({
  page,
}) => {
  await page.goto("/");
  await nav(page);
  const importButton = page.getByRole("button", {
    name: "Importer un dossier",
    exact: true,
  });
  await importButton.focus();
  const chooser = page.waitForEvent("filechooser");
  await page.keyboard.press("Enter");
  await (
    await chooser
  ).setFiles("public/examples/future/EXEMPLE_FUTUR_IA_v1.json");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(importButton).toBeFocused();
  await upload(page);
  await expect(page.locator(".future-title").first()).toBeVisible();
  const filters = page.locator(".future-filter-panel summary");
  await filters.focus();
  if (
    !(await page
      .locator(".future-filter-panel")
      .evaluate((e) => (e as HTMLDetailsElement).open))
  )
    await page.keyboard.press("Enter");
  await expect(page.getByLabel("Rechercher un dossier")).toBeVisible();
  await page.getByLabel("Rechercher un dossier").focus();
  await page.keyboard.type("inconnu");
  await page.keyboard.press("Tab");
  await expect(filters).toBeFocused();
  await expect(page.locator(".future-card")).toHaveCount(0);
  await page
    .locator(".future-filter-panel")
    .getByRole("button", { name: "Effacer les filtres", exact: true })
    .focus();
  await page.keyboard.press("Space");
  await page.locator(".future-title").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".future-dossier-header h2")).toBeFocused();
  await page
    .getByRole("button", { name: "Vue détaillée", exact: true })
    .focus();
  await page.keyboard.press("Space");
  await expect(
    page.locator(".future-scenario details").first(),
  ).toHaveAttribute("open", "");
  await page.getByLabel("Nouvelle note", { exact: true }).focus();
  await page.keyboard.type("Note synthétique saisie au clavier");
  const save = page.getByRole("button", {
    name: "Ajouter ma note",
    exact: true,
  });
  await save.focus();
  expect(
    await save.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const at = document.elementFromPoint(
        r.x + r.width / 2,
        r.y + r.height / 2,
      );
      return at === el || el.contains(at);
    }),
  ).toBe(true);
  await page.keyboard.press("Enter");
  await expect(page.locator(".future-personal")).toContainText(
    "Note synthétique saisie au clavier",
  );
  await page.getByRole("button", { name: "← Tous les dossiers" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".future-title")).toBeFocused();
});
test("Atlas : nouvelle révision annoncée avec accès direct aux différences", async ({
  page,
}) => {
  await init(page);
  await nav(page, "Bibliothèque");
  await nav(page);
  await expect(page.locator(".future-changed")).toContainText(
    "Aucun nouveau dossier",
  );
  await page.getByLabel("Fichiers HTML à importer").setInputFiles({
    name: "revision.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        ...example,
        revision: 2,
        updatedAt: "2026-10-16T15:00:00Z",
        title: "Trajectoires révisées",
      }),
    ),
  });
  await page
    .getByLabel("J’ai lu les différences et confirme cette mise à jour.")
    .check();
  await page.getByRole("button", { name: /Importer \d+ fichier/ }).click();
  await expect(page.locator(".future-changed")).toContainText(
    "1 révision(s) nouvelle(s)",
  );
  await page.locator(".future-changed summary").click();
  await page.locator(".future-changed .text-button").click();
  await expect(page.locator("#future-module-changes")).toBeFocused();
  await expect(page.locator("#future-module-changes")).toContainText(
    "Titre modifié",
  );
});
