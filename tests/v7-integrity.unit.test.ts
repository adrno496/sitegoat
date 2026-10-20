import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { inspectHTML } from "../src/features/import";
it("V7 : une enveloppe complète conserve ses identités, preuves et prompts entiers", async () => {
  const payload = JSON.parse(
    readFileSync(
      process.env.J360_V7_TEST_FIXTURE ||
        "public/examples/unified/edition-2200.json",
      "utf8",
    ),
  );
  const bytes = new TextEncoder().encode(
    `<!doctype html><html><body><h1>Synthétique</h1><script id="unifiedData" type="application/json">${JSON.stringify(payload).replaceAll("<", "\\u003c")}</script></body></html>`,
  );
  const edition = await inspectHTML("integrity.html", bytes);
  expect(edition.unified).toEqual(payload);
  expect(edition.unified?.promptAssets).toHaveLength(2);
});
