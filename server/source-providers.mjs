// Public information only. Fixed provider endpoints; never fetch a returned URL.
export const SOURCES = [
  {
    id: "brave",
    label: "Actualités · Brave",
    key: "BRAVE_API_KEY",
    search: true,
  },
  {
    id: "tavily",
    label: "Recherche · Tavily",
    key: "TAVILY_API_KEY",
    search: true,
  },
  { id: "exa", label: "Recherche · Exa", key: "EXA_API_KEY", search: true },
  { id: "ecb", label: "Économie · devises BCE" },
  { id: "cisa", label: "Cybersécurité · CISA" },
  ...[
    ["vscode", "microsoft/vscode"],
    ["node", "nodejs/node"],
    ["react", "react/react"],
    ["ollama", "ollama/ollama"],
  ].map(([id, repo]) => ({ id, label: `Versions · ${id}`, repo })),
];
export class SourceError extends Error {
  constructor(code, status = 502) {
    super(code);
    this.code = code;
    this.status = status;
  }
}
export function publicLink(value) {
  try {
    const u = new URL(value);
    if (
      u.protocol !== "https:" ||
      u.username ||
      u.password ||
      (u.port && u.port !== "443") ||
      !u.hostname.includes(".") ||
      /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(
        u.hostname,
      ) ||
      u.hostname.includes(":") ||
      /\.(localhost|local|internal|test|invalid)$/i.test(u.hostname)
    )
      return null;
    for (const key of u.searchParams.keys())
      if (/^(api_?key|token|access_token|secret|auth)$/i.test(key)) return null;
    return u.href;
  } catch {
    return null;
  }
}
export function publicQuery(value) {
  return (
    typeof value === "string" &&
    value.trim().length >= 3 &&
    value.length <= 200 &&
    !Array.from(value).some((c) => c.charCodeAt(0) < 32) &&
    !/(@|\bBearer\s|\bsk-|\bgh[pousr]_|github_pat_|(?:api_?key|password|secret|token)\s*[:=]|\/Users\/|[A-Z]:\\)/i.test(
      value,
    )
  );
}
export function sourceCatalog(env) {
  return SOURCES.map(({ id, label, key, search }) => ({
    id,
    label,
    search: !!search,
    private: !!key,
    available: !key || !!env[key],
  }));
}
async function readBounded(response, max = 4 * 1024 * 1024) {
  if (!response.ok)
    throw new SourceError(
      response.status === 429
        ? "RATE_LIMITED"
        : [401, 403].includes(response.status)
          ? "CREDENTIALS_REFUSED"
          : "PROVIDER_UNAVAILABLE",
      response.status === 429 ? 429 : 502,
    );
  if (Number(response.headers.get("content-length")) > max)
    throw new SourceError("RESPONSE_TOO_LARGE");
  const reader = response.body?.getReader();
  if (!reader) throw new SourceError("INVALID_RESPONSE");
  const decoder = new TextDecoder();
  let size = 0,
    text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) throw new SourceError("RESPONSE_TOO_LARGE");
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    await reader.cancel().catch(() => {});
  }
}
export async function fetchSource(
  provider,
  query,
  env,
  request = globalThis.fetch,
) {
  const definition = SOURCES.find((s) => s.id === provider);
  if (!definition) throw new SourceError("UNKNOWN_SOURCE", 400);
  if (definition.key && !env[definition.key])
    throw new SourceError("NOT_CONFIGURED", 503);
  if (definition.search && !publicQuery(query))
    throw new SourceError("PUBLIC_QUERY_REQUIRED", 400);
  const secrets = ["BRAVE_API_KEY", "TAVILY_API_KEY", "EXA_API_KEY"]
    .map((k) => env[k])
    .filter(Boolean);
  const clean = (v, n) => {
    let t = typeof v === "string" ? v : "";
    for (const key of secrets) t = t.split(key).join("[masqué]");
    return t
      .replace(/<[^>]*>/g, "")
      .split("")
      .map((c) => (c.charCodeAt(0) < 32 ? " " : c))
      .join("")
      .slice(0, n);
  };
  const rows = (values) =>
    values.slice(0, 12).flatMap((v) => {
      const url = publicLink(v.url);
      const title = clean(v.title, 220);
      if (
        !url ||
        !title ||
        secrets.some(
          (k) => url.includes(k) || url.includes(encodeURIComponent(k)),
        )
      )
        return [];
      const date =
        typeof v.publishedAt === "string" &&
        Number.isFinite(Date.parse(v.publishedAt))
          ? v.publishedAt
          : undefined;
      return [
        {
          title,
          url,
          summary: clean(v.summary, 600),
          ...(date ? { publishedAt: date } : {}),
        },
      ];
    });
  let endpoint,
    init = { headers: { Accept: "application/json" } };
  if (provider === "brave") {
    endpoint =
      "https://api.search.brave.com/res/v1/news/search?" +
      new URLSearchParams({
        q: query.trim(),
        count: "5",
        country: "FR",
        search_lang: "fr",
        freshness: "pw",
      });
    init.headers["X-Subscription-Token"] = env.BRAVE_API_KEY;
  } else if (provider === "tavily") {
    endpoint = "https://api.tavily.com/search";
    init = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.TAVILY_API_KEY}`,
      },
      body: JSON.stringify({
        query: query.trim(),
        search_depth: "basic",
        max_results: 5,
        include_answer: false,
        include_raw_content: false,
        auto_parameters: false,
      }),
    };
  } else if (provider === "exa") {
    endpoint = "https://api.exa.ai/search";
    init = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.EXA_API_KEY,
      },
      body: JSON.stringify({
        query: query.trim(),
        numResults: 5,
        type: "fast",
        contents: { highlights: { maxCharacters: 600 } },
      }),
    };
  } else if (provider === "ecb")
    endpoint = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";
  else if (provider === "cisa")
    endpoint =
      "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";
  else {
    endpoint = `https://api.github.com/repos/${definition.repo}/releases?per_page=5`;
    init.headers["User-Agent"] = "SiteGoat-Public-Sources";
  }
  const response = await request(endpoint, {
    ...init,
    redirect: "error",
    signal: AbortSignal.timeout(12000),
  });
  const raw = await readBounded(response);
  let entries;
  if (provider === "ecb") {
    const date = raw.match(/<Cube\s+time=['"](\d{4}-\d{2}-\d{2})['"]/i)?.[1];
    if (!date) throw new SourceError("INVALID_RESPONSE");
    entries = [
      ...raw.matchAll(
        /<Cube\s+currency=['"]([A-Z]{3})['"]\s+rate=['"]([0-9.]+)['"]/g,
      ),
    ]
      .filter(
        (m) =>
          ["USD", "GBP", "JPY", "CHF", "CAD", "CNY"].includes(m[1]) &&
          Number(m[2]) > 0,
      )
      .map((m) => ({
        title: `1 EUR = ${m[2]} ${m[1]}`,
        summary: "Taux de référence BCE, à titre informatif.",
        publishedAt: date,
        url: "https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html",
      }));
  } else {
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new SourceError("INVALID_RESPONSE");
    }
    if (provider === "brave")
      entries = (body.results || []).map((v) => ({
        ...v,
        summary: v.description,
        publishedAt: v.meta_url?.published || v.page_age,
      }));
    else if (provider === "tavily")
      entries = (body.results || []).map((v) => ({
        ...v,
        summary: v.content,
        publishedAt: v.published_date,
      }));
    else if (provider === "exa")
      entries = (body.results || []).map((v) => ({
        ...v,
        summary: (v.highlights || []).join(" "),
        publishedAt: v.publishedDate,
      }));
    else if (provider === "cisa")
      entries = [...(body.vulnerabilities || [])]
        .sort((a, b) => String(b.dateAdded).localeCompare(String(a.dateAdded)))
        .slice(0, 12)
        .map((v) => ({
          title: `${v.cveID} · ${v.vulnerabilityName}`,
          summary: `${v.vendorProject} · ${v.product}. ${v.shortDescription}`,
          publishedAt: v.dateAdded,
          url: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
        }));
    else if (Array.isArray(body))
      entries = body.map((v) => ({
        title: `${definition.repo} · ${v.name || v.tag_name}`,
        summary: v.body,
        publishedAt: v.published_at,
        url: v.html_url,
      }));
    else throw new SourceError("INVALID_RESPONSE");
  }
  return {
    provider,
    label: definition.label,
    query: definition.search ? query.trim() : "",
    retrievedAt: new Date().toISOString(),
    entries: rows(entries),
  };
}
