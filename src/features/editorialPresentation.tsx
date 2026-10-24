import { useEffect, useState } from "react";
import { parisClock, validDate } from "../data/editorial";
import { dateLabel, type Edition } from "../data/model";

export function instantCompare(a?: string | null, b?: string | null) {
  const x = a ? Date.parse(a) : NaN,
    y = b ? Date.parse(b) : NaN;
  if (!Number.isFinite(x)) return Number.isFinite(y) ? -1 : 0;
  if (!Number.isFinite(y)) return 1;
  return x - y;
}
export function editorialDate(value?: string | null): string {
  if (!value || !Number.isFinite(Date.parse(value))) return "inconnue";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value) && !validDate(value)) return "inconnue";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return dateLabel(value);
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(value));
}
export function evidenceLabel(value?: string, brief = false) {
  const articles: Record<string, string> = {
    sourced: "Sourcé (déclaré)",
    unverified: "Non vérifié",
    hypothesis: "Hypothèse",
  };
  const briefs: Record<string, string> = {
    "presse-sourcée": "Presse sourcée (déclaré)",
    "source-primaire": "Source primaire (déclaré)",
    annoncé: "Annoncé",
    déduit: "Déduit",
    contesté: "Contesté",
    "non-testé": "Non testé",
  };
  return (brief ? briefs : articles)[value || ""] || "Statut de preuve inconnu";
}
// Compact display requested by the owner. Full editorial fields remain in the
// immutable source/index and explicit reading exports, never overwritten here.
export function EditorialMetadata({
  item,
}: {
  edition: Edition;
  item?: {
    publishedAt?: string;
    eventDate?: string;
    verifiedAt?: string | null;
    evidenceStatus?: string;
  };
  brief?: boolean;
}) {
  if (!item?.publishedAt || editorialDate(item.publishedAt) === "inconnue")
    return null;
  return (
    <p className="editorial-metadata small-note">
      <time dateTime={item.publishedAt}>{editorialDate(item.publishedAt)}</time>
    </p>
  );
}
// Re-evaluate wall clock at least each second while visible and immediately on
// focus/pageshow/visibility. Handles clock corrections and DST without a cached
// UTC offset. No imported date is rewritten.
export function useParisToday() {
  const [day, setDay] = useState(() => parisClock().date);
  useEffect(() => {
    const update = () => setDay(parisClock().date);
    const interval = window.setInterval(update, 1000);
    window.addEventListener("focus", update);
    window.addEventListener("pageshow", update);
    document.addEventListener("visibilitychange", update);
    update();
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", update);
      window.removeEventListener("pageshow", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return day;
}
export function EditionFreshness({ edition }: { edition?: Edition }) {
  const day = useParisToday();
  return edition && edition.date !== day ? (
    <p className="warning" role="status">
      Aucune édition reçue aujourd’hui ; dernière édition disponible du{" "}
      {dateLabel(edition.date)}. Les contenus conservent leurs dates d’origine.
    </p>
  ) : null;
}
