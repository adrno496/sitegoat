import { useMemo, useState } from "react";
import type { Edition, Note } from "../data/model";
import { dateLabel, sizeLabel } from "../data/model";
import { resolveDay } from "../data/day";
import { SLOTS, verifiedLabel } from "../data/editorial";
import { validateSourceUrl } from "./sourceUrl";

export function DayCard({
  versions,
  onOpen,
  onHistory,
}: {
  versions: Edition[];
  onOpen: (id: string) => void;
  onHistory: (key: string) => void;
}) {
  const day = resolveDay(versions);
  const current = day.current;
  if (!current) return null;
  const currentAssessment = day.versions.find(
    (v) => v.edition.id === current.id,
  )!.assessment;
  return (
    <article className="edition-card day-card">
      <p className="eyebrow">JOURNÉE · {dateLabel(current.date)}</p>
      <h3>{current.title}</h3>
      <p>
        {current.articles.filter((a) => a.kind === "news").length} actualités
        explicitement typées · {current.articles.length} éléments indexés ·{" "}
        {versions.length} version(s) conservée(s)
      </p>
      <p className={`day-status ${day.status !== "COMPLETE" ? "warning" : ""}`}>
        CUMUL{" "}
        {day.status === "COMPLETE"
          ? "COMPLETE"
          : day.status === "PARTIAL"
            ? "PARTIAL"
            : "UNKNOWN"}
      </p>
      <div className="day-slots">
        {SLOTS.map((slot) => (
          <span
            key={slot}
            className={current.slotsIncluded?.includes(slot) ? "included" : ""}
          >
            {slot}{" "}
            {current.slotsIncluded?.includes(slot)
              ? "inclus déclaré"
              : "non inclus"}
          </span>
        ))}
      </div>
      <p className="small-note">
        {day.reliable
          ? "Dernière version fiable selon les contrôles disponibles"
          : "Cumul non vérifié : consultez l’historique"}{" "}
        · révision externe {current.externalRevision ?? "inconnue"}
      </p>
      {day.versions.some((v) => v.assessment.issues.length) && (
        <p className="warning">
          Conflit ou version partielle dans l’historique.
        </p>
      )}
      {!!currentAssessment.missingSlots.length && (
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
          Lire la version courante
        </button>
        <button
          className="secondary"
          onClick={() => onHistory(current.dayKey!)}
        >
          Historique des éditions
        </button>
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
        {versions.length} versions · {assessment.status} · {selected.dayKey}
      </p>
      <div className="day-slots">
        {SLOTS.map((slot) => (
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
        {day.reliable && (
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
              {result.status} · {edition.articles.length} éléments indexés ·{" "}
              {sizeLabel(edition.size)}
              {edition.deleted
                ? " · Corbeille"
                : edition.archived
                  ? " · Archive"
                  : ""}
            </p>
            <p>
              {result.newEvents} nouveaux événements identifiés ·{" "}
              {result.corrections} corrections textuelles ·{" "}
              {result.removedEvents} absences
            </p>
            {result.issues.map((issue) => (
              <p className="warning" key={issue}>
                {issue}
              </p>
            ))}
            <p className="small-note">
              Import {verifiedLabel(edition.importedAt)}
              {edition.sourceVerifiedAt
                ? ` · Vérification déclarée ${verifiedLabel(edition.sourceVerifiedAt)}`
                : ""}
            </p>
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
