import { useInterface } from "../interfacePreferences";
import { useState } from "react";
import type { Edition } from "../../data/model";
import {
  economicRows,
  economyFreshness,
  economicDelta,
  zoneLabels,
  economicLabels,
} from "./selectors";
export function EconomyRadar({
  editions,
  compact = false,
}: {
  editions: Edition[];
  compact?: boolean;
}) {
  const {
    preferences: { options },
  } = useInterface();
  const [zone, setZone] = useState(""),
    [period, setPeriod] = useState(""),
    [indicator, setIndicator] = useState("");
  const rows = economicRows(editions),
    filtered = rows.filter(
      (r) =>
        (!zone || r.data.zone === zone) &&
        (!period || r.data.period === period) &&
        (!indicator || r.data.indicator === indicator),
    );
  return (
    <section
      aria-labelledby={compact ? "economy-preview-title" : "economy-title"}
    >
      <p className="eyebrow">LES CHIFFRES, LEUR DATE, LEURS LIMITES</p>
      <h2 id={compact ? "economy-preview-title" : "economy-title"}>
        Radar économique mondial
      </h2>
      <p>
        France, Europe, États-Unis, Chine. Les statuts sont déclarés par les
        sources importées ; aucune certification ni recommandation financière
        personnelle.
      </p>
      {!compact && (
        <div className="unified-filters">
          <label>
            Zone économique
            <select value={zone} onChange={(e) => setZone(e.target.value)}>
              <option value="">Toutes les zones</option>
              {Object.entries(zoneLabels).map(([k, v]) => (
                <option value={k} key={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            Période statistique
            <select value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="">Toutes les périodes</option>
              {[...new Set(rows.map((r) => r.data.period))].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Indicateur économique
            <select
              value={indicator}
              onChange={(e) => setIndicator(e.target.value)}
            >
              <option value="">Tous les indicateurs</option>
              {[...new Set(rows.map((r) => r.data.indicator))].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        </div>
      )}
      <div className="unified-zones">
        {Object.entries(zoneLabels)
          .filter(([k]) => !zone || zone === k)
          .map(([key, label]) => {
            const zoneRows = filtered.filter((r) => r.data.zone === key);
            return (
              <article className="unified-panel" key={key}>
                <h3>{label}</h3>
                {zoneRows.length ? (
                  zoneRows
                    .slice(0, compact ? 1 : 20)
                    .map(({ data: e, edition }) => {
                      const delta = economicDelta(e),
                        stale = economyFreshness(e);
                      return (
                        <div
                          className="economic-reading"
                          key={JSON.stringify([e.id, e.period, e.publishedAt])}
                        >
                          {edition.unified?.synthetic && (
                            <strong className="unified-badge">
                              SYNTHÉTIQUE · chiffres fictifs
                            </strong>
                          )}
                          <p className="unified-badge">
                            {stale.startsWith("Donnée ancienne") ||
                            !e.verifiedAt
                              ? "Indéterminé"
                              : economicLabels[e.status]}
                          </p>
                          <h4>{e.indicator}</h4>
                          <p className="economic-value">
                            {new Intl.NumberFormat("fr-FR", {
                              maximumFractionDigits: 4,
                            }).format(e.value)}{" "}
                            <small>{e.unit}</small>
                          </p>
                          <p>
                            Période : {e.period} · Statistique :{" "}
                            {e.statisticDate}
                          </p>
                          <p>
                            Variation comparable :{" "}
                            {delta === null
                              ? "Non disponible"
                              : `${delta > 0 ? "+" : ""}${new Intl.NumberFormat("fr-FR").format(delta)} ${e.unit} depuis ${e.comparison!.period}`}
                          </p>
                          <details open={options.sources || undefined}>
                            <summary>
                              Développer la méthode, les limites et les sources
                            </summary>
                            <dl>
                              <dt>Dernière statistique</dt>
                              <dd>
                                {e.statisticDate} · période {e.period} ·{" "}
                                {e.frequency}
                              </dd>
                              <dt>Situation / raison</dt>
                              <dd>{e.reading || "Non renseignée"}</dd>
                              <dt>Variation comparable</dt>
                              <dd>
                                {delta === null
                                  ? "Non disponible"
                                  : `${delta > 0 ? "+" : ""}${new Intl.NumberFormat("fr-FR").format(delta)} ${e.unit} depuis ${e.comparison!.period}`}
                              </dd>
                              <dt>Risque / contre-argument</dt>
                              <dd>
                                {e.risk || "Non renseigné"} ·{" "}
                                {e.counterArgument || "Non renseigné"}
                              </dd>
                              <dt>État de la donnée</dt>
                              <dd>
                                {stale} · publication {e.publishedAt} · contrôle{" "}
                                {e.verifiedAt || "absent"}
                              </dd>
                            </dl>
                            <details>
                              <summary>
                                Source, définition et décision générale
                              </summary>
                              <p>
                                {e.provider} · série {e.seriesCode} ·{" "}
                                {e.definition}
                              </p>
                              {e.sourceRecords.map((s) => (
                                <p key={s.id}>
                                  <a
                                    href={s.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    {s.label}
                                  </a>{" "}
                                  · {s.publishedAt}
                                </p>
                              ))}
                              <p>
                                Pour moi :{" "}
                                {edition.unified?.synthetic
                                  ? "indéterminé (données fictives)"
                                  : e.personalAction ||
                                    "aucune action établie"}{" "}
                                · {e.personalReason}
                              </p>
                            </details>
                          </details>
                        </div>
                      );
                    })
                ) : (
                  <>
                    <p className="unified-badge">Indéterminé</p>
                    <p>
                      Aucune statistique importée pour cette zone et ces
                      filtres. Source, tendance et risque non établis.
                    </p>
                  </>
                )}
                {zoneRows.length > (compact ? 1 : 20) && (
                  <p>
                    {zoneRows.length - (compact ? 1 : 20)} publication(s)
                    supplémentaire(s) : affinez les filtres.
                  </p>
                )}
              </article>
            );
          })}
      </div>
    </section>
  );
}
