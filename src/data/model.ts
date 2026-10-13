import { z } from "zod";
export const articleSchema = z.object({
  id: z.string().max(200),
  eventId: z.string().max(200).optional(),
  title: z.string().max(1000),
  category: z.string().max(200),
  text: z.string().max(2_000_000),
  sources: z.array(z.string().max(2048)).max(100),
  date: z.string().optional(),
});
export const editionSchema = z.object({
  id: z.uuid(),
  familyId: z.uuid(),
  revision: z.number().int().positive(),
  filename: z.string().max(300),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  title: z.string().max(1000),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  importedAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  size: z
    .number()
    .int()
    .min(1)
    .max(10 * 1024 * 1024),
  categories: z.array(z.string().max(200)).max(200),
  excerpt: z.string().max(500),
  text: z.string().max(10_000_000),
  articles: z.array(articleSchema).max(2000),
  warnings: z.array(z.string()).max(30),
  demo: z.boolean(),
  archived: z.boolean(),
  deleted: z.boolean(),
  sourceVerifiedAt: z.string().optional(),
});
export const stateSchema = z.object({
  id: z.string().max(500),
  editionId: z.uuid(),
  articleId: z.string().max(200),
  favorite: z.boolean(),
  read: z.boolean(),
  openedAt: z.string().nullable(),
  updatedAt: z.iso.datetime(),
});
export const noteSchema = z.object({
  id: z.uuid(),
  editionId: z.uuid(),
  articleId: z.string().max(200).optional(),
  body: z.string().max(20000),
  kind: z.enum(["note", "decision"]),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Article = z.infer<typeof articleSchema>;
export type Edition = z.infer<typeof editionSchema>;
export type ReadingState = z.infer<typeof stateSchema>;
export type Note = z.infer<typeof noteSchema>;
export interface Original {
  id: string;
  bytes: Uint8Array;
}
export interface Job {
  id: string;
  kind: "cloud-backup";
  status: "pending" | "error";
  attempts: number;
  createdAt: string;
  lastError?: string;
  ownerId: string;
}
export interface Preference {
  key: string;
  value: string;
}
export const now = () => new Date().toISOString();
export async function hash(bytes: Uint8Array): Promise<string> {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", buffer))]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
}
export function blobOf(bytes: Uint8Array, type = "text/html") {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return new Blob([buffer], { type });
}
export function dateLabel(date: string | null) {
  return date
    ? new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "long",
        timeZone: "Europe/Paris",
      }).format(new Date(`${date}T12:00:00Z`))
    : "Date inconnue";
}
export function sizeLabel(size: number) {
  return size < 1024 * 1024
    ? `${Math.max(1, Math.round(size / 1024))} Ko`
    : `${(size / 1024 / 1024).toFixed(1)} Mo`;
}
export function sortEditions(editions: Edition[]) {
  return [...editions].sort(
    (a, b) =>
      (b.date || "").localeCompare(a.date || "") ||
      b.importedAt.localeCompare(a.importedAt) ||
      a.id.localeCompare(b.id),
  );
}
