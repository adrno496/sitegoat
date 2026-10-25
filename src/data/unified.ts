import { z } from "zod";
import {
  calendarSchema,
  cumulativeSchema,
  V7_SLOTS,
  V7_SCHEDULE,
  parisClock,
} from "./editorial";
import { validateSourceUrl } from "../features/sourceUrl";
import { futureSchema } from "../features/future/schema";
const text = (max: number) => z.string().max(max);
const id = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[\w.:-]+$/);
const instant = z.iso.datetime({ offset: true });
const url = z
  .string()
  .max(2048)
  .refine(
    (v) => v.startsWith("https://") && !!validateSourceUrl(v),
    "URL HTTPS publique requise",
  );
export const sourceRecordSchema = z
  .object({
    id,
    label: text(500).min(1),
    url,
    publisher: text(300),
    publishedAt: calendarSchema,
    verifiedAt: instant.nullable(),
  })
  .strict();
const actionSchema = z
  .object({
    title: text(500).min(1),
    reason: text(2000).min(1),
    effort: text(500),
    risk: text(1000),
    sourceIds: z.array(id).min(1).max(20),
    promptId: id.optional(),
  })
  .strict();
export const promptAssetSchema = z
  .object({
    promptId: id,
    eventId: id.optional(),
    product: z.enum(["sentinel", "axdia", "vscode", "analyse"]),
    title: text(500).min(1),
    filename: text(250).min(1),
    mime: z.literal("text/markdown"),
    content: text(200000).min(1),
    sha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
  })
  .strict();
export const unifiedItemSchema = z
  .object({
    eventId: id,
    id,
    title: text(1000).min(1),
    category: text(200).min(1),
    sourceWatch: z.enum(["journal360", "future", "sentinel", "ai-major"]),
    firstSeenSlot: z.enum(V7_SLOTS),
    lastChangedAt: instant,
    eventDate: calendarSchema,
    publishedAt: instant,
    verifiedAt: instant.nullable(),
    summary: text(10000),
    plain: text(20000),
    detail: text(40000),
    sourceRecords: z.array(sourceRecordSchema).max(30),
    evidenceStatus: z.enum(["sourced", "unverified", "hypothesis"]),
    importance: z.enum(["major", "important", "context"]),
    importanceReason: text(2000),
    changed: text(2000),
    unknowns: text(2000),
    actions: z.array(actionSchema).max(3),
    corrections: z
      .array(
        z
          .object({
            at: instant,
            reason: text(2000).min(10),
            sourceIds: z.array(id).min(1).max(20),
          })
          .strict(),
      )
      .max(30),
    relatedEventIds: z.array(id).max(30),
    publicResearchQuestion: text(2000).optional(),
  })
  .strict();
export const economySchema = z
  .object({
    id,
    zone: z.enum(["FR", "EU", "US", "CN"]),
    indicator: text(300).min(1),
    provider: text(300).min(1),
    seriesCode: text(200).min(1),
    definition: text(2000).min(1),
    unit: text(100).min(1),
    frequency: z.enum(["daily", "monthly", "quarterly", "annual"]),
    period: text(100).min(1),
    statisticDate: calendarSchema,
    publishedAt: instant,
    revisedAt: instant.nullable(),
    verifiedAt: instant.nullable(),
    value: z.number().finite(),
    comparison: z
      .object({
        value: z.number().finite(),
        period: text(100).min(1),
        definition: text(2000).min(1),
        unit: text(100).min(1),
      })
      .strict()
      .nullable(),
    status: z.enum(["normal", "watch", "tensions", "crisis", "unknown"]),
    reading: text(4000),
    risk: text(2000),
    counterArgument: text(2000),
    sourceRecords: z.array(sourceRecordSchema).min(1).max(20),
    personalAction: z
      .enum(["agir", "préparer", "surveiller", "ne rien changer"])
      .nullable(),
    personalReason: text(2000),
    maxAgeDays: z.number().int().min(1).max(730),
  })
  .strict()
  .superRefine((e, ctx) => {
    if (
      e.comparison &&
      (e.definition !== e.comparison.definition || e.unit !== e.comparison.unit)
    )
      ctx.addIssue({
        code: "custom",
        message: "Séries non comparables : unité ou définition différente.",
      });
    if (e.status !== "unknown" && (!e.verifiedAt || !e.reading.trim()))
      ctx.addIssue({
        code: "custom",
        message: "Lecture économique sans vérification ou justification.",
      });
    if (
      e.status === "crisis" &&
      (e.sourceRecords.length < 2 ||
        !e.counterArgument.trim() ||
        !e.risk.trim())
    )
      ctx.addIssue({
        code: "custom",
        message: "Crise : preuves et contre-argument insuffisants.",
      });
  });
