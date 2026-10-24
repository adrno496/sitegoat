import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import JSZip from "jszip";
import { LocalRepository } from "../src/data/db";
import { inspectHTML, commitImport } from "../src/features/import";
import {
  exportBackup,
  inspectBackup,
  restoreBackup,
} from "../src/features/backup";

it("SG-11 : SHA détecte un octet altéré à longueur constante avant toute écriture", async () => {
  const db = new LocalRepository(`sg11-${crypto.randomUUID()}`);
  try {
    const bytes = new Uint8Array(readFileSync("tests/fixtures/generic.html"));
    const e = await commitImport(
      db,
      await inspectHTML("generic.html", bytes),
      bytes,
      "keep",
    );
    const before = await db.snapshot();
    const clean = new Uint8Array(await (await exportBackup(db)).arrayBuffer());
    expect((await inspectBackup(clean)).originals[0].bytes).toEqual(bytes);
    const zip = await JSZip.loadAsync(clean);
    const altered = Uint8Array.from(bytes);
    altered[altered.length - 5] ^= 1;
    expect(altered.length).toBe(bytes.length);
    zip.file(`files/${e.id}.html`, altered);
    await expect(
      (async () =>
        restoreBackup(
          db,
          await inspectBackup(await zip.generateAsync({ type: "uint8array" })),
        ))(),
    ).rejects.toThrow("Checksum");
    expect(await db.snapshot()).toEqual(before);
  } finally {
    await db.delete();
  }
});
