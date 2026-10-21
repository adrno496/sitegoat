import ts from "typescript";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? files(join(dir, e.name))
      : e.name.endsWith(".tsx")
        ? [join(dir, e.name)]
        : [],
  );
}
const ref = process.argv[2];
if (ref && !/^[0-9a-f]{7,40}$/.test(ref)) throw Error("SHA requis");
const paths = ref
  ? execFileSync("git", ["ls-tree", "-r", "--name-only", ref, "src"], {
      encoding: "utf8",
    })
      .split("\n")
      .filter((p) => p.endsWith(".tsx"))
  : files("src");
const rows = [];
for (const file of paths) {
  const text = ref
      ? execFileSync("git", ["show", `${ref}:${file}`], { encoding: "utf8" })
      : readFileSync(file, "utf8"),
    tree = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
  function walk(n) {
    if (
      ts.isJsxElement(n) &&
      ["button", "summary"].includes(n.openingElement.tagName.getText(tree))
    ) {
      const label =
        n.children
          .filter(ts.isJsxText)
          .map((t) => t.text.trim())
          .filter(Boolean)
          .join(" ") || "Libellé dynamique / icône : vérifier aria-label";
      const attributes = n.openingElement.attributes.properties.map((p) =>
        p.getText(tree),
      );
      rows.push({
        file,
        line: tree.getLineAndCharacterOfPosition(n.getStart(tree)).line + 1,
        element: n.openingElement.tagName.getText(tree),
        label,
        attributes,
      });
    }
    ts.forEachChild(n, walk);
  }
  walk(tree);
}
writeFileSync(
  `docs/evidence/v8-audit/actions${ref ? "-reference" : ""}.json`,
  JSON.stringify(rows, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    controls: rows.length,
    files: new Set(rows.map((r) => r.file)).size,
  }),
);
