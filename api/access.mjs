import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
export const config = { api: { bodyParser: false } };
const attempts = new Map();
// Le code reste hors du client et du dépôt. Le mot de passe Supabase dérivé
// nécessite aussi le secret serveur : le code seul ne permet pas d'appeler Auth.
export function accessPassword(code, secret) {
  return (
    createHmac("sha256", secret)
      .update("journal360-access-v1:" + code)
      .digest("base64url") + "aA1!"
  );
}
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  const reply = (status, data) => {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(data));
  };
  if (req.method !== "POST")
    return reply(405, { error: "Méthode non autorisée." });
  if (req.headers.origin) {
    try {
      if (new URL(req.headers.origin).host !== req.headers.host)
        return reply(403, { error: "Origine non autorisée." });
    } catch {
      return reply(403, { error: "Origine non autorisée." });
    }
  }
  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  const email = process.env.JOURNAL360_ACCOUNT_EMAIL;
  if (!url || !secret || !email)
    return reply(503, {
      error: "Accès privé non configuré sur cet hébergement.",
    });
  const ip = String(
    req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown",
  )
    .split(",")[0]
    .trim();
  const previous = attempts.get(ip);
  const window =
    previous && Date.now() - previous.at < 60000
      ? previous
      : { at: Date.now(), count: 0 };
  window.count++;
  attempts.set(ip, window);
  if (attempts.size > 10000) attempts.clear();
  if (window.count > 5) {
    res.setHeader("Retry-After", "60");
    return reply(429, { error: "Trop d’essais. Réessayez dans une minute." });
  }
  try {
    let raw = "";
    for await (const chunk of req) {
      raw += chunk;
      if (Buffer.byteLength(raw) > 256)
        return reply(413, { error: "Demande trop volumineuse." });
    }
    let code;
    try {
      code = JSON.parse(raw).code;
    } catch {
      /* réponse uniforme */
    }
    if (typeof code !== "string" || !code.length || code.length > 64)
      return reply(400, { error: "Saisissez votre code d’accès." });
    const auth = createClient(url, secret, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await auth.auth.signInWithPassword({
      email,
      password: accessPassword(code, secret),
    });
    if (error || !data.session)
      return reply(error?.status === 429 ? 429 : 401, {
        error:
          error?.status === 429
            ? "Trop d’essais. Réessayez plus tard."
            : "Code d’accès incorrect.",
      });
    // Seuls les jetons de ce compte sont transmis, jamais le secret serveur.
    return reply(200, {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  } catch {
    return reply(502, {
      error: "Connexion indisponible. Réessayez plus tard.",
    });
  }
}
