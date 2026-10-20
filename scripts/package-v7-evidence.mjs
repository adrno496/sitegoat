import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
const git = (args) => execFileSync("git", args, { encoding: "utf8" }),
  sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const names = [
  ...new Set(
    [
      ...git(["diff", "--name-only", "HEAD"]).split("\n"),
      ...git(["ls-files", "--others", "--exclude-standard"]).split("\n"),
    ].filter((p) =>
      /^(?:src\/|tests\/|scripts\/[^/]*unified|scripts\/check-v7|scripts\/package-v7|public\/examples\/unified\/|playwright\.config\.ts$|README\.md$|docs\/(?:JOURNAL360_V7_IMPORT_GUIDE\.md|JOURNAL360_UNIFIED_V7\.schema\.json)$)/.test(
        p,
      ),
    ),
  ),
].sort();
const rows = names.map((file) => ({ file, sha256: sha(readFileSync(file)) }));
writeFileSync(
  "docs/evidence/v7/source-files.json",
  JSON.stringify(rows, null, 2) + "\n",
);
const protectedRows = JSON.parse(
  readFileSync("docs/evidence/v7/protected.json", "utf8"),
);
for (const file of [
  "src/styles.css",
  "src/features/future/FutureTimeline.tsx",
  "src/features/future/FutureScenarioCompare.tsx",
  "src/features/future/FutureSignals.tsx",
  "src/features/future/FutureActions.tsx",
])
  if (!protectedRows.some((r) => r.file === file))
    protectedRows.push({
      file,
      sha256: sha(execFileSync("git", ["show", "43f8b56:" + file])),
    });
const protectedCheck = protectedRows.map((r) => ({
  ...r,
  unchanged: sha(readFileSync(r.file)) === r.sha256,
}));
writeFileSync(
  "docs/evidence/v7/protected-final.json",
  JSON.stringify(protectedCheck, null, 2) + "\n",
);
if (protectedCheck.some((r) => !r.unchanged))
  throw Error("Source protégée modifiée.");
const folder = mkdtempSync(join(tmpdir(), "j360-v7-index-"));
try {
  const env = { ...process.env, GIT_INDEX_FILE: join(folder, "index") };
  execFileSync("git", ["read-tree", "HEAD"], { env });
  execFileSync("git", ["add", "--", ...names], { env });
  const patch = execFileSync(
    "git",
    ["diff", "--cached", "--binary", "HEAD", "--", ...names],
    { env, maxBuffer: 20000000 },
  );
  writeFileSync("docs/evidence/v7/source.patch", patch);
  execFileSync("git", [
    "apply",
    "--check",
    "--reverse",
    "docs/evidence/v7/source.patch",
  ]);
  console.log(
    JSON.stringify({
      files: rows.length,
      protectedUnchanged: protectedCheck.length,
      reversePatchCheck: "PASS",
      actualIndex: "untouched",
    }),
  );
} finally {
  rmSync(folder, { recursive: true, force: true });
}
