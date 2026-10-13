// @vitest-environment node
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { Readable } from "node:stream";
const signIn = vi.hoisted(() => vi.fn());
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ auth: { signInWithPassword: signIn } }),
}));
// @ts-expect-error La fonction Vercel est un module JavaScript serveur.
import handler, { accessPassword } from "../api/access.mjs";
beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SECRET_KEY", "test-server-only-value");
  vi.stubEnv("JOURNAL360_ACCOUNT_EMAIL", "private@example.com");
  signIn.mockReset();
});
afterEach(() => vi.unstubAllEnvs());
async function request(
  body: string,
  options: { method?: string; origin?: string; ip?: string } = {},
) {
  const req = Object.assign(Readable.from([body]), {
    method: options.method || "POST",
    headers: {
      host: "localhost:4173",
      origin: options.origin,
      "x-forwarded-for": options.ip || crypto.randomUUID(),
    },
  });
  let text = "";
  const headers: Record<string, string> = {};
  const res = {
    statusCode: 200,
    setHeader: (key: string, value: string) => {
      headers[key] = value;
    },
    end: (body: string) => {
      text = body;
    },
  };
  await handler(req, res);
  return { status: res.statusCode, body: JSON.parse(text), headers };
}
it("refuse origine étrangère, méthode et corps excessif avant Auth", async () => {
  expect(
    (await request("{}", { origin: "https://foreign.example" })).status,
  ).toBe(403);
  expect((await request("{}", { method: "GET" })).status).toBe(405);
  expect((await request("x".repeat(257))).status).toBe(413);
  expect((await request("invalid")).status).toBe(400);
  expect(signIn).not.toHaveBeenCalled();
});
it("utilise une session réelle et ne transmet jamais le mot de passe dérivé", async () => {
  signIn.mockResolvedValue({
    data: {
      session: {
        access_token: "access-test",
        refresh_token: "refresh-test",
        extra: "secret",
      },
    },
    error: null,
  });
  const result = await request(JSON.stringify({ code: "synthetic-code" }));
  expect(result.status).toBe(200);
  expect(result.body).toEqual({
    access_token: "access-test",
    refresh_token: "refresh-test",
  });
  expect(result.headers["Cache-Control"]).toBe("no-store");
  expect(signIn.mock.calls[0][0].password).toBe(
    accessPassword("synthetic-code", "test-server-only-value"),
  );
  expect(signIn.mock.calls[0][0].password).not.toBe("synthetic-code");
  expect(accessPassword("synthetic-code", "other-secret")).not.toBe(
    signIn.mock.calls[0][0].password,
  );
});
it("refuse le mauvais code sans détails du fournisseur et limite les tentatives", async () => {
  signIn.mockResolvedValue({
    data: { session: null },
    error: { status: 400, message: "internal secret" },
  });
  const ip = crypto.randomUUID();
  for (let i = 0; i < 5; i++) {
    const result = await request(JSON.stringify({ code: "wrong-code" }), {
      ip,
    });
    expect(result.status).toBe(401);
    expect(result.body.error).toBe("Code d’accès incorrect.");
  }
  expect(
    (await request(JSON.stringify({ code: "wrong-code" }), { ip })).status,
  ).toBe(429);
  expect(signIn).toHaveBeenCalledTimes(5);
});
