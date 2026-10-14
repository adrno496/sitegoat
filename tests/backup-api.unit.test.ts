// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Readable } from "node:stream";
const storageList = vi.hoisted(() => vi.fn());
const getUser = vi.hoisted(() => vi.fn());
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: { getUser },
    storage: { from: () => ({ list: storageList }) },
  }),
}));
// @ts-expect-error Server entry is JavaScript.
import handler from "../api/backup.mjs";
beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SECRET_KEY", "synthetic-server-key");
  storageList.mockReset();
  getUser.mockReset();
  getUser.mockResolvedValue({
    data: { user: { id: crypto.randomUUID() } },
    error: null,
  });
});
afterEach(() => vi.unstubAllEnvs());
async function request(url: string, authorization = "Bearer synthetic-token") {
  const req = Object.assign(Readable.from([]), {
    method: "GET",
    url,
    headers: { authorization },
  });
  let raw = "";
  const res = {
    statusCode: 200,
    setHeader: vi.fn(),
    end: (text: string) => {
      raw = text;
    },
  };
  await handler(req, res);
  return { status: res.statusCode, body: JSON.parse(raw) };
}
it("pagination reste authentifiée et limitée au préfixe UID vérifié", async () => {
  const uid = crypto.randomUUID();
  getUser.mockResolvedValue({ data: { user: { id: uid } }, error: null });
  storageList.mockResolvedValue({ data: [], error: null });
  const response = await request("/api/backup?offset=100");
  expect(response.status).toBe(200);
  expect(response.body.nextOffset).toBeNull();
  expect(storageList).toHaveBeenCalledWith(
    uid,
    expect.objectContaining({ offset: 100, limit: 100 }),
  );
  expect((await request("/api/backup?offset=100", "")).status).toBe(401);
});
it.each(["-1", "NaN", "100001", "1.5", "../secret"])(
  "offset hostile %s refusé",
  async (value) => {
    expect((await request(`/api/backup?offset=${value}`)).status).toBe(400);
    expect(storageList).not.toHaveBeenCalled();
  },
);
it("100 objets annoncent la page suivante sans modification de bucket ou RLS", async () => {
  storageList.mockResolvedValue({
    data: Array.from({ length: 100 }, () => ({
      name: `${crypto.randomUUID()}.zip`,
      created_at: "2026-10-14T00:00:00Z",
      metadata: { size: 5 },
    })),
    error: null,
  });
  const result = await request("/api/backup");
  expect(result.body.snapshots).toHaveLength(100);
  expect(result.body.nextOffset).toBe(100);
});
