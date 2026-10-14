import { useRef, useState } from "react";
import {
  GOOGLE_AI_ENTRY,
  validPublicQuestion,
  validateGoogleAiUrl,
  type GoogleAiDestination,
} from "./googleAi";
export function GoogleAiDialog({
  destination,
  isCurrent,
  onDismiss,
}: {
  destination: GoogleAiDestination;
  isCurrent: () => boolean;
  onDismiss: () => void;
}) {
  const [draft, setDraft] = useState(destination.query);
  const [editing, setEditing] = useState(!!destination.entryOnly);
  const [notice, setNotice] = useState("");
  const [fallback, setFallback] = useState(false);
  const entrySent = useRef(false);
  const valid = validPublicQuestion(draft);
  function open(entry: boolean) {
    if (entry && entrySent.current) return;
    if (!isCurrent()) {
      onDismiss();
      return;
    }
    if (!navigator.onLine) {
      setNotice(
        "Hors ligne : copiez la question et ouvrez Google après reconnexion.",
      );
      return;
    }
    let url = GOOGLE_AI_ENTRY;
    if (!entry) {
      if (editing && !valid) return;
      if (editing) {
        const candidate = new URL(destination.url);
        candidate.searchParams.set("q", draft);
        const checked = validateGoogleAiUrl(candidate.href);
        if (!checked) return;
        url = checked.url;
      } else url = destination.url;
    }
    if (entry) entrySent.current = true;
    try {
      // Synchronous user gesture. noopener may return null even on success;
      // do not invent a successful popup or incorrectly report one as blocked.
      window.open(url, "_blank", "noopener,noreferrer");
      if (!entry) onDismiss();
      else {
        setFallback(true);
        setNotice(
          "Ouverture demandée. Si aucun onglet n’apparaît, utilisez le lien direct ci-dessous. Collez ensuite la question dans Google.",
        );
      }
    } catch {
      setFallback(true);
      setNotice("Ouverture indisponible : utilisez le lien direct ci-dessous.");
    }
  }
  async function copy() {
    if (!isCurrent() || !valid) return;
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(draft);
      if (isCurrent())
        setNotice("Question copiée. Aucune recherche n’a été lancée.");
    } catch {
      if (isCurrent()) {
        setEditing(true);
        setNotice(
          "Copie indisponible. Sélectionnez la question et utilisez la copie de votre appareil.",
        );
      }
    }
  }
  return (
    <div className="modal-backdrop">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="google-ai-title"
        aria-describedby="google-ai-warning"
        className="modal compact google-ai-dialog"
      >
        <h2 id="google-ai-title">
          Ouvrir Google Mode IA dans votre navigateur ?
        </h2>
        <p id="google-ai-warning">
          {destination.entryOnly
            ? "Vérifiez cette question : le fichier ne garantit pas qu’elle est publique. Seul le texte que vous copiez puis collez sera transmis à Google."
            : "Le texte de la question sera transmis à Google."}
        </p>
        <p className="eyebrow">QUESTION À TRANSMETTRE</p>
        {editing ? (
          <label>
            Question publique à vérifier
            <textarea
              className="google-ai-query"
              value={draft}
              maxLength={2000}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
            />
          </label>
        ) : (
          <p className="google-ai-query">{draft}</p>
        )}
        {!destination.entryOnly && (
          <p className="small-note">
            Le lien prérempli udm=50 dépend de Google ; son fonctionnement n’est
            pas garanti. Vous pouvez aussi copier la question puis ouvrir
            l’entrée officielle.
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
        <div className="modal-actions">
          <button className="secondary" onClick={onDismiss}>
            Annuler
          </button>
          {!destination.entryOnly && (
            <button
              className="primary"
              onClick={() => open(false)}
              disabled={editing && !valid}
            >
              Ouvrir
            </button>
          )}
          <button
            className="secondary"
            disabled={!valid}
            onClick={() => void copy()}
          >
            Copier la question
          </button>
          {!editing && (
            <button className="secondary" onClick={() => setEditing(true)}>
              Modifier la question
            </button>
          )}
          <button
            className="primary"
            disabled={entrySent.current}
            onClick={() => open(true)}
          >
            Ouvrir Google Mode IA
          </button>
        </div>
        {fallback && (
          <p>
            <a href={GOOGLE_AI_ENTRY} target="_blank" rel="noopener noreferrer">
              Ouvrir directement Google Mode IA
            </a>
          </p>
        )}
      </section>
    </div>
  );
}
