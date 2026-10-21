import type { Edition } from "./model";
import type { Assessment } from "./day";
import { V7_SLOTS, type Slot } from "./editorial";
import type { UnifiedEdition } from "./unified";

export interface SnapshotAssessment {
  integrity: "VALID";
  autonomy: "AUTONOMOUS" | "INCOMPLETE" | "UNVERIFIABLE";
  coverage: "VERIFIED_COMPLETE" | "PARTIAL" | "UNKNOWN";
  history: "FULL_CHAIN" | "SOME_VERSIONS_MISSING" | "SINGLE_SNAPSHOT";
  importedFiles: number;
  nonImportedSlots: Slot[];
  availableArticles: number;
  comparisonAvailable: boolean;
  newEventIds: string[];
  omittedEvents: string[];
  omittedAnnexes: string[];
  conflict: boolean;
}
const key = (i: UnifiedEdition["items"][number]) =>
  JSON.stringify([i.sourceWatch, i.eventId]);
// Verification timestamps alone are not an editorial correction.
const content = (i: UnifiedEdition["items"][number]) =>
  JSON.stringify([
    i.title,
    i.summary,
    i.plain,
    i.detail,
    i.category,
    i.sourceRecords.map((s) => [s.id, s.url]),
    i.importance,
  ]);

// Called only for schema/hash-validated imported metadata. No claim about the
// truth of sources, and no dependency on physical intermediate imports.
export function assessSnapshot(e: Edition, peers: Edition[]): Assessment {
  const p = e.unified!;
  const issues: string[] = [];
  const prior = peers
    .filter(
      (v) =>
        v.unified &&
        (v.unified.editionSlot < p.editionSlot ||
          (v.unified.editionSlot === p.editionSlot &&
            v.unified.revision < p.revision)),
    )
    .sort(
      (a, b) =>
        a.unified!.editionSlot.localeCompare(b.unified!.editionSlot) ||
        a.unified!.revision - b.unified!.revision ||
        a.sha256.localeCompare(b.sha256),
    );
  const before = new Map(
    prior.flatMap((v) => v.unified!.items.map((i) => [key(i), i] as const)),
  );
  const current = new Map(p.items.map((i) => [key(i), i]));
  const omittedEvents = [...before]
    .filter(([id]) => !current.has(id))
    .map(([, i]) => i.eventId);
  const indexed = new Set(
    e.articles.map((a) => JSON.stringify([a.sourceWatch, a.eventId])),
  );
  const notIndexed = p.items.filter((i) => !indexed.has(key(i)));
  const annexes = (p: UnifiedEdition) => [
    ...p.promptAssets.map((a) => `prompt:${a.promptId}`),
    ...p.futureInsights.map((a) => `jalon:${a.id}`),
    ...p.futureDocuments.map((a) => `dossier:${a.documentId}`),
    ...p.economicSnapshots.map(
      (a) => `économie:${a.zone}:${a.provider}:${a.seriesCode}:${a.period}`,
    ),
  ];
  const presentAnnexes = new Set(annexes(p));
  const omittedAnnexes = [
    ...new Set(prior.flatMap((v) => annexes(v.unified!))),
  ].filter((id) => !presentAnnexes.has(id));
  const conflict = peers.some(
    (v) =>
      v.unified?.editionSlot === p.editionSlot &&
      v.unified.revision === p.revision,
  );
  if (conflict)
    issues.push(
      "Même créneau et révision, contenus concurrents : choix courant provisoire, originaux conservés.",
    );
  if (notIndexed.length)
    issues.push(
      `${notIndexed.length} article(s) embarqué(s) absent(s) de l’index : contenu indisponible à vérifier.`,
    );
  if (omittedEvents.length)
    issues.push(
      `Contenu du snapshot incomplet par rapport aux versions locales : ${omittedEvents.join(", ")}. Articles conservés dans leur original et la recherche.`,
    );
  if (omittedAnnexes.length)
    issues.push(
      `Annexes absentes de ce snapshot, conservées avec provenance dans les versions locales : ${omittedAnnexes.join(", ")}.`,
    );
  let corrections = 0;
  for (const [id, item] of current) {
    const old = before.get(id);
    if (!old) continue;
    if (old.firstSeenSlot !== item.firstSeenSlot)
      issues.push(`Première apparition modifiée pour ${item.eventId}.`);
    if (content(old) !== content(item)) {
      corrections++;
      if (!item.corrections.length)
        issues.push(
          `Modification sans correction documentée pour ${item.eventId} : comparaison à vérifier.`,
        );
    }
  }
  if (p.cumulativeStatus === "PARTIAL" || p.missingSlots.length)
    issues.push(
      "Couverture déclarée partielle par le producteur ; cela ne décrit pas les fichiers importés.",
    );
  if (
    p.sourcesNotVerified.length ||
    p.items.some((i) => i.evidenceStatus === "unverified")
  )
    issues.push(
      "Sources non vérifiées déclarées : couverture des faits non certifiée.",
    );
  const received = new Set([
    p.editionSlot,
    ...peers.flatMap((v) => (v.unified ? [v.unified.editionSlot] : [])),
  ]);
  const nonImportedSlots = V7_SLOTS.slice(
    0,
    V7_SLOTS.indexOf(p.editionSlot) + 1,
  ).filter((s) => !received.has(s));
  const snapshot: SnapshotAssessment = {
    integrity: "VALID",
    autonomy:
      omittedEvents.length || omittedAnnexes.length || notIndexed.length
        ? "INCOMPLETE"
        : "AUTONOMOUS",
    // No independent, trusted producer registry exists in this application.
    coverage: issues.length ? "PARTIAL" : "UNKNOWN",
    history:
      peers.length === 0
        ? "SINGLE_SNAPSHOT"
        : nonImportedSlots.length
          ? "SOME_VERSIONS_MISSING"
          : "FULL_CHAIN",
    importedFiles: 1 + peers.length,
    nonImportedSlots,
    availableArticles: p.items.length - notIndexed.length,
    comparisonAvailable: prior.length > 0,
    newEventIds: prior.length
      ? [...current].filter(([k]) => !before.has(k)).map(([, i]) => i.eventId)
      : [],
    omittedEvents,
    omittedAnnexes,
    conflict,
  };
  return {
    status: snapshot.coverage === "PARTIAL" ? "PARTIAL" : "UNKNOWN",
    issues,
    missingSlots: p.missingSlots,
    newEvents: prior.length
      ? [...current.keys()].filter((k) => !before.has(k)).length
      : 0,
    corrections,
    removedEvents: omittedEvents.length,
    snapshot,
  };
}
