import { validateFuture } from "./import";
import type { FuturePayload } from "./schema";
const esc = (value: unknown) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function renderFutureHTML(value: FuturePayload) {
  const p = validateFuture(value);
  const card = (title: string, content: string) =>
    `<article><h3>${esc(title)}</h3>${content}</article>`;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(p.title)}</title><style>
  :root{color-scheme:light dark}body{font:17px/1.6 system-ui;max-width:1100px;margin:auto;padding:24px}article{border:1px solid #888;border-radius:16px;padding:20px;margin:16px 0;overflow-wrap:anywhere}small{display:block}a{color:inherit}h1{line-height:1.15}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:16px}p{white-space:pre-wrap}${p.visualization.motion === "subtle" ? "article{animation:appear .3s ease-out}@keyframes appear{from{opacity:.5;transform:translateY(5px)}to{opacity:1;transform:none}}" : ""}@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}</style></head><body>
  <header><small>LE FUTUR · RÉVISION ${p.revision}${p.synthetic ? " · EXEMPLE SYNTHÉTIQUE" : ""}</small><h1>${esc(p.title)}</h1><p>${esc(p.editorialDecision.reason)}</p><p>Prospective : aucune garantie de réalisation. Sources déclarées, non certifiées par Journal 360.</p></header>
  <section><h2>Scénarios et chronologie</h2><div class="grid">${p.scenarios.map((s) => card(s.title, `<p>${esc(s.summary)}</p><small>${esc(s.path)} · ${esc(s.horizon)} · ${esc(s.status)}</small>${["assumptions", "objections", "triggers", "indicators"].map((k) => `<h4>${esc(k)}</h4><ul>${s[k as "assumptions"].map((v) => `<li>${esc(v)}</li>`).join("")}</ul>`).join("")}${s.milestones.map((m) => `<p id="${esc(m.id)}"><b>${m.year} · ${esc(m.title)}</b> (${esc(m.status)})<br>${esc(m.description)}</p>`).join("")}`)).join("")}</div></section>
  <section><h2>Signaux</h2>${p.signals.map((s) => card(s.title, `<small>${esc(s.status)} · contrôle déclaré : ${esc(s.lastCheckedAt || "non renseigné")}</small><p>${esc(s.description)}</p>`)).join("")}</section>
  <section><h2>Préparation</h2>${p.actions.map((a) => card(a.title, `<small>${esc(a.horizon)} · ${esc(a.skill)}</small><p>${esc(a.description)}</p><p>Effort : ${a.effortHours === null ? "non documenté" : `${a.effortHours} h — ${esc(a.effortEvidence)}`}</p><p>Test : ${esc(a.decisiveTest)}</p>`)).join("")}</section>
  <section><h2>Sources déclarées</h2>${p.provenance.sources.map((s) => card(s.label, `${s.url ? `<a href="${esc(s.url)}" rel="noreferrer noopener">Source originale</a>` : "Source privée, sans URL publique"}<p>${esc(s.publisher)} · publication : ${esc(s.publishedAt || "non renseignée")} · consultation déclarée : ${esc(s.consultedAt || "non renseignée")}</p>`)).join("")}</section>
  <script id="futureData" type="application/json">${JSON.stringify(p).replace(/</g, "\\u003c")}</script></body></html>`;
}
