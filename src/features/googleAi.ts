export interface GoogleAiDestination {
  url: string;
  query: string;
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
  { type: "capability" } | { type: "open"; destination: GoogleAiDestination };

export function parseGoogleAiMessage(value: unknown): GoogleAiMessage | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  const keys = Object.keys(data);
  if (data.version !== 1) return null;
  if (
    data.type === "journal360:google-ai:capability-request" &&
    keys.length === 2 &&
    keys.includes("type") &&
    keys.includes("version")
  )
    return { type: "capability" };
  if (
    data.type !== "journal360:google-ai:open-request" ||
    keys.length !== 3 ||
    !keys.includes("url") ||
    !keys.includes("type") ||
    !keys.includes("version")
  )
    return null;
  const destination = validateGoogleAiUrl(data.url);
  return destination ? { type: "open", destination } : null;
}

// Runs only in an interactive, opaque iframe. The copied anchor has a local
// href; capture its click before an imported fallback can navigate/open a tab.
// Every request is independently validated and confirmed again by the parent.
export const GOOGLE_AI_LINK_BRIDGE = `(()=>{
  const selector='a[data-ai-link="google-ai-mode"]';
  for(const type of ['click','auxclick']) window.addEventListener(type,event=>{
    const link=event.target instanceof Element?event.target.closest(selector):null;
    if(!link)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(type==='click'&&event.button===0)parent.postMessage({
      type:'journal360:google-ai:open-request',version:1,
      url:link.getAttribute('data-journal360-google-ai-url')||link.getAttribute('href')
    },'*');
  },true);
})();`;
