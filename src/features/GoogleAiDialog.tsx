import { useState } from "react";
import {
  GOOGLE_AI_ENTRY,
  googleAiQuestionDestination,
  publicQuestionIssue,
  validPublicQuestion,
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
  const [notice, setNotice] = useState("");
  const [fallback, setFallback] = useState<"entry" | "question" | null>(null);
  const valid = validPublicQuestion(draft);
  const privacyIssue = publicQuestionIssue(draft);
  const launch =
    valid && !privacyIssue ? googleAiQuestionDestination(draft) : null;
  const fallbackUrl = fallback === "entry" ? GOOGLE_AI_ENTRY : launch?.url;
  function open(entry: boolean) {
    if (!isCurrent()) {
      onDismiss();
      return;
    }
    if (privacyIssue || !valid || (!entry && !launch)) return;
    if (!navigator.onLine) {
      setNotice(
        "Hors ligne : copiez la question et ouvrez Google après reconnexion.",
      );
      return;
    }
    setFallback(entry ? "entry" : "question");
    try {
      // Direct user gesture only. noopener can return null on success as well
      // as when blocked; never infer an actual opening from this return value.
      window.open(
        entry ? GOOGLE_AI_ENTRY : launch!.url,
        "_blank",
        "noopener,noreferrer",
      );
      setNotice(
        "Ouverture demandée. Si aucun onglet n’apparaît, utilisez le lien direct ci-dessous. Pour le Mode IA, collez la question vous-même.",
      );
    } catch {
      setNotice(
        "Ouverture indisponible : utilisez le lien direct ci-dessous, ou copiez la question pour votre navigateur.",
      );
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
      if (isCurrent())
        setNotice(
          "Copie indisponible. Sélectionnez la question et utilisez la copie de votre appareil.",
        );
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
        <h2 id="google-ai-title">Ouvrir Google dans votre navigateur ?</h2>
        <p id="google-ai-warning">
          Le texte de la question sera transmis à Google si vous lancez la
          recherche classique. Le Mode IA s’ouvre sans question : copiez-la puis
          collez-la.
        </p>
        <label>
          Question publique à vérifier
          <textarea
            className="google-ai-query"
            value={draft}
            maxLength={2000}
            rows={4}
            onChange={(e) => {
              setDraft(e.target.value);
              setNotice("");
            }}
          />
        </label>
        <p className="small-note">
          Vérifiez que la question est publique et ne contient aucune donnée
          privée. La détection automatique est limitée. L’accès au Mode IA
          dépend de Google, de votre compte et de votre navigateur.
        </p>
        {privacyIssue && <p role="alert">{privacyIssue}</p>}
        {valid && !privacyIssue && !launch && (
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
            disabled={!launch}
            onClick={() => open(false)}
          >
            Rechercher sur Google
          </button>
          <button
            className="secondary"
            disabled={!valid}
            onClick={() => void copy()}
          >
            Copier la question
          </button>
          <button
            className="secondary"
            disabled={!valid || !!privacyIssue}
            onClick={() => open(true)}
          >
            Ouvrir Google Mode IA
          </button>
        </div>
        {fallback && fallbackUrl && valid && !privacyIssue && (
          <p>
            <a
              href={fallbackUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => {
                if (
                  !isCurrent() ||
                  !navigator.onLine ||
                  publicQuestionIssue(draft)
                )
                  event.preventDefault();
              }}
            >
              {fallback === "entry"
                ? "Ouvrir directement Google Mode IA"
                : "Recherche Google avec la question ↗"}
            </a>
          </p>
        )}
      </section>
    </div>
  );
}
