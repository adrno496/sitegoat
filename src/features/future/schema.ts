import { z } from "zod";
import { calendar, identifier, sourceUrl, text } from "../aiRadar/schema";
const required = (limit: number) => text(limit).min(1);
const strings = (limit = 30) => z.array(required(4000)).max(limit);
const links = z.array(sourceUrl).max(30);
export const modules = [
  "timeline",
  "scenarios",
  "signals",
  "actions",
  "changes",
  "sources",
] as const;
export const moduleLabels = {
  timeline: "Chronologie",
  scenarios: "Scénarios comparés",
  signals: "Signaux",
  actions: "Ma préparation",
  changes: "Évolutions",
  sources: "Sources & contradictions",
} as const;
export const statusLabels = {
  observed: "Observation déclarée",
  hypothesis: "Hypothèse",
  scenario: "Scénario",
  watch: "À surveiller",
  contradicted: "Contredit selon le dossier",
  unknown: "Inconnu",
} as const;
export const sourceSchema = z
  .object({
    id: identifier,
    label: required(500),
    url: sourceUrl.nullable(),
    publisher: text(300).default("Non renseigné"),
    author: text(300).nullable().default(null),
    publishedAt: calendar.nullable().default(null),
    type: z.enum(["primary", "secondary", "unknown"]).default("unknown"),
    consultedAt: z.iso.datetime({ offset: true }).nullable().default(null),
  })
  .strict();
