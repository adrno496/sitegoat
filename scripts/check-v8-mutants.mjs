import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
const html = readFileSync("tests/fixtures/v8/snapshot-22.html", "utf8");
const pattern =
  /(<script id="unifiedData" type="application\/json">)([\s\S]*?)(<\/script>)/;
const base = JSON.parse(html.match(pattern)[2]);
const folder = mkdtempSync(join(tmpdir(), "j360-v8-mutants-"));
const results = [];
const run = (name, p, reason) => {
  const file = join(folder, name + ".html");
  writeFileSync(
    file,
    html.replace(
      pattern,
      (_, open, content, close) =>
        open + JSON.stringify(p).replaceAll("<", "\\u003c") + close,
    ),
  );
  const r = spawnSync(
    process.execPath,
    [
      "node_modules/vitest/vitest.mjs",
      "run",
      "tests/v8-fixture-integrity.unit.test.ts",
    ],
    { env: { ...process.env, JOURNAL360_V8_FIXTURE: file }, encoding: "utf8" },
  );
  const output = (r.stdout || "") + (r.stderr || "");
  writeFileSync(`docs/evidence/v8/mutation-${name}.txt`, output);
  const detected = reason
    ? r.status === 1 && output.includes(reason)
    : r.status === 0;
  results.push({
    name,
    exitCode: r.status,
    expectedFailure: !!reason,
    expectedReason: reason || null,
    detected,
  });
  if (!detected) throw Error("Mutation non détectée : " + name);
};
try {
  run("clean-before", base);
  let p = structuredClone(base);
  p.items = p.items.filter((i) => i.eventId !== "event-v8-C");
  p.synthesis.eventIds = p.items.map((i) => i.eventId);
  run("removed-article", p, "registre synthétique");
  p = structuredClone(base);
  p.items[0].sourceRecords[0].url = "https://example.org/forged";
  run("falsified-source", p, "source du témoin");
  p = structuredClone(base);
  p.promptAssets[0].sha256 = "0".repeat(64);
  run("broken-hash", p, "tronqué");
  p = structuredClone(base);
  p.editionSlot = "20:00";
  run("exchanged-slot", p, "Créneaux incohérents");
  p = structuredClone(base);
  p.items[0].plain = "Texte silencieusement modifié";
  run("changed-event", p, "texte intégral du témoin");
  run("clean-restored", base);
} finally {
  writeFileSync(
    "docs/evidence/v8/mutations.json",
    JSON.stringify(
      {
        scope:
          "Disposable copies; expected fixture manifest is a synthetic witness, not a real-world registry",
        results,
      },
      null,
      2,
    ) + "\n",
  );
  rmSync(folder, { recursive: true, force: true });
}
console.log(results);
