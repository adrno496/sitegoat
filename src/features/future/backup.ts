import { assertFutureBackupBudget } from "./budget";
import JSZip from "jszip";
import Dexie from "dexie";
import { z } from "zod";
import { blobOf, hash, now } from "../../data/model";
import {
  canonical,
  summarize,
  type FutureRepository,
  type FutureVersion,
} from "./db";
import { inspectFuture, validateFuture } from "./import";
import {
  personalSchema,
  type FuturePayload,
  type FuturePersonal,
} from "./schema";
const hex = z.string().regex(/^[a-f0-9]{64}$/);
const versionSchema = z
  .object({
    id: z.string().regex(/^fv-[a-f0-9]{64}$/),
    documentId: z.string().max(200),
    revision: z.number().int().positive(),
    sha256: hex,
    payloadHash: hex,
    filename: z.string().max(300),
    size: z
      .number()
      .int()
      .positive()
      .max(10 * 1024 * 1024),
    importedAt: z.iso.datetime(),
    updatedAt: z.iso.datetime({ offset: true }),
    kind: z.enum(["html", "json", "legacy-radar"]),
    changes: z.array(z.string().max(6000)).max(100),
  })
  .strict();
const changeSchema = z
  .object({
    id: z.uuid(),
    documentId: z.string().max(200),
    at: z.iso.datetime(),
    kind: z.enum(["import", "personal", "restore"]),
    description: z.string().max(6000),
  })
  .strict();
const manifestSchema = z
  .object({
    format: z.literal("journal360.future.backup"),
    version: z.literal(1),
    generatedAt: z.iso.datetime(),
    versions: z.array(versionSchema).max(3000),
    contents: z
      .array(z.object({ id: z.string(), payload: z.unknown() }).strict())
      .max(3000),
    personal: z.array(personalSchema).max(3000),
    changes: z.array(changeSchema).max(50000),
  })
  .strict();
