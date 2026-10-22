import { it, expect } from "vitest";
import { inspectHTML } from "../src/features/import";
import { economicHistories } from "../src/features/v9/economicHistory";
import { auditHTML, auditPayload } from "./helpers/audit";
import {
  displayDefaults,
  parseDisplayPreferences,
} from "../src/features/v9/preferences";
async function edition() {
  const p = auditPayload("10");
  p.synthetic = false;
  const base = p.economicSnapshots[0];
  base.frequency = "monthly";
  base.period = "2026-08";
  base.statisticDate = "2026-08-31";
  base.seriesCode = "serie-test";
  base.value = 100;
  base.sourceRecords = base.sourceRecords.map((s) => ({
    ...s,
    url: "https://www.insee.fr/fr/statistiques/series-test",
    verifiedAt: p.sourceVerifiedAt,
  }));
  p.economicSnapshots = [
    base,
    {
      ...structuredClone(base),
      id: "second",
      period: "2026-09",
      statisticDate: "2026-09-30",
      value: 103,
    },
  ];
  return inspectHTML("history.html", auditHTML(p));
}
it("historique : deux points officiels comparables, valeurs exactes, sans interpolation", async () => {
  const e = await edition(),
    g = economicHistories([e]);
  expect(g).toHaveLength(1);
  expect(g[0].points.map((p) => [p.period, p.value])).toEqual([
    ["2026-08", 100],
    ["2026-09", 103],
  ]);
  expect(g[0].gaps).toBe(false);
  e.unified!.economicSnapshots[1].period = "2026-10";
  const gap = economicHistories([e])[0];
  expect(gap.gaps).toBe(true);
  expect(gap.points).toHaveLength(2);
});
it("historique : aucun mélange d’unités, définitions, fréquences, zones ou séries", async () => {
  for (const patch of [
    { unit: "autre" },
    { definition: "Méthode différente" },
    { frequency: "quarterly" as const, period: "2026-Q3" },
    { zone: "CN" as const },
    { seriesCode: "autre" },
  ]) {
    const e = await edition();
    Object.assign(e.unified!.economicSnapshots[1], patch);
    expect(economicHistories([e]).every((g) => g.points.length === 1)).toBe(
      true,
    );
  }
});
it("historique : synthétique, non vérifié, sources non officielles et périodes inconnues exclus", async () => {
  for (const patch of ["synthetic", "unverified", "unofficial", "period"]) {
    const e = await edition();
    if (patch === "synthetic") e.unified!.synthetic = true;
    for (const p of e.unified!.economicSnapshots) {
      if (patch === "unverified") p.verifiedAt = null;
      if (patch === "unofficial")
        p.sourceRecords.forEach((s) => (s.url = "https://example.org/test"));
      if (patch === "period") p.period = "période non normalisée";
    }
    expect(economicHistories([e])).toHaveLength(0);
  }
});
it("historique : une révision plus récente remplace la même période, sans point doublé", async () => {
  const e = await edition();
  const next = structuredClone(e);
  next.id = crypto.randomUUID();
  next.unified!.economicSnapshots = next.unified!.economicSnapshots.slice(0, 1);
  Object.assign(next.unified!.economicSnapshots[0], {
    value: 101,
    revisedAt: "2026-10-20T12:00:00+02:00",
  });
  const g = economicHistories([next, e]);
  expect(g[0].points.map((p) => p.value)).toEqual([101, 103]);
  expect(g[0].points[0].revisedAt).toBeTruthy();
});
it("préférences V9 : format strict, valeurs par défaut et relecture identique", () => {
  const d = displayDefaults();
  d.density = "compact";
  d.favorites = ["Économie"];
  expect(parseDisplayPreferences(JSON.stringify(d))).toEqual(d);
  for (const raw of [
    null,
    "{",
    '{"version":9}',
    JSON.stringify({ ...d, extra: true }),
    JSON.stringify({ ...d, motion: "false" }),
  ])
    expect(parseDisplayPreferences(raw)).toEqual(displayDefaults());
});
