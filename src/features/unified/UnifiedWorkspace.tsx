import { EditionFreshness, instantCompare } from "../editorialPresentation";
import { belongsToLatestEdition } from "../../data/editionHighlights";
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
import { dayKeyOf } from "../../data/day";
import { indexArticles, normalizeArticleSearch } from "../../data/articles";
import { V7_SLOTS } from "../../data/editorial";
import { journalDays, latestCurrent } from "./selectors";
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
    [selectedDay, setSelectedDay] = useState(""),
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
  const days = useMemo(() => journalDays(editions), [editions]);
  const latest = latestCurrent(editions),
    current = days.find((e) => dayKeyOf(e) === selectedDay) || latest,
    p = current?.unified;
  const dayIndex = days.findIndex((e) => e.id === current?.id);
  const historical = !!current && current.id !== latest?.id;
  const viewEditions = historical
    ? editions.filter(
        (e) =>
          !e.deleted &&
          !e.archived &&
          !e.collection &&
          dayKeyOf(e) === dayKeyOf(current),
      )
    : editions;
  function selectDay(key: string) {
    setSelectedDay(key);
    setFirstSeen("");
    setCategory("");
    setQuery("");
    setEventLimit(30);
  }

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
    .sort(
      (a, b) =>
        Number(belongsToLatestEdition(current!, latest, b)) -
          Number(belongsToLatestEdition(current!, latest, a)) ||
        (eventSort === "newest"
          ? instantCompare(b.lastChangedAt, a.lastChangedAt)
          : Number(display.favorites.includes(b.category)) -
              Number(display.favorites.includes(a.category)) ||
            importance[a.importance] - importance[b.importance]),
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
          <p role="status">
            {current
              ? dateLabel(current.date)
              : "Importez votre première édition"}
          </p>
        </div>
        {p?.synthetic && (
          <span className="unified-badge">EXEMPLE SYNTHÉTIQUE</span>
        )}
      </header>
      {days.length > 0 && (
        <nav
          className="journal-day-navigation"
          aria-label="Choisir le jour du journal"
        >
          <button
            className="secondary"
            disabled={dayIndex < 0 || dayIndex >= days.length - 1}
            onClick={() => selectDay(dayKeyOf(days[dayIndex + 1])!)}
          >
            ← Jour précédent
          </button>
          <label>
            Jour consulté
            <select
              aria-label="Jour consulté"
              value={current ? dayKeyOf(current) || "" : ""}
              onChange={(e) => selectDay(e.target.value)}
            >
              {dayIndex < 0 && <option value="">Date inconnue</option>}
              {days.map((e) => (
                <option key={dayKeyOf(e)} value={dayKeyOf(e)}>
                  {dateLabel(e.date)}
                </option>
              ))}
            </select>
          </label>
          <button
            className="secondary"
            disabled={dayIndex <= 0}
            onClick={() => selectDay(dayKeyOf(days[dayIndex - 1])!)}
          >
            Jour suivant →
          </button>
          {historical && (
            <button className="text-button" onClick={() => selectDay("")}>
              Revenir à la dernière édition
            </button>
          )}
        </nav>
      )}
      {!historical && <EditionFreshness edition={current} />}
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
          {current
            ? historical
              ? "Lire cette édition"
              : "Lire la dernière édition"
            : "Importer une édition"}
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
        <EconomyRadar key={current?.id} editions={viewEditions} />
      ) : panel === "timeline" || panel === "future" ? (
        <FutureBridge
          editions={viewEditions}
          onFuture={onFuture}
          catalog={futureCatalog}
          onOpen={onOpen}
        />
      ) : panel === "prompts" ? (
        <PromptLibrary key={current?.id} editions={viewEditions} />
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
            <h2>{historical ? "Le journal en bref" : "Aujourd’hui en bref"}</h2>
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
                latest={belongsToLatestEdition(current!, latest, i)}
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
            <EconomyRadar key={current?.id} editions={viewEditions} compact />
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
