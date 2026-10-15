import { expect, it } from "vitest";
import { readingChanges } from "../src/data/readingChanges";
import { inspectHTML } from "../src/features/import";
import { restoreBackup } from "../src/features/backup";
import { LocalRepository } from "../src/data/db";
import type { Edition, ReadingState } from "../src/data/model";
import { dailyFile } from "./helpers/daily";
async function edition(hour: string, date?: string) {
  const f = dailyFile(hour, date);
  return inspectHTML(f.name, new TextEncoder().encode(f.html));
}
function opened(e: Edition, time = "2026-10-15T12:00:00.000Z"): ReadingState {
  return {
    id: `${e.id}:edition`,
    editionId: e.id,
    articleId: "edition",
    favorite: false,
    read: false,
    openedAt: time,
    updatedAt: time,
  };
}
it("compare avec la dernière version ouverte, pas la précédente version importée", async () => {
  const a = await edition("08"),
    b = await edition("12"),
    c = await edition("21");
  c.articles[0].text += " Correction publique.";
  // A producer-local article ID may change without creating a new event.
  c.articles[0].id = "renamed-by-producer";
  const result = readingChanges(c, [a, b, c], [opened(a)]);
  expect(result.kind).toBe("compared");
  expect(result.added.map((x) => x.eventId)).toEqual([
    "event-1",
    "event-2",
    "event-3",
  ]);
  expect(result.updated.map((x) => x.eventId)).toEqual(["event-0"]);
  expect(result.missing).toBe(0);
});
it("première lecture, réouverture, autres journées et favoris ne créent pas de faux changements", async () => {
  const a = await edition("08"),
    b = await edition("12"),
    tomorrow = await edition("08", "2026-10-16");
  expect(
    readingChanges(
      b,
      [a, b],
      [{ ...opened(a), openedAt: null, favorite: true }],
    ).kind,
  ).toBe("first");
  expect(readingChanges(b, [a, b], [opened(b)]).kind).toBe("seen");
  expect(readingChanges(tomorrow, [a, b, tomorrow], [opened(b)]).kind).toBe(
    "first",
  );
  expect(readingChanges(a, [a, b], [opened(b)]).kind).toBe("history");
  expect(readingChanges(b, [a, b], [opened(a, "malformed")]).kind).toBe(
    "first",
  );
});
it("revenir à une ancienne version ne fait pas réapparaître des nouveautés déjà ouvertes", async () => {
  const a = await edition("08"),
    b = await edition("12"),
    c = await edition("21");
  const changes = readingChanges(
    c,
    [a, b, c],
    [opened(b), opened(a, "2026-10-15T23:00:00.000Z")],
  );
  expect(changes.added).toHaveLength(2);
});
it("identifiants manquants ou dupliqués : aucune comparaison trompeuse par titre ou position", async () => {
  const a = await edition("08"),
    b = await edition("12");
  b.articles[1].eventId = undefined;
  expect(readingChanges(b, [a, b], [opened(a)]).kind).toBe("unavailable");
  b.articles[1].eventId = b.articles[0].eventId;
  expect(readingChanges(b, [a, b], [opened(a)]).kind).toBe("unavailable");
});
it("article absent signalé, métadonnées locales et changement de tri ignorés", async () => {
  const a = await edition("12"),
    b = await edition("21");
  b.articles = [
    { ...a.articles[1], id: "other-local-id", firstSeenSlot: "21:00" },
  ];
  const changes = readingChanges(b, [a, b], [opened(a)]);
  expect(changes).toMatchObject({
    kind: "compared",
    added: [],
    updated: [],
    missing: 1,
  });
});
it("le repère de lecture survit à la restauration/synchronisation sur un autre appareil", async () => {
  const pc = new LocalRepository(`changes-pc-${crypto.randomUUID()}`);
  const phone = new LocalRepository(`changes-phone-${crypto.randomUUID()}`);
  try {
    const a = await edition("08"),
      b = await edition("21");
    const bytes = new TextEncoder().encode(dailyFile("08").html);
    await pc.saveEdition(a, bytes);
    await pc.reading(a.id, "edition", { openedAt: "2026-10-15T09:00:00.000Z" });
    await restoreBackup(phone, await pc.snapshot(), "sync");
    const state = await phone.snapshot();
    expect(
      readingChanges(b, [...state.editions, b], state.states).added,
    ).toHaveLength(3);
    expect(state.states[0].read).toBe(false);
  } finally {
    await pc.delete();
    await phone.delete();
  }
});

it("fichiers sans articles indexés : ne jamais annoncer une absence de changements vérifiée", async () => {
  const a = await edition("08"),
    b = await edition("12");
  a.articles = [];
  b.articles = [];
  expect(readingChanges(b, [a, b], [opened(a)]).kind).toBe("unavailable");
});
