import { summaryPreview } from "../eventPresentation";
import { useInterface } from "../interfacePreferences";
import { useState } from "react";
import type { Edition } from "../../data/model";
import { futureDb, type FutureDocument } from "../future/db";
import { useLive } from "../future/hooks";
import { statusLabels } from "../future/schema";
import { validateFuture } from "../future/import";
import { download } from "../backup";
import { unifiedVersions } from "./selectors";
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
  onOpen,
  compact = false,
}: {
  editions: Edition[];
  onFuture: (id?: string) => void;
  catalog: ReturnType<typeof useFutureCatalog>;
  onOpen?: (id: string, article?: string) => void;
  compact?: boolean;
}) {
  const {
    preferences: { options },
  } = useInterface();
  const [kind, setKind] = useState("all"),
    [horizon, setHorizon] = useState(""),
    [error, setError] = useState(""),
    [openPackage, setOpenPackage] = useState(""),
    [insightLimit, setInsightLimit] = useState(50),
    [packageLimit, setPackageLimit] = useState(20);
  const docs = catalog.value || [],
    loadError = catalog.error;
  const insights = unifiedVersions(editions)
    .flatMap((e) =>
      e.unified!.futureInsights.map((i) => ({
        ...i,
        synthetic: e.unified!.synthetic,
        origin: e,
        key: e.date + ":" + i.id,
      })),
    )
    .filter((i, index, all) => all.findIndex((x) => x.key === i.key) === index);
  const rows = insights.filter(
    (i) =>
      (kind === "all" ||
        (kind === "observed"
          ? i.status === "observed"
          : i.status !== "observed")) &&
      (!horizon ||
        (horizon === "2040+" ? i.year >= 2040 : String(i.year) === horizon)),
  );
  const packages = unifiedVersions(editions)
    .flatMap((e) => e.unified!.futureDocuments.map((p) => ({ p, origin: e })))
    .filter(
      (x, index, all) =>
        all.findIndex(
          (y) =>
            y.p.documentId === x.p.documentId && y.p.revision === x.p.revision,
        ) === index,
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
        {["", "2026", "2027", "2030", "2035", "2040+"].map((y) => (
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
        {rows.slice(0, compact ? 3 : insightLimit).map((i) => (
          <article className="unified-panel" key={i.key}>
            <span className="unified-badge">
              {i.year} · {statusLabels[i.status]}{" "}
              {i.synthetic ? "· SYNTHÉTIQUE" : ""}
            </span>
            <h3>{i.title}</h3>
            <p>{summaryPreview(i.description)}</p>
            <p className="small-note">
              Original : {i.origin.editionSlot} · révision{" "}
              {i.origin.externalRevision} · {i.origin.date}
            </p>
            <details open={options.sources || undefined}>
              <summary>Développer le jalon</summary>
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
            </details>
            {i.eventId && onOpen && (
              <button
                className="secondary"
                onClick={() =>
                  onOpen(
                    i.origin.id,
                    i.origin.unified!.items.find(
                      (a) => a.eventId === i.eventId,
                    )!.id,
                  )
                }
              >
                Ouvrir l’article lié
              </button>
            )}
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
      {!compact && rows.length > insightLimit && (
        <button
          className="secondary"
          onClick={() => setInsightLimit((v) => v + 50)}
        >
          Afficher plus de jalons
        </button>
      )}
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
          {packages.slice(0, packageLimit).map(({ p, origin }) => (
            <div key={p.documentId + ":" + p.revision}>
              <details
                onToggle={(event) => {
                  const open = event.currentTarget.open;
                  const key = p.documentId + ":" + p.revision;
                  setOpenPackage((current) =>
                    open ? key : current === key ? "" : current,
                  );
                }}
              >
                <summary>Dossier embarqué : {p.title}</summary>
                <p>
                  Original : {origin.editionSlot} · révision{" "}
                  {origin.externalRevision}. Consultation sans import dans
                  l’atlas.
                </p>
                {openPackage === p.documentId + ":" + p.revision && (
                  <label>
                    Contenu intégral du dossier
                    <textarea
                      readOnly
                      value={JSON.stringify(p, null, 2)}
                      rows={12}
                    />
                  </label>
                )}
              </details>
              <button
                className="secondary"
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
            </div>
          ))}
          {packages.length > packageLimit && (
            <button
              className="secondary"
              onClick={() => setPackageLimit((v) => v + 20)}
            >
              Afficher plus de dossiers embarqués
            </button>
          )}
        </details>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
