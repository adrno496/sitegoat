import { z } from "zod";
import { hash, now } from "../data/model";
import { LocalRepository } from "../data/db";
import { canonicalJSON, exportBackup, inspectBackup, restoreBackup, type BackupData } from "./backup";

const partSchema = z.object({ filename: z.string().regex(/^journal360-part-\d{5}\.zip$/), sha256: z.string().regex(/^[a-f0-9]{64}$/), bytes: z.number().int().positive(), editions: z.array(z.string()).max(4000) }).strict();
const inventorySchema = z.object({ format: z.literal("journal360.segments"), version: z.literal(1), id: z.uuid(), generatedAt: z.iso.datetime(), parts: z.array(partSchema).min(1).max(10000), counts: z.object({ editions: z.number().int().nonnegative(), originals: z.number().int().nonnegative(), states: z.number().int().nonnegative(), notes: z.number().int().nonnegative() }).strict() }).strict();
export type SegmentInventory = z.infer<typeof inventorySchema>;
export const emptyBackup = (): BackupData => ({ editions: [], originals: [], states: [], notes: [] });
export function archiveBudget(data: Pick<BackupData, "editions" | "states" | "notes">) {
  const originalBytes = data.editions.reduce((n,e) => n + e.size, 0);
  const manifestBytes = new TextEncoder().encode(JSON.stringify(data)).length;
  return { editions: data.editions.length, originalBytes, manifestBytes, segmentedRecommended: data.editions.length > 3000 || originalBytes + manifestBytes > 100 * 1024 * 1024 || manifestBytes > 48 * 1024 * 1024 || data.states.length > 80000 || data.notes.length > 8000 };
}
// ZIP v1/2/3 segments retain the old reader. A separate, inert inventory binds
// all files. Work on one stable snapshot; never delete or archive to save space.
export function planSegments(data: BackupData, targetBytes = 24 * 1024 * 1024, targetCount = 1000): BackupData[] {
  const parts: BackupData[] = []; let part = emptyBackup(), size = 0;
  const originals = new Map(data.originals.map(o => [o.id, o]));
  const states = new Map<string, BackupData['states']>(), notes = new Map<string, BackupData['notes']>();
  for (const s of data.states) states.set(s.editionId, [...(states.get(s.editionId) || []), s]);
  for (const n of data.notes) notes.set(n.editionId, [...(notes.get(n.editionId) || []), n]);
  for (const e of data.editions) {
    const o = originals.get(e.id); if (!o) throw Error("Original manquant : segmentation annulée.");
    const ss = states.get(e.id) || [], nn = notes.get(e.id) || [];
    const baseCost = o.bytes.length + new TextEncoder().encode(JSON.stringify(e)).length + 2048;
    const units: BackupData[] = [];
    let unit = { editions: [e], originals: [o], states: [] as BackupData['states'], notes: [] as BackupData['notes'] }, unitSize = baseCost;
    for (const state of ss) {
      const cost = new TextEncoder().encode(JSON.stringify(state)).length + 1;
      if (unit.states.length && (unitSize + cost > targetBytes || unit.states.length >= 50000)) { units.push(unit); unit = { editions:[e], originals:[o], states:[], notes:[] };unitSize=baseCost; }
      unit.states.push(state);unitSize += cost;
    }
    for (const note of nn) {
      const cost = new TextEncoder().encode(JSON.stringify(note)).length + 1;
      if ((unit.notes.length || unit.states.length) && (unitSize + cost > targetBytes || unit.notes.length >= 5000)) { units.push(unit);unit={editions:[e],originals:[o],states:[],notes:[]};unitSize=baseCost; }
      unit.notes.push(note);unitSize += cost;
    }
    units.push(unit);
    for (const unit of units) {
      const cost = o.bytes.length + new TextEncoder().encode(JSON.stringify({editions:unit.editions,states:unit.states,notes:unit.notes})).length + 2048;
      if (part.editions.length && (size + cost > targetBytes || part.editions.some(x=>x.id===e.id) || part.editions.length >= Math.min(targetCount,4000) || part.states.length + unit.states.length > 100000 || part.notes.length + unit.notes.length > 10000)) {parts.push(part);part=emptyBackup();size=0;}
      part.editions.push(e);part.originals.push(o);part.states.push(...unit.states);part.notes.push(...unit.notes);size += cost;
    }
  }
  if (part.editions.length || !parts.length) parts.push(part);
  return parts;
}
export async function* exportSegments(repository: LocalRepository, snapshot?: BackupData, targetBytes?: number, targetCount?: number) {
  const data = snapshot || await repository.snapshot();
  const inventory: SegmentInventory = { format: "journal360.segments", version: 1, id: crypto.randomUUID(), generatedAt: now(), parts: [], counts: { editions: data.editions.length, originals: data.originals.length, states: data.states.length, notes: data.notes.length } };
  let index = 0;
  for (const part of planSegments(data, targetBytes, targetCount)) {
    const blob = await exportBackup(repository, part);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const entry = { filename: `journal360-part-${String(++index).padStart(5,"0")}.zip`, sha256: await hash(bytes), bytes: bytes.length, editions: part.editions.map(e => e.id) };
    inventory.parts.push(entry);
    yield { filename: entry.filename, blob, inventory: undefined };
  }
  yield { filename: "journal360-inventory.json", blob: new Blob([JSON.stringify(inventorySchema.parse(inventory), null, 2)], {type:"application/json"}), inventory };
}
export async function inspectSegments(inventoryBytes: Uint8Array, files: { name: string; bytes: Uint8Array }[]): Promise<BackupData> {
  if (inventoryBytes.length > 8 * 1024 * 1024) throw Error("Inventaire trop volumineux.");
  const m = inventorySchema.parse(JSON.parse(new TextDecoder("utf-8", {fatal:true}).decode(inventoryBytes)));
  if (new Set(m.parts.map(p=>p.filename)).size !== m.parts.length || new Set(files.map(p=>p.name)).size !== files.length || files.length !== m.parts.length) throw Error("Segments manquants ou dupliqués.");
  const data = emptyBackup();
  for (const p of m.parts) {
    const f = files.find(f=>f.name===p.filename);
    if (!f || f.bytes.length !== p.bytes || await hash(f.bytes) !== p.sha256) throw Error("Segment absent ou checksum invalide : aucune écriture.");
    const part = await inspectBackup(f.bytes);
    if (canonicalJSON(part.editions.map(e=>e.id)) !== canonicalJSON(p.editions)) throw Error("Inventaire des éditions différent du segment.");
    data.editions.push(...part.editions); data.originals.push(...part.originals);data.states.push(...part.states);data.notes.push(...part.notes);
  }
  // An edition with many annotations may occur in several historical ZIPs.
  // It is one identity only; conflicting copies are rejected before writing.
  for (const key of ["editions", "originals"] as const) {
    const seen = new Map<string, string>();
    const unique = data[key].filter(item=>{
      const value = key === "originals" ? "" : canonicalJSON(item);
      if (seen.has(item.id)) { if (seen.get(item.id) !== value) throw Error("Identité en conflit dans les segments."); return false; }
      seen.set(item.id,value);return true;
    });
    if (key === "editions") data.editions = unique as BackupData['editions'];
    else data.originals = unique as BackupData['originals'];
  }
  for (const key of ["editions","originals","states","notes"] as const) if (data[key].length !== m.counts[key] || new Set(data[key].map(x=>x.id)).size !== data[key].length) throw Error("Comptage ou identité en conflit dans les segments.");
  return data;
}
export async function restoreSegments(repository: LocalRepository, inventory: Uint8Array, files: {name:string;bytes:Uint8Array}[]) {
  return restoreBackup(repository, await inspectSegments(inventory, files));
}
