import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  FileText,
  Search,
  Star,
} from "lucide-react";
import { indexArticles, matchesArticle } from "../data/articles";
import { dateLabel, type Edition, type ReadingState } from "../data/model";
import { validateSourceUrl } from "./sourceUrl";

const PAGE_SIZE = 30;
export function ArticlesView({
  editions,
  states,
  onOpen,
  onImport,
  onReading,
}: {
  editions: Edition[];
  states: ReadingState[];
  onOpen: (id: string) => void;
  onImport: () => void;
  onReading: (
    editionId: string,
    articleId: string,
    patch: { favorite?: boolean; read?: boolean },
  ) => void;
}) {
  const items = useMemo(() => indexArticles(editions), [editions]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [group, setGroup] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("date");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const listHeading = useRef<HTMLHeadingElement>(null);
  const stateMap = useMemo(
    () =>
      new Map(
        states.map((s) => [JSON.stringify([s.editionId, s.articleId]), s]),
      ),
    [states],
  );
  const stateOf = (editionId: string, articleId: string) =>
    stateMap.get(JSON.stringify([editionId, articleId]));
  const categories = [...new Set(items.map((i) => i.article.category))].sort(
    (a, b) => a.localeCompare(b, "fr"),
  );
  const groupMap = new Map<string, Edition>();
  for (const item of items)
    if (!groupMap.has(item.group)) groupMap.set(item.group, item.edition);
  const groups = [...groupMap.entries()];
  const filtered = items.filter((item) => {
    const state = stateOf(item.edition.id, item.article.id);
    return (
      (!category || item.article.category === category) &&
      (!group || item.group === group) &&
      (!status ||
        (status === "favorite"
          ? state?.favorite
          : status === "read"
            ? state?.read
            : !state?.read)) &&
      matchesArticle(item, query)
    );
  });
  if (sort === "title")
    filtered.sort((a, b) =>
      a.article.title.localeCompare(b.article.title, "fr"),
    );
  else if (sort === "oldest") filtered.reverse();
  const current = filtered.find((i) => i.key === selected);
  const position = current ? filtered.indexOf(current) : -1;
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visiblePage = Math.min(page, pageCount - 1);
  const unindexed = editions.filter(
    (e) => !e.deleted && !e.articles.length,
  ).length;
  function changeFilter(action: () => void) {
    action();
    setPage(0);
    setSelected(null);
  }
  function open(key: string) {
    setSelected(key);
    requestAnimationFrame(() => heading.current?.focus());
  }
  function back() {
    setSelected(null);
    requestAnimationFrame(() => listHeading.current?.focus());
  }
  return (
    <section className="articles-view" aria-label="Articles des veilles">
      <div className="section-title articles-heading">
        <div>
          <p className="eyebrow">TOUTES VOS VEILLES, ARTICLE PAR ARTICLE</p>
          <h1 ref={listHeading} tabIndex={-1}>
            Articles
          </h1>
          <p className="muted">
            Retrouvez et lisez les articles de vos journaux importés, y compris
            les archives.
          </p>
        </div>
        <span className="articles-total">
          {items.length} article{items.length !== 1 ? "s" : ""} ·{" "}
          {groups.length} veille{groups.length !== 1 ? "s" : ""}
        </span>
      </div>
      {items.length > 0 ? (
        <>
          <div className="articles-filters">
            <label className="articles-search">
              Rechercher un article
              <span className="search-field">
                <Search size={18} />
                <input
                  type="search"
                  placeholder="Un sujet, un mot, une source…"
                  value={query}
                  onChange={(e) => changeFilter(() => setQuery(e.target.value))}
                />
              </span>
            </label>
            <label>
              Rubrique
              <select
                value={category}
                onChange={(e) =>
                  changeFilter(() => setCategory(e.target.value))
                }
              >
                <option value="">Toutes les rubriques</option>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Veille
              <select
                value={group}
                onChange={(e) => changeFilter(() => setGroup(e.target.value))}
              >
                <option value="">Toutes les veilles</option>
                {groups.map(([key, e]) => (
                  <option key={key} value={key}>
                    {dateLabel(e.date)} · {e.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              État de lecture
              <select
                value={status}
                onChange={(e) => changeFilter(() => setStatus(e.target.value))}
              >
                <option value="">Tous les articles</option>
                <option value="unread">Non lus</option>
                <option value="read">Lus</option>
                <option value="favorite">Favoris</option>
              </select>
            </label>
            <label>
              Trier les articles
              <select
                value={sort}
                onChange={(e) => changeFilter(() => setSort(e.target.value))}
              >
                <option value="date">Veilles les plus récentes</option>
                <option value="oldest">Veilles les plus anciennes</option>
                <option value="title">Titre de A à Z</option>
              </select>
            </label>
          </div>
          <div className="articles-results-bar">
            <p role="status">
              {filtered.length} article{filtered.length !== 1 ? "s" : ""} trouvé
              {filtered.length !== 1 ? "s" : ""}
            </p>
            {(query || category || group || status) && (
              <button
                className="text-button"
                onClick={() =>
                  changeFilter(() => {
                    setQuery("");
                    setCategory("");
                    setGroup("");
                    setStatus("");
                  })
                }
              >
                Effacer les filtres
              </button>
            )}
          </div>
          {current ? (
            <article className="article-detail">
              <button className="text-button" onClick={back}>
                <ArrowLeft size={17} />
                Retour aux articles
              </button>
              <p className="eyebrow">
                {current.article.category} ·{" "}
                {dateLabel(current.article.date || current.edition.date)}
              </p>
              <h2 ref={heading} tabIndex={-1}>
                {current.article.title}
              </h2>
              <p className="muted">
                Dans {current.edition.title} · {dateLabel(current.edition.date)}
                {current.edition.archived ? " · Archive" : ""}
              </p>
              <div className="article-actions">
                <button
                  className="secondary"
                  aria-pressed={
                    !!stateOf(current.edition.id, current.article.id)?.favorite
                  }
                  onClick={() =>
                    onReading(current.edition.id, current.article.id, {
                      favorite: !stateOf(current.edition.id, current.article.id)
                        ?.favorite,
                    })
                  }
                >
                  <Star size={16} />
                  Favori
                </button>
                <button
                  className="secondary"
                  aria-pressed={
                    !!stateOf(current.edition.id, current.article.id)?.read
                  }
                  onClick={() =>
                    onReading(current.edition.id, current.article.id, {
                      read: !stateOf(current.edition.id, current.article.id)
                        ?.read,
                    })
                  }
                >
                  <Check size={16} />
                  {stateOf(current.edition.id, current.article.id)?.read
                    ? "Marquer comme non lu"
                    : "Marquer comme lu"}
                </button>
                <button
                  className="text-button"
                  onClick={() => onOpen(current.edition.id)}
                >
                  Ouvrir le journal d’origine
                  <ArrowUpRight size={17} />
                </button>
              </div>
              <div className="article-body">
                {current.article.text ? (
                  current.article.text
                    .split(/\n+|(?<=\.)\s+(?=\*\*[^*]+\*\*)/)
                    .map((paragraph, index) => (
                      <p key={index}>
                        {paragraph
                          .split(/(\*\*[^*]+\*\*)/)
                          .map((part, partIndex) =>
                            part.startsWith("**") && part.endsWith("**") ? (
                              <strong key={partIndex}>
                                {part.slice(2, -2)}
                              </strong>
                            ) : (
                              part
                            ),
                          )}
                      </p>
                    ))
                ) : (
                  <p>
                    Le texte de cet article est disponible dans le journal
                    d’origine.
                  </p>
                )}
              </div>
              {current.article.sources.length > 0 && (
                <div className="article-sources">
                  <h3>Sources</h3>
                  <ul>
                    {current.article.sources.flatMap((source) => {
                      const url = validateSourceUrl(source);
                      return url
                        ? [
                            <li key={url}>
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                referrerPolicy="no-referrer"
                              >
                                {url}
                                <ArrowUpRight size={14} />
                              </a>
                            </li>,
                          ]
                        : [];
                    })}
                  </ul>
                </div>
              )}
              <div className="article-pagination">
                <button
                  className="secondary"
                  disabled={position <= 0}
                  onClick={() => open(filtered[position - 1].key)}
                >
                  <ArrowLeft size={16} />
                  Article précédent
                </button>
                <span>
                  {position + 1} / {filtered.length}
                </span>
                <button
                  className="secondary"
                  disabled={position === filtered.length - 1}
                  onClick={() => open(filtered[position + 1].key)}
                >
                  Article suivant
                  <ArrowRight size={16} />
                </button>
              </div>
            </article>
          ) : filtered.length ? (
            <>
              <div className="articles-grid">
                {filtered
                  .slice(visiblePage * PAGE_SIZE, (visiblePage + 1) * PAGE_SIZE)
                  .map((item) => (
                    <article key={item.key} className="article-card">
                      <p className="eyebrow">{item.article.category}</p>
                      <h2>
                        <button
                          className="title-button"
                          onClick={() => open(item.key)}
                        >
                          {item.article.title}
                        </button>
                      </h2>
                      <p className="article-excerpt">
                        {item.article.text.slice(0, 240)}
                        {item.article.text.length > 240 ? "…" : ""}
                      </p>
                      <div className="article-card-origin">
                        <span>
                          {dateLabel(item.edition.date)}
                          {item.edition.archived ? " · Archive" : ""}
                        </span>
                        <span>{item.edition.title}</span>
                      </div>
                      <div className="article-card-footer">
                        <button
                          className="text-button"
                          onClick={() => open(item.key)}
                        >
                          Lire l’article
                          <ArrowRight size={16} />
                        </button>
                        <span>
                          {stateOf(item.edition.id, item.article.id)
                            ?.favorite && (
                            <Star size={15} aria-label="Favori" />
                          )}
                          {stateOf(item.edition.id, item.article.id)?.read && (
                            <Check size={15} aria-label="Lu" />
                          )}
                        </span>
                      </div>
                    </article>
                  ))}
              </div>
              {pageCount > 1 && (
                <div className="article-pagination">
                  <button
                    className="secondary"
                    disabled={visiblePage === 0}
                    onClick={() => {
                      setPage(visiblePage - 1);
                      listHeading.current?.focus();
                    }}
                  >
                    <ArrowLeft size={16} />
                    Page précédente
                  </button>
                  <span>
                    Page {visiblePage + 1} / {pageCount}
                  </span>
                  <button
                    className="secondary"
                    disabled={visiblePage === pageCount - 1}
                    onClick={() => {
                      setPage(visiblePage + 1);
                      listHeading.current?.focus();
                    }}
                  >
                    Page suivante
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <Search size={30} />
              <h2>Aucun article trouvé</h2>
              <p>Essayez un autre mot ou élargissez les filtres.</p>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state">
          <FileText size={32} />
          <h2>Vos articles, réunis ici.</h2>
          <p>
            Importez une veille HTML : ses articles indexés apparaîtront
            automatiquement dans cet onglet.
          </p>
          <button className="primary" onClick={onImport}>
            Importer une veille
          </button>
        </div>
      )}
      {unindexed > 0 && (
        <p className="muted articles-index-note">
          {unindexed} {unindexed > 1 ? "journaux" : "journal"} sans articles
          structurés : lecture intégrale disponible dans la Bibliothèque.
        </p>
      )}
    </section>
  );
}
