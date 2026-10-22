import type { Edition } from "../../data/model";
import { sortEditions } from "../../data/model";
import { resolveDay, dayKeyOf, currentEditions } from "../../data/day";
export function latestCurrent(editions: Edition[]) {
  return sortEditions(
    currentEditions(
      editions.filter((e) => !e.deleted && !e.archived && !e.collection),
    ),
  )[0];
}
import type { EconomicSnapshot } from "../../data/unified";
export const zoneLabels = {
  FR: "France",
  EU: "Europe / zone euro",
  US: "États-Unis",
  CN: "Chine",
};
export const economicLabels = {
  normal: "Normal",
  watch: "Vigilance",
  tensions: "Tensions importantes",
  crisis: "Crise constatée selon les sources",
  unknown: "Indéterminé",
};
export function latestUnified(editions: Edition[]) {
  const groups = new Map<string, Edition[]>();
  for (const e of editions.filter(
    (e) => !e.deleted && !e.collection && e.unified,
  )) {
    const key = dayKeyOf(e)!;
    groups.set(key, [...(groups.get(key) || []), e]);
  }
  return [...groups.values()]
    .map((g) => resolveDay(g).current!)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}
export function economicRows(editions: Edition[]) {
  const rows = new Map<string, { data: EconomicSnapshot; edition: Edition }>();
  const publicationTime = (data: EconomicSnapshot) =>
    Math.max(
      Date.parse(data.publishedAt),
      data.revisedAt ? Date.parse(data.revisedAt) : 0,
    );
  for (const e of [...editions]
    .filter((e) => !e.deleted && e.unified)
    .sort((a, b) => (b.externalRevision || 0) - (a.externalRevision || 0)))
    for (const data of e.unified!.economicSnapshots) {
      const key = JSON.stringify([
        data.zone,
        data.provider,
        data.seriesCode,
        data.definition,
        data.unit,
        data.period,
        data.frequency,
      ]);
      const old = rows.get(key);
      if (!old || publicationTime(data) > publicationTime(old.data))
        rows.set(key, { data, edition: e });
    }
  return [...rows.values()].sort(
    (a, b) => publicationTime(b.data) - publicationTime(a.data),
  );
}
export function economyFreshness(e: EconomicSnapshot, at = new Date()) {
  if (!e.verifiedAt) return "Jamais vérifié";
  const days = (+at - Date.parse(e.statisticDate + "T12:00:00Z")) / 86400000;
  return days > e.maxAgeDays
    ? "Donnée ancienne · à revérifier"
    : e.revisedAt
      ? "Statistique révisée"
      : "Vérification déclarée";
}
function periodOrder(value: string): number | null {
  if (/^\d{4}$/.test(value)) return +value * 12;
  if (/^\d{4}-Q[1-4]$/.test(value))
    return +value.slice(0, 4) * 12 + (+value.at(-1)! - 1) * 3;
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(value))
    return +value.slice(0, 4) * 12 + (+value.slice(5) - 1);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value))
    return Number.isFinite(Date.parse(value)) ? Date.parse(value) : null;
  return null;
}
export function economicDelta(e: EconomicSnapshot) {
  return e.comparison &&
    e.comparison.definition === e.definition &&
    e.comparison.unit === e.unit &&
    e.comparison.period.length === e.period.length &&
    periodOrder(e.period) !== null &&
    periodOrder(e.comparison.period) !== null &&
    periodOrder(e.comparison.period)! < periodOrder(e.period)!
    ? e.value - e.comparison.value
    : null;
}

// Ordered originals, never a rewritten/reconstructed snapshot. Used to retain
// annexes omitted by a newer import, with the edition that actually contains them.
export function unifiedVersions(editions: Edition[]) {
  const groups = new Map<string, Edition[]>();
  for (const e of editions.filter(
    (e) => !e.deleted && !e.collection && e.unified,
  )) {
    const key = dayKeyOf(e)!;
    const group = groups.get(key) || [];
    group.push(e);
    groups.set(key, group);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .flatMap(([, g]) => resolveDay(g).versions.map((v) => v.edition));
}
