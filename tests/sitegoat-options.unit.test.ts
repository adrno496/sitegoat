import { it, expect } from "vitest";
import { inspectHTML } from "../src/features/import";
import { indexArticles } from "../src/data/articles";
import { auditHTML, auditPayload } from "./helpers/audit";
import {
  readingExport,
  personalReviewTemplate,
} from "../src/features/readingExports";
it("O-07 : texte intégral, sources et SHA ; HTML inerte, données hostiles échappées et Markdown verbatim", async () => {
  const p = auditPayload("10");
  p.items[0].detail =
    "Texte intégral avec <script>alert(1)</script> et ``` et [clic](javascript:alert(1))";
  p.items[0].summary = "Une vraie synthèse, inchangée.";
  const bytes = auditHTML(p),
    e = await inspectHTML("test.html", bytes),
    row = indexArticles([e]).find(
      (r) => r.article.eventId === p.items[0].eventId,
    )!;
  const html = readingExport(row, "html"),
    d = new DOMParser().parseFromString(html, "text/html");
  expect(
    d.querySelectorAll("script,iframe,object,embed,img,style"),
  ).toHaveLength(0);
  expect(
    d.querySelector('meta[http-equiv="Content-Security-Policy"]'),
  ).not.toBeNull();
  expect(d.body.textContent).toContain(p.items[0].detail);
  expect(d.body.textContent).toContain(e.sha256);
  expect(d.body.textContent).toContain(p.items[0].summary);
  const markdown = readingExport(row, "md");
  expect(markdown).toContain(p.items[0].detail);
  expect(markdown).toContain("````text");
  expect(markdown).toContain(e.sha256);
  expect(Buffer.from(await crypto.subtle.digest("SHA-256", bytes)).toString("hex")).toBe(e.sha256);
});
it("O-02/05 : modèles légers dans les notes existantes, dates personnelles et aucune vérification inventée", () => {
  const at = new Date("2026-10-24T12:00Z");
  expect(personalReviewTemplate("counterproof", at)).toContain("2026-10-24");
  for (const field of [
    "Affirmation",
    "Source",
    "Objection",
    "Conclusion personnelle",
  ])
    expect(personalReviewTemplate("counterproof", at)).toContain(field);
  expect(personalReviewTemplate("review", at)).toContain("[ ] À revoir");
  expect(personalReviewTemplate("review", at)).toContain(
    "Aucun statut fact-checké automatique",
  );
});
