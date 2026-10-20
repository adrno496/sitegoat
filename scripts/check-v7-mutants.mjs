import {
  readFileSync,
  writeFileSync,
  mkdtempSync,
  rmSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
const root = "docs/evidence/v7",
  folder = mkdtempSync(join(tmpdir(), "journal360-v7-mutants-"));
const source = JSON.parse(
  readFileSync("public/examples/unified/edition-2200.json", "utf8"),
);
mkdirSync(root, { recursive: true });
const results = [];
function run(name, payload, expected) {
  const file = join(folder, name + ".json");
  writeFileSync(file, JSON.stringify(payload));
  const r = spawnSync(
    process.execPath,
    [
      resolve("node_modules/vitest/vitest.mjs"),
      "run",
      "tests/v7-integrity.unit.test.ts",
    ],
    { encoding: "utf8", env: { ...process.env, J360_V7_TEST_FIXTURE: file } },
  );
  const output = (r.stdout || "") + (r.stderr || "");
  writeFileSync(
    root + "/mutation-" + name + ".txt",
    output.replaceAll(folder, "<temporary-fixture>"),
  );
  const correct = expected
    ? r.status === 1 && output.includes(expected)
    : r.status === 0;
  results.push({
    name,
    exitCode: r.status,
    expectedFailure: !!expected,
    detected: correct,
    expectedReason: expected || null,
  });
  if (!correct) throw Error("Résultat de mutation incorrect : " + name);
}
try {
  run("clean-before", source);
  const duplicate = structuredClone(source);
  duplicate.items.push(duplicate.items[0]);
  run("duplicate", duplicate, "dupliqué");
  const correction = structuredClone(source);
  correction.items[0].corrections[0].sourceIds = ["not-present"];
  run("invalid-correction", correction, "Correction");
  const truncated = structuredClone(source);
  truncated.promptAssets[0].content = truncated.promptAssets[0].content.slice(
    0,
    -100,
  );
  run("truncated-prompt", truncated, "tronqué");
  run("clean-restored", source);
  writeFileSync(
    root + "/mutations.json",
    JSON.stringify(
      {
        scope:
          "Disposable synthetic fixture copies; production/source examples never changed",
        results,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(JSON.stringify(results));
} finally {
  rmSync(folder, { recursive: true, force: true });
}
