import { createClient, type Session } from "@supabase/supabase-js";
import { CLOUD_KEY, CLOUD_URL } from "../config";
import { db, type LocalRepository } from "../data/db";
import { now } from "../data/model";
import {
  exportBackup,
  inspectBackup,
  restoreBackup,
  type BackupData,
} from "./backup";
export const cloud = createClient(CLOUD_URL, CLOUD_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
export interface Snapshot {
  id: string;
  createdAt: string;
  size: number;
}
export async function unlockCloud(code: string) {
  const response = await fetch("/api/access", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
    cache: "no-store",
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Cet hébergement ne dispose pas du serveur d’accès privé.");
  }
  if (!response.ok) throw new Error(data.error || "Connexion indisponible.");
  const { error } = await cloud.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });
  if (error) throw new Error("Session indisponible. Réessayez.");
}
async function request(session: Session, body?: object, offset = 0) {
  const response = await fetch(
    `/api/backup${offset ? `?offset=${offset}` : ""}`,
    {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    },
  );
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Cet hébergement ne dispose pas du serveur de sauvegarde.");
  }
  if (!response.ok) throw new Error(data.error || "Sauvegarde indisponible.");
  return data;
}
export class CloudRepository {
  async list(session: Session): Promise<Snapshot[]> {
    const snapshots = new Map<string, Snapshot>();
    let offset = 0;
    for (let page = 0; page < 51; page++) {
      const response = await request(session, undefined, offset);
      if (!Array.isArray(response.snapshots) || response.snapshots.length > 100)
        throw new Error("Inventaire cloud invalide.");
      for (const snapshot of response.snapshots as Snapshot[])
        snapshots.set(snapshot.id, snapshot);
      if (snapshots.size > 5000)
        throw new Error(
          "Inventaire cloud supérieur à 5000 archives : aucune archive supprimée.",
        );
      if (
        response.nextOffset === undefined &&
        response.snapshots.length === 100
      )
        throw new Error(
          "Serveur cloud ancien : inventaire potentiellement tronqué, mise à jour nécessaire.",
        );
      if (response.nextOffset === null || response.nextOffset === undefined)
        return [...snapshots.values()].sort(
          (a, b) =>
            b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id),
        );
      if (
        !Number.isSafeInteger(response.nextOffset) ||
        response.nextOffset <= offset
      )
        throw new Error("Pagination cloud invalide : inventaire non confirmé.");
      offset = response.nextOffset;
    }
    throw new Error(
      "Inventaire cloud supérieur à 5000 archives : vérification manuelle nécessaire, aucune archive supprimée.",
    );
  }
  async backup(
    session: Session,
    repository: LocalRepository = db,
    data?: BackupData,
  ) {
    const blob = await exportBackup(repository, data);
    if (blob.size > 50 * 1024 * 1024)
      throw new Error(
        "Sauvegarde cloud supérieure à 50 Mo : utilisez un export local.",
      );
    const signed = await request(session, { action: "upload" });
    const { error } = await cloud.storage
      .from("journal360-backups")
      .uploadToSignedUrl(signed.path, signed.token, blob, {
        contentType: "application/zip",
      });
    if (error)
      throw new Error(
        "Transfert Supabase interrompu : votre bibliothèque locale est conservée.",
      );
    await repository.preferences.put({
      key: `last-cloud-${session.user.id}`,
      value: now(),
    });
    return signed.id as string;
  }
  async restore(session: Session, id: string) {
    return restoreBackup(db, await this.read(session, id));
  }
  async read(session: Session, id: string): Promise<BackupData> {
    const signed = await request(session, { action: "download", id });
    const response = await fetch(signed.url, { cache: "no-store" });
    if (!response.ok) throw new Error("Téléchargement impossible.");
    const length = Number(response.headers.get("content-length"));
    if (length > 150 * 1024 * 1024)
      throw new Error("Archive trop volumineuse.");
    const chunks: Uint8Array[] = [];
    let total = 0;
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Téléchargement indisponible.");
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > 150 * 1024 * 1024) {
        await reader.cancel();
        throw new Error("Archive trop volumineuse.");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let at = 0;
    for (const c of chunks) {
      bytes.set(c, at);
      at += c.length;
    }
    return inspectBackup(bytes);
  }
}
export const remote = new CloudRepository();
export class SyncCoordinator {
  private running = new Map<string, Promise<void>>();
  async enqueue(session: Session) {
    const existing = await db.jobs
      .where("ownerId")
      .equals(session.user.id)
      .first();
    if (!existing)
      await db.jobs.add({
        id: crypto.randomUUID(),
        kind: "cloud-backup",
        status: "pending",
        attempts: 0,
        createdAt: now(),
        ownerId: session.user.id,
      });
  }
  flush(session: Session): Promise<void> {
    const existing = this.running.get(session.user.id);
    if (existing) return existing;
    const work = this.execute(session).finally(() =>
      this.running.delete(session.user.id),
    );
    this.running.set(session.user.id, work);
    return work;
  }
  private async execute(session: Session) {
    const jobs = await db.jobs
      .where("ownerId")
      .equals(session.user.id)
      .toArray();
    for (const job of jobs) {
      if (job.attempts >= 3)
        throw new Error(
          "Trois essais ont échoué. Relancez manuellement la sauvegarde depuis Réglages.",
        );
      if (job.attempts > 0)
        await new Promise<void>((resolve) =>
          setTimeout(resolve, 1000 * 2 ** job.attempts),
        );
      try {
        await remote.backup(session);
        await db.jobs.delete(job.id);
      } catch (error) {
        await db.jobs.update(job.id, {
          status: "error",
          attempts: job.attempts + 1,
          lastError: error instanceof Error ? error.message : "Erreur cloud",
        });
        throw error;
      }
    }
  }
}
export const coordinator = new SyncCoordinator();
