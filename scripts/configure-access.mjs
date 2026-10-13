import { createClient } from "@supabase/supabase-js";
import { accessPassword } from "../api/access.mjs";
process.loadEnvFile(".env.local");
const email = process.env.JOURNAL360_ACCOUNT_EMAIL;
const secret = process.env.SUPABASE_SECRET_KEY;
let code = "";
for await (const chunk of process.stdin) code += chunk;
code = code.trimEnd();
if (!email || !secret || !code || code.length > 64)
  throw new Error(
    "Configurez les variables serveur et fournissez le code sur stdin.",
  );
const admin = createClient(process.env.SUPABASE_URL, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
let owner;
for (let page = 1; !owner; page++) {
  const { data, error } = await admin.auth.admin.listUsers({
    page,
    perPage: 1000,
  });
  if (error) throw new Error("Lecture du compte impossible.");
  owner = data.users.find((user) => user.email === email);
  if (data.users.length < 1000) break;
}
if (!owner) throw new Error("Le compte privé doit être créé au préalable.");
const { error } = await admin.auth.admin.updateUserById(owner.id, {
  password: accessPassword(code, secret),
});
if (error) throw new Error("Configuration du code refusée.");
console.log("PASS : accès privé configuré, aucun email envoyé.");
