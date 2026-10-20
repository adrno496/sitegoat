import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { LocalRepository } from "../src/data/db";
import { V7_SLOTS, parisClock, scheduleFor } from "../src/data/editorial";
import { inspectHTML, commitImport } from "../src/features/import";
import { assessVersion, resolveDay } from "../src/data/day";
import { indexArticles } from "../src/data/articles";
import {
  exportBackup,
  inspectBackup,
  restoreBackup,
} from "../src/features/backup";
import { validateUnified } from "../src/data/unified";
import { v6Bytes } from "./helpers/v6";
const date = "2026-10-19";
const at = new Date("2026-10-20T23:00:00+02:00");
const fixture = (hour = "2200") =>
  JSON.parse(
    readFileSync(`public/examples/unified/edition-${hour}.json`, "utf8"),
  );
const bytes = (p: unknown) =>
  new TextEncoder().encode(
    `<!doctype html><html><body><h1>Synthétique</h1><script id="unifiedData" type="application/json">${JSON.stringify(p).replaceAll("<", "\\u003c")}</script></body></html>`,
  );
it("P1 : huit éditions, arrivée désordonnée, cumul contrôlé, doublon, archive 21 h et états intacts", async () => {
  const a = new LocalRepository("v7-" + crypto.randomUUID()),
    b = new LocalRepository("v7-restore-" + crypto.randomUUID());
  try {
    const add = async (hour: string) => {
      const raw = bytes(fixture(hour)),
        e = await inspectHTML(
          "JOURNAL360_" + date + "_EDITION_" + hour.slice(0, 2) + "H00.html",
          raw,
        );
      const r = await commitImport(a, e, raw, "day");
      return (await a.editions.get(r.id))!;
    };
    const final = await add("2200");
    expect(assessVersion(final, [final]).status).toBe("PARTIAL");
    for (const slot of V7_SLOTS.slice(0, 7)) await add(slot.replace(":", ""));
    await add("1000");
    const all = await a.editions.toArray();
    expect(all).toHaveLength(8);
    expect(resolveDay(all).current?.id).toBe(final.id);
    expect(resolveDay(all).status).toBe("COMPLETE");
    expect(indexArticles(all)).toHaveLength(4);
    expect(
      indexArticles(all).find((i) => i.article.eventId === "event-v7-1")
        ?.article.firstSeenSlot,
    ).toBe("10:00");
    const legacyRaw = v6Bytes({ date, revision: 3 });
    const legacy = await inspectHTML("old.html", legacyRaw);
    await commitImport(a, legacy, legacyRaw, "day");
    expect(scheduleFor(legacy)).toEqual(["08:00", "16:00", "21:00"]);
    expect(resolveDay(await a.editions.toArray()).current?.editionSlot).toBe(
      "22:00",
    );
    await a.reading(final.id, "article-v7-1", { favorite: true, read: true });
    await a.notes.add({
      id: crypto.randomUUID(),
      editionId: final.id,
      body: "Note privée de test",
      kind: "note",
      createdAt: final.importedAt,
      updatedAt: final.importedAt,
    });
    const archive = await inspectBackup(
      new Uint8Array(await (await exportBackup(a)).arrayBuffer()),
    );
    await restoreBackup(b, archive);
    await restoreBackup(b, archive);
    expect(await b.originals.toArray()).toEqual(await a.originals.toArray());
    expect(await b.notes.toArray()).toEqual(await a.notes.toArray());
    expect(await b.states.toArray()).toEqual(await a.states.toArray());
    expect(await b.editions.count()).toBe(9);
  } finally {
    await a.delete();
    await b.delete();
  }
});
it("P1 : une chaîne absente reste partielle, une première apparition ne peut pas être réécrite", async () => {
  const first = await inspectHTML("x.html", bytes(fixture("0800"))),
    last = await inspectHTML("y.html", bytes(fixture()));
  expect(assessVersion(last, [first, last]).status).toBe("PARTIAL");
  last.articles[0].firstSeenSlot = "10:00";
  expect(assessVersion(last, [first, last]).issues.join(" ")).toContain(
    "Première apparition",
  );
});
it("P1 : Paris reste correct des deux côtés des bascules DST, sans UTC+1 fixe", () => {
  expect(parisClock(new Date("2026-03-29T06:00:00Z"))).toEqual({
    date: "2026-03-29",
    time: "08:00",
  });
  expect(parisClock(new Date("2026-10-25T07:00:00Z"))).toEqual({
    date: "2026-10-25",
    time: "08:00",
  });
});
it("P1/P2 : les huit fichiers autonomes correspondent au contrat et conservent les vrais premiers créneaux", async () => {
  for (const slot of V7_SLOTS) {
    const p = fixture(slot.replace(":", ""));
    expect(validateUnified(p, at).editionSlot).toBe(slot);
    const name = `JOURNAL360_${date}_EDITION_${slot.replace(":", "H")}.html`;
    const raw = new Uint8Array(readFileSync("public/examples/unified/" + name));
    const e = await inspectHTML(name, raw);
    expect(e.unified).toEqual(p);
    expect(e.articles.length).toBe(p.items.length);
  }
});
it("P2 : détecte un doublon intentionnel, une correction sans preuve et un prompt tronqué", async () => {
  const duplicate = fixture();
  duplicate.items.push(duplicate.items[0]);
  expect(() => validateUnified(duplicate, at)).toThrow("dupliqué");
  const correction = fixture();
  correction.items[0].corrections[0].sourceIds = ["inconnue"];
  expect(() => validateUnified(correction, at)).toThrow("Correction");
  const truncated = fixture();
  truncated.promptAssets[0].content = truncated.promptAssets[0].content.slice(
    0,
    -15,
  );
  await expect(inspectHTML("x.html", bytes(truncated))).rejects.toThrow(
    "tronqué",
  );
});
it("P2 : rejette plans mélangés, jalons observés futurs, séries incompatibles et JSON profond", () => {
  const p = fixture();
  p.slotsIncluded.push("21:00");
  expect(() => validateUnified(p, at)).toThrow();
  const observed = fixture();
  observed.futureInsights[0].status = "observed";
  observed.futureInsights[0].observedAt = "2030-01-01";
  expect(() => validateUnified(observed, at)).toThrow("jalon futur");
  const economy = fixture();
  economy.economicSnapshots[0].comparison.unit = "autre unité";
  expect(() => validateUnified(economy, at)).toThrow("comparables");
  let deep: unknown = {};
  for (let n = 0; n < 20; n++) deep = { deep };
  expect(() => validateUnified(deep, at)).toThrow("profond");
});

