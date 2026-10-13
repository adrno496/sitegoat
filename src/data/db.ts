import Dexie, { type EntityTable } from "dexie";
import type {
  Edition,
  Original,
  ReadingState,
  Note,
  Preference,
  Job,
} from "./model";
export class LocalRepository extends Dexie {
  editions!: EntityTable<Edition, "id">;
  originals!: EntityTable<Original, "id">;
  states!: EntityTable<ReadingState, "id">;
  notes!: EntityTable<Note, "id">;
  preferences!: EntityTable<Preference, "key">;
  jobs!: EntityTable<Job, "id">;
  pending!: EntityTable<
    { id: string; filename: string; bytes: Uint8Array; createdAt: string },
    "id"
  >;
  constructor(name = "journal360-private") {
    super(name);
    this.version(1).stores({
      editions: "id,sha256,date,familyId,importedAt",
      originals: "id",
      states: "id,editionId",
      notes: "id,editionId,updatedAt",
      preferences: "key",
    });
    this.version(2).stores({ jobs: "id,status,createdAt,ownerId" });
    this.version(3).stores({ pending: "id,createdAt" });
  }
  async saveEdition(edition: Edition, bytes: Uint8Array) {
    await this.transaction("rw", [this.editions, this.originals], async () => {
      await this.originals.add({ id: edition.id, bytes });
      await this.editions.add(edition);
    });
  }
  async reading(
    editionId: string,
    articleId = "edition",
    patch: Partial<Pick<ReadingState, "favorite" | "read" | "openedAt">>,
  ) {
    const id = `${editionId}:${articleId}`;
    await this.transaction("rw", this.states, async () => {
      const previous = await this.states.get(id);
      await this.states.put({
        id,
        editionId,
        articleId,
        favorite: false,
        read: false,
        openedAt: null,
        ...previous,
        ...patch,
        updatedAt: new Date().toISOString(),
      });
    });
  }
  async snapshot() {
    return this.transaction(
      "r",
      [this.editions, this.originals, this.states, this.notes],
      async () => ({
        editions: await this.editions.toArray(),
        originals: await this.originals.toArray(),
        states: await this.states.toArray(),
        notes: await this.notes.toArray(),
      }),
    );
  }
}
export const db = new LocalRepository();
