import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { isolatedHTML, inspectHTML } from "../src/features/import";
import { needsOriginalInteractions } from "../src/features/originalReading";
import { dynamicFixture, readingHours } from "./helpers/dynamic-unified";
const parse = (bytes: Uint8Array) =>
  new DOMParser().parseFromString(new TextDecoder().decode(bytes), "text/html");
it.each(readingHours)(
  "édition %s h : styles, structure et ordre d’origine conservés, scripts désactivés",
  async (hour) => {
    const { bytes, p } = dynamicFixture(hour);
    const original = parse(bytes),
      before = bytes.slice();
    const edition = await inspectHTML(`dynamic-${hour}.html`, bytes);
    const doc = new DOMParser().parseFromString(
      isolatedHTML(bytes, false),
      "text/html",
    );
    expect(
      [...doc.querySelectorAll("style")].map((s) => s.textContent),
    ).toEqual(
      [...original.querySelectorAll("style")].map((s) => s.textContent),
    );
    expect(doc.querySelector("#view")!.outerHTML).toBe(
      original.querySelector("#view")!.outerHTML,
    );
    expect(doc.querySelector("#nav")!.outerHTML).toBe(
      original.querySelector("#nav")!.outerHTML,
    );
    expect(doc.body.getAttributeNames()).toEqual(
      original.body.getAttributeNames(),
    );
    expect(doc.querySelector("[data-journal360-safe-unified]")).toBeNull();
    expect(
      doc.querySelectorAll("script,iframe,object,embed,link"),
    ).toHaveLength(0);
    expect(
      doc
        .querySelector('meta[http-equiv="Content-Security-Policy"]')!
        .getAttribute("content"),
    ).toContain("script-src 'none'");
    expect(needsOriginalInteractions(bytes, p)).toBe(true);
    expect(bytes).toEqual(before);
    expect(edition.unified).toEqual(p);
  },
);
it("le mode interactif garde le moteur, les données et les styles du fichier", () => {
  const { bytes } = dynamicFixture("16"),
    original = parse(bytes);
  const doc = new DOMParser().parseFromString(
    isolatedHTML(bytes, true),
    "text/html",
  );
  expect(doc.querySelector("#unifiedData")!.textContent).toBe(
    original.querySelector("#unifiedData")!.textContent,
  );
  for (const s of original.querySelectorAll("script"))
    expect(
      [...doc.querySelectorAll("script")].map((s) => s.textContent),
    ).toContain(s.textContent);
  expect([...doc.querySelectorAll("style")].map((s) => s.textContent)).toEqual(
    [...original.querySelectorAll("style")].map((s) => s.textContent),
  );
  expect(
    doc
      .querySelector('meta[http-equiv="Content-Security-Policy"]')!
      .getAttribute("content"),
  ).toContain("connect-src 'none'");
});
it("les magazines statiques restent affichables sans interactions", async () => {
  const bytes = new Uint8Array(
    readFileSync("tests/fixtures/v8/snapshot-22.html"),
  );
  const e = await inspectHTML("static.html", bytes);
  expect(needsOriginalInteractions(bytes, e.unified)).toBe(false);
  const doc = new DOMParser().parseFromString(
    isolatedHTML(bytes, false),
    "text/html",
  );
  expect(doc.querySelectorAll("article").length).toBeGreaterThan(0);
  expect(needsOriginalInteractions(bytes)).toBe(false);
});
it("le HTML hostile reste inerte en mode sécurisé sans autorisation implicite", () => {
  const bytes = new TextEncoder().encode(
    '<main><h1>Original</h1><img src="https://example.org/x" onerror="globalThis.bad=true"><iframe src="https://example.org"></iframe></main><script>globalThis.bad=true</script>',
  );
  const doc = new DOMParser().parseFromString(
    isolatedHTML(bytes, false),
    "text/html",
  );
  expect(doc.querySelectorAll("script,iframe,[onerror],img[src]")).toHaveLength(
    0,
  );
  expect(doc.querySelector("main h1")!.textContent).toBe("Original");
});
