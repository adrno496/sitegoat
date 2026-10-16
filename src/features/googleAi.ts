export const GOOGLE_AI_ENTRY = "https://www.google.com/ai";
const questionCache = new WeakMap<Uint8Array, string[]>();
export function rememberReadingQuestions(bytes: Uint8Array, doc: Document) {
  adaptV6QuestionControls(doc);
  if (questionCache.has(bytes)) return;
  const questions = new Set<string>();
  for (const link of doc.querySelectorAll(
    '[data-ai-link="google-ai-mode"],a[href]',
  )) {
    const destination = validateGoogleDestination(link.getAttribute("href"));
    if (!link.matches('[data-ai-link="google-ai-mode"]') && !destination)
      continue;
    const question =
      link.getAttribute("data-ai-question") || destination?.query;
    if (validPublicQuestion(question)) questions.add(question);
    if (questions.size >= 100) break;
  }
  questionCache.set(bytes, [...questions]);
}
// Known V6 producers (6.1, 6.4, Magazine 6.4.4) expose explicit public questions: items[].aiQuestion
// for article buttons and #public-<topic> for the two dossier buttons. Adapt
// only these explicit fields in the display DOM; never infer a question from
// article text, private notes or arbitrary destinations.
function explicitArticleQuestions(doc: Document) {
  let data: unknown;
  try {
    data = JSON.parse(
      doc.querySelector('script#editionData[type="application/json"]')
        ?.textContent || "null",
    );
  } catch {
    return null;
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const value = data as Record<string, unknown>;
  if (
    typeof value.schemaVersion !== "string" ||
    !["6.1", "6.4", "6.4.4"].includes(value.schemaVersion) ||
    !Array.isArray(value.items)
  )
    return null;
  const byId = new Map<string, unknown>();
  for (const item of value.items.slice(0, 2000)) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const article = item as Record<string, unknown>;
    if (
      typeof article.id === "string" &&
      article.id.length <= 200 &&
      !byId.has(article.id)
    )
      byId.set(article.id, article.aiQuestion);
  }
  return byId;
}
function normalizedReadingQuestion(raw: unknown) {
  const question =
    typeof raw === "string"
      ? raw.replace(/[ \t\r\n]+/g, " ").trim()
      : undefined;
  return validPublicQuestion(question) ? question : null;
}
// Read only the explicit question belonging to this original article. This also
// works for imports already stored before the Articles tab existed.
export function articleReadingQuestion(bytes: Uint8Array, articleId: string) {
  const doc = new DOMParser().parseFromString(
    new TextDecoder().decode(bytes),
    "text/html",
  );
  return normalizedReadingQuestion(
    explicitArticleQuestions(doc)?.get(articleId),
  );
}
function adaptV6QuestionControls(doc: Document) {
  const questions = explicitArticleQuestions(doc);
  if (!questions) return;
  const byId = questions;
  function questionOf(button: Element) {
    const id = button.getAttribute("data-article");
    const topic = button.getAttribute("data-topic");
    const raw =
      id !== null
        ? byId.get(id)
        : topic === "sentinel" || topic === "axdia"
          ? doc.getElementById(`public-${topic}`)?.textContent
          : undefined;
    // Plain line wrapping is layout, not a command. Other controls/bidi and
    // overlong questions remain rejected by the existing parent validator.
    return normalizedReadingQuestion(raw);
  }
  // 6.1 and 6.4.1 buttons open the producer's own dialog, whose clipboard and
  // search link cannot work in the isolated frame: route them to the parent.
  if (
    doc.querySelector("dialog#googleDialog textarea#question") &&
    doc.querySelector("dialog#googleDialog a#openGoogle")
  )
    for (const button of doc.querySelectorAll(
      "button[data-article],button[data-topic]",
    )) {
      if (button.hasAttribute("data-ai-link")) continue;
      const question = questionOf(button);
      if (!question) continue;
      button.setAttribute("data-ai-link", "google-ai-mode");
      button.setAttribute("data-ai-question", question);
    }
  // 6.4.3 keeps « En savoir plus » local and places a plain /ai link beside
  // it: give that link the explicit question of its sibling button.
  for (const link of doc.querySelectorAll("a[href]")) {
    const href = link.getAttribute("href");
    if (
      (href !== GOOGLE_AI_ENTRY && href !== GOOGLE_AI_ENTRY + "?hl=fr") ||
      link.hasAttribute("data-ai-question")
    )
      continue;
    const button = [...(link.parentElement?.children || [])].find((e) =>
      e.matches("button[data-article],button[data-topic]"),
    );
    const question = button && questionOf(button);
    if (question) link.setAttribute("data-ai-question", question);
  }
}
export function readingQuestions(bytes: Uint8Array): string[] {
  if (!questionCache.has(bytes))
    rememberReadingQuestions(
      bytes,
      new DOMParser().parseFromString(
        new TextDecoder().decode(bytes),
        "text/html",
      ),
    );
  return questionCache.get(bytes)!;
}
export function validPublicQuestion(value: unknown): value is string {
  return (
    typeof value === "string" &&
    !!value.trim() &&
    value.length <= 2000 &&
    !hasControl(value) &&
    !/[\u202a-\u202e\u2066-\u2069]/u.test(value)
  );
}
export interface GoogleAiDestination {
  url: string;
  query: string;
  entryOnly?: boolean;
}

