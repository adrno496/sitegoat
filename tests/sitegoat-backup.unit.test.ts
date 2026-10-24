import { it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { LocalRepository } from "../src/data/db";
import { inspectHTML } from "../src/features/import";
import { restoreBackup } from "../src/features/backup";
import {
  archiveBudget,
  exportSegments,
  inspectSegments,
  planSegments,
} from "../src/features/segmentedBackup";

it("SG-03 : 3999/4000/4001, fragments inversés, corruption/manquants/doublons, transaction rollback", async () => {
  const db = new LocalRepository(`sg03-${crypto.randomUUID()}`),
    fresh = new LocalRepository(`sg03-fresh-${crypto.randomUUID()}`);
  try {
    const bytes = new Uint8Array(readFileSync("tests/fixtures/generic.html")),
      base = await inspectHTML("generic.html", bytes);
    const editions = Array.from({ length: 4001 }, () => ({
      ...base,
      id: crypto.randomUUID(),
      familyId: crypto.randomUUID(),
      archived: true,
    }));
    const data = {
      editions,
      originals: editions.map((e) => ({ id: e.id, bytes })),
      states: [
        {
          id: editions[0].id + ":edition",
          editionId: editions[0].id,
          articleId: "edition",
          favorite: true,
          read: true,
          openedAt: null,
          updatedAt: base.updatedAt,
        },
      ],
      notes: [
        {
          id: crypto.randomUUID(),
          editionId: editions[4000].id,
          body: "Note de fin",
          kind: "note" as const,
          createdAt: base.updatedAt,
          updatedAt: base.updatedAt,
        },
      ],
    };
    for (const n of [3999, 4000, 4001]) {
      const d = { ...data, editions: data.editions.slice(0, n) };
      expect(planSegments(d).flatMap((p) => p.editions)).toHaveLength(n);
      expect(archiveBudget(d).segmentedRecommended).toBe(true);
    }
    const output = [];
    for await (const p of exportSegments(db, data)) output.push(p);
    const inv = new Uint8Array(await output.at(-1)!.blob.arrayBuffer());
    const files = await Promise.all(
      output
        .slice(0, -1)
        .map(async (p) => ({
          name: p.filename,
          bytes: new Uint8Array(await p.blob.arrayBuffer()),
        })),
    );
    expect(files.length).toBeGreaterThan(1);
    await expect(inspectSegments(inv, files.slice(1))).rejects.toThrow(
      "Segments",
    );
    await expect(inspectSegments(inv, [...files, files[0]])).rejects.toThrow(
      "Segments",
    );
    const corrupt = files.map((f) => ({
      ...f,
      bytes: Uint8Array.from(f.bytes),
    }));
    corrupt[0].bytes[100] ^= 1;
    await expect(inspectSegments(inv, corrupt)).rejects.toThrow("checksum");
    expect(await fresh.editions.count()).toBe(0);
    const inspected = await inspectSegments(inv, [...files].reverse());
    const before = await fresh.snapshot();
    vi.spyOn(fresh.notes, "add").mockRejectedValueOnce(
      new DOMException("Quota synthétique", "QuotaExceededError"),
    );
    await expect(restoreBackup(fresh, inspected)).rejects.toThrow();
    expect(await fresh.snapshot()).toEqual(before);
    vi.restoreAllMocks();
    await restoreBackup(fresh, inspected);
    const restored = await fresh.snapshot();
    for (const key of ["editions", "states", "notes"] as const)
      expect(
        [...restored[key]].sort((a, b) => a.id.localeCompare(b.id)),
      ).toEqual([...data[key]].sort((a, b) => a.id.localeCompare(b.id)));
    expect(
      restored.originals
        .map((o) => ({ id: o.id, bytes: Array.from(o.bytes) }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    ).toEqual(
      data.originals
        .map((o) => ({ id: o.id, bytes: Array.from(o.bytes) }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    );
  } finally {
    vi.restoreAllMocks();
    await db.delete();
    await fresh.delete();
  }
}, 120000);

it("SG-03 : budget octets et original absent ne suppriment rien", async () => {
  const b = new Uint8Array(readFileSync("tests/fixtures/generic.html")),
    e = await inspectHTML("generic.html", b);
  const data = {
    editions: [e, { ...e, id: crypto.randomUUID() }],
    originals: [{ id: e.id, bytes: b }],
    states: [],
    notes: [],
  };
  expect(() => planSegments(data)).toThrow("Original manquant");
  const good = { ...data, editions: [e] };
  expect(planSegments(good, 1)).toHaveLength(1);
  expect(
    archiveBudget({ ...good, editions: [{ ...e, size: 150 * 1024 * 1024 }] })
      .segmentedRecommended,
  ).toBe(true);
});

it("SG-03 atomicité : erreur milieu restauration sans aucune édition partielle", async () => {
  const db = new LocalRepository("sg-atomic-" + crypto.randomUUID());
  try {
    const bytes = new Uint8Array(readFileSync("tests/fixtures/generic.html")),
      e = await inspectHTML("generic.html", bytes);
    const data = {
      editions: [e],
      originals: [{ id: e.id, bytes }],
      states: [],
      notes: [
        {
          id: crypto.randomUUID(),
          editionId: e.id,
          body: "Note",
          kind: "note" as const,
          createdAt: e.importedAt,
          updatedAt: e.updatedAt,
        },
      ],
    };
    vi.spyOn(db.notes, "add").mockRejectedValueOnce(Error("Quota synthétique"));
    await expect(restoreBackup(db, data)).rejects.toThrow("Quota");
    expect(await db.editions.count()).toBe(0);
    expect(await db.originals.count()).toBe(0);
  } finally {
    vi.restoreAllMocks();
    await db.delete();
  }
});
