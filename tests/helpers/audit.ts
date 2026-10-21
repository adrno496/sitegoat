import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import type { UnifiedEdition } from "../../src/data/unified";
export function auditPayload(hour: "08" | "10"): UnifiedEdition {
  const p: UnifiedEdition = JSON.parse(
    readFileSync("tests/fixtures/v8/snapshot-22.json", "utf8"),
  );
  const slot = `${hour}:00` as "08:00" | "10:00";
  p.title = `Audit ciblé ${slot} SYNTHÉTIQUE`;
  p.editionSlot = slot;
  p.revision = hour === "08" ? 1 : 2;
  p.slotsIncluded = hour === "08" ? ["08:00"] : ["08:00", "10:00"];
  const at = `${p.editionDate}T${slot}:00+02:00`;
  p.sourceVerifiedAt = at;
  p.coverageWindow.to = p.sourceVerifiedAt;
  p.items = p.items.slice(0, hour === "08" ? 4 : 8).map((i, n) => ({
    ...i,
    firstSeenSlot: n < 4 ? "08:00" : "10:00",
    lastChangedAt: at,
    publishedAt: at,
    verifiedAt: p.sourceVerifiedAt,
    summary: `Première phrase ${n} intacte. Deuxième phrase avec 3,5 % et M. Dupont. Troisième phrase à garder en développement. Quatrième phrase complète.`,
    actions: [],
  }));
  // Retained items remain byte-identical between slots, except verification.
  for (let n = 0; n < Math.min(4, p.items.length); n++) {
    p.items[n].lastChangedAt = `${p.editionDate}T08:00:00+02:00`;
    p.items[n].publishedAt = `${p.editionDate}T08:00:00+02:00`;
  }
  p.synthesis.eventIds = p.items.map((i) => i.eventId);
  p.futureInsights = Array.from({ length: hour === "08" ? 5 : 6 }, (_, n) => ({
    ...p.futureInsights[0],
    id: `audit-insight-${n}`,
    title: `Jalon ${n} SYNTHÉTIQUE`,
  }));
  const third = {
    ...p.promptAssets[0],
    promptId: "audit-third-prompt",
    filename: "audit-third.md",
    content: "# Audit synthétique\n\nTexte du troisième prompt intégral.\n",
  };
  third.sha256 = createHash("sha256").update(third.content).digest("hex");
  if (hour === "10") p.promptAssets.push(third);
  return p;
}
export function auditHTML(p: UnifiedEdition) {
  return Buffer.from(
    `<!doctype html><html lang="fr"><title>${p.title}</title><h1>${p.title}</h1>${p.items.map((i) => `<article id="${i.id}"><h2>${i.title}</h2><p>${i.plain}</p><p>${i.detail}</p></article>`).join("")}<script id="unifiedData" type="application/json">${JSON.stringify(p).replaceAll("<", "\\u003c")}</script></html>`,
  );
}
export function auditBytes(hour: "08" | "10") {
  return process.env.SITEGOAT_AUDIT_REAL_DIR
    ? readFileSync(
        `${process.env.SITEGOAT_AUDIT_REAL_DIR}/JOURNAL_360_V8_2026-10-21_EDITION_${hour}H_AUTONOME.html`,
      )
    : auditHTML(auditPayload(hour));
}

export function auditLoadPayload(count: number, date?: string): UnifiedEdition {
  const p = auditPayload("10");
  p.revision = count;
  if (date) {
    p.editionDate = date;
    p.editionId = `journal360-day-${date}`;
    p.coverageWindow = {
      from: `${date}T00:00:00+02:00`,
      to: `${date}T10:00:00+02:00`,
    };
    p.sourceVerifiedAt = `${date}T10:00:00+02:00`;
  }
  p.items = Array.from({ length: count }, (_, n) => ({
    ...p.items[n % 8],
    id: `audit-load-article-${n}`,
    eventId: `audit-load-event-${n}`,
    title: `Charge SYNTHÉTIQUE ${date || p.editionDate} ${n}`,
    summary: `Résumé synthétique ${n}. Deuxième phrase. Troisième phrase.`,
    plain: `Texte intégral ${n}.`,
    detail: "Détails synthétiques complets.",
    importanceReason: "Démo",
    unknowns: "",
    changed: "",
    publicResearchQuestion: "",
    sourceRecords: [
      {
        id: "s",
        label: "Source fictive",
        url: "https://example.org/",
        publisher: "Exemple",
        publishedAt: "2026-10-19",
        verifiedAt: p.sourceVerifiedAt,
      },
    ],
    relatedEventIds: [],
    actions: [],
    corrections: [],
  }));
  p.promptAssets = [];
  p.futureInsights = [];
  p.futureDocuments = [];
  p.synthesis.eventIds = p.items.slice(0, 8).map((i) => i.eventId);
  return p;
}