it("P6 : archive historique restaurable et métadonnées V7 préservées face à un ancien snapshot simulé", async () => {
  const db = new LocalRepository("v7-compatible-" + crypto.randomUUID());
  try {
    const old = await inspectBackup(
      new Uint8Array(readFileSync("docs/evidence/v7/legacy-journal.zip")),
    );
    await restoreBackup(db, old);
    expect(await db.originals.count()).toBe(old.originals.length);
    const raw = bytes(fixture()),
      e = await inspectHTML("unified.html", raw),
      r = await commitImport(db, e, raw, "day");
    const stored = (await db.editions.get(r.id))!;
    const incoming = {
      ...stored,
      unified: undefined,
      scheduleId: undefined,
      editionSlot: undefined,
      slotsIncluded: undefined,
      externalRevision: undefined,
      updatedAt: "2099-01-01T00:00:00Z",
    };
    await restoreBackup(
      db,
      {
        editions: [incoming],
        originals: [{ id: stored.id, bytes: raw }],
        states: [],
        notes: [],
      },
      "sync",
    );
    expect((await db.editions.get(stored.id))?.unified).toEqual(stored.unified);
    expect((await db.editions.get(stored.id))?.slotsIncluded).toEqual(
      stored.slotsIncluded,
    );
    expect(
      (
        await inspectBackup(
          new Uint8Array(await (await exportBackup(db)).arrayBuffer()),
        )
      ).editions.find((x) => x.id === stored.id)?.unified,
    ).toEqual(stored.unified);
  } finally {
    await db.delete();
  }
});
it("P6 : quota simulé annule la transaction V7 sans supprimer les versions antérieures", async () => {
  const db = new LocalRepository("v7-quota-" + crypto.randomUUID());
  try {
    const raw = bytes(fixture("0800")),
      e = await inspectHTML("early.html", raw);
    await commitImport(db, e, raw, "day");
    const fail = () => {
      throw new DOMException("Quota de test", "QuotaExceededError");
    };
    db.originals.hook("creating", fail);
    const late = bytes(fixture());
    await expect(
      commitImport(db, await inspectHTML("late.html", late), late, "day"),
    ).rejects.toThrow();
    db.originals.hook("creating").unsubscribe(fail);
    expect(await db.editions.count()).toBe(1);
    expect(await db.originals.count()).toBe(1);
  } finally {
    await db.delete();
  }
});

