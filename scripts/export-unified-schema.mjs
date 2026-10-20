// Node 24 local-only structural schema export. Runtime semantic checks remain mandatory.
import { registerHooks } from "node:module";
import { existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";
registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (error) {
      if (specifier.startsWith(".") && context.parentURL) {
        const path = new URL(specifier + ".ts", context.parentURL);
        if (path.protocol === "file:" && existsSync(fileURLToPath(path)))
          return next(specifier + ".ts", context);
      }
      throw error;
    }
  },
});
const { unifiedSchema } = await import("../src/data/unified.ts");
const schema = z.toJSONSchema(unifiedSchema, {
  io: "input",
  unrepresentable: "any",
});
schema.$id = "urn:journal360:unified:7";
schema.$comment =
  "Structural schema only. src/data/unified.ts validateUnified also enforces budgets, references, timestamps, uniqueness and comparability. Import verifies prompt SHA-256 and Future v1 semantics.";
if (
  schema.properties.editionSlot.enum.length !== 8 ||
  schema.properties.schemaVersion.const !== 7
)
  throw Error("Contrat généré incohérent");
writeFileSync(
  "docs/JOURNAL360_UNIFIED_V7.schema.json",
  JSON.stringify(schema, null, 2) + "\n",
);
console.log(
  "Schéma structurel V7 exporté ; contrôles sémantiques Zod toujours obligatoires.",
);
