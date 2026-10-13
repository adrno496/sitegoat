import { useEffect, useState } from "react";
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
} from "lucide-react";
import type { Edition, ReadingState, Note } from "../data/model";
import { blobOf, dateLabel, now } from "../data/model";
import { db } from "../data/db";
import { isolatedHTML } from "./import";
import { useDialogFocus } from "./dialogFocus";
import { download } from "./backup";
export function Reader({
  edition,
  editions,
  states,
  notes,
  onBack,
  onOpen,
  run,
}: {
  edition: Edition;
  editions: Edition[];
  states: ReadingState[];
  notes: Note[];
  onBack: () => void;
  onOpen: (id: string) => void;
  run: (action: () => Promise<unknown>, success?: string) => void;
}) {
  const [bytes, setBytes] = useState<Uint8Array>();
  const [mode, setMode] = useState<"safe" | "interactive" | "text">("safe");
  const [confirm, setConfirm] = useState(false);
  const [font, setFont] = useState(18);
  const [note, setNote] = useState("");
  const [kind, setKind] = useState<"note" | "decision">("note");
  const [article, setArticle] = useState("");
  const [srcDoc, setSrcDoc] = useState("");
  const [loadError, setLoadError] = useState("");
  useDialogFocus(confirm, () => setConfirm(false));
  const state = states.find(
    (s) => s.editionId === edition.id && s.articleId === "edition",
  );
  const index = editions.findIndex((e) => e.id === edition.id);
  useEffect(() => {
    setBytes(undefined);
    setMode("safe");
    setNote("");
    setLoadError("");
    let canceled = false;
    db.originals
      .get(edition.id)
      .then((o) => {
        if (!canceled) {
          if (o) setBytes(o.bytes);
          else
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
    if (bytes) setSrcDoc(isolatedHTML(bytes, mode === "interactive"));
  }, [bytes, mode]);
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
          ? ` · Sources vérifiées le ${dateLabel(edition.sourceVerifiedAt)}`
          : " · Actualité des sources non vérifiée"}
      </p>
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
      <div className="mode-tabs" role="group" aria-label="Mode de lecture">
        <button aria-pressed={mode === "safe"} onClick={() => setMode("safe")}>
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
                      {a.sources.map((u) => (
                        <li key={u}>
                          <a href={u} target="_blank" rel="noopener noreferrer">
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
      ) : bytes ? (
        <iframe
          key={`${edition.id}-${mode}`}
          className="edition-frame"
          title={`Lecture de ${edition.title}`}
          sandbox={mode === "interactive" ? "allow-scripts" : ""}
          referrerPolicy="no-referrer"
          srcDoc={srcDoc}
        />
      ) : (
        <p>Chargement de l’original…</p>
      )}
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
              Uniquement si vous connaissez l’origine de ce fichier. Les scripts
              pourront s’exécuter dans leur cadre isolé. Les requêtes fetch et
              les ressources externes sont bloquées, mais la navigation du cadre
              par un script peut encore provoquer une requête réseau. Ce mode ne
              garantit pas l’absence d’exfiltration du contenu du journal.
            </p>
            <p>
              Le journal n’aura pas accès à votre session Supabase, vos notes ni
              votre bibliothèque. Ses fonctions utilisant localStorage peuvent
              échouer.
            </p>
            <div className="modal-actions">
              <button className="secondary" onClick={() => setConfirm(false)}>
                Rester en mode sécurisé
              </button>
              <button
                className="primary"
                onClick={() => {
                  setMode("interactive");
                  setConfirm(false);
                }}
              >
                Je fais confiance à ce fichier
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
