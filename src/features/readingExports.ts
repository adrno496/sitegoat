import type { IndexedArticle } from "../data/articles";
import { editorialDate, evidenceLabel } from "./editorialPresentation";
import { editionDateTime } from "./eventPresentation";
import { validateSourceUrl } from "./sourceUrl";
const escapeHTML = (s: string) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
const md = (s: string) =>
  s
    .replace(/[\\`*_{}[\]()#+.!|>-]/g, "\\$&")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;");
export function readingExport(row: IndexedArticle, format: "html" | "md") {
  const { article, edition } = row,
    item = edition.unified?.items.find((i) => i.eventId === article.eventId);
  const paragraphs = item
    ? [
        ["Résumé", item.summary],
        ["En clair", item.plain],
        ["Analyse", item.detail],
        ["Limites et objections", item.unknowns],
        ["Ce qui a changé", item.changed],
        ["Pourquoi cela compte", item.importanceReason],
        ...item.actions.map((a) => [
          a.title,
          `${a.reason}\nRisque déclaré : ${a.risk}`,
        ]),
        ...item.corrections.map((c) => [
          "Correction déclarée",
          `${c.at} · ${c.reason}`,
        ]),
      ]
    : [["Texte extrait", article.text]];
  const dates = [
    `Publié le ${editorialDate(item?.publishedAt)}`,
    `Fait du ${editorialDate(item?.eventDate || article.date)}`,
    `Vérification déclarée : ${editorialDate(item?.verifiedAt)}`,
    `Édition du ${editionDateTime(edition)}`,
    `Import du ${editorialDate(edition.importedAt)}`,
    `${evidenceLabel(item?.evidenceStatus)} · Déclaré par le producteur, sans revalidation par SiteGoat.`,
    `Original SHA-256 : ${edition.sha256}`,
  ];
  const sources = [
    ...new Set(
      (item?.sourceRecords.map((s) => s.url) || article.sources).flatMap(
        (s) => {
          const u = validateSourceUrl(s);
          return u ? [u] : [];
        },
      ),
    ),
  ];
  if (format === "html")
    return `<!doctype html><html lang="fr"><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'none'; base-uri 'none'; form-action 'none'"><title>${escapeHTML(article.title)}</title><body><h1>${escapeHTML(article.title)}</h1><p>Copie de lecture assainie ; original intact conservé séparément.</p>${dates.map((d) => `<p>${escapeHTML(d)}</p>`).join("")}${paragraphs.map(([title, text]) => `<h2>${escapeHTML(title)}</h2><pre>${escapeHTML(text || "Non fourni")}</pre>`).join("")}<h2>Sources</h2><ul>${sources.map((s) => `<li><a href="${escapeHTML(s)}" rel="noopener noreferrer" referrerpolicy="no-referrer">${escapeHTML(s)}</a></li>`).join("")}</ul></body></html>`;
  const verbatim = (s: string) => {
    const fence = "`".repeat(
      Math.max(3, ...(s.match(/`+/g) || []).map((x) => x.length + 1)),
    );
    return `${fence}text\n${s}\n${fence}`;
  };
  return `# ${md(article.title)}\n\nCopie de lecture ; original intact conservé séparément.\n\n${dates.map((d) => md(d)).join("\n\n")}\n\n${paragraphs.map(([title, text]) => `## ${title}\n\n${verbatim(text || "Non fourni")}`).join("\n\n")}\n\n## Sources\n\n${sources.map((s) => `- <${s.replaceAll("<", "%3C").replaceAll(">", "%3E")}>`).join("\n")}\n`;
}
export function personalReviewTemplate(
  kind: "counterproof" | "review",
  at = new Date(),
) {
  const day = new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
  return kind === "counterproof"
    ? `Contre-preuve personnelle — ${day}\nAffirmation : \nSource : \nObjection : \nConclusion personnelle : \n`
    : `Source à revérifier — ${day}\nSource (ouvrir volontairement) : \n[ ] À revoir\nDate de revue personnelle : \nObservation : \nAucun statut fact-checké automatique.\n`;
}
