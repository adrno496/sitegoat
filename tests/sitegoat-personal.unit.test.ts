import { it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { LocalRepository } from "../src/data/db";
import { FutureRepository } from "../src/features/future/db";
import { inspectFuture } from "../src/features/future/import";
import {
  exportFutureBackup,
  inspectFutureBackup,
  restoreFutureBackup,
} from "../src/features/future/backup";
import {
  exportBackup,
  inspectBackup,
  restoreBackup,
} from "../src/features/backup";
import { inspectHTML } from "../src/features/import";
import {
  exportPersonalSettings,
  inspectPersonalSettings,
  restorePersonalSetting,
} from "../src/features/personalSettingsBackup";
import { mutateRecurringSearch } from "../src/features/v9/recurringSearchStorage";
import {
  RECURRING_SEARCHES_KEY,
  parseRecurringSearches,
  serializeRecurringSearches,
  type RecurringSearch,
} from "../src/features/v9/recurringSearchModel";
import {
  V9_DISPLAY_KEY,
  displayDefaults,
} from "../src/features/v9/preferences";
import { INTERFACE_KEY, defaults } from "../src/features/interfacePreferences";
// Deterministic FIFO Web Locks double; browser two-tab tests cover native locks.
function lockManager() {
  let tail = Promise.resolve();
  return {
    request: (_name: string, callback: () => Promise<unknown>) => {
      const r = tail.then(callback);
      tail = r.then(
        () => {},
        () => {},
      );
      return r;
    },
  } as unknown as LockManager;
}
function storage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => {
      m.set(k, v);
    },
    removeItem: (k: string) => m.delete(k),
    clear: () => m.clear(),
  } as unknown as Storage;
}
const search = (): RecurringSearch => ({
  id: crypto.randomUUID(),
  theme: "SYNTHÉTIQUE",
  query: "Recherche publique",
  cadence: "weekly",
  lastOpenedAt: null,
});
it("SG-08 : deux créations simultanées, conflit même ID visible, suppression et panne préservent les recherches", async () => {
  const s = storage(),
    l = lockManager(),
    a = search(),
    b = search();
  s.setItem(RECURRING_SEARCHES_KEY, serializeRecurringSearches([]));
  await Promise.all([
    mutateRecurringSearch(null, a, s, l),
    mutateRecurringSearch(null, b, s, l),
  ]);
  expect(parseRecurringSearches(s.getItem(RECURRING_SEARCHES_KEY))).toEqual([
    a,
    b,
  ]);
  await mutateRecurringSearch(a, { ...a, theme: "A modifiée" }, s, l);
  await expect(
    mutateRecurringSearch(a, { ...a, theme: "Ancien onglet" }, s, l),
  ).rejects.toThrow("autre onglet");
  await mutateRecurringSearch(b, null, s, l);
  expect(
    parseRecurringSearches(s.getItem(RECURRING_SEARCHES_KEY)),
  ).toHaveLength(1);
  const before = s.getItem(RECURRING_SEARCHES_KEY);
  vi.spyOn(s, "setItem").mockImplementation(() => {
    throw Error("Quota");
  });
  await expect(mutateRecurringSearch(null, search(), s, l)).rejects.toThrow(
    "Quota",
  );
  expect(s.getItem(RECURRING_SEARCHES_KEY)).toBe(before);
  vi.restoreAllMocks();
  await expect(
    mutateRecurringSearch(null, search(), s, undefined),
  ).rejects.toThrow();
});
it("SG-06 : trois espaces restaurés sur bases vides, aucun secret, anciens formats conservés", async () => {
  const db = new LocalRepository("sg06-" + crypto.randomUUID()),
    fresh = new LocalRepository("sg06-fresh-" + crypto.randomUUID()),
    f = new FutureRepository("sg06-future-" + crypto.randomUUID()),
    ff = new FutureRepository("sg06-future-fresh-" + crypto.randomUUID()),
    s = storage(),
    t = storage(),
    l = lockManager();
  try {
    const bytes = new Uint8Array(
        readFileSync("tests/fixtures/edition-13.html"),
      ),
      e = await inspectHTML("test.html", bytes);
    await db.saveEdition(e, bytes);
    await db.reading(e.id, "edition", { read: true, favorite: true });
    await db.notes.add({
      id: crypto.randomUUID(),
      editionId: e.id,
      body: "Note synthétique",
      kind: "note",
      createdAt: e.importedAt,
      updatedAt: e.importedAt,
    });
    const c = await inspectFuture({
      name: "future.json",
      bytes: new Uint8Array(
        readFileSync("public/examples/future/EXEMPLE_FUTUR_IA_v1.json"),
      ),
    });
    await f.importBatch([c], new Set(), new Set());
    const id = c.payload!.documentId;
    await f.updatePersonal(id, {
      favorite: true,
      notes: [
        {
          id: crypto.randomUUID(),
          body: "Contre-preuve synthétique",
          at: new Date().toISOString(),
        },
      ],
    });
    s.setItem(V9_DISPLAY_KEY, JSON.stringify(displayDefaults()));
    s.setItem(INTERFACE_KEY, JSON.stringify(defaults()));
    s.setItem(RECURRING_SEARCHES_KEY, serializeRecurringSearches([search()]));
    s.setItem("supabase-token", "SYNTHETIC_SECRET");
    await db.preferences.put({ key: "theme", value: "dark" });
    await db.preferences.put({
      key: "auto-sync-secret",
      value: "SYNTHETIC_SECRET",
    });
    const settings = await exportPersonalSettings(db, s);
    expect(await settings.text()).not.toContain("SYNTHETIC_SECRET");
    const p = inspectPersonalSettings(
      new Uint8Array(await settings.arrayBuffer()),
    );
    await restoreBackup(
      fresh,
      await inspectBackup(
        new Uint8Array(await (await exportBackup(db)).arrayBuffer()),
      ),
    );
    await restoreFutureBackup(
      ff,
      await inspectFutureBackup(
        new Uint8Array(await (await exportFutureBackup(f)).arrayBuffer()),
      ),
    );
    for (const scope of ["display", "interface", "searches", "theme"] as const)
      await restorePersonalSetting(fresh, p, scope, t, l);
    expect(await fresh.snapshot()).toEqual(await db.snapshot());
    expect(await ff.contents.toArray()).toEqual(await f.contents.toArray());
    expect(await ff.personal.toArray()).toEqual(await f.personal.toArray());
    expect(await fresh.preferences.get("theme")).toEqual({
      key: "theme",
      value: "dark",
    });
    expect(t.getItem(V9_DISPLAY_KEY)).toBe(s.getItem(V9_DISPLAY_KEY));
    expect(t.getItem(INTERFACE_KEY)).toBe(s.getItem(INTERFACE_KEY));
    expect(parseRecurringSearches(t.getItem(RECURRING_SEARCHES_KEY))).toEqual(
      parseRecurringSearches(s.getItem(RECURRING_SEARCHES_KEY)),
    );
    for (const scope of ["display", "interface", "searches", "theme"] as const)
      await restorePersonalSetting(fresh, p, scope, t, l);
    expect(
      parseRecurringSearches(t.getItem(RECURRING_SEARCHES_KEY)),
    ).toHaveLength(1);
    expect(() =>
      inspectPersonalSettings(new TextEncoder().encode("{")),
    ).toThrow();
  } finally {
    await db.delete();
    await fresh.delete();
    await f.delete();
    await ff.delete();
  }
});
