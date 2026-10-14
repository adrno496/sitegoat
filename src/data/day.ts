import type { Edition } from "./model";
import { hash } from "./model";
import { SLOTS, type Slot } from "./editorial";
export function isDayVersion(e: Edition) {
  return !!e.dayKey && !e.independent;
}
export interface Assessment {
  status: "COMPLETE" | "PARTIAL" | "UNKNOWN";
  issues: string[];
  missingSlots: Slot[];
  newEvents: number;
  corrections: number;
  removedEvents: number;
}
const revision = (e: Edition) => e.externalRevision || 0;
function events(e: Edition) {
  return new Map(
    e.articles.filter((a) => a.eventId).map((a) => [a.eventId!, a]),
  );
}
export function assessVersion(e: Edition, versions: Edition[]): Assessment {
  const issues: string[] = [];
  const slots = e.slotsIncluded || [];
  const lastSlot = Math.max(-1, ...slots.map((s) => SLOTS.indexOf(s)));
  const missingSlots = [
    ...new Set([
      ...(e.missingSlots || []),
      ...SLOTS.slice(0, lastSlot + 1).filter((s) => !slots.includes(s)),
    ]),
  ];
  const peers = versions.filter((v) => v.id !== e.id && v.sha256 !== e.sha256);
  const previous = peers
    .filter((v) => revision(v) < revision(e))
    .sort((a, b) => revision(b) - revision(a))[0];
  const before = new Map(
    peers
      .filter((v) => revision(v) < revision(e))
      .sort(
        (a, b) => revision(a) - revision(b) || a.sha256.localeCompare(b.sha256),
      )
      .flatMap((v) => [...events(v)]),
  );
  const current = events(e);
  const removed = [...before.keys()].filter((id) => !current.has(id));
  if (!revision(e) || !slots.length)
    issues.push("Révision ou créneaux manquants.");
  if (missingSlots.length)
    issues.push(`Créneaux manquants : ${missingSlots.join(", ")}.`);
  if (peers.some((v) => revision(v) === revision(e)))
    issues.push(
      "Même révision externe, contenus différents : branches à arbitrer.",
    );
  if (previous && revision(e) > revision(previous) + 1)
    issues.push("Saut de révision : version intermédiaire non reçue.");
  if (removed.length) {
    const declared = removed.filter((id) => e.retiredEventIds?.includes(id));
    issues.push(
      `${removed.length} événement(s) antérieur(s) absent(s), dont ${declared.length} retrait(s) déclaré(s) : vérification nécessaire.`,
    );
  }
  if (e.declaredCumulativeStatus === "PARTIAL")
    issues.push("Le producteur déclare un cumul partiel.");
  let status: Assessment["status"] = issues.length ? "PARTIAL" : "UNKNOWN";
  const comparable =
    !e.articles.some((a) => !a.eventId) &&
    (!previous || !previous.articles.some((a) => !a.eventId));
  if (
    !issues.length &&
    comparable &&
    e.declaredCumulativeStatus === "COMPLETE" &&
    (lastSlot === 0 ||
      (previous &&
        versions.some(
          (v) => revision(v) === 1 && v.slotsIncluded?.includes("08:00"),
        )))
  )
    status = "COMPLETE";
  const corrections = [...current].filter(
    ([id, a]) =>
      before.has(id) && JSON.stringify(before.get(id)) !== JSON.stringify(a),
  ).length;
  return {
    status,
    issues,
    missingSlots,
    newEvents: [...current.keys()].filter((id) => !before.has(id)).length,
    corrections,
    removedEvents: removed.length,
  };
}
export function resolveDay(input: Edition[]) {
  const versions = [...input].sort(
    (a, b) =>
      revision(b) - revision(a) ||
      b.revision - a.revision ||
      a.sha256.localeCompare(b.sha256) ||
      a.id.localeCompare(b.id),
  );
  const assessed = versions.map((edition) => ({
    edition,
    assessment: assessVersion(edition, versions),
  }));
  const available = assessed.some((v) => !v.edition.deleted)
    ? assessed.filter((v) => !v.edition.deleted)
    : assessed;
  const reliable = available.find((v) => v.assessment.status === "COMPLETE");
  const fallback =
    available.find((v) => !v.assessment.issues.length) || available[0];
  return {
    versions: assessed,
    reliable: reliable?.edition,
    current: (reliable || fallback)?.edition,
    status: (reliable || fallback)?.assessment.status || ("UNKNOWN" as const),
  };
}
export function currentEditions(editions: Edition[]) {
  const result: Edition[] = [];
  const seen = new Set<string>();
  for (const edition of editions) {
    if (!isDayVersion(edition)) {
      result.push(edition);
      continue;
    }
    if (seen.has(edition.dayKey!)) continue;
    seen.add(edition.dayKey!);
    const current = resolveDay(
      editions.filter((e) => isDayVersion(e) && e.dayKey === edition.dayKey),
    ).current;
    if (current) result.push(current);
  }
  return result;
}
export async function editorialUUID(value: string) {
  const hex = await hash(new TextEncoder().encode(value));
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
