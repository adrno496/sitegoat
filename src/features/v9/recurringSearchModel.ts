import { z } from "zod";

export const RECURRING_SEARCHES_KEY = "journal360.recurring-searches.v1";
export const cadences = {
  daily: { label: "Chaque jour", period: "d", results: "Dernières 24 heures" },
  weekly: { label: "Chaque semaine", period: "w", results: "7 derniers jours" },
  monthly: { label: "Chaque mois", period: "m", results: "Dernier mois" },
} as const;
export type SearchCadence = keyof typeof cadences;
const searchSchema = z
  .object({
    id: z.uuid(),
    theme: z.string().trim().min(1).max(120),
    query: z.string().trim().min(1).max(1000),
    cadence: z.enum(["daily", "weekly", "monthly"]),
    lastOpenedAt: z.iso.datetime().nullable(),
  })
  .strict();
const schema = z
  .object({ version: z.literal(1), items: z.array(searchSchema) })
  .strict();
export type RecurringSearch = z.infer<typeof searchSchema>;

export function parseRecurringSearches(raw: string | null): RecurringSearch[] {
  if (raw === null) return [];
  return schema.parse(JSON.parse(raw)).items;
}
export function serializeRecurringSearches(items: RecurringSearch[]) {
  return JSON.stringify(schema.parse({ version: 1, items }));
}
export function recurringGoogleUrl(
  search: Pick<RecurringSearch, "query" | "cadence">,
) {
  const url = new URL("https://www.google.com/search");
  url.searchParams.set("q", search.query);
  url.searchParams.set("hl", "fr");
  url.searchParams.set("tbs", `qdr:${cadences[search.cadence].period}`);
  return url.href;
}
export function nextSearchAt(search: RecurringSearch): Date | null {
  if (!search.lastOpenedAt) return null;
  const last = new Date(search.lastOpenedAt);
  if (search.cadence !== "monthly")
    return new Date(+last + (search.cadence === "daily" ? 1 : 7) * 86400000);
  // Clamp a monthly recurrence on the 31st to the end of the next month.
  const next = new Date(last);
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const end = new Date(next);
  end.setUTCMonth(end.getUTCMonth() + 1);
  end.setUTCDate(0);
  next.setUTCDate(Math.min(last.getUTCDate(), end.getUTCDate()));
  return next;
}
