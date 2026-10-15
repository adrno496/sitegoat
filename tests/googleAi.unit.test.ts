import { describe, expect, it } from "vitest";
import {
  validateGoogleAiUrl,
  parseGoogleAiMessage,
  googleAiQuestionDestination,
} from "../src/features/googleAi";
import { isolatedHTML, inspectHTML } from "../src/features/import";
import { hash } from "../src/data/model";

const base = "https://www.google.com/search?hl=fr&udm=50&q=";
describe("Google Mode IA : validation fermée", () => {
  it("construit le lien Mode IA depuis le seul texte et conserve accents, ponctuation et emoji", () => {
    const query =
      "Pourquoi le ciel est-il bleu ? + & % # @ 🙂 $(commande) https://example.com/?redirect=x";
    const destination = googleAiQuestionDestination(query)!;
    expect(destination.query).toBe(query);
    const url = new URL(destination.url);
    expect(url.origin + url.pathname).toBe("https://www.google.com/search");
    expect([...url.searchParams]).toEqual([
      ["hl", "fr"],
      ["udm", "50"],
      ["q", query],
    ]);
    expect(validateGoogleAiUrl(destination.url)).toEqual(destination);
  });
  it.each([
    null,
    "",
    "x".repeat(2001),
    "é".repeat(1000),
    "a\nsecret",
    "a\u202esecret",
    "\ud800",
  ])(
    "ne tronque ni ne répare une question impropre au préremplissage : cas %#",
    (question) => expect(googleAiQuestionDestination(question)).toBeNull(),
  );
  it("accepte une question publique encodée sans l’exécuter ni la compléter", () => {
    const query = "Comprendre le climat & $(commande) <script> # @";
    const url = base + encodeURIComponent(query);
    expect(validateGoogleAiUrl(url)).toEqual({ url, query });
    expect(
      validateGoogleAiUrl("https://www.google.com/search?q=Question&udm=50"),
    ).not.toBeNull();
    expect(validateGoogleAiUrl(base + "x".repeat(2000))).not.toBeNull();
  });
  it.each([
    null,
    {},
    4,
    "",
    "javascript:alert(1)",
    "http://www.google.com/search?udm=50&q=x",
    "//www.google.com/search?udm=50&q=x",
    "https://www.google.com.evil.example/search?udm=50&q=x",
    "https://google.com.evil.example/search?udm=50&q=x",
    "https://google.com/search?udm=50&q=x",
    "https://www.google.com@evil.example/search?udm=50&q=x",
    "https://user:password@www.google.com/search?udm=50&q=x",
    "https://www.google.com:444/search?udm=50&q=x",
    "https://www.google.com:443/search?udm=50&q=x",
    "https://WWW.GOOGLE.COM/search?udm=50&q=x",
    "https://%77ww.google.com/search?udm=50&q=x",
    "https://www.google.com/other/../search?udm=50&q=x",
    "https://www.google.com/search/?udm=50&q=x",
    "https://www.google.com/se%61rch?udm=50&q=x",
    "https://www.google.com\\@evil.example/search?udm=50&q=x",
    base + "test#fragment",
    " " + base + "test",
    base + "a b",
    base + "%ZZ",
    base + "%C0%AF",
    base + "%00",
    base + "%0Asecret",
    base + "%E2%80%AEgoogle",
    base + "",
    base + "+",
    base + "x".repeat(2001),
    base + "x".repeat(4097),
    base + "test&url=https://evil.example",
    base + "test&redirect=https://evil.example",
    base + "test&continue=https://evil.example",
    base + "test&next=https://evil.example",
    base + "test&q=autre",
    base + "test&udm=50",
    base + "test&hl=fr",
    base + "test&",
    "https://www.google.com/search?hl=en&udm=50&q=x",
    "https://www.google.com/search?udm=5&q=x",
    "https://www.google.com/search?udm=50",
    "https://www.google.com/search?q=x",
    "https://www.google.com/search?%75dm=50&q=x",
  ])("refuse une destination invalide : %s", (value) => {
    expect(validateGoogleAiUrl(value)).toBeNull();
  });
  it("ignore types, versions et payloads inconnus", () => {
    const capability = {
      type: "journal360:google-ai:capability-request",
      version: 1,
    };
    const open = {
      type: "journal360:google-ai:open-request",
      version: 1,
      url: base + "test",
    };
    expect(parseGoogleAiMessage(capability)).toEqual({
      type: "capability",
      version: 1,
    });
    expect(parseGoogleAiMessage(open)?.type).toBe("open");
    for (const value of [
      null,
      [],
      "message",
      { ...capability, version: "1" },
      { ...open, version: 2 },
      { ...open, type: "open" },
      { ...open, url: {} },
      { ...open, redirect: true },
      { ...capability, url: open.url },
      { type: open.type, url: open.url },
      Object.assign(Object.create(open), { url: open.url, x: 1, y: 2 }),
    ]) {
      expect(parseGoogleAiMessage(value)).toBeNull();
    }
  });
});

it("copie interactive : seul le lien Google marqué est adapté, sans changer les CSP ni l’original JSON/HTML", async () => {
  const original = `<html><head><title>Contrat Google IA</title></head><body>
    <a id="ai" data-ai-link="google-ai-mode" href="${base}Question">En savoir plus</a>
    <a id="other" href="https://example.com/">Autre</a>
    <a id="redirect" data-ai-link="google-ai-mode" href="${base}Q&amp;url=https://evil.example">Redirect</a>
    <a id="forged" data-ai-link="google-ai-mode" data-journal360-google-ai-url="${base}Fake">Faux</a>
    <script type="application/json" id="editionData">{"title":"Contrat Google IA","items":[]}</script>
    <script>window.originalScript = true;</script></body></html>`;
  const bytes = new TextEncoder().encode(original);
  const checksum = await hash(bytes);
  const before = await inspectHTML("contrat.html", bytes);
  for (const interactive of [false, true]) {
    const doc = new DOMParser().parseFromString(
      isolatedHTML(bytes, interactive),
      "text/html",
    );
    expect(
      doc
        .querySelector('meta[http-equiv="Content-Security-Policy"]')
        ?.getAttribute("content"),
    ).toBe(
      `default-src 'none'; script-src ${interactive ? "'unsafe-inline'" : "'none'"}; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'; object-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'`,
    );
    expect(doc.querySelector("#ai")?.getAttribute("href")).toBe(
      interactive ? "#" : null,
    );
    expect(
      doc.querySelector("#ai")?.getAttribute("data-journal360-google-ai-url"),
    ).toBe(interactive ? base + "Question" : null);
    for (const id of ["other", "redirect", "forged"]) {
      expect(doc.querySelector(`#${id}`)?.hasAttribute("href")).toBe(false);
      expect(
        doc
          .querySelector(`#${id}`)
          ?.hasAttribute("data-journal360-google-ai-url"),
      ).toBe(false);
    }
    if (!interactive) expect(doc.querySelectorAll("script")).toHaveLength(0);
    else
      expect(doc.querySelector("#editionData")?.textContent).toBe(
        '{"title":"Contrat Google IA","items":[]}',
      );
  }
  expect(new TextDecoder().decode(bytes)).toBe(original);
  expect(await hash(bytes)).toBe(checksum);
  const after = await inspectHTML("contrat.html", bytes);
  expect(after.articles).toEqual(before.articles);
  expect(after.sha256).toBe(before.sha256);
});
