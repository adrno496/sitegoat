import { APP_VERSION } from "../config";
import JSZip from "jszip";
import { z } from "zod";
import {
  editionSchema,
  stateSchema,
  noteSchema,
  hash,
  blobOf,
  now,
  type Edition,
  type Original,
  type ReadingState,
  type Note,
} from "../data/model";
import { LocalRepository } from "../data/db";
const manifestSchema = z.object({
  format: z.literal("journal360"),
  formatVersion: z.literal(1),
  appVersion: z.string(),
  generatedAt: z.iso.datetime(),
  privacyWarning: z.string(),
  editionCount: z.number().int().max(1000),
  editions: z.array(editionSchema).max(1000),
  states: z.array(stateSchema).max(100_000),
  notes: z.array(noteSchema).max(10000),
});
export interface BackupData {
  editions: Edition[];
  originals: Original[];
  states: ReadingState[];
  notes: Note[];
}
export async function exportBackup(repository: LocalRepository): Promise<Blob> {
  const data = await repository.snapshot();
  const zip = new JSZip();
  zip.file(
    "manifest.json",
    JSON.stringify({
      format: "journal360",
      formatVersion: 1,
      appVersion: APP_VERSION,
      generatedAt: now(),
      privacyWarning:
        "Cette archive contient vos documents et notes privés. Aucun token ni session.",
      editionCount: data.editions.length,
      editions: data.editions,
      states: data.states,
      notes: data.notes,
    }),
  );
  for (const e of data.editions) {
    const o = data.originals.find((f) => f.id === e.id);
    if (!o) throw new Error("Original manquant : sauvegarde annulée.");
    if ((await hash(o.bytes)) !== e.sha256)
      throw new Error("Original endommagé : sauvegarde annulée.");
    zip.file(`files/${e.id}.html`, o.bytes);
  }
  return blobOf(
    await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
      compressionOptions: { level: 3 },
    }),
    "application/zip",
  );
}
export async function inspectBackup(bytes: Uint8Array): Promise<BackupData> {
  if (bytes.length > 150 * 1024 * 1024)
    throw new Error("Archive supérieure à 150 Mo.");
  const zip = await JSZip.loadAsync(bytes, { checkCRC32: false });
  const entries = Object.values(zip.files);
  if (entries.length > 1002)
    throw new Error("Trop de fichiers dans cette archive.");
  let total = 0;
  for (const entry of entries) {
    if (entry.dir) continue;
    const internal = Reflect.get(entry, "_data") as
      { uncompressedSize?: number } | undefined;
    const size = internal?.uncompressedSize;
    if (typeof size !== "number" || size > 15 * 1024 * 1024)
      throw new Error("Entrée ZIP invalide ou trop volumineuse.");
    total += size;
    if (total > 150 * 1024 * 1024)
      throw new Error("Archive décompressée trop volumineuse.");
    if (
      entry.name !== "manifest.json" &&
      !/^files\/[a-f0-9-]{36}\.html$/.test(entry.name)
    )
      throw new Error("Chemin ZIP non autorisé.");
  }
  const file = zip.file("manifest.json");
  if (!file) throw new Error("Manifest de sauvegarde absent.");
  const manifest = manifestSchema.parse(JSON.parse(await file.async("string")));
  if (
    manifest.editionCount !== manifest.editions.length ||
    new Set(manifest.editions.map((e) => e.id)).size !==
      manifest.editions.length
  )
    throw new Error("Comptage ou identifiants incohérents.");
  const originals: Original[] = [];
  for (const e of manifest.editions) {
    const f = zip.file(`files/${e.id}.html`);
    if (!f) throw new Error("Un original est manquant.");
    const original = await f.async("uint8array");
    if (original.length !== e.size || (await hash(original)) !== e.sha256)
      throw new Error("Checksum invalide : aucune donnée restaurée.");
    originals.push({ id: e.id, bytes: original });
  }
  const ids = new Set(manifest.editions.map((e) => e.id));
  if (
    manifest.states.some(
      (s) => !ids.has(s.editionId) || s.id !== `${s.editionId}:${s.articleId}`,
    ) ||
    manifest.notes.some((n) => !ids.has(n.editionId))
  )
    throw new Error("État ou note sans édition valide.");
  return {
    editions: manifest.editions,
    originals,
    states: manifest.states,
    notes: manifest.notes,
  };
}
export async function restoreBackup(
  repository: LocalRepository,
  data: BackupData,
) {
  let added = 0,
    conflicts = 0;
  await repository.transaction(
    "rw",
    [
      repository.editions,
      repository.originals,
      repository.states,
      repository.notes,
    ],
    async () => {
      const mapping = new Map<string, string>();
      for (const e of data.editions) {
        const exact = await repository.editions.get(e.id);
        const same =
          exact?.sha256 === e.sha256
            ? exact
            : await repository.editions
                .where("sha256")
                .equals(e.sha256)
                .first();
        if (same) {
          mapping.set(e.id, same.id);
          continue;
        }
        const id = exact ? crypto.randomUUID() : e.id;
        mapping.set(e.id, id);
        await repository.editions.add({
          ...e,
          id,
          familyId: exact ? id : e.familyId,
        });
        await repository.originals.add({
          id,
          bytes: data.originals.find((o) => o.id === e.id)!.bytes,
        });
        added++;
      }
      for (const state of data.states) {
        const editionId = mapping.get(state.editionId)!;
        const id = `${editionId}:${state.articleId}`;
        const existing = await repository.states.get(id);
        await repository.states.put({
          ...state,
          editionId,
          id,
          favorite: state.favorite || !!existing?.favorite,
          read: state.read || !!existing?.read,
          openedAt:
            [state.openedAt, existing?.openedAt]
              .filter(Boolean)
              .sort()
              .at(-1) || null,
          updatedAt:
            existing && existing.updatedAt > state.updatedAt
              ? existing.updatedAt
              : state.updatedAt,
        });
      }
      for (const note of data.notes) {
        const editionId = mapping.get(note.editionId)!;
        const existing = await repository.notes.get(note.id);
        if (
          existing &&
          existing.body === note.body &&
          existing.kind === note.kind
        )
          continue;
        if (existing) {
          await repository.notes.add({
            ...note,
            editionId,
            id: crypto.randomUUID(),
          });
          conflicts++;
        } else await repository.notes.add({ ...note, editionId });
      }
    },
  );
  return { added, conflicts };
}
export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