export const insightSchema = z
  .object({
    id,
    eventId: id.optional(),
    futureDocumentId: id.optional(),
    title: text(1000).min(1),
    description: text(10000),
    year: z.number().int().min(2020).max(2100),
    status: z.enum([
      "observed",
      "hypothesis",
      "scenario",
      "watch",
      "contradicted",
      "unknown",
    ]),
    observedAt: calendarSchema.nullable(),
    publishedAt: calendarSchema.nullable(),
    verifiedAt: instant.nullable(),
    evidence: z.array(sourceRecordSchema).max(30),
    objections: text(4000),
    invalidation: text(4000),
    trigger: text(4000),
  })
  .strict();
export const unifiedSchema = z
  .object({
    format: z.literal("journal360.unified"),
    schemaVersion: z.literal(7),
    editionId: id,
    editionDate: calendarSchema,
    timezone: z.literal("Europe/Paris"),
    scheduleId: z.literal(V7_SCHEDULE),
    editionSlot: z.enum(V7_SLOTS),
    revision: z.number().int().min(1).max(1000000),
    sourceVerifiedAt: instant.nullable(),
    slotsIncluded: z.array(z.enum(V7_SLOTS)).min(1).max(8),
    missingSlots: z.array(z.enum(V7_SLOTS)).max(8),
    cumulativeStatus: cumulativeSchema,
    coverageWindow: z.object({ from: instant, to: instant }).strict(),
    title: text(1000).min(1),
    synthetic: z.boolean(),
    synthesis: z
      .object({
        text: text(10000),
        eventIds: z.array(id).max(100),
        kind: z.enum(["sourced-summary", "commentary"]),
      })
      .strict(),
    items: z.array(unifiedItemSchema).max(2000),
    economicSnapshots: z.array(economySchema).max(100),
    futureInsights: z.array(insightSchema).max(200),
    futureDocuments: z.array(futureSchema).max(5),
    promptAssets: z.array(promptAssetSchema).max(50),
    provenance: text(4000),
    warnings: z.array(text(1000)),
    sourcesNotVerified: z.array(text(1000)).max(100),
    previousRevisionRef: id.nullable(),
  })
  .strict()
  .superRefine((p, ctx) => {
    const issue = (message: string) =>
      ctx.addIssue({ code: "custom", message });
    if (p.editionId !== `journal360-day-${p.editionDate}`)
      issue("Identité/date incohérentes.");
    for (const list of [
      p.slotsIncluded,
      p.missingSlots,
      p.items.map((i) => i.id),
      p.items.map((i) => i.eventId),
      p.promptAssets.map((a) => a.promptId),
      p.futureInsights.map((i) => i.id),
      p.economicSnapshots.map((e) => e.id),
    ])
      if (new Set(list).size !== list.length)
        issue("Identifiant ou créneau dupliqué.");
    if (
      !p.slotsIncluded.includes(p.editionSlot) ||
      p.slotsIncluded.some((s) => s > p.editionSlot) ||
      p.missingSlots.some((s) => p.slotsIncluded.includes(s))
    )
      issue("Créneaux incohérents.");
    if (
      Date.parse(p.coverageWindow.from) > Date.parse(p.coverageWindow.to) ||
      parisClock(new Date(p.coverageWindow.to)).date !== p.editionDate
    )
      issue("Fenêtre de couverture incohérente.");
    const events = new Set(p.items.map((i) => i.eventId)),
      prompts = new Set(p.promptAssets.map((a) => a.promptId));
    if (
      p.synthesis.eventIds.some((i) => !events.has(i)) ||
      (p.synthesis.kind === "sourced-summary" &&
        p.synthesis.text.trim() &&
        !p.synthesis.eventIds.length)
    )
      issue("Synthèse sans référence aux événements.");
    for (const a of p.promptAssets)
      if (a.eventId && !events.has(a.eventId))
        issue("Prompt lié à un événement absent.");
    for (const item of p.items) {
      if (item.importance !== "context" && !item.importanceReason.trim())
        issue("Priorité éditoriale sans justification.");
      const sources = new Set(item.sourceRecords.map((s) => s.id));
      if (item.firstSeenSlot > p.editionSlot)
        issue("Première apparition postérieure au créneau.");
      if (
        item.evidenceStatus === "sourced" &&
        (!item.verifiedAt || !sources.size)
      )
        issue("Fait sourcé sans source ou vérification.");
      if (item.relatedEventIds.some((i) => !events.has(i)))
        issue("Relation événement absente.");
      for (const correction of item.corrections)
        if (correction.sourceIds.some((s) => !sources.has(s)))
          issue("Correction sans source correspondante.");
      for (const action of item.actions)
        if (
          action.sourceIds.some((s) => !sources.has(s)) ||
          (action.promptId && !prompts.has(action.promptId))
        )
          issue("Action sans preuve ou prompt correspondant.");
    }
    for (const i of p.futureInsights) {
      if (i.eventId && !events.has(i.eventId))
        issue("Jalon lié à un événement absent.");
      if (
        (i.status === "observed" || i.status === "contradicted") &&
        !i.evidence.length
      )
        issue("Observation/contradiction sans preuve.");
    }
  });
