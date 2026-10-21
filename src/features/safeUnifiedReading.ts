import { validateUnified, type UnifiedEdition } from "../data/unified";
import type { Article } from "../data/model";

// Imported magazines may contain only a JS-rendered shell. Project their
// validated documentary data into inert DOM instead of running their scripts.
// Originals and the explicit interactive mode are never rewritten in storage.
export function safeUnifiedReading(
  original: Document,
  target?: Article,
): Document | null {
  const blocks = original.querySelectorAll(
    'script#unifiedData[type="application/json"]',
  );
  if (
    blocks.length !== 1 ||
    original.querySelectorAll("#unifiedData").length !== 1
  )
    return null;
  const json = blocks[0].textContent || "";
  if (new TextEncoder().encode(json).length > 2 * 1024 * 1024) return null;
  let p: UnifiedEdition;
  try {
    p = validateUnified(JSON.parse(json));
  } catch {
    return null;
  }
  const body = original.body.cloneNode(true) as HTMLElement;
  body.querySelectorAll("script,style,template").forEach((n) => n.remove());
  const norm = (s: string) => s.replace(/\s+/g, " ").trim();
  const text = norm(body.textContent || "");
  // Keep genuinely static magazines in their original presentation. The check
  // includes complete narratives, so a shell with titles alone is insufficient.
  if (
    p.items.length &&
    p.items.every((i) =>
      [i.title, i.summary, i.plain, i.detail]
        .filter((s) => s.trim())
        .every((s) => text.includes(norm(s))),
    )
  )
    return null;
  if (
    !p.items.length &&
    !p.economicSnapshots.length &&
    !p.futureInsights.length &&
    !p.futureDocuments.length &&
    !p.promptAssets.length
  )
    return null;
  const doc = original.implementation.createHTMLDocument(p.title);
  doc.documentElement.lang = "fr";
  const mode = original.body.dataset.mode === "light" ? "light" : "dark";
  doc.body.dataset.mode = mode;
  doc.documentElement.style.colorScheme = mode;
  doc.body.setAttribute("data-journal360-safe-unified", "");
  const el = (tag: string, text?: string, parent?: Element) => {
    const node = doc.createElement(tag);
    if (text !== undefined) node.textContent = text;
    parent?.append(node);
    return node;
  };
  const style = el(
    "style",
    `*{box-sizing:border-box}html{color-scheme:light dark}body{margin:0;background:#0a0a0a;color:#eee;font:20px/1.7 system-ui,sans-serif}main{max-width:1050px;margin:auto;padding:88px 24px 32px}h1,h2,h3{line-height:1.25;overflow-wrap:anywhere}article,section{margin:30px 0;border-top:1px solid #aaa;padding-top:24px;scroll-margin-top:24px}p,li{overflow-wrap:anywhere;white-space:pre-wrap}a{color:#ffb4a8}a:focus-visible,summary:focus-visible,textarea:focus-visible{outline:3px solid #943122;outline-offset:3px}summary{cursor:pointer;min-height:44px;padding:10px 0}textarea{width:100%;min-height:220px;padding:16px;font:16px/1.6 monospace;white-space:pre-wrap;color:inherit;background:transparent;border:1px solid #777}nav a{display:block;padding:8px;min-height:44px}small{font-size:16px}.notice{border-left:4px solid #943122;padding:16px;background:#211917}body[data-mode=light]{background:#f8f6f0;color:#191919}body[data-mode=light] a{color:#943122}body[data-mode=light] .notice{background:#f0e6de}@media(max-width:600px){main{padding:88px 16px 24px}}`,
  );
  doc.head.append(style);
  const main = el("main", undefined, doc.body);
  el("h1", p.title, main);
  el(
    "p",
    `${p.editionDate} · ${p.editionSlot} · Europe/Paris · ${p.items.length} articles`,
    main,
  );
  const notice = el(
    "p",
    "Lecture sécurisée : cette édition construit son contenu avec des scripts. Les textes intégraux ci-dessous proviennent de ses données validées ; ses scripts ne sont pas exécutés. Le HTML original est conservé.",
    main,
  );
  notice.className = "notice";
  if (target) el("p", `Article sélectionné : ${target.title}`, main);
  if (p.synthesis.text) {
    el("h2", "Synthèse du document", main);
    el("p", p.synthesis.text, main);
  }
  const nav = el("nav", undefined, main);
  nav.setAttribute("aria-label", "Sommaire de l’édition");
  p.items.forEach((i, n) => {
    const a = el("a", i.title, nav);
    a.setAttribute("href", `#journal360-safe-item-${n}`);
  });
  function sources(
    records: (typeof p.items)[number]["sourceRecords"],
    parent: Element,
  ) {
    const d = el("details", undefined, parent);
    el("summary", "Sources et provenance", d);
    for (const s of records) {
      el(
        "p",
        `${s.label}\n${s.url}\n${s.publisher} · publication ${s.publishedAt} · vérification ${s.verifiedAt || "non renseignée"}`,
        d,
      );
    }
    if (!records.length) el("p", "Aucune source documentée.", d);
  }
  // A targeted read leads with the requested complete canonical article, while
  // all other articles remain in the same document and its local table of contents.
  const rows = p.items.map((i, n) => ({ i, n }));
  if (target)
    rows.sort(
      (a, b) => Number(b.i.id === target.id) - Number(a.i.id === target.id),
    );
  for (const { i, n } of rows) {
    const a = el("article", undefined, main);
    a.id = `journal360-safe-item-${n}`;
    a.setAttribute("data-journal360-article", i.id);
    el("h2", i.title, a);
    el(
      "p",
      `${i.category} · ${i.importance} · Événement ${i.eventDate} · Première apparition ${i.firstSeenSlot}`,
      a,
    );
    el(
      "p",
      `Publication ${i.publishedAt} · Vérification ${i.verifiedAt || "non renseignée"} · ${i.evidenceStatus}`,
      a,
    );
    for (const [label, value] of [
      ["Résumé", i.summary],
      ["En clair", i.plain],
      ["Analyse détaillée", i.detail],
      ["Ce qui a changé", i.changed],
      ["Pourquoi cela compte", i.importanceReason],
      ["Limites et inconnues", i.unknowns],
    ]) {
      el("h3", label, a);
      el("p", value || "Non renseigné.", a);
    }
    for (const c of i.corrections)
      el(
        "p",
        `Correction ${c.at} · ${c.reason} · ${c.sourceIds.join(", ")}`,
        a,
      );
    for (const action of i.actions)
      el(
        "p",
        `Action proposée : ${action.title}\n${action.reason}\nEffort : ${action.effort} · Risque : ${action.risk}`,
        a,
      );
    if (i.publicResearchQuestion) {
      el("h3", "Question publique pour approfondir", a);
      el("p", i.publicResearchQuestion, a);
    }
    sources(i.sourceRecords, a);
  }
  const economy = el("section", undefined, main);
  el("h2", "Données économiques", economy);
  for (const e of p.economicSnapshots) {
    const s = el("section", undefined, economy);
    el("h3", `${e.zone} · ${e.indicator}`, s);
    el("p", `${e.value} ${e.unit} · période ${e.period} · ${e.status}`, s);
    el(
      "p",
      `Statistique ${e.statisticDate} · publication ${e.publishedAt} · révision ${e.revisedAt || "aucune"} · vérification ${e.verifiedAt || "non renseignée"}`,
      s,
    );
    for (const t of [
      e.reading,
      e.definition,
      e.risk,
      e.counterArgument,
      e.personalReason,
    ])
      el("p", t, s);
    el("p", `${e.provider} · ${e.seriesCode} · ${e.frequency}`, s);
    if (e.comparison)
      el(
        "p",
        `Comparaison : ${e.comparison.value} ${e.comparison.unit} · ${e.comparison.period} · ${e.comparison.definition}`,
        s,
      );
    sources(e.sourceRecords, s);
  }
  const future = el("section", undefined, main);
  el("h2", "Chronologie IA et Futur", future);
  for (const i of p.futureInsights) {
    el("h3", `${i.year} · ${i.status} · ${i.title}`, future);
    for (const t of [
      i.description,
      `Observation ${i.observedAt || "non renseignée"} · Publication ${i.publishedAt || "non renseignée"}`,
      `Objections : ${i.objections}`,
      `Déclencheur : ${i.trigger}`,
      `Invalidation : ${i.invalidation}`,
    ])
      el("p", t, future);
    sources(i.evidence, future);
  }
  for (const f of p.futureDocuments) {
    const d = el("details", undefined, future);
    el("summary", `Dossier intégral : ${f.title}`, d);
    const t = el("textarea", undefined, d) as HTMLTextAreaElement;
    t.readOnly = true;
    t.textContent = JSON.stringify(f, null, 2);
    t.setAttribute("aria-label", `Dossier intégral : ${f.title}`);
  }
  const prompts = el("section", undefined, main);
  el("h2", "Prompts Markdown intégraux", prompts);
  el(
    "p",
    "Pour télécharger les fichiers .md, réduisez la lecture et utilisez les prompts de l’édition dans les commandes du lecteur.",
    prompts,
  );
  for (const pmt of p.promptAssets) {
    el("h3", pmt.title, prompts);
    el("p", pmt.filename, prompts);
    const t = el("textarea", undefined, prompts) as HTMLTextAreaElement;
    t.readOnly = true;
    t.textContent = pmt.content;
    t.setAttribute(
      "aria-label",
      `Prompt complet : ${pmt.title} · ${pmt.filename}`,
    );
    t.setAttribute("data-prompt-id", pmt.promptId);
  }
  const notes = el("section", undefined, main);
  el("h2", "Couverture et avertissements du document", notes);
  el(
    "p",
    `Couverture déclarée : ${p.cumulativeStatus}. Ce statut ne mesure pas les fichiers importés.`,
    notes,
  );
  for (const w of [...p.warnings, ...p.sourcesNotVerified]) el("p", w, notes);
  const raw = el("details", undefined, main);
  el("summary", "Données documentaires intégrales (JSON)", raw);
  const rawText = el("textarea", undefined, raw) as HTMLTextAreaElement;
  rawText.readOnly = true;
  rawText.textContent = JSON.stringify(p, null, 2);
  rawText.setAttribute("aria-label", "Données documentaires intégrales");
  return doc;
}
