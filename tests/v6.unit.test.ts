import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Dexie from "dexie";
import JSZip from "jszip";
import type { Session } from "@supabase/supabase-js";
import { LocalRepository } from "../src/data/db";
import { assessVersion, currentEditions, resolveDay } from "../src/data/day";
import { inspectHTML, commitImport } from "../src/features/import";
import {
  exportBackup,
  inspectBackup,
  restoreBackup,
} from "../src/features/backup";
import { DeviceSynchronizer } from "../src/features/sync";
import {
  parseGoogleAiMessage,
  validPublicQuestion,
  GOOGLE_AI_ENTRY,
  readingQuestions,
} from "../src/features/googleAi";
import { validDate, verifiedLabel } from "../src/data/editorial";
import { validateSourceUrl } from "../src/features/sourceUrl";
import { v6Bytes } from "./helpers/v6";
let db: LocalRepository;
beforeEach(() => {
  db = new LocalRepository(`v6-${crypto.randomUUID()}`);
});
afterEach(async () => {
  await db.delete();
});
async function add(revision = 1, extra: Parameters<typeof v6Bytes>[0] = {}) {
  const bytes = v6Bytes({ revision, ...extra });
  const e = await inspectHTML("fixture.html", bytes);
  const result = await commitImport(db, e, bytes, "day");
  return (await db.editions.get(result.id))!;
}
it("V6 conserve ISO avec décalage et distingue ID externe, UUID, révisions locale/externe", async () => {
  const e = await add(3);
  expect(e.dayKey).toBe("journal360-day-2026-10-14");
  expect(e.externalEditionId).toBe(e.dayKey);
  expect(e.externalRevision).toBe(3);
  expect(e.revision).toBe(1);
  expect(e.id).toMatch(/^[a-f0-9-]{36}$/);
  expect(e.familyId).not.toBe(e.dayKey);
  expect(e.sourceVerifiedAt).toBe("2026-10-14T21:00:00+02:00");
  expect(verifiedLabel(e.sourceVerifiedAt!)).toContain("21:00");
});
it("08→16→21 : une journée, trois octets originaux intacts, meilleure version finale", async () => {
  const versions = [await add(1), await add(2), await add(3)];
  expect(new Set(versions.map((v) => v.familyId)).size).toBe(1);
  expect(currentEditions(versions)).toHaveLength(1);
  const day = resolveDay(versions);
  expect(day.current?.externalRevision).toBe(3);
  expect(day.status).toBe("COMPLETE");
  for (const e of versions)
    expect((await db.originals.get(e.id))?.bytes).toEqual(
      v6Bytes({ revision: e.externalRevision }),
    );
});
it("idempotence, notes et favoris conservés ; option indépendante reste possible", async () => {
  const e = await add(1);
  await db.reading(e.id, "edition", { favorite: true });
  await db.notes.add({
    id: crypto.randomUUID(),
    editionId: e.id,
    body: "Note privée",
    kind: "note",
    createdAt: e.importedAt,
    updatedAt: e.importedAt,
  });
  await add(1);
  expect(await db.editions.count()).toBe(1);
  expect(await db.notes.count()).toBe(1);
  expect((await db.states.toArray())[0].favorite).toBe(true);
  const bytes = v6Bytes();
  await commitImport(db, await inspectHTML("copie.html", bytes), bytes, "keep");
  expect(await db.editions.count()).toBe(2);
  expect(currentEditions(await db.editions.toArray())).toHaveLength(2);
  await add(1);
  expect(await db.editions.count()).toBe(2);
});
it("imports concurrents de même hash ne créent pas deux versions", async () => {
  const bytes = v6Bytes();
  await Promise.all(
    [1, 2].map(async () =>
      commitImport(db, await inspectHTML("x.html", bytes), bytes, "day"),
    ),
  );
  expect(await db.editions.count()).toBe(1);
});
it("même révision / hash différent : garde les branches sans détrôner 08 fiable", async () => {
  const first = await add(1);
  await add(2);
  await add(2, { ids: ["a", "different"] });
  const day = resolveDay(await db.editions.toArray());
  expect(day.current?.id).toBe(first.id);
  expect(
    day.versions.filter((v) =>
      v.assessment.issues.some((s) => s.includes("branches")),
    ),
  ).toHaveLength(2);
  expect(await db.originals.count()).toBe(3);
});
it("08→21 avec saut : signalé et ne remplace pas la version fiable", async () => {
  const first = await add(1);
  await add(3);
  const day = resolveDay(await db.editions.toArray());
  expect(day.current?.id).toBe(first.id);
  expect(day.versions[0].assessment.status).toBe("PARTIAL");
});
it("21→16→08 : le rang de téléchargement ne décide pas de la version courante", async () => {
  await add(3);
  await add(2);
  await add(1);
  expect(
    resolveDay(await db.editions.toArray()).current?.externalRevision,
  ).toBe(3);
});
it("J puis J+1 et créneau sans nouvelle : aucun article inventé ni report de la veille", async () => {
  await add(1);
  const next = await add(1, { date: "2026-10-15", ids: [] });
  expect(currentEditions(await db.editions.toArray())).toHaveLength(2);
  expect(next.articles).toEqual([]);
  const late = await add(2, { date: "2026-10-15", ids: [] });
  expect(assessVersion(late, [next]).status).toBe("COMPLETE");
  expect(late.articles).toHaveLength(0);
});
it("correction du même event_id permise, disparition déclarée complète devient PARTIAL", async () => {
  const first = await add(1);
  const second = await add(2);
  expect(assessVersion(second, [first]).corrections).toBe(1);
  const bad = await add(3, { ids: ["c"] });
  const status = assessVersion(bad, [first, second]);
  expect(status.status).toBe("PARTIAL");
  expect(status.removedEvents).toBe(2);
  expect(resolveDay([first, second, bad]).current?.id).toBe(second.id);
});
it("retrait déclaré et PARTIAL restent transparents, sans certification automatique", async () => {
  const first = await add(1);
  const partial = await add(2, {
    ids: ["b"],
    status: "PARTIAL",
    extra: { retiredEventIds: ["event-a"] },
  });
  expect(assessVersion(partial, [first]).issues.join(" ")).toContain(
    "retrait(s) déclaré(s)",
  );
  expect(resolveDay([first, partial]).current?.id).toBe(first.id);
});
it.each(["2026-02-30", "2026-13-01", "2026-00-00", "not-a-date"])(
  "date impossible %s : pas de regroupement aveugle",
  async (date) => {
    const e = await inspectHTML("x.html", v6Bytes({ date }));
    expect(e.date).toBeNull();
    expect(e.dayKey).toBeUndefined();
  },
);
it.each(["2026-03-29", "2026-10-25", "2024-02-29"])(
  "calendrier/DST %s : date éditoriale préservée",
  async (date) => {
    const e = await inspectHTML("x.html", v6Bytes({ date }));
    expect(e.date).toBe(date);
    expect(e.dayKey).toBe(`journal360-day-${date}`);
    expect(validDate(date)).toBe(true);
  },
);
it.each([
  { revision: 0 },
  { revision: Infinity },
  { slotsIncluded: ["08:00", "08:00"] },
  { slotsIncluded: ["23:00"] },
  { schemaVersion: 99 },
  { editionDate: "2026-10-14Tinvalid" },
])(
  "métadonnée invalide : quarantaine de l’index V6, HTML intact %j",
  async (extra) => {
    const bytes = v6Bytes({ extra });
    const e = await inspectHTML("x.html", bytes);
    expect(e.dayKey).toBeUndefined();
    expect(e.articles.length).toBeGreaterThan(0);
    expect(e.warnings.length).toBeGreaterThan(0);
  },
);
it("champs inconnus tolérés ; horodatage invalide et identifiant incohérent signalés", async () => {
  const e = await inspectHTML(
    "x.html",
    v6Bytes({
      extra: {
        future: { anything: true },
        editionId: "autre-jour",
        sourceVerifiedAt: "2026-02-30T21:00:00+02:00",
      },
    }),
  );
  expect(e.dayKey).toBeUndefined();
  expect(e.sourceVerifiedAt).toBeUndefined();
  expect(e.warnings.length).toBeGreaterThan(0);
});
it("2000 articles, doublons d’IDs, URL hostile : limite explicite sans faux article", async () => {
  const item = {
    id: "same",
    event_id: "x",
    title: "Fictif",
    sources: ["javascript:alert(1)", "https://user@evil.example/"],
  };
  const e = await inspectHTML(
    "x.html",
    v6Bytes({ extra: { items: Array.from({ length: 2001 }, () => item) } }),
  );
  expect(e.articles).toHaveLength(1);
  expect(e.articles[0].sources).toEqual([]);
  expect(e.warnings.join(" ")).toContain("2000");
});
it("transaction de lot annulée intégralement si quota après premier fichier", async () => {
  const bytes1 = v6Bytes();
  const bytes2 = v6Bytes({ revision: 2 });
  const a = await inspectHTML("a.html", bytes1);
  const b = await inspectHTML("b.html", bytes2);
  const original = db.originals.add.bind(db.originals);
  let calls = 0;
  vi.spyOn(db.originals, "add").mockImplementation((...args) => {
    if (++calls === 2)
      return Dexie.Promise.reject(
        new DOMException("Quota", "QuotaExceededError"),
      );
    return original(...args);
  });
  await expect(
    db.transaction("rw", [db.editions, db.originals], async () => {
      await commitImport(db, a, bytes1, "day");
      await commitImport(db, b, bytes2, "day");
    }),
  ).rejects.toThrow("Quota");
  expect(await db.editions.count()).toBe(0);
  expect(await db.originals.count()).toBe(0);
});
it("migration v3→v4 sans toucher aux anciennes notes, UUID ou originaux", async () => {
  const name = `migration-v6-${crypto.randomUUID()}`;
  const legacy = new Dexie(name);
  legacy.version(3).stores({
    editions: "id,sha256,date,familyId,importedAt",
    originals: "id",
    states: "id,editionId",
    notes: "id,editionId,updatedAt",
    preferences: "key",
    jobs: "id,status,createdAt,ownerId",
    pending: "id,createdAt",
  });
  const bytes = v6Bytes();
  const e = await inspectHTML("x.html", bytes);
  await legacy.table("editions").add(e);
  await legacy.table("originals").add({ id: e.id, bytes });
  const note = {
    id: crypto.randomUUID(),
    editionId: e.id,
    body: "Note historique",
    kind: "note",
    createdAt: e.importedAt,
    updatedAt: e.updatedAt,
  };
  const state = {
    id: `${e.id}:edition`,
    editionId: e.id,
    articleId: "edition",
    favorite: true,
    read: true,
    openedAt: null,
    updatedAt: e.updatedAt,
  };
  await legacy.table("notes").add(note);
  await legacy.table("states").add(state);
  await legacy.table("preferences").put({ key: "reader-mode", value: "safe" });
  legacy.close();
  const migrated = new LocalRepository(name);
  expect((await migrated.editions.get(e.id))?.id).toBe(e.id);
  expect((await migrated.originals.get(e.id))?.bytes).toEqual(bytes);
  expect(migrated.verno).toBe(4);
  expect(await migrated.notes.get(note.id)).toEqual(note);
  expect(await migrated.states.get(state.id)).toEqual(state);
  expect((await migrated.preferences.get("reader-mode"))?.value).toBe("safe");
  await migrated.delete();
});
it("ZIP format 2 V6 puis restauration sur base vide, ZIP historique 1 toujours accepté", async () => {
  await add(1);
  await add(2);
  await add(3);
  const blob = await exportBackup(db);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const zip = await JSZip.loadAsync(bytes);
  expect(
    JSON.parse(await zip.file("manifest.json")!.async("string")).formatVersion,
  ).toBe(2);
  const fresh = new LocalRepository(`restore-v6-${crypto.randomUUID()}`);
  try {
    await restoreBackup(fresh, await inspectBackup(bytes));
    expect(await fresh.snapshot()).toEqual(await db.snapshot());
    expect(
      resolveDay(await fresh.editions.toArray()).current?.externalRevision,
    ).toBe(3);
  } finally {
    await fresh.delete();
  }
});
it("identités identiques entre deux appareils ; branches distinctes conservées au retour sync simulé", async () => {
  const phone = new LocalRepository(`phone-v6-${crypto.randomUUID()}`);
  const files = new Map<
    string,
    Awaited<ReturnType<LocalRepository["snapshot"]>>
  >();
  const session = { user: { id: "synthetic-owner" } } as Session;
  const remote = {
    list: async () =>
      [...files.keys()]
        .reverse()
        .map((id) => ({ id, createdAt: new Date().toISOString(), size: 1 })),
    read: async (_s: Session, id: string) => structuredClone(files.get(id)!),
    backup: async (
      _s: Session,
      _db: LocalRepository,
      data: Awaited<ReturnType<LocalRepository["snapshot"]>>,
    ) => {
      const id = crypto.randomUUID();
      files.set(id, structuredClone(data));
      return id;
    },
  };
  try {
    const first = await add(1);
    await restoreBackup(phone, await db.snapshot(), "sync");
    await add(2);
    const bytes = v6Bytes({ revision: 2, ids: ["a", "phone"] });
    await commitImport(
      phone,
      await inspectHTML("phone.html", bytes),
      bytes,
      "day",
    );
    const a = new DeviceSynchronizer(db, remote);
    const b = new DeviceSynchronizer(phone, remote);
    await a.sync(session);
    await b.sync(session);
    await a.sync(session);
    expect(await db.editions.count()).toBe(3);
    expect(await phone.editions.count()).toBe(3);
    expect(resolveDay(await db.editions.toArray()).current?.id).toBe(first.id);
  } finally {
    await phone.delete();
  }
});
it("protocole question v2 fermé, v1 intact et entrée officielle exacte uniquement", () => {
  expect(
    parseGoogleAiMessage({
      type: "journal360:google-ai:question-request",
      version: 2,
      question: "Question publique",
    }),
  ).toMatchObject({
    type: "open",
    destination: {
      url: GOOGLE_AI_ENTRY,
      query: "Question publique",
      entryOnly: true,
    },
  });
  for (const value of [null, " ", "x".repeat(2001), "ligne\nsecrète"])
    expect(validPublicQuestion(value)).toBe(false);
  for (const url of [
    GOOGLE_AI_ENTRY + "?q=x",
    GOOGLE_AI_ENTRY + "/",
    "https://www.google.com.evil.example/ai",
    "http://www.google.com/ai",
  ])
    expect(
      parseGoogleAiMessage({
        type: "journal360:google-ai:open-request",
        version: 1,
        url,
      }),
    ).toBeNull();
  expect(
    parseGoogleAiMessage({
      type: "journal360:google-ai:open-request",
      version: 1,
      url: GOOGLE_AI_ENTRY,
    })?.type,
  ).toBe("open");
  expect(
    parseGoogleAiMessage({
      type: "journal360:google-ai:question-request",
      version: 2,
      question: "Q",
      url: "https://evil.example",
    }),
  ).toBeNull();
  expect(readingQuestions(v6Bytes()).length).toBe(7);
});
it.each([
  "javascript:alert(1)",
  "file:///secret",
  "https://user:pass@example.org/",
  "https://127.1/x",
  "https://192.168.1.1/x",
  "http://localhost/x",
  "https://private.local/x",
  "https://example.org:444/",
])("source parent hostile refusée %s", (url) => {
  expect(validateSourceUrl(url)).toBeNull();
});

