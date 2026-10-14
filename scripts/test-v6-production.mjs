// Explicit release smoke test: only a newly created synthetic account is used.
// Server credentials stay in process memory and never enter browser contexts.
import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import JSZip from "jszip";
import { chromium, webkit, devices } from "playwright";
import { expect } from "@playwright/test";
const baseURL = process.env.JOURNAL360_BASE_URL;
if (baseURL !== "https://sitegoat.vercel.app")
  throw new Error("Specify the approved production URL explicitly.");
if (process.env.SUPABASE_URL !== "https://guevmgdxznrvxcjvvzyu.supabase.co")
  throw new Error("Unexpected Supabase project.");
const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);
const publicClient = createClient(
  process.env.SUPABASE_URL,
  "sb_publishable_ZoulExB_bKV1a4m_G9ThNw_2tHVT9zC",
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);
const results = [];
const browsers = [];
const originals = new Map();
let uid;
function passed(name) {
  results.push({ name, status: "PASS" });
  console.log("PASS:", name);
}
async function nav(page, label) {
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
    .getByRole("button", { name: label, exact: true })
    .click();
}
async function sync(page) {
  await nav(page, "Réglages");
  await page
    .getByRole("button", { name: "Synchroniser maintenant", exact: true })
    .click();
  await page
    .getByText("Bibliothèque synchronisée sur vos appareils", { exact: true })
    .waitFor({ timeout: 45000 });
}
function html(revision) {
  const data = {
    schemaVersion: 2,
    title: "Publication V6 synthétique",
    editionDate: "2026-10-14",
    editionId: "journal360-day-2026-10-14",
    revision,
    slotsIncluded: ["08:00", "16:00", "21:00"].slice(0, revision),
    cumulativeStatus: "COMPLETE",
    missingSlots: [],
    sourceVerifiedAt: `2026-10-14T${["08:00", "16:00", "21:00"][revision - 1]}:00+02:00`,
    items: ["a", "b", "c"]
      .slice(0, revision)
      .map((id) => ({
        id,
        event_id: `synthetic-${id}`,
        title: `Fixture ${id}`,
        category: "Test",
        plain: "Données synthétiques de publication",
        sources: ["https://example.org/test"],
      })),
  };
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${data.title}</title></head><body><h1>${data.title}</h1><p>Révision synthétique ${revision}</p><a href="https://www.google.com/ai" data-ai-link="google-ai-mode" data-ai-question="Question publique synthétique de vérification">En savoir plus</a><script id="editionData" type="application/json">${JSON.stringify(data)}</script></body></html>`;
}
try {
  const { data: bucket, error: bucketError } =
    await admin.storage.getBucket("journal360-backups");
  assert.equal(bucketError, null);
  assert.equal(bucket.public, false);
  assert.equal(bucket.file_size_limit, 52428800);
  passed(
    "Bucket Supabase existant privé, limite 50 MiB conservée ; aucune migration SQL",
  );
  assert.equal((await fetch(`${baseURL}/api/backup`)).status, 401);
  assert.equal(
    (
      await fetch(`${baseURL}/api/backup`, {
        headers: { Authorization: "Bearer synthetic-invalid" },
      })
    ).status,
    401,
  );
  passed("API production refuse anonyme et token invalide");
  const email = `journal360-v6-release-${crypto.randomUUID()}@example.com`;
  const password = crypto.randomUUID() + crypto.randomUUID();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { journal360_test: true },
  });
  if (error) throw new Error("Synthetic account creation failed");
  uid = data.user.id;
  async function makeContext(browser, mobile) {
    const auth = await publicClient.auth.signInWithPassword({
      email,
      password,
    });
    if (auth.error) throw new Error("Synthetic authentication failed");
    const context = await browser.newContext({
      baseURL,
      ...(mobile ? devices["iPhone 13"] : {}),
    });
    await context.addInitScript(
      ({ session, key }) => localStorage.setItem(key, JSON.stringify(session)),
      { session: auth.data.session, key: "sb-guevmgdxznrvxcjvvzyu-auth-token" },
    );
    return context;
  }
  const desktop = await chromium.launch();
  browsers.push(desktop);
  const mobile = await webkit.launch();
  browsers.push(mobile);
  const pcContext = await makeContext(desktop, false);
  const pc = await pcContext.newPage();
  await pc.goto("/");
  await expect(pc.locator(".sidebar")).toContainText("v2.0.0");
  const files = [1, 2, 3].map((revision) => {
    const value = html(revision);
    originals.set(revision, value);
    return {
      name: `synthetic-v6-${revision}.html`,
      mimeType: "text/html",
      buffer: Buffer.from(value),
    };
  });
  await pc.getByLabel("Fichiers HTML à importer").setInputFiles(files);
  await pc
    .getByRole("button", {
      name: "Enregistrer dans ma bibliothèque",
      exact: true,
    })
    .click();
  await expect(pc.locator(".day-card")).toHaveCount(1);
  await expect(pc.locator(".day-card")).toContainText("3 version(s)");
  await expect(pc.locator(".day-card")).toContainText("CUMUL COMPLETE");
  await nav(pc, "Réglages");
  await pc.locator(".snapshot").first().waitFor({ timeout: 45000 });
  passed(
    "Production 2.0.0 : import 08/16/21 regroupé et envoyé automatiquement à Supabase",
  );
  const phoneContext = await makeContext(mobile, true);
  const phone = await phoneContext.newPage();
  await phone.goto("/");
  await phone.locator(".day-card").waitFor({ timeout: 45000 });
  await expect(phone.locator(".day-card")).toContainText("3 version(s)");
  await phone
    .getByRole("button", {
      name: "Lire Publication V6 synthétique",
      exact: true,
    })
    .click();
  await expect(phone.locator("iframe")).toHaveAttribute(
    "sandbox",
    "allow-scripts",
  );
  await expect(
    phone
      .frameLocator("iframe")
      .getByText("Révision synthétique 3", { exact: true }),
  ).toBeVisible();
  passed(
    "WebKit iPhone simulé : récupération automatique des trois versions et lecteur interactif isolé",
  );
  await phone
    .frameLocator("iframe")
    .getByRole("link", { name: "En savoir plus", exact: true })
    .click();
  const dialog = phone.getByRole("dialog", {
    name: "Ouvrir Google Mode IA dans votre navigateur ?",
  });
  await expect(dialog.getByRole("textbox")).toHaveValue(
    "Question publique synthétique de vérification",
  );
  assert.equal(phoneContext.pages().length, 1);
  await dialog.getByRole("button", { name: "Annuler", exact: true }).click();
  passed(
    "Pont Google v2 en production : confirmation et annulation sans ouverture externe",
  );
  await phone
    .getByRole("button", { name: "Réduire la lecture", exact: true })
    .click();
  await phone
    .getByRole("button", { name: "Ajouter aux favoris", exact: true })
    .click();
  await phone
    .getByLabel("Votre note", { exact: true })
    .fill("Note synthétique V6 du téléphone");
  await phone
    .getByRole("button", { name: "Enregistrer la note", exact: true })
    .click();
  await expect(phone.locator(".note")).toHaveCount(1);
  await nav(phone, "Réglages");
  await expect
    .poll(() => phone.locator(".snapshot").count(), { timeout: 45000 })
    .toBeGreaterThanOrEqual(2);
  await sync(pc);
  await nav(pc, "Mémoire");
  await pc
    .getByText("Note synthétique V6 du téléphone", { exact: false })
    .waitFor({ timeout: 45000 });
  passed("Note et favori WebKit récupérés sur PC après synchronisation");
  await nav(pc, "Réglages");
  const downloadEvent = pc.waitForEvent("download");
  await pc.getByRole("button", { name: "Exporter tout", exact: true }).click();
  const archive = await JSZip.loadAsync(
    fs.readFileSync(await (await downloadEvent).path()),
  );
  const manifest = JSON.parse(
    await archive.file("manifest.json").async("string"),
  );
  assert.equal(manifest.formatVersion, 2);
  assert.equal(manifest.editionCount, 3);
  assert.equal(manifest.notes.length, 1);
  assert(manifest.states.some((s) => s.favorite));
  for (const edition of manifest.editions) {
    const bytes = await archive
      .file(`files/${edition.id}.html`)
      .async("uint8array");
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      edition.sha256,
    );
    assert.equal(
      Buffer.from(bytes).toString(),
      originals.get(edition.externalRevision),
    );
  }
  passed(
    "Export ZIP2 après cloud : trois originaux octet pour octet, SHA, note et favori conservés",
  );
  await expect
    .poll(() => phone.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await phoneContext.setOffline(true);
  await phone.reload();
  await nav(phone, "Bibliothèque");
  await phone
    .getByRole("button", {
      name: "Lire Publication V6 synthétique",
      exact: true,
    })
    .click();
  await expect(
    phone
      .frameLocator("iframe")
      .getByText("Révision synthétique 3", { exact: true }),
  ).toBeVisible();
  passed(
    "Lecture de la version récupérée depuis Supabase après rechargement hors ligne",
  );
} catch (error) {
  results.push({
    name: "Parcours production V6",
    status: "FAIL",
    reason:
      error instanceof Error ? error.message.slice(0, 500) : "Unknown error",
  });
  console.error("FAIL: production V6 smoke test; see expurgated evidence");
  process.exitCode = 1;
} finally {
  for (const browser of browsers) await browser.close();
  if (uid) {
    const { data: files, error } = await admin.storage
      .from("journal360-backups")
      .list(uid, { limit: 1000 });
    if (error) throw new Error("Synthetic cleanup inventory failed");
    if (files.length) {
      const removed = await admin.storage
        .from("journal360-backups")
        .remove(files.map((f) => `${uid}/${f.name}`));
      if (removed.error) throw new Error("Synthetic cleanup failed");
    }
    const deleted = await admin.auth.admin.deleteUser(uid);
    if (deleted.error) throw new Error("Synthetic account cleanup failed");
    passed(
      "Seuls le compte et les snapshots créés par ce test ont été supprimés",
    );
  }
  fs.writeFileSync(
    "docs/evidence/v6/release-production-smoke.json",
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        baseURL,
        version: "2.0.0",
        realSupabase: true,
        ownerAccountUsed: false,
        privateUserContentUploaded: false,
        physicalPhones: "NON TESTÉS",
        results,
      },
      null,
      2,
    ) + "\n",
  );
}
