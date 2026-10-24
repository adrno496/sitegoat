import { it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import {
  instantCompare,
  editorialDate,
  evidenceLabel,
  EditorialMetadata,
} from "../src/features/editorialPresentation";
import { inspectHTML } from "../src/features/import";
import { v9Fixture } from "./helpers/v9";
it("SG-14 : instants UTC, offsets, DST, égalités stables et invalides", () => {
  expect(
    instantCompare("2026-10-19T08:00Z", "2026-10-19T09:00+02:00"),
  ).toBeGreaterThan(0);
  expect(
    instantCompare("2026-10-25T02:30+02:00", "2026-10-25T02:15+01:00"),
  ).toBeLessThan(0);
  expect(instantCompare("2026-10-19T08:00Z", "2026-10-19T09:00+01:00")).toBe(0);
  expect(instantCompare("bad", "2026-10-19")).toBeLessThan(0);
  expect(instantCompare(undefined, "bad")).toBe(0);
  const entries = [
    { id: "A", at: "2026-10-19T08:00Z" },
    { id: "B", at: "2026-10-19T10:00+02:00" },
  ];
  expect([...entries].sort((a, b) => instantCompare(b.at, a.at))).toEqual(
    entries,
  );
});
it("SG-01/10 : pas d’heure inventée, deux vocabulaires, champs manquants", async () => {
  expect(editorialDate("2026-10-24")).toContain("heure non fournie");
  expect(editorialDate("2026-10-24")).not.toContain("10:00");
  expect(editorialDate("bad")).toBe("inconnue");
  expect(editorialDate("2026-02-30")).toBe("inconnue");
  expect(editorialDate("2026-10-19T08:00Z")).toContain("10:00");
  for (const status of ["sourced", "unverified", "hypothesis"])
    expect(evidenceLabel(status)).not.toContain("inconnu");
  for (const status of [
    "presse-sourcée",
    "source-primaire",
    "annoncé",
    "déduit",
    "contesté",
    "non-testé",
  ])
    expect(evidenceLabel(status, true)).not.toContain("inconnu");
  expect(evidenceLabel("source-primaire")).toContain("inconnu");
  expect(evidenceLabel("sourced", true)).toContain("inconnu");
  const e = await inspectHTML("test.html", v9Fixture().bytes);
  const html = renderToStaticMarkup(
    createElement(EditorialMetadata, {
      edition: e,
      item: { publishedAt: "2026-10-01", evidenceStatus: "hypothesis" },
    }),
  );
  expect(html).toContain("Hypothèse");
  expect(html).toContain("Publié le");
  expect(html).toContain("Import du");
  expect(html).toContain("Édition du");
});

it("R-04 : enums refusés avec chemin exact et diagnostic français sans réparation", async () => {
  const { auditPayload } = await import("./helpers/audit");
  const { validateUnified } = await import("../src/data/unified");
  const p = auditPayload("10");
  p.items[0].evidenceStatus = "source-primaire" as never;
  expect(() => validateUnified(p)).toThrow(
    "items.0.evidenceStatus : Valeur non admise",
  );
  expect(p.items[0].evidenceStatus).toBe("source-primaire");
});
