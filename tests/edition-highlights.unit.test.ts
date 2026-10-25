import { expect, it } from "vitest";
import { inspectHTML } from "../src/features/import";
import { indexArticles } from "../src/data/articles";
import { indexQuickBriefs } from "../src/data/quickBriefs";
import {
  belongsToLatestEdition,
  isLatestArticle,
  isLatestBrief,
  latestEditorialEdition,
} from "../src/data/editionHighlights";
import { v9Fixture } from "./helpers/v9";
async function edition(slot: "08:00" | "10:00" = "10:00") {
  return inspectHTML(`edition-${slot}.html`, v9Fixture(slot).bytes);
}
it("orange : plusieurs heures du dernier créneau, nouveautés et corrections ; ancien inchangé neutre", async () => {
  const e = await edition();
  const p = e.unified!;
  p.items[4].publishedAt = `${e.date}T10:03:00+02:00`;
  p.items[5].publishedAt = `${e.date}T10:47:00+02:00`;
  p.items[6].firstSeenSlot = "08:00";
  p.items[6].publishedAt = `${e.date}T08:00:00+02:00`;
  p.items[6].lastChangedAt = `${e.date}T10:15:00+02:00`;
  p.items[7].firstSeenSlot = "08:00";
  p.items[7].publishedAt =
    p.items[7].lastChangedAt = `${e.date}T08:00:00+02:00`;
  expect(
    indexArticles([e])
      .filter((a) => isLatestArticle(a, e))
      .map((a) => a.article.eventId)
      .sort(),
  ).toEqual(
    p.items
      .slice(4, 7)
      .map((i) => i.eventId)
      .sort(),
  );
});
it("orange : import ancien tardif, archives et corbeille ne déplacent pas la dernière édition", async () => {
  const old = await edition("08:00"),
    recent = await edition();
  old.importedAt = "2026-10-25T11:00:00Z";
  recent.importedAt = "2026-10-25T10:00:00Z";
  expect(latestEditorialEdition([old, recent])?.id).toBe(recent.id);
  expect(belongsToLatestEdition(old, recent, { firstSeenSlot: "08:00" })).toBe(
    false,
  );
  expect(latestEditorialEdition([{ ...recent, deleted: true }, old])?.id).toBe(
    old.id,
  );
  expect(latestEditorialEdition([{ ...recent, archived: true }, old])?.id).toBe(
    old.id,
  );
});
it("orange : brève répétée neutre avec historique, ajout et correction orange", async () => {
  const old = await edition("08:00"),
    recent = await edition();
  let rows = indexQuickBriefs([old, recent]);
  expect(isLatestBrief(rows[0], recent)).toBe(false);
  recent.quickBriefs!.items[0].title = "Correction de la dernière édition";
  rows = indexQuickBriefs([old, recent]);
  expect(isLatestBrief(rows[0], recent)).toBe(true);
  expect(isLatestBrief(indexQuickBriefs([recent])[0], recent)).toBe(true);
});
it("orange : créneau de Paris, changement d’heure et bornes du créneau", async () => {
  const e = {
    ...(await edition()),
    date: "2026-10-25",
    editionSlot: "08:00" as const,
  };
  expect(
    belongsToLatestEdition(e, e, { lastChangedAt: "2026-10-25T06:59:00Z" }),
  ).toBe(false);
  expect(
    belongsToLatestEdition(e, e, { lastChangedAt: "2026-10-25T07:01:00Z" }),
  ).toBe(true);
  expect(
    belongsToLatestEdition(e, e, { lastChangedAt: "2026-10-25T09:00:00Z" }),
  ).toBe(false);
  expect(belongsToLatestEdition(e, e, { lastChangedAt: "invalid" })).toBe(
    false,
  );
});
