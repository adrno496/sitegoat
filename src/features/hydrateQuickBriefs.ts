import type { LocalRepository } from "../data/db";
import type { Edition } from "../data/model";
import { hash } from "../data/model";
import { extractQuickBriefs } from "../data/quickBriefs";
// Additive derived index recovery for HTML imported before the V9 reader.
// Originals, timestamps, notes and states remain unchanged.
export async function hydrateQuickBriefs(
  repository: LocalRepository,
  editions: Edition[],
  seen = new Set<string>(),
) {
  let recovered = 0;
  const errors: string[] = [];
  for (const edition of editions.filter(
    (e) => e.unified && !e.quickBriefs && !e.deleted,
  )) {
    const key = edition.id + ":" + edition.sha256;
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      const original = await repository.originals.get(edition.id);
      if (!original)
        throw Error(
          "Original indisponible pour reconstruire l’index des brèves.",
        );
      const html = new TextDecoder("utf-8", { fatal: true }).decode(
        original.bytes,
      );
      if (!html.includes("quickBriefsData")) continue;
      if ((await hash(original.bytes)) !== edition.sha256)
        throw Error(
          "Empreinte de l’original incorrecte : index des brèves non reconstruit.",
        );
      const companion = extractQuickBriefs(
        new DOMParser().parseFromString(html, "text/html"),
        edition.unified,
      );
      if (companion)
        await repository.transaction("rw", repository.editions, async () => {
          const current = await repository.editions.get(edition.id);
          if (current?.sha256 === edition.sha256 && !current.quickBriefs) {
            await repository.editions.update(edition.id, {
              quickBriefs: companion,
            });
            recovered++;
          }
        });
    } catch (e) {
      errors.push(
        e instanceof Error
          ? e.message
          : "Reconstruction des brèves impossible.",
      );
    }
  }
  return { recovered, errors };
}
