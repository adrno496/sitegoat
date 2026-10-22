import { parisClock } from "./editorial";
import type { UnifiedEdition } from "./unified";
import type { Edition } from "./model";
import { resolveDay } from "./day";
import {
  quickBriefsSchema,
  type QuickBriefs,
  type QuickBrief,
} from "./quickBriefsSchema";
export {
  quickBriefsSchema,
  type QuickBriefs,
  type QuickBrief,
} from "./quickBriefsSchema";

export function extractQuickBriefs(
  doc: Document,
  unified?: UnifiedEdition,
  at = new Date(),
): QuickBriefs | undefined {
  const blocks = doc.querySelectorAll("#quickBriefsData");
  if (!blocks.length) return;
  if (
    blocks.length !== 1 ||
    !blocks[0].matches('script[type="application/json"]')
  )
    throw Error("Un seul bloc quickBriefsData JSON inerte est autorisé.");
  const raw = blocks[0].textContent || "";
  if (new TextEncoder().encode(raw).length > 512 * 1024)
    throw Error("Compagnon brèves limité à 512 Ko.");
  const p = quickBriefsSchema.parse(JSON.parse(raw));
  if (
    !unified ||
    p.editionId !== unified.editionId ||
    p.editionDate !== unified.editionDate ||
    p.editionSlot !== unified.editionSlot
  )
    throw Error("Le compagnon brèves ne correspond pas à l’édition V7.");
  const today = parisClock(at).date;
  for (const i of p.items) {
    if (
      i.publishedAt > today ||
      i.eventDate > today ||
      i.corrections?.some((c) => Date.parse(c.at) > +at + 300000)
    )
      throw Error("Date future dans les brèves.");
    if (
      i.relatedArticleEventId &&
      !unified.items.some((a) => a.eventId === i.relatedArticleEventId)
    )
      throw Error("Promotion vers un article absent du snapshot.");
  }
  return p;
}

export interface IndexedBrief {
  key: string;
  item: QuickBrief;
  edition: Edition;
  history: { item: QuickBrief; edition: Edition }[];
  promoted: boolean;
}
// A stable producer eventId is its identity, not its mutable title or URL.
// Each historical source remains attached to its original immutable HTML.
export function indexQuickBriefs(editions: Edition[]): IndexedBrief[] {
  const rows = new Map<string, IndexedBrief>();
  const live = editions.filter((e) => !e.deleted);
  const days = new Map<string, Edition[]>();
  for (const e of live) {
    const key = e.date || e.id;
    days.set(key, [...(days.get(key) || []), e]);
  }
  for (const [date, versions] of [...days].sort(([a], [b]) =>
    b.localeCompare(a),
  )) {
    const articles = new Set(
      versions.flatMap((e) => e.unified?.items.map((i) => i.eventId) || []),
    );
    for (const e of resolveDay(versions).versions.map((v) => v.edition))
      for (const item of e.quickBriefs?.items || []) {
        const key = JSON.stringify([date, item.eventId]);
        const previous = rows.get(key);
        if (previous) previous.history.push({ item, edition: e });
        else
          rows.set(key, {
            key,
            item,
            edition: e,
            history: [],
            promoted: articles.has(item.relatedArticleEventId || item.eventId),
          });
      }
  }
  return [...rows.values()];
}
