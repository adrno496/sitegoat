import { EditionFreshness, useParisToday } from "../editorialPresentation";
import { belongsToLatestEdition } from "../../data/editionHighlights";
import type { Edition } from "../../data/model";
import { dateLabel } from "../../data/model";
import { indexArticles } from "../../data/articles";
import {
  latestCurrent,
  unifiedVersions,
  zoneLabels,
} from "../unified/selectors";
import { assessVersion } from "../../data/day";
import { EventCard } from "../EventCard";
import { PublicGoogleLink } from "../PublicGoogleLink";
import { economicHistories } from "./economicHistory";
import { useDisplay } from "./preferences";
import { useMemo } from "react";
export function Dashboard({
  editions,
  onOpen,
  onArticle,
  onToday,
  onImport,
  resumeId,
}: {
  editions: Edition[];
  resumeId?: string;
  onOpen: (id: string, article?: string) => void;
  onArticle: (eventId: string, editionId: string) => void;
  onToday: (panel?: string) => void;
  onImport: () => void;
}) {
  const today = useParisToday();
  const { display: d } = useDisplay();
  const latest = latestCurrent(editions),
    p = latest?.unified;

  const highlights = [...(p?.items || [])]
    .filter(
      (i) =>
        i.importance !== "context" ||
        belongsToLatestEdition(latest!, latest, i),
    )
    .sort(
      (a, b) =>
        Number(belongsToLatestEdition(latest!, latest, b)) -
          Number(belongsToLatestEdition(latest!, latest, a)) ||
        Number(d.favorites.includes(b.category)) -
          Number(d.favorites.includes(a.category)) ||
        Number(b.importance === "major") - Number(a.importance === "major"),
    )
    .slice(0, 6);
  const versions = unifiedVersions(editions.filter((e) => !e.archived));
  const signals = versions
    .flatMap((e) => e.unified!.futureInsights.map((i) => ({ i, e })))
    .filter(
      ({ i }) =>
        i.trigger.trim() &&
        i.evidence.length &&
        i.status !== "observed" &&
        i.status !== "contradicted",
    )
    .filter((r, n, all) => all.findIndex((x) => x.i.id === r.i.id) === n)
    .slice(0, 5);
  const history = useMemo(() => economicHistories(editions), [editions]);
  const assessment = latest
    ? assessVersion(
        latest,
        editions.filter(
          (e) => e.id !== latest.id && e.date === latest.date && !e.deleted,
        ),
      )
    : undefined;
  const changes =
    p?.items.filter((i) => i.corrections.length || i.changed.trim()) || [];
  return (
    <section className="dashboard v9-page" aria-label="Accueil quotidien">
      <header className="v9-dashboard-heading">
        <p className="eyebrow">JOURNAL 360° · VOTRE TABLEAU DE BORD</p>
        <h1>Accueil</h1>
        <p>
          {latest
            ? `Édition du ${dateLabel(latest.date)}${latest.editionSlot ? " · " + latest.editionSlot : ""}`
            : "Votre veille commence avec une édition."}
        </p>
        <button
          className="primary"
          onClick={() => (latest ? onOpen(latest.id) : onImport())}
        >
          {latest ? "Lire la dernière édition" : "Importer une édition"}
        </button>
      </header>
      <EditionFreshness edition={latest} />
      {resumeId && (
        <p>
          <button className="text-button" onClick={() => onOpen(resumeId)}>
            Reprendre
          </button>{" "}
          · dernière journée ouverte, avec sa version courante.
        </p>
      )}
      {p?.synthetic && (
        <p className="warning">Données de démonstration synthétiques.</p>
      )}
      {d.homeHighlights && (
        <section>
          <div className="section-title">
            <h2>
              {latest?.date === today
                ? "Les points essentiels aujourd’hui"
                : "Les points essentiels de la dernière édition"}
            </h2>
            <button className="text-button" onClick={() => onToday()}>
              Toute la journée →
            </button>
          </div>
          <div className="event-list unified-highlights">
            {highlights.map((i) => (
              <EventCard
                key={i.eventId}
                item={i}
                latest={belongsToLatestEdition(latest!, latest, i)}
                edition={latest!}
                onOriginal={() => onOpen(latest!.id, i.id)}
                onRead={() => onArticle(i.eventId, latest!.id)}
              />
            ))}
          </div>
          {!highlights.length && (
            <p className="v9-empty">
              Aucun fait majeur ou important déclaré dans la dernière édition.
              Les articles restent consultables.
            </p>
          )}
        </section>
      )}
      {d.graphs && (
        <section className="history-charts">
          <h2>Évolutions économiques sourcées</h2>
          <p>
            Points officiels avec vérification déclarée. Même zone, producteur,
            série, définition, unité et fréquence. Aucune validation factuelle
            supplémentaire par Sitegoat.
          </p>
          {history
            .filter((g) => g.points.length >= 2)
            .map((g) => {
              const e = g.points[0],
                values = g.points.map((p) => p.value),
                min = Math.min(...values),
                max = Math.max(...values),
                span = max - min || 1;
              return (
                <article className="quiet-panel" key={g.key}>
                  <h3>
                    {zoneLabels[e.zone]} · {e.indicator}
                  </h3>
                  <p>
                    {e.provider} · {e.seriesCode} · {e.unit} · {e.frequency} ·{" "}
                    {e.period} → {g.points.at(-1)!.period}
                  </p>
                  <svg
                    className="v9-chart"
                    viewBox="0 0 640 230"
                    role="img"
                    aria-label={`${e.indicator} : ${g.points.length} points exacts ; valeurs et dates dans le tableau ci-dessous`}
                  >
                    <line
                      x1="56"
                      y1="190"
                      x2="610"
                      y2="190"
                      stroke="currentColor"
                    />
                    <text x="4" y="24" fill="currentColor">
                      {max}
                    </text>
                    <text x="4" y="190" fill="currentColor">
                      {min}
                    </text>
                    {g.points.map((p, n) => (
                      <g key={p.period}>
                        <circle
                          cx={60 + (n / (g.points.length - 1)) * 540}
                          cy={180 - ((p.value - min) / span) * 150}
                          r="5"
                          fill="currentColor"
                        >
                          <title>
                            {p.period} : {p.value} {p.unit}
                          </title>
                        </circle>
                        {(n === 0 || n === g.points.length - 1) && (
                          <text
                            x={60 + (n / (g.points.length - 1)) * 540}
                            y="216"
                            textAnchor="middle"
                            fill="currentColor"
                          >
                            {p.period}
                          </text>
                        )}
                      </g>
                    ))}
                  </svg>
                  <p>
                    Abscisse : périodes ordonnées, espacées régulièrement.
                    Points discrets non reliés : aucune valeur intermédiaire
                    n’est estimée.{" "}
                    {g.gaps
                      ? "Des périodes sont absentes : série discontinue."
                      : "Aucune période manquante parmi les points importés."}
                  </p>
                  <p>
                    Méthode : {e.definition}. Les changements de définition,
                    d’unité ou de fréquence constituent des séries séparées.
                  </p>
                  <details>
                    <summary>Points exacts, sources et révisions</summary>
                    <div className="v9-table-scroll">
                      <table>
                        <caption>
                          {e.indicator} · {e.unit}
                        </caption>
                        <thead>
                          <tr>
                            <th>Période</th>
                            <th>Valeur</th>
                            <th>Statistique</th>
                            <th>Publication / révision</th>
                            <th>Source</th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.points.map((p) => (
                            <tr key={p.period}>
                              <td>{p.period}</td>
                              <td>
                                {p.value} {p.unit}
                              </td>
                              <td>{p.statisticDate}</td>
                              <td>
                                {p.publishedAt} /{" "}
                                {p.revisedAt || "aucune déclarée"}
                              </td>
                              <td>
                                {p.sourceRecords.map((s) => (
                                  <a
                                    key={s.id}
                                    href={s.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    {s.publisher} · {s.label}
                                  </a>
                                ))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                  <PublicGoogleLink
                    question={`${e.provider} ${e.seriesCode} ${e.indicator} ${e.period}`}
                  />
                </article>
              );
            })}
          {!history.some((g) => g.points.length >= 2) && (
            <div className="v9-empty">
              <h3>Historique insuffisant pour tracer une évolution fiable</h3>
              <p>
                Il faut au moins deux périodes comparables d’une même série
                officielle datée et sourcée. Prochain point attendu :
                publication suivante à la fréquence du fournisseur, date non
                fournie. Un nouvel import pourra enrichir l’historique.
              </p>
            </div>
          )}
          <details>
            <summary>Énergie, cyber et IA mesurable</summary>
            <p>
              Aucune série homogène dédiée n’est disponible dans le contrat
              importé. Aucun graphique de progression IA ni benchmark hétérogène
              n’est produit. Les points économiques admissibles apparaissent
              ci-dessus ; les statistiques ponctuelles restent dans Économie.
            </p>
          </details>
        </section>
      )}
      {d.homeChanges && (
        <section>
          <h2>Ce qui change</h2>
          {!assessment?.snapshot?.comparisonAvailable && (
            <p>
              Comparaison avec un import antérieur indisponible. Les changements
              ci-dessous sont déclarés dans le snapshot.
            </p>
          )}
          <ol className="v9-timeline">
            {changes.slice(0, 8).map((i) => (
              <li key={i.eventId}>
                <p className="small-note">
                  {i.lastChangedAt} ·{" "}
                  {i.corrections.length
                    ? "Correction documentée"
                    : i.evidenceStatus === "hypothesis"
                      ? "Hypothèse déclarée"
                      : "Suivi déclaré"}
                </p>
                <button
                  className="title-button"
                  onClick={() => onArticle(i.eventId, latest!.id)}
                >
                  {i.title}
                </button>
                <p>{i.corrections.at(-1)?.reason || i.changed}</p>
                <PublicGoogleLink question={i.publicResearchQuestion} />
              </li>
            ))}
          </ol>
          {!changes.length && <p>Aucun changement documenté.</p>}
        </section>
      )}
      {d.homeWatch && (
        <section>
          <h2>À surveiller</h2>
          <div className="v9-watch-grid">
            {signals.map(({ i, e }) => (
              <article className="quiet-panel" key={i.id}>
                <p className="eyebrow">
                  {i.status} · horizon {i.year}
                </p>
                <h3>{i.title}</h3>
                <p>Si : {i.trigger}</p>
                <p>Objection : {i.objections || "non fournie"}</p>
                <p>Invalidation : {i.invalidation || "non fournie"}</p>
                {i.evidence.map((s) => (
                  <p key={s.id}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.label}
                    </a>
                  </p>
                ))}
                <button
                  className="text-button"
                  onClick={() => onToday("future")}
                >
                  Voir les jalons ({e.date})
                </button>
              </article>
            ))}
          </div>
          {!signals.length && <p>Aucun signal conditionnel sourcé importé.</p>}
        </section>
      )}
      <section>
        <h2>Explorer les rubriques</h2>
        <div className="unified-controls">
          {[
            ["overview", "À la une"],
            ["economy", "Économie"],
            ["ai", "IA majeures"],
            ["timeline", "Chronologie IA"],
            ["sentinel", "SENTINEL & AXDIA"],
            ["future", "Le Futur"],
            ["quick", "Actualité rapide"],
          ].map(([id, label]) => (
            <button className="secondary" key={id} onClick={() => onToday(id)}>
              {label}
            </button>
          ))}
        </div>
        <p>
          {indexArticles(editions).length} articles conservés dans la
          bibliothèque.
        </p>
      </section>
    </section>
  );
}
