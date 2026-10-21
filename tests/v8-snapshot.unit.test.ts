import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { inspectHTML } from "../src/features/import";
import { assessVersion } from "../src/data/day";
import { indexArticles } from "../src/data/articles";
const read = (hour: string) =>
  new Uint8Array(readFileSync(`tests/fixtures/v8/snapshot-${hour}.html`));
it.each([
  ["22", 8],
  ["18", 6],
  ["12", 3],
])(
  "T01/T02/T04 : un seul %s h est autonome sans chaîne d'imports (%i événements)",
  async (hour, count) => {
    const e = await inspectHTML(`snapshot-${hour}.html`, read(hour));
    expect(indexArticles([e])).toHaveLength(count);
    expect(assessVersion(e, [e]).missingSlots).toEqual([]);
    expect(assessVersion(e, [e])).toMatchObject({
      snapshot: {
        integrity: "VALID",
        autonomy: "AUTONOMOUS",
        coverage: "UNKNOWN",
        history: "SINGLE_SNAPSHOT",
        importedFiles: 1,
      },
    });
    expect(assessVersion(e, [e]).issues.join(" ")).not.toMatch(
      /Créneaux manquants|Saut de révision/,
    );
  },
);
it("T01 : un seul 22 h conserve les 8 récits, 4 zones, 2 jalons, 2 prompts intégraux", async () => {
  const e = await inspectHTML("snapshot-22.html", read("22"));
  const expected = JSON.parse(
    readFileSync("tests/fixtures/v8/expected.json", "utf8"),
  );
  expect(e.articles.map((a) => a.eventId)).toEqual(expected.eventIds);
  expect(e.unified!.economicSnapshots.map((x) => x.zone)).toEqual(
    expected.economicZones,
  );
  expect(e.unified!.futureInsights.map((x) => x.id)).toEqual(
    expected.insightIds,
  );
  for (const p of e.unified!.promptAssets)
    expect(p.content).toBe(
      readFileSync("tests/fixtures/v8/" + p.filename, "utf8"),
    );
  for (const [i, a] of e.articles.entries())
    expect(a.text).toContain(`alphav8${i}`);
});

