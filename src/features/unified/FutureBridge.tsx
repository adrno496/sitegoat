import { useState } from "react";
import type { Edition } from "../../data/model";
import { futureDb, type FutureDocument } from "../future/db";
import { useLive } from "../future/hooks";
import { statusLabels } from "../future/schema";
import { validateFuture } from "../future/import";
import { download } from "../backup";
import { latestUnified } from "./selectors";
export function useFutureCatalog() {
  return useLive(
    () => futureDb.documents.orderBy("updatedAt").reverse().toArray(),
    [],
    null as FutureDocument[] | null,
  );
}
export function FutureBridge({
  editions,
  onFuture,
  catalog,
  compact = false,
}: {
  editions: Edition[];
  onFuture: (id?: string) => void;
  catalog: ReturnType<typeof useFutureCatalog>;
  compact?: boolean;
}) {
  const [kind, setKind] = useState("all"),
    [horizon, setHorizon] = useState(""),
    [error, setError] = useState("");
  const docs = catalog.value || [],
    loadError = catalog.error;
  const insights = latestUnified(editions)
    .flatMap((e) =>
      e.unified!.futureInsights.map((i) => ({
        ...i,
        synthetic: e.unified!.synthetic,
      })),
    )
    .filter((i, index, all) => all.findIndex((x) => x.id === i.id) === index);
  const rows = insights.filter(
    (i) =>
      (kind === "all" ||
        (kind === "observed"
          ? i.status === "observed"
          : i.status !== "observed")) &&
      (!horizon ||
        (horizon === "2040+" ? i.year >= 2040 : String(i.year) === horizon)),
  );
  const packages = latestUnified(editions).flatMap(
    (e) => e.unified!.futureDocuments,
  );
  return (
    <section className="unified-timeline">
      <p className="eyebrow">OBSERVATIONS ET POSSIBILITÉS, DISTINCTES</p>
      <h2>Chronologie IA & Futur</h2>
      <p>
        Une hypothèse n’est pas un fait. Les preuves, objections et conditions
        restent celles des documents. Aucun score « vers AGI ».
      </p>
      <div
        className="unified-controls"
        role="group"
        aria-label="Nature de la chronologie"
      >
        {[
          ["all", "Tout"],
          ["observed", "Faits observés"],
          ["trajectories", "Trajectoires"],
        ].map(([id, label]) => (
          <button
            className="secondary"
            key={id}
            aria-pressed={kind === id}
            onClick={() => setKind(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        className="unified-controls"
        role="group"
        aria-label="Horizons IA et Futur"
      >
        {["", "2027", "2030", "2035", "2040+"].map((y) => (
          <button
            className="secondary"
            key={y}
            aria-pressed={horizon === y}
            onClick={() => setHorizon(y)}
          >
            {y || "Toutes les dates"}
          </button>
        ))}
      </div>
      <div className="unified-insights">
        {rows.slice(0, compact ? 3 : 50).map((i) => (
          <article className="unified-panel" key={i.id}>
            <span className="unified-badge">
              {i.year} · {statusLabels[i.status]}{" "}
              {i.synthetic ? "· SYNTHÉTIQUE" : ""}
            </span>
            <h3>{i.title}</h3>
            <p>{i.description}</p>
            <p>
              Observation : {i.observedAt || "non établie"} · Publication :{" "}
              {i.publishedAt || "non renseignée"} · Vérification :{" "}
              {i.verifiedAt || "non renseignée"}
            </p>
            <details>
              <summary>Preuves, objections et invalidation</summary>
              <p>Objections : {i.objections || "Non renseignées"}</p>
              <p>
                Déclencheur : {i.trigger || "Non renseigné"} · Invalidation :{" "}
                {i.invalidation || "Non renseignée"}
              </p>
              {i.evidence.length ? (
                i.evidence.map((s) => (
                  <p key={s.id}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.label}
                    </a>{" "}
                    · {s.publishedAt}
                  </p>
                ))
              ) : (
                <p>Aucune preuve fournie : hypothèse non certifiée.</p>
              )}
            </details>
            {i.futureDocumentId &&
              docs.some((d) => d.documentId === i.futureDocumentId) && (
                <button
                  className="secondary"
                  onClick={() => onFuture(i.futureDocumentId)}
                >
                  Ouvrir le dossier lié
                </button>
              )}
          </article>
        ))}
      </div>
      {!rows.length && (
        <p>
          Aucun jalon importé pour cette sélection. Aucune trajectoire n’est
          inventée.
        </p>
      )}
      <h3>Dossiers de l’atlas existant</h3>
      {loadError && (
        <p role="alert">
          L’atlas est indisponible ; vos journaux restent accessibles.{" "}
          {loadError}
        </p>
      )}
      {docs.slice(0, compact ? 3 : 20).map((d) => (
        <button
          className="unified-result"
          key={d.documentId}
          onClick={() => onFuture(d.documentId)}
        >
          <b>{d.title}</b>
          <span>
            {statusLabels[d.status]} · révision {d.revision} · {d.updatedAt}
            {d.synthetic ? " · SYNTHÉTIQUE" : ""}
          </span>
        </button>
      ))}
      <button className="secondary" onClick={() => onFuture()}>
        Explorer tout l’atlas et ses versions
      </button>
      {packages.length > 0 && (
        <details>
          <summary>Transférer un dossier Future validé</summary>
          <p>
            Exportez le JSON, puis utilisez l’import Le Futur avec confirmation.
            Les notes et sauvegardes restent séparées ; aucune écriture
            simultanée entre bases.
          </p>
          {packages.map((p) => (
            <button
              className="secondary"
              key={p.documentId + ":" + p.revision}
              onClick={() => {
                try {
                  const checked = validateFuture(p);
                  download(
                    new Blob([JSON.stringify(checked, null, 2)], {
                      type: "application/json",
                    }),
                    "Future-" + p.documentId + ".json",
                  );
                  setError("");
                } catch (e) {
                  setError(String(e));
                }
              }}
            >
              Exporter Future JSON : {p.title}
            </button>
          ))}
        </details>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
