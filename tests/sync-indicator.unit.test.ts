import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
import { db } from "../src/data/db";
import { inspectHTML } from "../src/features/import";
import { DeviceSynchronizer, fingerprint } from "../src/features/sync";
import { SyncIndicator, useSyncPending } from "../src/features/SyncIndicator";
import type { BackupData } from "../src/features/backup";
import type { Snapshot } from "../src/features/cloud";
import { dailyFile } from "./helpers/daily";
let root: Root | undefined;
const element = document.createElement("div");
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = undefined;
  element.remove();
  await db.delete();
});
const owner = "synthetic-indicator-owner";
const session = { access_token: "synthetic", user: { id: owner } } as Session;
it("une modification pendant le transfert reste en attente malgré un premier succès daté", async () => {
  const f = dailyFile("08"),
    bytes = new TextEncoder().encode(f.html);
  const edition = await inspectHTML(f.name, bytes);
  await db.saveEdition(edition, bytes);
  let pending: ReturnType<typeof useSyncPending>;
  function Observer() {
    pending = useSyncPending(owner);
    return null;
  }
  document.body.append(element);
  root = createRoot(element);
  await act(async () => {
    root!.render(createElement(Observer));
  });
  await vi.waitFor(() => expect(pending?.pending).toBe(true));
  let release!: () => void;
  let entered!: () => void;
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const snapshots: Snapshot[] = [];
  const backups = new Map<string, BackupData>();
  const remote = {
    list: async () => [...snapshots],
    read: async (_session: Session, id: string) => backups.get(id)!,
    backup: async (_session: Session, _db: unknown, data: BackupData) => {
      entered();
      await gate;
      const id = crypto.randomUUID();
      backups.set(id, data);
      snapshots.push({ id, createdAt: new Date().toISOString(), size: 1 });
      return id;
    },
  };
  const synchronizer = new DeviceSynchronizer(db, remote);
  const work = synchronizer.sync(session);
  await started;
  await db.notes.add({
    id: crypto.randomUUID(),
    editionId: edition.id,
    body: "Note synthétique ajoutée pendant le transfert",
    kind: "note",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  release();
  await work;
  expect(await db.preferences.get(`last-sync-${owner}`)).toBeDefined();
  expect((await db.preferences.get(`sync-baseline-${owner}`))?.value).not.toBe(
    await fingerprint(await db.snapshot()),
  );
  await vi.waitFor(() => expect(pending?.pending).toBe(true));
  await synchronizer.sync(session);
  await vi.waitFor(() => expect(pending?.pending).toBe(false));
  expect(backups.size).toBe(2);
});
it("aucun faux succès en cas d’erreur, hors ligne ou de changement en attente ; date toujours consultable", () => {
  const base = {
    owner,
    online: true,
    autoSync: true,
    lastSync: "2026-10-15T10:30:00.000Z",
    onSync: () => {},
    onSettings: () => {},
  };
  const render = (props: Partial<Parameters<typeof SyncIndicator>[0]>) =>
    renderToStaticMarkup(createElement(SyncIndicator, { ...base, ...props }));
  expect(render({ pending: { pending: true } })).toContain(
    "Modifications en attente",
  );
  expect(render({ pending: { pending: true } })).not.toContain(">Synchronisé<");
  expect(
    render({
      pending: { pending: false },
      activity: { owner, phase: "error", error: "Coupure synthétique" },
    }),
  ).toContain("Échec · Réessayer");
  expect(render({ online: false, pending: { pending: false } })).toContain(
    "Hors ligne",
  );
  expect(render({ pending: { pending: false } })).toContain(">Synchronisé<");
  expect(render({ pending: { pending: false } })).toContain("Dernier succès");
  expect(render({ pending: { pending: false }, autoSync: false })).toContain(
    "Automatique désactivée",
  );
  expect(
    render({
      pending: { pending: false },
      activity: {
        owner: "other-account",
        phase: "error",
        error: "Other account detail",
      },
    }),
  ).not.toContain("Other account detail");
});
