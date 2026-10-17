import { useEffect, useState } from "react";
import { useDialogFocus } from "../dialogFocus";
import { futureDb } from "./db";
import { inspectFuture, type FutureCandidate, type FutureFile } from "./import";
const labels = {
  new: "Nouveau dossier",
  update: "Mise à jour",
  duplicate: "Doublon",
  incompatible: "Incompatible",
  conflict: "Conflit",
};
type Preview = Awaited<ReturnType<typeof futureDb.preview>>;
export default function FutureImportDialog({
  files,
  onClose,
  onDone,
  onJournal,
}: {
  files: FutureFile[];
  onClose: () => void;
  onDone: (message: string) => void;
  onJournal: (file: FutureFile) => void;
}) {
  const [rows, setRows] = useState<
      { candidate: FutureCandidate; preview: Preview }[]
    >([]),
    [confirmed, setConfirmed] = useState<Set<string>>(new Set()),
    [migrations, setMigrations] = useState<Set<string>>(new Set()),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [capacity, setCapacity] = useState("");
  useDialogFocus(true, () => {
    if (!busy) onClose();
  });
  useEffect(() => {
    let active = true;
    (async () => {
      const list = [];
      for (const file of files) {
        let candidate = await inspectFuture(file);
        if (candidate.migration && candidate.payload) {
          const prior = await futureDb.documents.get(
            candidate.payload.documentId,
          );
          if (prior) candidate = await inspectFuture(file, prior.revision + 1);
        }
        const preview = await futureDb.preview(candidate);
        list.push({ candidate, preview });
      }
      const revisions = new Map<string, string>();
      for (const row of list) {
        if (!row.candidate.payload) continue;
        const key = `${row.candidate.payload.documentId}:${row.candidate.payload.revision}`,
          prev = revisions.get(key);
        if (prev && prev !== row.candidate.sha256) {
          row.preview = {
            status: "conflict",
            changes: [
              "Deux fichiers différents portent la même révision dans ce lot.",
            ],
          };
          for (const other of list)
            if (
              other.candidate.payload?.documentId ===
                row.candidate.payload.documentId &&
              other.candidate.payload.revision ===
                row.candidate.payload.revision
            )
              other.preview = row.preview;
        }
        revisions.set(key, row.candidate.sha256!);
      }
      const estimate = await navigator.storage?.estimate?.();
      const need =
        files.reduce((s, f) => s + f.bytes.length * 4, 0) + 1024 * 1024;
      if (estimate?.quota && estimate.quota - (estimate.usage || 0) < need) {
        if (active)
          setCapacity(
            "Espace disponible insuffisant : libérez de la place après sauvegarde.",
          );
      }
      if (active) setRows(list);
    })().catch((e) => {
      if (active) setError(String(e));
    });
    return () => {
      active = false;
    };
  }, [files]);
  const eligible = rows.filter((r) =>
    ["new", "update"].includes(r.preview.status),
  );
  const ready =
    eligible.length > 0 &&
    !capacity &&
    eligible.every(
      (r) =>
        !r.candidate.migration ||
        migrations.has(r.candidate.payload!.documentId),
    ) &&
    eligible.every(
      (r) =>
        r.preview.status !== "update" ||
        confirmed.has(r.candidate.payload!.documentId),
    );
  function toggle(set: Set<string>, id: string, fn: (v: Set<string>) => void) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    fn(next);
  }
  return (
    <div className="modal-backdrop">
      <section
        className="modal future-import"
        role="dialog"
        aria-modal="true"
        aria-labelledby="future-import-title"
      >
        <p className="eyebrow">LE FUTUR · VÉRIFICATION LOCALE</p>
        <h2 id="future-import-title">Importer des dossiers</h2>
        <p>
          Le JSON validé pilote les modules du site. Les instructions et le code
          du fichier ne sont pas exécutés.
        </p>
        <p className="small-note">
          Sauvegarde ZIP séparée disponible dans Le Futur. Aucune
          synchronisation automatique de ces dossiers.
        </p>
        {!rows.length && !error && <p role="status">Analyse des fichiers…</p>}
        {rows.map(({ candidate: c, preview: p }, i) => (
          <article className="quiet-panel" key={i}>
            <h3>{c.payload?.title || c.file.name}</h3>
            <strong>{labels[p.status]}</strong>
            {c.payload && (
              <p>
                Révision {c.payload.revision} · {c.payload.status} ·{" "}
                {c.payload.documentId}
                {c.payload.synthetic ? " · Exemple synthétique" : ""}
              </p>
            )}
            {c.error && <p className="warning">{c.error}</p>}
            <ul>
              {p.changes.map((v, j) => (
                <li key={j}>{v}</li>
              ))}
            </ul>
            {c.payload && (
              <details>
                <summary>Prévisualiser les données</summary>
                <p>{c.payload.editorialDecision.reason}</p>
                <p>
                  {c.payload.scenarios.length} scénarios ·{" "}
                  {c.payload.signals.length} signaux ·{" "}
                  {c.payload.actions.length} actions
                </p>
                <p>Sources déclarées ; aucune certification.</p>
              </details>
            )}
            {c.migration && ["new", "update"].includes(p.status) && (
              <label>
                <input
                  type="checkbox"
                  checked={migrations.has(c.payload!.documentId)}
                  onChange={() =>
                    toggle(migrations, c.payload!.documentId, setMigrations)
                  }
                />{" "}
                Je confirme la migration AI-RADAR vers Le Futur. Original
                conservé.
              </label>
            )}
            {p.status === "update" && (
              <label>
                <input
                  type="checkbox"
                  checked={confirmed.has(c.payload!.documentId)}
                  onChange={() =>
                    toggle(confirmed, c.payload!.documentId, setConfirmed)
                  }
                />{" "}
                J’ai lu les différences et confirme cette mise à jour.
              </label>
            )}
            {c.journal && (
              <button
                className="secondary"
                disabled={busy}
                onClick={() => onJournal(c.file)}
              >
                Transférer ce journal vers Bibliothèque
              </button>
            )}
          </article>
        ))}
        {(error || capacity) && (
          <p role="alert" className="warning">
            {error || capacity}
          </p>
        )}
        <div className="modal-actions">
          <button disabled={busy} className="secondary" onClick={onClose}>
            Annuler
          </button>
          <button
            className="primary"
            disabled={!ready || busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                const result = await futureDb.importBatch(
                  eligible.map((r) => r.candidate),
                  confirmed,
                  migrations,
                );
                onDone(
                  `${result.added} dossiers ou révisions importés · ${result.ignored} doublons ignorés. Les fichiers incompatibles n’ont pas été importés.`,
                );
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            Importer {eligible.length} fichier(s) compatibles
          </button>
        </div>
      </section>
    </div>
  );
}
