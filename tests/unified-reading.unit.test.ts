import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { isolatedHTML, inspectHTML } from "../src/features/import";
import { dynamicFixture, readingHours } from "./helpers/dynamic-unified";
it.each(readingHours)(
  "une édition %s h dynamique est intégralement lisible sans script",
  async (hour) => {
    const { bytes, p } = dynamicFixture(hour);
    const edition = await inspectHTML(`dynamic-${hour}.html`, bytes);
    const doc = new DOMParser().parseFromString(
      isolatedHTML(bytes, false),
      "text/html",
    );
    expect(doc.querySelector("[data-journal360-safe-unified]")).not.toBeNull();
    expect(
      doc.querySelectorAll("script,iframe,object,embed,link"),
    ).toHaveLength(0);
    expect(
      doc
        .querySelector('meta[http-equiv="Content-Security-Policy"]')!
        .getAttribute("content"),
    ).toContain("script-src 'none'");
    expect(
      doc.querySelectorAll("article[data-journal360-article]"),
    ).toHaveLength(p.items.length);
    for (const i of p.items) {
      const a = [...doc.querySelectorAll("article")].find(
        (a) => a.getAttribute("data-journal360-article") === i.id,
      )!;
      expect(a.textContent).toContain(i.summary);
      expect(a.textContent).toContain(i.plain);
      expect(a.textContent).toContain(i.detail);
    }
    for (const pm of p.promptAssets)
      expect(
        [...doc.querySelectorAll("textarea")].map((t) => t.value),
      ).toContain(pm.content);
    expect(
      [...doc.querySelectorAll("a")].every((a) =>
        a.getAttribute("href")!.startsWith("about:srcdoc#"),
      ),
    ).toBe(true);
    expect(edition.unified).toEqual(p);
  },
);
it("la sélection mène au bon récit canonique et conserve tous les autres", async () => {
  const { bytes, p } = dynamicFixture("10");
  const e = await inspectHTML("dynamic.html", bytes);
  const target = e.articles.at(-1)!;
  const doc = new DOMParser().parseFromString(
    isolatedHTML(bytes, false, target),
    "text/html",
  );
  expect(
    doc.querySelector("article")!.getAttribute("data-journal360-article"),
  ).toBe(target.id);
  expect(doc.querySelector("article")!.textContent).toContain(
    p.items.find((i) => i.id === target.id)!.detail,
  );
  expect(doc.querySelectorAll("article")).toHaveLength(8);
});
it("une édition statique existante garde sa présentation ; le mode interactif reste explicite", () => {
  const bytes = new Uint8Array(
    readFileSync("tests/fixtures/v8/snapshot-22.html"),
  );
  const staticDoc = new DOMParser().parseFromString(
    isolatedHTML(bytes, false),
    "text/html",
  );
  expect(staticDoc.querySelector("[data-journal360-safe-unified]")).toBeNull();
  const dynamic = dynamicFixture("10").bytes;
  const interactive = new DOMParser().parseFromString(
    isolatedHTML(dynamic, true),
    "text/html",
  );
  expect(
    interactive.querySelector("[data-journal360-safe-unified]"),
  ).toBeNull();
  expect(interactive.querySelectorAll("script").length).toBeGreaterThan(0);
});
it("texte hostile et fermeture textarea restent inertes dans la projection ; données invalides non projetées", () => {
  const { p } = dynamicFixture("10");
  p.items[0].detail =
    '<img src=x onerror="globalThis.bad=true"><script>globalThis.bad=true</script>';
  p.promptAssets[0].content =
    '</textarea><img src=x onerror="globalThis.bad=true">';
  const encode = (v: unknown) =>
    new TextEncoder().encode(
      `<main></main><script id="unifiedData" type="application/json">${JSON.stringify(v).replaceAll("<", "\\u003c")}</script>`,
    );
  const doc = new DOMParser().parseFromString(
    isolatedHTML(encode(p), false),
    "text/html",
  );
  expect(doc.querySelectorAll("script,img,[onerror]")).toHaveLength(0);
  expect([...doc.querySelectorAll("textarea")].map((t) => t.value)).toContain(
    p.promptAssets[0].content,
  );
  const invalid = new DOMParser().parseFromString(
    isolatedHTML(encode({ ...p, schemaVersion: 999 }), false),
    "text/html",
  );
  expect(invalid.querySelector("[data-journal360-safe-unified]")).toBeNull();
});
