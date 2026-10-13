// Clé serveur reçue via stdin. Aucun secret dans les arguments ou la sortie.
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
process.stdout.write("Clé serveur attendue sur stdin (non affichée).\n");
let input = "";
for await (const chunk of process.stdin) {
  input += chunk;
  if (input.includes("\n")) break;
}
const secret = input.trim();
if (!secret.startsWith("sb_secret_"))
  throw new Error("Clé serveur Supabase attendue.");
const url = "https://guevmgdxznrvxcjvvzyu.supabase.co";
const admin = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const id = "journal360-backups";
const { data: existing, error: readError } = await admin.storage.getBucket(id);
if (existing?.public)
  throw new Error("Le bucket existant est public : configuration refusée.");
if (!existing) {
  const { error } = await admin.storage.createBucket(id, {
    public: false,
    fileSizeLimit: 50 * 1024 * 1024,
    allowedMimeTypes: ["application/zip"],
  });
  if (error) {
    console.log(
      JSON.stringify({
        operation: "createBucket",
        status: error.statusCode,
        message: error.message,
      }),
    );
    process.exit(1);
  }
}
const { data: bucket, error } = await admin.storage.getBucket(id);
if (error || bucket?.public !== false)
  throw new Error("Confidentialité du bucket non vérifiée.");
fs.writeFileSync(
  ".env.local",
  `SUPABASE_URL=${url}\nSUPABASE_SECRET_KEY=${secret}\n`,
  { mode: 0o600 },
);
fs.chmodSync(".env.local", 0o600);
console.log(
  JSON.stringify({
    bucket: id,
    public: bucket.public,
    serverEnvironment: "fichier .env.local ignoré par Git, droits 0600",
    sqlPolicies: "non modifiées",
  }),
);
