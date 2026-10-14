import { z } from "zod";
import { db } from "../data/db";
import { download } from "./backup";
const code = z.enum(["operation-failed", "import-failed", "sync-failed"]);
const schema = z
  .array(z.object({ id: z.uuid(), createdAt: z.iso.datetime(), code }))
  .max(200);
export function readDiagnostics(value?: string) {
  try {
    const result = schema.safeParse(JSON.parse(value || "[]"));
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}
export async function recordDiagnostic(value: z.infer<typeof code>) {
  try {
    await db.transaction("rw", db.preferences, async () => {
      const previous = readDiagnostics(
        (await db.preferences.get("local-diagnostics"))?.value,
      );
      await db.preferences.put({
        key: "local-diagnostics",
        value: JSON.stringify(
          [
            ...previous,
            {
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
              code: value,
            },
          ].slice(-200),
        ),
      });
    });
  } catch {
    /* An unavailable store cannot record its own failure. No telemetry. */
  }
}
export function Diagnostics({ value }: { value?: string }) {
  const entries = readDiagnostics(value);
  return (
    <section className="quiet-panel">
      <h2>Diagnostic local</h2>
      <p>
        {entries.length} événements techniques conservés sur cet appareil
        (maximum 200). Aucun texte de note, nom de fichier, URL, code d’accès ou
        trace technique privée n’est enregistré.
      </p>
      <details>
        <summary>Consulter les événements</summary>
        {entries.map((entry) => (
          <p key={entry.id}>
            {entry.createdAt} · {entry.code}
          </p>
        ))}
      </details>
      <button
        className="secondary"
        onClick={() =>
          download(
            new Blob([JSON.stringify(entries, null, 2)], {
              type: "application/json",
            }),
            "journal360-diagnostic-expurge.json",
          )
        }
      >
        Exporter le diagnostic expurgé
      </button>
    </section>
  );
}