it("T03/T07/T08 : ordre, doublon, branche concurrente et correction gardent originaux, sources et états", async () => {
  const { LocalRepository } = await import("../src/data/db");
  const { commitImport } = await import("../src/features/import");
  const { resolveDay } = await import("../src/data/day");
  const db = new LocalRepository("v8-order-" + crypto.randomUUID());
  const encode = (p: unknown) =>
    new TextEncoder().encode(
      `<h1>SYNTHÉTIQUE</h1><script id="unifiedData" type="application/json">${JSON.stringify(p).replaceAll("<", "\\u003c")}</script>`,
    );
  try {
    for (const hour of ["22", "10", "18", "22"]) {
      const bytes = read(hour);
      await commitImport(
        db,
        await inspectHTML(`snapshot-${hour}.html`, bytes),
        bytes,
        "day",
      );
    }
    expect(await db.editions.count()).toBe(3);
    let all = await db.editions.toArray();
    const current = resolveDay(all).current!;
    expect(current.editionSlot).toBe("22:00");
    await db.reading(current.id, "article-v8-A", {
      favorite: true,
      read: true,
    });
    await db.notes.add({
      id: crypto.randomUUID(),
      editionId: current.id,
      body: "Note synthétique privée",
      kind: "note",
      createdAt: current.importedAt,
      updatedAt: current.importedAt,
    });
    const competing = structuredClone(current.unified!);
    competing.items[0].detail = "Version concurrente synthétique";
    const branch = encode(competing);
    await commitImport(
      db,
      await inspectHTML("branch.html", branch),
      branch,
      "day",
    );
    all = await db.editions.toArray();
    expect(resolveDay(all).versions[0].assessment.snapshot?.conflict).toBe(
      true,
    );
    expect(await db.originals.count()).toBe(4);
    const corrected = structuredClone(competing);
    corrected.revision = 9;
    corrected.previousRevisionRef = "revision-8";
    corrected.items[0].detail = "Correction sourcée explicite";
    corrected.items[0].corrections = [
      {
        at: "2026-10-19T22:01:00+02:00",
        reason: "Correction documentée synthétique avec preuve.",
        sourceIds: [corrected.items[0].sourceRecords[0].id],
      },
    ];
    const bytes = encode(corrected);
    await commitImport(
      db,
      await inspectHTML("corrected.html", bytes),
      bytes,
      "day",
    );
    all = await db.editions.toArray();
    expect(resolveDay(all).current?.externalRevision).toBe(9);
    expect(
      indexArticles(all).find((x) => x.article.eventId === "event-v8-A")!
        .versions,
    ).toContain(current.id);
    expect(
      indexArticles(all)
        .find((x) => x.article.eventId === "event-v8-A")!
        .history.some((x) => x.edition.id === current.id),
    ).toBe(true);
    expect((await db.states.toArray())[0].favorite).toBe(true);
    expect(await db.notes.count()).toBe(1);
    expect(await db.originals.count()).toBe(5);
  } finally {
    await db.delete();
  }
});
it("T05/T06 : vrai témoin local omis, sans témoin couverture UNKNOWN ; anciennes annexes toujours consultables", async () => {
  const prior = await inspectHTML("snapshot-12.html", read("12"));
  const p = JSON.parse(
    readFileSync("tests/fixtures/v8/snapshot-22.json", "utf8"),
  );
  p.items = p.items.filter(
    (x: { eventId: string }) => x.eventId !== "event-v8-C",
  );
  p.synthesis.eventIds = p.items.map((x: { eventId: string }) => x.eventId);
  p.promptAssets = [];
  p.futureInsights = [];
  p.futureDocuments = [];
  p.economicSnapshots = [];
  const raw = new TextEncoder().encode(
    `<h1>SYNTHÉTIQUE</h1><script id="unifiedData" type="application/json">${JSON.stringify(p).replaceAll("<", "\\u003c")}</script>`,
  );
  const latest = await inspectHTML("omitted.html", raw);
  expect(assessVersion(latest, [latest]).snapshot).toMatchObject({
    autonomy: "AUTONOMOUS",
    coverage: "UNKNOWN",
  });
  expect(assessVersion(latest, [prior, latest]).snapshot).toMatchObject({
    autonomy: "INCOMPLETE",
    coverage: "PARTIAL",
    omittedEvents: ["event-v8-C"],
  });
  expect(indexArticles([prior, latest])).toHaveLength(8);
  const retained = indexArticles([prior, latest]).find(
    (x) => x.article.eventId === "event-v8-C",
  )!;
  expect(retained.edition.id).toBe(prior.id);
  const { unifiedVersions, economicRows } =
    await import("../src/features/unified/selectors");
  expect(
    unifiedVersions([latest, prior]).flatMap((e) => e.unified!.promptAssets),
  ).toHaveLength(2);
  expect(
    unifiedVersions([latest, prior]).flatMap((e) => e.unified!.futureInsights),
  ).toHaveLength(2);
  expect(economicRows([latest, prior])).toHaveLength(4);
});
it("T10 : delta économique refusé si période identique, future, incomparable ou non interprétable", async () => {
  const { economicDelta } = await import("../src/features/unified/selectors");
  const p = JSON.parse(
    readFileSync("tests/fixtures/v8/snapshot-22.json", "utf8"),
  );
  const row = p.economicSnapshots[0];
  expect(economicDelta(row)).toBe(1);
  for (const period of [row.period, "2026-12", "période opaque"]) {
    row.comparison.period = period;
    expect(economicDelta(row)).toBeNull();
  }
  row.comparison.period = "2026-08";
  row.comparison.definition = "autre définition";
  expect(economicDelta(row)).toBeNull();
});
it.each([
  ["generic", 1],
  ["legacy", 2],
  ["snapshot", 3],
])(
  "T14/T19 : ZIP %s version %i, restauration réelle idempotente avec originaux, notes et favoris",
  async (kind, version) => {
    const { LocalRepository } = await import("../src/data/db");
    const { commitImport } = await import("../src/features/import");
    const { exportBackup, inspectBackup, restoreBackup } =
      await import("../src/features/backup");
    const { v6Bytes } = await import("./helpers/v6");
    const { default: JSZip } = await import("jszip");
    const a = new LocalRepository("v8-backup-a-" + crypto.randomUUID()),
      b = new LocalRepository("v8-backup-b-" + crypto.randomUUID());
    try {
      const bytes =
        kind === "snapshot"
          ? read("22")
          : kind === "legacy"
            ? v6Bytes({ date: "2026-10-18", revision: 3 })
            : new TextEncoder().encode(
                "<h1>Générique SYNTHÉTIQUE</h1><p>Sans contrat</p>",
              );
      const e = await inspectHTML(
        kind === "legacy"
          ? "JOURNAL360_2026-10-18_EDITION_21H.html"
          : "source.html",
        bytes,
      );
      const r = await commitImport(a, e, bytes, "day");
      await a.reading(r.id, "edition", { favorite: true, read: true });
      await a.notes.add({
        id: crypto.randomUUID(),
        editionId: r.id,
        body: "Conserver test",
        kind: "note",
        createdAt: e.importedAt,
        updatedAt: e.importedAt,
      });
      await a.editions.update(r.id, { archived: true });
      const raw = new Uint8Array(await (await exportBackup(a)).arrayBuffer());
      const zip = await JSZip.loadAsync(raw);
      expect(
        JSON.parse(await zip.file("manifest.json")!.async("string"))
          .formatVersion,
      ).toBe(version);
      const parsed = await inspectBackup(raw);
      await restoreBackup(b, parsed);
      await restoreBackup(b, parsed);
      for (const table of ["editions", "originals", "notes", "states"] as const)
        expect(await b[table].toArray()).toEqual(await a[table].toArray());
      zip.file(`files/${r.id}.html`, "<h1>Corrompu</h1>");
      await expect(
        inspectBackup(await zip.generateAsync({ type: "uint8array" })),
      ).rejects.toThrow(/Checksum/);
    } finally {
      await a.delete();
      await b.delete();
    }
  },
);
it("T11/T12 : sources, références, SHA et JSON hostile refusés avant toute écriture", async () => {
  const { LocalRepository } = await import("../src/data/db");
  const { commitImport } = await import("../src/features/import");
  const db = new LocalRepository("v8-negative-" + crypto.randomUUID());
  const base = JSON.parse(
    readFileSync("tests/fixtures/v8/snapshot-22.json", "utf8"),
  );
  const bad = [
    () => {
      const p = structuredClone(base);
      p.items[0].sourceRecords[0].url = "http://example.org/faux";
      return p;
    },
    () => {
      const p = structuredClone(base);
      p.promptAssets[0].sha256 = "0".repeat(64);
      return p;
    },
    () => {
      const p = structuredClone(base);
      p.futureInsights[0].eventId = "orphan";
      return p;
    },
    () => {
      const p = structuredClone(base);
      p.futureInsights[0].status = "observed";
      p.futureInsights[0].year = 2027;
      p.futureInsights[0].observedAt = "2027-01-01";
      return p;
    },
  ];
  try {
    for (const make of bad) {
      const bytes = new TextEncoder().encode(
        `<h1>Test</h1><script id="unifiedData" type="application/json">${JSON.stringify(make()).replaceAll("<", "\\u003c")}</script>`,
      );
      await expect(
        (async () =>
          commitImport(
            db,
            await inspectHTML("bad.html", bytes),
            bytes,
            "day",
          ))(),
      ).rejects.toThrow();
    }
    const hostile = new TextEncoder().encode(
      '<h1>Test</h1><script id="unifiedData" type="application/json">{"title":"</script><img src=x onerror=alert(1)>"}</script>',
    );
    await expect(inspectHTML("bad.html", hostile)).rejects.toThrow();
    expect(await db.editions.count()).toBe(0);
    expect(await db.originals.count()).toBe(0);
  } finally {
    await db.delete();
  }
});
