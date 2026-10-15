import { SLOTS, type Slot } from "../../src/data/editorial";
export function v6Html({
  date = "2026-10-14",
  revision = 1,
  ids,
  slots,
  status = "COMPLETE",
  extra = {},
  padding = "",
}: {
  date?: string;
  revision?: number;
  ids?: string[];
  slots?: Slot[];
  status?: string;
  extra?: Record<string, unknown>;
  padding?: string;
} = {}) {
  const included = slots || [...SLOTS.slice(0, Math.min(3, revision))];
  const data = {
    schemaVersion: 2,
    title: `Journal synthétique du ${date}`,
    editionDate: date,
    editionId: `journal360-day-${date}`,
    revision,
    slotsIncluded: included,
    cumulativeStatus: status,
    missingSlots: [],
    sourceVerifiedAt: `${date}T${included.at(-1) || "08:00"}:00+02:00`,
    items: (ids || ["a", "b", "c"].slice(0, Math.min(3, revision))).map(
      (id) => ({
        id: `local-${id}`,
        event_id: `event-${id}`,
        title: `Article fictif ${id}`,
        category: "Science",
        plain: `En clair : événement synthétique ${id}, révision ${revision}.`,
        summary: "Fixture de test, non une actualité.",
        detail: "Détail de test, sans donnée privée.",
        steps: [],
        sources: [["Source de test", "https://example.org/test"]],
      }),
    ),
    ...extra,
  };
  const sections = [
    "À la une",
    "Articles",
    "Business",
    "SENTINEL",
    "AXDIA",
    "Mes décisions",
    "Sources & méthode",
  ];
  return `<!doctype html><html lang="fr" data-theme="dark" data-accent="green"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${data.title}</title>
  <style>:root{--bg:#fafafa;--fg:#18241e;--accent:#167040}html[data-theme=dark]{--bg:#14201a;--fg:#f9faf9}html[data-accent=red]{--accent:#e84855}html[data-accent=blue]{--accent:#4385ee}html[data-accent=purple]{--accent:#ad70e7}body{margin:16px;background:var(--bg);color:var(--fg);font:16px system-ui}button,a{display:inline-flex;align-items:center;min-height:44px;margin:3px;padding:4px 10px;color:var(--fg);background:transparent;border:1px solid var(--accent)}nav{display:flex;flex-wrap:wrap}section[hidden]{display:none}img{max-width:100%}</style></head><body><h1>${data.title}</h1>
  <p>Document synthétique, aucun fait d’actualité.</p>
  <div>${["light", "dark"].map((v) => `<button data-theme-choice="${v}" onclick="document.documentElement.dataset.theme='${v}'">Thème ${v}</button>`).join("")}
  ${["red", "blue", "green", "purple"].map((v) => `<button data-accent-choice="${v}" onclick="document.documentElement.dataset.accent='${v}'">Accent ${v}</button>`).join("")}</div>
  <nav aria-label="Onglets du journal">${sections.map((s, i) => `<button data-section="${i}" onclick="document.querySelectorAll('section[data-panel]').forEach(e=>e.hidden=e.dataset.panel!=='${i}')">${s}</button>`).join("")}</nav>
  ${sections.map((s, i) => `<section data-panel="${i}" ${i ? "hidden" : ""}><h2>${s}</h2><p>Contenu fictif ${i} de la révision ${revision}.</p><a href="https://www.google.com/ai" data-ai-link="google-ai-mode" data-ai-question="Question publique fictive pour ${s === "SENTINEL" ? "la sécurité logicielle" : s === "AXDIA" ? "les assistants locaux" : s}">En savoir plus</a></section>`).join("")}
  <img alt="Pixel de test embarqué" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0LcAAAAASUVORK5CYII=">
  <script id="editionData" type="application/json">${JSON.stringify(data).replaceAll("<", "\\u003c")}</script>
  <!-- ${padding} --></body></html>`;
}
export const v6Bytes = (options?: Parameters<typeof v6Html>[0]) =>
  new TextEncoder().encode(v6Html(options));
