import { assertFutureBackupBudget } from "./budget";
import Dexie, { type EntityTable } from "dexie";
import { hash, now } from "../../data/model";
import {
  personalSchema,
  type FuturePayload,
  type FuturePersonal,
} from "./schema";
import { validateFuture, inspectFuture, type FutureCandidate } from "./import";

export const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr");
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => `${JSON.stringify(key)}:${canonical(v)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
export interface FutureDocument {
  documentId: string;
  title: string;
  status: FuturePayload["status"];
  verdict: FuturePayload["editorialDecision"]["verdict"];
  revision: number;
  latest: string;
  updatedAt: string;
  importedAt: string;
  changedAt: string;
  years: string[];
  search: string;
  excerpt: string;
  synthetic: boolean;
}
export interface FutureVersion {
  id: string;
  documentId: string;
  revision: number;
  sha256: string;
  payloadHash: string;
  filename: string;
  size: number;
  importedAt: string;
  updatedAt: string;
  kind: "html" | "json" | "legacy-radar";
  changes: string[];
}
export interface FutureChange {
  id: string;
  documentId: string;
  at: string;
  kind: "import" | "personal" | "restore";
  description: string;
}
export function summarize(
  payload: FuturePayload,
  version: FutureVersion,
): FutureDocument {
  return {
    documentId: payload.documentId,
    title: payload.title,
    status: payload.status,
    verdict: payload.editorialDecision.verdict,
    revision: payload.revision,
    latest: version.id,
    updatedAt: new Date(payload.updatedAt).toISOString(),
    importedAt: version.importedAt,
    changedAt: version.importedAt,
    years: [...new Set(payload.scenarios.map((s) => s.horizon))],
    excerpt:
      payload.scenarios[0]?.summary.slice(0, 300) ||
      payload.signals[0]?.description.slice(0, 300) ||
      payload.editorialDecision.reason,
    search: normalize(
      [
        payload.title,
        payload.editorialDecision.reason,
        ...payload.scenarios.flatMap((s) => [
          s.title,
          s.summary,
          ...s.assumptions,
          ...s.objections,
          ...s.milestones.flatMap((m) => [m.title, m.description]),
        ]),
        ...payload.signals.flatMap((s) => [s.title, s.description]),
        ...payload.actions.flatMap((a) => [a.title, a.skill, a.description]),
      ].join(" "),
    ).slice(0, 250000),
    synthetic: payload.synthetic,
  };
}
export function describeChanges(
  before: FuturePayload | undefined,
  after: FuturePayload,
): string[] {
  if (!before) return ["Nouveau dossier ; aucune révision antérieure."];
  const changes: string[] = [];
  if (before.title !== after.title)
    changes.push(`Titre modifié : ${before.title} → ${after.title}`);
  if (before.status !== after.status)
    changes.push(`Statut : ${before.status} → ${after.status}`);
  if (
    canonical(before.editorialDecision) !== canonical(after.editorialDecision)
  )
    changes.push("Décision éditoriale ou justification modifiée.");
  for (const key of ["scenarios", "signals", "actions"] as const) {
    const previous = new Map(before[key].map((item) => [item.id, item]));
    const current = new Map(after[key].map((item) => [item.id, item]));
    for (const [id, item] of current)
      if (!previous.has(id)) changes.push(`${key} : ajout « ${item.title} ».`);
      else if (canonical(previous.get(id)) !== canonical(item))
        changes.push(`${key} : modification « ${item.title} ».`);
    for (const [id, item] of previous)
      if (!current.has(id))
        changes.push(
          `${key} : retrait « ${item.title} » ; ancienne version conservée.`,
        );
  }
  if (canonical(before.provenance) !== canonical(after.provenance))
    changes.push("Provenance ou sources modifiées.");
  if (canonical(before.visualization) !== canonical(after.visualization))
    changes.push("Modules, liens ou préférence de mouvement modifiés.");
  return changes.length
    ? changes.slice(0, 100)
    : [
        "Métadonnées de révision mises à jour ; aucun changement éditorial détecté.",
      ];
}
export class FutureRepository extends Dexie {
  documents!: EntityTable<FutureDocument, "documentId">;
  versions!: EntityTable<FutureVersion, "id">;
  contents!: EntityTable<{ id: string; payload: FuturePayload }, "id">;
  originals!: EntityTable<{ id: string; bytes: Uint8Array }, "id">;
  personal!: EntityTable<FuturePersonal, "documentId">;
  changes!: EntityTable<FutureChange, "id">;
  settings!: EntityTable<{ key: string; value: string }, "key">;
  constructor(name = "journal360-future-private") {
    super(name);
    this.version(1).stores({
      documents: "documentId,updatedAt,importedAt,status,verdict,*years",
      versions: "id,documentId,[documentId+revision],sha256",
      contents: "id",
      originals: "id",
      personal: "documentId,updatedAt",
      changes: "id,documentId,at",
      settings: "key",
    });
  }
  async preview(candidate: FutureCandidate) {
    if (!candidate.payload || !candidate.sha256)
      return { status: "incompatible" as const, changes: [] as string[] };
    const previous = await this.documents.get(candidate.payload.documentId);
    const before = previous
      ? await this.contents.get(previous.latest)
      : undefined;
    const versions = await this.versions
      .where("documentId")
      .equals(candidate.payload.documentId)
      .toArray();
    const payloadHash = await hash(
      new TextEncoder().encode(canonical(candidate.payload)),
    );
    if (
      versions.some(
        (version) =>
          version.sha256 === candidate.sha256 ||
          version.payloadHash === payloadHash,
      )
    )
      return {
        status: "duplicate" as const,
        changes: ["Contenu déjà conservé ; aucun nouvel enregistrement."],
      };
    if (
      previous &&
      (candidate.payload.revision <= previous.revision ||
        Date.parse(candidate.payload.updatedAt) <=
          Date.parse(previous.updatedAt))
    )
      return {
        status: "conflict" as const,
        changes: [
          `Révision ${candidate.payload.revision} refusée : dernière révision ${previous.revision}. Identifiant constant, révision et date doivent progresser.`,
        ],
      };
    return {
      status: previous ? ("update" as const) : ("new" as const),
      changes: describeChanges(before?.payload, candidate.payload),
    };
  }
  async importBatch(
    candidates: FutureCandidate[],
    confirmed: Set<string>,
    migrations: Set<string>,
  ) {
    const sorted = candidates
      .filter((c) => c.payload && c.sha256 && c.kind && !c.error)
      .sort(
        (a, b) =>
          a.payload!.documentId.localeCompare(b.payload!.documentId) ||
          a.payload!.revision - b.payload!.revision,
      );
    for (const c of sorted) {
      c.payload = validateFuture(c.payload);
      const inspected = await inspectFuture(c.file, c.payload.revision);
      if (
        inspected.migration !== c.migration ||
        !inspected.payload ||
        inspected.sha256 !== c.sha256 ||
        inspected.kind !== c.kind
      )
        throw new Error("Original ou candidat modifié après prévisualisation.");
      if (c.kind === "legacy-radar") {
        inspected.payload.updatedAt = c.payload.updatedAt;
        inspected.payload.provenance.providedAt =
          c.payload.provenance.providedAt;
      }
      if (canonical(inspected.payload) !== canonical(c.payload))
        throw new Error("Les données ne correspondent pas à l’original.");
    }
    const prepared = await Promise.all(
      sorted.map(async (candidate) => ({
        candidate,
        payloadHash: await hash(
          new TextEncoder().encode(canonical(candidate.payload)),
        ),
        id: `fv-${await hash(new TextEncoder().encode(`${candidate.payload!.documentId}:${candidate.payload!.revision}:${candidate.sha256}`))}`,
      })),
    );
    return this.transaction(
      "rw",
      [
        this.documents,
        this.versions,
        this.contents,
        this.originals,
        this.personal,
        this.changes,
      ],
      async () => {
        let added = 0,
          ignored = 0;
        for (const { candidate, payloadHash, id } of prepared) {
          const payload = candidate.payload!;
          const versions = await this.versions
            .where("documentId")
            .equals(payload.documentId)
            .toArray();
          if (
            versions.some(
              (v) =>
                v.sha256 === candidate.sha256 || v.payloadHash === payloadHash,
            )
          ) {
            ignored++;
            continue;
          }
          const previous = await this.documents.get(payload.documentId);
          if (candidate.migration && !migrations.has(payload.documentId))
            throw new Error(
              "La migration AI-RADAR doit être explicitement confirmée.",
            );
          if (
            previous &&
            (payload.revision <= previous.revision ||
              Date.parse(payload.updatedAt) <= Date.parse(previous.updatedAt))
          )
            throw new Error(
              "Révision antérieure, égale ou date incohérente ; aucune donnée écrasée.",
            );
          if (previous && !confirmed.has(payload.documentId))
            throw new Error(
              "Confirmez la mise à jour après lecture des différences.",
            );
          const before = previous
            ? await this.contents.get(previous.latest)
            : undefined;
          const version: FutureVersion = {
            id,
            documentId: payload.documentId,
            revision: payload.revision,
            sha256: candidate.sha256!,
            payloadHash,
            filename: candidate.file.name,
            size: candidate.file.bytes.length,
            importedAt: now(),
            updatedAt: payload.updatedAt,
            kind: candidate.kind!,
            changes: describeChanges(before?.payload, payload),
          };
          await this.versions.add(version);
          await this.contents.add({ id, payload });
          await this.originals.add({ id, bytes: candidate.file.bytes });
          const summary = summarize(payload, version);
          summary.importedAt = previous?.importedAt || version.importedAt;
          await this.documents.put(summary);
          await this.changes.add({
            id: crypto.randomUUID(),
            documentId: payload.documentId,
            at: now(),
            kind: "import",
            description: `Révision ${payload.revision} importée (${candidate.migration ? "migration confirmée" : "snapshot complet"}).`,
          });
          added++;
        }
        await this.assertBackupCapacity();
        return { added, ignored };
      },
    );
  }
  async updatePersonal(documentId: string, patch: Partial<FuturePersonal>) {
    if (!(await this.documents.get(documentId)))
      throw new Error("Dossier absent.");
    await this.transaction(
      "rw",
      [this.personal, this.changes, this.versions, this.contents],
      async () => {
        const previous = await this.personal.get(documentId);
        const notes = [...(previous?.notes || [])];
        for (const note of patch.notes || []) {
          const existing = notes.find((n) => n.id === note.id);
          if (existing && canonical(existing) !== canonical(note))
            throw new Error("Note en conflit : aucune note remplacée.");
          if (!existing) notes.push(note);
        }
        const value = personalSchema.parse({
          ...previous,
          ...patch,
          notes,
          actions: { ...previous?.actions, ...patch.actions },
          sourceReviews: { ...previous?.sourceReviews, ...patch.sourceReviews },
          documentId,
          updatedAt: now(),
        });
        await this.personal.put(value);
        await this.changes.add({
          id: crypto.randomUUID(),
          documentId,
          at: now(),
          kind: "personal",
          description:
            "Préparation, note ou décision personnelle modifiée ; aucune diffusion.",
        });
        await this.assertBackupCapacity();
      },
    );
  }
  async assertBackupCapacity() {
    const [versions, contents, personal, changes] = await Promise.all([
      this.versions.toArray(),
      this.contents.toArray(),
      this.personal.toArray(),
      this.changes.toArray(),
    ]);
    assertFutureBackupBudget({ versions, contents, personal, changes });
  }
}
export const futureDb = new FutureRepository();
