import { z } from "zod";

export const RADAR_LIMIT = 10 * 1024 * 1024;
// These characters are deliberately rejected at the untrusted text boundary.
const control =
  // eslint-disable-next-line no-control-regex
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u;
export const text = (max: number) =>
  z
    .string()
    .max(max)
    .refine(
      (value) => !control.test(value),
      "Caractère de contrôle ou directionnel refusé.",
    );
const required = (max: number) => text(max).min(1);
export const identifier = z
  .string()
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,199}$/);
export const calendar = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T12:00:00Z`);
    return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value;
  }, "Date inexistante.");
const dateOrInstant = z.union([calendar, z.iso.datetime({ offset: true })]);
export function publicHttps(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return (
      value.startsWith("https://") &&
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      !/[\s\\]/u.test(value) &&
      !control.test(value) &&
      host.includes(".") &&
      !/^[\d.]+$/.test(host) &&
      !host.includes(":") &&
      !/(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(host)
    );
  } catch {
    return false;
  }
}
export const sourceUrl = required(2048).refine(
  publicHttps,
  "Une URL HTTPS publique est requise.",
);
export const evidenceSchema = z.enum([
  "confirmed",
  "supplier_claim",
  "partial",
  "hypothesis",
  "rumor",
]);
export const evidenceLabels = {
  confirmed: "Fait déclaré confirmé",
  supplier_claim: "Déclaration fournisseur",
  partial: "Observation partielle",
  hypothesis: "Hypothèse / scénario",
  rumor: "Rumeur non retenue",
} as const;
export const verdictLabels = {
  integrer: "Intégrer",
  surveiller: "À surveiller",
  ecarter: "Écarter",
} as const;
export const sourceSchema = z
  .object({
    label: required(500),
    url: sourceUrl,
    publisher: text(300).optional(),
    author: text(300).nullable().optional(),
    publishedAt: dateOrInstant.nullable().optional(),
    capturedAt: dateOrInstant.optional(),
    evidenceType: z
      .enum(["primary", "secondary", "unknown"])
      .default("unknown"),
  })
  .strict();
export const opportunitySchema = z
  .object({
    id: identifier,
    title: required(500),
    target: required(1000),
    problem: required(3000),
    value: required(3000),
    channel: text(2000).default("À déterminer"),
    priceHypothesis: text(2000).default("Non validé"),
    startupCostEUR: z
      .number()
      .finite()
      .min(0)
      .max(1_000_000)
      .nullable()
      .default(null),
    fixedCostEUR: z
      .number()
      .finite()
      .min(0)
      .max(1_000_000)
      .nullable()
      .default(null),
    variableCostEUR: z
      .number()
      .finite()
      .min(0)
      .max(1_000_000)
      .nullable()
      .default(null),
    hours: z.number().finite().min(0).max(10000).nullable().default(null),
    testDays: z.number().int().min(1).max(365).nullable().default(null),
    difficulty: z.enum(["low", "medium", "high", "unknown"]).default("unknown"),
    horizon: z.enum(["0-3m", "3-12m", "1-3y"]).default("0-3m"),
    demandEvidence: text(4000).default("Demande non démontrée"),
    competition: text(4000).default("Concurrence non étudiée"),
    dependencies: z.array(text(1000)).max(30).default([]),
    risks: z.array(text(2000)).max(30).default([]),
    objection: required(4000),
    nextTest: required(4000),
    continueIf: text(3000).default("À définir"),
    stopIf: text(3000).default("À définir"),
    tags: z.array(text(100)).max(30).default([]),
  })
  .strict();
export const measurementSchema = z
  .object({
    id: identifier,
    metric: required(300),
    value: z.number().finite(),
    unit: required(100),
    version: required(200),
    date: calendar,
    protocol: required(2000),
    context: required(2000),
    source: sourceUrl,
  })
  .strict();
export const payloadSchema = z
  .object({
    contentType: z.literal("ai-radar"),
    aiRadarVersion: z.literal(1),
    documentId: identifier.optional(),
    title: required(1000),
    date: calendar,
    editorialVerdict: z.enum(["integrer", "surveiller", "ecarter"]),
    editorialReason: text(4000).default(
      "Motif non fourni : revue éditoriale nécessaire.",
    ),
    evidenceStatus: evidenceSchema,
    sourceVerifiedAt: dateOrInstant.optional(),
    synthetic: z.boolean().default(false),
    items: z
      .array(
        z
          .object({
            id: identifier,
            event_id: identifier,
            title: required(1000),
            category: required(200),
            date: calendar,
            kind: z.enum([
              "news",
              "business",
              "hypothesis",
              "technical",
              "decision",
            ]),
            plain: required(50000),
            detail: text(100000).default(""),
            summary: text(10000).optional(),
            steps: z.array(text(2000)).max(30).default([]),
            sources: z.array(sourceSchema).min(1).max(30),
          })
          .strict(),
      )
      .min(1)
      .max(100),
    radar: z
      .object({
        originType: z.enum([
          "video",
          "article",
          "report",
          "podcast",
          "web",
          "manual",
        ]),
        sourceTitle: required(1000),
        sourcePublishedAt: dateOrInstant.nullable(),
        sourceAuthor: text(300).nullable(),
        fetchedOrProvidedAt: dateOrInstant,
        confidence: z.enum(["low", "medium", "high"]),
        reviewRequired: z.boolean(),
        topics: z.array(required(100)).max(30),
        opportunities: z.array(opportunitySchema).max(50),
        decisions: z.array(text(3000)).max(50),
        uncertainties: z.array(text(3000)).max(50),
        impacts: z
          .array(
            z
              .object({
                horizon: z.enum(["0-3m", "3-12m", "1-3y"]),
                statement: required(4000),
                uncertainty: required(3000),
              })
              .strict(),
          )
          .max(12)
          .default([]),
        skills: z
          .array(
            z
              .object({
                title: required(500),
                observation: required(4000),
                forecast: required(4000),
                recommendation: required(4000),
                days7: text(4000),
                days30: text(4000),
                days90: text(4000),
              })
              .strict(),
          )
          .max(30)
          .default([]),
        measurements: z.array(measurementSchema).max(100).default([]),
      })
      .strict(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const ids = new Set<string>();
    for (const item of data.items) {
      if (ids.has(item.id))
        ctx.addIssue({
          code: "custom",
          message: "Identifiant d’article dupliqué.",
        });
      ids.add(item.id);
      if (item.date > data.date)
        ctx.addIssue({
          code: "custom",
          message:
            "Un événement futur doit être décrit comme scénario, pas daté comme fait acquis.",
        });
      if (data.evidenceStatus === "hypothesis" && item.kind !== "hypothesis")
        ctx.addIssue({
          code: "custom",
          message:
            "Un scénario doit conserver kind=hypothesis pour chaque fiche.",
        });
    }
    if (data.date > data.radar.fetchedOrProvidedAt.slice(0, 10))
      ctx.addIssue({
        code: "custom",
        message: "La capture ne peut pas précéder le document.",
      });
    if (
      data.sourceVerifiedAt &&
      data.sourceVerifiedAt.slice(0, 10) >
        data.radar.fetchedOrProvidedAt.slice(0, 10)
    )
      ctx.addIssue({
        code: "custom",
        message: "Vérification postérieure à la capture.",
      });
    if (data.evidenceStatus === "rumor" && data.editorialVerdict === "integrer")
      ctx.addIssue({
        code: "custom",
        message: "Une rumeur ne peut pas être intégrée comme actualité.",
      });
  });
export type RadarPayload = z.infer<typeof payloadSchema>;
