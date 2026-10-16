// Synthetic Magazine contract: article DOM is built by an isolated IIFE and
// its local Lire button opens the complete analysis in #readerBody.
export function magazineHTML() {
  const data = {
    schemaVersion: "6.4.4",
    editionDate: "2026-10-16",
    title: "Magazine synthétique",
    revision: 1,
    items: [1, 2, 3].map((i) => ({
      id: `magazine-${i}`,
      event_id: `magazine-event-${i}`,
      title: `Analyse magazine ${i}`,
      category: "Science",
      summary: `Résumé ${i}`,
      plain: `Contenu intégral ${i}`,
      detail: `Analyse détaillée ${i}`,
      aiQuestion: `Question publique magazine ${i} ?`,
      sources: [],
    })),
  };
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>body{font:18px system-ui;margin:20px}.view{display:none}.view.active{display:block}button,a{padding:12px;min-height:44px}</style></head><body><section id="articles" class="view active"><h1>Magazine synthétique</h1><div id="allArticles"></div></section><section id="reader" class="view"><div id="readerBody"></div></section><script type="application/json" id="editionData">${JSON.stringify(data)}</script><script>(()=>{const data=JSON.parse(document.getElementById('editionData').textContent);function read(item){document.getElementById('readerBody').replaceChildren();const h=document.createElement('h1');h.textContent=item.title;const p=document.createElement('p');p.textContent=item.detail;const a=document.createElement('a');a.href='https://www.google.com/search?'+new URLSearchParams({hl:'fr',udm:'50',q:item.aiQuestion});a.textContent='Mode IA avec la question';document.getElementById('readerBody').append(h,p,a);document.querySelectorAll('.view').forEach(node=>node.classList.toggle('active',node.id==='reader'))}for(const item of data.items){const row=document.createElement('article');const h=document.createElement('h3');h.textContent=item.title;const button=document.createElement('button');button.textContent='Lire';button.onclick=()=>read(item);row.append(h,button);document.getElementById('allArticles').append(row)}})();</script></body></html>`;
}
