export const GOOGLE_AI_ENTRY = "https://www.google.com/ai";
const questionCache = new WeakMap<Uint8Array, string[]>();
export function rememberReadingQuestions(bytes: Uint8Array, doc: Document) {
  adaptV61QuestionButtons(doc);
  if (questionCache.has(bytes)) return;
  const questions = new Set<string>();
  for (const link of doc.querySelectorAll('[data-ai-link="google-ai-mode"]')) {
    const question =
      link.getAttribute("data-ai-question") ||
      validateGoogleAiUrl(link.getAttribute("href"))?.query;
    if (validPublicQuestion(question)) questions.add(question);
    if (questions.size >= 100) break;
  }
  questionCache.set(bytes, [...questions]);
}
// V6.1's standalone buttons open a native dialog and a plain Google search.
// Adapt only its explicit question fields in the display DOM; never infer a
// question from article text, private notes or arbitrary destinations.
function adaptV61QuestionButtons(doc: Document) {
  let data: unknown;
  try {
    data = JSON.parse(
      doc.querySelector('script#editionData[type="application/json"]')
        ?.textContent || "null",
    );
  } catch {
    return;
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return;
  const value = data as Record<string, unknown>;
  if (
    value.schemaVersion !== "6.1" ||
    !Array.isArray(value.items) ||
    !doc.querySelector("dialog#googleDialog textarea#question") ||
    !doc.querySelector("dialog#googleDialog a#openGoogle")
  )
    return;
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
  for (const button of doc.querySelectorAll(
    "button[data-article],button[data-topic]",
  )) {
    if (button.hasAttribute("data-ai-link")) continue;
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
    const question =
      typeof raw === "string"
        ? raw.replace(/[ \t\r\n]+/g, " ").trim()
        : undefined;
    if (!validPublicQuestion(question)) continue;
    button.setAttribute("data-ai-link", "google-ai-mode");
    button.setAttribute("data-ai-question", question);
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

// Accept a literal Google AI search, never a URL that needs repairing or a
// redirect. Keep the question as text; it is not evaluated or enriched by PWA data.
export function validateGoogleAiUrl(
  value: unknown,
): GoogleAiDestination | null {
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
      url.searchParams.get("udm") !== "50" ||
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
    validateGoogleAiUrl(data.url) ||
    (data.url === GOOGLE_AI_ENTRY
      ? { url: GOOGLE_AI_ENTRY, query: "", entryOnly: true }
      : null);
  return destination ? { type: "open", destination } : null;
}

// Runs only in an interactive, opaque iframe. The copied anchor has a local
// href; capture its click before an imported fallback can navigate/open a tab.
// Every request is independently validated and confirmed again by the parent.
export const GOOGLE_AI_LINK_BRIDGE = `(()=>{
  const selector='[data-ai-link="google-ai-mode"]';
  for(const type of ['click','auxclick']) window.addEventListener(type,event=>{
    const link=event.target instanceof Element?event.target.closest(selector):null;
    if(!link)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(type==='click'&&event.button===0){
    const question=link.getAttribute('data-ai-question');
    if(question!==null){parent.postMessage({type:'journal360:google-ai:question-request',version:2,question},'*');return;}
    parent.postMessage({
      type:'journal360:google-ai:open-request',version:1,
      url:link.getAttribute('data-journal360-google-ai-url')||link.getAttribute('href')
    },'*');}
  },true);
})();`;
