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
const { quickBriefsSchema } = await import("../src/data/quickBriefsSchema.ts");
const schema = z.toJSONSchema(quickBriefsSchema, {io:"input",unrepresentable:"any"});
schema.$id="urn:journal360:quickbriefs:1";
schema.$comment="Structural schema only. extractQuickBriefs also enforces 512 KiB budget, unique inert block, V7 identity/date/slot, uniqueness, referenced promotions and future dates. Source verification is producer-declared.";
writeFileSync("docs/JOURNAL360_QUICKBRIEFS_V1.schema.json",JSON.stringify(schema,null,2)+"\n");
console.log("Compagnon quickBriefsData v1 exporté.");
