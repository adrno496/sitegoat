import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Download,
  Star,
  Check,
  FileText,
  Code,
  Plus,
  Minus,
  Archive,
  Maximize,
  Minimize,
  RefreshCw,
} from "lucide-react";
import type { Edition, ReadingState, Note } from "../data/model";
import { blobOf, dateLabel, now } from "../data/model";
import { db } from "../data/db";
import { isolatedHTML } from "./import";
import { useDialogFocus } from "./dialogFocus";
import { download } from "./backup";
import { GoogleAiDialog } from "./GoogleAiDialog";
import { GOOGLE_AI_ENTRY, readingQuestions } from "./googleAi";
import { verifiedLabel } from "../data/editorial";
import { resolveDay } from "../data/day";
import { validateSourceUrl } from "./sourceUrl";
import {
  parseGoogleAiMessage,
  validateGoogleAiUrl,
  type GoogleAiDestination,
} from "./googleAi";
interface GoogleAiRequest {
  destination: GoogleAiDestination;
  source: Window | null;
  origin: "host" | "frame";
  mode: "safe" | "interactive" | "text";
  editionId: string;
  frameRevision: number;
}
export function Reader({
  edition,
  editions,
  states,
  notes,
  onBack,
  onOpen,
  onDay,
  run,
}: {
  edition: Edition;
  editions: Edition[];
  states: ReadingState[];
  notes: Note[];
  onBack: () => void;
  onOpen: (id: string) => void;
  onDay?: (dayKey: string) => void;
  run: (action: () => Promise<unknown>, success?: string) => void;
}) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pendingAiRef = useRef<GoogleAiRequest | null>(null);
  const [googleAiRequest, setGoogleAiRequest] =
    useState<GoogleAiRequest | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [bytes, setBytes] = useState<Uint8Array>();
  const [mode, setMode] = useState<"safe" | "interactive" | "text">(
    "interactive",
  );
  const [confirm, setConfirm] = useState(false);
  const [font, setFont] = useState(18);
  const [note, setNote] = useState("");
  const [kind, setKind] = useState<"note" | "decision">("note");
  const [article, setArticle] = useState("");
  const [htmlZoom, setHtmlZoom] = useState(70);
  const [frameRevision, setFrameRevision] = useState(0);
  // Monter le cadre avec son document final. Un srcdoc vide puis modifié après
  // montage peut rester blanc dans Chrome, surtout lors du changement de sandbox.
  const srcDoc = useMemo(
    () => (bytes ? isolatedHTML(bytes, mode === "interactive") : ""),
    [bytes, mode],
  );
  const [loadError, setLoadError] = useState("");
  useDialogFocus(confirm, () => setConfirm(false));
  function dismissGoogleAi() {
    pendingAiRef.current = null;
    setGoogleAiRequest(null);
  }
  useDialogFocus(!!googleAiRequest, dismissGoogleAi);
  // Install synchronously during commit, before a freshly mounted opaque iframe
  // can deliver its one-shot capability message (notably on WebKit mode changes).
  useLayoutEffect(() => {
    pendingAiRef.current = null;
    setGoogleAiRequest(null);
    const receive = (event: MessageEvent<unknown>) => {
      const frameWindow = iframeRef.current?.contentWindow;
      // "null" alone does not authenticate an opaque sandbox. Always check the
      // actual current WindowProxy, and accept only the interactive srcdoc.
      if (
        !frameWindow ||
        event.source !== frameWindow ||
        event.origin !== "null" ||
        mode !== "interactive"
      )
        return;
      const message = parseGoogleAiMessage(event.data);
      if (!message) return;
      if (message.type === "capability") {
        // Opaque origins cannot be addressed by an origin string. "*" is used
        // only on this verified WindowProxy, with a public capability, no secret.
        frameWindow.postMessage(
          {
            type: "journal360:google-ai:capability",
            version: message.version,
            enabled: true,
            ...(message.version === 2
              ? {
                  actions: ["copy-question", "open-entry", "open-question"],
                  entryUrl: GOOGLE_AI_ENTRY,
                  maxQuestionLength: 2000,
                }
              : {}),
          },
          "*",
        );
      } else if (!pendingAiRef.current && !confirm) {
        const request = {
          destination: message.destination,
          source: frameWindow,
          origin: "frame" as const,
          mode,
          editionId: edition.id,
          frameRevision,
        };
        pendingAiRef.current = request;
        setGoogleAiRequest(request);
      }
    };
    window.addEventListener("message", receive);
    return () => {
      window.removeEventListener("message", receive);
      pendingAiRef.current = null;
    };
  }, [edition.id, mode, frameRevision, confirm]);
  function isCurrentGoogleAi() {
    const request = pendingAiRef.current;
    return (
      !!request &&
      request.mode === mode &&
      (request.origin === "host" ||
        (mode === "interactive" &&
          request.source === iframeRef.current?.contentWindow)) &&
      request.editionId === edition.id &&
      request.frameRevision === frameRevision &&
      (!!validateGoogleAiUrl(request.destination.url) ||
        request.destination.url === GOOGLE_AI_ENTRY)
    );
  }
  const day =
    edition.dayKey && !edition.independent
      ? resolveDay(
          editions.filter(
            (e) => e.dayKey === edition.dayKey && !e.independent && !e.deleted,
          ),
        )
      : null;
  const questions = useMemo(
    () => (bytes ? readingQuestions(bytes) : []),
    [bytes],
  );
  function prepareQuestion(question: string) {
    const request: GoogleAiRequest = {
      destination: { url: GOOGLE_AI_ENTRY, query: question, entryOnly: true },
      source: null,
      origin: "host",
      mode,
      editionId: edition.id,
      frameRevision,
    };
    pendingAiRef.current = request;
    setGoogleAiRequest(request);
  }
  const state = states.find(
    (s) => s.editionId === edition.id && s.articleId === "edition",
  );
  const index = editions.findIndex((e) => e.id === edition.id);
  useEffect(() => {
    setExpanded(true);
    setBytes(undefined);
    setMode("interactive");
    setNote("");
    setLoadError("");
    let canceled = false;
    Promise.all([
      db.originals.get(edition.id),
      db.preferences.get(`reader-trust-${edition.id}`),
    ])
      .then(([o, trust]) => {
        if (!canceled) {
          if (o) {
            setBytes(o.bytes);
            setMode(trust?.value === "safe" ? "safe" : "interactive");
          } else
            setLoadError(
              "Original manquant. La lecture textuelle reste disponible.",
            );
        }
      })
      .catch(() => {
        if (!canceled) setLoadError("Lecture du stockage impossible.");
      });
    return () => {
      canceled = true;
    };
  }, [edition.id]);
  useEffect(() => {
    if (!expanded || !surfaceRef.current) return;
    const surface = surfaceRef.current;
    const siblings: { element: HTMLElement; inert: boolean }[] = [];
    let branch: HTMLElement = surface;
    while (branch.parentElement) {
      for (const sibling of branch.parentElement.children) {
        if (sibling !== branch && sibling instanceof HTMLElement) {
          siblings.push({ element: sibling, inert: sibling.inert });
          sibling.inert = true;
        }
      }
      branch = branch.parentElement;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    surface.querySelector<HTMLButtonElement>("button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pendingAiRef.current) setExpanded(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      siblings.forEach(({ element, inert }) => {
        element.inert = inert;
      });
      document.removeEventListener("keydown", onKey);
    };
  }, [expanded]);
  async function saveNote() {
    if (!note.trim()) return;
    await db.notes.add({
      id: crypto.randomUUID(),
      editionId: edition.id,
      articleId: article || undefined,
      body: note.trim(),
      kind,
      createdAt: now(),
      updatedAt: now(),
    });
    setNote("");
  }
  return (
    <section className="reader">
      <div className="reader-nav">
        <button className="text-button" onClick={onBack}>
          <ArrowLeft size={18} />
          Bibliothèque
        </button>
        <div className="reader-adjacent">
          <button
            className="icon-button"
            aria-label="Édition plus récente"
            disabled={index === 0}
            onClick={() => onOpen(editions[index - 1].id)}
          >
            <ArrowLeft />
          </button>
          <button
            className="icon-button"
            aria-label="Édition plus ancienne"
            disabled={index === editions.length - 1}
            onClick={() => onOpen(editions[index + 1].id)}
          >
            <ArrowRight />
          </button>
        </div>
      </div>
      <p className="eyebrow">
        {edition.demo ? "ÉDITION DE DÉMONSTRATION" : "VOTRE ÉDITION"} · VERSION{" "}
        {edition.revision}
      </p>
      <h1>{edition.title}</h1>
      <p className="muted">
        {dateLabel(edition.date)} · Importée le{" "}
        {new Date(edition.importedAt).toLocaleDateString("fr-FR", {
          timeZone: "Europe/Paris",
        })}
        {edition.sourceVerifiedAt
          ? ` · Sources vérifiées le ${verifiedLabel(edition.sourceVerifiedAt)}`
          : " · Actualité des sources non vérifiée"}
      </p>
      {day && (
        <div className="reader-toolbar">
          {day.reliable && day.reliable.id !== edition.id && (
            <button
              className="secondary"
              onClick={() => onOpen(day.reliable!.id)}
            >
              Dernière version fiable
            </button>
          )}
          <button
            className="secondary"
            onClick={() => onDay?.(edition.dayKey!)}
          >
            Historique des éditions
          </button>
          <span>
            Cumul{" "}
            {day.versions.find((v) => v.edition.id === edition.id)?.assessment
              .status || "UNKNOWN"}{" "}
            · révision externe {edition.externalRevision ?? "inconnue"}
          </span>
        </div>
      )}
      <div className="reader-toolbar">
        <button
          className={state?.favorite ? "secondary active" : "secondary"}
          onClick={() =>
            run(() =>
              db.reading(edition.id, "edition", { favorite: !state?.favorite }),
            )
          }
        >
          <Star size={17} fill={state?.favorite ? "currentColor" : "none"} />
          {state?.favorite ? "En favoris" : "Ajouter aux favoris"}
        </button>
        <button
          className="secondary"
          onClick={() =>
            run(() => db.reading(edition.id, "edition", { read: !state?.read }))
          }
        >
          <Check size={17} />
          {state?.read ? "Marquée lue" : "Marquer comme lue"}
        </button>
        <button
          className="secondary"
          disabled={!bytes}
          onClick={() => bytes && download(blobOf(bytes), edition.filename)}
        >
          <Download size={17} />
          Original intact
        </button>
        <button
          className="secondary"
          onClick={() =>
            run(
              () =>
                db.editions.update(edition.id, {
                  archived: !edition.archived,
                  updatedAt: now(),
                }),
              edition.archived ? "Édition désarchivée." : "Édition archivée.",
            )
          }
        >
          <Archive size={17} />
          {edition.archived ? "Désarchiver" : "Archiver"}
        </button>
      </div>
      <div
        className="mode-tabs"
        hidden={expanded}
        role="group"
        aria-label="Mode de lecture"
      >
        <button
          aria-pressed={mode === "safe"}
          onClick={() =>
            run(async () => {
              await db.preferences.put({
                key: `reader-trust-${edition.id}`,
                value: "safe",
              });
              setMode("safe");
            })
          }
        >
          <ShieldCheck size={16} />
          Sécurisé
        </button>
        <button aria-pressed={mode === "text"} onClick={() => setMode("text")}>
          <FileText size={16} />
          Texte indexé
        </button>
        <button
          aria-pressed={mode === "interactive"}
          onClick={() => setConfirm(true)}
        >
          <Code size={16} />
          Interactif
        </button>
      </div>
      <p className="reader-status">
        {mode === "safe"
          ? "Scripts et ressources externes bloqués. Les liens restent disponibles dans le sommaire textuel."
          : mode === "interactive"
            ? "Scripts inline activés. Origine isolée, stockage intégré indisponible. Réservé aux fichiers de confiance."
            : "Texte extrait localement, sans exécution du journal."}{" "}
        La progression est marquée manuellement.
      </p>
      {edition.warnings.length > 0 && (
        <details className="reader-warnings">
          <summary>
            {edition.warnings.length} information(s) de compatibilité
          </summary>
          {edition.warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </details>
      )}
      {loadError && (
        <p role="alert" className="error">
          {loadError}
        </p>
      )}
      <div
        ref={surfaceRef}
        className={`reading-surface${expanded ? " reading-surface-expanded" : ""}`}
        role={expanded && !confirm && !googleAiRequest ? "dialog" : undefined}
        aria-modal={expanded && !confirm && !googleAiRequest ? true : undefined}
        aria-label={
          expanded ? `Lecture pleine page de ${edition.title}` : undefined
        }
      >
        <div className="reading-surface-header" inert={!!googleAiRequest}>
          {expanded && (
            <>
              <button
                className="icon-button"
                aria-label="Retour à la bibliothèque"
                onClick={onBack}
              >
                <ArrowLeft size={18} />
              </button>
              <span>{edition.title}</span>
              <button
                className="secondary"
                aria-pressed={mode === "interactive"}
                onClick={() => {
                  if (mode !== "interactive") setConfirm(true);
                  else
                    run(async () => {
                      await db.preferences.put({
                        key: `reader-trust-${edition.id}`,
                        value: "safe",
                      });
                      setMode("safe");
                    });
                }}
              >
                <Code size={16} />
                {mode === "interactive" ? "Désactiver JS" : "Interactif"}
              </button>
            </>
          )}
          {expanded && day && (
            <button
              className="secondary"
              onClick={() => onDay?.(edition.dayKey!)}
            >
              Historique
            </button>
          )}
          {mode !== "text" && (
            <div
              className="reading-zoom"
              role="group"
              aria-label="Zoom du HTML"
            >
              <button
                className="icon-button"
                aria-label="Dézoomer le HTML"
                disabled={htmlZoom <= 40}
                onClick={() => setHtmlZoom(Math.max(40, htmlZoom - 10))}
              >
                <Minus size={16} />
              </button>
              <output aria-live="polite" aria-label="Échelle du HTML">
                {htmlZoom} %
              </output>
              <button
                className="icon-button"
                aria-label="Zoomer le HTML"
                disabled={htmlZoom >= 200}
                onClick={() => setHtmlZoom(Math.min(200, htmlZoom + 10))}
              >
                <Plus size={16} />
              </button>
              <button
                className="icon-button"
                aria-label="Recharger le HTML"
                onClick={() => setFrameRevision((revision) => revision + 1)}
              >
                <RefreshCw size={16} />
              </button>
            </div>
          )}
          <button
            className="secondary"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <Minimize size={18} /> : <Maximize size={18} />}
            {expanded ? "Réduire la lecture" : "Lecture pleine page"}
          </button>
        </div>
        {mode !== "interactive" && questions.length > 0 && (
          <details
            className="parent-google-questions"
            inert={!!googleAiRequest}
          >
            <summary>Questions Google disponibles ({questions.length})</summary>
            <p>
              Prévisualiser, corriger et copier une question du fichier, sans
              activer ses scripts.
            </p>
            {questions.map((question, index) => (
              <button
                className="secondary"
                key={question}
                onClick={() => prepareQuestion(question)}
              >
                Préparer la question {index + 1}
              </button>
            ))}
          </details>
        )}
        {mode === "text" ? (
          <div className="text-reader">
            <div className="font-toolbar">
              <span>Taille du texte</span>
              <button
                className="icon-button"
                aria-label="Réduire le texte"
                onClick={() => setFont(Math.max(14, font - 2))}
              >
                <Minus />
              </button>
              <button
                className="icon-button"
                aria-label="Agrandir le texte"
                onClick={() => setFont(Math.min(32, font + 2))}
              >
                <Plus />
              </button>
            </div>
            <div style={{ fontSize: font }}>
              {edition.articles.length ? (
                edition.articles.map((a) => (
                  <article
                    className="indexed-article"
                    key={a.id}
                    id={`article-${a.id}`}
                  >
                    <p className="eyebrow">{a.category}</p>
                    <h2>{a.title}</h2>
                    <p className="article-text">
                      {a.text ||
                        "Aucun texte extrait pour cet article : consultez le HTML original."}
                    </p>
                    <div className="reader-toolbar">
                      <button
                        className="secondary"
                        onClick={() =>
                          run(() =>
                            db.reading(edition.id, a.id, {
                              favorite: !states.find(
                                (s) =>
                                  s.editionId === edition.id &&
                                  s.articleId === a.id,
                              )?.favorite,
                            }),
                          )
                        }
                      >
                        <Star size={16} />
                        {states.find(
                          (s) =>
                            s.editionId === edition.id && s.articleId === a.id,
                        )?.favorite
                          ? "Retirer le favori"
                          : "Favori article"}
                      </button>
                      <button
                        className="secondary"
                        onClick={() =>
                          run(() =>
                            db.reading(edition.id, a.id, {
                              read: !states.find(
                                (s) =>
                                  s.editionId === edition.id &&
                                  s.articleId === a.id,
                              )?.read,
                            }),
                          )
                        }
                      >
                        <Check size={16} />
                        {states.find(
                          (s) =>
                            s.editionId === edition.id && s.articleId === a.id,
                        )?.read
                          ? "Article lu"
                          : "Marquer l’article lu"}
                      </button>
                      <button
                        className="text-button"
                        onClick={() => {
                          setArticle(a.id);
                          document.getElementById("note-body")?.focus();
                        }}
                      >
                        Annoter cet article
                      </button>
                    </div>
                    {a.sources.length > 0 && (
                      <ul className="sources">
                        {a.sources
                          .map(validateSourceUrl)
                          .filter((u): u is string => !!u)
                          .map((u) => (
                            <li key={u}>
                              <a
                                href={u}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {u}
                              </a>
                            </li>
                          ))}
                      </ul>
                    )}
                  </article>
                ))
              ) : (
                <p className="article-text">{edition.text}</p>
              )}
            </div>
          </div>
        ) : srcDoc ? (
          <div className="edition-viewport" inert={!!googleAiRequest}>
            <iframe
              ref={iframeRef}
              key={`${edition.id}-${mode}-${frameRevision}`}
              className="edition-frame"
              title={`Lecture de ${edition.title}`}
              sandbox={mode === "interactive" ? "allow-scripts" : ""}
              referrerPolicy="no-referrer"
              srcDoc={srcDoc}
              style={{
                width: `${10000 / htmlZoom}%`,
                height: `${10000 / htmlZoom}%`,
                transform: `scale(${htmlZoom / 100})`,
              }}
            />
          </div>
        ) : (
          <div className="reader-loading">
            <p role="status">{loadError || "Chargement de l’original…"}</p>
            {loadError && (
              <button className="secondary" onClick={() => setMode("text")}>
                Afficher le texte conservé
              </button>
            )}
          </div>
        )}
        {googleAiRequest && (
          <GoogleAiDialog
            destination={googleAiRequest.destination}
            isCurrent={isCurrentGoogleAi}
            onDismiss={dismissGoogleAi}
          />
        )}
        {confirm && (
          <div className="modal-backdrop">
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="trust-title"
              className="modal compact"
            >
              <h2 id="trust-title">Activer les interactions ?</h2>
              <p>
                Uniquement si vous connaissez l’origine de ce fichier. Les
                scripts pourront s’exécuter dans leur cadre isolé. Les requêtes
                fetch et les ressources externes sont bloquées, mais la
                navigation du cadre par un script peut encore provoquer une
                requête réseau. Ce mode ne garantit pas l’absence d’exfiltration
                du contenu du journal.
              </p>
              <p>
                Le journal n’aura pas accès à votre session Supabase, vos notes
                ni votre bibliothèque. Ses fonctions utilisant localStorage
                peuvent échouer.
              </p>
              <div className="modal-actions">
                <button className="secondary" onClick={() => setConfirm(false)}>
                  Rester en mode sécurisé
                </button>
                <button
                  className="primary"
                  onClick={() =>
                    run(async () => {
                      await db.preferences.put({
                        key: `reader-trust-${edition.id}`,
                        value: "interactive",
                      });
                      setMode("interactive");
                      setConfirm(false);
                    })
                  }
                >
                  Je fais confiance à ce fichier
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
      <section className="annotation-panel">
        <div>
          <p className="eyebrow">VOTRE REGARD</p>
          <h2>Notes & décisions</h2>
          <p className="muted">
            Conservées dans la PWA, indépendamment du journal.
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(saveNote, "Note enregistrée.");
          }}
        >
          <div className="form-row">
            <label>
              Type
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as "note" | "decision")}
              >
                <option value="note">Note</option>
                <option value="decision">Décision</option>
              </select>
            </label>
            <label>
              Associer à
              <select
                value={article}
                onChange={(e) => setArticle(e.target.value)}
              >
                <option value="">Toute l’édition</option>
                {edition.articles.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label htmlFor="note-body">
            Votre note
            <textarea
              id="note-body"
              value={note}
              maxLength={20000}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Une idée à garder, un sujet à creuser…"
              rows={3}
            />
          </label>
          <button className="primary" disabled={!note.trim()} type="submit">
            Enregistrer la note
            <ArrowRight size={16} />
          </button>
        </form>
        <div className="note-list">
          {notes
            .filter((n) => n.editionId === edition.id)
            .map((n) => (
              <article className="note" key={n.id}>
                <p className="eyebrow">
                  {n.kind === "decision" ? "DÉCISION" : "NOTE"} ·{" "}
                  {new Date(n.createdAt).toLocaleDateString("fr-FR")}
                </p>
                <p>{n.body}</p>
                {n.articleId && (
                  <small>
                    {edition.articles.find((a) => a.id === n.articleId)?.title}
                  </small>
                )}
              </article>
            ))}
        </div>
      </section>
    </section>
  );
}
