import {
  articlePublicationOrder,
  latestPublicationDate,
} from "../data/quickNews";
import { DisplayFilters } from "./v9/preferences";
import { PublicGoogleLink } from "./PublicGoogleLink";
import { EventCard } from "./EventCard";
import { editionDateTime, summaryPreview } from "./eventPresentation";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  FileText,
  Search,
  Star,
  MessageCircle,
} from "lucide-react";
import {
  indexArticles,
  matchesArticle,
  type IndexedArticle,
} from "../data/articles";
import { dateLabel, type Edition, type ReadingState } from "../data/model";
import { validateSourceUrl } from "./sourceUrl";
import { db } from "../data/db";
import { articleReadingQuestion, GOOGLE_AI_ENTRY } from "./googleAi";
import { GoogleAiDialog } from "./GoogleAiDialog";
import { useDialogFocus } from "./dialogFocus";
import { PromptAccess } from "./unified/PromptAccess";

const PAGE_SIZE = 30;
export function ArticlesView({
  active,
  target,
  editions,
  states,
  onOpen,
  onImport,
  onReading,
}: {
  active: boolean;
  target?: { eventId: string; editionId: string; ticket: number };
  editions: Edition[];
  states: ReadingState[];
  onOpen: (id: string, articleId?: string) => void;
  onImport: () => void;
  onReading: (
    editionId: string,
    articleId: string,
    patch: { favorite?: boolean; read?: boolean },
  ) => void;
}) {
  const items = useMemo(() => indexArticles(editions), [editions]);
  const latestArticles = useMemo(() => {
    const dates = new Map(
      items.map((item) => [item.key, articlePublicationOrder(item)]),
    );
    const latest = latestPublicationDate(dates.values());
    return new Set(
      items
        .filter((item) => latest && dates.get(item.key) === latest)
        .map((item) => item.key),
    );
  }, [items]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [group, setGroup] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("date");
  const [watch, setWatch] = useState("");
  const [proof, setProof] = useState("");
  const [importance, setImportance] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [layout, setLayout] = useState("themes");
  const appliedTarget = useRef(0);
  useLayoutEffect(() => {
    if (!active || !target || appliedTarget.current === target.ticket) return;
    const item =
      items.find(
        (i) =>
          (i.article.eventId || i.article.id) === target.eventId &&
          i.edition.id === target.editionId,
      ) ||
      items.find((i) => (i.article.eventId || i.article.id) === target.eventId);
    if (item) {
      appliedTarget.current = target.ticket;
      setQuery("");
      setCategory("");
      setGroup("");
      setStatus("");
      setWatch("");
      setProof("");
      setImportance("");
      setFrom("");
      setTo("");
      setPage(0);
      setSelected(item.key);
      requestAnimationFrame(() => heading.current?.focus());
    }
  }, [active, target, items]);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [googleQuestion, setGoogleQuestion] = useState<{
    ticket: number;
    key: string;
    editionId: string;
    sha256: string;
    question: string;
  } | null>(null);
  const [loadingQuestion, setLoadingQuestion] = useState<string | null>(null);
  const [questionError, setQuestionError] = useState("");
  const questionTicket = useRef(0);
  const latestItems = useRef(items);
  useLayoutEffect(() => {
    latestItems.current = items;
  }, [items]);
  useLayoutEffect(() => {
    questionTicket.current++;
    setGoogleQuestion(null);
    setLoadingQuestion(null);
    setQuestionError("");
  }, [active, selected, query, category, group, status, sort, page]);
  function dismissQuestion() {
    questionTicket.current++;
    setGoogleQuestion(null);
    setLoadingQuestion(null);
  }
  const visibleQuestion =
    active &&
    googleQuestion &&
    items.some(
      (item) =>
        item.key === googleQuestion.key &&
        item.edition.id === googleQuestion.editionId &&
        item.edition.sha256 === googleQuestion.sha256,
    )
      ? googleQuestion
      : null;
  useDialogFocus(!!visibleQuestion, dismissQuestion);
  async function prepareQuestion(item: IndexedArticle) {
    const ticket = ++questionTicket.current;
    setLoadingQuestion(item.key);
    setQuestionError("");
    try {
      const original = await db.originals.get(item.edition.id);
      if (
        ticket !== questionTicket.current ||
        !latestItems.current.some(
          (i) =>
            i.key === item.key &&
            i.edition.id === item.edition.id &&
            i.edition.sha256 === item.edition.sha256,
        )
      )
        return;
      setGoogleQuestion({
        ticket,
        key: item.key,
        editionId: item.edition.id,
        sha256: item.edition.sha256,
        question:
          item.edition.unified?.items.find(
            (a) => a.eventId === item.article.eventId,
          )?.publicResearchQuestion ||
          (original
            ? articleReadingQuestion(original.bytes, item.article.id) || ""
            : ""),
      });
    } catch {
      if (ticket === questionTicket.current)
        setQuestionError(
          "Impossible de relire la question du journal. Réessayez après avoir vérifié le stockage.",
        );
    } finally {
      if (ticket === questionTicket.current) setLoadingQuestion(null);
    }
  }
  function questionButton(item: IndexedArticle) {
    return (
      <button
        className="text-button article-google"
        disabled={!!loadingQuestion}
        aria-label={`Question Google : ${item.article.title}`}
        onClick={() => void prepareQuestion(item)}
      >
        <MessageCircle size={15} />
        {loadingQuestion === item.key ? "Chargement…" : "Question Google"}
      </button>
    );
  }
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
    const u = item.edition.unified?.items.find(
      (i) => i.eventId === item.article.eventId,
    );
    const date = u?.eventDate || item.article.date || "";
    return (
      (!watch || item.article.sourceWatch === watch) &&
      (!proof || u?.evidenceStatus === proof) &&
      (!importance || u?.importance === importance) &&
      (!from || date >= from) &&
      (!to || (!!date && date <= to)) &&
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
  else if (sort === "importance") {
    const weight = (i: IndexedArticle) =>
      ({ major: 0, important: 1, context: 2 })[
        i.edition.unified?.items.find((a) => a.eventId === i.article.eventId)
          ?.importance || "context"
      ];
    filtered.sort((a, b) => weight(a) - weight(b));
  } else if (sort === "published")
    filtered.sort((a, b) =>
      (
        b.edition.unified?.items.find((i) => i.eventId === b.article.eventId)
          ?.publishedAt || ""
      ).localeCompare(
        a.edition.unified?.items.find((i) => i.eventId === a.article.eventId)
          ?.publishedAt || "",
      ),
    );
  else if (sort === "oldest") filtered.reverse();
  if (layout === "themes" && sort === "date")
    filtered.sort(
      (a, b) =>
        Number(latestArticles.has(b.key)) - Number(latestArticles.has(a.key)) ||
        a.article.category.localeCompare(b.article.category, "fr") ||
        (b.edition.date || "").localeCompare(a.edition.date || ""),
    );
  if (layout === "calendar")
    filtered.sort((a, b) =>
      (
        b.edition.unified?.items.find((i) => i.eventId === b.article.eventId)
          ?.eventDate ||
        b.article.date ||
        ""
      ).localeCompare(
        a.edition.unified?.items.find((i) => i.eventId === a.article.eventId)
          ?.eventDate ||
          a.article.date ||
          "",
      ),
    );
  if (layout === "timeline")
    filtered.sort((a, b) =>
      (
        b.edition.unified?.items.find((i) => i.eventId === b.article.eventId)
          ?.publishedAt ||
        b.edition.date ||
        ""
      ).localeCompare(
        a.edition.unified?.items.find((i) => i.eventId === a.article.eventId)
          ?.publishedAt ||
          a.edition.date ||
          a.edition.date ||
          "",
      ),
    );
  const current = filtered.find((i) => i.key === selected);
  const currentItem = current?.edition.unified?.items.find(
    (i) => i.eventId === current.article.eventId,
  );
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
      <div inert={!!visibleQuestion}>
        <div className="section-title articles-heading">
          <div>
            <p className="eyebrow">TOUTES VOS VEILLES, ARTICLE PAR ARTICLE</p>
            <h1 ref={listHeading} tabIndex={-1}>
              Articles
            </h1>
            <p className="muted">
              Retrouvez et lisez les articles de vos journaux importés, y
              compris les archives.
            </p>
          </div>
          <span className="articles-total">
            {items.length} article{items.length !== 1 ? "s" : ""} ·{" "}
            {groups.length} veille{groups.length !== 1 ? "s" : ""}
          </span>
        </div>
        {items.length > 0 ? (
          <>
            <div className="articles-tools">
              <label className="articles-search">
                Rechercher un article
                <span className="search-field">
                  <Search size={18} />
                  <input
                    type="search"
                    placeholder="Un sujet, un mot, une source…"
                    value={query}
                    onChange={(e) =>
                      changeFilter(() => setQuery(e.target.value))
                    }
                  />
                </span>
              </label>
              <DisplayFilters>
                <details className="articles-filter-options">
                  <summary>
                    Filtres et tri
                    {category || group || status ? " · actifs" : ""}
                  </summary>
                  <div className="articles-filters">
                    <label>
                      Rubrique
                      <select
                        aria-label="Rubrique"
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
                        onChange={(e) =>
                          changeFilter(() => setGroup(e.target.value))
                        }
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
                        onChange={(e) =>
                          changeFilter(() => setStatus(e.target.value))
                        }
                      >
                        <option value="">Tous les articles</option>
                        <option value="unread">Non lus</option>
                        <option value="read">Lus</option>
                        <option value="favorite">Favoris</option>
                      </select>
                    </label>
                    <label>
                      Univers
                      <select
                        aria-label="Univers"
                        value={watch}
                        onChange={(e) =>
                          changeFilter(() => setWatch(e.target.value))
                        }
                      >
                        <option value="">Tous les univers</option>
                        <option value="journal360">Journal 360°</option>
                        <option value="ai-major">IA majeures</option>
                        <option value="sentinel">SENTINEL & AXDIA</option>
                        <option value="future">Le Futur</option>
                      </select>
                    </label>
                    <label>
                      Preuve
                      <select
                        aria-label="Preuve"
                        value={proof}
                        onChange={(e) =>
                          changeFilter(() => setProof(e.target.value))
                        }
                      >
                        <option value="">Tous les statuts</option>
                        <option value="sourced">Sourcé (déclaré)</option>
                        <option value="unverified">Non vérifié</option>
                        <option value="hypothesis">Hypothèse</option>
                      </select>
                    </label>
                    <label>
                      Importance
                      <select
                        aria-label="Importance"
                        value={importance}
                        onChange={(e) =>
                          changeFilter(() => setImportance(e.target.value))
                        }
                      >
                        <option value="">Toutes les importances</option>
                        <option value="major">Majeur</option>
                        <option value="important">Important</option>
                        <option value="context">Contexte</option>
                      </select>
                    </label>
                    <label>
                      Faits depuis le
                      <input
                        type="date"
                        value={from}
                        onChange={(e) =>
                          changeFilter(() => setFrom(e.target.value))
                        }
                      />
                    </label>
                    <label>
                      Faits jusqu’au
                      <input
                        type="date"
                        value={to}
                        onChange={(e) =>
                          changeFilter(() => setTo(e.target.value))
                        }
                      />
                    </label>
                    <label>
                      Présentation
                      <select
                        aria-label="Présentation"
                        value={layout}
                        onChange={(e) =>
                          changeFilter(() => setLayout(e.target.value))
                        }
                      >
                        <option value="themes">Thèmes</option>
                        <option value="calendar">Calendrier des faits</option>
                        <option value="timeline">
                          Chronologie des publications
                        </option>
                      </select>
                    </label>
                    <label>
                      Trier les articles
                      <select
                        aria-label="Trier les articles"
                        value={sort}
                        onChange={(e) =>
                          changeFilter(() => setSort(e.target.value))
                        }
                      >
                        <option value="date">Veilles les plus récentes</option>
                        <option value="oldest">
                          Veilles les plus anciennes
                        </option>
                        <option value="title">Titre de A à Z</option>
                        <option value="importance">Importance</option>
                        <option value="published">Publication récente</option>
                      </select>
                    </label>
                  </div>
                </details>
              </DisplayFilters>
            </div>
            <div className="articles-results-bar">
              <p role="status">
                {filtered.length} article{filtered.length !== 1 ? "s" : ""}{" "}
                trouvé
                {filtered.length !== 1 ? "s" : ""}
              </p>
              {(query ||
                category ||
                group ||
                status ||
                watch ||
                proof ||
                importance ||
                from ||
                to) && (
                <button
                  className="text-button"
                  onClick={() =>
                    changeFilter(() => {
                      setQuery("");
                      setCategory("");
                      setGroup("");
                      setStatus("");
                      setWatch("");
                      setProof("");
                      setImportance("");
                      setFrom("");
                      setTo("");
                    })
                  }
                >
                  Effacer les filtres
                </button>
              )}
            </div>
            {questionError && (
              <p className="error" role="alert">
                {questionError}
              </p>
            )}
            {layout === "calendar" && !current && (
              <nav
                className="v9-calendar"
                aria-label="Calendrier des dates de faits disponibles"
              >
                <button
                  className="secondary"
                  onClick={() =>
                    changeFilter(() => {
                      setFrom("");
                      setTo("");
                    })
                  }
                >
                  Toutes les dates
                </button>
                {[
                  ...new Set(
                    items.flatMap((i) => {
                      const date =
                        i.edition.unified?.items.find(
                          (a) => a.eventId === i.article.eventId,
                        )?.eventDate || i.article.date;
                      return date ? [date] : [];
                    }),
                  ),
                ]
                  .sort()
                  .reverse()
                  .map((date) => (
                    <button
                      className="secondary"
                      key={date}
                      aria-pressed={from === date && to === date}
                      onClick={() =>
                        changeFilter(() => {
                          setFrom(date);
                          setTo(date);
                        })
                      }
                    >
                      {dateLabel(date)}
                    </button>
                  ))}
              </nav>
            )}
            <div className="articles-browser">
              <nav className="article-index" aria-label="Sommaire des articles">
                <h2>
                  Accès direct aux articles <span>{filtered.length}</span>
                </h2>
                <p>
                  Cliquez sur un titre pour ouvrir l’article dans son journal
                  HTML.
                </p>
                <ol>
                  {filtered
                    .slice(
                      visiblePage * PAGE_SIZE,
                      (visiblePage + 1) * PAGE_SIZE,
                    )
                    .map((item) => (
                      <li key={item.key}>
                        <button
                          className="article-index-link"
                          aria-label={`Ouvrir dans le journal : ${item.article.title}`}
                          onClick={() =>
                            onOpen(item.edition.id, item.article.id)
                          }
                        >
                          {item.article.title}
                        </button>
                        <small>
                          {editionDateTime(item.edition)} ·{" "}
                          {item.article.category}
                        </small>
                      </li>
                    ))}
                </ol>
              </nav>
              <div className="articles-content">
                {current ? (
                  <article
                    className={`article-detail${latestArticles.has(current.key) ? " latest-publication" : ""}`}
                    data-latest={latestArticles.has(current.key) || undefined}
                  >
                    {latestArticles.has(current.key) && (
                      <span className="latest-publication-badge">
                        Dernière publication
                      </span>
                    )}
                    <button className="text-button" onClick={back}>
                      <ArrowLeft size={17} />
                      Retour aux articles
                    </button>
                    <p className="eyebrow">
                      {current.article.category} ·{" "}
                      {editionDateTime(current.edition)}
                    </p>
                    <h2 ref={heading} tabIndex={-1}>
                      {current.article.title}
                    </h2>
                    <p className="muted">
                      Dans {current.edition.title}
                      {current.edition.archived ? " · Archive" : ""}
                    </p>
                    <PublicGoogleLink
                      question={currentItem?.publicResearchQuestion}
                    />
                    <div className="article-actions">
                      <button
                        className="secondary"
                        aria-pressed={
                          !!stateOf(current.edition.id, current.article.id)
                            ?.favorite
                        }
                        onClick={() =>
                          onReading(current.edition.id, current.article.id, {
                            favorite: !stateOf(
                              current.edition.id,
                              current.article.id,
                            )?.favorite,
                          })
                        }
                      >
                        <Star size={16} />
                        Favori
                      </button>
                      <button
                        className="secondary"
                        aria-pressed={
                          !!stateOf(current.edition.id, current.article.id)
                            ?.read
                        }
                        onClick={() =>
                          onReading(current.edition.id, current.article.id, {
                            read: !stateOf(
                              current.edition.id,
                              current.article.id,
                            )?.read,
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
                        onClick={() =>
                          onOpen(current.edition.id, current.article.id)
                        }
                      >
                        Ouvrir le journal d’origine
                        <ArrowUpRight size={17} />
                      </button>
                      {questionButton(current)}
                    </div>
                    {current.edition.unified?.promptAssets.some(
                      (p) => p.eventId === current.article.eventId,
                    ) && (
                      <PromptAccess
                        key={current.key}
                        edition={current.edition}
                        eventId={current.article.eventId}
                      />
                    )}
                    <div className="article-body">
                      {currentItem ? (
                        <>
                          <h3>Résumé</h3>
                          <p>{currentItem.summary || "Non fourni"}</p>
                          {currentItem.plain &&
                            currentItem.plain !== currentItem.summary && (
                              <>
                                <h3>En clair</h3>
                                <p>{currentItem.plain}</p>
                              </>
                            )}
                          <h3>Analyse</h3>
                          <p>{currentItem.detail || "Non fournie"}</p>
                          <h3>Limites et objections documentées</h3>
                          <p>{currentItem.unknowns || "Non fournies"}</p>
                          <p>{currentItem.importanceReason}</p>
                          {currentItem.actions.map((a, n) => (
                            <p key={n}>
                              {a.title} · {a.reason} · Risque : {a.risk}
                            </p>
                          ))}
                          {currentItem.corrections.map((c, n) => (
                            <p key={n} className="warning">
                              Correction : {c.at} · {c.reason} ·{" "}
                              {c.sourceIds.join(", ")}
                            </p>
                          ))}
                        </>
                      ) : current.article.text ? (
                        current.article.text
                          .split(/\n+|(?<=\.)\s+(?=\*\*[^*]+\*\*)/)
                          .map((paragraph, index) => (
                            <p key={index}>
                              {paragraph
                                .split(/(\*\*[^*]+\*\*)/)
                                .map((part, partIndex) =>
                                  part.startsWith("**") &&
                                  part.endsWith("**") ? (
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
                    <p className="small-note">
                      Vue{" "}
                      {layout === "themes"
                        ? "par thèmes"
                        : layout === "calendar"
                          ? "calendrier des faits, dates décroissantes"
                          : "chronologie des publications, dates décroissantes"}
                      . Les dates inconnues ne sont pas déduites de l’import.
                    </p>
                    <div className="articles-grid" data-layout={layout}>
                      {filtered
                        .slice(
                          visiblePage * PAGE_SIZE,
                          (visiblePage + 1) * PAGE_SIZE,
                        )
                        .map((item) =>
                          item.edition.unified ? (
                            <div key={item.key}>
                              <EventCard
                                className="article-card"
                                latest={latestArticles.has(item.key)}
                                item={item.edition.unified.items.find(
                                  (i) => i.eventId === item.article.eventId,
                                )!}
                                edition={item.edition}
                                onRead={() => open(item.key)}
                                onOriginal={() =>
                                  onOpen(item.edition.id, item.article.id)
                                }
                              />
                              <details className="article-secondary-actions">
                                <summary>Autres lectures et question</summary>
                                <button
                                  className="text-button"
                                  aria-label={`Lire ici : ${item.article.title}`}
                                  onClick={() => open(item.key)}
                                >
                                  Lire ici
                                </button>
                                {questionButton(item)}
                                <button
                                  className="text-button"
                                  onClick={() =>
                                    onOpen(item.edition.id, item.article.id)
                                  }
                                >
                                  Lire dans le journal
                                </button>
                              </details>
                            </div>
                          ) : (
                            <article
                              key={item.key}
                              className={`article-card${latestArticles.has(item.key) ? " latest-publication" : ""}`}
                              data-latest={
                                latestArticles.has(item.key) || undefined
                              }
                            >
                              {latestArticles.has(item.key) && (
                                <span className="latest-publication-badge">
                                  Dernière publication
                                </span>
                              )}
                              <p className="eyebrow">{item.article.category}</p>
                              <h2>
                                <button
                                  className="title-button"
                                  onClick={() =>
                                    onOpen(item.edition.id, item.article.id)
                                  }
                                >
                                  {item.article.title}
                                </button>
                              </h2>
                              <p className="article-excerpt">
                                {summaryPreview(item.article.text)}
                              </p>
                              <div className="article-card-origin">
                                <span>
                                  {editionDateTime(item.edition)}
                                  {item.edition.archived ? " · Archive" : ""}
                                </span>
                                <span>{item.edition.title}</span>
                              </div>
                              <PublicGoogleLink />
                              <div className="article-card-footer">
                                <button
                                  className="text-button"
                                  onClick={() =>
                                    onOpen(item.edition.id, item.article.id)
                                  }
                                >
                                  Lire dans le journal
                                  <ArrowRight size={16} />
                                </button>
                                <button
                                  className="text-button"
                                  aria-label={`Lire ici : ${item.article.title}`}
                                  onClick={() => open(item.key)}
                                >
                                  Lire ici
                                </button>
                                {questionButton(item)}
                                <span>
                                  {stateOf(item.edition.id, item.article.id)
                                    ?.favorite && (
                                    <Star size={15} aria-label="Favori" />
                                  )}
                                  {stateOf(item.edition.id, item.article.id)
                                    ?.read && (
                                    <Check size={15} aria-label="Lu" />
                                  )}
                                </span>
                              </div>
                            </article>
                          ),
                        )}
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
              </div>
            </div>
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
      </div>
      {visibleQuestion && (
        <GoogleAiDialog
          key={visibleQuestion.ticket}
          destination={{
            url: GOOGLE_AI_ENTRY,
            query: visibleQuestion.question,
            entryOnly: true,
          }}
          isCurrent={() =>
            questionTicket.current === visibleQuestion.ticket &&
            latestItems.current.some(
              (item) =>
                item.key === visibleQuestion.key &&
                item.edition.id === visibleQuestion.editionId &&
                item.edition.sha256 === visibleQuestion.sha256,
            )
          }
          onDismiss={dismissQuestion}
        />
      )}
    </section>
  );
}
