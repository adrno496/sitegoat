import { useState } from "react";
import type { FuturePersonal } from "./schema";
import type { SavePersonal } from "./FutureActions";
import { now } from "../../data/model";
import { formatDate } from "./selectors";
export function FuturePersonalNotes({
  personal,
  onSave,
}: {
  personal: FuturePersonal;
  onSave: SavePersonal;
}) {
  const [note, setNote] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <section className="quiet-panel future-personal">
      <span className="future-kicker">VOTRE CARNET PRIVÉ</span>
      <h2>Mes notes et décisions privées</h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setBusy(true);
          await onSave({
            decision: String(f.get("decision")),
            invalidation: String(f.get("invalidation")),
            reviewDate: String(f.get("reviewDate")),
          });
          setBusy(false);
        }}
      >
        <fieldset disabled={busy}>
          <label>
            Ma décision
            <textarea
              name="decision"
              maxLength={4000}
              defaultValue={personal.decision}
            />
          </label>
          <label>
            Ce qui invaliderait ma décision
            <textarea
              name="invalidation"
              maxLength={4000}
              defaultValue={personal.invalidation}
            />
          </label>
          <label>
            Date de réexamen
            <input
              name="reviewDate"
              type="date"
              defaultValue={personal.reviewDate}
            />
          </label>
          <button className="secondary">Enregistrer ma décision</button>
        </fieldset>
      </form>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!note.trim()) return;
          setBusy(true);
          const ok = await onSave({
            notes: [{ id: crypto.randomUUID(), body: note.trim(), at: now() }],
          });
          if (ok) setNote("");
          setBusy(false);
        }}
      >
        <label>
          Nouvelle note
          <textarea
            disabled={busy}
            value={note}
            maxLength={20000}
            onChange={(e) => setNote(e.target.value)}
            required
          />
        </label>
        <button disabled={busy} className="primary">
          Ajouter ma note
        </button>
      </form>
      <ul>
        {personal.notes.map((n) => (
          <li key={n.id}>
            <time>{formatDate(n.at)}</time>
            <p>{n.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
