// Explicit release verification: synthetic journals and fresh local libraries.
// No account, private HTML, Supabase write or external search is used.
import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import ts from "typescript";
import { chromium, webkit, devices } from "playwright";
import { expect } from "@playwright/test";
const baseURL = process.env.JOURNAL360_BASE_URL;
if (
  !baseURL ||
  (!["127.0.0.1", "localhost"].includes(new URL(baseURL).hostname) &&
    baseURL !== "https://sitegoat.vercel.app")
)
  throw new Error("Specify the approved release URL or localhost.");
const version = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
const response = await fetch(baseURL);
const policy = JSON.parse(
  fs.readFileSync("vercel.json", "utf8"),
).headers[0].headers.find((h) => h.key === "Content-Security-Policy").value;
assert.equal(response.headers.get("content-security-policy"), policy);
const html = await response.text(),
  asset = html.match(/<script[^>]+src="([^"]+)"/)[1];
const remote = Buffer.from(
  await (await fetch(new URL(asset, baseURL))).arrayBuffer(),
);
assert(
  remote.equals(fs.readFileSync("dist/" + asset.replace(/^\//, ""))),
  "Published bundle differs from local build",
);
const fixture = ts.transpileModule(
  fs.readFileSync("tests/helpers/daily.ts", "utf8"),
  { compilerOptions: { module: ts.ModuleKind.ESNext } },
).outputText;
const { dailyFile } = await import(
  "data:text/javascript;base64," + Buffer.from(fixture).toString("base64")
);
const results = [];
async function library(page) {
  const back = page.getByRole("button", {
    name: "Retour à la bibliothèque",
    exact: true,
  });
  if (await back.isVisible()) await back.click();
  const surface = (await page.locator(".mobile-nav").isVisible())
    ? ".mobile-nav"
    : ".sidebar";
  await page
    .locator(surface)
    .getByRole("button", { name: "Bibliothèque", exact: true })
    .click();
}
for (const [engine, type] of [
  ["chromium", chromium],
  ["webkit", webkit],
]) {
  const browser = await type.launch();
  try {
    for (const mobile of [false, true]) {
      const context = await browser.newContext(
        mobile
          ? devices[engine === "webkit" ? "iPhone 13" : "Pixel 7"]
          : { viewport: { width: 1440, height: 900 } },
      );
      const blocked = [];
      try {
        await context.route("**/*", async (route) => {
          if (new URL(route.request().url()).origin === new URL(baseURL).origin)
            return route.continue();
          blocked.push(new URL(route.request().url()).origin);
          return route.abort();
        });
        const page = await context.newPage();
        await page.goto(baseURL);
        await expect(
          page.getByText(`JOURNAL 360 MOBILE · v${version}`, { exact: true }),
        ).toHaveCount(1);
        for (const hour of ["08", "12", "16", "21"]) {
          const file = dailyFile(hour);
          await page.getByLabel("Fichiers HTML à importer").setInputFiles({
            name: file.name,
            mimeType: "text/html",
            buffer: Buffer.from(file.html),
          });
          await page
            .getByRole("button", {
              name: "Enregistrer dans ma bibliothèque",
              exact: true,
            })
            .click();
          await expect(page.locator(".edition-card")).toHaveCount(1);
          await expect(page.locator(".day-card h3")).toHaveText(
            `Journal synthétique 2026-10-15 ${hour}h`,
          );
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
          await expect(page.locator(".reading-updates summary")).toHaveText(
            hour === "08"
              ? "Première lecture de cette journée"
              : "1 nouveauté · 0 mise à jour",
          );
          await expect(
            page.locator(".reading-sync .sync-indicator"),
          ).toContainText("Mode local");
          const frame = page.frameLocator(".edition-frame");
          await expect(frame.locator("#release")).toContainText(
            `Édition ${hour}h`,
          );
          await frame.locator("#counter").click();
          await expect(frame.locator("#counter")).toHaveText("1");
          if (hour === "08") {
            await page
              .getByRole("button", { name: "Réduire la lecture", exact: true })
              .click();
            await page
              .getByRole("button", { name: "Ajouter aux favoris", exact: true })
              .click();
            await page
              .getByLabel("Votre note", { exact: true })
              .fill("Annotation de vérification synthétique");
            await page
              .getByRole("button", { name: "Enregistrer la note", exact: true })
              .click();
            await expect(page.locator(".note")).toHaveCount(1);
          }
          await library(page);
        }
        await page
          .getByRole("button", { name: "Historique des éditions", exact: true })
          .click();
        await expect(page.locator(".day-history article")).toHaveCount(4);
        await expect(
          page.getByText("Annotation de vérification synthétique", {
            exact: true,
          }),
        ).toBeVisible();
        await library(page);
        await expect
          .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
          .toBe(true);
        await context.setOffline(true);
        await page.reload();
        await library(page);
        await expect(page.locator(".edition-card")).toHaveCount(1);
        await expect(page.locator(".day-card h3")).toHaveText(
          "Journal synthétique 2026-10-15 21h",
        );
        await expect(page.locator(".topbar .sync-indicator")).toContainText(
          "Hors ligne",
        );
        assert.deepEqual(blocked, []);
        results.push({
          engine,
          viewport: mobile ? "mobile simulated" : "desktop",
          status: "PASS",
          dailyImports: 4,
          visibleEditions: 1,
          currentRelease: "21h",
          historyVersions: 4,
          privateNotesPreserved: true,
          readingUpdates: true,
          visibleSyncStatus: true,
          offline: true,
        });
        console.log("PASS", engine, mobile ? "mobile simulated" : "desktop");
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}
const evidence = {
  testedAt: new Date().toISOString(),
  baseURL,
  version,
  bundleSha256: createHash("sha256").update(remote).digest("hex"),
  bundleMatchesLocal: true,
  parentCspUnchanged: true,
  privateHtmlUsed: false,
  supabaseWrites: 0,
  physicalDevices: "NON TESTÉS",
  results,
};
if (process.env.JOURNAL360_EVIDENCE_FILE)
  fs.writeFileSync(
    process.env.JOURNAL360_EVIDENCE_FILE,
    JSON.stringify(evidence, null, 2) + "\n",
  );
console.log(
  `PASS release ${version}: one current HTML per day on four profiles, history/notes/offline intact.`,
);
