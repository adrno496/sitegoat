import { createClient } from "@supabase/supabase-js";
export const config = { api: { bodyParser: false } };
export const BUCKET = "journal360-backups";
const limits = new Map();
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  const reply = (status, data) => {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(data));
  };
  const url = process.env.SUPABASE_URL,
    secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret)
    return reply(503, {
      error: "Sauvegarde cloud non configurée sur cet hébergement.",
    });
  const authorization = req.headers.authorization || "";
  if (!/^Bearer [^\s]+$/.test(authorization))
    return reply(401, {
      error: "Connectez-vous pour accéder à votre sauvegarde.",
    });
  try {
    const admin = createClient(url, secret, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await admin.auth.getUser(authorization.slice(7));
    if (error || !data.user)
      return reply(401, { error: "Session expirée ou invalide." });
    const uid = data.user.id;
    const previous = limits.get(uid);
    const window =
      previous && Date.now() - previous.at < 60000
        ? previous
        : { at: Date.now(), count: 0 };
    window.count++;
    limits.set(uid, window);
    if (limits.size > 10000) limits.clear();
    if (window.count > 60)
      return reply(429, {
        error: "Trop de demandes. Réessayez dans une minute.",
      });
    const bucket = admin.storage.from(BUCKET);
    if (req.method === "GET") {
      const offsetValue =
        new URL(req.url || "/api/backup", "http://localhost").searchParams.get(
          "offset",
        ) || "0";
      if (!/^\d{1,6}$/.test(offsetValue) || Number(offsetValue) > 100000)
        return reply(400, { error: "Pagination invalide." });
      const offset = Number(offsetValue);
      const { data: files, error } = await bucket.list(uid, {
        limit: 100,
        offset,
        sortBy: { column: "created_at", order: "desc" },
      });
      if (error) throw error;
      return reply(200, {
        nextOffset: files?.length === 100 ? offset + 100 : null,
        snapshots: (files || [])
          .filter((f) => /^[a-f0-9-]{36}\.zip$/.test(f.name))
          .map((f) => ({
            id: f.name.slice(0, -4),
            createdAt: f.created_at,
            size: f.metadata?.size || 0,
          })),
      });
    }
    if (req.method !== "POST")
      return reply(405, { error: "Méthode non autorisée." });
    let raw = "";
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > 1024)
        return reply(413, { error: "Demande trop volumineuse." });
    }
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return reply(400, { error: "Demande invalide." });
    }
    if (payload.action === "upload") {
      const id = crypto.randomUUID();
      const path = `${uid}/${id}.zip`;
      const { data, error } = await bucket.createSignedUploadUrl(path, {
        upsert: false,
      });
      if (error) throw error;
      return reply(200, { id, path, token: data.token });
    }
    if (
      payload.action === "download" &&
      typeof payload.id === "string" &&
      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(
        payload.id,
      )
    ) {
      const { data, error } = await bucket.createSignedUrl(
        `${uid}/${payload.id}.zip`,
        60,
        { download: "journal360-sauvegarde.zip" },
      );
      if (error)
        return reply(404, {
          error: "Sauvegarde introuvable dans votre compte.",
        });
      return reply(200, { url: data.signedUrl });
    }
    return reply(400, { error: "Action inconnue." });
  } catch {
    return reply(502, {
      error:
        "Supabase est indisponible ou le bucket privé n’est pas configuré.",
    });
  }
}
