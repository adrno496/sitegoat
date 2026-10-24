import { test, expect } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
test("référence réelle : cinq boutons natifs et cinq replis UTF-8/SHA exacts, hors ligne", async ({
  page,
  context,
}, info) => {
  const file = process.env.SITEGOAT_AUDIT_HTML;
  if (!file) throw Error("SITEGOAT_AUDIT_HTML requis");
  const bytes = await readFile(file);
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(
    "8ae5eb2bea9dde338b09ba73d3b0082d278fb0ebf9d1472a9db479e6e111e45c",
  );
  const p = JSON.parse(
    bytes
      .toString("utf8")
      .match(/<script[^>]*id="unifiedData"[^>]*>([\s\S]*?)<\/script>/)![1],
  );
  await page.route("**/*", (r) =>
    new URL(r.request().url()).hostname === "127.0.0.1"
      ? r.continue()
      : r.abort(),
  );
  await page.goto("/");
  await page
    .getByLabel("Fichiers HTML à importer")
    .setInputFiles({ name: "real.html", mimeType: "text/html", buffer: bytes });
  await page
    .getByRole("button", {
      name: "Enregistrer dans ma bibliothèque",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  async function nav(label: string) {
    const n = page.locator(
      (await page.locator(".sidebar").isVisible()) ? ".sidebar" : ".mobile-nav",
    );
    if (
      !(await n.getByRole("button", { name: label, exact: true }).isVisible())
    )
      await n
        .getByRole("button", { name: "Autres espaces", exact: true })
        .click();
    await n.getByRole("button", { name: label, exact: true }).click();
  }
  await nav("Aujourd’hui");
  await page
    .locator(".unified-workspace")
    .getByRole("button", { name: "Lire la dernière édition", exact: true })
    .click();
  await expect(page.locator(".edition-frame")).toHaveAttribute(
    "sandbox",
    "allow-scripts",
  );
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  const f = page.frameLocator(".edition-frame");
  await expect(f.locator("#brief-list>article")).toHaveCount(34);
  const results = [];
  let downloads = 0;
  page.on("download", () => downloads++);
  for (const prompt of p.promptAssets) {
    await f.locator(`button[data-prompt="${prompt.promptId}"]`).click();
    const dialog = page.getByRole("dialog", {
      name: "Action du document original",
      exact: true,
    });
    await expect(dialog).toBeVisible();
    const d = page.waitForEvent("download");
    await dialog
      .getByRole("button", { name: "Télécharger .md", exact: true })
      .click();
    const content = await readFile((await (await d).path())!);
    expect(content.toString("utf8")).toBe(prompt.content);
    expect(createHash("sha256").update(content).digest("hex")).toBe(
      prompt.sha256,
    );
    results.push({
      promptId: prompt.promptId,
      bytes: content.length,
      shaValid: true,
    });
  }
  expect(downloads).toBe(5);
  await page
    .getByRole("button", { name: "Réduire la lecture", exact: true })
    .click();
  await nav("Aujourd’hui");
  const root = page.locator(".unified-workspace");
  await root.locator(".v9-reading-tools summary").click();
  await root
    .getByRole("button", { name: "Mes prompts .md", exact: true })
    .click();
  await root.locator(".unified-result").first().click();
  await expect(root.locator(".prompt-card")).toHaveCount(5);
  for (const [n, prompt] of p.promptAssets.entries()) {
    const d = page.waitForEvent("download");
    await root
      .locator(".prompt-card")
      .nth(n)
      .getByRole("button", {
        name: "Télécharger le prompt VS Code (.md)",
        exact: true,
      })
      .click();
    const content = await readFile((await (await d).path())!);
    expect(content.toString("utf8")).toBe(prompt.content);
    expect(createHash("sha256").update(content).digest("hex")).toBe(
      prompt.sha256,
    );
  }
  expect(downloads).toBe(10);
  await page.reload();
  await nav("Aujourd’hui");
  await expect(page.locator(".unified-workspace .event-card")).toHaveCount(19);
  await writeFile(
    `audits/sitegoat/implementation-2026-10-24/preuves/real-browser-${info.project.name}.json`,
    JSON.stringify(
      {
        browser: info.project.name,
        offline: true,
        native: results,
        fallbackExact: 5,
        reloadArticles: 19,
      },
      null,
      2,
    ),
  );
});
