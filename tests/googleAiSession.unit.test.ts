import { describe, expect, it } from "vitest";
import {
  GoogleAiSession,
  GOOGLE_AI_SESSION_TTL,
} from "../src/features/googleAiSession";
import {
  googleAiQuestionDestination,
  publicQuestionIssue,
  validateGoogleDestination,
} from "../src/features/googleAi";
function request(session: GoogleAiSession, overrides = {}) {
  return {
    type: "journal360:google-ai:question-request",
    version: 3,
    nonce: session.capability(0).nonce,
    requestId: crypto.randomUUID().replaceAll("-", ""),
    question: "Pourquoi le ciel est-il bleu ?",
    ...overrides,
  };
}
describe("session Google liée au cadre et à durée bornée", () => {
  it("refuse un rejeu, expire puis renouvelle le nonce et isole deux cadres", () => {
    const first = new GoogleAiSession(0),
      second = new GoogleAiSession(0);
    const packet = request(first);
    expect(first.accept(packet, 1)?.message.type).toBe("open");
    expect(first.accept(packet, 2)).toBeNull();
    expect(second.accept(packet, 1)).toBeNull();
    const next = {
      ...packet,
      requestId: crypto.randomUUID().replaceAll("-", ""),
    };
    expect(first.accept(next, GOOGLE_AI_SESSION_TTL)).toBeNull();
    expect(first.capability(GOOGLE_AI_SESSION_TTL).nonce).not.toBe(
      packet.nonce,
    );
    expect(first.accept(next, GOOGLE_AI_SESSION_TTL + 1)).toBeNull();
  });
  it.each([
    { nonce: "bad" },
    { nonce: "x".repeat(4097) },
    { requestId: "" },
    { requestId: 42 },
    { version: 1 },
    { version: 2 },
    { version: "3" },
    { extra: true },
    { type: "unknown" },
    { question: "x".repeat(2001) },
    { question: "secret\nvalue" },
    { url: "https://evil.example/" },
  ])("schéma fermé et borné : %#", (overrides) => {
    const session = new GoogleAiSession(0);
    expect(session.accept(request(session, overrides), 1)).toBeNull();
  });
  it("borne la mémoire des identifiants utilisés et permet une nouvelle session", () => {
    const session = new GoogleAiSession(0),
      nonce = session.capability(0).nonce;
    for (let i = 0; i < 256; i++)
      expect(
        session.accept(
          {
            ...request(session),
            nonce,
            requestId: i.toString(16).padStart(32, "0"),
          },
          1,
        ),
      ).not.toBeNull();
    expect(session.capability(1).nonce).not.toBe(nonce);
  });
});
it("recherche classique encodée, entrée IA sans question, aucune redirection", () => {
  const question = "Question publique : CERN–Mistral, + & % # 🙂";
  const destination = googleAiQuestionDestination(question)!;
  expect([...new URL(destination.url).searchParams]).toEqual([
    ["hl", "fr"],
    ["q", question],
  ]);
  expect(validateGoogleDestination("https://www.google.com/ai")?.query).toBe(
    "",
  );
  for (const value of [
    "https://www.google.com/ai?q=secret",
    "https://www.google.com/search?hl=fr&q=x&continue=https://evil.example",
    "https://www.google.com:443/search?q=x",
    "https://www.google.com.evil.example/search?q=x",
    "http://www.google.com/search?q=x",
    "//www.google.com/search?q=x",
    "https://www.google.com@evil.example/search?q=x",
    "javascript:alert(1)",
    "https://www.google.com/search?q=%C0%AF",
  ])
    expect(validateGoogleDestination(value)).toBeNull();
});
it.each([
  "Projet AXDIA",
  "Projet ＡＸＤＩＡ",
  "SEN\u200bTINEL",
  "SENTINEL client interne",
  "api_key=exemplefictif",
  "client: Exemple",
  "Contact fictif alice@example.test",
  "sb_secret_FAUX_EXEMPLE",
  "Serveur 192.168.1.8",
  "/Users/exemple/private",
])("détecte des marqueurs sensibles connus sans envoi : %s", (question) => {
  expect(publicQuestionIssue(question)).not.toBeNull();
});
it("ne présente pas un filtre comme une garantie universelle de confidentialité", () => {
  expect(publicQuestionIssue("Pourquoi le ciel est-il bleu ?")).toBeNull();
  // Unknown private names cannot be inferred: the parent still requests review.
  expect(publicQuestionIssue("Que fait le projet inconnu Zeta ?")).toBeNull();
});
