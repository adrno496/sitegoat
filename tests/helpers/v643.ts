// Synthetic 6.4.3 producer contract: « En savoir plus » opens a local deep-dive
// and a plain Google Mode IA link sits beside each button. No text, question or
// article from the user's file.
export const v643Title = "Compatibilité V6.4.3 synthétique";
export const v643Question = (n: number) =>
  `Question publique synthétique ${n} : isolation des cadres HTML ?`;
export function v643HTML(extra: Record<string, unknown> = {}) {
  const data = {
    schemaVersion: "6.4",
    editionDate: "2026-10-15",
    editionId: "journal360-day-2026-10-15",
    title: v643Title,
    revision: 4,
    slotsIncluded: ["08:00", "16:00", "21:00"],
    cumulativeStatus: "COMPLETE",
    missingSlots: [],
    sourceVerifiedAt: "2026-10-15T21:00:00+02:00",
    items: [1, 2, 3].map((n) => ({
      id: `article-${n}`,
      event_id: `fixture-event-${n}`,
      title: `Article synthétique ${n}`,
      category: "Science",
      plain: "Texte synthétique sans donnée privée.",
      // Producer line wrapping: the PWA normalises it, never the article text.
      aiQuestion: `Question publique synthétique ${n} :\n isolation des cadres HTML ?`,
      sources: [[`Source fictive ${n}`, `https://example.com/source-${n}`]],
    })),
    ...extra,
  };
  const ai =
    '<a class="google-ai-open" href="https://www.google.com/ai" target="_blank" rel="noopener noreferrer">Ouvrir Google Mode IA ↗</a>';
  const items = (Array.isArray(data.items) ? data.items : []) as {
    id: string;
    title: string;
  }[];
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${v643Title}</title><style>body{margin:16px;font:16px system-ui}a,button{display:inline-flex;min-height:44px;padding:8px}textarea{width:100%}[hidden]{display:none!important}</style></head><body>
  <section id="une"><h1>${v643Title}</h1>${items
    .map(
      (item) =>
        `<article class="story" id="story-${item.id}"><h2>${item.title}</h2><div class="story-footer"><button class="learn" data-article="${item.id}" type="button">En savoir plus · dossier interne</button>${ai}<div class="source-links"><a href="https://example.com/${item.id}" target="_blank" rel="noopener noreferrer">Source fictive ↗</a></div></div></article>`,
    )
    .join("")}</section>
  <section class="dossier" id="sentinel"><h2>Dossier un</h2><button class="learn" data-topic="sentinel" type="button">En savoir plus · dossier interne</button>${ai}</section>
  <section class="dossier" id="axdia"><h2>Dossier deux</h2><button class="learn" data-topic="axdia" type="button">En savoir plus · dossier interne</button>${ai}</section>
  <section class="deep-dive" id="approfondir"><h2>Approfondissement</h2><textarea id="deepQuestion" readonly rows="6"></textarea><button id="selectDeepQuestion" type="button">Sélectionner le texte</button><div class="google-ai-action">${ai}</div><input id="deepAIUrl" readonly value="https://www.google.com/ai"></section>
  <div hidden id="public-sentinel">Question publique synthétique de dossier un : limites des cadres isolés.</div>
  <div hidden id="public-axdia">Question publique synthétique de dossier deux : sélection de texte sur mobile.</div>
  <script id="editionData" type="application/json">${JSON.stringify(data).replaceAll("<", "\\u003c")}</script>
  <script>(()=>{const data=JSON.parse(document.getElementById('editionData').textContent);const byId=new Map(data.items.map(i=>[i.id,i]));const pub={sentinel:document.getElementById('public-sentinel').textContent,axdia:document.getElementById('public-axdia').textContent};const question=document.getElementById('deepQuestion');
  for(const button of document.querySelectorAll('button.learn'))button.addEventListener('click',()=>{const item=byId.get(button.dataset.article);question.value=item?item.aiQuestion:pub[button.dataset.topic];location.hash='approfondir'});
  document.getElementById('selectDeepQuestion').addEventListener('click',()=>{question.focus();question.select()});})();</script></body></html>`;
}
