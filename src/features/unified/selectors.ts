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
export function economicDelta(e: EconomicSnapshot) {
  return e.comparison &&
    e.comparison.definition === e.definition &&
    e.comparison.unit === e.unit
    ? e.value - e.comparison.value
    : null;
}
