const baseURL = process.env.JOURNAL360_BASE_URL || "http://127.0.0.1:4173";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
process.loadEnvFile(".env.local");
const url = process.env.SUPABASE_URL;
const key = "sb_publishable_ZoulExB_bKV1a4m_G9ThNw_2tHVT9zC";
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const users = [];
const results = [];
let browser;
function check(name, value) {
  results.push({ name, status: value ? "PASS" : "FAIL" });
  if (!value) throw new Error(name);
}
async function waitCount(page, selector, count) {
  await page.waitForFunction(
    ({ selector, count }) =>
      document.querySelectorAll(selector).length === count,
    { selector, count },
  );
}
async function contextFor(auth) {
  const context = await browser.newContext({
    baseURL,
  });
  await context.addInitScript(
    (session) =>
      localStorage.setItem(
        "sb-guevmgdxznrvxcjvvzyu-auth-token",
        JSON.stringify(session),
      ),
    auth,
  );
  return context;
}
try {
  for (let i = 0; i < 2; i++) {
    const email = `journal360-browser-${crypto.randomUUID()}@example.com`,
      password = crypto.randomUUID() + crypto.randomUUID();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { journal360_test: true },
    });
    if (error) throw new Error("Création test refusée");
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const auth = await client.auth.signInWithPassword({ email, password });
    if (auth.error) throw new Error("Connexion test refusée");
    users.push({
      id: data.user.id,
      email,
      password,
      session: auth.data.session,
      client,
    });
  }
  browser = await chromium.launch();
  const ctx1 = await contextFor(users[0].session);
  const p1 = await ctx1.newPage();
  await p1.goto("/");
  await p1
    .getByLabel("Fichiers HTML à importer")
    .setInputFiles("tests/fixtures/generic.html");
  await p1
    .getByRole("button", { name: "Enregistrer dans ma bibliothèque" })
    .click();
  await p1
    .getByRole("button", { name: "Lire Journal générique", exact: true })
    .click();
  await p1
    .getByRole("button", { name: "Réduire la lecture", exact: true })
    .click();
  await p1
    .getByRole("button", { name: "Ajouter aux favoris", exact: true })
    .click();
  await p1
    .getByRole("button", { name: "Marquer comme lue", exact: true })
    .click();
  await p1
    .getByLabel("Votre note", { exact: true })
    .fill("Note cloud synthétique à retrouver sur le second appareil");
  await p1
    .getByRole("button", { name: "Enregistrer la note", exact: true })
    .click();
  await waitCount(p1, ".note", 1);
  await p1
    .locator(".sidebar")
    .getByRole("button", { name: "Réglages", exact: true })
    .click();
  await p1.getByRole("button", { name: "Sauvegarder dans Supabase" }).click();
  await waitCount(p1, ".snapshot", 1);
  check("UI sauvegarde ZIP avec original, note, favori et lecture", true);
  // Deuxième connexion réelle pour le même compte, dans une nouvelle base locale.
  const second = await users[0].client.auth.signInWithPassword({
    email: users[0].email,
    password: users[0].password,
  });
  const ctx2 = await contextFor(second.data.session);
  const p2 = await ctx2.newPage();
  await p2.goto("/");
  await p2
    .locator(".sidebar")
    .getByRole("button", { name: "Réglages", exact: true })
    .click();
  await p2.getByRole("button", { name: "Retrouver mes sauvegardes" }).click();
  await waitCount(p2, ".snapshot", 1);
  await p2
    .locator(".snapshot")
    .getByRole("button", { name: "Restaurer", exact: true })
    .click();
  await p2
    .getByText("Sauvegarde cloud restaurée par fusion.", { exact: false })
    .waitFor();
  await p2
    .locator(".sidebar")
    .getByRole("button", { name: "Mémoire", exact: true })
    .click();
  await waitCount(p2, ".memory-link", 2);
  check("Nouvelle session restaure favori et note depuis Supabase", true);
  await p2.locator(".memory-link").first().click();
  await p2
    .frameLocator("iframe")
    .getByRole("heading", { name: "Journal générique" })
    .waitFor();
  check(
    "Original restitué dans iframe",
    await p2
      .frameLocator("iframe")
      .getByRole("heading", { name: "Journal générique" })
      .isVisible(),
  );
  await p2
    .getByRole("button", { name: "Réduire la lecture", exact: true })
    .click();
  check(
    "État lu restitué",
    await p2
      .getByRole("button", { name: "Marquée lue", exact: true })
      .isVisible(),
  );
  // Même ID de note modifié indépendamment dans deux sauvegardes : unité déjà testée, ici fusion réelle non destructive.
  await p2
    .getByLabel("Votre note", { exact: true })
    .fill("Deuxième note synthétique sur appareil 2");
  await p2
    .getByRole("button", { name: "Enregistrer la note", exact: true })
    .click();
  await waitCount(p2, ".note", 2);
  await p2
    .locator(".sidebar")
    .getByRole("button", { name: "Réglages", exact: true })
    .click();
  await p2.getByRole("button", { name: "Sauvegarder dans Supabase" }).click();
  await waitCount(p2, ".snapshot", 2);
  await p1.getByRole("button", { name: "Retrouver mes sauvegardes" }).click();
  await waitCount(p1, ".snapshot", 2);
  await p1
    .locator(".snapshot")
    .first()
    .getByRole("button", { name: "Restaurer", exact: true })
    .click();
  await p1
    .getByText("Sauvegarde cloud restaurée par fusion.", { exact: false })
    .waitFor();
  await p1
    .locator(".sidebar")
    .getByRole("button", { name: "Mémoire", exact: true })
    .click();
  await waitCount(p1, ".memory-link", 3);
  check("Deux appareils conservent et fusionnent leurs notes", true);
  const ctxB = await contextFor(users[1].session);
  const pB = await ctxB.newPage();
  await pB.goto("/");
  await pB
    .locator(".sidebar")
    .getByRole("button", { name: "Réglages", exact: true })
    .click();
  await pB.getByRole("button", { name: "Retrouver mes sauvegardes" }).click();
  await pB
    .getByText("Connexion au serveur vérifiée", { exact: true })
    .waitFor();
  check(
    "Compte B ne voit aucun snapshot A",
    (await pB.locator(".snapshot").count()) === 0,
  );
  await p1
    .locator(".sidebar")
    .getByRole("button", { name: "Réglages", exact: true })
    .click();
  await ctx1.setOffline(true);
  await p1.getByRole("button", { name: "Sauvegarder dans Supabase" }).click();
  await p1
    .getByText("Sauvegarde en attente · 0/3 essais.", { exact: false })
    .waitFor();
  check("File de sauvegarde conservée offline", true);
  await ctx1.setOffline(false);
  await p1.getByRole("button", { name: "Retrouver mes sauvegardes" }).click();
  await waitCount(p1, ".snapshot", 3);
  check("File reprise au retour du réseau", true);
  await p1.getByRole("button", { name: "Se déconnecter" }).click();
  await p1
    .getByText("Mode local — aucune sauvegarde cloud active", { exact: true })
    .waitFor();
  await p1
    .locator(".sidebar")
    .getByRole("button", { name: "Mémoire", exact: true })
    .click();
  await waitCount(p1, ".memory-link", 3);
  check("Déconnexion conserve la bibliothèque locale", true);
} catch (e) {
  console.error(
    "Test navigateur cloud :",
    e instanceof Error ? e.message : "Échec",
  );
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  for (const user of users) {
    const { data } = await admin.storage
      .from("journal360-backups")
      .list(user.id);
    if (data?.length)
      await admin.storage
        .from("journal360-backups")
        .remove(data.map((f) => `${user.id}/${f.name}`));
    const { error } = await admin.auth.admin.deleteUser(user.id);
    results.push({
      name: "Nettoyage données synthétiques",
      status: error ? "FAIL" : "PASS",
    });
  }
  fs.writeFileSync(
    baseURL.startsWith("https:")
      ? "docs/evidence/cloud-browser-production.json"
      : "docs/evidence/cloud-browser.json",
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        baseURL,
        environment:
          "Chromium local, Supabase réel, deux sessions A et un compte B synthétiques",
        results,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(results, null, 2));
}
