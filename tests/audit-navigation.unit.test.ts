import { it, expect } from "vitest";
import { inspectHTML, commitImport } from "../src/features/import";
import { indexArticles } from "../src/data/articles";
import { LocalRepository } from "../src/data/db";
import { resolveDay, assessVersion } from "../src/data/day";
import { summaryPreview } from "../src/features/eventPresentation";
import {
  parsePreferences,
  defaults,
} from "../src/features/interfacePreferences";
import { auditBytes, auditLoadPayload, auditHTML } from "./helpers/audit";
import { hash } from "../src/data/model";
it.each(["08", "10"] as const)(
  "audit %s : intégralité des données et assets, pas de dépendance aux imports",
  async (hour) => {
    const bytes = auditBytes(hour),
      e = await inspectHTML(`audit-${hour}.html`, bytes),
      p = e.unified!;
    expect(p).toBeTruthy();
    expect([
      p.items.length,
      p.economicSnapshots.length,
      p.futureInsights.length,
      p.promptAssets.length,
    ]).toEqual(hour === "08" ? [4, 4, 5, 2] : [8, 4, 6, 3]);
    expect(indexArticles([e])).toHaveLength(p.items.length);
    expect(assessVersion(e, [e]).snapshot).toMatchObject({
      integrity: "VALID",
      autonomy: "AUTONOMOUS",
      history: "SINGLE_SNAPSHOT",
    });
    for (const i of p.items) {
      const a = e.articles.find((a) => a.eventId === i.eventId)!;
      expect(a.text).toContain(i.summary);
      expect(a.text).toContain(i.plain);
      expect(a.text.replace(/\s+/g, " ")).toContain(
        i.detail.replace(/\s+/g, " "),
      );
      expect(a.sources).toEqual(
        expect.arrayContaining(i.sourceRecords.map((s) => s.url)),
      );
    }
    for (const pmt of p.promptAssets)
      if (pmt.sha256)
        expect(await hash(new TextEncoder().encode(pmt.content))).toBe(
          pmt.sha256,
        );
  },
);
it.each([
  ["08", "10"],
  ["10", "08"],
  ["10", "08", "10"],
] as const)(
  "audit ordre %j : dernière édition exacte, originaux et champs conservés",
  async (...hours) => {
    const db = new LocalRepository("audit-" + crypto.randomUUID());
    try {
      for (const hour of hours) {
        const bytes = auditBytes(hour);
        await commitImport(
          db,
          await inspectHTML(`audit-${hour}.html`, bytes),
          bytes,
          "day",
        );
      }
      const all = await db.editions.toArray();
      expect(all).toHaveLength(2);
      const current = resolveDay(all).current!;
      expect(current.editionSlot).toBe("10:00");
      expect(indexArticles(all)).toHaveLength(8);
      const earlier = all.find((e) => e.editionSlot === "08:00")!;
      expect(
        earlier.unified!.items.every((i) =>
          current.unified!.items.some(
            (j) =>
              j.eventId === i.eventId && j.firstSeenSlot === i.firstSeenSlot,
          ),
        ),
      ).toBe(true);
      for (const e of all) {
        expect(await hash((await db.originals.get(e.id))!.bytes)).toBe(
          await hash(
            new Uint8Array(auditBytes(e.editionSlot === "08:00" ? "08" : "10")),
          ),
        );
        expect(
          (
            await inspectHTML(
              e.filename,
              new Uint8Array(
                auditBytes(e.editionSlot === "08:00" ? "08" : "10"),
              ),
            )
          ).unified,
        ).toEqual(e.unified);
      }
    } finally {
      await db.delete();
    }
  },
);
it("aperçu français : préfixe exact, décimales, abréviation et résumé complet préservés", () => {
  const text =
    "M. Dupont annonce 3.5 % à 08 h. « Une seconde phrase ! » Troisième phrase.";
  expect(summaryPreview(text)).toBe(
    "M. Dupont annonce 3.5 % à 08 h. « Une seconde phrase ! »",
  );
  expect(summaryPreview("Sans ponctuation")).toBe("Sans ponctuation");
  expect(summaryPreview("")).toBe("");
});
it("préférences : format versionné validé et retour sûr, sans toucher aux données", () => {
  expect(parsePreferences(null)).toEqual(defaults());
  expect(parsePreferences("{")).toEqual(defaults());
  expect(parsePreferences('{"version":2}')).toEqual(defaults());
  const p = defaults();
  p.profile = "custom";
  p.options.economy = false;
  expect(parsePreferences(JSON.stringify(p))).toEqual(p);
  expect(
    parsePreferences(JSON.stringify({ ...p, options: { economy: "false" } })),
  ).toEqual(defaults());
});

it.each([500, 2000])(
  "bibliothèque %i : snapshots valides, budget 2 Mo et index complet",
  async (count) => {
    const editions = [];
    for (let n = 0; n < count / 500; n++) {
      const p = auditLoadPayload(500, `2026-10-${16 + n}`);
      expect(Buffer.byteLength(JSON.stringify(p))).toBeLessThanOrEqual(
        2 * 1024 * 1024,
      );
      editions.push(await inspectHTML(`load-${n}.html`, auditHTML(p)));
    }
    expect(indexArticles(editions)).toHaveLength(count);
  },
);
it("un seul JSON trop complexe reste refusé sans assouplir le contrat", async () => {
  await expect(
    inspectHTML("over-budget.html", auditHTML(auditLoadPayload(2000))),
  ).rejects.toThrow("JSON V7 trop complexe ou profond");
});
