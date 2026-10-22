import { indexQuickBriefs } from "../data/quickBriefs";
import type { Edition } from "../data/model";
import { dateLabel } from "../data/model";
import { dayKeyOf, resolveDay } from "../data/day";
import { scheduleFor } from "../data/editorial";
import { latestCurrent } from "./unified/selectors";
import { SnapshotStatus } from "./SnapshotStatus";
export function ImportDiagnostics({
  editions,
  onOpen,
  onDay,
  open,
  onToggle,
}: {
  editions: Edition[];
  open?: boolean;
  onToggle?: (open: boolean) => void;
  onOpen: (id: string) => void;
  onDay: (key: string) => void;
}) {
  const current = latestCurrent(editions);
  const versions = current
    ? editions.filter(
        (e) =>
          !e.deleted &&
          (dayKeyOf(current)
            ? dayKeyOf(e) === dayKeyOf(current)
            : e.id === current.id),
      )
    : [];
  const day = resolveDay(versions),
    assessment = day.versions.find(
      (v) => v.edition.id === current?.id,
    )?.assessment;
  const briefIndex = indexQuickBriefs(versions);
  const absentBriefs = briefIndex.filter(
    (r) =>
      !current?.quickBriefs?.items.some((i) => i.eventId === r.item.eventId),
  );
  return (
    <details
      className="quiet-panel import-diagnostics"
      open={open}
      onToggle={(e) => onToggle?.(e.currentTarget.open)}
    >
      <summary>Avancé · Diagnostic des imports</summary>
      <h2>Dernière édition effectivement reçue</h2>
      {current ? (
        <>
          <p>
            {dateLabel(current.date)} ·{" "}
            {current.editionSlot || "Heure inconnue"} · révision{" "}
            {current.externalRevision || "inconnue"}
          </p>
          <p>
            Vérification déclarée : {current.sourceVerifiedAt || "absente"} ·
            cumul {day.status}
          </p>
          {assessment?.snapshot && <SnapshotStatus assessment={assessment} />}
          {assessment &&
            !assessment.snapshot &&
            assessment.issues.map((i) => <p key={i}>{i}</p>)}
          <div
            className="unified-slots"
            role="group"
            aria-label="Éditions et créneaux de la journée"
          >
            {scheduleFor(current).map((slot) => {
              const original = resolveDay(
                versions.filter(
                  (e) =>
                    e.editionSlot === slot ||
                    (!e.unified && e.slotsIncluded?.at(-1) === slot),
                ),
              ).current;
              return (
                <button
                  className="secondary"
                  key={slot}
                  disabled={!original}
                  onClick={() => original && onOpen(original.id)}
                  aria-label={`${slot} · ${original ? "Disponible" : "Édition originale non importée"}`}
                >
                  <b>{slot}</b>
                  <span>
                    {original
                      ? "Original disponible"
                      : "Édition originale non importée"}
                  </span>
                </button>
              );
            })}
          </div>
          <p>
            Les créneaux déclarés couverts ne constituent pas des fichiers
            importés.
          </p>
          {current.dayKey && (
            <button
              className="secondary"
              onClick={() => onDay(current.dayKey!)}
            >
              Historique des originaux
            </button>
          )}
          <p className="hash-text">SHA-256 : {current.sha256}</p>
          <p>Provenance : {current.unified?.provenance || "Non déclarée"}</p>
          {briefIndex.length > 0 && (
            <p>
              {briefIndex.length} identités de brèves conservées ·{" "}
              {briefIndex.filter((r) => r.promoted).length} promotions.{" "}
              {absentBriefs.length > 0
                ? `${absentBriefs.length} brèves antérieures absentes du dernier compagnon ; leurs originaux et leur index restent conservés.`
                : "Aucune omission de brève constatée parmi les imports locaux."}
            </p>
          )}
          {current.quickBriefs && (
            <p>
              Compagnon brèves v1 : {current.quickBriefs.items.length} titres.{" "}
              {current.quickBriefs.notice}
            </p>
          )}
          {current.warnings.map((w, n) => (
            <p key={n}>{w}</p>
          ))}
        </>
      ) : (
        <p>Aucune édition importée.</p>
      )}
    </details>
  );
}
