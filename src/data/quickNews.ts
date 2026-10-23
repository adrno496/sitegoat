import { indexArticles, type IndexedArticle } from "./articles";
import type { Edition } from "./model";
import { indexQuickBriefs, type IndexedBrief } from "./quickBriefs";

export interface QuickNewsTitle {
  key: string;
  title: string;
  theme: string;
  publishedAt: string;
  edition: Edition;
  article?: IndexedArticle;
  brief?: IndexedBrief;
  source?: { publisher: string; url: string };
  evidenceStatus: string;
  googleQuery?: string;
}

function publicationOrder(date: string, edition: Edition, slot?: string) {
  // Full instants carry their own timezone. Date-only publications use the
  // editorial slot in Paris, never the time the file happened to be imported.
  if (date.includes("T")) return new Date(date).toISOString();
  const local = `${date}T${slot || edition.editionSlot || "00:00"}:00`;
  const noon = new Date(`${date}T12:00:00Z`);
  const offset = new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Paris",
    timeZoneName: "longOffset",
  })
    .formatToParts(noon)
    .find((p) => p.type === "timeZoneName")!.value;
  return new Date(`${local}${offset.replace("GMT", "") || "Z"}`).toISOString();
}

export function articlePublicationOrder({
  article,
  edition,
}: IndexedArticle): string {
  const item = edition.unified?.items.find(
    (i) => i.eventId === article.eventId,
  );
  const date = item?.publishedAt || edition.date || article.date;
  return date ? publicationOrder(date, edition, article.firstSeenSlot) : "";
}

export function latestPublicationDate(dates: Iterable<string>): string {
  let latest = "";
  for (const date of dates) if (date > latest) latest = date;
  return latest;
}

// A read-only projection of the same complete article index as Articles. No
// backfill or mutation of imported files is required, including for old HTMLs.
export function indexQuickNews(editions: Edition[]): QuickNewsTitle[] {
  const articles = indexArticles(editions);
  const rows: QuickNewsTitle[] = articles.map((article) => {
    const { edition, article: a } = article;
    const item = edition.unified?.items.find((i) => i.eventId === a.eventId);
    const source = item?.sourceRecords[0];
    return {
      key: `article:${article.key}`,
      title: a.title,
      theme: a.category,
      publishedAt: articlePublicationOrder(article),
      edition,
      article,
      source: source
        ? { publisher: source.publisher || source.label, url: source.url }
        : a.sources[0]
          ? { publisher: "Source", url: a.sources[0] }
          : undefined,
      evidenceStatus: item?.evidenceStatus || "",
      googleQuery: item?.publicResearchQuestion,
    };
  });
  const byEvent = new Map(
    rows
      .filter((r) => r.article?.article.eventId)
      .map((r) => [
        JSON.stringify([r.edition.date, r.article!.article.eventId]),
        r,
      ]),
  );
  for (const brief of indexQuickBriefs(editions)) {
    const i = brief.item;
    const article = byEvent.get(
      JSON.stringify([
        brief.edition.date,
        i.relatedArticleEventId || i.eventId,
      ]),
    );
    if (article) {
      article.brief = brief;
      continue;
    }
    rows.push({
      key: `brief:${brief.key}`,
      title: i.title,
      theme: i.theme,
      publishedAt: publicationOrder(i.publishedAt, brief.edition),
      edition: brief.edition,
      brief,
      source: i.source,
      evidenceStatus: i.evidenceStatus,
      googleQuery: i.googleQuery,
    });
  }
  return rows.sort(
    (a, b) =>
      b.publishedAt.localeCompare(a.publishedAt) || a.key.localeCompare(b.key),
  );
}
