import { currentEditions } from "./day";
import { parisClock, scheduleFor } from "./editorial";
import { sortEditions, type Edition } from "./model";
import type { IndexedArticle } from "./articles";
import type { IndexedBrief } from "./quickBriefs";

type EditionItem = {
  firstSeenSlot?: string;
  publishedAt?: string;
  lastChangedAt?: string;
  editorialChangeAt?: string;
};

export function latestEditorialEdition(editions: Edition[]) {
  const live = editions.filter((e) => !e.deleted && !e.archived);
  const journals = live.filter((e) => !e.collection);
  return sortEditions(currentEditions(journals.length ? journals : live))[0];
}

// Compare the editorial slot in Paris, never the import time or a maximum
// publication instant: one edition may contain several different timestamps.
export function belongsToLatestEdition(
  edition: Edition,
  latest: Edition | undefined,
  item: EditionItem,
) {
  if (!latest || edition.id !== latest.id) return false;
  if (!edition.editionSlot || !edition.date) return true;
  if (item.firstSeenSlot === edition.editionSlot) return true;
  const next = scheduleFor(edition).find((slot) => slot > edition.editionSlot!);
  return [item.lastChangedAt, item.editorialChangeAt, item.publishedAt].some(
    (at) => {
      if (!at || !at.includes("T") || !Number.isFinite(Date.parse(at)))
        return false;
      const local = parisClock(new Date(at));
      return (
        local.date === edition.date &&
        local.time >= edition.editionSlot! &&
        (!next || local.time < next)
      );
    },
  );
}

export function isLatestArticle(
  item: IndexedArticle,
  latest: Edition | undefined,
) {
  const unified = item.edition.unified?.items.find(
    (i) => i.eventId === item.article.eventId,
  );
  return belongsToLatestEdition(item.edition, latest, unified || item.article);
}

export function isLatestBrief(
  brief: IndexedBrief,
  latest: Edition | undefined,
) {
  if (!latest || brief.edition.id !== latest.id) return false;
  // Companions have day-only dates. When a previous snapshot exists, unchanged
  // repeated briefs keep their neutral appearance. No hour is manufactured.
  const previous = brief.history.find(
    (h) => !h.edition.deleted && h.edition.id !== brief.edition.id,
  );
  return (
    !previous || JSON.stringify(previous.item) !== JSON.stringify(brief.item)
  );
}
