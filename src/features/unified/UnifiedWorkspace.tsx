import { SnapshotStatus } from "../SnapshotStatus";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
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
}: {
  editions: Edition[];
  onOpen: (id: string, article?: string) => void;
  onDay: (key: string) => void;
  onNavigate: (to: Destination) => void;
  onImport: () => void;
  onFuture: (id?: string) => void;
}) {
  const [panel, setPanel] = useState("overview");
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
  const highlights =
    p?.items.filter((i) => i.importance !== "context").slice(0, 6) || [];
  return (
    <div className="unified-workspace">
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
                <SnapshotStatus assessment={assessment} />
              )}
              {current && current.date !== clock.date && (
                <p className="warning">
                  Aucune édition du {clock.date} reçue. Vous consultez la
                  dernière journée disponible.
                </p>
              )}
              <p>
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
                    : "Manquant";
              return (
                <button
                  key={slot}
                  className="secondary"
                  disabled={!receivedVersion}
                  aria-label={`${slot} · ${label}`}
                  onClick={() => receivedVersion && onOpen(receivedVersion.id)}
                >
                  <b>{slot}</b>
                  <span>
                    {label}
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
          <section className="unified-digest">
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
            <div className="unified-highlights">
              {highlights.length ? (
                highlights.map((i) => (
                  <article className="unified-panel" key={i.eventId}>
                    <span className="unified-badge">
                      {i.category} ·{" "}
                      {i.evidenceStatus === "hypothesis"
                        ? "Hypothèse"
                        : i.evidenceStatus === "sourced"
                          ? "Sourcé selon le fichier"
                          : "Non vérifié"}
                    </span>
                    <h3>{i.title}</h3>
                    <p>{i.summary}</p>
                    <dl>
                      <dt>Ce qui a changé</dt>
                      <dd>{i.changed || "Non renseigné"}</dd>
                      <dt>Pourquoi cela compte</dt>
                      <dd>{i.importanceReason || "Non renseigné"}</dd>
                      <dt>Ce qu’on ignore</dt>
                      <dd>{i.unknowns || "Non renseigné"}</dd>
                    </dl>
                    {i.corrections.length > 0 && (
                      <p className="warning">
                        Corrigé · {i.corrections.at(-1)!.at} ·{" "}
                        {i.corrections.at(-1)!.reason}
                      </p>
                    )}
                    <button
                      className="secondary"
                      onClick={() => onOpen(latest!.id, i.id)}
                    >
                      Lire et voir les sources
                    </button>
                  </article>
                ))
              ) : (
                <p>
                  Aucune priorité éditoriale qualifiée dans le format unifié.
                  Tous les articles historiques restent accessibles.
                </p>
              )}
            </div>
          </section>
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
          <EconomyRadar editions={editions} compact />
          <FutureBridge
            editions={editions}
            onFuture={onFuture}
            catalog={futureCatalog}
            onOpen={onOpen}
            compact
          />
          <section>
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
