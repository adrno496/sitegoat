import { z } from "zod";
import { calendarSchema, V7_SLOTS } from "./editorial";
import { validateSourceUrl } from "../features/sourceUrl";
const id = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[\w.:-]+$/);
const source = z
  .object({
    publisher: z.string().min(1).max(300),
    url: z
      .string()
      .max(2048)
      .refine((v) => v.startsWith("https://") && !!validateSourceUrl(v)),
  })
  .strict();
export const quickBriefSchema = z
  .object({
    eventId: id,
    title: z.string().min(1).max(1000),
    theme: z.string().min(1).max(200),
    publishedAt: calendarSchema,
    eventDate: calendarSchema,
    source,
    evidenceStatus: z.enum([
      "presse-sourcée",
      "source-primaire",
      "annoncé",
      "déduit",
      "contesté",
      "non-testé",
    ]),
    googleQuery: z.string().max(2000),
    relatedArticleEventId: id.nullable(),
    corrections: z
      .array(
        z
          .object({
            at: z.iso.datetime({ offset: true }),
            reason: z.string().min(10).max(2000),
            source,
          })
          .strict(),
      )
      .max(30)
      .optional(),
  })
  .strict();
export const quickBriefsSchema = z
  .object({
    format: z.literal("journal360.quickbriefs"),
    schemaVersion: z.literal(1),
    editionId: id,
    editionDate: calendarSchema,
    editionSlot: z.enum(V7_SLOTS),
    items: z.array(quickBriefSchema),
    notice: z.string().max(4000),
  })
  .strict()
  .superRefine((p, ctx) => {
    if (
      p.editionId !== `journal360-day-${p.editionDate}` ||
      new Set(p.items.map((i) => i.eventId)).size !== p.items.length
    )
      ctx.addIssue({
        code: "custom",
        message: "Identité ou événements des brèves incohérents.",
      });
  });
export type QuickBriefs = z.infer<typeof quickBriefsSchema>;
export type QuickBrief = z.infer<typeof quickBriefSchema>;
