import { useState } from "react";
import type { FuturePayload, FuturePersonal } from "./schema";
import { actionLabels, horizonLabels, preparationCounts } from "./selectors";
export type SavePersonal = (patch: Partial<FuturePersonal>) => Promise<boolean>;
export function FutureActions({
  payload: p,
  personal,
  onSave,
}: {
  payload: FuturePayload;
  personal: FuturePersonal;
  onSave: SavePersonal;
}) {
  const counts = preparationCounts(p, personal);
  return (
    <>
      <div className="future-section-heading">
        <span className="future-kicker">04 / MA PRÉPARATION</span>
        <h2>Se préparer, un pas à la fois.</h2>
        <p>
          Votre feuille de route privée. La progression reflète uniquement les
          statuts enregistrés sur cet appareil.
        </p>
      </div>
      <div className="future-progress">
        <span>
          <b>
            {counts.done} / {p.actions.length}
          </b>{" "}
          actions terminées
        </span>
        <progress
          value={counts.done}
          max={Math.max(1, p.actions.length)}
          aria-label="Actions terminées"
        />
        <ul>
          {Object.entries(counts).map(([key, count]) => (
            <li key={key}>
              {actionLabels[key as keyof typeof actionLabels]} : {count}
            </li>
          ))}
        </ul>
      </div>
      <div className="future-roadmap">
        {(["now", "3m", "12m"] as const).map((h, i) => (
          <section className="future-roadmap-stage" key={h}>
            <h3>
              <span aria-hidden="true">0{i + 1}</span>
              {horizonLabels[h]}
            </h3>
            {p.actions
              .filter((a) => a.horizon === h)
              .map((a) => (
                <ActionCard
                  key={a.id}
                  action={a}
                  saved={personal.actions[a.id]}
                  payload={p}
                  onSave={onSave}
                />
              ))}
            {!p.actions.some((a) => a.horizon === h) && (
              <p className="future-missing">Aucune action renseignée.</p>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
function ActionCard({
  action: a,
  saved,
  payload: p,
  onSave,
}: {
  action: FuturePayload["actions"][number];
  saved: FuturePersonal["actions"][string] | undefined;
  payload: FuturePayload;
  onSave: SavePersonal;
}) {
  const [draft, setDraft] = useState<{
      status: keyof typeof actionLabels;
      result: string;
    } | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [failed, setFailed] = useState(false);
  const value = draft || saved || { status: "todo" as const, result: "" };
  return (
    <article className="quiet-panel future-action">
      <span className="future-badge">
        {actionLabels[saved?.status || "todo"]}
      </span>
      <h4>{a.title}</h4>
      <p>
        <b>Compétence :</b> {a.skill}
      </p>
      <p>
        <b>Impact proposé :</b> {a.description}
      </p>
      <div className="future-decisive">
        <b>Test décisif</b>
        <p>{a.decisiveTest}</p>
      </div>
      <details>
        <summary>Effort et scénarios concernés</summary>
        <p>
          {a.effortHours === null
            ? "Effort non documenté."
            : a.effortHours + " h — " + a.effortEvidence}
        </p>
        <p>
          Scénarios concernés :{" "}
          {a.scenarioIds
            .map((id) => p.scenarios.find((s) => s.id === id)?.title)
            .join(" · ") || "Non renseigné."}
        </p>
      </details>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setFailed(false);
          const ok = await onSave({ actions: { [a.id]: value } });
          if (ok) {
            setDraft(null);
            setMessage("Action enregistrée sur cet appareil.");
          } else {
            setFailed(true);
            setMessage(
              "Échec de sauvegarde. Vos saisies sont conservées ici ; réessayez.",
            );
          }
          setBusy(false);
        }}
      >
        <label>
          Suivi de « {a.title} »
          <select
            disabled={busy}
            value={value.status}
            onChange={(e) => {
              setDraft({
                ...value,
                status: e.target.value as keyof typeof actionLabels,
              });
              setMessage("Modification non enregistrée.");
            }}
          >
            {Object.entries(actionLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Résultat de « {a.title} »
          <textarea
            disabled={busy}
            value={value.result}
            maxLength={4000}
            onChange={(e) => {
              setDraft({ ...value, result: e.target.value });
              setMessage("Modification non enregistrée.");
            }}
          />
        </label>
        <button className="secondary" disabled={busy}>
          {busy ? "Enregistrement…" : "Enregistrer l’action"}
        </button>
        <p className="future-save-status" role={failed ? "alert" : "status"}>
          {message || "Votre suivi reste privé."}
        </p>
      </form>
    </article>
  );
}
