import { DisplayFilters } from "./v9/preferences";
import { SnapshotStatus } from "./SnapshotStatus";
import { useMemo, useState } from "react";
import { readingChanges, changesLabel } from "../data/readingChanges";
import type { Edition, Note, ReadingState } from "../data/model";
import { dateLabel, sizeLabel } from "../data/model";
import { resolveDay } from "../data/day";
import { scheduleFor, verifiedLabel } from "../data/editorial";
import { validateSourceUrl } from "./sourceUrl";
import { Star } from "lucide-react";

export function DayCard({
  versions,
  states = [],
  onOpen,
  onHistory,
  favoriteIds = [],
  onFavorite,
  onMove,
}: {
  versions: Edition[];
  states?: ReadingState[];
  onOpen: (id: string) => void;
  onHistory: (key: string) => void;
  favoriteIds?: string[];
  onFavorite?: (id: string) => void;
  onMove?: (ids: string[], deleted: boolean) => void;
}) {
  const day = resolveDay(versions);
  const current = day.current;
  if (!current) return null;
  const changes = readingChanges(current, versions, states);
  const currentAssessment = day.versions.find(
    (v) => v.edition.id === current.id,
  )!.assessment;
  return (
    <article className="edition-card day-card">
      <p className="eyebrow">JOURNÉE · {dateLabel(current.date)}</p>
      <h3>{current.title}</h3>
      {changes.kind === "compared" && (
        <p className="update-badge">{changesLabel(changes)}</p>
      )}
      {changes.kind === "unavailable" && (
        <p className="update-badge">
          Nouvelle édition depuis votre dernière ouverture
        </p>
      )}
      <p>
        {current.articles.filter((a) => a.kind === "news").length} actualités
        explicitement typées · {current.articles.length} éléments indexés ·{" "}
        {versions.length} version(s) dans l’historique · une seule édition
        affichée
      </p>
      {currentAssessment.snapshot ? (
        <SnapshotStatus assessment={currentAssessment} />
      ) : (
        <p
          className={`day-status ${day.status !== "COMPLETE" ? "warning" : ""}`}
        >
          CUMUL{" "}
          {day.status === "COMPLETE"
            ? "COMPLETE"
            : day.status === "PARTIAL"
              ? "PARTIAL"
              : "UNKNOWN"}
        </p>
      )}
      {!!current.slotsIncluded?.length && (
        <div className="day-slots">
          {scheduleFor(current).map((slot) => (
            <span
              key={slot}
              className={
                current.slotsIncluded?.includes(slot) ? "included" : ""
              }
            >
              {slot}{" "}
              {current.slotsIncluded?.includes(slot)
                ? "inclus déclaré"
                : "non inclus"}
            </span>
          ))}
        </div>
      )}
      <p className="small-note">
        Dernière édition du jour · révision externe{" "}
        {current.externalRevision ?? "inconnue"}
      </p>
      {!currentAssessment.snapshot &&
        day.versions.some((v) => v.assessment.issues.length) && (
          <p className="warning">
            Conflit ou version partielle dans l’historique.
          </p>
        )}
      {!currentAssessment.snapshot &&
        !!currentAssessment.missingSlots.length && (
          <p className="warning">
            Trous : {currentAssessment.missingSlots.join(" / ")}
          </p>
        )}
      <div className="settings-actions">
        <button
          className="primary"
          onClick={() => onOpen(current.id)}
          aria-label={`Lire ${current.title}`}
        >
          Lire la dernière édition
        </button>
        <button
          className="secondary"
          onClick={() => onHistory(current.dayKey!)}
        >
          Historique des éditions
        </button>
        {onFavorite && (
          <button
            className="icon-button"
            aria-label={`${favoriteIds.includes(current.id) ? "Retirer des" : "Ajouter aux"} favoris ${current.title}`}
            onClick={() => onFavorite(current.id)}
          >
            <Star
              size={18}
              fill={favoriteIds.includes(current.id) ? "currentColor" : "none"}
            />
          </button>
        )}
        {onMove && (
          <button
            className="text-button"
            onClick={() =>
              onMove(
                versions.map((e) => e.id),
                !current.deleted,
              )
            }
          >
            {current.deleted ? "Restaurer" : "Corbeille"}
          </button>
        )}
      </div>
    </article>
  );
}
export function DayView({
  versions,
  notes,
  onBack,
  onOpen,
}: {
  versions: Edition[];
  notes: Note[];
  onBack: () => void;
  onOpen: (id: string) => void;
}) {
  const day = useMemo(() => resolveDay(versions), [versions]);
  const [selectedId, setSelectedId] = useState(day.current?.id || "");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const selected = versions.find((e) => e.id === selectedId) || day.current;
  if (!selected)
    return (
      <section>
        <h1>Journée indisponible</h1>
        <button onClick={onBack}>Bibliothèque</button>
      </section>
    );
  const assessment = day.versions.find(
    (v) => v.edition.id === selected.id,
  )!.assessment;
  const categories = [...new Set(selected.articles.map((a) => a.category))];
  const articles = selected.articles.filter(
    (a) =>
      (category === "all" || a.category === category) &&
      `${a.title} ${a.text}`
        .toLocaleLowerCase("fr")
        .includes(query.toLocaleLowerCase("fr")),
  );
  const privateNotes = notes.filter((n) =>
    versions.some((e) => e.id === n.editionId),
  );
  return (
    <section className="day-view">
      <button className="text-button" onClick={onBack}>
        Retour à la bibliothèque
      </button>
      <p className="eyebrow">JOURNAL 360° · JOURNÉE PRIVÉE</p>
      <h1>Journée du {dateLabel(selected.date)}</h1>
      <p>
        {versions.length} versions ·{" "}
        {assessment.snapshot ? "snapshot documentaire" : assessment.status} ·{" "}
        {selected.dayKey}
      </p>
      {assessment.snapshot && <SnapshotStatus assessment={assessment} />}
      <div className="day-slots">
        {scheduleFor(selected).map((slot) => (
          <span key={slot}>
            {slot} :{" "}
            {selected.slotsIncluded?.includes(slot)
              ? "inclus déclaré"
              : "non inclus"}
          </span>
        ))}
      </div>
      <p className="small-note">
        Les créneaux sont déclarés par le fichier. Le contrôle compare les
        événements des versions reçues ; il ne certifie pas les actualités.
      </p>
      <div className="settings-actions">
        <button className="primary" onClick={() => onOpen(selected.id)}>
          Lire cette version
        </button>
        {day.reliable && !selected.unified && (
          <button
            className="secondary"
            onClick={() => {
              setSelectedId(day.reliable!.id);
              onOpen(day.reliable!.id);
            }}
          >
            Dernière version fiable
          </button>
        )}
      </div>
      <h2>Historique des éditions</h2>
      <div className="day-history">
        {day.versions.map(({ edition, assessment: result }) => (
          <article className="quiet-panel" key={edition.id}>
            <h3>
              Révision externe {edition.externalRevision ?? "inconnue"} ·
              version locale {edition.revision}
            </h3>
            <p>
              {result.snapshot ? "Snapshot documentaire" : result.status} ·{" "}
              {edition.articles.length} éléments indexés ·{" "}
              {sizeLabel(edition.size)}
              {edition.deleted
                ? " · Corbeille"
                : edition.archived
                  ? " · Archive"
                  : ""}
            </p>
            {result.snapshot ? (
              <SnapshotStatus assessment={result} />
            ) : (
              <p>
                {result.newEvents} nouveaux événements identifiés ·{" "}
                {result.corrections} corrections textuelles ·{" "}
                {result.removedEvents} absences
              </p>
            )}
            {!result.snapshot &&
              result.issues.map((issue) => (
                <p className="warning" key={issue}>
                  {issue}
                </p>
              ))}
            <p className="small-note">{verifiedLabel(edition.importedAt)}</p>
            <details>
              <summary>Empreinte de l’original</summary>
              <code className="hash-text">{edition.sha256}</code>
            </details>
            <button
              className="secondary"
              aria-pressed={selected.id === edition.id}
              onClick={() => {
                setSelectedId(edition.id);
                setCategory("all");
              }}
            >
              Consulter la révision{" "}
              {edition.externalRevision ?? edition.revision}
            </button>
          </article>
        ))}
      </div>
      <h2>Articles de la version sélectionnée</h2>
      <div className="filters">
        <label>
          Rechercher dans la journée
          <input value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <DisplayFilters>
          <label>
            Rubrique du jour
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="all">Toutes les rubriques</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </DisplayFilters>
      </div>
      <p>
        {articles.length} résultat(s). Aucun article n’a été ajouté par le
        lecteur.
      </p>
      {articles.map((article) => (
        <article className="quiet-panel" key={article.id}>
          <p className="eyebrow">
            {article.category} · {article.kind || "nature non précisée"}
            {article.firstSeenSlot
              ? ` · première apparition déclarée ${article.firstSeenSlot}`
              : ""}
          </p>
          <h3>{article.title}</h3>
          <p className="article-text">{article.text}</p>
          <ul className="sources">
            {article.sources
              .map(validateSourceUrl)
              .filter((u): u is string => !!u)
              .map((u) => (
                <li key={u}>
                  <a href={u} target="_blank" rel="noopener noreferrer">
                    Source originale : {u}
                  </a>
                </li>
              ))}
          </ul>
        </article>
      ))}
      <h2>Notes privées de cette journée</h2>
      <p>
        Les notes restent liées à leur version d’origine. Elles ne sont jamais
        jointes aux demandes Google.
      </p>
      {privateNotes.map((note) => (
        <article className="quiet-panel" key={note.id}>
          <p>{note.body}</p>
          <button
            className="text-button"
            onClick={() => onOpen(note.editionId)}
          >
            Ouvrir la version annotée
          </button>
        </article>
      ))}
    </section>
  );
}
