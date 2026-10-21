import { useId, useRef, useState } from "react";
import type { Edition } from "../data/model";
import type { UnifiedEdition } from "../data/unified";
import { summaryPreview } from "./eventPresentation";
import { PromptAccess } from "./unified/PromptAccess";
import { useInterface } from "./interfacePreferences";
import { GoogleAiDialog } from "./GoogleAiDialog";
import { GOOGLE_AI_ENTRY } from "./googleAi";
import { useDialogFocus } from "./dialogFocus";
import { validateSourceUrl } from "./sourceUrl";
type Item = UnifiedEdition["items"][number];
export function EventCard({
  item: i,
  edition,
  onOriginal,
  className = "unified-panel",
}: {
  item: Item;
  edition: Edition;
  onOriginal: () => void;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false),
    [full, setFull] = useState(false),
    [question, setQuestion] = useState(false);
  const {
    preferences: { options },
  } = useInterface();
  const Heading = className === "unified-panel" ? "h3" : "h2";
  const id = useId(),
    title = useRef<HTMLButtonElement>(null);
  useDialogFocus(question, () => setQuestion(false));
  function collapse() {
    setExpanded(false);
    setFull(false);
    title.current?.focus();
  }
  return (
    <article className={`${className} event-card`} data-event-id={i.eventId}>
      <div inert={question}>
        <p className="eyebrow">
          {i.category} ·{" "}
          {i.importance === "major"
            ? "Majeur"
            : i.importance === "important"
              ? "Important"
              : "Contexte"}{" "}
          · {i.eventDate}
        </p>
        <p className="event-meta">
          Première apparition : {i.firstSeenSlot} · Édition :{" "}
          {edition.editionSlot} Europe/Paris
          {i.corrections.length > 0 && " · Corrigé"}
        </p>
        <Heading>
          <button
            ref={title}
            className="title-button"
            aria-expanded={expanded}
            aria-controls={id}
            onClick={() => (expanded ? collapse() : setExpanded(true))}
          >
            {i.title}
          </button>
        </Heading>
        {!expanded && (
          <>
            <p className="event-preview">
              {summaryPreview(i.summary) ||
                "Résumé non fourni ; article intégral disponible."}
            </p>
            <button
              className="secondary"
              aria-expanded={false}
              aria-controls={id}
              onClick={() => setExpanded(true)}
            >
              Développer
            </button>
          </>
        )}
        <div id={id} hidden={!expanded}>
          <p className="event-summary">{i.summary || "Résumé non fourni."}</p>
          <dl>
            <dt>Ce qui a changé</dt>
            <dd>{i.changed || "Non renseigné"}</dd>
            <dt>Pourquoi cela compte</dt>
            <dd>{i.importanceReason || "Non renseigné"}</dd>
            <dt>Limites et inconnues</dt>
            <dd>{i.unknowns || "Non renseignées"}</dd>
          </dl>
          {i.corrections.length > 0 && (
            <p className="warning">
              Corrigé · {i.corrections.at(-1)!.at} ·{" "}
              {i.corrections.at(-1)!.reason}
            </p>
          )}
          <button
            className="primary"
            aria-expanded={full}
            aria-controls={`${id}-full`}
            onClick={() => setFull(!full)}
          >
            {full ? "Retour au résumé" : "Lire l’article complet"}
          </button>
          <section
            id={`${id}-full`}
            hidden={!full}
            className="event-full"
            aria-label={`Article complet : ${i.title}`}
          >
            {full && (
              <>
                <h4>Article complet</h4>
                <h5>En clair</h5>
                <p>{i.plain || "Non fourni"}</p>
                <h5>En détail</h5>
                <p>{i.detail || "Non fourni"}</p>
                <p>
                  Événement : {i.eventDate} · Publication : {i.publishedAt} ·
                  Vérification : {i.verifiedAt || "Non renseignée"}
                </p>
                <p>
                  État de preuve : {i.evidenceStatus}. {i.unknowns}
                </p>
                <details open={options.sources || undefined}>
                  <summary>Sources et provenance</summary>
                  {i.sourceRecords.map((s) => (
                    <p key={s.id}>
                      {validateSourceUrl(s.url) ? (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          referrerPolicy="no-referrer"
                        >
                          {s.label}
                        </a>
                      ) : (
                        s.label
                      )}{" "}
                      · {s.publisher} · publication {s.publishedAt} ·
                      vérification {s.verifiedAt || "absente"}
                    </p>
                  ))}
                  {!i.sourceRecords.length && <p>Aucune source documentée.</p>}
                </details>
                {i.corrections.map((c, n) => (
                  <p className="warning" key={n}>
                    Correction · {c.at} · {c.reason} · {c.sourceIds.join(", ")}
                  </p>
                ))}
                {i.actions.map((a, n) => (
                  <p key={n}>
                    Action déclarée : {a.title} · {a.reason} · Effort :{" "}
                    {a.effort} · Risque : {a.risk}
                  </p>
                ))}
                {edition.unified?.promptAssets.some(
                  (p) => p.eventId === i.eventId,
                ) && <PromptAccess edition={edition} eventId={i.eventId} />}
                {i.publicResearchQuestion && (
                  <button
                    className="secondary"
                    onClick={() => setQuestion(true)}
                  >
                    Question Google
                  </button>
                )}
              </>
            )}
          </section>
          <details open={options.advanced || undefined}>
            <summary>Plus</summary>
            <button className="text-button" onClick={onOriginal}>
              Ouvrir le HTML d’origine
            </button>
            <p>
              Aucun code privé audité par cette application. Le signal, ses
              risques et décisions restent ceux du document importé.
            </p>
          </details>
          <button className="text-button" onClick={collapse}>
            Réduire
          </button>
        </div>
      </div>
      {question && (
        <GoogleAiDialog
          destination={{
            url: GOOGLE_AI_ENTRY,
            query: i.publicResearchQuestion || "",
            entryOnly: true,
          }}
          isCurrent={() => question}
          onDismiss={() => setQuestion(false)}
        />
      )}
    </article>
  );
}
