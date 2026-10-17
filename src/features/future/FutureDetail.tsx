import { useEffect, useRef, useState } from "react";
import { download } from "../backup";
import { blobOf, now } from "../../data/model";
import { radarReaderHTML } from "../aiRadar/import";
import {
  futureDb,
  type FutureVersion,
  type FutureDocument,
  type FutureChange,
} from "./db";
import {
  moduleLabels,
  personalSchema,
  statusLabels,
  type FuturePayload,
  type FuturePersonal,
} from "./schema";
import { renderFutureHTML } from "./html";
import { useLive } from "./hooks";
import { formatDate } from "./selectors";
import { FutureOverview } from "./FutureOverview";
import { FutureTimeline } from "./FutureTimeline";
import { FutureScenarioCompare } from "./FutureScenarioCompare";
import { FutureSignals } from "./FutureSignals";
import { FutureActions } from "./FutureActions";
import { FutureSources } from "./FutureSources";
import { FuturePersonalNotes } from "./FuturePersonalNotes";
const verdicts = {
  integrer: "Intégrer",
  surveiller: "À surveiller",
  ecarter: "Écarter",
};
export default function FutureDetail({
  documentId,
  onBack,
  initialSection = "overview",
}: {
  documentId: string;
  onBack: () => void;
  initialSection?: string;
}) {
  const { value: dossier, error: documentError } = useLive(
    () => futureDb.documents.get(documentId),
    [documentId],
    undefined as FutureDocument | undefined,
  );
  const { value: versions, error: versionsError } = useLive(
    () =>
      futureDb.versions
        .where("documentId")
        .equals(documentId)
        .sortBy("revision"),
    [documentId],
    [] as FutureVersion[],
  );
  const { value: saved, error: personalError } = useLive(
    () => futureDb.personal.get(documentId),
    [documentId],
    undefined as FuturePersonal | undefined,
  );
  const { value: events, error: eventsError } = useLive(
    () => futureDb.changes.where("documentId").equals(documentId).sortBy("at"),
    [documentId],
    [] as FutureChange[],
  );
  const [versionId, setVersionId] = useState(""),
    [payload, setPayload] = useState<FuturePayload | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [preview, setPreview] = useState("");
  const heading = useRef<HTMLHeadingElement>(null),
    focused = useRef(false),
    previewButton = useRef<HTMLButtonElement>(null);
  const chosen = versionId || dossier?.latest;
  useEffect(() => {
    let active = true;
    setPreview("");
    if (chosen)
      futureDb.contents
        .get(chosen)
        .then((c) => {
          if (active) {
            setPayload(c?.payload || null);
            if (!c)
              setError(
                "Snapshot indisponible. Revenez à la liste ou restaurez une sauvegarde.",
              );
          }
        })
        .catch((e) => {
          if (active) setError(String(e));
        });
    return () => {
      active = false;
    };
  }, [chosen]);
  useEffect(() => {
    if (!payload || focused.current) return;
    focused.current = true;
    if (initialSection === "overview") heading.current?.focus();
    else
      (
        document.getElementById("future-module-" + initialSection) ||
        heading.current
      )?.focus();
  }, [payload, initialSection]);
  async function run(action: () => Promise<unknown>, success = "") {
    setError("");
    try {
      await action();
      if (success) setMessage(success);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }
  const loadError =
    documentError || versionsError || personalError || eventsError;
  if (!payload)
    return (
      <div>
        <button onClick={onBack}>← Tous les dossiers</button>
        {loadError || error ? (
          <p role="alert">{loadError || error}</p>
        ) : (
          <p role="status">Ouverture du dossier…</p>
        )}
      </div>
    );
  const p = payload,
    personal = saved || personalSchema.parse({ documentId, updatedAt: now() }),
    activeVersion = versions.find((v) => v.id === chosen);
  const patch = (value: Partial<FuturePersonal>) =>
    run(
      () => futureDb.updatePersonal(documentId, value),
      "Modifications enregistrées sur cet appareil.",
    );
  const components = {
    timeline: <FutureTimeline key={chosen} payload={p} />,
    scenarios: <FutureScenarioCompare payload={p} />,
    signals: <FutureSignals payload={p} />,
    actions: <FutureActions payload={p} personal={personal} onSave={patch} />,
    sources: <FutureSources payload={p} personal={personal} onSave={patch} />,
    changes: (
      <>
        <div className="future-section-heading">
          <span className="future-kicker">HISTORIQUE</span>
          <h2>Ce qui a changé.</h2>
        </div>
        <p>
          Différences éditoriales de cette révision ; les versions précédentes
          restent accessibles.
        </p>
        <ul>
          {activeVersion?.changes.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
        <details>
          <summary>Historique local complet ({events.length})</summary>
          <ul>
            {[...events].reverse().map((e) => (
              <li key={e.id}>
                {formatDate(e.at)} — {e.description}
              </li>
            ))}
          </ul>
        </details>
      </>
    ),
  };
  return (
    <article
      className="future-detail"
      data-document-motion={p.visualization.motion}
    >
      <button className="text-button future-back" onClick={onBack}>
        ← Tous les dossiers
      </button>
      <header className="future-dossier-header">
        <span className="future-kicker">
          DOSSIER PROSPECTIF / RÉVISION {p.revision}
        </span>
        <h2 ref={heading} tabIndex={-1}>
          {p.title}
        </h2>
        <p>
          <span className="future-badge">{statusLabels[p.status]}</span>
          {p.synthetic && (
            <span className="future-badge">EXEMPLE SYNTHÉTIQUE</span>
          )}
        </p>
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
                    Révision {v.revision} · {formatDate(v.updatedAt)}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <details className="future-file-tools">
          <summary>Exports, original et empreinte</summary>
          <div className="future-tools">
            <button
              onClick={() =>
                run(async () => {
                  download(
                    blobOf(
                      new TextEncoder().encode(JSON.stringify(p, null, 2)),
                      "application/json",
                    ),
                    p.documentId + ".json",
                  );
                })
              }
            >
              Exporter JSON
            </button>
            <button
              onClick={() =>
                run(async () => {
                  download(
                    blobOf(
                      new TextEncoder().encode(renderFutureHTML(p)),
                      "text/html",
                    ),
                    p.documentId + ".html",
                  );
                })
              }
            >
              Exporter HTML portable
            </button>
            <button
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
                ref={previewButton}
                onClick={() =>
                  run(async () =>
                    setPreview(
                      radarReaderHTML(
                        new TextEncoder().encode(
                          renderFutureHTML(p).replace(
                            "</head>",
                            "<style>*,*::before,*::after{animation:none!important;transition:none!important}</style></head>",
                          ),
                        ),
                      ),
                    ),
                  )
                }
              >
                Voir l’aperçu HTML isolé
              </button>
            )}
          </div>
          <p className="future-caption">
            Empreinte SHA-256 : {activeVersion?.sha256}
          </p>
        </details>
        <p className="future-caption">
          Les notes et le suivi personnel concernent le dossier, quelle que soit
          la version affichée.
        </p>
      </header>
      {(error || loadError) && (
        <p role="alert" className="warning">
          {error || loadError}
        </p>
      )}
      <p className="future-save-status" role="status">
        {message}
      </p>
      {preview && (
        <section>
          <button
            onClick={() => {
              setPreview("");
              previewButton.current?.focus();
            }}
          >
            Fermer l’aperçu
          </button>
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
        <a href="#future-atlas-overview">Vue d’ensemble</a>
        {p.visualization.modules
          .filter((m) => m !== "changes")
          .map((m) => (
            <a key={m} href={"#future-module-" + m}>
              {m === "scenarios"
                ? "Scénarios"
                : m === "sources"
                  ? "Sources"
                  : moduleLabels[m]}
            </a>
          ))}
        <a href="#future-personal-notes">Mon carnet</a>
        {p.visualization.modules.includes("changes") && (
          <a href="#future-module-changes">Évolutions</a>
        )}
      </nav>
      <FutureOverview payload={p} />
      {p.visualization.modules.map((module) => (
        <section
          className="future-module"
          id={"future-module-" + module}
          tabIndex={-1}
          key={module}
        >
          {components[module]}
        </section>
      ))}
      <div id="future-personal-notes" tabIndex={-1}>
        <FuturePersonalNotes personal={personal} onSave={patch} />
      </div>
    </article>
  );
}
