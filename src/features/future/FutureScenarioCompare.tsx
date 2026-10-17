import { useState } from "react";
import { statusLabels, type FuturePayload } from "./schema";
import { itemAnchor, pathLabels, scenarioEvidence } from "./selectors";
import { FutureEvidence, FutureText } from "./FutureEvidence";
export function FutureScenarioCompare({
  payload: p,
}: {
  payload: FuturePayload;
}) {
  const [detailed, setDetailed] = useState(false);
  function card(s: FuturePayload["scenarios"][number]) {
    return (
      <article
        className="future-scenario quiet-panel"
        key={s.id}
        id={itemAnchor(s.id)}
      >
        <span className="future-badge">
          {statusLabels[s.status]} ·{" "}
          {s.horizon === "unspecified" ? "Horizon non précisé" : s.horizon}
        </span>
        <h3>{s.title}</h3>
        <FutureText text={s.summary} />
        <details open={detailed}>
          <summary>Hypothèses et conditions</summary>
          <h4>Hypothèses</h4>
          <Items items={s.assumptions} />
          <h4>Déclencheurs</h4>
          <Items items={s.triggers} />
          <h4>Indicateurs à suivre</h4>
          <Items items={s.indicators} />
          <h4>Implications</h4>
          <p>Non renseigné dans un champ dédié ; voir le résumé du scénario.</p>
        </details>
        <details open={detailed}>
          <summary>Voir les objections</summary>
          <Items items={s.objections} />
        </details>
        <details open={detailed}>
          <summary>Voir les sources</summary>
          <p>
            Références déclarées dans les jalons et signaux liés à ce scénario.
          </p>
          <FutureEvidence urls={scenarioEvidence(p, s.id)} payload={p} />
        </details>
        {s.signalIds.length > 0 && (
          <div className="future-linked-signals">
            <b>Signaux liés</b>
            <ul>
              {s.signalIds.map((id) => (
                <li key={id}>
                  {p.visualization.modules.includes("signals") ? (
                    <a href={"#" + itemAnchor(id)}>
                      {p.signals.find((v) => v.id === id)?.title}
                    </a>
                  ) : (
                    p.signals.find((v) => v.id === id)?.title
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>
    );
  }
  return (
    <>
      <div className="future-section-heading">
        <span className="future-kicker">02 / SCÉNARIOS</span>
        <h2>Plusieurs futurs. Un regard critique.</h2>
        <p>
          Comparez les conditions et les objections, sans probabilité ni
          classement inventé.
        </p>
        <button aria-pressed={detailed} onClick={() => setDetailed((v) => !v)}>
          {detailed ? "Vue compacte" : "Vue détaillée"}
        </button>
      </div>
      {!p.scenarios.length ? (
        <p className="future-empty">
          Aucun scénario fourni. Aucune trajectoire n’est inventée.
        </p>
      ) : (
        <>
          <div className="future-scenario-compare">
            {(["acceleration", "moderate", "slowdown"] as const).map((path) => (
              <section
                className={"future-lane future-lane-" + path}
                key={path}
                aria-label={pathLabels[path]}
              >
                <h3 className="future-lane-title">{pathLabels[path]}</h3>
                {p.scenarios.filter((s) => s.path === path).map(card)}
                {!p.scenarios.some((s) => s.path === path) && (
                  <p className="future-missing">Trajectoire non renseignée.</p>
                )}
              </section>
            ))}
          </div>
          {p.scenarios.some((s) => s.path === "other") && (
            <section className="future-other">
              <h3>Autres trajectoires</h3>
              <div className="future-grid">
                {p.scenarios.filter((s) => s.path === "other").map(card)}
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
function Items({ items }: { items: string[] }) {
  return items.length ? (
    <ul>
      {items.map((text, i) => (
        <li key={i}>{text}</li>
      ))}
    </ul>
  ) : (
    <p className="future-missing">Non renseigné.</p>
  );
}