it("P3 : une édition legacy plus récente reste prioritaire sur une ancienne V7", async () => {
  const { latestCurrent } = await import("../src/features/unified/selectors");
  const v7 = await inspectHTML("v7.html", bytes(fixture()));
  const older = await inspectHTML(
    "JOURNAL360_2026-10-20_EDITION_08H.html",
    v6Bytes({ date: "2026-10-20", revision: 1 }),
  );
  const later = await inspectHTML(
    "JOURNAL360_2026-10-20_EDITION_21H.html",
    v6Bytes({ date: "2026-10-20", revision: 3 }),
  );
  expect(latestCurrent([v7, older, later])?.id).toBe(later.id);
});
it("P2 : un eventId explicite partagé entre univers ne double pas le même événement et garde ses originaux", async () => {
  const v7 = await inspectHTML("v7.html", bytes(fixture()));
  const copy = {
    ...v7,
    id: crypto.randomUUID(),
    familyId: crypto.randomUUID(),
    unified: undefined,
    collection: "sentinel" as const,
    articles: [{ ...v7.articles[0], id: "another-local-id" }],
  };
  const rows = indexArticles([v7, copy]);
  expect(rows).toHaveLength(4);
  expect(
    rows.find((i) => i.article.eventId === v7.articles[0].eventId)?.versions,
  ).toContain(copy.id);
});
it("P4 : réafficher une statistique sur huit créneaux ne crée pas huit publications ni huit variations", async () => {
  const { economicRows, economicDelta, economyFreshness } =
    await import("../src/features/unified/selectors");
  const editions = await Promise.all(
    V7_SLOTS.map((s) =>
      inspectHTML("v7.html", bytes(fixture(s.replace(":", "")))),
    ),
  );
  const rows = economicRows(editions);
  expect(rows).toHaveLength(4);
  expect(economicDelta(rows[0].data)).toBe(1);
  expect(economyFreshness(rows[0].data, new Date("2027-01-01"))).toContain(
    "ancienne",
  );
});
it("P6 : rejette les URL actives, le mauvais type JSON et les octets hors budget", async () => {
  const p = fixture();
  p.items[0].sourceRecords[0].url = "javascript:alert(1)";
  expect(() => validateUnified(p, at)).toThrow("HTTPS");
  await expect(
    inspectHTML(
      "bad.html",
      new TextEncoder().encode(
        '<h1>Test</h1><script id="unifiedData">{}</script>',
      ),
    ),
  ).rejects.toThrow("unifiedData");
  await expect(
    inspectHTML("large.html", new Uint8Array(10 * 1024 * 1024 + 1)),
  ).rejects.toThrow("10 Mo");
});

it("P1 : 08→10→12→14→16→18→20→22, un seul événement introduit à 10 h et correction conservée", async () => {
  const db = new LocalRepository("v7-in-order-" + crypto.randomUUID());
  try {
    for (const slot of V7_SLOTS) {
      const raw = bytes(fixture(slot.replace(":", ""))),
        e = await inspectHTML("in-order.html", raw);
      await commitImport(db, e, raw, "day");
      const all = await db.editions.toArray();
      expect(resolveDay(all).current?.editionSlot).toBe(slot);
      expect(resolveDay(all).status).toBe("COMPLETE");
    }
    const all = await db.editions.toArray(),
      rows = indexArticles(all);
    expect(rows.filter((i) => i.article.eventId === "event-v7-1")).toHaveLength(
      1,
    );
    expect(
      rows.find((i) => i.article.eventId === "event-v7-1")?.article
        .firstSeenSlot,
    ).toBe("10:00");
    expect(
      resolveDay(all).current?.unified?.items[0].corrections[0].reason,
    ).toContain("Correction");
    expect(await db.originals.count()).toBe(8);
  } finally {
    await db.delete();
  }
});

it("P4 : les publications économiques sont ordonnées par instant réel malgré des décalages ISO différents", async () => {
  const { economicRows } = await import("../src/features/unified/selectors");
  const base = await inspectHTML("v7.html", bytes(fixture()));
  const earlier = structuredClone(base),
    later = structuredClone(base);
  earlier.id = crypto.randomUUID();
  later.id = crypto.randomUUID();
  earlier.unified!.economicSnapshots = [
    {
      ...earlier.unified!.economicSnapshots[0],
      publishedAt: "2026-10-19T10:00:00+02:00",
      value: 100,
    },
  ];
  later.unified!.economicSnapshots = [
    {
      ...later.unified!.economicSnapshots[0],
      publishedAt: "2026-10-19T09:00:00Z",
      value: 101,
    },
  ];
  expect(economicRows([earlier, later])[0].data.value).toBe(101);
});
