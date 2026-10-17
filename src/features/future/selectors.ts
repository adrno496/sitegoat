import type { FuturePayload, FuturePersonal } from "./schema";
export const pathLabels = {
  acceleration: "Accélération",
  moderate: "Progression modérée",
  slowdown: "Ralentissement",
  other: "Autres trajectoires",
};
export const actionLabels = {
  todo: "À faire",
  doing: "En cours",
  done: "Terminé",
  abandoned: "Abandonné",
};
export const horizonLabels = {
  now: "Maintenant",
  "3m": "Dans 3 mois",
  "12m": "Dans 12 mois",
};
export const formatDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString("fr-FR") : "non renseigné";
export const itemAnchor = (id: string) => "future-item-" + id;
export function timelineItems(p: FuturePayload) {
  return p.scenarios
    .flatMap((s) =>
      s.milestones.map((m) => ({ ...m, scenario: s.title, path: s.path })),
    )
    .sort((a, b) => a.year - b.year || a.id.localeCompare(b.id));
}
export function periodFor(year: number) {
  return year >= 2040 ? "2040+" : String(year);
}
export function timelinePeriods(p: FuturePayload) {
  return [
    ...new Set([
      "2027",
      "2030",
      "2035",
      "2040+",
      ...timelineItems(p).map((m) => periodFor(m.year)),
    ]),
  ].sort((a, b) => parseInt(a) - parseInt(b));
}
export function contentCounts(p: FuturePayload) {
  const milestones = p.scenarios.flatMap((s) => s.milestones);
  return {
    observations:
      p.signals.filter((s) => s.status === "observed").length +
      milestones.filter((m) => m.status === "observed").length,
    hypotheses:
      p.scenarios.length +
      milestones.filter((m) => m.status !== "observed").length +
      p.signals.filter((s) => s.status === "watch").length,
    actions: p.actions.length,
  };
}
export function preparationCounts(p: FuturePayload, personal: FuturePersonal) {
  const result = { todo: 0, doing: 0, done: 0, abandoned: 0 };
  for (const a of p.actions) result[personal.actions[a.id]?.status || "todo"]++;
  return result;
}
export function scenarioEvidence(p: FuturePayload, id: string) {
  const s = p.scenarios.find((s) => s.id === id);
  return [
    ...new Set([
      ...(s?.milestones.flatMap((m) => m.evidenceUrls) || []),
      ...p.signals
        .filter((v) => s?.signalIds.includes(v.id))
        .flatMap((v) => v.evidenceUrls),
    ]),
  ];
}
