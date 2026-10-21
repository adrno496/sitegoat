import { chromium } from "@playwright/test";
import { auditBytes } from "../tests/helpers/audit.ts";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
await context.route("**/*", (r) =>
  new URL(r.request().url()).hostname === "127.0.0.1"
    ? r.continue()
    : r.abort(),
);
const page = await context.newPage(),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(process.env.SITEGOAT_AUDIT_URL || "http://127.0.0.1:4181");
  await page.getByLabel("Fichiers HTML à importer").setInputFiles({
    name: "audit-10.html",
    mimeType: "text/html",
    buffer: auditBytes("10"),
  });
  await page
    .getByRole("button", {
      name: "Enregistrer dans ma bibliothèque",
      exact: true,
    })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Aujourd’hui", exact: true })
    .click();
  await page.locator(".unified-workspace .event-card").first().waitFor();
  const notice = page.getByRole("button", {
    name: "Fermer la notification",
    exact: true,
  });
  if (await notice.isVisible()) await notice.click();
  const root = page.locator(".unified-workspace"),
    result = {
      origin:
        "isolated local browser; supplied HTML only when explicitly selected via env",
      cards: await root.locator(".event-card").count(),
      current: await root.locator(".unified-lead h2").innerText(),
      errors,
    };
  await page.screenshot({
    path: "docs/evidence/v8-audit/after-today.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Activer le mode sombre", exact: true })
    .click();
  await page.screenshot({
    path: "docs/evidence/v8-audit/after-dark.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "docs/evidence/v8-audit/after-mobile.png",
    fullPage: true,
  });
  await page.screenshot({
    path: "docs/evidence/v8-audit/after-mobile-viewport.png",
  });
  await writeFile(
    "docs/evidence/v8-audit/candidate-capture.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
