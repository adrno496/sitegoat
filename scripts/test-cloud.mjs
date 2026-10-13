import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
if (fs.existsSync(".env.local")) process.loadEnvFile(".env.local");
const url = process.env.SUPABASE_URL,
  secret = process.env.SUPABASE_SECRET_KEY,
  publishable = "sb_publishable_ZoulExB_bKV1a4m_G9ThNw_2tHVT9zC";
if (!secret) {
  console.error("NON TESTÉ : environnement serveur absent");
  process.exit(1);
}
const admin = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const bucket = "journal360-backups";
const users = [];
const results = [];
let objectPath;
function check(name, condition) {
  results.push({ name, status: condition ? "PASS" : "FAIL" });
  if (!condition) throw new Error(name);
}
async function api(token, body) {
  return fetch("http://127.0.0.1:4173/api/backup", {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}
try {
  const { data: b, error } = await admin.storage.getBucket(bucket);
  check("Bucket existant et privé", !error && b.public === false);
  for (let i = 0; i < 2; i++) {
    const password = crypto.randomUUID() + crypto.randomUUID();
    const email = `journal360-e2e-${crypto.randomUUID()}@example.com`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { journal360_test: true },
    });
    check(`Création compte synthétique ${i + 1}`, !error && !!data.user);
    users.push({ id: data.user.id });
    const client = createClient(url, publishable, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const auth = await client.auth.signInWithPassword({ email, password });
    check(
      `Authentification réelle ${i + 1}`,
      !auth.error && !!auth.data.session,
    );
    users[i].client = client;
    users[i].token = auth.data.session.access_token;
  }
  const anonymous = await fetch("http://127.0.0.1:4173/api/backup");
  check("API anonyme refusée", anonymous.status === 401);
  const invalid = await api("invalid");
  check("API token invalide refusée", invalid.status === 401);
  const signedResponse = await api(users[0].token, { action: "upload" });
  check("Signature upload propriétaire A", signedResponse.status === 200);
  const signed = await signedResponse.json();
  objectPath = signed.path;
  check("Chemin forcé sous UID A", objectPath.startsWith(users[0].id + "/"));
  // Archive synthétique uniquement : aucun journal utilisateur transmis.
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  zip.file("test.txt", "Journal 360 cloud test — données synthétiques");
  const content = await zip.generateAsync({ type: "nodebuffer" });
  const upload = await users[0].client.storage
    .from(bucket)
    .uploadToSignedUrl(signed.path, signed.token, content, {
      contentType: "application/zip",
    });
  check("Upload privé signé réel", !upload.error);
  const listA = await api(users[0].token);
  const snapshotsA = await listA.json();
  check(
    "A retrouve son snapshot",
    snapshotsA.snapshots.some((s) => s.id === signed.id),
  );
  const listB = await api(users[1].token);
  const snapshotsB = await listB.json();
  check(
    "B ne liste pas les snapshots A",
    !snapshotsB.snapshots.some((s) => s.id === signed.id),
  );
  const getA = await api(users[0].token, { action: "download", id: signed.id });
  check("Téléchargement signé A", getA.status === 200);
  const download = await fetch((await getA.json()).url);
  check(
    "Octets ZIP cloud identiques",
    Buffer.from(await download.arrayBuffer()).equals(content),
  );
  const getB = await api(users[1].token, { action: "download", id: signed.id });
  check("IDOR : B connaît UUID A mais ne peut lire", getB.status === 404);
  const traversal = await api(users[0].token, {
    action: "download",
    id: "../" + signed.id,
  });
  check("Traversal refusé", traversal.status === 400);
  const directB = await users[1].client.storage
    .from(bucket)
    .download(objectPath);
  check("Storage SELECT croisé refusé", !!directB.error);
  const directInsert = await users[1].client.storage
    .from(bucket)
    .upload(`${users[0].id}/${crypto.randomUUID()}.zip`, content, {
      contentType: "application/zip",
    });
  check("Storage INSERT croisé refusé", !!directInsert.error);
  const directUpdate = await users[1].client.storage
    .from(bucket)
    .update(objectPath, content, { contentType: "application/zip" });
  check("Storage UPDATE croisé refusé", !!directUpdate.error);
  await users[1].client.storage.from(bucket).remove([objectPath]);
  const exists = await admin.storage.from(bucket).download(objectPath);
  check("Storage DELETE croisé sans effet", !exists.error);
  const publicURL = `${url}/storage/v1/object/public/${bucket}/${objectPath}`;
  const publicRead = await fetch(publicURL);
  check("URL publique refusée", !publicRead.ok);
  const anonClient = createClient(url, publishable, {
    auth: { persistSession: false },
  });
  const anonRead = await anonClient.storage.from(bucket).download(objectPath);
  check("Storage anonyme refusé", !!anonRead.error);
  // Une URL de téléchargement expirée ne fonctionne plus (validité de test 1 seconde).
  const expired = await admin.storage
    .from(bucket)
    .createSignedUrl(objectPath, 1);
  await new Promise((r) => setTimeout(r, 2200));
  const expiredRead = await fetch(expired.data.signedUrl);
  check("URL signée expirée refusée", !expiredRead.ok);
} catch (e) {
  console.error("Échec cloud :", e instanceof Error ? e.message : "Erreur");
  process.exitCode = 1;
} finally {
  if (objectPath) {
    const { error } = await admin.storage.from(bucket).remove([objectPath]);
    results.push({
      name: "Nettoyage objet synthétique",
      status: error ? "FAIL" : "PASS",
    });
  }
  for (const user of users) {
    const { error } = await admin.auth.admin.deleteUser(user.id);
    results.push({
      name: "Nettoyage compte synthétique",
      status: error ? "FAIL" : "PASS",
    });
  }
  fs.mkdirSync("docs/evidence", { recursive: true });
  fs.writeFileSync(
    "docs/evidence/cloud.json",
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        project: "guevmgdxznrvxcjvvzyu",
        results,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(results, null, 2));
}
