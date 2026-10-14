import type { Session } from "@supabase/supabase-js";
import { db, type LocalRepository } from "../data/db";
import { hash, now } from "../data/model";
import { canonicalJSON, restoreBackup, type BackupData } from "./backup";
import { remote, type Snapshot } from "./cloud";

interface SyncRemote {
  list(session: Session): Promise<Snapshot[]>;
  read(session: Session, id: string): Promise<BackupData>;
  backup(
    session: Session,
    repository: LocalRepository,
    data: BackupData,
  ): Promise<string>;
}
export async function fingerprint(data: BackupData) {
  const sorted = <T extends { id: string }>(rows: T[]) =>
    [...rows].sort((a, b) => a.id.localeCompare(b.id));
  return hash(
    new TextEncoder().encode(
      canonicalJSON({
        editions: sorted(data.editions),
        states: sorted(data.states),
        notes: sorted(data.notes),
      }),
    ),
  );
}

// Each immutable snapshot is merged once per device. Remember all branches,
// including concurrent uploads, rather than following only the newest file.
export class DeviceSynchronizer {
  private running = new Map<string, Promise<Snapshot[]>>();
  constructor(
    private repository: LocalRepository = db,
    private cloud: SyncRemote = remote,
  ) {}
  sync(session: Session): Promise<Snapshot[]> {
    const existing = this.running.get(session.user.id);
    if (existing) return existing;
    const work = this.execute(session).finally(() =>
      this.running.delete(session.user.id),
    );
    this.running.set(session.user.id, work);
    return work;
  }
  private async execute(session: Session) {
    const owner = session.user.id;
    const seenKey = `sync-seen-${owner}`;
    const baselineKey = `sync-baseline-${owner}`;
    const seen: Record<string, string> = JSON.parse(
      (await this.repository.preferences.get(seenKey))?.value || "{}",
    );
    const baseline = (await this.repository.preferences.get(baselineKey))
      ?.value;
    let snapshots = await this.cloud.list(session);
    const pending = snapshots.filter((s) => !seen[s.id]).reverse();
    for (const snapshot of pending) {
      const data = await this.cloud.read(session, snapshot.id);
      await restoreBackup(this.repository, data, "sync");
      seen[snapshot.id] = await fingerprint(data);
    }
    // Export this exact data, so an edit made during an upload stays dirty and
    // will be sent on the next pass. A failed transfer never advances baseline.
    const data = await this.repository.snapshot();
    const signature = await fingerprint(data);
    if (
      data.editions.length &&
      signature !== baseline &&
      !Object.values(seen).includes(signature)
    ) {
      const id = await this.cloud.backup(session, this.repository, data);
      seen[id] = signature;
      snapshots = await this.cloud.list(session);
    }
    const retained = Object.fromEntries(
      Object.entries(seen).filter(([id]) => snapshots.some((s) => s.id === id)),
    );
    await this.repository.transaction(
      "rw",
      this.repository.preferences,
      async () => {
        await this.repository.preferences.bulkPut([
          { key: seenKey, value: JSON.stringify(retained) },
          { key: baselineKey, value: signature },
          { key: `last-sync-${owner}`, value: now() },
        ]);
      },
    );
    return snapshots;
  }
}
export const synchronizer = new DeviceSynchronizer();
