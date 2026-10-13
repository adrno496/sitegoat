import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
process.loadEnvFile(".env.local");
const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const email = process.argv[2];
if (!email || !email.includes("@"))
  throw new Error("Indiquez une adresse email pour le compte privé.");
let found;
for (let page = 1; page <= 100; page++) {
  const { data, error } = await admin.auth.admin.listUsers({
    page,
    perPage: 100,
  });
  if (error) throw new Error("Accès administrateur Auth refusé");
  found = data.users.find((u) => u.email?.toLowerCase() === email);
  if (found || data.users.length < 100) break;
}
if (!found) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { application: "journal360" },
  });
  if (error) throw new Error("Création du compte privé refusée");
  found = data.user;
}
const result = { accountConfigured: !!found, emailSent: false };
fs.writeFileSync(
  "docs/evidence/owner-account.json",
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result));
