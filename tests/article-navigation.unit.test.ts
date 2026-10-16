import { expect, it } from "vitest";
import { isolatedHTML } from "../src/features/import";
import { articleReadingQuestion } from "../src/features/googleAi";
import { v643HTML, v643Question } from "./helpers/v643";
import type { Article } from "../src/data/model";
const bytes = (text: string) => new TextEncoder().encode(text);

it("retrouve la question explicite par identifiant, sans utiliser le texte d’un autre article", () => {
  const source = bytes(v643HTML());
  expect(articleReadingQuestion(source, "article-3")).toBe(v643Question(3));
  expect(articleReadingQuestion(source, "absent")).toBeNull();
  expect(
    articleReadingQuestion(
      bytes(v643HTML({ schemaVersion: "6.5" })),
      "article-3",
    ),
  ).toBeNull();
});
it.each(["6.1", "6.4", "6.4.4"])(
  "questions des articles déjà importés au format %s",
  (schemaVersion) => {
    expect(
      articleReadingQuestion(bytes(v643HTML({ schemaVersion })), "article-2"),
    ).toBe(v643Question(2));
  },
);
it.each(["", "x".repeat(2001), "Question\u0000", "Question\u202e", null])(
  "refuse une question absente ou invalide : cas %#",
  (aiQuestion) => {
    const source = bytes(
      v643HTML({
        items: [
          { id: "a", title: "Texte privé, pas une question", aiQuestion },
        ],
      }),
    );
    expect(articleReadingQuestion(source, "a")).toBeNull();
  },
);
it("une question dupliquée garde la première occurrence, comme l’index d’import", () => {
  const source = bytes(
    v643HTML({
      items: [
        { id: "a", aiQuestion: "Première question ?" },
        { id: "a", aiQuestion: "Seconde question ?" },
      ],
    }),
  );
  expect(articleReadingQuestion(source, "a")).toBe("Première question ?");
});
const target: Article = {
  id: "x</script><script>parent.hacked=true</script>",
  title: "Titre <script>test</script>",
  category: "Science",
  text: "Texte intégral <img src=x onerror=alert(1)>",
  sources: [],
};
it("la navigation n’exécute pas les identifiants ou le texte et conserve le sandbox sécurisé", () => {
  const source = bytes(v643HTML());
  const interactive = new DOMParser().parseFromString(
    isolatedHTML(source, true, target),
    "text/html",
  );
  const routing = [...interactive.scripts].find((s) =>
    s.textContent?.includes("const target={"),
  )!;
  expect(routing.textContent).toContain("\\u003c/script>");
  expect(
    [...interactive.scripts].some(
      (s) => s.textContent === "parent.hacked=true",
    ),
  ).toBe(false);
  const safe = new DOMParser().parseFromString(
    isolatedHTML(source, false, target),
    "text/html",
  );
  expect(safe.scripts).toHaveLength(0);
  expect(safe.body.hasAttribute("data-journal360-fallback")).toBe(true);
  expect(
    safe.querySelector("#journal360-requested-article h1")?.textContent,
  ).toBe(target.title);
  expect(safe.querySelector("#journal360-requested-article img")).toBeNull();
});
