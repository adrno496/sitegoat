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
    name: "parent-confirm",
    file: "src/features/readerActions.tsx",
    from: '        setError("");',
    to: '        if (p) download(new Blob([p.content], {type:"text/markdown"}), p.filename);\n        setError("");',
  },
  {
    name: "sandbox",
    file: "src/features/Reader.tsx",
    from: 'sandbox={mode === "interactive" ? "allow-scripts" : ""}',
    to: 'sandbox={mode === "interactive" ? "allow-scripts allow-downloads" : ""}',
  },
];
const results = [];
for (const v of variants) {
  const copy = await fs.mkdtemp(
    path.join(os.tmpdir(), "sitegoat-" + v.name + "-mutant-"),
  );
  for (const entry of [
    "index.html",
    "src",
    "tests",
    "api",
    "public",
    "scripts",
    "package.json",
    "vite.config.ts",
    "playwright.config.ts",
    "playwright.sitegoat.config.ts",
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
  if (!source.includes(v.from)) throw Error("Missing mutation " + v.name);
  await fs.writeFile(target, source.replace(v.from, v.to));
  const build = await run(
    "node",
    ["node_modules/vite/bin/vite.js", "build", "--outDir", ".sitegoat-dist"],
    { cwd: copy, maxBuffer: 2 * 1024 * 1024 },
  );
  await fs.writeFile(
    path.join(proof, "mutant-" + v.name + "-build.log"),
    build.stdout + build.stderr,
  );
  let code = 0,
    output = "";
  try {
    const r = await run(
      "node",
      [
        "node_modules/@playwright/test/cli.js",
        "test",
        "--config",
        "playwright.sitegoat.config.ts",
        "--project",
        "chromium",
        "--grep",
        "lien détaché",
      ],
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
  path.join(proof, "browser-mutants.json"),
  JSON.stringify(results, null, 2),
);
console.log(JSON.stringify(results));
if (results.some((r) => !r.detected)) process.exitCode = 1;
