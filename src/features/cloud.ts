import { createClient, type Session } from "@supabase/supabase-js";
import { CLOUD_KEY, CLOUD_URL } from "../config";
import { db } from "../data/db";
import { now } from "../data/model";
import { exportBackup, inspectBackup, restoreBackup } from "./backup";
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
async function request(session: Session, body?: object) {
  const response = await fetch("/api/backup", {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
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
    return (await request(session)).snapshots;
  }
  async backup(session: Session) {
    const blob = await exportBackup(db);
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
    await db.preferences.put({
      key: `last-cloud-${session.user.id}`,
      value: now(),
    });
    return signed.id as string;
  }
  async restore(session: Session, id: string) {
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
    return restoreBackup(db, await inspectBackup(bytes));
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
