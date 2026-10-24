import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { interactiveV9Fixture } from "../helpers/v9";

for (const detached of [false, true]) test(`SG-13 : lien ${detached ? "détaché" : "attaché"}, refus, confirmation, contenu exact et hors ligne`, async ({ page, context }) => {
  await page.route("**/*", r => new URL(r.request().url()).hostname === "127.0.0.1" ? r.continue() : r.abort());
  const { p, bytes } = interactiveV9Fixture(detached);
  await page.goto("/");
  await page.getByLabel("Fichiers HTML à importer").setInputFiles({ name: "synthetic.html", mimeType: "text/html", buffer: bytes });
  await page.getByRole("button", { name: "Enregistrer dans ma bibliothèque", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const nav = page.locator(await page.locator(".sidebar").isVisible() ? ".sidebar" : ".mobile-nav");
  await nav.getByRole("button", { name: "Aujourd’hui", exact: true }).click();
  await page.locator(".unified-workspace").getByRole("button", { name: "Lire la dernière édition", exact: true }).click();
  await expect(page.locator(".edition-frame")).toHaveAttribute("sandbox", "allow-scripts");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  let downloads = 0; page.on("download", () => downloads++);
  const f = page.frameLocator(".edition-frame");
  await f.locator('[data-panel="prompts"]').click();
  const buttons = f.locator("#promptsList button");
  const dialog = page.getByRole("dialog", { name: "Action du document original", exact: true });
  await buttons.first().click();
  await expect(dialog).toBeVisible();
  expect(downloads).toBe(0);
  await dialog.getByRole("button", { name: "Annuler", exact: true }).click();
  expect(downloads).toBe(0);
  for (const [n, prompt] of p.promptAssets.entries()) {
    await buttons.nth(n).click();
    await expect(dialog).toBeVisible();
    const d = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Télécharger .md", exact: true }).dblclick();
    const dl = await d;
    const content = await readFile((await dl.path())!);
    expect(content.toString("utf8")).toBe(prompt.content);
    expect(createHash("sha256").update(content).digest("hex")).toBe(createHash("sha256").update(prompt.content).digest("hex"));
    expect(dl.suggestedFilename()).toBe(prompt.filename);
    await expect(dialog).toHaveCount(0);
  }
  expect(downloads).toBe(p.promptAssets.length);
  // Unknown Blob and forged messages can never initiate a parent download.
  await f.locator("body").evaluate(() => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["INCONNU"])); a.download = "evil.md"; a.click(); parent.postMessage({ type: "journal360:reader-action:v1", hash: "fake", revision: 0, kind: "prompt", value: "fake" }, "*"); });
  await expect(dialog).toHaveCount(0);
  expect(downloads).toBe(p.promptAssets.length);
});
