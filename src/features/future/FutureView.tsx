import { useEffect, useRef, useState } from "react";
import { liveQuery } from "dexie";
import { download } from "../backup";
import { blobOf, now } from "../../data/model";
import { useDialogFocus } from "../dialogFocus";
import { radarReaderHTML } from "../aiRadar/import";
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
import {
  moduleLabels,
  personalSchema,
  statusLabels,
  type FuturePayload,
  type FuturePersonal,
} from "./schema";
import { renderFutureHTML } from "./html";
import "./future.css";
function useLive<T>(query: () => Promise<T>, deps: unknown[], initial: T) {
  const [value, setValue] = useState(initial),
    [error, setError] = useState("");
  useEffect(() => {
    const sub = liveQuery(query).subscribe({
      next: setValue,
      error: (e) => setError(String(e)),
    });
    return () =>
      sub.unsubscribe(); /* query is intentionally governed by caller dependencies */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { value, error };
}
const format = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString("fr-FR") : "non renseigné";
const verdicts = {
  integrer: "Intégrer",
  surveiller: "À surveiller",
  ecarter: "Écarter",
};
const horizons = {
  now: "Maintenant",
  "3m": "Dans 3 mois",
  "12m": "Dans 12 mois",
};
function Sources({ urls }: { urls: string[] }) {
  return (
    <ul className="future-evidence">
      {urls.map((url, i) => (
        <li key={url}>
          <a href={url} target="_blank" rel="noreferrer noopener">
            Source déclarée {i + 1}
          </a>
        </li>
      ))}
    </ul>
  );
}
export default function FutureView({ onImport }: { onImport: () => void }) {
  const { value: documents, error: loadError } = useLive(
    () => futureDb.documents.orderBy("updatedAt").reverse().toArray(),
    [],
    [] as FutureDocument[],
  );
  const { value: personal } = useLive(
    () => futureDb.personal.toArray(),
    [],
    [] as FuturePersonal[],
  );
  const [selected, setSelected] = useState(""),
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
    [lastVisit, setLastVisit] = useState("");
  const restoreRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let active = true;
    futureDb.settings
      .get("last-visit")
      .then((v) => {
        if (active) setLastVisit(v?.value || "");
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
  const favoriteIds = new Set(
    personal.filter((p) => p.favorite).map((p) => p.documentId),
  );
  const matches = documents.filter(
    (d) =>
      (!search || d.search.includes(normalize(search))) &&
      (!status || d.status === status) &&
      (!year || d.years.includes(year)) &&
      (!verdict || d.verdict === verdict) &&
      (!favorites || favoriteIds.has(d.documentId)),
  );
  const changed = lastVisit
    ? documents.filter((d) => d.changedAt > lastVisit)
    : [];
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
    <div className="future-workspace">
      <header className="section-heading">
        <div>
          <p className="eyebrow">ANTICIPER · COMPARER · SE PRÉPARER</p>
          <h1>Le Futur</h1>
          <p className="muted">
            Des scénarios à éprouver, des signaux à suivre. L’avenir décrit
            n’est jamais garanti.
          </p>
        </div>
        <button className="primary" onClick={onImport}>
          Importer un dossier
        </button>
      </header>
      <div className="future-tools">
        <a href="/examples/future/APERCU_FUTUR_IA_ANIME.html" download>
          Exemple HTML synthétique
        </a>
        <a href="/examples/future/SCHEMA_FUTUR_IA_v1.json" download>
          Contrat JSON v1
        </a>
        <button
          className="secondary"
          disabled={busy}
          onClick={() =>
            run(async () => {
              download(
                await exportFutureBackup(futureDb),
                `Le-Futur-${new Date().toISOString().slice(0, 10)}.zip`,
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
        <span className="small-note">
          Stockage local · sauvegarde séparée · synchronisation automatique non
          configurée
        </span>
      </div>
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
      {(loadError || error) && (
        <p role="alert" className="warning">
          {loadError || error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {selected ? (
        <FutureDetail
          key={selected}
          documentId={selected}
          onBack={() => setSelected("")}
        />
      ) : (
        <>
          <p className="future-count">
            {documents.length} dossiers ·{" "}
            {documents.reduce((s, d) => s + (d.synthetic ? 1 : 0), 0)} exemples
            synthétiques · {changed.length} dossier(s) modifié(s) depuis{" "}
            {lastVisit ? format(lastVisit) : "votre première visite"}
          </p>
          {changed.length > 0 && (
            <details className="quiet-panel">
              <summary>Ce qui a changé depuis ma dernière visite</summary>
              <ul>
                {changed.slice(0, 100).map((d) => (
                  <li key={d.documentId}>
                    <button
                      className="text-button"
                      onClick={() => setSelected(d.documentId)}
                    >
                      {d.title} — révision {d.revision} : voir les différences
                      et l’historique
                    </button>
                  </li>
                ))}
              </ul>
              {changed.length > 100 && (
                <p>
                  100 dossiers affichés ; utilisez la recherche pour les autres.
                </p>
              )}
            </details>
          )}
          <div className="future-filters">
            <label>
              Rechercher un dossier
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                placeholder="Scénario, signal, compétence…"
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
                {["observed", "hypothesis", "scenario"].map((s) => (
                  <option key={s} value={s}>
                    {statusLabels[s as "observed"]}
                  </option>
                ))}
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
              />{" "}
              Favoris
            </label>
          </div>
          <p aria-live="polite">{matches.length} résultat(s)</p>
          <div className="future-grid">
            {matches.slice(page * 20, page * 20 + 20).map((d) => (
              <article className="quiet-panel future-card" key={d.documentId}>
                <small>
                  {statusLabels[d.status]} · Révision {d.revision}
                  {d.synthetic ? " · Synthétique" : ""}
                </small>
                <h2>
                  <button
                    className="future-title"
                    onClick={() => setSelected(d.documentId)}
                  >
                    {d.title}
                  </button>
                </h2>
                <p>{d.excerpt}</p>
                <span>
                  {verdicts[d.verdict]} ·{" "}
                  {d.years.filter((y) => y !== "unspecified").join(" / ")}
                </span>
                <p className="small-note">
                  Mis à jour : {format(d.updatedAt)}
                  {favoriteIds.has(d.documentId) ? " · Favori" : ""}
                </p>
              </article>
            ))}
          </div>
          {!documents.length && (
            <section className="quiet-panel">
              <h2>Votre premier dossier prospectif</h2>
              <p>
                Importez un HTML contenant futureData ou un JSON Journal 360
                Future v1. Les journaux quotidiens restent dans Bibliothèque.
              </p>
              <p>
                Les exemples fournis sont synthétiques et ne constituent pas une
                veille vérifiée.
              </p>
            </section>
          )}
          {matches.length > 20 && (
            <div className="future-tools">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Page précédente
              </button>
              <span>
                {page + 1} / {Math.ceil(matches.length / 20)}
              </span>
              <button
                disabled={(page + 1) * 20 >= matches.length}
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
function FutureDetail({
  documentId,
  onBack,
}: {
  documentId: string;
  onBack: () => void;
}) {
  const { value: document } = useLive(
    () => futureDb.documents.get(documentId),
    [documentId],
    undefined as FutureDocument | undefined,
  );
  const { value: versions } = useLive(
    () =>
      futureDb.versions
        .where("documentId")
        .equals(documentId)
        .reverse()
        .sortBy("revision"),
    [documentId],
    [] as FutureVersion[],
  );
  const { value: saved } = useLive(
    () => futureDb.personal.get(documentId),
    [documentId],
    undefined as FuturePersonal | undefined,
  );
  const { value: events } = useLive(
    () =>
      futureDb.changes
        .where("documentId")
        .equals(documentId)
        .reverse()
        .sortBy("at"),
    [documentId],
    [] as { id: string; at: string; description: string }[],
  );
  const [versionId, setVersionId] = useState(""),
    [payload, setPayload] = useState<FuturePayload | null>(null),
    [error, setError] = useState(""),
    [note, setNote] = useState(""),
    [preview, setPreview] = useState("");
  const chosen = versionId || document?.latest;
  useEffect(() => {
    let active = true;
    setPreview("");
    if (chosen)
      futureDb.contents
        .get(chosen)
        .then((c) => {
          if (active) setPayload(c?.payload || null);
        })
        .catch((e) => setError(String(e)));
    return () => {
      active = false;
    };
  }, [chosen]);
  async function run(action: () => Promise<unknown>) {
    setError("");
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }
  if (!payload) return <p role="status">Ouverture du dossier…{error}</p>;
  const p = payload,
    personal = saved || personalSchema.parse({ documentId, updatedAt: now() }),
    activeVersion = versions.find((v) => v.id === chosen);
  const patch = (value: Partial<FuturePersonal>) =>
    run(() => futureDb.updatePersonal(documentId, value));
  const anchor = (id: string) => `future-item-${id}`;
  return (
    <article
      className={`future-detail ${p.visualization.motion === "subtle" ? "future-motion" : ""}`}
    >
      <button className="text-button" onClick={onBack}>
        ← Tous les dossiers
      </button>
      <header className="quiet-panel">
        <small>
          {statusLabels[p.status]} ·{" "}
          {p.synthetic ? "EXEMPLE SYNTHÉTIQUE · " : ""}Révision {p.revision}
        </small>
        <h2>{p.title}</h2>
        <p>
          {verdicts[p.editorialDecision.verdict]} : {p.editorialDecision.reason}
        </p>
        <div className="future-tools">
          <button
            className="secondary"
            aria-pressed={personal.favorite}
            onClick={() => patch({ favorite: !personal.favorite })}
          >
            {personal.favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          </button>
          <button
            className="secondary"
            onClick={() =>
              download(
                blobOf(
                  new TextEncoder().encode(JSON.stringify(p, null, 2)),
                  "application/json",
                ),
                `${p.documentId}-r${p.revision}.json`,
              )
            }
          >
            Exporter JSON
          </button>
          <button
            className="secondary"
            onClick={() =>
              run(async () =>
                download(
                  blobOf(
                    new TextEncoder().encode(renderFutureHTML(p)),
                    "text/html",
                  ),
                  `${p.documentId}-r${p.revision}.html`,
                ),
              )
            }
          >
            Exporter HTML portable
          </button>
          <button
            className="secondary"
            onClick={() =>
              run(async () => {
                if (!chosen || !activeVersion) return;
                const o = await futureDb.originals.get(chosen);
                if (o)
                  download(
                    blobOf(
                      o.bytes,
                      activeVersion.kind === "json"
                        ? "application/json"
                        : "text/html",
                    ),
                    activeVersion.filename,
                  );
              })
            }
          >
            Télécharger l’original
          </button>
          {activeVersion?.kind !== "json" && (
            <button
              className="secondary"
              onClick={() =>
                run(async () => {
                  setPreview(
                    radarReaderHTML(
                      new TextEncoder().encode(renderFutureHTML(p)),
                    ),
                  );
                })
              }
            >
              Voir l’aperçu HTML isolé
            </button>
          )}
        </div>
        <p className="small-note">
          Empreinte SHA-256 : {activeVersion?.sha256}
        </p>
        <label>
          Version affichée
          <select
            value={chosen || ""}
            onChange={(e) => setVersionId(e.target.value)}
          >
            {[...versions]
              .sort((a, b) => b.revision - a.revision)
              .map((v) => (
                <option key={v.id} value={v.id}>
                  Révision {v.revision} · {format(v.updatedAt)}
                </option>
              ))}
          </select>
        </label>
        <p className="small-note">
          Les notes et le suivi personnel concernent le dossier, quelle que soit
          la version affichée.
        </p>
      </header>
      {error && (
        <p role="alert" className="warning">
          {error}
        </p>
      )}
      {preview && (
        <section>
          <button onClick={() => setPreview("")}>Fermer l’aperçu</button>
          <iframe
            title="Aperçu HTML isolé du dossier"
            sandbox=""
            referrerPolicy="no-referrer"
            srcDoc={preview}
            className="future-preview"
          />
        </section>
      )}
      <nav className="future-module-nav" aria-label="Modules du dossier">
        {p.visualization.modules.map((m) => (
          <a key={m} href={`#future-module-${m}`}>
            {moduleLabels[m]}
          </a>
        ))}
      </nav>
      {p.visualization.modules.map((module) => (
        <section
          className="future-module"
          id={`future-module-${module}`}
          key={module}
        >
          <h2>{moduleLabels[module]}</h2>
          {module === "timeline" && (
            <div className="future-timeline">
              {p.scenarios
                .flatMap((s) =>
                  s.milestones.map((m) => ({ ...m, scenario: s.title })),
                )
                .sort((a, b) => a.year - b.year)
                .map((m) => (
                  <article className="quiet-panel" id={anchor(m.id)} key={m.id}>
                    <small>
                      {m.year} · {statusLabels[m.status]}
                    </small>
                    <h3>{m.title}</h3>
                    <p>{m.description}</p>
                    <p className="small-note">
                      {m.scenario}
                      {m.observedAt
                        ? ` · Observation déclarée le ${m.observedAt}`
                        : ""}
                    </p>
                    <Sources urls={m.evidenceUrls} />
                    {p.visualization.links
                      .filter((l) => l.from === m.id)
                      .map((l, i) => (
                        <p key={i}>
                          <a href={`#${anchor(l.to)}`}>
                            {l.label || "Voir le jalon lié"} →{" "}
                            {
                              p.scenarios
                                .flatMap((s) => s.milestones)
                                .find((m) => m.id === l.to)?.title
                            }
                          </a>
                        </p>
                      ))}
                  </article>
                ))}
              {!p.scenarios.some((s) => s.milestones.length) && (
                <p>Aucun jalon fourni.</p>
              )}
            </div>
          )}
          {module === "scenarios" && (
            <div className="future-grid">
              {p.scenarios.map((s) => (
                <article className="quiet-panel" key={s.id} id={anchor(s.id)}>
                  <small>
                    {
                      {
                        acceleration: "Accélération",
                        moderate: "Progression modérée",
                        slowdown: "Ralentissement",
                        other: "Autre scénario",
                      }[s.path]
                    }{" "}
                    · {s.horizon} · {statusLabels[s.status]}
                  </small>
                  <h3>{s.title}</h3>
                  <p>{s.summary}</p>
                  {(
                    [
                      ["assumptions", "Hypothèses"],
                      ["objections", "Objections et limites"],
                      ["triggers", "Déclencheurs"],
                      ["indicators", "Indicateurs"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key}>
                      <h4>{label}</h4>
                      <ul>
                        {s[key].map((t, i) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ul>
                      {!s[key].length && <p>Non renseigné.</p>}
                    </div>
                  ))}
                  {s.signalIds.length > 0 && (
                    <p>
                      Signaux liés :{" "}
                      {s.signalIds.map((id) => (
                        <a key={id} href={`#${anchor(id)}`}>
                          {p.signals.find((v) => v.id === id)?.title}{" "}
                        </a>
                      ))}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
          {module === "signals" && (
            <div className="future-grid">
              {p.signals.map((s) => (
                <article className="quiet-panel" key={s.id} id={anchor(s.id)}>
                  <small>{statusLabels[s.status]}</small>
                  <h3>{s.title}</h3>
                  <p>{s.description}</p>
                  <p>
                    Dernier contrôle déclaré dans le fichier :{" "}
                    {format(s.lastCheckedAt)}. Aucun contrôle automatique.
                  </p>
                  <p>{s.checkNote}</p>
                  <Sources urls={s.evidenceUrls} />
                </article>
              ))}
              {!p.signals.length && <p>Aucun signal fourni.</p>}
            </div>
          )}
          {module === "actions" && (
            <div className="future-grid">
              {(["now", "3m", "12m"] as const).map((h) => (
                <div key={h}>
                  <h3>{horizons[h]}</h3>
                  {p.actions
                    .filter((a) => a.horizon === h)
                    .map((a) => (
                      <article className="quiet-panel" key={a.id}>
                        <h4>{a.title}</h4>
                        <p>
                          <b>Compétence :</b> {a.skill}
                        </p>
                        <p>{a.description}</p>
                        <p>
                          Effort :{" "}
                          {a.effortHours === null
                            ? "non documenté"
                            : `${a.effortHours} h — ${a.effortEvidence}`}
                        </p>
                        <p>
                          <b>Test décisif :</b> {a.decisiveTest}
                        </p>
                        {a.scenarioIds.length > 0 && (
                          <p>
                            Scénarios concernés :{" "}
                            {a.scenarioIds
                              .map(
                                (id) =>
                                  p.scenarios.find((s) => s.id === id)?.title,
                              )
                              .join(" · ")}
                          </p>
                        )}
                        <label>
                          Suivi de « {a.title} »
                          <select
                            value={personal.actions[a.id]?.status || "todo"}
                            onChange={(e) =>
                              patch({
                                actions: {
                                  ...personal.actions,
                                  [a.id]: {
                                    status: e.target.value as "todo",
                                    result:
                                      personal.actions[a.id]?.result || "",
                                  },
                                },
                              })
                            }
                          >
                            {[
                              ["todo", "À faire"],
                              ["doing", "En cours"],
                              ["done", "Terminé"],
                              ["abandoned", "Abandonné"],
                            ].map(([k, v]) => (
                              <option key={k} value={k}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Résultat de « {a.title} »
                          <textarea
                            defaultValue={personal.actions[a.id]?.result || ""}
                            maxLength={4000}
                            onBlur={(e) => {
                              if (
                                e.target.value !==
                                (personal.actions[a.id]?.result || "")
                              )
                                patch({
                                  actions: {
                                    ...personal.actions,
                                    [a.id]: {
                                      status:
                                        personal.actions[a.id]?.status ||
                                        "todo",
                                      result: e.target.value,
                                    },
                                  },
                                });
                            }}
                          />
                        </label>
                      </article>
                    ))}
                </div>
              ))}
            </div>
          )}
          {module === "changes" && (
            <>
              <p>
                Différences éditoriales de cette révision ; les versions
                précédentes restent accessibles.
              </p>
              <ul>
                {activeVersion?.changes.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
              <details>
                <summary>Historique local complet ({events.length})</summary>
                <ul>
                  {events.map((e) => (
                    <li key={e.id}>
                      {format(e.at)} — {e.description}
                    </li>
                  ))}
                </ul>
              </details>
            </>
          )}
          {module === "sources" && (
            <>
              <p>
                Origine : {p.provenance.title} ·{" "}
                {p.provenance.author || "auteur non renseigné"} · publication :{" "}
                {p.provenance.publishedAt || "non renseignée"} · remise :{" "}
                {format(p.provenance.providedAt)}
              </p>
              {p.provenance.originalUrl && (
                <a
                  href={p.provenance.originalUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Consulter l’origine
                </a>
              )}
              <p>
                Une consultation déclarée par le fichier n’est pas une
                vérification. Une revue personnelle confirme votre consultation,
                sans certifier le fait.
              </p>
              <h3>Contradictions déclarées</h3>
              {p.signals
                .filter((s) => s.status === "contradicted")
                .map((s) => (
                  <article className="quiet-panel" key={s.id}>
                    <h4>{s.title}</h4>
                    <p>{s.description}</p>
                    <p>{s.checkNote}</p>
                    <p>
                      Contrôle déclaré : {format(s.lastCheckedAt)} · aucune
                      certification.
                    </p>
                    <Sources urls={s.evidenceUrls} />
                  </article>
                ))}
              {!p.signals.some((s) => s.status === "contradicted") && (
                <p>Aucune contradiction renseignée dans ce dossier.</p>
              )}
              <div className="future-grid">
                {p.provenance.sources.map((s) => (
                  <article className="quiet-panel" key={s.id}>
                    <h3>{s.label}</h3>
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noreferrer noopener">
                        Ouvrir la source originale
                      </a>
                    ) : (
                      <p>Source privée · aucune URL publique.</p>
                    )}
                    <p>
                      {s.publisher} · {s.author || "auteur non renseigné"} ·{" "}
                      {s.type} · publication :{" "}
                      {s.publishedAt || "non renseignée"}
                    </p>
                    <p>Consultation déclarée : {format(s.consultedAt)}</p>
                    {personal.sourceReviews[s.id] ? (
                      <p>
                        Revue personnelle enregistrée le{" "}
                        {format(personal.sourceReviews[s.id].at)} :{" "}
                        {personal.sourceReviews[s.id].reason}
                      </p>
                    ) : (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const f = e.currentTarget;
                          const reason = String(
                            new FormData(f).get("reason") || "",
                          ).trim();
                          if (reason.length >= 10)
                            patch({
                              sourceReviews: {
                                ...personal.sourceReviews,
                                [s.id]: { at: now(), reason },
                              },
                            });
                        }}
                      >
                        <label>
                          Justifier ma consultation de « {s.label} »
                          <input
                            name="reason"
                            required
                            minLength={10}
                            maxLength={4000}
                          />
                        </label>
                        <button className="secondary">
                          Enregistrer ma revue personnelle
                        </button>
                      </form>
                    )}
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      ))}
      <section className="quiet-panel future-personal">
        <h2>Mes notes et décisions privées</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            patch({
              decision: String(f.get("decision")),
              invalidation: String(f.get("invalidation")),
              reviewDate: String(f.get("reviewDate")),
            });
          }}
        >
          <label>
            Ma décision
            <textarea
              name="decision"
              maxLength={4000}
              defaultValue={personal.decision}
            />
          </label>
          <label>
            Ce qui invaliderait ma décision
            <textarea
              name="invalidation"
              maxLength={4000}
              defaultValue={personal.invalidation}
            />
          </label>
          <label>
            Date de réexamen
            <input
              type="date"
              name="reviewDate"
              defaultValue={personal.reviewDate}
            />
          </label>
          <button className="secondary">Enregistrer ma décision</button>
        </form>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (note.trim())
              run(async () => {
                await futureDb.updatePersonal(documentId, {
                  notes: [
                    ...personal.notes,
                    { id: crypto.randomUUID(), body: note.trim(), at: now() },
                  ],
                });
                setNote("");
              });
          }}
        >
          <label>
            Nouvelle note
            <textarea
              value={note}
              maxLength={20000}
              onChange={(e) => setNote(e.target.value)}
              required
            />
          </label>
          <button className="primary">Ajouter ma note</button>
        </form>
        <ul>
          {personal.notes.map((n) => (
            <li key={n.id}>
              <time>{format(n.at)}</time>
              <p>{n.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
