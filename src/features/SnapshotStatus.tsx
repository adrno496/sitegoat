import type { Assessment } from "../data/day";
export function SnapshotStatus({ assessment }: { assessment: Assessment }) {
  const s = assessment.snapshot;
  if (!s) return null;
  return (
    <div
      className="snapshot-status"
      role="group"
      aria-label="État du snapshot"
      data-integrity={s.integrity}
      data-autonomy={s.autonomy}
      data-coverage={s.coverage}
      data-history={s.history}
    >
      <p>
        <strong>{s.availableArticles} articles disponibles</strong> ·{" "}
        {s.autonomy === "AUTONOMOUS"
          ? "contenu autonome"
          : "contenu du snapshot incomplet par rapport aux témoins locaux"}
      </p>
      <p>
        Intégrité : structure validée à l’import. Couverture des faits :{" "}
        {s.coverage === "PARTIAL"
          ? "partielle ou contradictoire"
          : "non certifiée (UNKNOWN)"}
        .
      </p>
      <p>
        Historique : {s.importedFiles} fichier(s) distinct(s) importé(s) ·{" "}
        {s.history === "FULL_CHAIN"
          ? "tous les créneaux reçus"
          : s.history === "SINGLE_SNAPSHOT"
            ? "snapshot unique"
            : "versions intermédiaires non importées"}
        .
      </p>
      {s.nonImportedSlots.length > 0 && (
        <p className="small-note">
          Historique intermédiaire non importé (facultatif) :{" "}
          {s.nonImportedSlots.join(" / ")}. Cela ne signifie pas que des
          articles sont absents du fichier.
        </p>
      )}
      <p className="small-note">
        {s.comparisonAvailable
          ? `${assessment.newEvents} événement(s) supplémentaire(s) dans votre historique · ${assessment.corrections} modification(s) de contenu comparées. Aucune nouveauté factuelle n’est certifiée.`
          : "Comparaison avec une édition antérieure : NON DISPONIBLE."}
      </p>
      {assessment.issues.map((issue) => (
        <p className="warning" key={issue}>
          {issue}
        </p>
      ))}
    </div>
  );
}