export type UnifiedEdition = z.infer<typeof unifiedSchema>;
export type EconomicSnapshot = z.infer<typeof economySchema>;
export type PromptAsset = z.infer<typeof promptAssetSchema>;
export function checkJSONBudget(value: unknown) {
  const stack = [{ value, depth: 0 }];
  let nodes = 0;
  while (stack.length) {
    const e = stack.pop()!;
    if (++nodes > 60000 || e.depth > 14)
      throw Error("JSON V7 trop complexe ou profond.");
    if (e.value && typeof e.value === "object")
      for (const v of Object.values(e.value))
        stack.push({ value: v, depth: e.depth + 1 });
  }
  if (new TextEncoder().encode(JSON.stringify(value)).length > 2 * 1024 * 1024)
    throw Error("Métadonnées V7 limitées à 2 Mo.");
}
export function validateUnified(value: unknown, at = new Date()) {
  checkJSONBudget(value);
  const result = unifiedSchema.safeParse(value);
  if (!result.success)
    throw new Error(
      result.error.issues
        .slice(0, 4)
        .map(
          (i) =>
            `${i.path.join(".") || "édition"} : ${i.code === "invalid_value" ? "Valeur non admise. Valeurs attendues : " + i.values.map((v) => JSON.stringify(v)).join(" | ") : i.message}`,
        )
        .join(" · "),
    );
  const p = result.data,
    today = parisClock(at).date,
    limit = +at + 300000;
  for (const i of p.futureInsights)
    if (
      i.status === "observed" &&
      (!i.observedAt || i.observedAt > today || i.year > +today.slice(0, 4))
    )
      throw Error("Un jalon futur ne peut pas être observé.");
  for (const instant of [
    p.sourceVerifiedAt,
    p.coverageWindow.to,
    ...p.items.flatMap((i) => [
      i.lastChangedAt,
      i.publishedAt,
      i.verifiedAt,
      ...i.corrections.map((c) => c.at),
    ]),
    ...p.economicSnapshots.flatMap((e) => [
      e.publishedAt,
      e.verifiedAt,
      e.revisedAt,
    ]),
  ])
    if (instant && Date.parse(instant) > limit)
      throw Error("Vérification ou publication datée dans le futur.");
  return p;
}
