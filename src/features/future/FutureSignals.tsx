import { statusLabels, type FuturePayload } from "./schema";
import { itemAnchor, formatDate } from "./selectors";
import { FutureEvidence, FutureText } from "./FutureEvidence";
const symbols = { observed: "◉", watch: "◷", contradicted: "×", unknown: "?" };
export function FutureSignals({ payload: p }: { payload: FuturePayload }) {
  return (
    <>
      <div className="future-section-heading">
        <span className="future-kicker">03 / SIGNAUX</span>
        <h2>Confronter les trajectoires aux faits.</h2>
        <p>
          Un radar de lecture, sans score de certitude. Les statuts restent ceux
          du dossier.
        </p>
      </div>
      <div className="future-signal-radar" aria-label="Répartition des signaux">
        {(["observed", "watch", "contradicted", "unknown"] as const).map(
          (status) => (
            <div key={status}>
              <span aria-hidden="true">{symbols[status]}</span>
              <b>{p.signals.filter((s) => s.status === status).length}</b>
              <span>{statusLabels[status]}</span>
            </div>
          ),
        )}
      </div>
      <div className="future-grid">
        {p.signals.map((s) => (
          <article
            className="quiet-panel future-signal"
            key={s.id}
            id={itemAnchor(s.id)}
          >
            <span className="future-badge">
              <span aria-hidden="true">{symbols[s.status]} </span>
              {statusLabels[s.status]}
            </span>
            <h3>{s.title}</h3>
            <FutureText text={s.description} />
            <dl className="future-signal-questions">
              <dt>Ce que l’on sait</dt>
              <dd>
                {s.status === "observed"
                  ? "Une observation est déclarée avec ses sources ; elle n’est pas vérifiée indépendamment."
                  : s.status === "contradicted"
                    ? "Une contradiction est déclarée avec ses sources ; elle n’est pas vérifiée indépendamment."
                    : "Non renseigné comme observation sourcée."}
              </dd>
              <dt>Ce que l’on ignore</dt>
              <dd>Non renseigné dans un champ dédié.</dd>
              <dt>Qu’est-ce qui confirmerait ?</dt>
              <dd>Non renseigné comme critère explicite.</dd>
              <dt>Qu’est-ce qui infirmerait ?</dt>
              <dd>Non renseigné comme critère explicite.</dd>
            </dl>
            <details>
              <summary>Sources, contrôle déclaré et objections</summary>
              <p>
                Dernier contrôle déclaré dans le fichier :{" "}
                {formatDate(s.lastCheckedAt)}. Aucun contrôle automatique.
              </p>
              <p>{s.checkNote || "Note de contrôle non renseignée."}</p>
              <FutureEvidence urls={s.evidenceUrls} payload={p} />
              {p.scenarios
                .filter((v) => v.signalIds.includes(s.id))
                .map((v) => (
                  <div key={v.id}>
                    <h4>{v.title}</h4>
                    <p>
                      Les déclencheurs et objections suivants concernent ce
                      scénario ; ils ne constituent pas des critères de
                      validation du signal.
                    </p>
                    <b>Déclencheurs déclarés</b>
                    <ul>
                      {v.triggers.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                    <b>Objections à examiner</b>
                    <ul>
                      {v.objections.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                ))}
            </details>
          </article>
        ))}
      </div>
      {!p.signals.length && (
        <p className="future-empty">Aucun signal fourni.</p>
      )}
    </>
  );
}
