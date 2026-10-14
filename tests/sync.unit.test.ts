import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
import { LocalRepository } from "../src/data/db";
import { inspectHTML } from "../src/features/import";
import { restoreBackup, type BackupData } from "../src/features/backup";
import { DeviceSynchronizer, fingerprint } from "../src/features/sync";
import type { Snapshot } from "../src/features/cloud";

let pc: LocalRepository;
let phone: LocalRepository;
const session = { user: { id: "test-owner" } } as Session;
beforeEach(() => {
  pc = new LocalRepository(`pc-${crypto.randomUUID()}`);
  phone = new LocalRepository(`phone-${crypto.randomUUID()}`);
});
afterEach(async () => {
  await pc.delete();
  await phone.delete();
});
async function edition(repository: LocalRepository, title = "Journal test") {
  const bytes = new TextEncoder().encode(
    `<html><head><title>${title}</title></head><body><h1>${title}</h1></body></html>`,
  );
  const e = await inspectHTML("journal.html", bytes);
  await repository.saveEdition(e, bytes);
  return e;
}
function server() {
  const files = new Map<string, BackupData>();
  const list = vi.fn(async (): Promise<Snapshot[]> =>
    [...files.keys()]
      .reverse()
      .map((id) => ({ id, createdAt: new Date().toISOString(), size: 100 })),
  );
  const read = vi.fn(async (_session: Session, id: string) =>
    structuredClone(files.get(id)!),
  );
  const backup = vi.fn(
    async (
      _session: Session,
      _repository: LocalRepository,
      data: BackupData,
    ) => {
      const id = crypto.randomUUID();
      files.set(id, structuredClone(data));
      return id;
    },
  );
  return { files, list, read, backup };
}

it("PC → téléphone automatique, aucun renvoi sans changement, favoris retirés et archivage propagés", async () => {
  const cloud = server();
  const a = new DeviceSynchronizer(pc, cloud);
  const b = new DeviceSynchronizer(phone, cloud);
  const e = await edition(pc);
  await pc.reading(e.id, "edition", { favorite: true });
  await a.sync(session);
  await b.sync(session);
  expect(await fingerprint(await phone.snapshot())).toBe(
    await fingerprint(await pc.snapshot()),
  );
  await a.sync(session);
  await b.sync(session);
  expect(cloud.backup).toHaveBeenCalledTimes(1);
  await phone.states.update(`${e.id}:edition`, {
    favorite: false,
    updatedAt: "2090-01-01T00:00:00.000Z",
  });
  await phone.editions.update(e.id, {
    archived: true,
    updatedAt: "2090-01-01T00:00:00.000Z",
  });
  await b.sync(session);
  await a.sync(session);
  expect((await pc.states.get(`${e.id}:edition`))?.favorite).toBe(false);
  expect((await pc.editions.get(e.id))?.archived).toBe(true);
  expect(cloud.backup).toHaveBeenCalledTimes(2);
});

it("deux branches concurrentes et deux imports identiques gardent leurs identifiants, puis convergent", async () => {
  const cloud = server();
  const a = new DeviceSynchronizer(pc, cloud);
  const b = new DeviceSynchronizer(phone, cloud);
  await edition(pc);
  await edition(phone);
  await cloud.backup(session, pc, await pc.snapshot());
  await cloud.backup(session, phone, await phone.snapshot());
  await a.sync(session);
  await b.sync(session);
  await a.sync(session);
  expect(await pc.editions.count()).toBe(2);
  expect(await phone.editions.count()).toBe(2);
  expect(await fingerprint(await pc.snapshot())).toBe(
    await fingerprint(await phone.snapshot()),
  );
  const count = cloud.files.size;
  await a.sync(session);
  await b.sync(session);
  expect(cloud.files.size).toBe(count);
});

it("échec réseau : aucune fausse confirmation, reprise après réouverture", async () => {
  const cloud = server();
  await edition(pc);
  cloud.backup.mockRejectedValueOnce(new Error("Hors ligne"));
  await expect(new DeviceSynchronizer(pc, cloud).sync(session)).rejects.toThrow(
    "Hors ligne",
  );
  expect(
    await pc.preferences.get(`sync-baseline-${session.user.id}`),
  ).toBeUndefined();
  expect(await pc.editions.count()).toBe(1);
  await new DeviceSynchronizer(pc, cloud).sync(session);
  expect(cloud.files.size).toBe(1);
  expect(
    await pc.preferences.get(`last-sync-${session.user.id}`),
  ).toBeDefined();
});

it("modification pendant un transfert : envoyée au passage suivant ; transferts simultanés sérialisés", async () => {
  const cloud = server();
  const e = await edition(pc);
  const original = cloud.backup.getMockImplementation()!;
  cloud.backup.mockImplementationOnce(async (...args) => {
    await pc.reading(e.id, "edition", { favorite: true });
    return original(...args);
  });
  const sync = new DeviceSynchronizer(pc, cloud);
  await Promise.all([sync.sync(session), sync.sync(session)]);
  expect(cloud.backup).toHaveBeenCalledTimes(1);
  await sync.sync(session);
  expect(cloud.backup).toHaveBeenCalledTimes(2);
  await new DeviceSynchronizer(phone, cloud).sync(session);
  expect((await phone.states.get(`${e.id}:edition`))?.favorite).toBe(true);
});

it("notes en conflit conservées sans duplication lors des fusions répétées", async () => {
  const e = await edition(pc);
  const note = {
    id: crypto.randomUUID(),
    editionId: e.id,
    kind: "note" as const,
    body: "PC",
    createdAt: "2026-10-14T10:00:00.000Z",
    updatedAt: "2026-10-14T10:00:00.000Z",
  };
  await pc.notes.add(note);
  await restoreBackup(phone, await pc.snapshot(), "sync");
  await phone.notes.update(note.id, {
    body: "Téléphone",
    updatedAt: "2026-10-14T11:00:00.000Z",
  });
  const oldPC = await pc.snapshot();
  const newerPhone = await phone.snapshot();
  await restoreBackup(pc, newerPhone, "sync");
  await restoreBackup(phone, oldPC, "sync");
  await restoreBackup(pc, newerPhone, "sync");
  await restoreBackup(phone, await pc.snapshot(), "sync");
  expect(await pc.notes.count()).toBe(2);
  expect(await phone.notes.count()).toBe(2);
  expect(await fingerprint(await pc.snapshot())).toBe(
    await fingerprint(await phone.snapshot()),
  );
});
