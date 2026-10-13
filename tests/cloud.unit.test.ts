import { it, expect, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
import { db } from "../src/data/db";
import { remote, SyncCoordinator } from "../src/features/cloud";

it("file cloud : une seule opération simultanée, trois échecs conservés et aucun faux succès", async () => {
  await db.delete();
  await db.open();
  const session = { user: { id: crypto.randomUUID() } } as Session;
  const coordinator = new SyncCoordinator();
  const backup = vi
    .spyOn(remote, "backup")
    .mockRejectedValue(new Error("Serveur indisponible"));
  try {
    await coordinator.enqueue(session);
    await coordinator.enqueue(session);
    expect(await db.jobs.count()).toBe(1);
    const concurrent = await Promise.allSettled([
      coordinator.flush(session),
      coordinator.flush(session),
    ]);
    expect(concurrent.every((r) => r.status === "rejected")).toBe(true);
    expect(backup).toHaveBeenCalledTimes(1);
    const began = Date.now();
    await expect(coordinator.flush(session)).rejects.toThrow(
      "Serveur indisponible",
    );
    await expect(coordinator.flush(session)).rejects.toThrow(
      "Serveur indisponible",
    );
    expect(Date.now() - began).toBeGreaterThanOrEqual(5900);
    expect(backup).toHaveBeenCalledTimes(3);
    await expect(coordinator.flush(session)).rejects.toThrow("Trois essais");
    expect(backup).toHaveBeenCalledTimes(3);
    const job = await db.jobs.toCollection().first();
    expect(job).toMatchObject({
      ownerId: session.user.id,
      attempts: 3,
      status: "error",
    });
    expect(
      await db.preferences.get(`last-cloud-${session.user.id}`),
    ).toBeUndefined();
  } finally {
    backup.mockRestore();
    await db.delete();
  }
}, 15000);
