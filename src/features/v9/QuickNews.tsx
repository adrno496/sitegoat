import { DisplayFilters } from "./preferences";
import { useMemo, useState } from "react";
import type { Edition } from "../../data/model";
import { indexQuickBriefs } from "../../data/quickBriefs";
import { normalizeArticleSearch } from "../../data/articles";
import { PublicGoogleLink } from "../PublicGoogleLink";
export function QuickNews({
  editions,
  date,
  onArticle,
}: {
  editions: Edition[];
  date?: string;
  onArticle?: (eventId: string, editionId: string) => void;
}) {
  const rows = useMemo(
    () =>
      indexQuickBriefs(
        editions.filter((e) => !e.archived && (!date || e.date === date)),
      ),
    [editions, date],
  );
  const [query, setQuery] = useState(""),
    [theme, setTheme] = useState(""),
    [proof, setProof] = useState(""),
    [sort, setSort] = useState("recent"),
    [limit, setLimit] = useState(30),
    [promotions, setPromotions] = useState(false);
  const filtered = rows
    .filter(
      (r) =>
        (promotions || !r.promoted) &&
        (!theme || r.item.theme === theme) &&
        (!proof || r.item.evidenceStatus === proof) &&
        normalizeArticleSearch(
          [r.item.title, r.item.theme, r.item.source.publisher].join(" "),
        ).includes(normalizeArticleSearch(query)),
    )
    .sort((a, b) =>
      sort === "title"
        ? a.item.title.localeCompare(b.item.title, "fr")
        : b.item.publishedAt.localeCompare(a.item.publishedAt) ||
          b.item.eventDate.localeCompare(a.item.eventDate),
    );
  return (
    <section className="quick-news" aria-label="Actualité rapide">
      <h2>Actualité rapide</h2>
      <p>
        Les grands titres présents dans vos éditions. Les statuts de preuve sont
        déclarés par le producteur ; les sources ne sont pas revérifiées par
        Sitegoat.
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
            Thème des brèves
            <select
              aria-label="Thème des brèves"
              value={theme}
              onChange={(e) => {
                setTheme(e.target.value);
                setLimit(30);
              }}
            >
              <option value="">Tous les thèmes</option>
              {[...new Set(rows.map((r) => r.item.theme))].sort().map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            Preuve des brèves
            <select
              aria-label="Preuve des brèves"
              value={proof}
              onChange={(e) => {
                setProof(e.target.value);
                setLimit(30);
              }}
            >
              <option value="">Tous les statuts</option>
              {[...new Set(rows.map((r) => r.item.evidenceStatus))]
                .sort()
                .map((t) => (
                  <option key={t}>{t}</option>
                ))}
            </select>
          </label>
          <label>
            Tri des brèves
            <select
              aria-label="Tri des brèves"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="recent">Publication récente</option>
              <option value="title">Titre</option>
            </select>
          </label>
        </DisplayFilters>
      </div>
      <DisplayFilters>
        <label>
          <input
            type="checkbox"
            checked={promotions}
            onChange={(e) => setPromotions(e.target.checked)}
          />
          Afficher aussi les brèves devenues articles
        </label>
      </DisplayFilters>
      <p role="status">
        {filtered.length} titre(s) sur {rows.length} ·{" "}
        {rows.filter((r) => r.promoted).length} promotion(s), comptées dans les
        articles
      </p>
      <div className="brief-list">
        {filtered
          .slice(0, limit)
          .map(({ item: i, edition, history, promoted, key }) => (
            <article className="brief-card" key={key} data-event-id={i.eventId}>
              <p className="eyebrow">
                {i.theme} · {i.evidenceStatus} (déclaré)
              </p>
              <h3>{i.title}</h3>
              <p className="small-note">
                Fait : {i.eventDate} · Publication : {i.publishedAt} ·{" "}
                {i.source.publisher}
              </p>
              <div className="settings-actions">
                <PublicGoogleLink question={i.googleQuery} />
                <a
                  className="secondary"
                  href={i.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                >
                  Source
                </a>
                {promoted && onArticle && (
                  <button
                    className="secondary"
                    onClick={() =>
                      onArticle(
                        i.relatedArticleEventId || i.eventId,
                        edition.id,
                      )
                    }
                  >
                    Lire l’article détaillé
                  </button>
                )}
              </div>
              {(history.length > 0 || i.corrections?.length) && (
                <details>
                  <summary>Historique et corrections</summary>
                  <p>
                    Original : {edition.editionSlot} · révision{" "}
                    {edition.externalRevision} · {edition.date}
                  </p>
                  {i.corrections?.map((c, n) => (
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
                  {history.map((h, n) => (
                    <p key={n}>
                      {h.edition.editionSlot} · {h.item.title} ·{" "}
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
          ))}
      </div>
      {filtered.length > limit && (
        <div className="settings-actions">
          <button className="secondary" onClick={() => setLimit((n) => n + 30)}>
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
          Aucune brève structurée importée pour cette journée. Importez un HTML
          contenant le compagnon quickBriefsData ; aucun titre n’est créé pour
          remplir la page.
        </p>
      )}
      {rows.length > 0 && !filtered.length && (
        <p>Aucun titre pour ces filtres.</p>
      )}
    </section>
  );
}
