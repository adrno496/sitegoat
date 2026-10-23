import JSZip from "jszip";
import type { Edition } from "../../data/model";
import { blobOf, hash } from "../../data/model";
import { db } from "../../data/db";
import {
  extractVscodePrompts,
  promptDownloadFilename,
  type VscodePrompt,
} from "../vscodePrompt";

export async function createPromptArchive(editions: Edition[]) {
  const zip = new JSZip();
  let count = 0;
  for (const [documentIndex, edition] of editions.entries()) {
    if (edition.deleted) continue;
    let prompts: VscodePrompt[] | undefined = edition.unified?.promptAssets.map(
      (p) => ({
        ...p,
        id: p.promptId,
      }),
    );
    if (!prompts) {
      const original = await db.originals.get(edition.id);
      if (!original)
        throw Error(
          `Original indisponible pour « ${edition.title} » : ZIP annulé.`,
        );
      prompts = extractVscodePrompts(original.bytes);
    }
    // A separate folder per original preserves every version of every prompt.
    const folder = `${documentIndex + 1}-${edition.date || "sans-date"}-${(edition.editionSlot || "sans-heure").replace(":", "h")}`;
    const names = new Set<string>();
    for (const [index, prompt] of prompts.entries()) {
      if (
        prompt.sha256 &&
        (await hash(new TextEncoder().encode(prompt.content))) !== prompt.sha256
      )
        throw Error(`Checksum invalide pour « ${prompt.title} » : ZIP annulé.`);
      const filename = promptDownloadFilename(
        edition.filename,
        prompt,
        index,
        prompts.length,
        !!edition.unified,
      );
      let unique = filename;
      let suffix = 2;
      while (names.has(unique.toLowerCase()))
        unique = filename.replace(/\.md$/i, `_${suffix++}.md`);
      names.add(unique.toLowerCase());
      zip.file(`${folder}/${unique}`, prompt.content);
      count++;
    }
  }
  if (!count) throw Error("Aucun prompt identifiable à télécharger.");
  const blob = blobOf(
    await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" }),
    "application/zip",
  );
  return { blob, count };
}
