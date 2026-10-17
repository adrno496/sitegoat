import type { FuturePayload } from "./schema";
import { contentCounts } from "./selectors";
export type AtlasCounts = ReturnType<typeof contentCounts>;
export function FutureSummary({ counts }: { counts: AtlasCounts }) {
  return (
    <div className="future-summary" aria-label="Résumé d’une minute">
      <article>
        <span className="future-kicker">01 / Faits observés</span>
        <strong>{counts.observations}</strong>
        <p>
          Observations déclarées et sourcées. Aucune vérification indépendante
          par Journal 360.
        </p>
      </article>
      <article>
        <span className="future-kicker">02 / Hypothèses à surveiller</span>
        <strong>{counts.hypotheses}</strong>
        <p>
          Scénarios, jalons prospectifs et signaux à surveiller ; des
          possibilités à éprouver.
        </p>
      </article>
      <article>
        <span className="future-kicker">03 / Actions concrètes</span>
        <strong>{counts.actions}</strong>
        <p>
          Actions proposées par les dossiers. Votre suivi personnel reste privé
          et local.
        </p>
      </article>
    </div>
  );
}
export function FutureOverview({ payload: p }: { payload: FuturePayload }) {
  return (
    <section
      id="future-atlas-overview"
      className="future-overview"
      tabIndex={-1}
    >
      <div className="future-section-heading">
        <span className="future-kicker">VUE D’ENSEMBLE</span>
        <h2>L’essentiel, avant d’explorer.</h2>
        <p>{p.editorialDecision.reason}</p>
      </div>
      <FutureSummary counts={contentCounts(p)} />
      <ol className="future-essentials">
        <li>
          <b>Une trajectoire possible</b>
          <p>{p.scenarios[0]?.summary || "Aucun scénario renseigné."}</p>
        </li>
        <li>
          <b>Une objection à garder en tête</b>
          <p>
            {p.scenarios.flatMap((s) => s.objections)[0] || "Non renseigné."}
          </p>
        </li>
        <li>
          <b>Un premier pas concret</b>
          <p>{p.actions[0]?.title || "Aucune action renseignée."}</p>
        </li>
      </ol>
      <p className="future-disclaimer">
        Les observations sont déclarées dans le dossier. Une hypothèse ou un
        scénario n’est jamais une garantie.
      </p>
    </section>
  );
}
