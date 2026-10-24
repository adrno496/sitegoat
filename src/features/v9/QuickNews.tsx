import { editionDateTime } from "../eventPresentation";
import { EditorialMetadata } from "../editorialPresentation";
import { RecurringSearches } from "./RecurringSearches";
import { DisplayFilters } from "./preferences";
import { useId, useMemo, useState } from "react";
import type { Edition } from "../../data/model";
import { indexQuickNews, latestPublicationDate } from "../../data/quickNews";
import { normalizeArticleSearch } from "../../data/articles";
import { PublicGoogleLink } from "../PublicGoogleLink";
import { validateSourceUrl } from "../sourceUrl";

export function QuickNews({
  editions,
  onArticle,
}: {
  editions: Edition[];
  onArticle?: (eventId: string, editionId: string) => void;
}) {
  const [panel, setPanel] = useState<"headlines" | "recurring">("headlines");
  const tabsId = useId();
  const rows = useMemo(() => indexQuickNews(editions), [editions]);
  const latest = latestPublicationDate(rows.map((r) => r.publishedAt));
  const [query, setQuery] = useState(""),
    [theme, setTheme] = useState(""),
    [sort, setSort] = useState("recent"),
    [limit, setLimit] = useState(30);
  const filtered = rows
    .filter(
      (r) =>
        (!theme || r.theme === theme) &&
        normalizeArticleSearch(
          [r.title, r.theme, r.source?.publisher].join(" "),
        ).includes(normalizeArticleSearch(query)),
    )
    .sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title, "fr")
        : b.publishedAt.localeCompare(a.publishedAt) ||
          a.key.localeCompare(b.key),
    );
  return (
    <section className="quick-news" aria-label="Actualité rapide">
      <h1>Actualité rapide</h1>
      <div
        className="mode-tabs quick-news-tabs"
        role="tablist"
        aria-label="Rubriques d’Actualité rapide"
      >
        {(
          [
            ["headlines", "Tous les titres"],
            ["recurring", "Récurrent"],
          ] as const
        ).map(([id, label], index) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`${tabsId}-${id}-tab`}
            aria-selected={panel === id}
            aria-controls={`${tabsId}-${id}`}
            tabIndex={panel === id ? 0 : -1}
            onClick={() => setPanel(id)}
            onKeyDown={(event) => {
              if (
                !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              )
                return;
              event.preventDefault();
              const next =
                event.key === "Home"
                  ? "headlines"
                  : event.key === "End"
                    ? "recurring"
                    : index === 0
                      ? "recurring"
                      : "headlines";
              setPanel(next);
              document.getElementById(`${tabsId}-${next}-tab`)?.focus();
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`${tabsId}-headlines`}
        aria-labelledby={`${tabsId}-headlines-tab`}
        hidden={panel !== "headlines"}
        tabIndex={0}
      >
        <p>
          Tous les titres de vos articles et de vos brèves, du plus récent au
          plus ancien. Les prochains imports sont ajoutés automatiquement.
        </p>
        <div className="unified-filters">
          <label>
            Rechercher un titre
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setLimit(30);
              }}
            />
          </label>
          <DisplayFilters>
            <label>
              Thème des titres
              <select
                aria-label="Thème des titres"
                value={theme}
                onChange={(e) => {
                  setTheme(e.target.value);
                  setLimit(30);
                }}
              >
                <option value="">Tous les thèmes</option>
                {[...new Set(rows.map((r) => r.theme))].sort().map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              Tri des titres
              <select
                aria-label="Tri des titres"
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setLimit(30);
                }}
              >
                <option value="recent">Publication récente</option>
                <option value="title">Titre</option>
              </select>
            </label>
          </DisplayFilters>
        </div>
        <p role="status">
          {filtered.length} titre(s) sur {rows.length}
        </p>
        <div className="brief-list">
          {filtered.slice(0, limit).map((r) => {
            const { article, brief, edition } = r;
            const isLatest = !!latest && r.publishedAt === latest;
            const source = r.source && validateSourceUrl(r.source.url);
            return (
              <article
                className={`brief-card${isLatest ? " latest-publication" : ""}`}
                data-latest={isLatest || undefined}
                key={r.key}
                data-event-id={
                  article?.article.eventId ||
                  brief?.item.eventId ||
                  article?.article.id
                }
              >
                {isLatest && (
                  <span className="latest-publication-badge">
                    Dernière publication
                  </span>
                )}
                <p className="eyebrow">{r.theme}</p>
                <h2>{r.title}</h2>
                <EditorialMetadata
                  edition={edition}
                  item={
                    article
                      ? edition.unified?.items.find(
                          (i) => i.eventId === article.article.eventId,
                        )
                      : brief?.item
                  }
                  brief={!article}
                />
                <div className="settings-actions">
                  {article && onArticle && (
                    <button
                      className="secondary"
                      onClick={() =>
                        onArticle(
                          article.article.eventId || article.article.id,
                          edition.id,
                        )
                      }
                    >
                      Lire l’article détaillé
                    </button>
                  )}
                  <PublicGoogleLink question={r.googleQuery} />
                  {source && (
                    <a
                      className="secondary"
                      href={source}
                      target="_blank"
                      rel="noopener noreferrer"
                      referrerPolicy="no-referrer"
                    >
                      {r.source!.publisher || "Source"}
                    </a>
                  )}
                </div>
                {brief &&
                  (brief.history.length > 0 ||
                    brief.item.corrections?.length) && (
                    <details>
                      <summary>Historique et corrections</summary>
                      {brief.item.corrections?.map((c, n) => (
                        <p key={n}>
                          {c.at} · {c.reason} ·{" "}
                          <a
                            href={c.source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {c.source.publisher}
                          </a>
                        </p>
                      ))}
                      {brief.history.map((h, n) => (
                        <p key={n}>
                          Édition du {editionDateTime(h.edition)} ·{" "}
                          {h.item.title} ·{" "}
                          <a
                            href={h.item.source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {h.item.source.publisher}
                          </a>
                        </p>
                      ))}
                    </details>
                  )}
              </article>
            );
          })}
        </div>
        {filtered.length > limit && (
          <div className="settings-actions">
            <button
              className="secondary"
              onClick={() => setLimit((n) => n + 30)}
            >
              Afficher 30 titres de plus
            </button>
            <button
              className="secondary"
              onClick={() => setLimit(filtered.length)}
            >
              Tout afficher ({filtered.length} titres)
            </button>
          </div>
        )}
        {!rows.length && (
          <p className="v9-empty">
            Aucun titre pour le moment. Importez une édition pour retrouver ses
            articles et ses brèves ici.
          </p>
        )}
        {rows.length > 0 && !filtered.length && (
          <p>Aucun titre pour ces filtres.</p>
        )}
      </div>
      <div
        role="tabpanel"
        id={`${tabsId}-recurring`}
        aria-labelledby={`${tabsId}-recurring-tab`}
        hidden={panel !== "recurring"}
        tabIndex={0}
      >
        <RecurringSearches themes={[...new Set(rows.map((r) => r.theme))]} />
      </div>
    </section>
  );
}
