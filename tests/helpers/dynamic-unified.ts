import { readFileSync } from "node:fs";
import { auditPayload } from "./audit";
import type { UnifiedEdition } from "../../src/data/unified";
export const readingHours = ["08", "10", "16"] as const;
export type ReadingHour = (typeof readingHours)[number];
export function dynamicFixture(hour: ReadingHour) {
  if (process.env.SITEGOAT_AUDIT_REAL_DIR) {
    const bytes = readFileSync(
      `${process.env.SITEGOAT_AUDIT_REAL_DIR}/JOURNAL_360_V8_2026-10-21_EDITION_${hour}H_AUTONOME.html`,
    );
    const p: UnifiedEdition = JSON.parse(
      bytes
        .toString()
        .match(
          /<script[^>]*id=["']unifiedData["'][^>]*>([\s\S]*?)<\/script>/i,
        )![1],
    );
    return { bytes, p };
  }
  const p = auditPayload(hour === "08" ? "08" : "10");
  if (hour === "16") {
    p.editionSlot = "16:00";
    p.revision = 5;
    p.slotsIncluded = ["08:00", "10:00", "12:00", "14:00", "16:00"];
    p.coverageWindow.to = `${p.editionDate}T16:00:00+02:00`;
    p.sourceVerifiedAt = p.coverageWindow.to;
    p.items.push(
      ...p.items.map((i, n) => ({
        ...i,
        eventId: `extra-reader-${n}`,
        id: `extra-reader-article-${n}`,
        title: `Événement supplémentaire ${n} SYNTHÉTIQUE`,
        firstSeenSlot: "16:00" as const,
      })),
    );
    p.economicSnapshots.push(
      ...p.economicSnapshots.slice(0, 3).map((e, n) => ({
        ...e,
        id: `economy-extra-${n}`,
        seriesCode: `extra-${n}`,
      })),
    );
    p.futureInsights.push(
      ...p.futureInsights
        .slice(0, 2)
        .map((i, n) => ({ ...i, id: `insight-extra-${n}` })),
    );
  }
  p.cumulativeStatus = "PARTIAL";
  p.missingSlots = [];
  const bytes = Buffer.from(
    `<!doctype html><html lang="fr"><title>Coquille SYNTHÉTIQUE</title><style>body{margin:0;padding:80px 80px 96px;background:#111;color:#eee}</style><body><header>En-tête uniquement</header><nav id="nav"></nav><main id="view"></main><script id="unifiedData" type="application/json">${JSON.stringify(p).replaceAll("<", "\\u003c")}</script><script>globalThis.importedRendererRan=true;(()=>{const data=JSON.parse(document.getElementById('unifiedData').textContent),view=document.getElementById('view'),nav=document.getElementById('nav');const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};const list=()=>{view.replaceChildren(node('h1','Articles du producteur'));for(const i of data.items){const card=node('article');card.append(node('h3',i.title),node('p',i.summary));const read=node('button','Lire l’article');read.onclick=()=>{view.replaceChildren(node('h1',i.title),node('p',i.plain),node('p',i.detail))};card.append(read);view.append(card)}};const articles=node('button','Tous les articles');articles.onclick=list;nav.append(articles);view.append(node('h1','Accueil du producteur'),node('p','Présentation d’origine SYNTHÉTIQUE'));})();</script></body></html>`,
  );
  return { bytes, p };
}
