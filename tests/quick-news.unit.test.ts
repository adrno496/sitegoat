import { expect, it } from "vitest";
import { inspectHTML } from "../src/features/import";
import { indexQuickNews } from "../src/data/quickNews";
import { editionDateTime } from "../src/features/eventPresentation";
import { v9Fixture } from "./helpers/v9";
import { v643HTML } from "./helpers/v643";

it("reprend 183 articles historiques sans compagnon, inclut les archives et les prochains articles", async () => {
  const e = await inspectHTML(
    "legacy.html",
    new TextEncoder().encode(v643HTML()),
  );
  e.archived = true;
  e.articles = Array.from({ length: 183 }, (_, n) => ({
    ...e.articles[0],
    id: `local-${n}`,
    eventId: undefined,
    title: `Titre historique ${n}`,
  }));
  expect(indexQuickNews([e])).toHaveLength(183);
  const next = {
    ...e,
    id: crypto.randomUUID(),
    familyId: crypto.randomUUID(),
    date: "2026-10-22",
    dayKey: undefined,
    archived: false,
    articles: [{ ...e.articles[0], id: "new", title: "Nouveau titre" }],
  };
  const rows = indexQuickNews([e, next]);
  expect(rows).toHaveLength(184);
  expect(rows[0].title).toBe("Nouveau titre");
  expect(rows.every((r) => r.article)).toBe(true);
  expect(indexQuickNews([{ ...e, deleted: true }])).toEqual([]);
});

it("regroupe les promotions explicites sans fusionner les titres identiques ni perdre les versions", async () => {
  const early = v9Fixture("08:00"),
    late = v9Fixture("10:00");
  const a = await inspectHTML("early.html", early.bytes);
  const b = await inspectHTML("late.html", late.bytes);
  b.quickBriefs!.items[0].relatedArticleEventId = b.unified!.items[0].eventId;
  b.quickBriefs!.items[0].title = b.unified!.items[1].title;
  const rows = indexQuickNews([a, b]);
  expect(rows).toHaveLength(b.articles.length);
  const promoted = rows.find(
    (r) => r.article?.article.eventId === b.unified!.items[0].eventId,
  )!;
  expect(promoted.brief?.history).toHaveLength(1);
  expect(promoted.title).toBe(b.unified!.items[0].title);
  expect(promoted.article!.edition.id).toBe(b.id);
});

it("trie par date de publication et heure réelle, indépendamment de l’ordre des imports", async () => {
  const e = await inspectHTML("test.html", v9Fixture().bytes);
  e.quickBriefs = undefined;
  e.unified!.items[0].publishedAt = "2026-10-20T22:00:00+02:00";
  e.unified!.items[1].publishedAt = "2026-10-20T21:30:00Z";
  e.unified!.items[2].publishedAt = "2026-10-21T08:00:00+02:00";
  const rows = indexQuickNews([e]);
  expect(
    rows.findIndex(
      (r) => r.article?.article.eventId === e.unified!.items[2].eventId,
    ),
  ).toBeLessThan(
    rows.findIndex(
      (r) => r.article?.article.eventId === e.unified!.items[1].eventId,
    ),
  );
  expect(
    rows.findIndex(
      (r) => r.article?.article.eventId === e.unified!.items[1].eventId,
    ),
  ).toBeLessThan(
    rows.findIndex(
      (r) => r.article?.article.eventId === e.unified!.items[0].eventId,
    ),
  );
});

it("affiche la date et le créneau d’édition en français sans inventer d’heure absente", async () => {
  const e = await inspectHTML("test.html", v9Fixture().bytes);
  e.date = "2026-10-22";
  e.editionSlot = "22:00";
  expect(editionDateTime(e)).toBe("22 octobre 2026 22H00");
  e.editionSlot = undefined;
  expect(editionDateTime(e)).toBe("22 octobre 2026");
});