it("restauration garde deux versions legacy de hash identique et leurs UUID", async () => {
  const bytes = new TextEncoder().encode(
    "<html><head><title>Legacy</title></head><body>Original intact</body></html>",
  );
  const first = await inspectHTML("one.html", bytes);
  const second = await inspectHTML("two.html", bytes);
  await commitImport(db, first, bytes, "keep");
  await commitImport(db, second, bytes, "version", first.id);
  const fresh = new LocalRepository(`legacy-versions-${crypto.randomUUID()}`);
  try {
    const data = await inspectBackup(
      new Uint8Array(await (await exportBackup(db)).arrayBuffer()),
    );
    await restoreBackup(fresh, data);
    await restoreBackup(fresh, data);
    expect(await fresh.editions.count()).toBe(2);
    expect((await fresh.editions.toArray()).map((e) => e.id).sort()).toEqual(
      [first.id, second.id].sort(),
    );
  } finally {
    await fresh.delete();
  }
});
it("collision de note entre éditions conserve les deux ancrages, sans boucle de duplication", async () => {
  const a = await add(1);
  const b = await add(1, { date: "2026-10-15" });
  const id = crypto.randomUUID();
  const note = {
    id,
    editionId: a.id,
    body: "Même texte",
    kind: "note" as const,
    createdAt: "2026-10-14T10:00:00.000Z",
    updatedAt: "2026-10-14T10:00:00.000Z",
  };
  await db.notes.add(note);
  const data = await db.snapshot();
  data.notes = [
    { ...note, editionId: b.id, updatedAt: "2026-10-15T10:00:00.000Z" },
  ];
  await restoreBackup(db, data, "sync");
  await restoreBackup(db, data, "sync");
  expect(await db.notes.count()).toBe(2);
  expect(new Set((await db.notes.toArray()).map((n) => n.editionId))).toEqual(
    new Set([a.id, b.id]),
  );
});
it("2000 articles uniques réellement acceptés", async () => {
  const items = Array.from({ length: 2000 }, (_, i) => ({
    id: `a-${i}`,
    event_id: `event-${i}`,
    title: `Fixture ${i}`,
    summary: "Texte fictif",
  }));
  const e = await inspectHTML("limit.html", v6Bytes({ extra: { items } }));
  expect(e.articles).toHaveLength(2000);
});