export type FutureArchive = {
  versions: FutureVersion[];
  contents: { id: string; payload: FuturePayload }[];
  personal: FuturePersonal[];
  changes: z.infer<typeof changeSchema>[];
  originals: { id: string; bytes: Uint8Array }[];
};
const encode = (v: unknown) => new TextEncoder().encode(canonical(v));
export async function exportFutureBackup(db: FutureRepository) {
  const data = await db.transaction(
    "r",
    [db.versions, db.contents, db.personal, db.changes, db.originals],
    async () => ({
      versions: await db.versions.toArray(),
      contents: await db.contents.toArray(),
      personal: await db.personal.toArray(),
      changes: await db.changes.toArray(),
      originals: await db.originals.toArray(),
    }),
  );
  const manifest = JSON.stringify(
    manifestSchema.parse({
      format: "journal360.future.backup",
      version: 1,
      generatedAt: now(),
      versions: data.versions,
      contents: data.contents,
      personal: data.personal,
      changes: data.changes,
    }),
  );
  assertFutureBackupBudget(data);
  const zip = new JSZip();
  zip.file("future.json", manifest);
  for (const v of data.versions) {
    const original = data.originals.find((o) => o.id === v.id);
    if (!original || (await hash(original.bytes)) !== v.sha256)
      throw Error("Original absent ou endommagé ; sauvegarde annulée.");
    zip.file(
      `originals/${v.id}.${v.kind === "json" ? "json" : "html"}`,
      original.bytes,
    );
  }
  return blobOf(
    await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" }),
    "application/zip",
  );
}
export async function inspectFutureBackup(
  bytes: Uint8Array,
): Promise<FutureArchive> {
  if (bytes.length > 150 * 1024 * 1024)
    throw Error("Archive supérieure à 150 Mo.");
  const zip = await JSZip.loadAsync(bytes);
  let total = 0;
  const entries = Object.values(zip.files);
  if (entries.length > 3002) throw Error("Archive trop complexe.");
  for (const e of entries) {
    if (e.dir) {
      if (e.name !== "originals/") throw Error("Dossier ZIP interdit.");
      continue;
    }
    const original = Reflect.get(e, "unsafeOriginalName") || e.name;
    if (
      original !== e.name ||
      !(
        e.name === "future.json" ||
        /^originals\/fv-[a-f0-9]{64}\.(html|json)$/.test(e.name)
      )
    )
      throw Error("Chemin ZIP interdit.");
    const size = (Reflect.get(e, "_data") as { uncompressedSize?: number })
      ?.uncompressedSize;
    if (
      typeof size !== "number" ||
      size > (e.name === "future.json" ? 32 : 10) * 1024 * 1024 ||
      (total += size) > 150 * 1024 * 1024
    )
      throw Error("Archive décompressée trop volumineuse.");
  }
  const file = zip.file("future.json");
  if (!file) throw Error("Sauvegarde Le Futur absente.");
  const m = manifestSchema.parse(
    JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(
        await file.async("uint8array"),
      ),
    ),
  );
  for (const list of [m.versions, m.contents])
    if (new Set(list.map((v) => v.id)).size !== list.length)
      throw Error("Identifiant de version dupliqué.");
  if (
    new Set(m.personal.map((p) => p.documentId)).size !== m.personal.length ||
    new Set(m.changes.map((c) => c.id)).size !== m.changes.length
  )
    throw Error("Donnée personnelle dupliquée.");
  if (m.contents.length !== m.versions.length)
    throw Error("Snapshots manquants.");
  if (entries.filter((e) => !e.dir).length !== m.versions.length + 1)
    throw Error("Fichiers non déclarés dans l’archive.");
  const byDocument = new Map<string, FutureVersion[]>();
  for (const v of m.versions)
    byDocument.set(v.documentId, [...(byDocument.get(v.documentId) || []), v]);
  for (const versions of byDocument.values()) {
    versions.sort((a, b) => a.revision - b.revision);
    for (let i = 1; i < versions.length; i++)
      if (
        Date.parse(versions[i].updatedAt) <=
        Date.parse(versions[i - 1].updatedAt)
      )
        throw Error("Chronologie des révisions incohérente.");
  }
  const originals: FutureArchive["originals"] = [],
    contents: FutureArchive["contents"] = [];
  const revisions = new Set<string>();
  for (const v of m.versions) {
    const key = `${v.documentId}:${v.revision}`;
    if (revisions.has(key)) throw Error("Révision en conflit.");
    revisions.add(key);
    const original = zip.file(
      `originals/${v.id}.${v.kind === "json" ? "json" : "html"}`,
    );
    if (!original) throw Error("Original manquant.");
    const raw = await original.async("uint8array");
    const p = validateFuture(m.contents.find((c) => c.id === v.id)?.payload);
    const c = await inspectFuture({ name: v.filename, bytes: raw }, v.revision);
    if (
      !c.payload ||
      c.kind !== v.kind ||
      c.sha256 !== v.sha256 ||
      raw.length !== v.size ||
      p.documentId !== v.documentId ||
      p.revision !== v.revision ||
      p.updatedAt !== v.updatedAt ||
      (await hash(encode(p))) !== v.payloadHash ||
      v.id !==
        `fv-${await hash(new TextEncoder().encode(`${v.documentId}:${v.revision}:${v.sha256}`))}`
    )
      throw Error("Empreinte ou snapshot invalide.");
    const reconstructed = c.payload;
    if (v.kind === "legacy-radar") {
      reconstructed.updatedAt = p.updatedAt;
      reconstructed.provenance.providedAt = p.provenance.providedAt;
    }
    if (canonical(reconstructed) !== canonical(p))
      throw Error("Le snapshot ne correspond pas à son original.");
    originals.push({ id: v.id, bytes: raw });
    contents.push({ id: v.id, payload: p });
  }
  const ids = new Set(m.versions.map((v) => v.documentId));
  if ([...m.personal, ...m.changes].some((p) => !ids.has(p.documentId)))
    throw Error("Données personnelles sans dossier.");
  return {
    versions: m.versions,
    contents,
    originals,
    personal: m.personal,
    changes: m.changes,
  };
}
export async function restoreFutureBackup(
  db: FutureRepository,
  data: FutureArchive,
) {
  // Validation is repeated at the boundary: callers cannot bypass original/hash checks.
  const zip = new JSZip();
  zip.file(
    "future.json",
    JSON.stringify({
      format: "journal360.future.backup",
      version: 1,
      generatedAt: now(),
      versions: data.versions,
      contents: data.contents,
      personal: data.personal,
      changes: data.changes,
    }),
  );
  for (const v of data.versions) {
    const o = data.originals.find((o) => o.id === v.id);
    if (!o) throw Error("Original manquant.");
    zip.file(
      `originals/${v.id}.${v.kind === "json" ? "json" : "html"}`,
      o.bytes,
    );
  }
  const checked = await inspectFutureBackup(
    await zip.generateAsync({ type: "uint8array" }),
  );
  return db.transaction(
    "rw",
    [
      db.documents,
      db.versions,
      db.contents,
      db.originals,
      db.personal,
      db.changes,
    ],
    async () => {
      let added = 0;
      for (const v of [...checked.versions].sort(
        (a, b) => a.revision - b.revision,
      )) {
        const same = await db.versions
          .where("[documentId+revision]")
          .equals([v.documentId, v.revision])
          .first();
        if (same) {
          if (same.payloadHash !== v.payloadHash)
            throw Error(
              "Conflit de révision entre appareils : restauration annulée, deux archives à conserver.",
            );
          continue;
        }
        const p = checked.contents.find((c) => c.id === v.id)!.payload,
          previous = await db.documents.get(v.documentId);
        if (
          previous &&
          v.revision > previous.revision &&
          Date.parse(v.updatedAt) <= Date.parse(previous.updatedAt)
        )
          throw Error("Date de révision non croissante.");
        await db.versions.add(v);
        await db.contents.add({ id: v.id, payload: p });
        await db.originals.add(checked.originals.find((o) => o.id === v.id)!);
        if (!previous || v.revision > previous.revision) {
          const summary = summarize(p, v);
          summary.changedAt = now();
          summary.importedAt = previous?.importedAt || v.importedAt;
          await db.documents.put(summary);
        }
        added++;
      }
      for (const incoming of checked.personal) {
        const local = await db.personal.get(incoming.documentId);
        if (!local) {
          await db.personal.put(incoming);
          continue;
        }
        const newer =
          incoming.updatedAt > local.updatedAt ||
          (incoming.updatedAt === local.updatedAt &&
            canonical(incoming) > canonical(local));
        const winner = newer ? incoming : local,
          other = newer ? local : incoming,
          notes = [...local.notes];
        for (const note of incoming.notes) {
          const existing = notes.find((n) => n.id === note.id);
          if (!existing) notes.push(note);
          else if (canonical(existing) !== canonical(note)) {
            const h = await Dexie.waitFor(hash(encode(note)));
            const id = `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
            if (!notes.some((n) => n.id === id)) notes.push({ ...note, id });
          }
        }
        const conflict = canonical({
          decision: other.decision,
          invalidation: other.invalidation,
          reviewDate: other.reviewDate,
          actions: other.actions,
          sourceReviews: other.sourceReviews,
        });
        if (
          conflict !==
          canonical({
            decision: winner.decision,
            invalidation: winner.invalidation,
            reviewDate: winner.reviewDate,
            actions: winner.actions,
            sourceReviews: winner.sourceReviews,
          })
        ) {
          const body = `État personnel conservé lors de la fusion : ${conflict}`;
          const h = await Dexie.waitFor(hash(encode(body)));
          const id = `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
          if (!notes.some((n) => n.id === id))
            notes.push({ id, body, at: other.updatedAt });
        }
        await db.personal.put(
          personalSchema.parse({
            ...winner,
            favorite: local.favorite || incoming.favorite,
            notes,
            actions: { ...other.actions, ...winner.actions },
            sourceReviews: { ...other.sourceReviews, ...winner.sourceReviews },
          }),
        );
      }
      for (const c of checked.changes) {
        const local = await db.changes.get(c.id);
        if (local && canonical(local) !== canonical(c))
          throw Error("Historique en conflit.");
        if (!local) await db.changes.add(c);
      }
      await db.assertBackupCapacity();
      return added;
    },
  );
}
