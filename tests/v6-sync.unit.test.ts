import { afterEach, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
import { LocalRepository, db } from "../src/data/db";
import { DeviceSynchronizer } from "../src/features/sync";
import { CloudRepository } from "../src/features/cloud";
import { readDiagnostics, recordDiagnostic } from "../src/features/diagnostics";
const session = {
  access_token: "synthetic-token",
  user: { id: "synthetic-owner" },
} as Session;
afterEach(async () => {
  vi.unstubAllGlobals();
  await db.delete();
});
it("pagination client récupère aussi les archives au-delà des 100 premières", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          snapshots: [{ id: "a", createdAt: "2026-10-14T10:00:00Z", size: 1 }],
          nextOffset: 100,
        }),
      ),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          snapshots: [{ id: "b", createdAt: "2026-10-13T10:00:00Z", size: 1 }],
          nextOffset: null,
        }),
      ),
    );
  vi.stubGlobal("fetch", fetch);
  expect((await new CloudRepository().list(session)).map((s) => s.id)).toEqual([
    "a",
    "b",
  ]);
  expect(fetch.mock.calls[1][0]).toBe("/api/backup?offset=100");
});
it("pagination cyclique est refusée plutôt que de certifier un inventaire tronqué", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ snapshots: [], nextOffset: 0 })),
      ),
  );
  await expect(new CloudRepository().list(session)).rejects.toThrow(
    "Pagination cloud invalide",
  );
});
it("reprise de 21 archives en lots bornés : aucun téléchargement répété et aucun faux succès", async () => {
  const repository = new LocalRepository(`backfill-${crypto.randomUUID()}`);
  const snapshots = Array.from({ length: 21 }, () => ({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    size: 1,
  }));
  const read = vi.fn(async () => ({
    editions: [],
    originals: [],
    states: [],
    notes: [],
  }));
  const remote = {
    list: async () => snapshots,
    read,
    backup: vi.fn(async () => crypto.randomUUID()),
  };
  try {
    await expect(
      new DeviceSynchronizer(repository, remote).sync(session),
    ).rejects.toThrow("11 archive(s) restantes");
    expect(
      await repository.preferences.get("last-sync-synthetic-owner"),
    ).toBeUndefined();
    await expect(
      new DeviceSynchronizer(repository, remote).sync(session),
    ).rejects.toThrow("1 archive(s) restantes");
    await new DeviceSynchronizer(repository, remote).sync(session);
    expect(read).toHaveBeenCalledTimes(21);
    expect(remote.backup).not.toHaveBeenCalled();
    expect(
      await repository.preferences.get("last-sync-synthetic-owner"),
    ).toBeDefined();
  } finally {
    await repository.delete();
  }
});
it("journal technique local expurgé, borné et absent des snapshots de données", async () => {
  await db.open();
  await recordDiagnostic("import-failed");
  const value = (await db.preferences.get("local-diagnostics"))?.value;
  expect(readDiagnostics(value)).toHaveLength(1);
  expect(Object.keys(readDiagnostics(value)[0]).sort()).toEqual([
    "code",
    "createdAt",
    "id",
  ]);
  expect(JSON.stringify(await db.snapshot())).not.toContain("import-failed");
  expect(readDiagnostics('{"private":"secret"}')).toEqual([]);
});

it("ancien serveur limité à 100 signale le besoin de mise à jour", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            snapshots: Array.from({ length: 100 }, (_, i) => ({
              id: String(i),
              createdAt: "2026-10-14T10:00:00Z",
              size: 1,
            })),
          }),
        ),
      ),
  );
  await expect(new CloudRepository().list(session)).rejects.toThrow(
    "Serveur cloud ancien",
  );
});
