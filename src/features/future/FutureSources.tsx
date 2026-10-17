import type { FuturePayload, FuturePersonal } from "./schema";
import type { SavePersonal } from "./FutureActions";
import { now } from "../../data/model";
import { formatDate } from "./selectors";
import { FutureEvidence } from "./FutureEvidence";
export function FutureSources({
  payload: p,
  personal,
  onSave,
}: {
  payload: FuturePayload;
  personal: FuturePersonal;
  onSave: SavePersonal;
}) {
  return (
    <>
      <div className="future-section-heading">
        <span className="future-kicker">05 / SOURCES</span>
        <h2>Remonter à l’origine.</h2>
      </div>
      <p>
        Origine : {p.provenance.title} ·{" "}
        {p.provenance.author || "auteur non renseigné"} · publication :{" "}
        {p.provenance.publishedAt || "non renseignée"} · remise :{" "}
        {formatDate(p.provenance.providedAt)}
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
        Une consultation déclarée par le fichier n’est pas une vérification. Une
        revue personnelle confirme votre consultation, sans certifier le fait.
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
              Contrôle déclaré : {formatDate(s.lastCheckedAt)} · aucune
              certification.
            </p>
            <FutureEvidence urls={s.evidenceUrls} payload={p} />
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
              {s.publisher} · {s.author || "auteur non renseigné"} · {s.type} ·
              publication : {s.publishedAt || "non renseignée"}
            </p>
            <p>Consultation déclarée : {formatDate(s.consultedAt)}</p>
            {personal.sourceReviews[s.id] ? (
              <p>
                Revue personnelle enregistrée le{" "}
                {formatDate(personal.sourceReviews[s.id].at)} :{" "}
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
                    onSave({
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
  );
}
