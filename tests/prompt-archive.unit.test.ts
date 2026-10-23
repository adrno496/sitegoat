import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import JSZip from "jszip";
import { inspectHTML } from "../src/features/import";
import { createPromptArchive } from "../src/features/unified/promptArchive";
import { db } from "../src/data/db";

const edition = () =>
  inspectHTML(
    "snapshot-22.html",
    new Uint8Array(readFileSync("tests/fixtures/v8/snapshot-22.html")),
  );

it("conserve chaque contenu et version, même quand les noms Markdown se répètent", async () => {
  const first = await edition();
  const second = await edition();
  first.unified!.promptAssets[0].filename = "../Même?.md";
  first.unified!.promptAssets[1].filename = "Même?.md";
  const expected = [first, second].flatMap((e) =>
    e.unified!.promptAssets.map((p) => p.content),
  );
  const { blob, count } = await createPromptArchive([first, second]);
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const files = Object.values(zip.files).filter((f) => !f.dir);
  expect(count).toBe(expected.length);
  expect(files).toHaveLength(expected.length);
  expect(
    files.every((f) => f.name.endsWith(".md") && !f.name.includes("..")),
  ).toBe(true);
  expect(await Promise.all(files.map((f) => f.async("string")))).toEqual(
    expected,
  );
});

it("lit les anciens HTML Sentinel sans les exécuter et ignore les documents supprimés", async () => {
  const legacy = {
    ...(await edition()),
    id: crypto.randomUUID(),
    unified: undefined,
    filename: "sentinel.html",
    collection: "sentinel" as const,
  };
  const content = "# Évaluation\n\nTexte intégral & accents préservés.\n";
  await db.originals.put({
    id: legacy.id,
    bytes: new TextEncoder().encode(
      `<script>throw Error('ne pas exécuter')</script><textarea id="fullPrompt">${content}</textarea>`,
    ),
  });
  try {
    const { blob, count } = await createPromptArchive([
      legacy,
      { ...legacy, deleted: true },
    ]);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const files = Object.values(zip.files).filter((f) => !f.dir);
    expect(count).toBe(1);
    expect(files[0].name).toMatch(/sentinel_PROMPT_VSCODE\.md$/);
    expect(await files[0].async("string")).toBe(content);
  } finally {
    await db.originals.delete(legacy.id);
  }
});

it("annule l’export vide, incomplet ou endommagé avec une erreur explicite", async () => {
  await expect(createPromptArchive([])).rejects.toThrow("Aucun prompt");
  const broken = await edition();
  broken.unified!.promptAssets[0].content += "modifié";
  await expect(createPromptArchive([broken])).rejects.toThrow(
    "Checksum invalide",
  );
  await expect(
    createPromptArchive([
      { ...broken, id: crypto.randomUUID(), unified: undefined },
    ]),
  ).rejects.toThrow("Original indisponible");
});
