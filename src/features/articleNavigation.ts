import type { Article } from "../data/model";

// Navigation runs inside the existing opaque sandbox. No parent messaging,
// permission changes, external navigation or evaluation of article text.
export function prepareArticleNavigation(
  doc: Document,
  article: Article,
  interactive: boolean,
) {
  const fallback = doc.createElement("article");
  fallback.id = "journal360-requested-article";
  fallback.className = "panel";
  fallback.setAttribute("data-journal360-article", article.id);
  const heading = doc.createElement("h1");
  heading.textContent = article.title;
  fallback.append(heading);
  const explanation = doc.createElement("p");
  explanation.textContent =
    "Texte indexé de cet article. La navigation interactive de ce format est indisponible dans ce mode.";
  fallback.append(explanation);
  for (const text of article.text.split(/\n+/)) {
    const paragraph = doc.createElement("p");
    paragraph.textContent = text;
    fallback.append(paragraph);
  }
  const style = doc.createElement("style");
  style.textContent = `#journal360-requested-article{max-width:900px;margin:24px auto;padding:24px;overflow-wrap:anywhere}#journal360-requested-article p{white-space:pre-wrap;line-height:1.8}body[data-journal360-fallback]>*:not(#journal360-requested-article){display:none!important}`;
  doc.head.append(style);
  fallback.hidden = interactive;
  doc.body.prepend(fallback);
  if (!interactive) {
    doc.body.setAttribute("data-journal360-fallback", "");
    return;
  }
  const target = JSON.stringify({ id: article.id, title: article.title })
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
  const script = doc.createElement("script");
  script.textContent = `(()=>{
    const target=${target};
    const norm=text=>String(text||'').replace(/\\s+/g,' ').trim();
    const reveal=node=>{
      for(let parent=node;parent&&parent!==document.body;parent=parent.parentElement){
        if(parent.tagName==='DETAILS')parent.open=true;
      }
      node.setAttribute('data-journal360-article',target.id);
      requestAnimationFrame(()=>node.scrollIntoView({block:'start'}));
    };
    const run=()=>{
      // Magazine V6.4.4 renders its articles at startup and closes read() over
      // its own data. Activate only its explicit local Lire control.
      if(document.getElementById('readerBody')&&document.getElementById('allArticles')){
        const row=[...document.querySelectorAll('#allArticles article')].find(node=>norm(node.querySelector('h2,h3')?.textContent)===norm(target.title));
        const button=row&&[...row.querySelectorAll('button')].find(node=>norm(node.textContent)==='Lire'&&!node.hasAttribute('data-ai-link'));
        if(button){button.click();reveal(document.getElementById('readerBody'));return;}
      }
      const node=document.getElementById('story-'+target.id)||document.getElementById(target.id)||[...document.querySelectorAll('article')].find(node=>node.id!=='journal360-requested-article'&&norm(node.querySelector('h1,h2,h3')?.textContent)===norm(target.title));
      if(node){
        const button=[...node.querySelectorAll('button[data-article]')].find(button=>button.getAttribute('data-article')===target.id&&!button.hasAttribute('data-ai-link')&&/^(?:Lire|En savoir plus)/i.test(norm(button.textContent)));
        if(button){button.click();const deep=document.getElementById('approfondir');if(deep){reveal(deep);return;}}
        if(node.getClientRects().length){reveal(node);return;}
      }
      const fallback=document.getElementById('journal360-requested-article');
      fallback.hidden=false;document.body.setAttribute('data-journal360-fallback','');reveal(fallback);
    };
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
  })();`;
  doc.body.append(script);
}
