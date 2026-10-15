import { afterEach, beforeEach, expect, it } from "vitest";
import { LocalRepository } from "../src/data/db";
import { resolveDay } from "../src/data/day";
import {
  commitImport,
  inspectHTML,
  isolatedHTML,
} from "../src/features/import";
import { readingQuestions } from "../src/features/googleAi";
import { dailyFile } from "./helpers/daily";
import { v61HTML } from "./helpers/v61";
import { v643HTML, v643Question } from "./helpers/v643";
const encode = (html: string) => new TextEncoder().encode(html);
const display = (bytes: Uint8Array, interactive = true) =>
  new DOMParser().parseFromString(
    isolatedHTML(bytes, interactive),
    "text/html",
  );
const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

it("6.4.3 : chaque lien Mode IA reçoit la question explicite de son bouton voisin, « En savoir plus » reste local", () => {
  const bytes = encode(v643HTML());
  const d = display(bytes);
  const links = d.querySelectorAll('a[data-ai-link="google-ai-mode"]');
  expect(links).toHaveLength(6);
  for (const link of links) {
    expect(link.getAttribute("href")).toBe("#");
    expect(link.getAttribute("data-journal360-google-ai-url")).toBe(
      "https://www.google.com/ai",
    );
  }
  expect(
    d
      .querySelector("#story-article-2 a[data-ai-link]")
      ?.getAttribute("data-ai-question"),
  ).toBe(v643Question(2));
  expect(
    d
      .querySelector("#sentinel a[data-ai-link]")
      ?.getAttribute("data-ai-question"),
  ).toBe(
    "Question publique synthétique de dossier un : limites des cadres isolés.",
  );
  // The deep-dive question is filled at runtime: read in the frame on click.
  expect(
    d
      .querySelector("#approfondir a[data-ai-link]")
      ?.hasAttribute("data-ai-question"),
  ).toBe(false);
  expect(d.querySelectorAll("button[data-ai-link]")).toHaveLength(0);
  expect(readingQuestions(bytes)).toHaveLength(5);
});

it("6.4 à fenêtre (6.4.1) : les boutons « En savoir plus » passent par la PWA comme en 6.1", () => {
  const d = display(encode(v61HTML({ schemaVersion: "6.4" })));
  expect(
    d.querySelectorAll('button[data-ai-link="google-ai-mode"]'),
  ).toHaveLength(11);
});

it.each(["6.5", "6.2", 6.4, undefined])(
  "schéma producteur %s non reconnu : aucune question ajoutée",
  (schemaVersion) => {
    const d = display(encode(v643HTML({ schemaVersion })));
    expect(d.querySelectorAll("[data-ai-question]")).toHaveLength(0);
  },
);

it.each(["x".repeat(2001), "Question\u0000", "Question‮", null])(
  "question 6.4.3 invalide : lien sans question, texte de l’article jamais repris",
  (aiQuestion) => {
    const bytes = encode(
      v643HTML({
        items: [
          {
            id: "article-1",
            title: "Article",
            aiQuestion,
            plain: "Texte privé sans rapport",
          },
        ],
      }),
    );
    expect(
      display(bytes)
        .querySelector("#story-article-1 a[data-ai-link]")
        ?.hasAttribute("data-ai-question"),
    ).toBe(false);
    expect(readingQuestions(bytes)).not.toContain("Texte privé sans rapport");
  },
);

it("mode sécurisé 6.4.3 : aucun script, aucun lien externe actif", () => {
  const d = display(encode(v643HTML()), false);
  expect(d.querySelectorAll("script, a[data-ai-link]")).toHaveLength(0);
  expect(d.querySelectorAll('a[href^="http"]')).toHaveLength(0);
});

let db: LocalRepository;
beforeEach(() => {
  db = new LocalRepository(`v643-${crypto.randomUUID()}`);
});
afterEach(async () => {
  await db.delete();
});

it("doublon exact daté : le dernier import remplace l’ancienne copie, même archivée et dans la corbeille, sans perdre notes ni favoris", async () => {
  const file = dailyFile("21");
  const bytes = encode(file.html);
  const first = await commitImport(
    db,
    await inspectHTML(file.name, bytes),
    bytes,
    "day",
  );
  const before = (await db.editions.get(first.id))!;
  await db.reading(first.id, "edition", { favorite: true });
  await db.notes.add({
    id: crypto.randomUUID(),
    editionId: first.id,
    body: "Note privée",
    kind: "note",
    createdAt: before.importedAt,
    updatedAt: before.importedAt,
  });
  await db.editions.update(first.id, { archived: true, deleted: true });
  await tick();
  const result = await commitImport(
    db,
    await inspectHTML("copie-renommee.html", bytes),
    bytes,
    "day",
  );
  expect(result).toEqual({ id: first.id, duplicate: true, replaced: true });
  const kept = (await db.editions.get(first.id))!;
  expect(await db.editions.count()).toBe(1);
  expect(kept).toMatchObject({
    filename: file.name,
    archived: false,
    deleted: false,
    familyId: before.familyId,
    revision: before.revision,
  });
  expect(kept.importedAt > before.importedAt).toBe(true);
  expect(kept.updatedAt > before.updatedAt).toBe(true);
  expect(await db.notes.count()).toBe(1);
  expect((await db.states.get(`${first.id}:edition`))?.favorite).toBe(true);
  expect(resolveDay(await db.editions.toArray()).current?.id).toBe(first.id);
});

it("doublon exact daté réimporté en dernier : il redevient l’édition affichée de son créneau", async () => {
  const a = dailyFile("21");
  const b = dailyFile("21", "2026-10-15", { title: "Variante 21h" });
  const bytesA = encode(a.html),
    bytesB = encode(b.html);
  const first = await commitImport(
    db,
    await inspectHTML(a.name, bytesA),
    bytesA,
    "day",
  );
  await tick();
  const second = await commitImport(
    db,
    await inspectHTML(b.name, bytesB),
    bytesB,
    "day",
  );
  expect(resolveDay(await db.editions.toArray()).current?.id).toBe(second.id);
  await tick();
  expect(
    await commitImport(db, await inspectHTML(a.name, bytesA), bytesA, "day"),
  ).toEqual({ id: first.id, duplicate: true, replaced: true });
  expect(resolveDay(await db.editions.toArray()).current?.id).toBe(first.id);
  expect(await db.editions.count()).toBe(2);
  expect(await db.originals.count()).toBe(2);
});

it("doublon exact non daté : remplacement par défaut, « Ignorer le doublon » reste possible", async () => {
  const bytes = encode(
    "<!doctype html><html><head><title>Note libre</title></head><body><h1>Note libre</h1><p>Texte fictif.</p></body></html>",
  );
  const first = await commitImport(
    db,
    await inspectHTML("libre.html", bytes),
    bytes,
    "keep",
  );
  await db.editions.update(first.id, { deleted: true });
  expect(
    await commitImport(
      db,
      await inspectHTML("libre-2.html", bytes),
      bytes,
      "ignore",
    ),
  ).toEqual({ id: first.id, duplicate: true, replaced: false });
  expect((await db.editions.get(first.id))?.deleted).toBe(true);
  expect(
    await commitImport(
      db,
      await inspectHTML("libre-2.html", bytes),
      bytes,
      "replace",
    ),
  ).toEqual({ id: first.id, duplicate: true, replaced: true });
  expect((await db.editions.get(first.id))?.deleted).toBe(false);
  expect(await db.editions.count()).toBe(1);
});
