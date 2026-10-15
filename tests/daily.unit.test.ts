import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
import { LocalRepository } from "../src/data/db";
import {
  currentEditions,
  dayKeyOf,
  journalFilenameDate,
  resolveDay,
} from "../src/data/day";
import { inspectHTML, commitImport } from "../src/features/import";
import {
  exportBackup,
  inspectBackup,
  restoreBackup,
  type BackupData,
} from "../src/features/backup";
import { DeviceSynchronizer } from "../src/features/sync";
import { dailyFile } from "./helpers/daily";
let db: LocalRepository;
beforeEach(() => {
  db = new LocalRepository(`daily-${crypto.randomUUID()}`);
});
afterEach(async () => {
  vi.restoreAllMocks();
  await db.delete();
});
async function add(
  hour = "08",
  date = "2026-10-15",
  extra: Record<string, unknown> = {},
  repository = db,
) {
  const file = dailyFile(hour, date, extra),
    bytes = new TextEncoder().encode(file.html);
  const edition = await inspectHTML(file.name, bytes);
  const result = await commitImport(repository, edition, bytes, "keep");
  return (await repository.editions.get(result.id))!;
}
it("quatre cumuls sans schéma V6 : un seul HTML actif, quatrième édition et originaux/annotations intacts", async () => {
  const first = await add();
  await db.reading(first.id, "edition", { favorite: true, read: true });
  const note = {
    id: crypto.randomUUID(),
    editionId: first.id,
    body: "Note privée synthétique",
    kind: "note" as const,
    createdAt: first.importedAt,
    updatedAt: first.updatedAt,
  };
  await db.notes.add(note);
  for (const hour of ["12", "16", "21"]) await add(hour);
  const snapshot = await db.snapshot();
  expect(currentEditions(snapshot.editions)).toHaveLength(1);
  expect(currentEditions(snapshot.editions)[0].articles).toHaveLength(4);
  expect(resolveDay(snapshot.editions).current?.filename).toContain("21H");
  expect(snapshot.originals).toHaveLength(4);
  expect(snapshot.notes).toEqual([note]);
  expect(snapshot.states[0]).toMatchObject({
    editionId: first.id,
    favorite: true,
    read: true,
  });
  for (const edition of snapshot.editions) {
    const hour = edition.filename.match(/EDITION_(\d{2})H/)![1];
    expect(
      new TextDecoder().decode(
        snapshot.originals.find((o) => o.id === edition.id)!.bytes,
      ),
    ).toBe(dailyFile(hour).html);
  }
  await add("21");
  expect(await db.editions.count()).toBe(4);
});
it("21→08→16→12 : un ancien fichier reçu tard ne réactive pas une édition dépassée", async () => {
  for (const hour of ["21", "08", "16", "12", "22", "23"]) await add(hour);
  const rows = await db.editions.toArray();
  expect(currentEditions(rows)).toHaveLength(1);
  expect(resolveDay(rows).current?.filename).toContain("23H");
  expect(resolveDay([...rows].reverse()).current?.id).toBe(
    resolveDay(rows).current?.id,
  );
});
it("les anciens records indépendants/quarantinés sont regroupés sans réécrire leurs UUID ou notes", async () => {
  for (const hour of ["08", "12", "16", "21"]) {
    const file = dailyFile(hour),
      bytes = new TextEncoder().encode(file.html);
    const edition = await inspectHTML(file.name, bytes);
    await db.saveEdition(
      { ...edition, dayKey: undefined, independent: true },
      bytes,
    );
  }
  const before = await db.snapshot();
  expect(currentEditions(before.editions)).toHaveLength(1);
  expect(resolveDay(before.editions).current?.filename).toContain("21H");
  expect(await db.snapshot()).toEqual(before);
});
it("date manquante : seul un nom Journal360 explicite et calendaire est utilisé, jamais la date du téléchargement", async () => {
  const next = await add("12", "2026-10-15", { editionDate: undefined });
  expect(next.date).toBe("2026-10-15");
  expect(dayKeyOf(next)).toBe("journal360-day-2026-10-15");
  for (const filename of [
    "notes-2026-10-15.html",
    "LE_JOURNAL_360_2026-02-30_EDITION_08H.html",
    "journal.html",
  ])
    expect(journalFilenameDate(filename)).toBeUndefined();
  const bytes = new TextEncoder().encode(
    "<html><body>Fichier sans date</body></html>",
  );
  const a = await inspectHTML("a.html", bytes),
    b = await inspectHTML("b.html", bytes);
  expect(currentEditions([a, b])).toHaveLength(2);
});
it("un nouveau jour crée une seconde carte et ne remplace jamais la veille", async () => {
  await add("08");
  await add("21");
  await add("08", "2026-10-16");
  expect(currentEditions(await db.editions.toArray())).toHaveLength(2);
});
it("heure inconnue : révision puis date d’import conservée, départage stable entre appareils", async () => {
  const file = dailyFile(),
    bytes = new TextEncoder().encode(file.html);
  const e = await inspectHTML("edition.html", bytes);
  const a = {
    ...e,
    id: crypto.randomUUID(),
    importedAt: "2026-10-15T08:00:00.000Z",
  };
  const b = {
    ...e,
    id: crypto.randomUUID(),
    importedAt: "2026-10-15T12:00:00.000Z",
  };
  expect(resolveDay([b, a]).current?.id).toBe(b.id);
  expect(resolveDay([a, b]).current?.id).toBe(b.id);
});
it("échec quota pendant un remplacement : ancienne édition, notes et original disponibles", async () => {
  const first = await add();
  const before = await db.snapshot();
  vi.spyOn(db.originals, "add").mockRejectedValueOnce(
    new DOMException("Quota", "QuotaExceededError"),
  );
  await expect(add("12")).rejects.toThrow("Quota");
  expect(await db.snapshot()).toEqual(before);
  expect(currentEditions(await db.editions.toArray())[0].id).toBe(first.id);
});
it("restaurer une archive ancienne ne réactive pas ses HTML et le ZIP garde les annotations", async () => {
  await add();
  const early = await inspectBackup(
    new Uint8Array(await (await exportBackup(db)).arrayBuffer()),
  );
  for (const hour of ["12", "16", "21"]) await add(hour);
  await restoreBackup(db, early);
  expect(currentEditions(await db.editions.toArray())[0].filename).toContain(
    "21H",
  );
  const fresh = new LocalRepository(`daily-restore-${crypto.randomUUID()}`);
  try {
    await restoreBackup(
      fresh,
      await inspectBackup(
        new Uint8Array(await (await exportBackup(db)).arrayBuffer()),
      ),
    );
    expect(await fresh.snapshot()).toEqual(await db.snapshot());
    expect(currentEditions(await fresh.editions.toArray())).toHaveLength(1);
  } finally {
    await fresh.delete();
  }
});
it("PC/téléphone hors ligne puis synchro : une édition21h sur les deux, sans résurrection après seconde synchro", async () => {
  const phone = new LocalRepository(`daily-phone-${crypto.randomUUID()}`);
  const files = new Map<string, BackupData>();
  const session = { user: { id: "synthetic-daily-owner" } } as Session;
  const remote = {
    list: async () =>
      [...files.keys()]
        .reverse()
        .map((id) => ({ id, createdAt: "2026-10-15T22:00:00Z", size: 1 })),
    read: async (_s: Session, id: string) => structuredClone(files.get(id)!),
    backup: async (_s: Session, _db: LocalRepository, data: BackupData) => {
      const id = crypto.randomUUID();
      files.set(id, structuredClone(data));
      return id;
    },
  };
  try {
    const first = await add("08");
    await db.reading(first.id, "edition", { favorite: true });
    await restoreBackup(phone, await db.snapshot(), "sync");
    await add("12");
    await add("16");
    await add("21", "2026-10-15", {}, phone);
    const pcSync = new DeviceSynchronizer(db, remote),
      phoneSync = new DeviceSynchronizer(phone, remote);
    for (let i = 0; i < 2; i++) {
      await pcSync.sync(session);
      await phoneSync.sync(session);
    }
    for (const repository of [db, phone]) {
      const rows = await repository.editions.toArray();
      expect(rows).toHaveLength(4);
      expect(currentEditions(rows)).toHaveLength(1);
      expect(currentEditions(rows)[0].filename).toContain("21H");
      expect(
        (await repository.states.get(`${first.id}:edition`))?.favorite,
      ).toBe(true);
    }
  } finally {
    await phone.delete();
  }
});

it.each([99, "6.2"])(
  "un schéma inconnu %s ne bloque pas le remplacement par date et ne certifie pas le cumul",
  async (schemaVersion) => {
    await add("08", "2026-10-15", { schemaVersion });
    const last = await add("12", "2026-10-15", { schemaVersion });
    expect(currentEditions(await db.editions.toArray())).toHaveLength(1);
    expect(currentEditions(await db.editions.toArray())[0].id).toBe(last.id);
    expect(last.schemaVersion).toBeUndefined();
    expect(last.warnings.join(" ")).toContain("version inconnue");
    expect(resolveDay(await db.editions.toArray()).status).not.toBe("COMPLETE");
  },
);
