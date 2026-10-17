import { afterEach, beforeEach, expect, it } from "vitest";
import { LocalRepository } from "../src/data/db";
import { inCollection } from "../src/data/collections";
import { currentEditions, dayKeyOf } from "../src/data/day";
import { commitImport, inspectHTML } from "../src/features/import";
import {
  exportBackup,
  inspectBackup,
  restoreBackup,
} from "../src/features/backup";
import { v643HTML } from "./helpers/v643";
let repository: LocalRepository;
beforeEach(() => {
  repository = new LocalRepository(`collections-${crypto.randomUUID()}`);
});
afterEach(async () => {
  repository.close();
  await repository.delete();
});
const source = new TextEncoder().encode(v643HTML());

it("le même HTML peut appartenir aux trois espaces sans remplacer une autre destination", async () => {
  const main = await commitImport(
    repository,
    await inspectHTML("veille.html", source),
    source,
    "keep",
  );
  const ai = await commitImport(
    repository,
    inCollection(await inspectHTML("veille.html", source), "ai-major"),
    source,
    "replace",
  );
  const sentinel = await commitImport(
    repository,
    inCollection(await inspectHTML("veille.html", source), "sentinel"),
    source,
    "replace",
  );
  expect(new Set([main.id, ai.id, sentinel.id]).size).toBe(3);
  const originalMain = await repository.editions.get(main.id);
  const replacement = await commitImport(
    repository,
    inCollection(await inspectHTML("renomme.html", source), "ai-major"),
    source,
    "replace",
  );
  expect(replacement).toMatchObject({ id: ai.id, replaced: true });
  expect(await repository.editions.count()).toBe(3);
  expect(await repository.editions.get(main.id)).toEqual(originalMain);
  expect((await repository.editions.get(sentinel.id))?.collection).toBe(
    "sentinel",
  );
});
it("deux dossiers de même date restent indépendants et n’entrent pas dans une journée", async () => {
  const first = inCollection(
    await inspectHTML("veille.html", source),
    "ai-major",
  );
  const second = inCollection(
    await inspectHTML(
      "autre.html",
      new TextEncoder().encode(v643HTML({ title: "Autre dossier" })),
    ),
    "ai-major",
  );
  expect(dayKeyOf(first)).toBeUndefined();
  expect(first.dayKey).toBeUndefined();
  expect(currentEditions([first, second])).toHaveLength(2);
  expect(
    dayKeyOf({ ...first, dayKey: "journal360-day-2026-10-15" }),
  ).toBeUndefined();
  expect(dayKeyOf(inCollection(first, "library"))).toBe(
    "journal360-day-2026-10-15",
  );
});
it("le classement traverse l’export ZIP et la restauration sur un autre appareil", async () => {
  await commitImport(
    repository,
    inCollection(await inspectHTML("veille.html", source), "sentinel"),
    source,
    "keep",
  );
  const backup = await inspectBackup(
    new Uint8Array(await (await exportBackup(repository)).arrayBuffer()),
  );
  expect(backup.editions[0].collection).toBe("sentinel");
  const other = new LocalRepository(
    `restore-collections-${crypto.randomUUID()}`,
  );
  try {
    await restoreBackup(other, backup, "sync");
    expect((await other.editions.toArray())[0].collection).toBe("sentinel");
  } finally {
    other.close();
    await other.delete();
  }
});
it("refuse de rattacher une version à un document d’un autre espace", async () => {
  const parent = await commitImport(
    repository,
    inCollection(await inspectHTML("veille.html", source), "sentinel"),
    source,
    "keep",
  );
  const bytes = new TextEncoder().encode(
    v643HTML({ title: "Une autre version" }),
  );
  const incoming = inCollection(
    await inspectHTML("autre.html", bytes),
    "ai-major",
  );
  await expect(
    commitImport(repository, incoming, bytes, "version", parent.id),
  ).rejects.toThrow("même onglet");
  expect(await repository.editions.count()).toBe(1);
});
