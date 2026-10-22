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
const schema = z.discriminatedUnion("version", [
  z.object({ version: z.literal(1), items: z.array(searchSchema) }).strict(),
  z.object({ version: z.literal(2), items: z.array(searchSchema) }).strict(),
]);
export type RecurringSearch = z.infer<typeof searchSchema>;

const preparedThemes: {
  theme: string;
  query: string;
  cadence: SearchCadence;
}[] = [
  {
    theme: "IA et agents",
    query: "intelligence artificielle agents IA modèles nouveautés",
    cadence: "daily",
  },
  {
    theme: "Cybersécurité",
    query: "cybersécurité vulnérabilités attaques correctifs",
    cadence: "daily",
  },
  {
    theme: "Économie et marchés",
    query: "économie inflation taux banques centrales marchés",
    cadence: "daily",
  },
  {
    theme: "Géopolitique",
    query: "géopolitique relations internationales conflits diplomatie",
    cadence: "daily",
  },
  {
    theme: "Énergie et climat",
    query: "énergie transition énergétique climat innovations",
    cadence: "daily",
  },
  {
    theme: "Sciences et recherche",
    query: "recherche scientifique découvertes nouvelles études",
    cadence: "weekly",
  },
  {
    theme: "Robotique",
    query: "robotique robots humanoïdes automatisation nouveautés",
    cadence: "weekly",
  },
  {
    theme: "Espace",
    query: "spatial satellites exploration spatiale lancements",
    cadence: "weekly",
  },
  {
    theme: "Santé et biotechnologies",
    query: "santé biotechnologies recherche médicale avancées",
    cadence: "weekly",
  },
  {
    theme: "Prospective 2030",
    query: "prospective 2030 tendances technologies scénarios futur",
    cadence: "monthly",
  },
];
export function defaultRecurringSearches(): RecurringSearch[] {
  return preparedThemes.map((search, index) => ({
    ...search,
    id: `b79a8612-7d6c-4f90-8a31-${String(index + 1).padStart(12, "0")}`,
    lastOpenedAt: null,
  }));
}
export function parseRecurringSearches(raw: string | null): RecurringSearch[] {
  if (raw === null) return defaultRecurringSearches();
  const stored = schema.parse(JSON.parse(raw));
  if (stored.version === 2) return stored.items;
  // Seed existing installations once, preserving their custom themes. Version
  // 2 also remembers intentional edits, deletions and an empty collection.
  const themes = new Set(
    stored.items.map((s) => s.theme.toLocaleLowerCase("fr")),
  );
  return [
    ...stored.items,
    ...defaultRecurringSearches().filter(
      (s) => !themes.has(s.theme.toLocaleLowerCase("fr")),
    ),
  ];
}
export function serializeRecurringSearches(items: RecurringSearch[]) {
  return JSON.stringify(schema.parse({ version: 2, items }));
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