// Accept a literal allowed Google destination, never a URL that needs repairing or a
// redirect. Keep the question as text; it is not evaluated or enriched by PWA data.
export function validateGoogleDestination(
  value: unknown,
): GoogleAiDestination | null {
  if (value === GOOGLE_AI_ENTRY || value === GOOGLE_AI_ENTRY + "?hl=fr")
    return { url: GOOGLE_AI_ENTRY, query: "", entryOnly: true };
  if (
    typeof value !== "string" ||
    value.length > 4096 ||
    !value.startsWith("https://www.google.com/search?") ||
    /[\s\\#]/u.test(value) ||
    hasControl(value) ||
    /%(?![\da-f]{2})/iu.test(value)
  )
    return null;
  try {
    const url = new URL(value);
    if (
      url.href !== value ||
      url.protocol !== "https:" ||
      url.hostname !== "www.google.com" ||
      url.pathname !== "/search" ||
      url.username ||
      url.password ||
      url.port ||
      url.hash
    )
      return null;
    const parameters = [...url.searchParams];
    const allowed = new Set(["hl", "udm", "q"]);
    if (
      parameters.some(([key]) => !allowed.has(key)) ||
      new Set(parameters.map(([key]) => key)).size !== parameters.length ||
      (url.searchParams.has("udm") && url.searchParams.get("udm") !== "50") ||
      (url.searchParams.has("hl") && url.searchParams.get("hl") !== "fr")
    )
      return null;
    // URLSearchParams tolerates malformed UTF-8; do not silently repair it.
    for (const entry of url.search.slice(1).split("&")) {
      const [key, ...rest] = entry.split("=");
      if (!allowed.has(key)) return null;
      decodeURIComponent(rest.join("="));
    }
    const query = url.searchParams.get("q");
    if (
      !query ||
      !query.trim() ||
      query.length > 2000 ||
      hasControl(query) ||
      /[\u202a-\u202e\u2066-\u2069]/u.test(query)
    )
      return null;
    return { url: value, query };
  } catch {
    return null;
  }
}
// Legacy udm=50 inputs are read as public text, never opened automatically.
export function validateGoogleAiUrl(
  value: unknown,
): GoogleAiDestination | null {
  const checked = validateGoogleDestination(value);
  return checked &&
    !checked.entryOnly &&
    new URL(checked.url).searchParams.get("udm") === "50"
    ? checked
    : null;
}
export function publicQuestionIssue(question: string): string | null {
  question = question.normalize("NFKC").replace(/\p{Cf}/gu, "");
  if (/\b(?:axdia|sentinel)\b/iu.test(question))
    return "Reformulez ce sujet interne en problème technologique public et générique.";
  if (
    /-----BEGIN[ A-Z]*PRIVATE KEY-----|\b(?:sk_live_|sk-proj-|sb_secret_)[\w-]+|\beyJ[\w-]{10,}\.[\w-]+\.[\w-]+/u.test(
      question,
    ) ||
    /\b(?:password|mot de passe|api[_ -]?key|token|secret)\s*[:=]\s*\S+/iu.test(
      question,
    ) ||
    /[\w.+-]+@[\w.-]+\.[a-z]{2,}/iu.test(question) ||
    /\bclient\s*[:=]\s*\S+/iu.test(question) ||
    /(?:\/Users\/|\/home\/|[A-Z]:\\Users\\)/iu.test(question) ||
    /\b(?:10\.\d{1,3}|192\.168|172\.(?:1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}\b/u.test(
      question,
    ) ||
    /\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]){11,30}\b/u.test(question)
  )
    return "Donnée potentiellement privée détectée. Retirez-la et reformulez une question publique avant toute ouverture.";
  return null;
}
// The parent builds this URL from the confirmed question alone. It never
// accepts a producer-supplied destination or silently truncates/repairs text.
export function googleAiQuestionDestination(
  question: unknown,
): GoogleAiDestination | null {
  if (!validPublicQuestion(question) || publicQuestionIssue(question))
    return null;
  const url = new URL("https://www.google.com/search");
  url.search = new URLSearchParams({
    hl: "fr",
    q: question,
  }).toString();
  const checked = validateGoogleDestination(url.href);
  return checked?.query === question ? checked : null;
}
function hasControl(value: string) {
  return [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
}

export type GoogleAiMessage =
  | { type: "capability"; version: 1 | 2 }
  | { type: "open"; destination: GoogleAiDestination };

export function parseGoogleAiMessage(value: unknown): GoogleAiMessage | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  const keys = Object.keys(data);
  if (data.version === 2) {
    if (
      data.type === "journal360:google-ai:capability-request" &&
      keys.length === 2 &&
      keys.includes("type") &&
      keys.includes("version")
    )
      return { type: "capability", version: 2 };
    if (
      data.type === "journal360:google-ai:question-request" &&
      keys.length === 3 &&
      keys.includes("type") &&
      keys.includes("version") &&
      keys.includes("question") &&
      validPublicQuestion(data.question)
    )
      return {
        type: "open",
        destination: {
          url: GOOGLE_AI_ENTRY,
          query: data.question,
          entryOnly: true,
        },
      };
    return null;
  }
  if (data.version !== 1) return null;
  if (
    data.type === "journal360:google-ai:capability-request" &&
    keys.length === 2 &&
    keys.includes("type") &&
    keys.includes("version")
  )
    return { type: "capability", version: 1 };
  if (
    data.type !== "journal360:google-ai:open-request" ||
    keys.length !== 3 ||
    !keys.includes("url") ||
    !keys.includes("type") ||
    !keys.includes("version")
  )
    return null;
  const destination =
    validateGoogleDestination(data.url) ||
    (data.url === GOOGLE_AI_ENTRY
      ? { url: GOOGLE_AI_ENTRY, query: "", entryOnly: true }
      : null);
  return destination ? { type: "open", destination } : null;
}

