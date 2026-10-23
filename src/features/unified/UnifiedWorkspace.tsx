import { latestPublicationDate } from "../../data/quickNews";
import { DisplayFilters, useDisplay } from "../v9/preferences";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { EventCard } from "../EventCard";
import { useInterface } from "../interfacePreferences";
import type { Edition } from "../../data/model";
import { dateLabel } from "../../data/model";
import { indexArticles, normalizeArticleSearch } from "../../data/articles";
import { V7_SLOTS } from "../../data/editorial";
import { latestCurrent } from "./selectors";
import { EconomyRadar } from "./EconomyRadar";
import { FutureBridge, useFutureCatalog } from "./FutureBridge";
import { PromptLibrary, UnifiedSearch } from "./UnifiedSearch";
import "./unified.css";
type Destination =
  | "quick"
  | "articles"
  | "future"
  | "sentinel"
  | "ai-major"
  | "library"
  | "search"
  | "settings";
export default function UnifiedWorkspace({
  editions,
  onOpen,
  onNavigate,
  onImport,
  onFuture,
  onReady,
  onArticle,
  initialPanel = "overview",
  onDemo,
}: {
  editions: Edition[];
  onOpen: (id: string, article?: string) => void;
  onDay: (key: string) => void;
  onNavigate: (to: Destination) => void;
  onImport: () => void;
  onFuture: (id?: string) => void;
  onReady?: () => void;
  onArticle?: (eventId: string, editionId: string) => void;
  initialPanel?: string;
  onDemo?: () => void;
}) {
  useEffect(() => onReady?.(), [onReady]);
  const [panel, setPanel] = useState(initialPanel),
    [firstSeen, setFirstSeen] = useState(""),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState(""),
    [eventSort, setEventSort] = useState("importance"),
    [eventLimit, setEventLimit] = useState(30);
  useEffect(() => setPanel(initialPanel), [initialPanel]);
  const {
    preferences: { options },
  } = useInterface();
  const heading = useRef<HTMLHeadingElement>(null),
    previousPanel = useRef(panel),
    futureCatalog = useFutureCatalog();
  useLayoutEffect(() => {
    if (previousPanel.current !== panel) {
      previousPanel.current = panel;
      heading.current?.focus();
    }
  }, [panel]);
  const { display } = useDisplay();
  const current = latestCurrent(editions),
    p = current?.unified;
  const latestPublishedAt = latestPublicationDate(
    (p?.items || []).map((i) => new Date(i.publishedAt).toISOString()),
  );
  const items = useMemo(
    () => indexArticles(editions.filter((e) => !e.deleted && !e.archived)),
    [editions],
  );
  const go = useCallback((v: string) => {
    setPanel(v);
    setEventLimit(30);
  }, []);
  const openPrompts = useCallback(() => go("prompts"), [go]);
  const importance = { major: 0, important: 1, context: 2 };
  const highlights = (p?.items || [])
    .filter(
      (i) =>
        (!firstSeen || i.firstSeenSlot === firstSeen) &&
        (!category || i.category === category) &&
        normalizeArticleSearch(
          [
            i.title,
            i.summary,
            i.plain,
            i.detail,
            ...i.sourceRecords.map((s) => s.publisher),
          ].join(" "),
        ).includes(normalizeArticleSearch(query)) &&
        (panel !== "ai" || i.sourceWatch === "ai-major") &&
        (panel !== "sentinel" || i.sourceWatch === "sentinel"),
    )
    .sort((a, b) =>
      eventSort === "newest"
        ? b.lastChangedAt.localeCompare(a.lastChangedAt)
        : Number(display.favorites.includes(b.category)) -
            Number(display.favorites.includes(a.category)) ||
          importance[a.importance] - importance[b.importance],
    );
  return (
    <div
      className={`unified-workspace${options.help ? "" : " interface-essential"}`}
    >
      <header className="unified-masthead">
        <div>
          <p className="eyebrow">VOTRE VEILLE QUOTIDIENNE</p>
          <h1 ref={heading} tabIndex={-1}>
            Aujourd’hui
          </h1>
          <p>
            {current
              ? dateLabel(current.date)
              : "Importez votre première édition"}
          </p>
        </div>
        {p?.synthetic && (
          <span className="unified-badge">EXEMPLE SYNTHÉTIQUE</span>
        )}
      </header>
      {!current && (
        <section className="empty-library">
          <h2>Votre première édition vous attend.</h2>
          <p>
            Importez un fichier HTML ou explorez deux démonstrations
            synthétiques.
          </p>
          <button className="secondary" onClick={onDemo}>
            Essayer avec 2 éditions démo
          </button>
        </section>
      )}
      <div className="v9-read-latest">
        <button
          className="primary"
          onClick={() => (current ? onOpen(current.id) : onImport())}
        >
          {current ? "Lire la dernière édition" : "Importer une édition"}
        </button>
      </div>
      <nav className="unified-controls" aria-label="Explorer le journal unifié">
        {[
          ["overview", "À la une"],
          ["economy", "Économie"],
          ["ai", "IA majeures"],
          ["timeline", "Chronologie IA"],
          ["sentinel", "SENTINEL & AXDIA"],
          ["future", "Le Futur"],
          ["quick", "Actualité rapide"],
        ].map(([id, label]) => (
          <button
            className="secondary"
            aria-pressed={panel === id}
            key={id}
            onClick={() => (id === "quick" ? onNavigate("quick") : go(id))}
          >
            {label}
          </button>
        ))}
      </nav>
      <details className="v9-reading-tools">
        <summary>Prompts et recherche</summary>
        <div className="unified-controls">
          <button className="secondary" onClick={openPrompts}>
            Mes prompts .md
          </button>
          <button className="secondary" onClick={() => go("explore")}>
            Recherche globale
          </button>
        </div>
      </details>
      {panel === "economy" ? (
        <EconomyRadar editions={editions} />
      ) : panel === "timeline" || panel === "future" ? (
        <FutureBridge
          editions={editions}
          onFuture={onFuture}
          catalog={futureCatalog}
          onOpen={onOpen}
        />
      ) : panel === "prompts" ? (
        <PromptLibrary editions={editions} />
      ) : panel === "explore" ? (
        <UnifiedSearch
          editions={editions}
          onOpen={onOpen}
          onFuture={onFuture}
          onPrompts={openPrompts}
        />
      ) : (
        <section>
          <div className="section-title">
            <h2>Aujourd’hui en bref</h2>
            <button
              className="text-button"
              onClick={() => onNavigate("articles")}
            >
              Tous les articles ({items.length}) →
            </button>
          </div>
          <div className="unified-filters">
            <label>
              Rechercher dans les articles du jour
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setEventLimit(30);
                }}
              />
            </label>
            <DisplayFilters>
              <label>
                Thème du jour
                <select
                  aria-label="Thème du jour"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setEventLimit(30);
                  }}
                >
                  <option value="">Tous les thèmes</option>
                  {[...new Set(p?.items.map((i) => i.category))]
                    .sort()
                    .map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                </select>
              </label>
              <details>
                <summary>Affiner et trier</summary>
                <label>
                  Première apparition
                  <select
                    aria-label="Première apparition"
                    value={firstSeen}
                    onChange={(e) => {
                      setFirstSeen(e.target.value);
                      setEventLimit(30);
                    }}
                  >
                    <option value="">Tous les événements</option>
                    {V7_SLOTS.map((s) => (
                      <option key={s} value={s}>
                        Apparus à {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Trier les événements
                  <select
                    aria-label="Trier les événements"
                    value={eventSort}
                    onChange={(e) => setEventSort(e.target.value)}
                  >
                    <option value="importance">Importance</option>
                    <option value="newest">Mise à jour la plus récente</option>
                  </select>
                </label>
              </details>
            </DisplayFilters>
          </div>
          <p role="status">{highlights.length} article(s)</p>
          <div className="unified-highlights event-list">
            {highlights.slice(0, eventLimit).map((i) => (
              <EventCard
                key={current!.id + i.eventId}
                item={i}
                latest={
                  new Date(i.publishedAt).toISOString() === latestPublishedAt
                }
                edition={current!}
                onOriginal={() => onOpen(current!.id, i.id)}
                onRead={
                  onArticle
                    ? () => onArticle(i.eventId, current!.id)
                    : undefined
                }
              />
            ))}
            {!highlights.length && (
              <p>
                {p
                  ? "Aucun article pour ces filtres."
                  : "Aucun article unifié. Les éditions historiques restent dans Articles et Bibliothèque."}
              </p>
            )}
          </div>
          {highlights.length > eventLimit && (
            <button
              className="secondary"
              onClick={() => setEventLimit((n) => n + 30)}
            >
              Afficher plus d’articles ({highlights.length - eventLimit})
            </button>
          )}
          {options.economy && display.todayEconomy && panel === "overview" && (
            <EconomyRadar editions={editions} compact />
          )}
        </section>
      )}
      {options.kpis && (
        <section>
          <h2>Les quatre univers</h2>
          <div className="unified-universes">
            {[
              ["journal360", "Journal 360°", "articles"],
              ["ai-major", "IA majeure", "ai-major"],
              ["sentinel", "SENTINEL", "sentinel"],
              ["future", "Le Futur", "future"],
            ].map(([id, label, to]) => (
              <article className="unified-panel" key={id}>
                <h3>{label}</h3>
                <p>
                  {items.filter((i) => i.article.sourceWatch === id).length}{" "}
                  articles
                  {id === "future"
                    ? ` · ${futureCatalog.value?.length || 0} dossier(s) prospectif(s)`
                    : ""}
                </p>
                <button
                  className="secondary"
                  onClick={() =>
                    id === "future"
                      ? go("timeline")
                      : onNavigate(to as Destination)
                  }
                >
                  Explorer {label}
                </button>
              </article>
            ))}
          </div>
        </section>
      )}
      <div className="unified-controls">
        <button className="text-button" onClick={() => onNavigate("library")}>
          Bibliothèque et anciennes éditions
        </button>
        <button className="text-button" onClick={() => onNavigate("future")}>
          Atlas Le Futur
        </button>
      </div>
    </div>
  );
}
