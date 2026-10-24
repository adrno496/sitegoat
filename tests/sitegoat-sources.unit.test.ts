// @vitest-environment node
import { expect, it, vi } from "vitest";
import { Readable } from "node:stream";
const getUser = vi.hoisted(() => vi.fn());
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ auth: { getUser } }),
}));
// @ts-expect-error Server entry is JavaScript, independently checked by Node.
import { createSourcesHandler } from "../api/sources.mjs";
// @ts-expect-error Shared server parser is JavaScript.
import * as providers from "../server/source-providers.mjs";
const { fetchSource, publicLink, publicQuery } = providers;
async function call(
  handler: ReturnType<typeof createSourcesHandler>,
  body: unknown = {},
  options: { method?: string; origin?: string; token?: string } = {},
) {
  const req = Object.assign(Readable.from([JSON.stringify(body)]), {
    method: options.method || "POST",
    headers: {
      host: "sitegoat.test",
      origin: options.origin ?? "https://sitegoat.test",
      authorization: options.token,
      "x-forwarded-for": "192.0.2.1",
    },
  });
  let status = 0,
    text = "";
  const res = {
    setHeader: vi.fn(),
    get statusCode() {
      return status;
    },
    set statusCode(s: number) {
      status = s;
    },
    end(value: string) {
      text = value;
    },
  };
  await handler(req, res);
  return { status, body: JSON.parse(text), text };
}
const env = {
  BRAVE_API_KEY: "fixture-brave-server-only",
  TAVILY_API_KEY: "fixture-tavily-server-only",
  EXA_API_KEY: "fixture-exa-server-only",
};
const result = {
  title: "Titre public",
  url: "https://example.com/news",
  description: "Extrait",
  content: "Extrait",
  highlights: ["Extrait"],
  publishedDate: "2026-10-24T10:00Z",
};
it("Sources : authentification, origine et schéma avant tout appel payant", async () => {
  const request = vi.fn();
  const handler = createSourcesHandler({
    env,
    request,
    verifySession: async () => null,
  });
  expect(
    (await call(handler, { provider: "brave", query: "actualité robotique" }))
      .status,
  ).toBe(401);
  expect(
    (
      await call(
        handler,
        { provider: "brave", query: "actualité robotique" },
        { token: "Bearer invalid" },
      )
    ).status,
  ).toBe(401);
  expect(
    (await call(handler, { provider: "ecb" }, { origin: "https://other.test" }))
      .status,
  ).toBe(403);
  expect(
    (await call(handler, { provider: "https://127.0.0.1/admin" })).status,
  ).toBe(400);
  expect(
    (await call(handler, { provider: "ecb", html: "PRIVATE HTML" })).status,
  ).toBe(400);
  expect(request).not.toHaveBeenCalled();
});
it("Sources : secrets et données privées ne deviennent jamais une recherche", async () => {
  const request = vi.fn();
  const handler = createSourcesHandler({
    env,
    request,
    verifySession: async () => "user",
  });
  for (const query of [
    env.BRAVE_API_KEY,
    "contact@example.com",
    "token=secret-value",
    "/Users/owner/private.html",
  ])
    expect(
      (
        await call(
          handler,
          { provider: "tavily", query },
          { token: "Bearer valid" },
        )
      ).status,
    ).toBe(400);
  expect(request).not.toHaveBeenCalled();
  expect(publicQuery("robotique sources officielles")).toBe(true);
});
it("Sources : aucune clé dans le catalogue, refus fournisseur sans corps d’erreur", async () => {
  const request = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ error: env.BRAVE_API_KEY }), {
      status: 403,
    }),
  );
  const handler = createSourcesHandler({
    env,
    request,
    verifySession: async () => "user",
  });
  const catalog = await call(handler, {}, { method: "GET" });
  expect(catalog.status).toBe(200);
  expect(catalog.body.sources).toHaveLength(9);
  const response = await call(
    handler,
    { provider: "brave", query: "robotique actualités" },
    { token: "Bearer valid" },
  );
  expect(response.status).toBe(502);
  expect(response.body.code).toBe("CREDENTIALS_REFUSED");
  for (const key of Object.values(env)) {
    expect(catalog.text).not.toContain(key);
    expect(response.text).not.toContain(key);
  }
  expect(request.mock.calls[0][0]).not.toContain(env.BRAVE_API_KEY);
  expect(request.mock.calls[0][1].headers["X-Subscription-Token"]).toBe(
    env.BRAVE_API_KEY,
  );
});
it.each([
  "brave",
  "tavily",
  "exa",
  "ecb",
  "cisa",
  "vscode",
  "node",
  "react",
  "ollama",
])(
  "Sources : %s, réponse bornée et projection publique exacte",
  async (provider) => {
    const data =
      provider === "cisa"
        ? {
            vulnerabilities: [
              {
                cveID: "CVE-2026-1234",
                vulnerabilityName: "Test public",
                vendorProject: "Vendor",
                product: "Product",
                shortDescription: "Description",
                dateAdded: "2026-10-24",
              },
            ],
          }
        : ["vscode", "node", "react", "ollama"].includes(provider)
          ? [
              {
                name: "v1",
                body: "Release",
                published_at: "2026-10-24T10:00Z",
                html_url: "https://github.com/owner/repo/releases/tag/v1",
              },
            ]
          : { results: [result] };
    const text =
      provider === "ecb"
        ? `<Cube time='2026-10-23'><Cube currency='USD' rate='1.1'/></Cube>`
        : JSON.stringify(data);
    const request = vi.fn().mockResolvedValue(new Response(text));
    const value = await fetchSource(
      provider,
      "robotique actualités",
      env,
      request,
    );
    expect(value.entries).toHaveLength(1);
    expect(value.entries[0].title).toBeTruthy();
    expect(publicLink(value.entries[0].url)).toBeTruthy();
    expect(request.mock.calls[0][1].redirect).toBe("error");
    if (provider === "tavily") {
      const body = JSON.parse(request.mock.calls[0][1].body);
      expect(body.include_answer).toBe(false);
      expect(body.include_raw_content).toBe(false);
      expect(body.max_results).toBe(5);
    }
  },
);
it("Sources : liens privés/reflets de clés exclus et texte non exécutable", async () => {
  const request = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        results: [
          { ...result, title: `<b>Public</b> ${env.BRAVE_API_KEY}` },
          { ...result, url: `https://example.com/${env.BRAVE_API_KEY}` },
          { ...result, url: "javascript:alert(1)" },
          { ...result, url: "https://127.0.0.1/admin" },
        ],
      }),
    ),
  );
  const value = await fetchSource("brave", "robotique", env, request);
  expect(value.entries).toHaveLength(1);
  expect(value.entries[0].title).toBe("Public [masqué]");
  for (const url of [
    "http://example.com",
    "https://localhost/a",
    "https://192.168.1.2",
    "https://user:pass@example.com",
    "https://example.com/?api_key=secret",
    "https://[::1]/",
  ])
    expect(publicLink(url)).toBeNull();
});
it("Sources : cache borné, autorisation revérifiée et cadence payante", async () => {
  const request = vi
    .fn()
    .mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ results: [result] }))),
    );
  const verifySession = vi.fn().mockResolvedValue("owner"),
    handler = createSourcesHandler({ env, request, verifySession });
  const options = { token: "Bearer valid" };
  expect(
    (await call(handler, { provider: "brave", query: "robotique" }, options))
      .status,
  ).toBe(200);
  expect(
    (await call(handler, { provider: "brave", query: "robotique" }, options))
      .body.cached,
  ).toBe(true);
  expect(
    (await call(handler, { provider: "brave", query: "robotique" })).status,
  ).toBe(401);
  for (const query of ["logiciels", "économie"])
    expect(
      (await call(handler, { provider: "brave", query }, options)).status,
    ).toBe(200);
  expect(
    (
      await call(
        handler,
        { provider: "brave", query: "cybersécurité" },
        options,
      )
    ).status,
  ).toBe(429);
  expect(request).toHaveBeenCalledTimes(3);
  expect(verifySession).toHaveBeenCalledTimes(5);
});
it("Sources : limite de réponse, quota et clé absente restent des échecs explicites", async () => {
  await expect(
    fetchSource("brave", "robotique", {}, vi.fn()),
  ).rejects.toMatchObject({ code: "NOT_CONFIGURED" });
  await expect(
    fetchSource(
      "ecb",
      "",
      {},
      async () =>
        new Response("x", { headers: { "content-length": "5000000" } }),
    ),
  ).rejects.toMatchObject({ code: "RESPONSE_TOO_LARGE" });
  await expect(
    fetchSource("ecb", "", {}, async () => new Response("no", { status: 429 })),
  ).rejects.toMatchObject({ code: "RATE_LIMITED" });
  await expect(
    fetchSource("ecb", "", {}, async () => new Response("invalid XML")),
  ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
});

it("Sources : une session valide d’un autre compte ne donne jamais accès aux clés", async () => {
  const request = vi
    .fn()
    .mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ results: [result] }))),
    );
  const handler = createSourcesHandler({
    env: {
      ...env,
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SECRET_KEY: "fixture-server",
      JOURNAL360_ACCOUNT_EMAIL: "OWNER@example.org",
    },
    request,
  });
  getUser.mockResolvedValue({
    data: { user: { id: "other", email: "other@example.org" } },
    error: null,
  });
  expect(
    (
      await call(
        handler,
        { provider: "brave", query: "robotique" },
        { token: "Bearer valid-other" },
      )
    ).status,
  ).toBe(401);
  expect(request).not.toHaveBeenCalled();
  getUser.mockResolvedValue({
    data: { user: { id: "owner", email: "owner@example.org" } },
    error: null,
  });
  expect(
    (
      await call(
        handler,
        { provider: "brave", query: "robotique" },
        { token: "Bearer valid-owner" },
      )
    ).status,
  ).toBe(200);
  getUser.mockResolvedValue({
    data: { user: { id: "other", email: "other@example.org" } },
    error: null,
  });
  expect(
    (
      await call(
        handler,
        { provider: "brave", query: "robotique" },
        { token: "Bearer valid-other" },
      )
    ).status,
  ).toBe(401);
  expect(request).toHaveBeenCalledTimes(1);
});