export const futureSchema = z
  .object({
    format: z.literal("journal360.future"),
    version: z.literal(1),
    documentId: identifier,
    revision: z.number().int().positive().max(1_000_000),
    updatedAt: z.iso.datetime({ offset: true }),
    title: required(1000),
    status: z.enum(["observed", "hypothesis", "scenario"]),
    synthetic: z.boolean().default(false),
    editorialDecision: z
      .object({
        verdict: z.enum(["integrer", "surveiller", "ecarter"]),
        reason: required(4000),
      })
      .strict(),
    provenance: z
      .object({
        originType: z.enum([
          "video",
          "article",
          "report",
          "podcast",
          "web",
          "manual",
        ]),
        title: required(1000),
        originalUrl: sourceUrl.nullable(),
        author: text(300).nullable(),
        publishedAt: calendar.nullable(),
        providedAt: z.iso.datetime({ offset: true }),
        sources: z.array(sourceSchema).max(100),
        legacyFormat: z.literal("ai-radar").optional(),
      })
      .strict(),
    scenarios: z
      .array(
        z
          .object({
            id: identifier,
            title: required(1000),
            path: z.enum(["acceleration", "moderate", "slowdown", "other"]),
            horizon: z.enum(["2027", "2030", "2035", "2040+", "unspecified"]),
            status: z.enum(["hypothesis", "scenario"]),
            summary: required(10000),
            assumptions: strings(),
            objections: strings(),
            triggers: strings(),
            indicators: strings(),
            signalIds: z.array(identifier).max(100).default([]),
            milestones: z
              .array(
                z
                  .object({
                    id: identifier,
                    year: z.number().int().min(2020).max(2100),
                    title: required(1000),
                    description: required(10000),
                    status: z.enum(["observed", "hypothesis", "scenario"]),
                    evidenceUrls: links,
                    observedAt: calendar.nullable().default(null),
                  })
                  .strict(),
              )
              .max(100),
          })
          .strict(),
      )
      .max(30),
    signals: z
      .array(
        z
          .object({
            id: identifier,
            title: required(1000),
            status: z.enum(["observed", "watch", "contradicted", "unknown"]),
            description: required(10000),
            evidenceUrls: links,
            lastCheckedAt: z.iso.datetime({ offset: true }).nullable(),
            checkNote: text(4000).default(""),
          })
          .strict(),
      )
      .max(200),
    actions: z
      .array(
        z
          .object({
            id: identifier,
            title: required(1000),
            horizon: z.enum(["now", "3m", "12m"]),
            skill: required(2000),
            description: required(6000),
            effortHours: z.number().finite().min(0).max(10000).nullable(),
            effortEvidence: text(4000).default(""),
            decisiveTest: required(4000),
            scenarioIds: z.array(identifier).max(30).default([]),
          })
          .strict(),
      )
      .max(100),
    visualization: z
      .object({
        modules: z.array(z.enum(modules)).min(1).max(6),
        motion: z.enum(["subtle", "off"]),
        links: z
          .array(
            z
              .object({ from: identifier, to: identifier, label: text(500) })
              .strict(),
          )
          .max(200)
          .default([]),
      })
      .strict(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const allIds = [
      ...data.provenance.sources.map((s) => s.id),
      ...data.scenarios.flatMap((s) => [
        s.id,
        ...s.milestones.map((m) => m.id),
      ]),
      ...data.signals.map((s) => s.id),
      ...data.actions.map((a) => a.id),
    ];
    if (new Set(allIds).size !== allIds.length)
      ctx.addIssue({
        code: "custom",
        message: "Les identifiants doivent être uniques dans le dossier.",
      });
    if (
      new Set(data.visualization.modules).size !==
      data.visualization.modules.length
    )
      ctx.addIssue({ code: "custom", message: "Module visuel dupliqué." });
    const sourceUrls = new Set(data.provenance.sources.map((s) => s.url));
    const signalIds = new Set(data.signals.map((s) => s.id));
    const scenarioIds = new Set(data.scenarios.map((s) => s.id));
    const milestones = data.scenarios.flatMap((s) => s.milestones);
    const milestoneIds = new Set(milestones.map((m) => m.id));
    for (const entry of [...milestones, ...data.signals]) {
      if (
        (entry.status === "observed" || entry.status === "contradicted") &&
        !entry.evidenceUrls.length
      )
        ctx.addIssue({
          code: "custom",
          message: "Une observation ou contradiction exige une source.",
        });
      if (entry.evidenceUrls.some((url) => !sourceUrls.has(url)))
        ctx.addIssue({
          code: "custom",
          message: "Chaque preuve doit figurer dans provenance.sources.",
        });
    }
    for (const scenario of data.scenarios)
      if (scenario.signalIds.some((id) => !signalIds.has(id)))
        ctx.addIssue({
          code: "custom",
          message: "Référence à un signal absent.",
        });
    for (const action of data.actions) {
      if (action.scenarioIds.some((id) => !scenarioIds.has(id)))
        ctx.addIssue({
          code: "custom",
          message: "Référence à un scénario absent.",
        });
      if (action.effortHours !== null && !action.effortEvidence.trim())
        ctx.addIssue({
          code: "custom",
          message: "Un effort chiffré doit être documenté.",
        });
    }
    for (const link of data.visualization.links)
      if (
        !milestoneIds.has(link.from) ||
        !milestoneIds.has(link.to) ||
        link.from === link.to
      )
        ctx.addIssue({
          code: "custom",
          message: "Lien chronologique invalide.",
        });
    if (Date.parse(data.updatedAt) < Date.parse(data.provenance.providedAt))
      ctx.addIssue({
        code: "custom",
        message: "La révision précède la remise de la source.",
      });
    if (
      data.provenance.publishedAt &&
      data.provenance.publishedAt > data.provenance.providedAt.slice(0, 10)
    )
      ctx.addIssue({
        code: "custom",
        message: "Publication postérieure à la capture.",
      });
  });
export type FuturePayload = z.infer<typeof futureSchema>;
export const actionStateSchema = z
  .object({
    status: z.enum(["todo", "doing", "done", "abandoned"]),
    result: text(4000).default(""),
  })
  .strict();
export const personalSchema = z
  .object({
    documentId: identifier,
    favorite: z.boolean().default(false),
    notes: z
      .array(
        z
          .object({ id: z.uuid(), body: required(20000), at: z.iso.datetime() })
          .strict(),
      )
      .max(3000)
      .default([]),
    decision: text(4000).default(""),
    invalidation: text(4000).default(""),
    reviewDate: z.union([calendar, z.literal("")]).default(""),
    actions: z.record(identifier, actionStateSchema).default({}),
    sourceReviews: z
      .record(
        identifier,
        z.object({ at: z.iso.datetime(), reason: required(4000) }).strict(),
      )
      .default({}),
    updatedAt: z.iso.datetime(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (new Set(data.notes.map((note) => note.id)).size !== data.notes.length)
      ctx.addIssue({
        code: "custom",
        message: "Identifiant de note dupliqué.",
      });
  });
export type FuturePersonal = z.infer<typeof personalSchema>;
export const exportSchema = () =>
  z.toJSONSchema(futureSchema, { io: "input", unrepresentable: "any" });
