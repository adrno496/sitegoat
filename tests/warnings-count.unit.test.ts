import { expect, it } from "vitest";
import { LocalRepository } from "../src/data/db";
import { editionSchema, hash } from "../src/data/model";
import { unifiedSchema } from "../src/data/unified";
import { inspectHTML, commitImport } from "../src/features/import";
import {
  exportBackup,
  inspectBackup,
  restoreBackup,
} from "../src/features/backup";
import { auditPayload, auditHTML } from "./helpers/audit";

it.each([31, 300])(
  "importe %i avertissements sans les tronquer ni modifier l’original",
  async (count) => {
    const p = auditPayload("10");
    p.warnings = Array.from(
      { length: count },
      (_, n) => `Avertissement SYNTHÉTIQUE ${n}`,
    );
    const raw = auditHTML(p);
    const edition = await inspectHTML("warnings.html", raw);
    expect(edition.unified?.warnings).toEqual(p.warnings);
    expect(edition.articles).toHaveLength(p.items.length);
    expect(edition.sha256).toBe(await hash(raw));
  },
);

it("sauvegarde et restaure plus de 30 avertissements éditoriaux et diagnostics sans perte", async () => {
  const a = new LocalRepository("warnings-source-" + crypto.randomUUID());
  const b = new LocalRepository("warnings-restore-" + crypto.randomUUID());
  try {
    const p = auditPayload("10");
    p.warnings = Array.from(
      { length: 100 },
      (_, n) => `Éditorial SYNTHÉTIQUE ${n}`,
    );
    const raw = auditHTML(p);
    const parsed = await inspectHTML("warnings.html", raw);
    const diagnostics = Array.from(
      { length: 100 },
      (_, n) => `Diagnostic SYNTHÉTIQUE ${n}`,
    );
    const edition = editionSchema.parse({ ...parsed, warnings: diagnostics });
    const imported = await commitImport(a, edition, raw, "day");
    const backup = await inspectBackup(
      new Uint8Array(await (await exportBackup(a)).arrayBuffer()),
    );
    await restoreBackup(b, backup);
    const restored = await b.editions.get(imported.id);
    expect(restored?.warnings).toEqual(diagnostics);
    expect(restored?.unified?.warnings).toEqual(p.warnings);
    const original = await b.originals.get(imported.id);
    expect(original).toBeDefined();
    expect(Array.from(original!.bytes)).toEqual(Array.from(raw));
    expect(restored?.sha256).toBe(await hash(raw));
  } finally {
    await a.delete();
    await b.delete();
  }
});

it("garde les validations de type, de longueur de texte et de taille des métadonnées", async () => {
  const p = auditPayload("10");
  expect(unifiedSchema.safeParse({ ...p, warnings: [123] }).success).toBe(
    false,
  );
  expect(
    unifiedSchema.safeParse({ ...p, warnings: ["x".repeat(1001)] }).success,
  ).toBe(false);
  p.warnings = Array.from({ length: 3000 }, () => "x".repeat(1000));
  await expect(inspectHTML("oversize.html", auditHTML(p))).rejects.toThrow(
    "Métadonnées V7 limitées à 2 Mo",
  );
});
