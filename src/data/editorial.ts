import { z } from "zod";
export const SLOTS = ["08:00", "16:00", "21:00"] as const;
export const slotSchema = z.enum(SLOTS);
export type Slot = z.infer<typeof slotSchema>;
export const cumulativeSchema = z.enum(["COMPLETE", "PARTIAL", "UNKNOWN"]);
export function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T12:00:00Z`)) &&
    new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value
  );
}
export const calendarSchema = z
  .string()
  .refine(validDate, "Date calendaire invalide");
export const dayKeySchema = z
  .string()
  .refine(
    (value) =>
      value.startsWith("journal360-day-") && validDate(value.slice(15)),
    "Clé de journée invalide",
  );
const uniqueSlots = z
  .array(slotSchema)
  .max(3)
  .refine((a) => new Set(a).size === a.length);
const metadataSchema = z.object({
  // The producer V6.1 uses its editorial version here; normalize it to our
  // internal schema 2 after the same validation of every other field.
  schemaVersion: z.union([z.literal(2), z.literal("6.1")]),
  editionDate: calendarSchema.optional(),
  editionId: z.string().min(1).max(200).optional(),
  revision: z.number().int().min(1).max(1_000_000).optional(),
  slotsIncluded: uniqueSlots.optional(),
  cumulativeStatus: cumulativeSchema.optional(),
  missingSlots: uniqueSlots.optional(),
  retiredEventIds: z.array(z.string().min(1).max(200)).max(2000).optional(),
});
export function editorialMetadata(
  data: Record<string, unknown>,
  date: string | null,
  warnings: string[],
) {
  if (data.schemaVersion === undefined) return {};
  const result = metadataSchema.safeParse(data);
  if (!result.success) {
    warnings.push(
      "Métadonnées V6 invalides ou version inconnue : cumul non vérifiable, original conservé.",
    );
    return {};
  }
  const value = result.data;
  const dayKey =
    date &&
    value.editionDate === date &&
    value.editionId === `journal360-day-${date}`
      ? value.editionId
      : undefined;
  if (!dayKey)
    warnings.push(
      "Identifiant éditorial et date incohérents ou absents : cumul non vérifiable, classement par date uniquement.",
    );
  const slotsIncluded = [...(value.slotsIncluded || [])].sort() as Slot[];
  if (!value.revision || !slotsIncluded.length)
    warnings.push(
      "Révision externe ou créneaux absents : cumul non vérifiable.",
    );
  return {
    schemaVersion: 2 as const,
    dayKey,
    externalEditionId: value.editionId,
    externalRevision: value.revision,
    slotsIncluded,
    declaredCumulativeStatus: value.cumulativeStatus || ("UNKNOWN" as const),
    cumulativeStatus:
      value.cumulativeStatus === "PARTIAL"
        ? ("PARTIAL" as const)
        : ("UNKNOWN" as const),
    missingSlots: value.missingSlots || [],
    retiredEventIds: value.retiredEventIds || [],
    importOrigin: "file" as const,
  };
}
export function verifiedInstant(value: unknown, warnings: string[]) {
  if (value === undefined) return undefined;
  if (
    typeof value === "string" &&
    (validDate(value) ||
      z.iso.datetime({ offset: true }).safeParse(value).success)
  )
    return value;
  warnings.push(
    "Horodatage de vérification invalide : il n’a pas été inventé ni tronqué.",
  );
  return undefined;
}
export function verifiedLabel(value: string) {
  if (validDate(value))
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "long",
      timeZone: "Europe/Paris",
    }).format(new Date(`${value}T12:00:00Z`));
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "Europe/Paris",
      }).format(date)
    : "Horodatage inconnu";
}
