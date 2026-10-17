// Detection must never create a DOM from an unvalidated HTML resource.
// Only inert script text is inspected here. The destination parser validates it.
export function classifyFuture(
  bytes: Uint8Array,
): "future" | "legacy" | "journal" | "unknown" {
  const raw = new TextDecoder().decode(bytes);
  if (/^\s*\{/.test(raw)) {
    try {
      const value = JSON.parse(raw);
      return value.format === "journal360.future"
        ? "future"
        : value.contentType === "ai-radar"
          ? "legacy"
          : "unknown";
    } catch {
      return /journal360\.future/.test(raw) ? "future" : "unknown";
    }
  }
  let ordinary: "journal" | "unknown" = "journal";
  const scripts = raw.matchAll(
    /<script\b((?:[^>"']|"[^"]*"|'[^']*')*)>([\s\S]*?)(?:<\/script\s*>|$)/gi,
  );
  for (const [, attributes, content] of scripts) {
    const attribute = [
      ...attributes.matchAll(
        /([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g,
      ),
    ].find((match) => match[1].toLowerCase() === "id");
    const id = (
      attribute?.[2] ||
      attribute?.[3] ||
      attribute?.[4] ||
      ""
    ).replace(/&#(x[0-9a-f]+|\d+);?/gi, (_, n: string) => {
      const code =
        n[0].toLowerCase() === "x" ? parseInt(n.slice(1), 16) : parseInt(n, 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    });
    if (id === "futureData") return "future";
    try {
      const value = JSON.parse(content);
      if (value.format === "journal360.future") return "future";
      if (value.contentType === "ai-radar") return "legacy";
      if (id === "editionData" && value.contentType) ordinary = "unknown";
    } catch {
      if (
        id === "editionData" &&
        /"contentType"\s*:\s*"ai-radar"/.test(content)
      )
        return "legacy";
    }
  }
  return ordinary;
}
