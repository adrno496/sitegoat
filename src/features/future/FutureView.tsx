import { summaryPreview } from "../eventPresentation";
import { useEffect, useMemo, useRef, useState } from "react";
import { download } from "../backup";
import { now } from "../../data/model";
import { useDialogFocus } from "../dialogFocus";
import {
  futureDb,
  normalize,
  type FutureDocument,
  type FutureVersion,
} from "./db";
import {
  exportFutureBackup,
  inspectFutureBackup,
  restoreFutureBackup,
  type FutureArchive,
} from "./backup";
import { statusLabels, type FuturePersonal } from "./schema";
import { useLive } from "./hooks";
import { contentCounts, formatDate } from "./selectors";
import { FutureSummary, type AtlasCounts } from "./FutureOverview";
import FutureDetail from "./FutureDetail";
import "./future.css";
const verdicts = {
  integrer: "Intégrer",
  surveiller: "À surveiller",
  ecarter: "Écarter",
};
export default function FutureView({
  onImport,
  initialDocumentId = "",
}: {
  onImport: () => void;
  initialDocumentId?: string;
}) {
  const { value: documents, error: loadError } = useLive(
    () => futureDb.documents.orderBy("updatedAt").reverse().toArray(),
    [],
    [] as FutureDocument[],
  );
  const { value: personal, error: personalError } = useLive(
    () => futureDb.personal.toArray(),
    [],
    [] as FuturePersonal[],
  );
  const { value: versions, error: versionError } = useLive(
    () => futureDb.versions.toArray(),
    [],
    [] as FutureVersion[],
  );
  const { value: summary, error: summaryError } = useLive(
    async () => {
      const docs = await futureDb.documents.toArray();
      const total: AtlasCounts = { observations: 0, hypotheses: 0, actions: 0 };
      for (let i = 0; i < docs.length; i += 25) {
        const rows = await futureDb.contents.bulkGet(
          docs.slice(i, i + 25).map((d) => d.latest),
        );
        for (const row of rows) {
          if (!row)
            throw new Error(
              "Résumé indisponible : snapshot manquant. Restaurez une sauvegarde.",
            );
          const c = contentCounts(row.payload);
          total.observations += c.observations;
          total.hypotheses += c.hypotheses;
          total.actions += c.actions;
        }
      }
      return total;
    },
    [],
    null as AtlasCounts | null,
  );
  const [selected, setSelected] = useState(initialDocumentId),
    [initialSection, setInitialSection] = useState("overview"),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [year, setYear] = useState(""),
    [verdict, setVerdict] = useState(""),
    [favorites, setFavorites] = useState(false),
    [page, setPage] = useState(0),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [archive, setArchive] = useState<FutureArchive | null>(null),
    [busy, setBusy] = useState(false),
    [lastVisit, setLastVisit] = useState(""),
    [motion, setMotion] = useState("subtle"),
    [filtersOpen, setFiltersOpen] = useState(
      () => !window.matchMedia("(max-width:700px)").matches,
    );
  const restoreRef = useRef<HTMLInputElement>(null),
    cardRefs = useRef(new Map<string, HTMLButtonElement>()),
    returnTo = useRef("");
  useEffect(() => {
    let active = true;
    futureDb.settings
      .bulkGet(["last-visit", "atlas-motion"])
      .then(([v, m]) => {
        if (active) {
          setLastVisit(v?.value || "");
          setMotion(m?.value === "off" ? "off" : "subtle");
        }
      })
      .catch((e) => setError(String(e)));
    return () => {
      active = false;
      void futureDb.settings
        .put({ key: "last-visit", value: now() })
        .catch(() =>
          console.warn("Le Futur : date de visite non sauvegardée."),
        );
    };
  }, []);
  useEffect(() => {
    if (!selected && returnTo.current) {
      (
        cardRefs.current.get(returnTo.current) ||
        window.document.getElementById("future-collection-heading")
      )?.focus();
      returnTo.current = "";
    }
  }, [selected]);
  const favoriteIds = useMemo(
    () => new Set(personal.filter((p) => p.favorite).map((p) => p.documentId)),
    [personal],
  );
  const matches = useMemo(
    () =>
      documents.filter(
        (d) =>
          (!search || d.search.includes(normalize(search))) &&
          (!status || d.status === status) &&
          (!year || d.years.includes(year)) &&
          (!verdict || d.verdict === verdict) &&
          (!favorites || favoriteIds.has(d.documentId)),
      ),
    [documents, search, status, year, verdict, favorites, favoriteIds],
  );
  const changed = lastVisit
      ? documents.filter((d) => d.changedAt > lastVisit)
      : [],
    newVersions = lastVisit
      ? versions.filter((v) => v.importedAt > lastVisit).length
      : 0;
  const currentPage = Math.min(
      page,
      Math.max(0, Math.ceil(matches.length / 20) - 1),
    ),
    activeFilters = [!!search, !!status, !!year, !!verdict, favorites].filter(
      Boolean,
    ).length;
  function open(id: string, section = "overview") {
    returnTo.current = id;
    setInitialSection(section);
    setSelected(id);
  }
  function clearFilters() {
    setSearch("");
    setStatus("");
    setYear("");
    setVerdict("");
    setFavorites(false);
    setPage(0);
  }
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  useDialogFocus(!!archive, () => {
    if (!busy) setArchive(null);
  });
  return (
    <div className="future-workspace" data-motion={motion}>
      <header className="future-atlas-header">
        <div>
          <p className="future-kicker">JOURNAL 360° / ATLAS PROSPECTIF</p>
          <h1>
            Le Futur<span aria-hidden="true">.</span>
          </h1>
          <p className="future-tagline">
            Explorer l’avenir, confronter les prévisions aux faits, se préparer.
          </p>
        </div>
        <div className="future-header-actions">
          <button className="primary" onClick={onImport}>
            Importer un dossier <span aria-hidden="true">↗</span>
          </button>
          <label className="future-motion-control">
            Animations
            <select
              aria-label="Animations"
              value={motion}
              onChange={(e) => {
                const value = e.target.value;
                setMotion(value);
                run(async () => {
                  await futureDb.settings.put({ key: "atlas-motion", value });
                });
              }}
            >
              <option value="subtle">Activées</option>
              <option value="off">Réduites</option>
            </select>
          </label>
        </div>
      </header>
      <details className="future-resource-menu">
        <summary>Sauvegarde et ressources</summary>
        <div className="future-tools">
          <button
            className="secondary"
            disabled={busy}
            onClick={() =>
              run(async () => {
                download(
                  await exportFutureBackup(futureDb),
                  "Le-Futur-" + new Date().toISOString().slice(0, 10) + ".zip",
                );
                setMessage(
                  "Sauvegarde exportée : elle contient vos originaux et vos notes privés.",
                );
              })
            }
          >
            Sauvegarder Le Futur
          </button>
          <button
            className="secondary"
            disabled={busy}
            onClick={() => restoreRef.current?.click()}
          >
            Restaurer Le Futur
          </button>
          <a href="/examples/future/APERCU_FUTUR_IA_ANIME.html" download>
            Exemple HTML synthétique
          </a>
          <a href="/examples/future/SCHEMA_FUTUR_IA_v1.json" download>
            Contrat JSON v1
          </a>
        </div>
      </details>
      <p className="future-storage-note">
        Stockage local · sauvegarde séparée · synchronisation automatique non
        configurée
      </p>
      <input
        hidden
        type="file"
        accept=".zip,application/zip"
        ref={restoreRef}
        aria-label="Sauvegarde Le Futur à restaurer"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f)
            run(async () => {
              if (f.size > 150 * 1024 * 1024)
                throw Error("Archive limitée à 150 Mo.");
              setArchive(
                await inspectFutureBackup(
                  new Uint8Array(await f.arrayBuffer()),
                ),
              );
            });
        }}
      />
      {(loadError ||
        personalError ||
        versionError ||
        summaryError ||
        error) && (
        <p role="alert" className="warning">
          {loadError || personalError || versionError || summaryError || error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {selected ? (
        <FutureDetail
          key={selected}
          documentId={selected}
          initialSection={initialSection}
          onBack={() => setSelected("")}
        />
      ) : (
        <>
          <section
            className="future-changed"
            aria-labelledby="future-changed-heading"
          >
            <span className="future-kicker">VOTRE POINT DE REPRISE</span>
            <h2 id="future-changed-heading">
              Ce qui a changé depuis ma dernière visite
            </h2>
            <p>
              {!lastVisit
                ? "Première visite : explorez vos dossiers à votre rythme."
                : changed.length === 0
                  ? "Aucun nouveau dossier ni changement depuis votre dernière visite."
                  : newVersions +
                    " révision(s) nouvelle(s) · " +
                    changed.length +
                    " dossier(s) modifié(s)."}
            </p>
            {changed.length > 0 && (
              <details>
                <summary>Comparer les révisions et l’historique</summary>
                <ul>
                  {changed.slice(0, 100).map((d) => (
                    <li key={d.documentId}>
                      <button
                        className="text-button"
                        onClick={() => open(d.documentId, "changes")}
                      >
                        {d.title} — révision {d.revision} : voir les différences
                        et l’historique
                      </button>
                    </li>
                  ))}
                </ul>
                {changed.length > 100 && (
                  <p>
                    100 dossiers affichés ; utilisez la recherche pour les
                    autres.
                  </p>
                )}
              </details>
            )}
          </section>
          <section
            id="future-atlas-overview"
            className="future-collection-overview"
          >
            <div className="future-section-heading">
              <span className="future-kicker">UNE MINUTE POUR SE REPÉRER</span>
              <h2>Observer. Envisager. Agir.</h2>
              <p>
                {documents.length} dossier(s) ·{" "}
                {documents.filter((d) => d.synthetic).length} exemple(s)
                synthétique(s) · dernières versions uniquement
              </p>
            </div>
            {summary ? (
              <FutureSummary counts={summary} />
            ) : (
              <p role="status">Lecture des résumés…</p>
            )}
          </section>
          <nav className="future-module-nav" aria-label="Explorer l’atlas">
            <a href="#future-atlas-overview">Vue d’ensemble</a>
            {[
              ["timeline", "Chronologie"],
              ["scenarios", "Scénarios"],
              ["signals", "Signaux"],
              ["actions", "Ma préparation"],
              ["sources", "Sources"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => {
                  if (matches[0]) open(matches[0].documentId, key);
                  else document.getElementById("future-empty-state")?.focus();
                }}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="future-collection-heading">
            <h2 id="future-collection-heading" tabIndex={-1}>
              Vos dossiers, vos perspectives.
            </h2>
            <span className="future-kicker">BIBLIOTHÈQUE PROSPECTIVE</span>
          </div>
          <details
            className="future-filter-panel"
            open={filtersOpen}
            onToggle={(e) => setFiltersOpen(e.currentTarget.open)}
          >
            <summary>Filtres · {activeFilters} actif(s)</summary>
            <div className="future-filters">
              <label>
                Rechercher un dossier
                <input
                  type="search"
                  value={search}
                  placeholder="Scénario, signal, compétence…"
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                />
              </label>
              <label>
                Statut
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(0);
                  }}
                >
                  <option value="">Tous les statuts</option>
                  {(["observed", "hypothesis", "scenario"] as const).map(
                    (s) => (
                      <option key={s} value={s}>
                        {statusLabels[s]}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label>
                Horizon
                <select
                  value={year}
                  onChange={(e) => {
                    setYear(e.target.value);
                    setPage(0);
                  }}
                >
                  <option value="">Tous les horizons</option>
                  {["2027", "2030", "2035", "2040+", "unspecified"].map((y) => (
                    <option key={y} value={y}>
                      {y === "unspecified" ? "Non précisé" : y}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Décision éditoriale
                <select
                  value={verdict}
                  onChange={(e) => {
                    setVerdict(e.target.value);
                    setPage(0);
                  }}
                >
                  <option value="">Toutes les décisions</option>
                  {Object.entries(verdicts).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label className="future-check">
                <input
                  type="checkbox"
                  checked={favorites}
                  onChange={(e) => {
                    setFavorites(e.target.checked);
                    setPage(0);
                  }}
                />
                Favoris
              </label>
              <button onClick={clearFilters}>Effacer les filtres</button>
            </div>
          </details>
          <p aria-live="polite" className="future-results">
            {matches.length} résultat(s)
          </p>
          <div className="future-grid">
            {matches
              .slice(currentPage * 20, currentPage * 20 + 20)
              .map((d, i) => (
                <article className="quiet-panel future-card" key={d.documentId}>
                  <div className="future-card-top">
                    <span className="future-kicker">
                      DOSSIER{" "}
                      {String(currentPage * 20 + i + 1).padStart(2, "0")}
                    </span>
                    <span className="future-badge">
                      {statusLabels[d.status]}
                    </span>
                  </div>
                  <h2>
                    <button
                      ref={(el) => {
                        if (el) cardRefs.current.set(d.documentId, el);
                        else cardRefs.current.delete(d.documentId);
                      }}
                      className="future-title"
                      onClick={() => open(d.documentId)}
                    >
                      {d.title}
                    </button>
                  </h2>
                  <p>{summaryPreview(d.excerpt)}</p>
                  <details>
                    <summary>Développer le résumé</summary>
                    <p>{d.excerpt}</p>
                    <button
                      className="secondary"
                      onClick={() => open(d.documentId)}
                    >
                      Lire le dossier complet
                    </button>
                  </details>
                  <div className="future-card-bottom">
                    <span>
                      {d.years.filter((y) => y !== "unspecified").join(" / ") ||
                        "Horizon non précisé"}
                    </span>
                    <span>
                      {verdicts[d.verdict]} · Révision {d.revision}
                      {d.synthetic ? " · Synthétique" : ""}
                      {favoriteIds.has(d.documentId) ? " · Favori" : ""}
                    </span>
                  </div>
                  <p className="future-caption">
                    Mis à jour : {formatDate(d.updatedAt)}
                  </p>
                </article>
              ))}
          </div>
          {!matches.length && (
            <section
              id="future-empty-state"
              tabIndex={-1}
              className="future-empty"
            >
              <h2>
                {documents.length
                  ? "Aucun dossier ne correspond"
                  : "Votre premier dossier prospectif"}
              </h2>
              <p>
                {documents.length
                  ? "Ajustez vos critères pour retrouver vos dossiers."
                  : "Importez un HTML contenant futureData ou un JSON Journal 360 Future v1. Les journaux quotidiens restent dans Bibliothèque."}
              </p>
              {documents.length ? (
                <button onClick={clearFilters}>Effacer les filtres</button>
              ) : (
                <>
                  <p>
                    Les exemples fournis sont synthétiques et ne constituent pas
                    une veille vérifiée.
                  </p>
                  <button className="primary" onClick={onImport}>
                    Choisir un fichier HTML ou JSON
                  </button>
                  <p>
                    Vous pourrez vérifier le dossier puis annuler avant tout
                    enregistrement.
                  </p>
                </>
              )}
            </section>
          )}
          {matches.length > 20 && (
            <div className="future-tools">
              <button
                disabled={currentPage === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Page précédente
              </button>
              <span>
                {currentPage + 1} / {Math.ceil(matches.length / 20)}
              </span>
              <button
                disabled={(currentPage + 1) * 20 >= matches.length}
                onClick={() => setPage((p) => p + 1)}
              >
                Page suivante
              </button>
            </div>
          )}
        </>
      )}
      {archive && (
        <div className="modal-backdrop">
          <section
            className="modal compact"
            role="dialog"
            aria-modal="true"
            aria-labelledby="future-restore-title"
          >
            <h2 id="future-restore-title">
              Fusionner cette sauvegarde Le Futur ?
            </h2>
            <p>
              {archive.versions.length} révisions · {archive.personal.length}{" "}
              états personnels. Les versions et notes locales sont conservées.
              Un conflit de révision annule la fusion entière.
            </p>
            <div className="modal-actions">
              <button disabled={busy} onClick={() => setArchive(null)}>
                Annuler
              </button>
              <button
                className="primary"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const count = await restoreFutureBackup(futureDb, archive);
                    setArchive(null);
                    setMessage(
                      `${count} révisions restaurées. États personnels fusionnés.`,
                    );
                  })
                }
              >
                Fusionner Le Futur
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
