import { auditPayload, auditHTML } from "./audit";
export function v9Fixture(
  slot: "08:00" | "10:00" = "10:00",
  title = "Titre public synthétique",
) {
  const p = auditPayload(slot === "08:00" ? "08" : "10");
  const q = {
    format: "journal360.quickbriefs",
    schemaVersion: 1,
    editionId: p.editionId,
    editionDate: p.editionDate,
    editionSlot: p.editionSlot,
    notice: "SYNTHÉTIQUE",
    items: [
      {
        eventId: "brief.synthetic",
        title,
        theme: "Sciences",
        eventDate: p.editionDate,
        publishedAt: p.editionDate,
        source: {
          publisher: "Source synthétique",
          url: "https://example.org/science",
        },
        evidenceStatus: "non-testé",
        googleQuery: "Science publique démonstration",
        relatedArticleEventId: null,
      },
    ],
  };
  const bytes = new TextEncoder().encode(
    new TextDecoder().decode(auditHTML(p)) +
      `<script id="quickBriefsData" type="application/json">${JSON.stringify(q).replaceAll("<", "\\u003c")}</script>`,
  );
  return { p, q, bytes };
}
export function interactiveV9Fixture() {
  const { p, q } = v9Fixture();
  const json = (v: unknown) => JSON.stringify(v).replaceAll("<", "\\u003c");
  const bytes =
    Buffer.from(`<!doctype html><html lang="fr"><title>Original V9 SYNTHÉTIQUE</title><style>body{background:#fff;color:#222;padding:80px 40px}article{margin-bottom:24px}button,a,summary,input,select{min-height:44px} .panel{display:none}.panel.active{display:block}</style><body>
  <nav class="topnav"><button data-panel="home">Aujourd’hui</button><button data-panel="articles">Articles</button><button data-panel="briefs">Actualité rapide</button><button data-panel="prompts">Prompts</button></nav>
  <section id="home" class="panel active"><h1>Présentation originale SYNTHÉTIQUE</h1></section>
  <section id="articles" class="panel"><input aria-label="Rechercher" id="searchInput"><select aria-label="Thème" id="categoryFilter"><option value="">Tous</option></select><div id="articlesList"></div></section>
  <section id="briefs" class="panel"><div id="briefList"></div></section><section id="prompts" class="panel"><div id="promptsList"></div></section>
  <dialog id="articleDialog"><h2 id="dialogTitle"></h2><p id="dialogBody"></p><div id="dialogSources"></div><button id="closeDialog">Fermer</button></dialog>
  <script id="unifiedData" type="application/json">${json(p)}</script><script id="quickBriefsData" type="application/json">${json(q)}</script>
  <script>(()=>{const p=JSON.parse(document.querySelector('#unifiedData').textContent),q=JSON.parse(document.querySelector('#quickBriefsData').textContent),$=id=>document.getElementById(id),el=(t,text)=>{const n=document.createElement(t);if(text)n.textContent=text;return n};
  document.querySelectorAll('[data-panel]').forEach(b=>b.onclick=()=>document.querySelectorAll('.panel').forEach(s=>s.classList.toggle('active',s.id===b.dataset.panel)));
  for(const c of new Set(p.items.map(i=>i.category))){const o=el('option',c);o.value=c;$('categoryFilter').append(o)}
  function render(){ $('articlesList').replaceChildren();for(const i of p.items.filter(i=>(!$('categoryFilter').value||i.category===$('categoryFilter').value)&&i.title.includes($('searchInput').value))){const a=el('article');a.append(el('h3',i.title));const d=el('details');d.append(el('summary','Développer le résumé'),el('p',i.summary));const r=el('button','Lire le dossier complet');r.onclick=()=>{$('dialogTitle').textContent=i.title;$('dialogBody').textContent=i.detail;$('dialogSources').replaceChildren();for(const s of i.sourceRecords){const x=el('a',s.publisher);x.href=s.url;$('dialogSources').append(x)}$('articleDialog').showModal()};const g=el('button','Google');g.onclick=()=>window.open('https://www.google.com/search?q='+encodeURIComponent(i.publicResearchQuestion),'_blank');a.append(d,r,g);$('articlesList').append(a)}}render();$('searchInput').oninput=render;$('categoryFilter').onchange=render;$('closeDialog').onclick=()=>$('articleDialog').close();
  for(const x of p.promptAssets){const a=el('article');const b=el('button','Télécharger .md');b.onclick=()=>{const u=URL.createObjectURL(new Blob([x.content],{type:'text/markdown'})),a=el('a');a.href=u;a.download=x.filename;document.body.append(a);a.click();a.remove()};a.append(b);$('promptsList').append(a)}
  for(const x of q.items)$('briefList').append(el('article',x.title));})();</script></body></html>`);
  return { p, q, bytes };
}
