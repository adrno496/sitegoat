import type { UnifiedEdition } from "../data/unified";

// This only detects whether the original needs its renderer. It never rebuilds
// its layout, runs publisher code or grants script permissions.
export function needsOriginalInteractions(
  bytes: Uint8Array,
  unified?: UnifiedEdition,
): boolean {
  if (!unified?.items.length) return false;
  const doc = new DOMParser().parseFromString(
    new TextDecoder().decode(bytes),
    "text/html",
  );
  if (!doc.querySelector('script#unifiedData[type="application/json"]'))
    return false;
  doc.body.querySelectorAll("script,style,template").forEach((n) => n.remove());
  const norm = (s: string) => s.replace(/\s+/g, " ").trim();
  const text = norm(doc.body.textContent || "");
  return !unified.items.every((i) =>
    [i.title, i.summary, i.plain, i.detail]
      .filter((s) => s.trim())
      .every((s) => text.includes(norm(s))),
  );
}
