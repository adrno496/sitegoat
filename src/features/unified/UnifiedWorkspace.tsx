import { EventCard } from "../EventCard";
import { useInterface } from "../interfacePreferences";
import { SnapshotStatus } from "../SnapshotStatus";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Edition } from "../../data/model";
import { dateLabel } from "../../data/model";
import { indexArticles } from "../../data/articles";
import { resolveDay, dayKeyOf } from "../../data/day";
import { parisClock, V7_SLOTS, scheduleFor } from "../../data/editorial";
import { latestCurrent } from "./selectors";
import { EconomyRadar } from "./EconomyRadar";
import { FutureBridge, useFutureCatalog } from "./FutureBridge";
import { PromptLibrary, UnifiedSearch } from "./UnifiedSearch";
import "./unified.css";
type Destination =
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
  onDay,
  onNavigate,
  onImport,
  onFuture,
  onReady,
}: {
  onReady?: () => void;
  editions: Edition[];
  onOpen: (id: string, article?: string) => void;
  onDay: (key: string) => void;
  onNavigate: (to: Destination) => void;
  onImport: () => void;
  onFuture: (id?: string) => void;
}) {
  useEffect(() => onReady?.(), [onReady]);
  const [panel, setPanel] = useState("overview");
  const [firstSeen, setFirstSeen] = useState("");
  const [eventSort, setEventSort] = useState("importance");
  const [eventLimit, setEventLimit] = useState(30);
  const {
    preferences: { options },
  } = useInterface();
  const heading = useRef<HTMLHeadingElement>(null);
  const futureCatalog = useFutureCatalog();
  const previousPanel = useRef(panel);
  useLayoutEffect(() => {
    if (previousPanel.current !== panel) {
      previousPanel.current = panel;
      heading.current?.focus();
    }
  }, [panel]);
  const live = editions.filter((e) => !e.deleted && !e.archived),
    current = latestCurrent(live),
    latest = current?.unified ? current : undefined,
    p = latest?.unified,
    clock = parisClock();
  const versions = current
      ? live.filter(
          (e) =>
            !e.collection &&
            (dayKeyOf(current)
              ? dayKeyOf(e) === dayKeyOf(current)
              : e.id === current.id),
        )
      : [],
    day = resolveDay(versions);
  const assessment = day.versions.find(
    (v) => v.edition.id === current?.id,
  )?.assessment;
  const slots = current ? scheduleFor(current) : V7_SLOTS;
  const items = useMemo(
    () => indexArticles(editions.filter((e) => !e.deleted && !e.archived)),
    [editions],
  );
  const go = useCallback((value: string) => {
    setPanel(value);
  }, []);
  const openPrompts = useCallback(() => go("prompts"), [go]);
  const importance = { major: 0, important: 1, context: 2 };
  const highlights = [...(p?.items || [])]
    .filter((i) => !firstSeen || i.firstSeenSlot === firstSeen)
    .sort((a, b) =>
      eventSort === "newest"
        ? b.firstSeenSlot.localeCompare(a.firstSeenSlot) ||
          b.lastChangedAt.localeCompare(a.lastChangedAt)
        : importance[a.importance] - importance[b.importance],
    );
  return (
    <div
      className={`unified-workspace${options.help ? "" : " interface-essential"}`}
    >
      <header className="unified-masthead">
        <div>
          <p className="eyebrow">QUATRE UNIVERS · UNE JOURNÉE</p>
          <h1 ref={heading} tabIndex={-1}>
            Journal 360° <em>Unifié.</em>
          </h1>
          <p>{dateLabel(clock.date)} · Europe/Paris</p>
        </div>
        <span className="unified-badge">
          {p?.synthetic
            ? "EXEMPLE SYNTHÉTIQUE"
            : current
              ? "ÉDITIONS LOCALES"
              : "EN ATTENTE D’IMPORT"}
        </span>
      </header>
      <nav className="unified-controls" aria-label="Explorer le journal unifié">
        {[
          ["overview", "Aujourd’hui en bref"],
          ["economy", "Économie"],
          ["timeline", "Chronologie IA"],
          ["prompts", "Mes prompts .md"],
          ["explore", "Recherche globale"],
        ].map(([id, label]) => (
          <button
            className="secondary"
            aria-pressed={panel === id}
            key={id}
            onClick={() => go(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      {panel === "economy" ? (
        <EconomyRadar editions={editions} />
      ) : panel === "timeline" ? (
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
        <>
          <section className="unified-lead">
            <div>
              <p className="eyebrow">DERNIÈRE ÉDITION EFFECTIVEMENT REÇUE</p>
              <h2>
                {current
                  ? `${dateLabel(current.date)} · ${current.editionSlot || current.slotsIncluded?.at(-1) || "heure inconnue"}`
                  : "Votre journée commence ici."}
              </h2>
              <p>
                Vérification déclarée :{" "}
                {current?.sourceVerifiedAt || "non renseignée"}
                {!assessment?.snapshot && ` · Cumul ${day.status}`}
              </p>
              {assessment?.snapshot && (
                <>
                  <p>
                    {p?.items.length} événements · Intégrité{" "}
                    {assessment.snapshot.integrity} · Autonomie{" "}
                    {assessment.snapshot.autonomy} · Couverture{" "}
                    {assessment.snapshot.coverage}
                  </p>
                  {assessment.issues.map((issue, index) => (
                    <p className="warning" key={index}>
                      {issue}
                    </p>
                  ))}
                  <details open={options.technical || undefined}>
                    <summary>
                      Diagnostics documentaires et historique d’import
                    </summary>
                    <SnapshotStatus
                      assessment={assessment}
                      showIssues={false}
                    />
                  </details>
                </>
              )}
              {current && current.date !== clock.date && (
                <p className="warning">
                  Aucune édition du {clock.date} reçue. Vous consultez la
                  dernière journée disponible.
                </p>
              )}
              <p className="interface-help">
                Le fichier expose ce que son producteur a déclaré. Aucun accès
                aux sources ni collecte automatique n’est simulé.
              </p>
            </div>
            <button
              className="primary"
              onClick={() =>
                current ? onOpen(day.current?.id || current.id) : onImport()
              }
            >
              {current ? "Lire la dernière édition" : "Importer une édition"}
            </button>
          </section>
          <div
            className="unified-slots"
            role="group"
            aria-label="Éditions et créneaux de la journée"
          >
            {slots.map((slot) => {
              const received = versions.filter(
                (e) =>
                  e.editionSlot === slot ||
                  (!e.unified && e.slotsIncluded?.at(-1) === slot),
              );
              const receivedVersion = resolveDay(received).current;
              const pending =
                (current?.date || clock.date) === clock.date &&
                slot > clock.time;
              const label = receivedVersion
                ? "Disponible"
                : pending
                  ? "À venir"
                  : p
                    ? "Non importé (facultatif)"
                    : "Non reçue";
              return (
                <button
                  key={slot}
                  className="secondary"
                  disabled={!receivedVersion}
                  aria-label={`${slot} · ${label} · ${current?.date || clock.date} Europe/Paris · ${receivedVersion?.unified?.items.length ?? receivedVersion?.articles.length ?? 0} événements`}
                  aria-current={
                    !!receivedVersion && receivedVersion.id === current?.id
                      ? "true"
                      : undefined
                  }
                  onClick={() => receivedVersion && onOpen(receivedVersion.id)}
                >
                  <b>{slot}</b>
                  <span>
                    {label}
                    {!!receivedVersion && receivedVersion.id === current?.id
                      ? " · Courante"
                      : ""}
                    {receivedVersion && (
                      <span>
                        {receivedVersion.unified?.items.length ??
                          receivedVersion.articles.length}{" "}
                        événements · {receivedVersion.date} · Europe/Paris
                      </span>
                    )}
                    {p && (
                      <span>
                        {p.slotsIncluded.some((s) => s === slot)
                          ? "Passage couvert selon le fichier"
                          : "Couverture non déclarée"}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          {current && !current.unified && (
            <p className="small-note">
              Archive historique : son plan 08/16/21 est conservé. Le programme
              V7 comprend huit rendez-vous de 08 à 22 h.
            </p>
          )}
          <section className="unified-digest interface-help">
            <p className="eyebrow">COMPRENDRE AVANT D’EXPLORER</p>
            <h2>Le monde en 60 secondes</h2>
            {p?.synthesis.text ? (
              <>
                <p>{p.synthesis.text}</p>
                <p className="small-note">
                  {p.synthesis.kind === "commentary"
                    ? "Commentaire éditorial"
                    : "Synthèse déclarée avec références"}
                  {p.synthetic ? " · SYNTHÉTIQUE" : ""}
                </p>
                <div className="unified-controls">
                  {p.synthesis.eventIds.slice(0, 8).map((id) => {
                    const i = p.items.find((i) => i.eventId === id)!;
                    return (
                      <button
                        className="text-button"
                        key={id}
                        onClick={() => onOpen(latest!.id, i.id)}
                      >
                        {i.title} ↗
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <p>
                Aucune synthèse sourcée importée. Retrouvez les articles et
                originaux ci-dessous ; l’application n’invente pas une synthèse
                d’actualité.
              </p>
            )}
          </section>
          <section>
            <div className="section-title">
              <h2>Les faits à retenir</h2>
              <button
                className="text-button"
                onClick={() => onNavigate("articles")}
              >
                Tous les articles ({items.length}) →
              </button>
            </div>
            {p && (
              <>
                <p>
                  Édition ouverte : {p.editionSlot} · {p.editionDate} ·
                  Europe/Paris. Les horaires ci-dessus ouvrent uniquement un
                  fichier reçu. Le filtre ci-dessous sélectionne les événements
                  de cette édition selon leur première apparition.
                </p>
                <div className="unified-filters">
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
                      {V7_SLOTS.map((slot) => (
                        <option value={slot} key={slot}>
                          Apparus à {slot}
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
                      <option value="newest">
                        Première apparition la plus récente
                      </option>
                    </select>
                  </label>
                </div>
                <p role="status">
                  {highlights.length} événement(s) affichable(s) sur{" "}
                  {p.items.length} dans l’édition {p.editionSlot}. Première
                  apparition ≠ nouveauté factuelle certifiée.
                </p>
              </>
            )}
            <div className="unified-highlights event-list">
              {highlights.slice(0, eventLimit).map((i) => (
                <EventCard
                  key={latest!.id + i.eventId}
                  item={i}
                  edition={latest!}
                  onOriginal={() => onOpen(latest!.id, i.id)}
                />
              ))}
              {!highlights.length && (
                <p>
                  {p
                    ? "Aucun événement pour ce filtre."
                    : "Aucun événement au format unifié. Tous les articles historiques restent accessibles."}
                </p>
              )}
            </div>
            {highlights.length > eventLimit && (
              <button
                className="secondary"
                onClick={() => setEventLimit((n) => n + 30)}
              >
                Afficher plus d’événements ({highlights.length - eventLimit})
              </button>
            )}
          </section>
          {options.kpis && (
            <section>
              <h2>Les quatre univers</h2>
              <div className="unified-universes">
                {[
                  ["journal360", "Journal 360°", "articles"],
                  ["ai-major", "IA majeure", "ai-major"],
                  ["future", "Le Futur", "future"],
                  ["sentinel", "SENTINEL", "sentinel"],
                ].map(([id, label, tab]) => {
                  const count = items.filter(
                    (i) =>
                      (i.article.sourceWatch ||
                        i.edition.collection ||
                        "journal360") === id,
                  ).length;
                  const members = items.filter(
                    (i) =>
                      (i.article.sourceWatch ||
                        i.edition.collection ||
                        "journal360") === id,
                  );
                  return (
                    <article className="unified-panel" key={id}>
                      <h3>{label}</h3>
                      <p>
                        {count} événements indexés
                        {id === "future"
                          ? ` · ${futureCatalog.error ? "Atlas indisponible" : futureCatalog.value === null ? "Lecture de l’atlas…" : futureCatalog.value.length + " dossier(s) prospectif(s)"}`
                          : ""}{" "}
                        ·{" "}
                        {(id === "future" &&
                          futureCatalog.value?.[0]?.updatedAt) ||
                          members[0]?.edition.date ||
                          "aucune édition reçue"}
                      </p>
                      <p>
                        Nouveautés :{" "}
                        {!assessment?.snapshot?.comparisonAvailable
                          ? "comparaison NON DISPONIBLE"
                          : p
                            ? p.items.filter(
                                (i) =>
                                  i.sourceWatch === id &&
                                  assessment!.snapshot!.newEventIds.includes(
                                    i.eventId,
                                  ),
                              ).length
                            : "non qualifiées"}
                      </p>
                      <button
                        className="secondary"
                        onClick={() =>
                          id === "future"
                            ? go("timeline")
                            : onNavigate(tab as Destination)
                        }
                      >
                        Explorer {label}
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
          {options.economy && <EconomyRadar editions={editions} compact />}
          {options.timeline && (
            <FutureBridge
              editions={editions}
              onFuture={onFuture}
              catalog={futureCatalog}
              onOpen={onOpen}
              compact
            />
          )}
          {options.prompts && (
            <section>
              <h2>Prompts de cette édition</h2>
              <p>
                {p?.promptAssets.length || 0} prompt(s) intégralement
                conservé(s).
              </p>
              <button className="secondary" onClick={openPrompts}>
                Lire et télécharger les prompts .md
              </button>
            </section>
          )}
          <section className="interface-help">
            <h2>Actions utiles</h2>
            <div className="unified-highlights">
              {p?.items
                .flatMap((i) => i.actions.map((a) => ({ a, i })))
                .slice(0, 3)
                .map(({ a, i }) => (
                  <article className="unified-panel" key={i.eventId + a.title}>
                    <h3>{a.title}</h3>
                    <p>{a.reason}</p>
                    <p>
                      Effort : {a.effort || "non documenté"} · Risque :{" "}
                      {a.risk || "non documenté"}
                    </p>
                    <button
                      className="text-button"
                      onClick={() => onOpen(latest!.id, i.id)}
                    >
                      Consulter les preuves
                    </button>
                    {a.promptId && (
                      <button className="secondary" onClick={openPrompts}>
                        Voir le prompt complet .md
                      </button>
                    )}
                  </article>
                ))}
              {!p?.items.some((i) => i.actions.length) && (
                <p>
                  Aucune action qualifiée fournie. Aucun emplacement n’est
                  rempli artificiellement.
                </p>
              )}
            </div>
          </section>
          <nav className="unified-controls" aria-label="Accès immédiat">
            <button className="secondary" onClick={() => onNavigate("search")}>
              Recherche IA et locale
            </button>
            <button className="secondary" onClick={openPrompts}>
              Prompts VS Code
            </button>
            <button
              className="secondary"
              onClick={() =>
                current && dayKeyOf(current)
                  ? onDay(dayKeyOf(current)!)
                  : onNavigate("library")
              }
            >
              Comparer les éditions
            </button>
            <button className="secondary" onClick={() => onNavigate("library")}>
              Bibliothèque et archives
            </button>
            <button className="secondary" onClick={onImport}>
              Importer un HTML
            </button>
            <button
              className="secondary"
              onClick={() => onNavigate("settings")}
            >
              Sauvegardes et confidentialité
            </button>
          </nav>
        </>
      )}
    </div>
  );
}
