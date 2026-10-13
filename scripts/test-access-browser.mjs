import fs from "node:fs";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
process.loadEnvFile(".env.local");
const baseURL = process.env.JOURNAL360_BASE_URL || "http://127.0.0.1:4173";
let code = "";
for await (const chunk of process.stdin) code += chunk;
code = code.trimEnd();
if (!code) throw new Error("Fournissez le code sur stdin.");
const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const uploaded = [];
const results = [];
const browser = await chromium.launch();
function check(name, valid) {
  results.push({ name, status: valid ? "PASS" : "FAIL" });
  if (!valid) throw new Error(name);
}
async function settings(page) {
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Réglages", exact: true })
    .click();
}
async function login(page) {
  await page.getByLabel("Code d’accès", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Ouvrir mes sauvegardes" }).click();
  await page
    .getByRole("button", { name: "Sauvegarder dans Supabase" })
    .waitFor();
}
try {
  const first = await browser.newContext({ baseURL });
  const page = await first.newPage();
  page.on("response", async (response) => {
    if (
      response.url().endsWith("/api/backup") &&
      response.request().method() === "POST" &&
      response.ok()
    ) {
      const data = await response.json();
      if (data.path && data.token) uploaded.push(data.path);
    }
  });
  await page.goto("/");
  await settings(page);
  await page
    .getByLabel("Code d’accès", { exact: true })
    .fill("incorrect-" + crypto.randomUUID());
  await page.getByRole("button", { name: "Ouvrir mes sauvegardes" }).click();
  await page.getByText("Code d’accès incorrect.", { exact: true }).waitFor();
  check("Code incorrect refusé dans l’interface", true);
  await login(page);
  check("Code ouvre une session sans email", true);
  await page.reload();
  await settings(page);
  await page
    .getByRole("button", { name: "Sauvegarder dans Supabase" })
    .waitFor();
  check("Session conservée après rechargement", true);
  await page
    .getByLabel("Fichiers HTML à importer")
    .setInputFiles("tests/fixtures/generic.html");
  await page
    .getByRole("button", { name: "Enregistrer dans ma bibliothèque" })
    .click();
  await settings(page);
  await page.getByRole("button", { name: "Sauvegarder dans Supabase" }).click();
  await page.getByText("Sauvegarde privée envoyée.", { exact: true }).waitFor();
  check("Archive synthétique transférée dans Supabase", uploaded.length === 1);
  const second = await browser.newContext({ baseURL });
  const phone = await second.newPage();
  await phone.goto("/");
  await settings(phone);
  await login(phone);
  await phone
    .getByRole("button", { name: "Retrouver mes sauvegardes" })
    .click();
  await phone.locator(".snapshot").first().waitFor();
  await phone
    .locator(".snapshot")
    .first()
    .getByRole("button", { name: "Restaurer", exact: true })
    .click();
  await phone
    .getByText("Sauvegarde cloud restaurée par fusion.", { exact: false })
    .waitFor();
  await phone
    .locator(".sidebar")
    .getByRole("button", { name: "Bibliothèque", exact: true })
    .click();
  await phone
    .getByRole("button", { name: "Lire Journal générique", exact: true })
    .click();
  await phone
    .frameLocator("iframe")
    .getByRole("heading", { name: "Journal générique", exact: true })
    .waitFor();
  check(
    "Même code sur appareil vierge : archive retrouvée et HTML lisible",
    true,
  );
  await phone
    .getByRole("button", { name: "Retour à la bibliothèque", exact: true })
    .click();
  await settings(phone);
  await phone
    .getByRole("button", { name: "Se déconnecter", exact: true })
    .click();
  await phone.getByLabel("Code d’accès", { exact: true }).waitFor();
  await phone
    .locator(".sidebar")
    .getByRole("button", { name: "Bibliothèque", exact: true })
    .click();
  await phone
    .getByRole("button", { name: "Lire Journal générique", exact: true })
    .waitFor();
  check("Déconnexion conserve la bibliothèque locale", true);
} finally {
  await browser.close();
  if (uploaded.length) {
    const { error } = await admin.storage
      .from("journal360-backups")
      .remove(uploaded);
    if (error)
      throw new Error("Nettoyage des seules archives de test impossible.");
  }
}
fs.writeFileSync(
  "docs/evidence/access" +
    (baseURL.startsWith("https:") ? "-production" : "") +
    ".json",
  JSON.stringify(
    {
      testedAt: new Date().toISOString(),
      baseURL,
      results,
      syntheticArchivesCleaned: uploaded.length,
      privateContentUploaded: false,
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify(results));
