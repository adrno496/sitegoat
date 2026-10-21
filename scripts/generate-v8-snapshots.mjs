// Deterministic local fixtures only. No real news, network, or producer registry.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
const root = "tests/fixtures/v8";
mkdirSync(root, { recursive: true });
const base = JSON.parse(
  readFileSync("public/examples/unified/edition-2200.json", "utf8"),
);
const slots = [
  "08:00",
  "10:00",
  "12:00",
  "14:00",
  "16:00",
  "18:00",
  "20:00",
  "22:00",
];
const escape = (s) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
for (let n = 1; n <= 8; n++) {
  const p = structuredClone(base);
  p.editionSlot = slots[n - 1];
  p.revision = n;
  p.slotsIncluded = slots.slice(0, n);
  p.title = `Journal 360° V8 — ${p.editionSlot} — SYNTHÉTIQUE`;
  const at = `${p.editionDate}T${p.editionSlot}:00+02:00`;
  p.sourceVerifiedAt = at;
  p.coverageWindow.to = at;
  p.items = slots.slice(0, n).map((slot, i) => ({
    ...structuredClone(base.items[i % 4]),
    eventId: `event-v8-${String.fromCharCode(65 + i)}`,
    id: `article-v8-${String.fromCharCode(65 + i)}`,
    title: `Événement ${String.fromCharCode(65 + i)} SYNTHÉTIQUE`,
    firstSeenSlot: slot,
    lastChangedAt: `${p.editionDate}T${slot}:00+02:00`,
    publishedAt: `${p.editionDate}T${slot}:00+02:00`,
    verifiedAt: at,
    plain: `Récit intégral ${String.fromCharCode(65 + i)} — témoin alphav8${i}. Aucun fait réel.`,
    summary: `Résumé narratif ${String.fromCharCode(65 + i)} fictif, conservé sans dépendre d'un ancien import.`,
    detail: `Analyse détaillée ${String.fromCharCode(65 + i)} synthétique. Limites et sources de démonstration.`,
    actions: [],
    corrections: [],
    relatedEventIds: [],
    importance: i < 3 ? "important" : "context",
  }));
  p.synthesis.eventIds = p.items.map((i) => i.eventId);
  p.synthesis.text =
    "Démonstration SYNTHÉTIQUE d'un snapshot autonome. Les récits A à H sont introduits à huit horaires distincts. Le fichier tardif embarque les récits antérieurs. Quatre zones économiques et deux jalons testent les annexes. Les prompts sont des audits fictifs complets, jamais une recommandation réelle.";
  p.promptAssets = base.promptAssets.map((p) => ({
    ...p,
    eventId: "event-v8-A",
  }));
  p.futureInsights = [0, 1].map((i) => ({
    ...structuredClone(base.futureInsights[0]),
    id: `insight-v8-${i}`,
    eventId: "event-v8-A",
    title: `Jalon ${i + 1} SYNTHÉTIQUE`,
    year: i ? 2030 : 2027,
  }));
  p.futureDocuments = base.futureDocuments;
  p.provenance =
    "Fixture V8 SYNTHÉTIQUE. Aucun registre externe ni couverture réelle certifiée.";
  for (const e of p.economicSnapshots) e.verifiedAt = at;
  const legacy = {
    schemaVersion: 2,
    editionDate: p.editionDate,
    editionId: p.editionId,
    revision: p.revision,
    title: p.title,
    items: p.items.map((i) => ({ ...i, event_id: i.eventId })),
  };
  const sections = p.items
    .map(
      (i) =>
        `<article id="${i.id}"><h2>${escape(i.title)}</h2><p>${escape(i.summary)}</p><p>${escape(i.plain)}</p><p>${escape(i.detail)}</p></article>`,
    )
    .join("\n");
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(p.title)}</title><style>body{font:18px/1.6 system-ui;max-width:900px;margin:auto;padding:20px}article{border-top:1px solid;padding:16px 0}</style></head><body><h1>${escape(p.title)}</h1><p>SYNTHÉTIQUE — aucune actualité réelle.</p>${sections}<script id="unifiedData" type="application/json">${JSON.stringify(p).replaceAll("<", "\\u003c")}</script><script id="editionData" type="application/json">${JSON.stringify(legacy).replaceAll("<", "\\u003c")}</script></body></html>`;
  const hour = p.editionSlot.slice(0, 2);
  writeFileSync(`${root}/snapshot-${hour}.html`, html);
  writeFileSync(
    `${root}/snapshot-${hour}.json`,
    JSON.stringify(p, null, 2) + "\n",
  );
}
writeFileSync(
  `${root}/expected.json`,
  JSON.stringify(
    {
      eventIds: slots.map((_, i) => `event-v8-${String.fromCharCode(65 + i)}`),
      economicZones: ["FR", "EU", "US", "CN"],
      insightIds: ["insight-v8-0", "insight-v8-1"],
      promptIds: base.promptAssets.map((p) => p.promptId),
    },
    null,
    2,
  ) + "\n",
);
for (const p of base.promptAssets)
  writeFileSync(`${root}/${p.filename}`, p.content);
