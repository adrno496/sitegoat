import { useRef, useState, useMemo } from "react";
import { db } from "../data/db";
import { download, restoreBackup, type BackupData } from "./backup";
import {
  archiveBudget,
  exportSegments,
  inspectSegments,
} from "./segmentedBackup";

export function SegmentedBackupTools({
  data,
}: {
  data: Pick<BackupData, "editions" | "states" | "notes">;
}) {
  const budget = useMemo(() => archiveBudget(data), [data]);
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [parts, setParts] = useState<{ filename: string; blob: Blob }[]>([]);
  const [preview, setPreview] = useState<BackupData>();
  async function prepare() {
    setBusy(true);
    setStatus("");
    setParts([]);
    try {
      const snapshot = await db.snapshot(),
        budget = archiveBudget(snapshot),
        prepared = [];
      for await (const p of exportSegments(db, snapshot)) prepared.push(p);
      setParts(prepared);
      setStatus(
        `${budget.editions} éditions · ${Math.ceil((budget.originalBytes + budget.manifestBytes) / 1024 / 1024)} Mio estimés. Téléchargez chaque segment ET l’inventaire dans un même dossier. Le Futur et réglages exclus.`,
      );
    } catch (e) {
      setStatus(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="quiet-panel">
      <h3>Journaux volumineux : sauvegarde segmentée</h3>
      <p>
        Budget actuel : {budget.editions} éditions ·{" "}
        {Math.ceil(budget.originalBytes / 1024 / 1024)} Mio d’originaux ·{" "}
        {Math.ceil(budget.manifestBytes / 1024 / 1024)} Mio de métadonnées
        estimées.
      </p>
      {budget.segmentedRecommended && (
        <p className="warning" role="status">
          Les seuils préventifs du ZIP unique sont approchés ou dépassés.
          Utilisez les segments avec leur inventaire commun ; archive et
          corbeille conservent les originaux.
        </p>
      )}
      <p>
        ZIP historiques de taille bornée, inventaire commun et checksums.
        Préparation sur un snapshot cohérent ; mémoire totale dépendant de la
        bibliothèque. Aucun original supprimé. Conservez tous les fichiers.
      </p>
      <button
        className="secondary"
        disabled={busy}
        onClick={() => void prepare()}
      >
        Préparer les segments et le budget
      </button>
      {parts.map((p) => (
        <p key={p.filename}>
          <button
            className="text-button"
            onClick={() => download(p.blob, p.filename)}
          >
            Télécharger {p.filename}
          </button>{" "}
          ({p.blob.size} octets)
        </p>
      ))}
      <button
        className="secondary"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        Inspecter une sauvegarde segmentée
      </button>
      <input
        ref={input}
        type="file"
        multiple
        accept=".zip,.json"
        aria-label="Inventaire et segments à restaurer"
        hidden
        onChange={(e) =>
          void (async () => {
            const files = Array.from(e.target.files || []);
            e.target.value = "";
            setPreview(undefined);
            setBusy(true);
            try {
              const index = files.filter(
                (f) => f.name === "journal360-inventory.json",
              );
              if (index.length !== 1)
                throw Error("Choisissez un inventaire et tous ses segments.");
              const data = await inspectSegments(
                new Uint8Array(await index[0].arrayBuffer()),
                await Promise.all(
                  files
                    .filter((f) => f !== index[0])
                    .map(async (f) => ({
                      name: f.name,
                      bytes: new Uint8Array(await f.arrayBuffer()),
                    })),
                ),
              );
              setPreview(data);
              setStatus(
                `${data.editions.length} éditions, ${data.states.length} états, ${data.notes.length} notes validés. Fusion sans suppression ; conflits de notes conservés.`,
              );
            } catch (err) {
              setStatus(String(err));
            } finally {
              setBusy(false);
            }
          })()
        }
      />
      {preview?.validationMessages?.map((message, index) => (
        <p className="warning" key={index}>
          {message}
        </p>
      ))}
      {preview && (
        <div>
          <button
            className="primary"
            disabled={busy}
            onClick={() =>
              void (async () => {
                setBusy(true);
                try {
                  const r = await restoreBackup(db, preview);
                  setStatus(
                    `${r.added} éditions ajoutées, ${r.conflicts} conflits conservés.`,
                  );
                  setPreview(undefined);
                } catch (e) {
                  setStatus(String(e));
                } finally {
                  setBusy(false);
                }
              })()
            }
          >
            Confirmer la fusion des segments
          </button>
          <button onClick={() => setPreview(undefined)}>
            Annuler la fusion
          </button>
        </div>
      )}
      <p role="status">{busy ? "Traitement local en cours…" : status}</p>
    </section>
  );
}
