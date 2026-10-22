import { createHash } from "node:crypto";
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { interactiveV9Fixture } from "../helpers/v9";
import { navigate as nav } from "../helpers/navigation";
import type { UnifiedEdition } from "../../src/data/unified";
import type { QuickBriefs } from "../../src/data/quickBriefs";
function input() {
  if (process.env.SITEGOAT_V9_REAL_HTML) {
    const bytes = readFileSync(process.env.SITEGOAT_V9_REAL_HTML);
    const block = (id: string) =>
      JSON.parse(
        bytes
          .toString()
          .match(
            new RegExp(`<script[^>]*id="${id}"[^>]*>([\\s\\S]*?)<\\/script>`),
          )![1],
      );
    return {
      bytes,
      p: block("unifiedData") as UnifiedEdition,
      q: block("quickBriefsData") as QuickBriefs,
    };
  }
  return interactiveV9Fixture();
}
async function add(page: import("@playwright/test").Page) {
  const f = input();
  await page.goto("/");
  await page.getByLabel("Fichiers HTML à importer").setInputFiles({
    name: "V9-16h.html",
    mimeType: "text/html",
    buffer: f.bytes,
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
  return f;
}
test("V9 : Aujourd’hui épuré, Accueil, articles internes, 19 titres réels ou fixture, Google public et préférences", async ({
  page,
}, info) => {
  const { p, q } = await add(page);
  await nav(page, "Aujourd’hui");
  const w = page.locator(".unified-workspace");
  await expect(w.locator(".event-list .event-card")).toHaveCount(
    p.items.length,
  );
  for (const text of [
    "DERNIÈRE ÉDITION EFFECTIVEMENT REÇUE",
    "Intégrité",
    "Diagnostics documentaires",
  ])
    await expect(w).not.toContainText(text);
  await expect(
    w.getByRole("button", { name: "Lire la dernière édition", exact: true }),
  ).toHaveCount(1);
  const first = w.locator(".event-card").first();
  const eventId = await first.getAttribute("data-event-id");
  const expectedItem = p.items.find((i) => i.eventId === eventId)!;
  await first.getByRole("button", { name: "Développer", exact: true }).click();
  await expect(first.locator(".event-summary")).toBeVisible();
  await expect(
    first.getByRole("link", { name: "Recherche Google", exact: true }),
  ).toHaveAttribute("rel", "noopener noreferrer");
  await first
    .getByRole("button", { name: "Lire l’article complet", exact: true })
    .click();
  await expect(page.locator(".article-body")).toContainText(
    expectedItem.detail,
  );
  await nav(page, "Aujourd’hui");
  await w
    .getByRole("button", { name: "Actualité rapide", exact: true })
    .click();
  await expect(w.locator(".brief-card")).toHaveCount(q.items.length);
  await w.getByLabel("Rechercher un titre").fill(q.items[0].title);
  await expect(w.locator(".brief-card")).toHaveCount(1);
  expect(
    new URL(
      (await w.locator(".brief-card .google-search").getAttribute("href")) ||
        "",
    ).searchParams.get("q"),
  ).toBe(q.items[0].googleQuery);
  await nav(page, "Accueil");
  await expect(
    page.getByRole("heading", {
      name: "Les points essentiels aujourd’hui",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Historique insuffisant pour tracer une évolution fiable", {
      exact: true,
    }),
  ).toBeVisible();
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`v9-dashboard-${width}.png`),
      fullPage: true,
    });
  }
  await nav(page, "Paramètres");
  const advanced = page.locator(".import-diagnostics");
  await expect(advanced).not.toHaveAttribute("open", "");
  await advanced.locator("summary").first().click();
  await expect(advanced.locator(".unified-slots button:enabled")).toHaveCount(
    1,
  );
  await expect(
    advanced.locator(".unified-slots button").first(),
  ).toBeDisabled();
  await expect(advanced.locator("[data-autonomy]")).toHaveAttribute(
    "data-autonomy",
    "AUTONOMOUS",
  );
  await advanced.locator("summary").first().click();
  await page.getByLabel("Accueil : points essentiels").uncheck();
  await page.getByLabel("Densité", { exact: true }).selectOption("compact");
  await page.reload();
  await nav(page, "Accueil");
  await expect(
    page.getByRole("heading", {
      name: "Les points essentiels aujourd’hui",
      exact: true,
    }),
  ).toHaveCount(0);
  await nav(page, "Paramètres");
  await page
    .getByRole("button", { name: "Réinitialiser l’affichage V9", exact: true })
    .click();
  await nav(page, "Accueil");
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    axe.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
});
test("V9 : HTML original offline, filtres, accordéons, Google et source contrôlés, Markdown exact, isolation", async ({
  page,
  context,
}) => {
  const { p, bytes } = await add(page);
  await nav(page, "Aujourd’hui");
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
  await expect(page.locator(".edition-frame")).toHaveAttribute("sandbox", "");
  await page
    .getByRole("button", { name: "Afficher le HTML d’origine", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Je fais confiance à ce fichier",
      exact: true,
    })
    .click();
  await expect(page.locator(".edition-frame")).toHaveAttribute(
    "sandbox",
    "allow-scripts",
  );
  const f = page.frameLocator(".edition-frame");
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(f.locator(".topnav")).toBeVisible();
    expect(
      (await page.locator(".edition-frame").boundingBox())!.width,
    ).toBeCloseTo(width, 0);
  }
  await f.locator('[data-panel="articles"]').click();
  await expect(f.locator("#articlesList>article")).toHaveCount(p.items.length);
  await f.locator("#searchInput").fill(p.items[0].title);
  await expect(f.locator("#articlesList>article")).toHaveCount(1);
  await f.locator("#searchInput").fill("");
  await f.locator("#categoryFilter").selectOption(p.items[0].category);
  await expect(f.locator("#articlesList>article")).toHaveCount(
    p.items.filter((i) => i.category === p.items[0].category).length,
  );
  const card = f.locator("#articlesList>article").first();
  await card.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(card.locator("details")).toHaveAttribute("open", "");
  await card.getByRole("button", { name: "Google", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Action du document original",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("link", {
      name: "Ouvrir dans un nouvel onglet",
      exact: true,
    }),
  ).toHaveAttribute("rel", "noopener noreferrer");
  await dialog.getByRole("button", { name: "Annuler", exact: true }).click();
  await card
    .getByRole("button", { name: "Lire le dossier complet", exact: true })
    .click();
  await expect(f.locator("#dialogBody")).toContainText(p.items[0].detail);
  await f.locator("#dialogSources a").first().focus();
  await page.keyboard.press("Enter");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Annuler", exact: true }).click();
  await f.locator("#closeDialog").click();
  await f.locator('[data-panel="prompts"]').click();
  for (const [n, prompt] of p.promptAssets.entries()) {
    await f
      .locator("#promptsList")
      .getByRole("button", { name: "Télécharger .md", exact: true })
      .nth(n)
      .click();
    await expect(dialog).toBeVisible();
    const dl = page.waitForEvent("download");
    await dialog
      .getByRole("button", { name: "Télécharger .md", exact: true })
      .click();
    expect(await readFile((await (await dl).path())!, "utf8")).toBe(
      prompt.content,
    );
  }
  const frame = page.frames().find((f) => f.url() === "about:srcdoc")!;
  const digest = createHash("sha256").update(bytes).digest("hex");
  for (const request of [
    { revision: 0, value: "https://evil.example/" },
    { revision: -1, value: p.items[0].sourceRecords[0].url },
  ]) {
    await frame.evaluate(
      ({ hash, request }) =>
        parent.postMessage(
          {
            type: "journal360:reader-action:v1",
            hash,
            ...request,
            kind: "link",
          },
          "*",
        ),
      { hash: digest, request },
    );
    await expect(dialog).toHaveCount(0);
  }
  expect(
    await frame.evaluate(() => {
      const result = [];
      for (const fn of [
        () => parent.document.body,
        () => localStorage.length,
        () => parent.localStorage.length,
      ]) {
        try {
          fn();
          result.push("accessible");
        } catch {
          result.push("bloqué");
        }
      }
      return result;
    }),
  ).toEqual(["bloqué", "bloqué", "bloqué"]);
  await frame.evaluate(() =>
    parent.postMessage(
      {
        type: "journal360:reader-action:v1",
        hash: "fake",
        revision: 0,
        kind: "link",
        value: "https://evil.example/",
      },
      "*",
    ),
  );
  await expect(dialog).toHaveCount(0);
  await page.evaluate(() =>
    window.postMessage(
      {
        type: "journal360:reader-action:v1",
        hash: "fake",
        revision: 0,
        kind: "link",
        value: "https://example.org/",
      },
      "*",
    ),
  );
  await expect(dialog).toHaveCount(0);
  await page
    .getByRole("button", { name: "Réduire la lecture", exact: true })
    .click();
  const original = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Original intact", exact: true })
    .click();
  expect(await readFile((await (await original).path())!)).toEqual(bytes);
});
test("V9 : panne du stockage des préférences, réglages conservés pour la session", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "journal360.display.v9")
        throw new DOMException("Quota", "QuotaExceededError");
      return original.call(this, key, value);
    };
  });
  await page.goto("/");
  await nav(page, "Paramètres");
  await page.getByLabel("Animations", { exact: true }).uncheck();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Réglages appliqués pour cette session" }),
  ).toBeVisible();
  await expect(page.locator(".v9-presentation")).toHaveAttribute(
    "data-motion",
    "false",
  );
});

