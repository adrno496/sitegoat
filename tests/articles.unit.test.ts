import { expect, it } from "vitest";
import { indexArticles, matchesArticle } from "../src/data/articles";
import { inspectHTML } from "../src/features/import";
import { v643HTML } from "./helpers/v643";

async function edition(extra: Record<string, unknown> = {}, hour = "16") {
  return inspectHTML(
    `LE_JOURNAL_360_2026-10-15_EDITION_${hour}H.html`,
    new TextEncoder().encode(v643HTML(extra)),
  );
}
it("regroupe les versions par journée, conserve les articles absents du dernier cumul et choisit le bon créneau", async () => {
  const early = await edition({}, "08");
  const late = await edition(
    {
      items: [
        {
          id: "changed-id",
          event_id: "fixture-event-1",
          title: "Article corrigé",
          category: "Énergie",
          plain: "Nouvelle analyse électrique",
          sources: [],
        },
      ],
    },
    "16",
  );
  // An older publication imported after the newer one must not replace it.
  early.importedAt = "2026-10-16T18:00:00Z";
  late.importedAt = "2026-10-16T17:00:00Z";
  const result = indexArticles([early, late]);
  expect(result).toHaveLength(3);
  expect(result[0].article.title).toBe("Article corrigé");
  expect(result[0].edition.id).toBe(late.id);
  expect(result[0].versions).toEqual([late.id, early.id]);
  expect(result[1].edition.id).toBe(early.id);
  expect(matchesArticle(result[0], "ENERGIE electrique")).toBe(true);
  expect(matchesArticle(result[0], "énergie absent")).toBe(false);
});
it("inclut les archives, exclut la corbeille et conserve un même sujet dans deux journées distinctes", async () => {
  const first = await edition();
  const second = {
    ...(await edition({ editionDate: "2026-10-16" })),
    archived: true,
  };
  const deleted = {
    ...(await edition({ editionDate: "2026-10-17" })),
    deleted: true,
  };
  const result = indexArticles([first, second, deleted]);
  expect(result).toHaveLength(6);
  expect(new Set(result.map((i) => i.key)).size).toBe(6);
  expect(result[0].edition.id).toBe(second.id);
  expect(result.some((i) => i.edition.deleted)).toBe(false);
});
it("les identifiants locaux sans event_id se regroupent seulement dans leur famille", async () => {
  const source = await edition({
    items: [
      {
        id: "local-1",
        title: "Sans événement",
        category: "Science",
        plain: "Texte",
        sources: ["https://example.com/primary"],
      },
    ],
  });
  const first = {
    ...source,
    filename: "independant.html",
    date: null,
    dayKey: undefined,
  };
  const revision = {
    ...first,
    id: crypto.randomUUID(),
    importedAt: "2026-10-17T18:00:00Z",
  };
  const independent = {
    ...first,
    id: crypto.randomUUID(),
    familyId: crypto.randomUUID(),
  };
  expect(indexArticles([first, revision, independent])).toHaveLength(2);
  expect(matchesArticle(indexArticles([first])[0], "example.com/primary")).toBe(
    true,
  );
});
