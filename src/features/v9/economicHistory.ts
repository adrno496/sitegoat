import type { Edition } from "../../data/model";
import type { EconomicSnapshot } from "../../data/unified";
import { economicRows } from "../unified/selectors";
import { validDate } from "../../data/editorial";
const official = [
  "insee.fr",
  "banque-france.fr",
  "ec.europa.eu",
  "ecb.europa.eu",
  "imf.org",
  "oecd.org",
  "bls.gov",
  "bea.gov",
  "federalreserve.gov",
  "stlouisfed.org",
  "stats.gov.cn",
  "pbc.gov.cn",
];
function periodIndex(e: EconomicSnapshot): number | null {
  const p = e.period;
  if (e.frequency === "annual" && /^\d{4}$/.test(p)) return +p;
  if (e.frequency === "quarterly" && /^\d{4}-Q[1-4]$/.test(p))
    return +p.slice(0, 4) * 4 + +p.at(-1)! - 1;
  if (e.frequency === "monthly" && /^\d{4}-(0[1-9]|1[0-2])$/.test(p))
    return +p.slice(0, 4) * 12 + +p.slice(5) - 1;
  if (e.frequency === "daily" && validDate(p))
    return Date.parse(p + "T12:00:00Z") / 86400000;
  return null;
}
export function economicHistories(editions: Edition[]) {
  const groups = new Map<string, { key: string; points: EconomicSnapshot[] }>();
  for (const { data: e, edition } of economicRows(editions)) {
    if (
      edition.demo ||
      edition.unified?.synthetic ||
      !e.verifiedAt ||
      periodIndex(e) === null ||
      !e.sourceRecords.some((s) => {
        try {
          const h = new URL(s.url).hostname;
          return (
            !!s.verifiedAt &&
            official.some((d) => h === d || h.endsWith("." + d))
          );
        } catch {
          return false;
        }
      })
    )
      continue;
    const key = JSON.stringify([
      e.zone,
      e.provider,
      e.seriesCode,
      e.definition,
      e.unit,
      e.frequency,
    ]);
    const g = groups.get(key) || { key, points: [] };
    g.points.push(e);
    groups.set(key, g);
  }
  return [...groups.values()].map((g) => ({
    ...g,
    points: g.points.sort((a, b) => periodIndex(a)! - periodIndex(b)!),
    gaps: g.points
      .slice(1)
      .some((p, n) => periodIndex(p)! - periodIndex(g.points[n])! > 1),
  }));
}