test("V9 : filtres Articles combinables, calendrier de faits et pagination de 60 brèves synthétiques", async ({
  page,
}) => {
  const f = interactiveV9Fixture();
  const original = JSON.stringify(f.q).replaceAll("<", "\\u003c");
  f.q.items = Array.from({ length: 60 }, (_, n) => ({
    ...f.q.items[0],
    eventId: `synthetic.brief.${n}`,
    title: `Titre SYNTHÉTIQUE ${n}`,
    theme: n % 2 ? "Économie" : "Sciences",
  }));
  const bytes = Buffer.from(
    f.bytes
      .toString()
      .replace(original, JSON.stringify(f.q).replaceAll("<", "\\u003c")),
  );
  await page.goto("/");
  await page.getByLabel("Fichiers HTML à importer").setInputFiles({
    name: "60-titres-synthetiques.html",
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
  await nav(page, "Aujourd’hui");
  await page
    .locator(".unified-workspace")
    .getByRole("button", { name: "Actualité rapide", exact: true })
    .click();
  await expect(page.locator(".brief-card")).toHaveCount(30);
  await page
    .getByRole("button", { name: "Afficher 30 titres de plus", exact: true })
    .click();
  await expect(page.locator(".brief-card")).toHaveCount(60);
  await page
    .getByLabel("Thème des brèves", { exact: true })
    .selectOption("Sciences");
  await expect(page.locator(".brief-card")).toHaveCount(30);
  await nav(page, "Articles");
  await page.locator(".articles-filter-options summary").click();
  const sample = f.p.items[0];
  await page
    .getByLabel("Univers", { exact: true })
    .selectOption(sample.sourceWatch);
  await page
    .getByLabel("Preuve", { exact: true })
    .selectOption(sample.evidenceStatus);
  await page
    .getByLabel("Importance", { exact: true })
    .selectOption(sample.importance);
  const expected = f.p.items.filter(
    (i) =>
      i.sourceWatch === sample.sourceWatch &&
      i.evidenceStatus === sample.evidenceStatus &&
      i.importance === sample.importance,
  );
  await expect(page.locator(".articles-grid .event-card")).toHaveCount(
    expected.length,
  );
  await page
    .getByLabel("Présentation", { exact: true })
    .selectOption("calendar");
  await expect(
    page.getByRole("navigation", {
      name: "Calendrier des dates de faits disponibles",
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Effacer les filtres", exact: true })
    .click();
  await expect(page.locator(".articles-grid .event-card")).toHaveCount(
    f.p.items.length,
  );
  await page.getByLabel("Faits depuis le", { exact: true }).fill("2099-01-01");
  await expect(page.locator(".articles-grid .event-card")).toHaveCount(0);
});
