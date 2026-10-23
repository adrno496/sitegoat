import { validateUnified } from "../data/unified";
export interface VscodePrompt {
  id: string;
  title: string;
  content: string;
  filename: string;
  eventId?: string;
  sha256?: string;
  product?: string;
}
/** Read the imported document as inert data; never mount it or run its scripts. */
export function extractVscodePrompts(bytes: Uint8Array): VscodePrompt[] {
  const document = new DOMParser().parseFromString(
    new TextDecoder().decode(bytes),
    "text/html",
  );
  const unifiedBlock = document.querySelector(
    'script#unifiedData[type="application/json"]',
  );
  if (unifiedBlock) {
    const payload = validateUnified(
      JSON.parse(unifiedBlock.textContent || "null"),
    );
    return payload.promptAssets.map((asset) => ({
      ...asset,
      id: asset.promptId,
    }));
  }
  const explicit = document.querySelectorAll(
    ":is(textarea,pre)#fullPrompt, :is(textarea,pre)#vscodePrompt, :is(textarea,pre)#promptVscode, :is(textarea,pre)[data-prompt-vscode]",
  );
  const blocks = new Set<Element>(explicit);
  {
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
  const prompts = new Map<string, string>();
  for (const block of blocks) {
    const content =
      block instanceof HTMLTextAreaElement
        ? block.value
        : block.textContent || "";
    const title = (
      block.getAttribute("aria-label") ||
      block.closest("section,article")?.querySelector("h1,h2,h3,h4")
        ?.textContent ||
      ""
    )
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 500);
    if (content.trim() && !prompts.has(content)) prompts.set(content, title);
  }
  return [...prompts].map(([content, title], index) => ({
    id: `legacy-${index + 1}`,
    title: title || `Prompt VS Code ${index + 1}`,
    content,
    filename: `prompt-${index + 1}.md`,
  }));
}
// Compatibility helper: a singular export never guesses among multiple prompts.
export function extractVscodePrompt(bytes: Uint8Array): string | null {
  const prompts = extractVscodePrompts(bytes);
  return prompts.length === 1 ? prompts[0].content : null;
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

export function safePromptFilename(value: string) {
  return value
    .split(/[\\/]/)
    .pop()!
    .replace(/[<>:"|?*]/g, "_")
    .replace(/\p{Cf}/gu, "_")
    .split("")
    .map((c) => (c.charCodeAt(0) < 32 ? "_" : c))
    .join("")
    .slice(0, 220)
    .replace(/(?:\.md)?$/i, ".md");
}

export function promptDownloadFilename(
  editionFilename: string,
  prompt: VscodePrompt,
  index: number,
  count: number,
  unified: boolean,
) {
  return safePromptFilename(
    unified
      ? prompt.filename
      : count === 1
        ? vscodePromptFilename(editionFilename)
        : vscodePromptFilename(editionFilename).replace(
            ".md",
            `_${index + 1}.md`,
          ),
  );
}
