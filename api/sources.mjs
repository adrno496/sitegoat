import { createClient } from "@supabase/supabase-js";
import {
  fetchSource,
  sourceCatalog,
  SOURCES,
  SourceError,
  publicQuery,
} from "../server/source-providers.mjs";
export const config = { api: { bodyParser: false } };
export function createSourcesHandler({
  env = process.env,
  request = globalThis.fetch,
  verifySession,
} = {}) {
  const cache = new Map(),
    limits = new Map();
  return async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    const reply = (status, value) => {
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(value));
    };
    if (req.method === "GET")
      return reply(200, { sources: sourceCatalog(env) });
    if (req.method !== "POST")
      return reply(405, { code: "METHOD_NOT_ALLOWED" });
    try {
      if (
        !req.headers.origin ||
        new URL(req.headers.origin).host !== req.headers.host
      )
        return reply(403, { code: "ORIGIN_REFUSED" });
    } catch {
      return reply(403, { code: "ORIGIN_REFUSED" });
    }
    try {
      const chunks = [];
      let bytes = 0;
      for await (const chunk of req) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        bytes += buffer.length;
        if (bytes > 2048) return reply(413, { code: "REQUEST_TOO_LARGE" });
        chunks.push(buffer);
      }
      const raw = Buffer.concat(chunks).toString("utf8");
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        return reply(400, { code: "INVALID_REQUEST" });
      }
      if (
        !body ||
        typeof body !== "object" ||
        Object.keys(body).some((k) => !["provider", "query"].includes(k))
      )
        return reply(400, { code: "INVALID_REQUEST" });
      const definition = SOURCES.find((s) => s.id === body.provider);
      if (!definition) return reply(400, { code: "UNKNOWN_SOURCE" });
      const query = definition.search ? body.query : "";
      if (
        definition.search &&
        (!publicQuery(query) ||
          ["BRAVE_API_KEY", "TAVILY_API_KEY", "EXA_API_KEY"].some(
            (k) =>
              env[k] &&
              (query.includes(env[k]) ||
                query.includes(encodeURIComponent(env[k]))),
          ))
      )
        return reply(400, { code: "PUBLIC_QUERY_REQUIRED" });
      let identity = `ip:${String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0]}`;
      if (definition.key) {
        const token = req.headers.authorization;
        if (!/^Bearer [^\s]+$/.test(token || ""))
          return reply(401, { code: "LOGIN_REQUIRED" });
        const verify =
          verifySession ||
          (async (t) => {
            if (
              !env.SUPABASE_URL ||
              !env.SUPABASE_SECRET_KEY ||
              !env.JOURNAL360_ACCOUNT_EMAIL
            )
              return null;
            const client = createClient(
              env.SUPABASE_URL,
              env.SUPABASE_SECRET_KEY,
              { auth: { persistSession: false, autoRefreshToken: false } },
            );
            const { data, error } = await client.auth.getUser(t);
            return error ||
              data.user?.email?.toLowerCase() !==
                env.JOURNAL360_ACCOUNT_EMAIL.trim().toLowerCase()
              ? null
              : data.user.id;
          });
        const uid = await verify(token.slice(7));
        if (!uid) return reply(401, { code: "LOGIN_REQUIRED" });
        identity = `user:${uid}`;
      }
      const cacheKey = JSON.stringify([body.provider, query]);
      const old = cache.get(cacheKey);
      if (old && Date.now() - old.at < 15 * 60_000)
        return reply(200, { ...old.value, cached: true });
      const previous = limits.get(identity),
        current =
          previous && Date.now() - previous.at < 60_000
            ? previous
            : { at: Date.now(), count: 0 };
      current.count++;
      limits.set(identity, current);
      if (limits.size > 1000) {
        const oldest = limits.keys().next().value;
        limits.delete(oldest);
      }
      if (current.count > (definition.key ? 3 : 10)) {
        res.setHeader("Retry-After", "60");
        return reply(429, { code: "RATE_LIMITED" });
      }
      const value = await fetchSource(body.provider, query, env, request);
      if (cache.size >= 50) cache.delete(cache.keys().next().value);
      cache.set(cacheKey, { at: Date.now(), value });
      return reply(200, value);
    } catch (e) {
      return reply(e instanceof SourceError ? e.status : 502, {
        code: e instanceof SourceError ? e.code : "PROVIDER_UNAVAILABLE",
      });
    }
  };
}
export default createSourcesHandler();
