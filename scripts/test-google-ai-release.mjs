// Explicit release smoke test. Synthetic HTML only; Google requests are fulfilled
// locally. No account, Supabase write, clipboard or private journal is used.
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
const policy = JSON.parse(
  fs.readFileSync("vercel.json", "utf8"),
).headers[0].headers.find((h) => h.key === "Content-Security-Policy").value;
const response = await fetch(baseURL);
assert.equal(response.headers.get("content-security-policy"), policy);
const html = await response.text();
const asset = html.match(/<script[^>]+src="([^"]+)"/)[1];
const remote = Buffer.from(
  await (await fetch(new URL(asset, baseURL))).arrayBuffer(),
);
const local = fs.readFileSync("dist/" + asset.replace(/^\//, ""));
assert(remote.equals(local), "Published bundle differs from the checked build");
const fixture = ts.transpileModule(
  fs.readFileSync("tests/helpers/v61.ts", "utf8"),
  { compilerOptions: { module: ts.ModuleKind.ESNext } },
).outputText;
const { v61HTML, v61Sections } = await import(
  "data:text/javascript;base64," + Buffer.from(fixture).toString("base64")
);
const results = [];
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
      try {
        const calls = [];
        const blocked = [];
        await context.route("**/*", async (route) => {
          const url = new URL(route.request().url());
          if (url.origin === "https://www.google.com") {
            calls.push(url.href);
            return route.fulfill({
              contentType: "text/html",
              body: "<title>Google simulated</title>",
            });
          }
          if (url.origin === new URL(baseURL).origin) return route.continue();
          blocked.push(url.origin);
          return route.abort();
        });
        const page = await context.newPage();
        await page.goto(baseURL);
        await expect(
          page.getByText(`JOURNAL 360 MOBILE · v${version}`, { exact: true }),
        ).toHaveCount(1);
        await page.getByLabel("Fichiers HTML à importer").setInputFiles({
          name: "synthetic-release.html",
          mimeType: "text/html",
          buffer: Buffer.from(v61HTML()),
        });
        await page
          .getByRole("button", {
            name: "Enregistrer dans ma bibliothèque",
            exact: true,
          })
          .click();
        await page
          .getByRole("button", {
            name: "Lire Compatibilité V6.1 synthétique",
            exact: true,
          })
          .click();
        await expect(page.locator(".edition-frame")).toHaveAttribute(
          "sandbox",
          "allow-scripts",
        );
        const frame = page.frameLocator(".edition-frame");
        for (const id of v61Sections) {
          await frame.locator(`nav a[href="#${id}"]`).click();
          await expect(frame.locator("#editionData")).toHaveCount(1);
        }
        const buttons = frame.locator("[data-article],[data-topic]");
        await expect(buttons).toHaveCount(11);
        for (let i = 0; i < 11; i++) {
          await buttons.nth(i).click();
          const modal = page.getByRole("dialog", {
            name: "Ouvrir Google Mode IA dans votre navigateur ?",
          });
          const question =
            i === 0
              ? "Pourquoi le ciel est-il bleu ? + & % # @ 🙂"
              : await buttons.nth(i).getAttribute("data-ai-question");
          await modal.getByRole("textbox").fill(question);
          assert.equal(calls.length, i);
          const next = context.waitForEvent("page");
          await modal
            .getByRole("button", { name: "Lancer la question", exact: true })
            .click();
          const popup = await next;
          await popup.waitForLoadState("domcontentloaded");
          const url = new URL(popup.url());
          assert.equal(
            url.origin + url.pathname,
            "https://www.google.com/search",
          );
          assert.deepEqual(
            [...url.searchParams],
            [
              ["hl", "fr"],
              ["udm", "50"],
              ["q", question],
            ],
          );
          assert(
            await popup.evaluate(
              () => opener === null && document.referrer === "",
            ),
          );
          await popup.close();
          await expect(modal).toHaveCount(0);
        }
        assert.equal(calls.length, 11);
        assert.deepEqual(blocked, []);
        results.push({
          engine,
          viewport: mobile ? "mobile simulated" : "desktop",
          status: "PASS",
          confirmedPrefilledLaunches: 11,
          navigationAnchors: 13,
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
  googleSimulated: true,
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
  `PASS release ${version}, bundle/CSP and 44 confirmed prefilled questions; actual Google answers not tested by this smoke test.`,
);
