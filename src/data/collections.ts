import type { Edition } from "./model";

export const collections = [
  {
    id: "ai-major",
    label: "IA majeur",
    description:
      "Vos dossiers et veilles sur les avancées majeures de l’intelligence artificielle.",
  },
  {
    id: "sentinel",
    label: "Sentinel",
    description:
      "Vos rapports, dossiers et veilles Sentinel, réunis au même endroit.",
  },
] as const;
export type Collection = (typeof collections)[number]["id"];
export type ImportDestination = "library" | Collection;
export function isCollection(value: string): value is Collection {
  return collections.some((collection) => collection.id === value);
}
export function inCollection(
  edition: Edition,
  destination: ImportDestination,
): Edition {
  return {
    ...edition,
    collection: destination === "library" ? undefined : destination,
    dayKey: destination === "library" ? edition.dayKey : undefined,
    independent: destination === "library" ? edition.independent : true,
  };
}
