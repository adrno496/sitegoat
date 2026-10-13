import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
function walk(root) {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? walk(path.join(root, e.name))
        : [path.join(root, e.name)],
    );
}
files.push(...walk("dist"));
const env = fs.existsSync(".env.local")
  ? fs.readFileSync(".env.local", "utf8")
  : "";
const secret = env.match(/^SUPABASE_SECRET_KEY=(.+)$/m)?.[1];
let found = false;
for (const file of files) {
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) continue;
  const text = fs.readFileSync(file, "utf8");
  if (
    /sb_secret_[A-Za-z0-9_-]{8,}/.test(text) ||
    (secret && text.includes(secret))
  ) {
    console.error("FAIL : secret dans", file);
    found = true;
  }
}
if (found) process.exit(1);
console.log(
  "PASS : aucun secret Supabase dans les fichiers suivis ou le bundle dist.",
);
