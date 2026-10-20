import { dayKeyOf, resolveDay } from "./day";
import { sortEditions, type Article, type Edition } from "./model";

export interface IndexedArticle {
  key: string;
  article: Article;
  edition: Edition;
  group: string;
  versions: string[];
}

export const normalizeArticleSearch = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr");

// Keep every article, including ones only present in an older import. Within a
// day/family, show its latest version using the same ordering as the library.
export function indexArticles(editions: Edition[]): IndexedArticle[] {
  const groups = new Map<string, Edition[]>();
  for (const edition of sortEditions(editions.filter((e) => !e.deleted))) {
    const group = dayKeyOf(edition) || edition.familyId;
    const versions = groups.get(group) || [];
    versions.push(edition);
    groups.set(group, versions);
  }
  const result: IndexedArticle[] = [];
  for (const [group, editions] of groups) {
    const indexed = new Map<string, IndexedArticle>();
    for (const edition of resolveDay(editions).versions.map((v) => v.edition)) {
      for (const article of edition.articles) {
        const identity = JSON.stringify([group, article.eventId || article.id]);
        const existing = indexed.get(identity);
        if (existing) {
          if (!existing.versions.includes(edition.id))
            existing.versions.push(edition.id);
        } else {
          indexed.set(identity, {
            key: identity,
            article,
            edition,
            group,
            versions: [edition.id],
          });
        }
      }
    }
    result.push(...indexed.values());
  }
  // Cross-universe aliases require an explicit eventId and a V7 anchor on the
  // same editorial date. Never merge unrelated legacy titles or other days.
  const anchors = new Map(
    result
      .filter((i) => i.edition.unified && i.article.eventId)
      .map((i) => [JSON.stringify([i.edition.date, i.article.eventId]), i]),
  );
  return result.filter((item) => {
    const anchor =
      item.article.eventId &&
      anchors.get(JSON.stringify([item.edition.date, item.article.eventId]));
    if (!anchor || anchor === item) return true;
    for (const id of item.versions)
      if (!anchor.versions.includes(id)) anchor.versions.push(id);
    return false;
  });
}

export function matchesArticle(item: IndexedArticle, query: string) {
  if (!query.trim()) return true;
  const text = normalizeArticleSearch(
    [
      item.article.title,
      item.article.text,
      item.article.category,
      item.edition.title,
      ...item.article.sources,
    ].join(" "),
  );
  return normalizeArticleSearch(query)
    .trim()
    .split(/\s+/)
    .every((word) => text.includes(word));
}
