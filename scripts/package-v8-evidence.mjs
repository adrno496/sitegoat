import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
const git = (args) => execFileSync("git", args, { encoding: "utf8" });
const sha = (b) => createHash("sha256").update(b).digest("hex");
const ref = "d3731ac8fa522e24a833c132b8d484423f275bdc";
if (git(["rev-parse", "HEAD"]).trim() !== ref)
  throw Error("Référence modifiée : vérifier avant de générer le diff");
const beforeIndex = git(["diff", "--cached", "--name-only"]);
const names = [
  ...new Set(
    [
      ...git(["diff", "--name-only", ref]).split("\n"),
      ...git(["ls-files", "--others", "--exclude-standard"]).split("\n"),
    ].filter((p) =>
      /^(?:src\/|tests\/|scripts\/(?:capture-v8|check-v8|generate-v8|package-v8|measure-unified-search)|README\.md$|playwright\.config\.ts$|docs\/(?:JOURNAL360_V8_(?:IMPORT_GUIDE|PLAN)\.md|JOURNAL360_V7_IMPORT_GUIDE\.md|PROMPT_JOURNAL360_V8\.md)$)/.test(
        p,
      ),
    ),
  ),
].sort();
const rows = names.map((file) => ({ file, sha256: sha(readFileSync(file)) }));
writeFileSync(
  "docs/evidence/v8/source-files.json",
  JSON.stringify(rows, null, 2) + "\n",
);
const protectedNames = [
  ...new Set([
    ...JSON.parse(
      readFileSync("docs/evidence/v7/protected-final.json", "utf8"),
    ).map((r) => r.file),
    ...git(["ls-files", "src/features/future", "api", "supabase"])
      .trim()
      .split("\n"),
    "src/App.tsx",
    "src/features/Reader.tsx",
    "src/features/import.ts",
    "src/features/backup.ts",
    "src/data/model.ts",
    "src/data/db.ts",
    "src/data/editorial.ts",
    "src/data/unified.ts",
    "src/features/vscodePrompt.ts",
    "src/features/unified/PromptAccess.tsx",
    "docs/JOURNAL360_UNIFIED_V7.schema.json",
  ]),
]
  .filter(Boolean)
  .sort();
const protectedRows = protectedNames.map((file) => {
  const original = execFileSync("git", ["show", ref + ":" + file]);
  return {
    file,
    sha256: sha(original),
    unchanged: sha(readFileSync(file)) === sha(original),
  };
});
writeFileSync(
  "docs/evidence/v8/protected.json",
  JSON.stringify(protectedRows, null, 2) + "\n",
);
if (protectedRows.some((r) => !r.unchanged))
  throw Error("Fichier protégé modifié");
const folder = mkdtempSync(join(tmpdir(), "j360-v8-index-"));
try {
  const env = { ...process.env, GIT_INDEX_FILE: join(folder, "index") };
  execFileSync("git", ["read-tree", ref], { env });
  execFileSync("git", ["add", "--", ...names], { env });
  const patch = execFileSync(
    "git",
    ["diff", "--cached", "--binary", ref, "--", ...names],
    { env, maxBuffer: 20000000 },
  );
  writeFileSync("docs/evidence/v8/source.patch", patch);
  execFileSync("git", [
    "apply",
    "--check",
    "--reverse",
    "docs/evidence/v8/source.patch",
  ]);
  if (beforeIndex !== git(["diff", "--cached", "--name-only"]))
    throw Error("Index réel modifié");
  console.log(
    JSON.stringify({
      files: rows.length,
      protectedUnchanged: protectedRows.length,
      reversePatchCheck: "PASS",
      actualIndex: "untouched",
      reference: ref,
    }),
  );
} finally {
  rmSync(folder, { recursive: true, force: true });
}