// Runs only in an interactive, opaque iframe. The copied anchor has a local
// href; capture its click before an imported fallback can navigate/open a tab.
// Every request is independently validated and confirmed again by the parent.
export function googleAiLinkBridge(parentOrigin: string) {
  return `(()=>{
  const hostOrigin=${JSON.stringify(parentOrigin)};
  const selector='[data-ai-link="google-ai-mode"]';
  let pending=null;
  addEventListener('message',event=>{
    const data=event.data;
    if(event.source!==parent||event.origin!==hostOrigin||!data||data.type!=='journal360:google-ai:capability'||data.version!==3||data.enabled!==true||typeof data.nonce!=='string'||!/^[0-9a-f-]{36}$/i.test(data.nonce)||!Number.isSafeInteger(data.expiresAt)||data.expiresAt<=Date.now()||!pending)return;
    const request=pending;pending=null;
    const requestId=[...crypto.getRandomValues(new Uint8Array(16))].map(n=>n.toString(16).padStart(2,'0')).join('');
    parent.postMessage({...request,version:3,nonce:data.nonce,requestId},hostOrigin);
  });
  for(const type of ['click','auxclick']) window.addEventListener(type,event=>{
    const element=event.target instanceof Element?event.target:null;
    const link=element?.closest(selector)||element?.closest('a[href]');
    if(!link)return;
    const marked=link.matches(selector);
    const url=link.getAttribute('href');
    if(!marked&&!(url?.startsWith('https://www.google.com/search?')||url==='https://www.google.com/ai'||url==='https://www.google.com/ai?hl=fr'))return;
    event.preventDefault();event.stopImmediatePropagation();
    if(type!=='click'||event.button!==0)return;
    const editor=link.closest('dialog,section,article')?.querySelector('textarea#question,textarea#deepQuestion,textarea[data-ai-question]');
    const isEntry=url==='https://www.google.com/ai'||url==='https://www.google.com/ai?hl=fr'||link.getAttribute('data-journal360-google-ai-url')==='https://www.google.com/ai';
    const raw=(marked?link.getAttribute('data-ai-question'):null)??(isEntry&&editor instanceof HTMLTextAreaElement?editor.value:null);
    // Line wrapping is layout. An empty or invalid question falls back to the
    // bare request: the parent still opens its dialog instead of staying silent.
    const question=typeof raw==='string'?raw.replace(/[ \\t\\r\\n]+/g,' ').trim():'';
    pending=question&&question.length<=2000&&!/[\\u0000-\\u001f\\u007f\\u202a-\\u202e\\u2066-\\u2069]/u.test(question)?{type:'journal360:google-ai:question-request',question}:{type:'journal360:google-ai:open-request',url:link.getAttribute('data-journal360-google-ai-url')||url};
    parent.postMessage({type:'journal360:google-ai:capability-request',version:3},hostOrigin);
  },true);
})();`;
}
