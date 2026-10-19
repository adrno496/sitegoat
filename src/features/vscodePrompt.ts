/** Read the imported document as inert data; never mount it or run its scripts. */
export function extractVscodePrompt(bytes: Uint8Array): string | null {
  const document = new DOMParser().parseFromString(
    new TextDecoder().decode(bytes),
    "text/html",
  );
  const explicit = document.querySelectorAll(
    "textarea#fullPrompt, textarea#vscodePrompt, textarea#promptVscode, [data-prompt-vscode]",
  );
  const blocks = new Set<Element>(explicit);
  if (!blocks.size) {
    for (const heading of document.querySelectorAll("h1,h2,h3,h4,summary")) {
      if (
        !/prompt/i.test(heading.textContent || "") ||
        !/vs\s*code|codex|claude\s*code/i.test(heading.textContent || "")
      )
        continue;
      // Keep the search within this section, before its next heading.
      for (
        let node = heading.nextElementSibling;
        node;
        node = node.nextElementSibling
      ) {
        if (/^H[1-6]$/.test(node.tagName)) break;
        if (node.matches("textarea,pre")) blocks.add(node);
        else
          for (const block of node.querySelectorAll("textarea,pre"))
            blocks.add(block);
      }
    }
  }
  const prompts = new Set(
    [...blocks]
      .map((block) =>
        block instanceof HTMLTextAreaElement
          ? block.value
          : block.textContent || "",
      )
      .filter((text) => text.trim()),
  );
  if (prompts.size > 1)
    throw new Error(
      "Plusieurs prompts ont été trouvés. Ouvrez le HTML pour choisir le prompt à exporter.",
    );
  return [...prompts][0] ?? null;
}

export function vscodePromptFilename(filename: string): string {
  const stem = filename
    .split(/[\\/]/)
    .pop()!
    .replace(/\.[^.]*$/, "")
    .replace(/[<>:"|?*]/g, "_")
    .split("")
    .map((character) => (character.charCodeAt(0) < 32 ? "_" : character))
    .join("")
    .slice(0, 180);
  return `${stem || "sentinel"}_PROMPT_VSCODE.md`;
}
