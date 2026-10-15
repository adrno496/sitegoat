// Synthetic contract fixture. No text, question or article from the user's file.
export const v61Sections = [
  "une",
  "articles",
  "ia",
  "tech",
  "science",
  "monde",
  "eco",
  "cyber",
  "business",
  "sentinel",
  "axdia",
  "decisions",
  "method",
];
export function v61HTML(extra: Record<string, unknown> = {}) {
  const items = Array.from({ length: 9 }, (_, i) => ({
    id: `a${i + 1}`,
    event_id: `fixture-event-${i + 1}`,
    title: `Article synthétique ${i + 1}`,
    category: i % 2 ? "Science" : "Technologie",
    plain: "Texte synthétique sans donnée privée.",
    aiQuestion: `Question publique synthétique ${i + 1}`,
    sources: [],
  }));
  const data = {
    schemaVersion: "6.1",
    editionDate: "2026-10-15",
    editionId: "journal360-day-2026-10-15",
    title: "Compatibilité V6.1 synthétique",
    revision: 1,
    slotsIncluded: ["08:00"],
    cumulativeStatus: "COMPLETE",
    missingSlots: [],
    sourceVerifiedAt: "2026-10-15T08:00:00+02:00",
    items,
    ...extra,
  };
  return `<!doctype html><html lang="fr" data-mode="light" data-accent="green"><head><meta charset="utf-8"><title>Compatibilité V6.1 synthétique</title><style>body{margin:16px;font:16px system-ui}nav{display:flex;flex-wrap:wrap}a,button{display:inline-flex;padding:10px;min-height:44px}section{min-height:100px}dialog{max-width:calc(100vw - 40px)}[hidden]{display:none!important}</style></head><body>
  <select id="mode" aria-label="Thème"><option>light</option><option>dark</option></select>
  <select id="accent" aria-label="Accent">${["red", "blue", "green", "purple"].map((v) => `<option>${v}</option>`).join("")}</select>
  <button id="density">Texte 100 %</button><button id="counter" onclick="this.textContent=String(++window.counter)">0</button>
  <a id="custom-link" href="#custom" onclick="event.preventDefault();document.body.dataset.custom='done'">Menu local</a><div id="custom"></div>
  <nav>${v61Sections.map((id) => `<a href="#${id}">${id}</a>`).join("")}</nav>
  <section id="une"><h1>Compatibilité V6.1 synthétique</h1></section>
  <section id="articles"><h2>Articles</h2><input id="q" aria-label="Recherche du journal"><select id="cat" aria-label="Rubrique"><option value="">Toutes</option><option>Science</option><option>Technologie</option></select><select id="slot"><option value="">Tous</option><option>08:00</option></select><select id="sort"><option>score</option><option>date</option></select><p id="results">9 résultat(s)</p><p id="noresults" hidden>Aucun résultat</p><div id="index">${items.map((item, i) => `<article data-cat="${item.category}" data-slot="08:00" data-score="${100 - i}" data-date="2026-10-15"><h3>${item.title}</h3><button data-article="${item.id}">En savoir plus</button></article>`).join("")}</div></section>
  ${v61Sections
    .slice(2)
    .map(
      (id) =>
        `<section id="${id}"><h2>${id}</h2>${["sentinel", "axdia"].includes(id) ? `<div id="public-${id}">Question publique\n synthétique sur ${id === "sentinel" ? "la sécurité logicielle" : "les assistants locaux"}</div><button data-topic="${id}">En savoir plus ${id}</button>` : ""}</section>`,
    )
    .join("")}
  <dialog id="googleDialog"><h2 id="modalTitle">Recherche</h2><textarea id="question"></textarea><a id="openGoogle" href="https://www.google.com/search?hl=fr" target="_blank">Ouvrir Google</a><a href="https://www.google.com/ai" target="_blank">Entrée IA</a><button id="close">Fermer</button><button id="copyQuestion">Copier question</button><button id="copyLink">Copier lien</button><input id="googleLink"><p id="feedback"></p></dialog>
  <script id="editionData" type="application/json">${JSON.stringify(data).replaceAll("<", "\\u003c")}</script>
  <script>(()=>{const data=JSON.parse(document.getElementById('editionData').textContent),root=document.documentElement;window.counter=0;const get=k=>{try{return localStorage.getItem(k)}catch{return null}},set=(k,v)=>{try{localStorage.setItem(k,v)}catch{}};
  for(const id of ['mode','accent']){const field=document.getElementById(id);field.value=get(id)||field.value;field.addEventListener('change',()=>{root.dataset[id]=field.value;set(id,field.value)})}
  document.getElementById('density').onclick=()=>document.getElementById('density').textContent='Texte 94 %';
  function filter(){let count=0;for(const el of document.querySelector('#index').children){const q=document.getElementById('q').value,cat=document.getElementById('cat').value;el.hidden=!!((q&&!el.textContent.includes(q))||(cat&&el.dataset.cat!==cat));if(!el.hidden)count++}document.getElementById('results').textContent=count+' résultat(s)';document.getElementById('noresults').hidden=count!==0}
  document.getElementById('q').oninput=filter;document.getElementById('cat').onchange=filter;
  const modal=document.getElementById('googleDialog'),question=document.getElementById('question');function refresh(){const u=new URL('https://www.google.com/search');u.searchParams.set('hl','fr');u.searchParams.set('q',question.value);document.getElementById('openGoogle').href=u.toString();document.getElementById('googleLink').value=u.toString()}
  document.querySelectorAll('[data-article],[data-topic]').forEach(button=>button.addEventListener('click',()=>{const item=data.items.find(i=>i.id===button.dataset.article);question.value=item?item.aiQuestion:document.getElementById('public-'+button.dataset.topic).textContent;refresh();modal.showModal()}));question.oninput=refresh;document.getElementById('close').onclick=()=>modal.close();})();</script></body></html>`;
}
