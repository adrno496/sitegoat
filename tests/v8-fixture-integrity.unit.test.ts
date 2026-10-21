import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { inspectHTML } from "../src/features/import";
it("T18 : témoin synthétique indépendant détecte article/source/hash/créneau/texte modifié", async () => {
  const raw = new Uint8Array(
    readFileSync(
      process.env.JOURNAL360_V8_FIXTURE || "tests/fixtures/v8/snapshot-22.html",
    ),
  );
  const e = await inspectHTML("snapshot-22.html", raw);
  const expected = JSON.parse(
    readFileSync("tests/fixtures/v8/expected.json", "utf8"),
  );
  expect(e.unified!.editionSlot, "créneau attendu 22h").toBe("22:00");
  expect(
    e.articles.map((a) => a.eventId),
    "registre synthétique A–H",
  ).toEqual(expected.eventIds);
  for (const [i, a] of e.unified!.items.entries()) {
    expect(a.sourceRecords[0].url, "source du témoin synthétique").toBe(
      "https://example.org/synthetic",
    );
    expect(a.plain, "texte intégral du témoin synthétique").toBe(
      `Récit intégral ${String.fromCharCode(65 + i)} — témoin alphav8${i}. Aucun fait réel.`,
    );
  }
  expect(e.unified!.promptAssets).toHaveLength(2);
});
