import type { Article, Edition, ReadingState } from "./model";
import { dayKeyOf, resolveDay } from "./day";

export interface ReadingChanges {
  kind: "first" | "seen" | "history" | "unavailable" | "compared";
  added: Article[];
  updated: Article[];
  missing: number;
}
// Only explicit, unique event identifiers establish continuity between files.
// Array positions, titles and generated extraction IDs are not identities.
export function readingChanges(
  edition: Edition,
  editions: Edition[],
  states: ReadingState[],
): ReadingChanges {
  const empty = { added: [], updated: [], missing: 0 };
  const key = dayKeyOf(edition);
  const versions = editions.filter((e) =>
    key ? dayKeyOf(e) === key : e.id === edition.id,
  );
  const opened = new Set(
    states
      .filter(
        (s) =>
          s.articleId === "edition" &&
          s.openedAt &&
          Number.isFinite(Date.parse(s.openedAt)),
      )
      .map((s) => s.editionId),
  );
  const before = resolveDay(versions.filter((e) => opened.has(e.id))).current;
  if (!before) return { kind: "first", ...empty };
  if (before.id === edition.id) return { kind: "seen", ...empty };
  if (resolveDay([before, edition]).current?.id !== edition.id)
    return { kind: "history", ...empty };
  const identifiable = (articles: Article[]) =>
    articles.length > 0 &&
    articles.every((a) => !!a.eventId) &&
    new Set(articles.map((a) => a.eventId)).size === articles.length;
  if (!identifiable(before.articles) || !identifiable(edition.articles))
    return { kind: "unavailable", ...empty };
  const previous = new Map(before.articles.map((a) => [a.eventId!, a]));
  const current = new Set(edition.articles.map((a) => a.eventId!));
  const content = (a: Article) =>
    JSON.stringify([
      a.title,
      a.text,
      a.category,
      a.sources,
      a.kind,
      a.date,
      a.editorialChangeAt,
    ]);
  return {
    kind: "compared",
    added: edition.articles.filter((a) => !previous.has(a.eventId!)),
    updated: edition.articles.filter((a) => {
      const old = previous.get(a.eventId!);
      return old && content(old) !== content(a);
    }),
    missing: before.articles.filter((a) => !current.has(a.eventId!)).length,
  };
}
export function changesLabel(changes: ReadingChanges) {
  return `${changes.added.length} nouveauté${changes.added.length > 1 ? "s" : ""} · ${changes.updated.length} mise${changes.updated.length > 1 ? "s" : ""} à jour`;
}
