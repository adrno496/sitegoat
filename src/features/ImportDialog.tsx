import { useState } from "react";
import { X, FileText, AlertTriangle, Check, ArrowRight } from "lucide-react";
import { useDialogFocus } from "./dialogFocus";
import { db } from "../data/db";
import { type Edition, dateLabel, sizeLabel } from "../data/model";
import { commitImport } from "./import";
import { recordDiagnostic } from "./diagnostics";
import { assessVersion, resolveDay, dayKeyOf } from "../data/day";
export interface Candidate {
  edition: Edition;
  bytes: Uint8Array;
  duplicate: boolean;
  pendingId?: string;
}
export function ImportDialog({
  candidates,
  editions,
  onClose,
  onDone,
}: {
  candidates: Candidate[];
  editions: Edition[];
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [choices, setChoices] = useState<
    Record<string, "ignore" | "keep" | "version" | "day" | "replace">
  >({});
  const [parents, setParents] = useState<Record<string, string>>({});
  const [metadata, setMetadata] = useState<
    Record<string, { title: string; date: string }>
  >({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useDialogFocus(true, () => {
    if (!busy) onClose();
  });
  async function commit() {
    setBusy(true);
    let saved = 0,
      replaced = 0,
      ignored = 0;
    try {
      await db.transaction(
        "rw",
        [db.editions, db.originals, db.pending],
        async () => {
          for (const c of candidates) {
            const edited = metadata[c.edition.id];
            const edition = {
              ...c.edition,
              title: edited?.title.trim() || c.edition.title,
              date: edited ? edited.date || null : c.edition.date,
            };
            const choice =
              choices[c.edition.id] === "ignore"
                ? "ignore"
                : dayKeyOf(edition)
                  ? "day"
                  : choices[c.edition.id] || (c.duplicate ? "replace" : "keep");
            const result = await commitImport(
              db,
              edition,
              c.bytes,
              choice,
              parents[c.edition.id],
            );
            if (result.replaced) replaced++;
            if (result.duplicate && !result.replaced) ignored++;
            else saved++;
            if (c.pendingId) await db.pending.delete(c.pendingId);
          }
        },
      );
      onDone(
        `${saved} édition${saved > 1 ? "s" : ""} importée${saved > 1 ? "s" : ""}${replaced ? ` · ${replaced} ancienne${replaced > 1 ? "s" : ""} copie${replaced > 1 ? "s" : ""} remplacée${replaced > 1 ? "s" : ""}` : ""}${ignored ? ` · ${ignored} doublon ignoré` : ""}.`,
      );
    } catch (e) {
      void recordDiagnostic("import-failed");
      setError(
        e instanceof Error
          ? e.message
          : "Import annulé. Aucun fichier de cette sélection n’a été enregistré.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop">
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-heading"
      >
        <header className="modal-header">
          <div>
            <p className="eyebrow">UNE NOUVELLE PAGE</p>
            <h2 id="import-heading">Vérifier l’import</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Annuler l’import"
            disabled={busy}
            onClick={onClose}
          >
            <X />
          </button>
        </header>
        <p className="muted">
          Vos originaux seront conservés à l’identique. Les scripts ne seront
          pas exécutés à l’import.
        </p>
        <div className="import-list">
          {candidates.map((c, index) => {
            const edited = metadata[c.edition.id] || {
              title: c.edition.title,
              date: c.edition.date || "",
            };
            const preview = { ...c.edition, date: edited.date || null };
            const key = dayKeyOf(preview);
            const peers = [
              ...editions,
              ...candidates.slice(0, index).map((v) => v.edition),
            ].filter((e) => key && dayKeyOf(e) === key);
            const assessment = key ? assessVersion(preview, peers) : null;
            const previous = resolveDay(peers).current;
            const choice =
              choices[c.edition.id] === "ignore"
                ? "ignore"
                : key
                  ? "day"
                  : choices[c.edition.id] || (c.duplicate ? "replace" : "keep");
            const older =
              previous &&
              resolveDay([...peers, preview]).current?.id !== preview.id;
            return (
              <div className="import-item" key={c.edition.id}>
                <div className="file-heading">
                  <FileText />
                  <strong>{c.edition.filename}</strong>
                  <span>{sizeLabel(c.edition.size)}</span>
                </div>
                <label>
                  Titre
                  <input
                    value={edited.title}
                    maxLength={1000}
                    onChange={(e) =>
                      setMetadata({
                        ...metadata,
                        [c.edition.id]: { ...edited, title: e.target.value },
                      })
                    }
                  />
                </label>
                <label>
                  Date éditoriale <span className="muted">(facultative)</span>
                  <input
                    type="date"
                    disabled={!!c.edition.dayKey}
                    value={edited.date}
                    onChange={(e) =>
                      setMetadata({
                        ...metadata,
                        [c.edition.id]: { ...edited, date: e.target.value },
                      })
                    }
                  />
                </label>
                <p className="muted">
                  {c.edition.articles.length
                    ? `${c.edition.articles.length} articles indexés`
                    : "HTML générique · lecture intégrale"}{" "}
                  · {dateLabel(c.edition.date)}
                </p>
                {assessment && (
                  <div className="day-import-preview">
                    <p>
                      Une seule édition par jour. La dernière remplace les
                      anciennes dans la bibliothèque ; leurs originaux et
                      annotations restent dans l’historique.
                    </p>
                    <strong>
                      {previous
                        ? "Mettre à jour la journée"
                        : "Créer la journée"}{" "}
                      du {dateLabel(c.edition.date)}
                    </strong>
                    <p>
                      Révision externe{" "}
                      {c.edition.externalRevision ?? "inconnue"} ·{" "}
                      {(c.edition.slotsIncluded || []).join(" / ")} ·{" "}
                      {assessment.status}
                    </p>
                    <p>
                      {assessment.newEvents} nouveaux événements identifiés ·{" "}
                      {assessment.corrections} corrections textuelles ·{" "}
                      {assessment.removedEvents} absences
                    </p>
                    {older && (
                      <p className="warning">
                        Édition antérieure : conservée dans l’historique ; la
                        dernière édition restera affichée.
                      </p>
                    )}
                    {assessment.issues.map((issue) => (
                      <p className="warning" key={issue}>
                        {issue}
                      </p>
                    ))}
                    <p className="small-note">
                      Le contrôle compare les event_id disponibles, sans
                      certifier les déclarations éditoriales. L’original ne sera
                      pas modifié.
                    </p>
                  </div>
                )}
                {c.edition.warnings.map((w) => (
                  <p className="warning" key={w}>
                    <AlertTriangle size={16} />
                    {w}
                  </p>
                ))}
                {c.duplicate && (
                  <p className="warning">
                    <Check size={16} />
                    Doublon exact détecté, même si le nom est différent.
                    {(choice === "day" || choice === "replace") &&
                      " Ce dernier import remplacera l’ancienne copie, même archivée ou dans la corbeille ; notes et favoris sont conservés."}
                  </p>
                )}
                <label>
                  Conservation
                  <select
                    value={choice}
                    onChange={(e) =>
                      setChoices({
                        ...choices,
                        [c.edition.id]: e.target.value as
                          "ignore" | "keep" | "version" | "day" | "replace",
                      })
                    }
                  >
                    {key && (
                      <option value="day">
                        {c.duplicate
                          ? "Remplacer l’ancienne copie par ce dernier import"
                          : `${previous ? "Mettre à jour la journée" : "Créer la journée"} · historique conservé`}
                      </option>
                    )}
                    {!key && c.duplicate && (
                      <option value="replace">
                        Remplacer l’ancienne copie par ce dernier import
                      </option>
                    )}
                    {c.duplicate && (
                      <option value="ignore">Ignorer le doublon</option>
                    )}
                    {!key && (
                      <option value="keep">
                        Conserver comme édition indépendante
                      </option>
                    )}
                    {!key && editions.length > 0 && (
                      <option value="version">
                        Ajouter une version à une édition
                      </option>
                    )}
                  </select>
                </label>
                {choice === "version" && (
                  <label>
                    Édition précédente
                    <select
                      required
                      value={parents[c.edition.id] || ""}
                      onChange={(e) =>
                        setParents({
                          ...parents,
                          [c.edition.id]: e.target.value,
                        })
                      }
                    >
                      <option value="">Choisir une édition</option>
                      {editions.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.title} · {dateLabel(e.date)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            );
          })}
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <footer className="modal-actions">
          <button className="secondary" disabled={busy} onClick={onClose}>
            Annuler
          </button>
          <button
            className="primary"
            disabled={
              busy ||
              candidates.some(
                (c) =>
                  !dayKeyOf({
                    ...c.edition,
                    date: metadata[c.edition.id]
                      ? metadata[c.edition.id].date || null
                      : c.edition.date,
                  }) &&
                  choices[c.edition.id] === "version" &&
                  !parents[c.edition.id],
              )
            }
            onClick={() => void commit()}
          >
            {busy ? "Enregistrement…" : "Enregistrer dans ma bibliothèque"}
            <ArrowRight size={18} />
          </button>
        </footer>
      </section>
    </div>
  );
}
