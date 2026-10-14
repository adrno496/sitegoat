import fs from "node:fs";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { chromium, webkit, devices } from "playwright";
process.loadEnvFile(".env.local");
const baseURL = process.env.JOURNAL360_BASE_URL || "http://127.0.0.1:4173";
const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);
const publicClient = createClient(
  process.env.SUPABASE_URL,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    "sb_publishable_ZoulExB_bKV1a4m_G9ThNw_2tHVT9zC",
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);
const results = [];
let uid, desktopBrowser, mobileBrowser;
function passed(name) {
  results.push({ name, status: "PASS" });
  console.log("PASS:", name);
}
async function settings(page) {
  const back = page.getByRole("button", {
    name: "Retour à la bibliothèque",
    exact: true,
  });
  if (await back.isVisible()) await back.click();
  const nav = (await page.locator(".mobile-nav").isVisible())
    ? ".mobile-nav"
    : ".sidebar";
  await page
    .locator(nav)
    .getByRole("button", { name: "Réglages", exact: true })
    .click();
}
async function sync(page) {
  await settings(page);
  await page
    .getByRole("button", { name: "Synchroniser maintenant", exact: true })
    .click();
  await page
    .getByText("Bibliothèque synchronisée sur vos appareils", { exact: true })
    .waitFor({ timeout: 60000 });
}
async function context(browser, mobile = false) {
  const auth = await publicClient.auth.signInWithPassword({ email, password });
  if (auth.error) throw new Error("Connexion synthétique impossible");
  const ctx = await browser.newContext({
    baseURL,
    ...(mobile ? devices["iPhone 13"] : {}),
  });
  await ctx.addInitScript(
    ({ session, storageKey }) => {
      localStorage.setItem(storageKey, JSON.stringify(session));
    },
    {
      session: auth.data.session,
      storageKey: `sb-${new URL(process.env.SUPABASE_URL).hostname.split(".")[0]}-auth-token`,
    },
  );
  return ctx;
}
const email = `journal360-sync-${crypto.randomUUID()}@example.com`;
const password = crypto.randomUUID() + crypto.randomUUID();
try {
  const user = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { journal360_test: true },
  });
  if (user.error) throw new Error("Création du compte synthétique impossible");
  uid = user.data.user.id;
  desktopBrowser = await chromium.launch();
  mobileBrowser = await webkit.launch();
  const pcContext = await context(desktopBrowser);
  const pc = await pcContext.newPage();
  await pc.goto("/");
  await settings(pc);
  await pc
    .getByText("Bibliothèque synchronisée sur vos appareils", { exact: true })
    .waitFor();
  await pc
    .getByLabel("Fichiers HTML à importer")
    .setInputFiles("tests/fixtures/generic.html");
  await pc
    .getByRole("button", {
      name: "Enregistrer dans ma bibliothèque",
      exact: true,
    })
    .click();
  await settings(pc);
  await pc.locator(".snapshot").first().waitFor({ timeout: 60000 });
  passed(
    "Import sur PC envoyé automatiquement dans Supabase, sans sauvegarde manuelle",
  );

  const phoneContext = await context(mobileBrowser, true);
  const phone = await phoneContext.newPage();
  await phone.goto("/");
  await phone
    .getByRole("button", { name: "Lire Journal générique", exact: true })
    .waitFor({ timeout: 60000 });
  await phone
    .getByRole("button", { name: "Lire Journal générique", exact: true })
    .click();
  await phone
    .frameLocator("iframe")
    .getByRole("heading", { name: "Journal générique", exact: true })
    .waitFor();
  passed(
    "Nouvel appareil WebKit iPhone récupère et lit automatiquement le HTML du PC",
  );
  await phone
    .getByRole("button", { name: "Réduire la lecture", exact: true })
    .click();
  await phone
    .getByRole("button", { name: "Ajouter aux favoris", exact: true })
    .click();
  await phone
    .getByLabel("Votre note", { exact: true })
    .fill("Note smartphone synchronisée automatiquement");
  await phone
    .getByRole("button", { name: "Enregistrer la note", exact: true })
    .click();
  await phone.locator(".note").first().waitFor();
  await pcContext.setOffline(true);
  await pc
    .getByLabel("Fichiers HTML à importer")
    .setInputFiles("tests/fixtures/edition-13.html");
  await pc
    .getByRole("button", {
      name: "Enregistrer dans ma bibliothèque",
      exact: true,
    })
    .click();
  await settings(pc);
  await pcContext.setOffline(false);
  await pc
    .getByText("Bibliothèque synchronisée sur vos appareils", { exact: true })
    .waitFor({ timeout: 60000 });

  await pc
    .locator(".sidebar")
    .getByRole("button", { name: "Mémoire", exact: true })
    .click();
  await pc
    .getByText("Note smartphone synchronisée automatiquement", { exact: false })
    .waitFor({ timeout: 60000 });
  assert.equal(await pc.locator(".memory-link").count(), 2);
  passed("Note et favori créés sur smartphone récupérés par le PC");
  await settings(phone);
  await phone
    .locator(".mobile-nav")
    .getByRole("button", { name: "Bibliothèque", exact: true })
    .click();
  await phone
    .getByRole("button", {
      name: "Lire Les idées passent. Gardez le fil.",
      exact: true,
    })
    .waitFor({ timeout: 60000 });
  passed("Import PC hors ligne conservé et envoyé après retour du réseau");

  await sync(phone);
  passed("Bouton de synchronisation immédiate fonctionnel");
  assert.equal(
    await phone.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    true,
  );
  await phone.screenshot({
    path: "docs/screenshots/sync-phone-390.png",
    fullPage: true,
  });
  await settings(pc);
  await pc.screenshot({ path: "docs/screenshots/sync-pc.png", fullPage: true });
  passed("Réglages synchronisation sans débordement horizontal sur iPhone");
  await phone
    .getByRole("button", { name: "Se déconnecter", exact: true })
    .click();
  await phone.getByLabel("Code d’accès", { exact: true }).waitFor();
  await phone
    .locator(".mobile-nav")
    .getByRole("button", { name: "Bibliothèque", exact: true })
    .click();
  await phone
    .getByRole("button", { name: "Lire Journal générique", exact: true })
    .waitFor();
  passed("Déconnexion conserve la bibliothèque locale");
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Échec de synchronisation",
  );
  results.push({ name: "Parcours synchronisation", status: "FAIL" });
  process.exitCode = 1;
} finally {
  await desktopBrowser?.close();
  await mobileBrowser?.close();
  if (uid) {
    const files = await admin.storage
      .from("journal360-backups")
      .list(uid, { limit: 1000 });
    if (files.error) throw new Error("Liste de nettoyage impossible");
    if (files.data.length) {
      const removed = await admin.storage
        .from("journal360-backups")
        .remove(files.data.map((f) => `${uid}/${f.name}`));
      if (removed.error) throw new Error("Nettoyage synthétique impossible");
    }
    const deleted = await admin.auth.admin.deleteUser(uid);
    if (deleted.error)
      throw new Error("Suppression du compte synthétique impossible");
    passed("Compte et archives synthétiques supprimés");
  }
  fs.writeFileSync(
    `docs/evidence/sync${baseURL.startsWith("https:") ? "-production" : ""}.json`,
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        baseURL,
        environment:
          "Chromium PC et WebKit viewport iPhone, Supabase réel, compte synthétique",
        physicalPhones: "NON TESTÉS",
        results,
      },
      null,
      2,
    ) + "\n",
  );
}
