import { expect, it } from "vitest";
import { inspectHTML, isolatedHTML } from "../src/features/import";
import {
  readingQuestions,
  validateGoogleAiUrl,
} from "../src/features/googleAi";
import { hash } from "../src/data/model";
import { v61HTML } from "./helpers/v61";
const bytes = (extra?: Record<string, unknown>) =>
  new TextEncoder().encode(v61HTML(extra));
it('accepte le schéma producteur "6.1" sans changer le schéma local ni les octets', async () => {
  const original = bytes();
  const before = await hash(original);
  const e = await inspectHTML("synthetic.html", original);
  expect(e.schemaVersion).toBe(2);
  expect(e.dayKey).toBe("journal360-day-2026-10-15");
  expect(e.externalRevision).toBe(1);
  expect(e.articles).toHaveLength(9);
  expect(e.sourceVerifiedAt).toBe("2026-10-15T08:00:00+02:00");
  expect(e.warnings.some((x) => x.includes("version inconnue"))).toBe(false);
  isolatedHTML(original, true);
  expect(await hash(original)).toBe(before);
});
it.each(["6.2", "6.10", 6.1, {}, true])(
  "ne généralise pas les versions de schéma inconnues : %s",
  async (schemaVersion) => {
    const e = await inspectHTML("synthetic.html", bytes({ schemaVersion }));
    expect(e.dayKey).toBeUndefined();
    expect(e.articles).toHaveLength(9);
  },
);
it("adapte seulement les questions explicites des 9 articles et 2 thèmes, même après lecture sûre ou rechargement", () => {
  const original = bytes();
  expect(readingQuestions(original)).toHaveLength(11);
  for (const interactive of [false, true, true]) {
    const d = new DOMParser().parseFromString(
      isolatedHTML(original, interactive),
      "text/html",
    );
    expect(
      d.querySelectorAll('button[data-ai-link="google-ai-mode"]'),
    ).toHaveLength(11);
    expect(
      d
        .querySelector('[data-topic="sentinel"]')
        ?.getAttribute("data-ai-question"),
    ).toBe("Question publique synthétique sentinel");
    expect(
      JSON.parse(d.getElementById("editionData")?.textContent || "{}")
        .schemaVersion,
    ).toBe(interactive ? "6.1" : undefined);
  }
  expect(
    validateGoogleAiUrl("https://www.google.com/search?hl=fr&q=Question"),
  ).toBeNull();
});
it.each(["x".repeat(2001), "Question\u0000", "Question\u202e", null])(
  "refuse une question V6.1 invalide sans copier le texte de l’article",
  (question) => {
    const original = bytes({
      items: [
        {
          id: "a1",
          title: "Article",
          aiQuestion: question,
          plain: "Texte privé sans rapport",
        },
      ],
    });
    const d = new DOMParser().parseFromString(
      isolatedHTML(original, true),
      "text/html",
    );
    expect(
      d.querySelector('[data-article="a1"]')?.hasAttribute("data-ai-link"),
    ).toBe(false);
    expect(readingQuestions(original)).not.toContain(
      "Texte privé sans rapport",
    );
  },
);
it("garde les href fragments intacts pour JS et les rend locaux sans JS, sans toucher SVG ni CSP", () => {
  const original = new TextEncoder().encode(
    '<html><body><a href="#section">Rubrique</a><area href="#section"><svg><use href="#icon"></use></svg><h2 id="section">Titre</h2></body></html>',
  );
  for (const interactive of [true, false]) {
    const d = new DOMParser().parseFromString(
      isolatedHTML(original, interactive),
      "text/html",
    );
    expect(d.querySelector("a")?.getAttribute("href")).toBe(
      interactive ? "#section" : "about:srcdoc#section",
    );
    expect(d.querySelector("use")?.getAttribute("href")).toBe("#icon");
    expect(
      d
        .querySelector('meta[http-equiv="Content-Security-Policy"]')
        ?.getAttribute("content"),
    ).toContain("base-uri 'none'");
    if (!interactive) expect(d.querySelectorAll("script")).toHaveLength(0);
  }
});
