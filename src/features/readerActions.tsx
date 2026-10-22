import { useEffect, useState, useRef, type RefObject } from "react";
import type { Edition } from "../data/model";
import { validateSourceUrl } from "./sourceUrl";
import { googleAiQuestionDestination } from "./googleAi";
import { download } from "./backup";
import { hash } from "../data/model";
import { useDialogFocus } from "./dialogFocus";

export function readerAllowedLinks(e: Edition) {
  return [
    ...new Set(
      [
        ...(e.unified?.items.flatMap((i) =>
          i.sourceRecords.map((s) => s.url),
        ) || []),
        ...(e.unified?.economicSnapshots.flatMap((i) =>
          i.sourceRecords.map((s) => s.url),
        ) || []),
        ...(e.unified?.futureInsights.flatMap((i) =>
          i.evidence.map((s) => s.url),
        ) || []),
        ...(e.quickBriefs?.items.map((i) => i.source.url) || []),
        ...(e.unified?.items.map(
          (i) => googleAiQuestionDestination(i.publicResearchQuestion)?.url,
        ) || []),
        ...(e.quickBriefs?.items.map(
          (i) => googleAiQuestionDestination(i.googleQuery)?.url,
        ) || []),
      ].flatMap((v) =>
        v && validateSourceUrl(v) ? [validateSourceUrl(v)!] : [],
      ),
    ),
  ];
}

export function readerActionBridge(e: Edition, revision: number) {
  const data = JSON.stringify({
    links: readerAllowedLinks(e),
    prompts: e.unified?.promptAssets || [],
    hash: e.sha256,
    revision,
  }).replaceAll("<", "\\u003c");
  return `(()=>{'use strict';const config=${data};
const send=(kind,value)=>parent.postMessage({type:'journal360:reader-action:v1',hash:config.hash,revision:config.revision,kind,value},'*');
const checked=value=>{try{const u=new URL(value);if(u.origin==='https://www.google.com'&&u.pathname==='/search'){const q=u.searchParams.get('q');const match=config.links.find(v=>{const x=new URL(v);return x.origin===u.origin&&x.pathname===u.pathname&&x.searchParams.get('q')===q});return match||null}return config.links.includes(u.href)?u.href:null}catch{return null}};
window.open=value=>{const url=checked(value);if(url)send('link',url);return null};
const blobs=new Map(),create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
URL.createObjectURL=blob=>{const url=create(blob);blobs.set(url,blob);return url};URL.revokeObjectURL=url=>{blobs.delete(url);revoke(url)};
window.addEventListener('click',event=>{const a=event.target instanceof Element?event.target.closest('a'):null;if(!a||a.matches('[data-ai-link="google-ai-mode"]'))return;
const href=a.getAttribute('data-j360-source')||a.getAttribute('href')||'';
if(href.startsWith('#')||href.startsWith('about:srcdoc#'))return;
event.preventDefault();event.stopImmediatePropagation();
if(href.startsWith('blob:')){const blob=blobs.get(href);if(blob&&blob.size<=200000)blob.text().then(text=>{const p=config.prompts.find(p=>p.content===text);if(p)send('prompt',p.promptId)});return}
const url=checked(href);if(url)send('link',url);
},true);
})();`;
}

export function OriginalActions({
  edition,
  frame,
  mode,
  revision,
  onActiveChange,
}: {
  edition: Edition;
  frame: RefObject<HTMLIFrameElement | null>;
  mode: string;
  revision: number;
  onActiveChange: (open: boolean) => void;
}) {
  const [action, setAction] = useState<{
    kind: "link" | "prompt";
    value: string;
  } | null>(null);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLElement>(null);
  useDialogFocus(!!action, () => setAction(null), dialog);
  useEffect(() => {
    onActiveChange(!!action);
  }, [action, onActiveChange]);
  useEffect(() => {
    setAction(null);
    const links = readerAllowedLinks(edition);
    const receive = (event: MessageEvent) => {
      const a = event.data;
      if (
        mode !== "interactive" ||
        event.source !== frame.current?.contentWindow ||
        event.origin !== "null" ||
        !a ||
        typeof a !== "object" ||
        Array.isArray(a) ||
        Object.keys(a).sort().join() !== "hash,kind,revision,type,value" ||
        a.type !== "journal360:reader-action:v1" ||
        a.hash !== edition.sha256 ||
        a.revision !== revision ||
        typeof a.value !== "string"
      )
        return;
      if (
        (a.kind === "link" && links.includes(a.value)) ||
        (a.kind === "prompt" &&
          edition.unified?.promptAssets.some((p) => p.promptId === a.value))
      ) {
        setError("");
        setAction((previous) => previous || { kind: a.kind, value: a.value });
      }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [edition, frame, mode, revision]);
  if (!action) return null;
  const prompt =
    action.kind === "prompt"
      ? edition.unified?.promptAssets.find((p) => p.promptId === action.value)
      : undefined;
  return (
    <div className="modal-backdrop">
      <section
        ref={dialog}
        className="modal compact"
        role="dialog"
        aria-modal="true"
        aria-label="Action du document original"
      >
        <h2>
          {prompt ? "Télécharger le prompt original" : "Ouvrir le lien public"}
        </h2>
        <p className="hash-text">{prompt?.filename || action.value}</p>
        <p>
          Action demandée par le document importé. Elle nécessite votre clic
          ici.
        </p>
        {prompt ? (
          <button
            className="primary"
            onClick={() =>
              void (async () => {
                try {
                  if (
                    prompt.sha256 &&
                    (await hash(new TextEncoder().encode(prompt.content))) !==
                      prompt.sha256
                  )
                    throw Error("Checksum Markdown invalide.");
                  const name = prompt.filename
                    .split(/[\\/]/)
                    .pop()!
                    .replace(/[^\p{L}\p{N}._-]/gu, "_")
                    .replace(/(?:\.md)?$/i, ".md");
                  download(
                    new Blob([prompt.content], {
                      type: "text/markdown;charset=utf-8",
                    }),
                    name,
                  );
                  setAction(null);
                } catch (e) {
                  setError(String(e));
                }
              })()
            }
          >
            Télécharger .md
          </button>
        ) : (
          <a
            className="primary"
            href={action.value}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
            onClick={() => setAction(null)}
          >
            Ouvrir dans un nouvel onglet
          </a>
        )}
        <button className="secondary" onClick={() => setAction(null)}>
          Annuler
        </button>
        {error && <p role="alert">{error}</p>}
      </section>
    </div>
  );
}