it("ancien schéma v3 ouvre la DB v4 additive via Dexie sans supprimer les nouveaux champs", async () => {
  const e = await add(1);
  const name = db.name;
  db.close();
  const old = new Dexie(name);
  old.version(3).stores({
    editions: "id,sha256,date,familyId,importedAt",
    originals: "id",
    states: "id,editionId",
    notes: "id,editionId,updatedAt",
    preferences: "key",
    jobs: "id,status,createdAt,ownerId",
    pending: "id,createdAt",
  });
  try {
    await old.open();
    expect(old.backendDB().version).toBe(40);
    const record = await old.table("editions").get(e.id);
    expect(record.dayKey).toBe(e.dayKey);
    await old.table("editions").update(e.id, { archived: true });
  } finally {
    old.close();
  }
  await db.open();
  expect(await db.editions.get(e.id)).toEqual({ ...e, archived: true });
  expect(await db.originals.get(e.id)).toBeDefined();
});

it("HTML vide refusé, JSON malformé sans exécution ni article inventé", async () => {
  await expect(inspectHTML("empty.html", new Uint8Array())).rejects.toThrow();
  const bytes = new TextEncoder().encode(
    '<html><body><h1>Fixture</h1><script id="editionData" type="application/json">{invalid}</script><script>window.importExecuted=true</script></body></html>',
  );
  const e = await inspectHTML("bad-json.html", bytes);
  expect(e.articles).toEqual([]);
  expect(e.warnings.length).toBeGreaterThan(0);
  expect(
    (window as unknown as Record<string, unknown>).importExecuted,
  ).toBeUndefined();
});
