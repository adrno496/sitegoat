import { expect, it } from "vitest";
import {
  nextSearchAt,
  parseRecurringSearches,
  recurringGoogleUrl,
  serializeRecurringSearches,
  type RecurringSearch,
} from "../src/features/v9/recurringSearchModel";

const search: RecurringSearch = {
  id: "c80e135b-7f7c-4fa8-b330-f6363c6464e8",
  theme: "IA & énergie",
  query: 'IA & énergie "France" + recherche ?',
  cadence: "daily",
  lastOpenedAt: null,
};

it("conserve les thèmes, requêtes, fréquences et consultations sans modifier le texte", () => {
  expect(parseRecurringSearches(null)).toEqual([]);
  expect(parseRecurringSearches(serializeRecurringSearches([search]))).toEqual([
    search,
  ]);
  for (const raw of [
    "{",
    '{"version":2,"items":[]}',
    JSON.stringify({ version: 1, items: [{ ...search, cadence: "hourly" }] }),
    JSON.stringify({
      version: 1,
      items: [{ ...search, lastOpenedAt: "invalide" }],
    }),
  ])
    expect(() => parseRecurringSearches(raw)).toThrow();
});

it.each([
  ["daily", "d"],
  ["weekly", "w"],
  ["monthly", "m"],
] as const)(
  "construit une recherche Google %s avec la période et l’encodage exacts",
  (cadence, period) => {
    const url = new URL(recurringGoogleUrl({ ...search, cadence }));
    expect(url.origin + url.pathname).toBe("https://www.google.com/search");
    expect(url.searchParams.get("q")).toBe(search.query);
    expect(url.searchParams.get("tbs")).toBe(`qdr:${period}`);
    expect(url.searchParams.get("hl")).toBe("fr");
  },
);

it("calcule les prochaines consultations et borne les mois courts, y compris bissextiles", () => {
  expect(nextSearchAt(search)).toBeNull();
  expect(
    nextSearchAt({
      ...search,
      lastOpenedAt: "2026-10-22T18:00:00Z",
    })?.toISOString(),
  ).toBe("2026-10-23T18:00:00.000Z");
  expect(
    nextSearchAt({
      ...search,
      cadence: "weekly",
      lastOpenedAt: "2026-10-22T18:00:00Z",
    })?.toISOString(),
  ).toBe("2026-10-29T18:00:00.000Z");
  expect(
    nextSearchAt({
      ...search,
      cadence: "monthly",
      lastOpenedAt: "2026-01-31T18:00:00Z",
    })?.toISOString(),
  ).toBe("2026-02-28T18:00:00.000Z");
  expect(
    nextSearchAt({
      ...search,
      cadence: "monthly",
      lastOpenedAt: "2028-01-31T18:00:00Z",
    })?.toISOString(),
  ).toBe("2028-02-29T18:00:00.000Z");
});
