import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import Dexie from "dexie";
import JSZip from "jszip";
import { LocalRepository } from "../src/data/db";
import {
  inspectHTML,
  commitImport,
  isolatedHTML,
} from "../src/features/import";
import {
  exportBackup,
  inspectBackup,
  restoreBackup,
} from "../src/features/backup";
import { hash, now, sortEditions } from "../src/data/model";
let db: LocalRepository;
const fixture = (name: string) =>
  new Uint8Array(readFileSync(`tests/fixtures/${name}`));
beforeEach(() => {
  db = new LocalRepository(`test-${crypto.randomUUID()}`);
});
afterEach(async () => {
  db.close();
  await db.delete();
});
describe("Import et stockage réel (IndexedDB émulé)", () => {
  it("hash SHA-256 connu et renommage", async () => {
    expect(await hash(new TextEncoder().encode("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    const bytes = fixture("generic.html");
    expect((await inspectHTML("renomme.htm", bytes)).sha256).toBe(
      (await inspectHTML("generic.html", bytes)).sha256,
    );
  });
  it("JSON validé, dates et event_id explicites", async () => {
    const e = await inspectHTML("test.html", fixture("edition-13.html"));
    expect(e.articles).toHaveLength(3);
    expect(e.date).toBe("2026-10-13");
    expect(e.articles[0].eventId).toBe("demo-local-first");
  });
  it("fallback sans articles ou date inventés", async () => {
    const e = await inspectHTML("generic.html", fixture("generic.html"));
    expect(e.date).toBeNull();
    expect(e.articles).toHaveLength(0);
    expect(e.text).toContain("galaxie");
  });
  it("refuse format, encodage, taille et fichiers corrompus", async () => {
    await expect(
      inspectHTML("x.txt", fixture("generic.html")),
    ).rejects.toThrow();
    await expect(
      inspectHTML("x.html", new Uint8Array(10 * 1024 * 1024 + 1)),
    ).rejects.toThrow();
    await expect(
      inspectHTML("x.html", new Uint8Array([0xff])),
    ).rejects.toThrow();
    await expect(
      inspectHTML("x.html", new TextEncoder().encode("ceci est du texte")),
    ).rejects.toThrow();
  });
  it("doublon ignoré, conservé et nouvelle version sans écrasement", async () => {
    const bytes = fixture("generic.html");
    const e = await inspectHTML("generic.html", bytes);
    await commitImport(db, e, bytes, "keep");
    const second = await inspectHTML("renomme.html", bytes);
    expect((await commitImport(db, second, bytes, "ignore")).duplicate).toBe(
      true,
    );
    expect(await db.editions.count()).toBe(1);
    await commitImport(db, second, bytes, "version", e.id);
    expect((await db.editions.get(second.id))?.revision).toBe(2);
    expect(Array.from((await db.originals.get(e.id))!.bytes)).toEqual(
      Array.from(bytes),
    );
  });
  it("rollback atomique sur refus du stockage", async () => {
    const bytes = fixture("generic.html");
    const e = await inspectHTML("generic.html", bytes);
    vi.spyOn(db.editions, "add").mockRejectedValueOnce(
      new DOMException("Quota", "QuotaExceededError"),
    );
    await expect(db.saveEdition(e, bytes)).rejects.toThrow();
    expect(await db.originals.count()).toBe(0);
    expect(await db.editions.count()).toBe(0);
  });
  it("lecture et favori persistants après fermeture", async () => {
    const bytes = fixture("generic.html");
    const e = await inspectHTML("generic.html", bytes);
    await db.saveEdition(e, bytes);
    await db.reading(e.id, "edition", { read: true, favorite: true });
    db.close();
    await db.open();
    expect((await db.states.get(`${e.id}:edition`))?.favorite).toBe(true);
    expect((await db.states.get(`${e.id}:edition`))?.read).toBe(true);
  });
  it("migration v1 vers v3 sans perte", async () => {
    const name = `migration-${crypto.randomUUID()}`;
    const legacy = new Dexie(name);
    legacy
      .version(1)
      .stores({
        editions: "id,sha256,date,familyId,importedAt",
        originals: "id",
        states: "id,editionId",
        notes: "id,editionId,updatedAt",
        preferences: "key",
      });
    const e = await inspectHTML("generic.html", fixture("generic.html"));
    await legacy.table("editions").add(e);
    await legacy
      .table("originals")
      .add({ id: e.id, bytes: fixture("generic.html") });
    legacy.close();
    const migrated = new LocalRepository(name);
    expect((await migrated.editions.get(e.id))?.sha256).toBe(e.sha256);
    expect(await migrated.jobs.count()).toBe(0);
    expect(await migrated.pending.count()).toBe(0);
    migrated.close();
    await migrated.delete();
  });
  it("tri de deux dates identiques et inconnues déterministe", async () => {
    const a = await inspectHTML("generic.html", fixture("generic.html"));
    const b = { ...a, id: crypto.randomUUID(), date: "2026-10-13" };
    const c = { ...b, id: crypto.randomUUID() };
    expect(sortEditions([a, b, c])[2].id).toBe(a.id);
    expect(sortEditions([a, b, c]).map((e) => e.id)).toEqual(
      sortEditions([c, a, b]).map((e) => e.id),
    );
  });
});
describe("Archives, intégrité et conflits", () => {
  it("export → base vide → restauration : originaux et états identiques", async () => {
    const bytes = fixture("edition-13.html");
    const e = await inspectHTML("test.html", bytes);
    await db.saveEdition(e, bytes);
    await db.reading(e.id, "edition", { favorite: true, read: true });
    await db.notes.add({
      id: crypto.randomUUID(),
      editionId: e.id,
      body: "Décision privée",
      kind: "decision",
      createdAt: now(),
      updatedAt: now(),
    });
    const zip = await exportBackup(db);
    const backup = await inspectBackup(new Uint8Array(await zip.arrayBuffer()));
    const fresh = new LocalRepository(`restore-${crypto.randomUUID()}`);
    expect((await restoreBackup(fresh, backup)).added).toBe(1);
    expect(await fresh.snapshot()).toEqual(await db.snapshot());
    expect((await restoreBackup(fresh, backup)).added).toBe(0);
    fresh.close();
    await fresh.delete();
  });
  it("checksum invalide : aucune écriture", async () => {
    const bytes = fixture("generic.html");
    const e = await inspectHTML("generic.html", bytes);
    await db.saveEdition(e, bytes);
    const zip = await JSZip.loadAsync(
      await (await exportBackup(db)).arrayBuffer(),
    );
    zip.file(`files/${e.id}.html`, "<h1>altéré</h1>");
    await expect(
      inspectBackup(await zip.generateAsync({ type: "uint8array" })),
    ).rejects.toThrow("Checksum");
    expect(await db.editions.count()).toBe(1);
  });
  it("conflits de notes : conserver les deux sans écraser", async () => {
    const e = await inspectHTML("generic.html", fixture("generic.html"));
    await db.saveEdition(e, fixture("generic.html"));
    const note = {
      id: crypto.randomUUID(),
      editionId: e.id,
      body: "Local",
      kind: "note" as const,
      createdAt: now(),
      updatedAt: now(),
    };
    await db.notes.add(note);
    const backup = await db.snapshot();
    backup.notes[0].body = "Distant";
    expect((await restoreBackup(db, backup)).conflicts).toBe(1);
    expect((await db.notes.toArray()).map((n) => n.body).sort()).toEqual([
      "Distant",
      "Local",
    ]);
  });
  it("ZIP inattendu refusé", async () => {
    const zip = new JSZip();
    zip.file("evil.js", "alert(1)");
    await expect(
      inspectBackup(await zip.generateAsync({ type: "uint8array" })),
    ).rejects.toThrow("Chemin");
  });
});
describe("Isolation préparée sans modifier l’original", () => {
  it("supprime navigation et ressources, aucun allow-same-origin", () => {
    const bytes = fixture("hostile.html");
    const safe = isolatedHTML(bytes, false);
    expect(safe).not.toContain("window.result");
    expect(safe).not.toContain("https://example.com");
    expect(safe).toContain("connect-src 'none'");
    expect(new TextDecoder().decode(bytes)).toContain("window.result");
    const interactive = isolatedHTML(bytes, true);
    expect(interactive).toContain("window.result");
    expect(interactive).not.toContain("<form");
  });
});
