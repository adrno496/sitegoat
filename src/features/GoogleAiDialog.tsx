import { useRef, useState } from "react";
import {
  GOOGLE_AI_ENTRY,
  googleAiQuestionDestination,
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
  const [fallback, setFallback] = useState<"entry" | "question" | null>(null);
  const entrySent = useRef(false);
  const valid = validPublicQuestion(draft);
  const launch = editing
    ? googleAiQuestionDestination(draft)
    : validateGoogleAiUrl(destination.url);
  const fallbackUrl = fallback === "entry" ? GOOGLE_AI_ENTRY : launch?.url;
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
    if (!entry && !launch) return;
    const url = entry ? GOOGLE_AI_ENTRY : launch!.url;
    if (entry) entrySent.current = true;
    try {
      // Synchronous user gesture. noopener may return null even on success;
      // do not invent a successful popup or incorrectly report one as blocked.
      window.open(url, "_blank", "noopener,noreferrer");
      if (!entry) onDismiss();
      else {
        setFallback("entry");
        setNotice(
          "Ouverture demandée. Si aucun onglet n’apparaît, utilisez le lien direct ci-dessous. Collez ensuite la question dans Google.",
        );
      }
    } catch {
      setFallback(entry ? "entry" : "question");
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
          Le texte de la question sera transmis à Google.
          {destination.entryOnly &&
            " Vérifiez cette question : le fichier ne garantit pas qu’elle est publique."}
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
        <p className="small-note">
          Le lancement prérempli dépend de Google. Si Google demande une
          connexion ou un CAPTCHA, vous pouvez aussi copier la question puis
          ouvrir l’entrée du Mode IA.
        </p>
        {valid && !launch && (
          <p role="status">
            Cette question ne peut pas être transmise dans un lien prérempli.
            Raccourcissez-la ou utilisez la copie.
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
        <div className="modal-actions">
          <button className="secondary" onClick={onDismiss}>
            Annuler
          </button>
          <button
            className="primary"
            onClick={() => open(false)}
            disabled={!launch}
          >
            {destination.entryOnly ? "Lancer la question" : "Ouvrir"}
          </button>
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
            className="secondary"
            disabled={entrySent.current}
            onClick={() => open(true)}
          >
            Ouvrir Google Mode IA
          </button>
        </div>
        {fallback && fallbackUrl && (
          <p>
            <a
              href={fallbackUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => {
                if (!isCurrent() || !navigator.onLine) event.preventDefault();
              }}
            >
              {fallback === "entry"
                ? "Ouvrir directement Google Mode IA"
                : "Ouvrir directement la question dans Google Mode IA"}
            </a>
          </p>
        )}
      </section>
    </div>
  );
}
