import type { Edition } from "./model";
import { hash } from "./model";
import { scheduleFor, V7_SCHEDULE, validDate, type Slot } from "./editorial";
export function journalFilenameDate(filename: string): string | undefined {
  const date = filename.match(
    /^(?:LE[_ -])?JOURNAL[_ -]?360[_ -](\d{4}-\d{2}-\d{2})(?:[_ .-]|$)/i,
  )?.[1];
  return date && validDate(date) ? date : undefined;
}
// Group existing records too, including older/quarantined/independent imports.
// A missing date is never replaced with today's date or the import date.
export function dayKeyOf(e: Edition): string | undefined {
  // Dedicated folders contain independent documents, even on the same date.
  if (e.collection) return undefined;
  const date =
    e.date && validDate(e.date) ? e.date : journalFilenameDate(e.filename);
  if (date) return `journal360-day-${date}`;
  return e.dayKey &&
    validDate(e.dayKey.slice(15)) &&
    e.dayKey.startsWith("journal360-day-")
    ? e.dayKey
    : undefined;
}
export function isDayVersion(e: Edition) {
  return !!dayKeyOf(e);
}
function publicationMinute(e: Edition) {
  if (e.editionSlot)
    return +e.editionSlot.slice(0, 2) * 60 + +e.editionSlot.slice(3);
  const clock = e.filename.match(
    /(?:^|[_ -])EDITION[_ -](\d{2})H(\d{2})?(?=[_ .-]|$)/i,
  );
  if (clock && +clock[1] < 24 && +(clock[2] || 0) < 60)
    return +clock[1] * 60 + +(clock[2] || 0);
  return Math.max(
    -1,
    ...(e.slotsIncluded || []).map((s) => +s.slice(0, 2) * 60 + +s.slice(3)),
  );
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
  const SLOTS = scheduleFor(e);
  const slots = e.slotsIncluded || [];
  const lastSlot = Math.max(-1, ...slots.map((s) => SLOTS.indexOf(s)));
  const missingSlots = [
    ...new Set([
      ...(e.missingSlots || []),
      ...SLOTS.slice(0, lastSlot + 1).filter((s) => !slots.includes(s)),
    ]),
  ];
  const peers = versions.filter(
    (v) =>
      v.id !== e.id &&
      v.sha256 !== e.sha256 &&
      (v.scheduleId || "legacy-3") === (e.scheduleId || "legacy-3"),
  );
  if (e.scheduleId === V7_SCHEDULE) {
    const received = new Set([e, ...peers].map((v) => v.editionSlot));
    const absent = SLOTS.slice(0, lastSlot + 1).filter((s) => !received.has(s));
    for (const slot of absent)
      if (!missingSlots.includes(slot)) missingSlots.push(slot);
    if (e.unified?.sourcesNotVerified.length)
      issues.push("Sources non vérifiées déclarées.");
    if (
      !e.sourceVerifiedAt ||
      e.unified?.items.some((i) => i.evidenceStatus === "unverified")
    )
      issues.push(
        "Vérification éditoriale insuffisante pour le cumul déclaré.",
      );
    const sequence = [e, ...peers].filter(
      (v) => v.editionSlot && v.editionSlot <= e.editionSlot!,
    );
    if (
      sequence.some((v) =>
        sequence.some(
          (other) =>
            other.id !== v.id &&
            other.sha256 !== v.sha256 &&
            other.externalRevision === v.externalRevision,
        ),
      )
    )
      issues.push(
        "Une révision de la chaîne présente plusieurs contenus concurrents.",
      );
  }
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
  if (e.scheduleId === V7_SCHEDULE) {
    for (const [id, article] of current) {
      if (
        before.get(id)?.firstSeenSlot &&
        before.get(id)?.firstSeenSlot !== article.firstSeenSlot
      )
        issues.push(`Première apparition modifiée pour ${id}.`);
    }
  }
  const removed = [...before.keys()].filter((id) => !current.has(id));
  if (!revision(e) || !slots.length)
    issues.push("Révision ou créneaux manquants.");
  if (missingSlots.length)
    issues.push(`Créneaux manquants : ${missingSlots.join(", ")}.`);
  if (revision(e) && peers.some((v) => revision(v) === revision(e)))
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
  const minutes = new Map(input.map((e) => [e, publicationMinute(e)]));
  const versions = [...input].sort(
    (a, b) =>
      minutes.get(b)! - minutes.get(a)! ||
      revision(b) - revision(a) ||
      b.importedAt.localeCompare(a.importedAt) ||
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
  // Completeness remains a warning, not a reason to keep opening an earlier
  // intraday version. Originals/annotations stay in the explicit history.
  const current = available[0];
  return {
    versions: assessed,
    reliable: reliable?.edition,
    current: current?.edition,
    status: current?.assessment.status || ("UNKNOWN" as const),
  };
}
export function currentEditions(editions: Edition[]) {
  const result: Edition[] = [];
  const groups = new Map<string, Edition[]>();
  for (const edition of editions) {
    const key = dayKeyOf(edition);
    if (!key) {
      result.push(edition);
      continue;
    }
    const group = groups.get(key) || [];
    group.push(edition);
    groups.set(key, group);
  }
  for (const group of groups.values()) {
    const current = resolveDay(group).current;
    if (current) result.push(current);
  }
  return result;
}
export async function editorialUUID(value: string) {
  const hex = await hash(new TextEncoder().encode(value));
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
