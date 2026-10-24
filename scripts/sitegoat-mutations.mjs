// Run only on disposable copies. Never mutate the source worktree or a profile.
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const run = promisify(execFile),
  root = process.cwd(),
  proof = path.join(root, "audits/sitegoat/implementation-2026-10-24/preuves");
const variants = [
  {
    name: "sha",
    file: "src/features/backup.ts",
    from: "original.length !== e.size || (await hash(original)) !== e.sha256",
    to: "original.length !== e.size",
    tests: ["tests/sitegoat-integrity.unit.test.ts"],
  },
  {
    name: "projection",
    file: "src/features/backup.ts",
    from: "if ((e.unified && canonicalJSON(e.unified) !== canonicalJSON(parsed.unified)) ||\n          canonicalJSON(e.articles) !== canonicalJSON(parsed.articles))",
    to: "if (false)",
    tests: ["tests/sitegoat-projection.unit.test.ts", "-t", "SG-07"],
  },
  {
    name: "concurrency",
    file: "src/features/v9/recurringSearchStorage.ts",
    from: "if (canonicalJSON(existing) !== canonicalJSON(expected))",
    to: "if (false)",
    tests: ["tests/sitegoat-personal.unit.test.ts", "-t", "SG-08"],
  },
];
variants.push({
  name: "atomicity",
  file: "src/features/backup.ts",
  from: "await repository.transaction(",
  to: "await ((...args: unknown[]) => (args.at(-1) as () => Promise<void>)())(",
  tests: ["tests/sitegoat-backup.unit.test.ts", "-t", "SG-03 atomicité"],
});
const results = [];
for (const v of variants) {
  const copy = await fs.mkdtemp(
    path.join(os.tmpdir(), "sitegoat-" + v.name + "-mutant-"),
  );
  for (const entry of [
    "src",
    "tests",
    "api",
    "public",
    "package.json",
    "vite.config.ts",
    "vitest.config.ts",
    "vercel.json",
    "tsconfig.json",
  ])
    await fs.cp(path.join(root, entry), path.join(copy, entry), {
      recursive: true,
    });
  await fs.symlink(
    await fs.realpath(path.join(root, "node_modules")),
    path.join(copy, "node_modules"),
  );
  const target = path.join(copy, v.file),
    source = await fs.readFile(target, "utf8");
  if (v.name === "projection") {
    const start = source.indexOf(
      "        if (",
      source.indexOf("const fields ="),
    );
    const end = source.indexOf("\n          throw new Error", start);
    v.from =
      start >= 0 && end > start
        ? source.slice(start, end)
        : "MISSING_PROJECTION";
  }
  if (!source.includes(v.from))
    throw Error("Mutation target missing: " + v.name);
  await fs.writeFile(target, source.replace(v.from, v.to));
  let code = 0,
    output = "";
  try {
    const r = await run(
      "node",
      ["node_modules/vitest/vitest.mjs", "run", ...v.tests],
      { cwd: copy, maxBuffer: 2 * 1024 * 1024 },
    );
    output = r.stdout + r.stderr;
  } catch (e) {
    code = e.code;
    output = e.stdout + e.stderr;
  }
  await fs.writeFile(path.join(proof, "mutant-" + v.name + ".log"), output);
  results.push({ name: v.name, exitCode: code, detected: code === 1, copy });
}
await fs.writeFile(
  path.join(proof, "mutants.json"),
  JSON.stringify(results, null, 2),
);
console.log(JSON.stringify(results));
if (results.some((r) => !r.detected)) process.exitCode = 1;
