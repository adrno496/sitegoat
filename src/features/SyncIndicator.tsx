import { useEffect, useState } from "react";
import { liveQuery } from "dexie";
import { Cloud, HardDrive, RefreshCw, WifiOff } from "lucide-react";
import { db } from "../data/db";
import { fingerprint } from "./sync";

export interface SyncActivity {
  owner: string;
  phase: "syncing" | "idle" | "error";
  error?: string;
}
export function useSyncPending(owner?: string) {
  const [state, setState] = useState<{
    owner: string;
    pending: boolean;
    error?: string;
  }>();
  useEffect(() => {
    if (!owner) return;
    const subscription = liveQuery(async () => {
      const [data, baseline, jobs] = await Promise.all([
        // The fingerprint covers metadata and annotations, never original bytes.
        // Observing status must not repeatedly load the entire HTML archive.
        db.transaction("r", [db.editions, db.states, db.notes], async () => ({
          editions: await db.editions.toArray(),
          states: await db.states.toArray(),
          notes: await db.notes.toArray(),
          originals: [],
        })),
        db.preferences.get(`sync-baseline-${owner}`),
        db.jobs.where("ownerId").equals(owner).count(),
      ]);
      return {
        owner,
        pending:
          jobs > 0 ||
          (!!data.editions.length &&
            (await fingerprint(data)) !== baseline?.value),
      };
    }).subscribe({
      next: setState,
      error: () =>
        setState({
          owner,
          pending: true,
          error: "Stockage local indisponible",
        }),
    });
    return () => subscription.unsubscribe();
  }, [owner]);
  return state?.owner === owner ? state : undefined;
}
export function SyncIndicator({
  owner,
  online,
  autoSync,
  pending,
  activity,
  lastSync,
  onSync,
  onSettings,
}: {
  owner?: string;
  online: boolean;
  autoSync: boolean;
  pending?: { pending: boolean; error?: string };
  activity?: SyncActivity;
  lastSync?: string;
  onSync: () => void;
  onSettings: () => void;
}) {
  const running = activity?.owner === owner && activity?.phase === "syncing";
  const error =
    pending?.error ||
    (activity?.owner === owner && activity?.phase === "error"
      ? activity.error
      : undefined);
  const validDate = !!lastSync && Number.isFinite(Date.parse(lastSync));
  const label = !online
    ? "Hors ligne"
    : !owner
      ? "Mode local"
      : running
        ? "Synchronisation…"
        : error
          ? "Échec · Réessayer"
          : !pending
            ? "Vérification…"
            : pending.pending
              ? "Modifications en attente"
              : validDate
                ? "Synchronisé"
                : "À synchroniser";
  const detail =
    owner && validDate
      ? `Dernier succès : ${new Date(lastSync!).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`
      : owner
        ? "Aucune synchronisation confirmée"
        : "Données sur cet appareil";
  return (
    <button
      className="status-chip sync-indicator"
      data-state={label}
      disabled={running}
      onClick={owner && online ? onSync : onSettings}
      aria-label={`${label}. ${detail}${owner && !autoSync ? ". Synchronisation automatique désactivée" : ""}`}
      title={
        error ||
        `${detail}${!autoSync && owner ? " · Synchronisation automatique désactivée" : ""}`
      }
    >
      {!online ? (
        <WifiOff size={14} />
      ) : running ? (
        <RefreshCw size={14} />
      ) : owner ? (
        <Cloud size={14} />
      ) : (
        <HardDrive size={14} />
      )}
      <span role="status">
        <strong>{label}</strong>
        <small>{detail}</small>
        {owner && !autoSync && <small>Automatique désactivée</small>}
      </span>
    </button>
  );
}
