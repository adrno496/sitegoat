import type { ReadingChanges } from "../data/readingChanges";
import { changesLabel } from "../data/readingChanges";

export function ReadingUpdates({ changes }: { changes: ReadingChanges }) {
  if (changes.kind === "seen" || changes.kind === "history") return null;
  return (
    <details className="reading-updates">
      <summary>
        {changes.kind === "first"
          ? "Première lecture de cette journée"
          : changes.kind === "unavailable"
            ? "Nouvelle édition disponible"
            : changesLabel(changes)}
      </summary>
      <div
        className="reading-updates-content"
        role="region"
        aria-label="Détail des nouveautés"
        tabIndex={0}
      >
        <p>
          {changes.kind === "first"
            ? "Les prochaines éditions seront comparées à celle-ci."
            : "Comparaison avec la dernière édition de cette journée que vous avez ouverte."}{" "}
          L’ouverture d’une édition sert de repère ; elle ne la marque pas comme
          lue.
        </p>
        {changes.kind === "unavailable" && (
          <p>
            Les identifiants d’articles ne permettent pas une comparaison fiable
            de ces fichiers.
          </p>
        )}
        {changes.kind === "compared" && (
          <>
            {!changes.added.length && !changes.updated.length && (
              <p>Aucun ajout ou changement identifié.</p>
            )}
            {[
              ...changes.added.map((article) => ({
                article,
                label: "Nouveau",
              })),
              ...changes.updated.map((article) => ({
                article,
                label: "Mis à jour",
              })),
            ].map(({ article, label }) => (
              <article key={article.eventId}>
                <span className="update-badge">{label}</span>
                <strong>{article.title}</strong>
                <p>
                  {article.text.slice(0, 400)}
                  {article.text.length > 400 ? "…" : ""}
                </p>
              </article>
            ))}
            {!!changes.missing && (
              <p>
                {changes.missing} article(s) de la précédente lecture absent(s)
                de ce fichier. Consultez l’historique pour les retrouver.
              </p>
            )}
          </>
        )}
      </div>
    </details>
  );
}
