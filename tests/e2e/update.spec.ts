import { test, expect } from "@playwright/test";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
test("mise à jour réelle du service worker sans perte des originaux et favoris", async ({
  browser,
}) => {
  let updated = false;
  const root = path.resolve("dist");
  const headers = JSON.parse(fs.readFileSync("vercel.json", "utf8")).headers[0]
    .headers as { key: string; value: string }[];
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url || "/", "http://127.0.0.1:4174").pathname;
    const file = path.resolve(root, "." + pathname);
    if (file !== root && !file.startsWith(root + path.sep)) {
      res.writeHead(400);
      return res.end();
    }
    for (const header of headers) res.setHeader(header.key, header.value);
    res.setHeader("Cache-Control", "no-cache");
    if (pathname === "/sw.js") {
      res.setHeader("Content-Type", "text/javascript");
      return res.end(
        fs.readFileSync(file, "utf8") +
          (updated ? "\n// mise à jour de test réelle\n" : ""),
      );
    }
    let resolved = file;
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory())
      resolved = path.join(root, "index.html");
    const type = resolved.endsWith(".js")
      ? "text/javascript"
      : resolved.endsWith(".css")
        ? "text/css"
        : resolved.endsWith(".webmanifest")
          ? "application/manifest+json"
          : resolved.endsWith(".png")
            ? "image/png"
            : resolved.endsWith(".svg")
              ? "image/svg+xml"
              : "text/html";
    res.setHeader("Content-Type", type);
    fs.createReadStream(resolved).pipe(res);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Serveur de test indisponible");
  const baseURL = `http://127.0.0.1:${address.port}`;
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(baseURL);
    await page
      .getByLabel("Fichiers HTML à importer")
      .setInputFiles("tests/fixtures/generic.html");
    await page
      .getByRole("button", { name: "Enregistrer dans ma bibliothèque" })
      .click();
    await expect(page.locator(".edition-card")).toHaveCount(1);
    await page
      .getByRole("button", { name: "Ajouter aux favoris Journal générique" })
      .click();
    await expect
      .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
      .toBe(true);
    updated = true;
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      await registration.update();
    });
    await expect(
      page.getByText("Une nouvelle version est disponible.", { exact: false }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Mettre à jour", exact: true })
      .click();
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator(".edition-card")).toHaveCount(1);
    await expect(
      page.getByRole("button", {
        name: "Retirer des favoris Journal générique",
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Lire Journal générique", exact: true })
      .click();
    await expect(
      page
        .frameLocator("iframe")
        .getByRole("heading", { name: "Journal générique" }),
    ).toBeVisible();
  } finally {
    await context.close().catch(() => {});
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
