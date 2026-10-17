import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { statusLabels, type FuturePayload } from "./schema";
import {
  itemAnchor,
  pathLabels,
  periodFor,
  timelineItems,
  timelinePeriods,
} from "./selectors";
import { FutureEvidence, FutureText } from "./FutureEvidence";
export function FutureTimeline({ payload: p }: { payload: FuturePayload }) {
  const items = useMemo(() => timelineItems(p), [p]),
    periods = useMemo(() => timelinePeriods(p), [p]);
  const [period, setPeriod] = useState(() =>
      items[0] ? periodFor(items[0].year) : "2027",
    ),
    [limit, setLimit] = useState(12),
    [interacted, setInteracted] = useState(false),
    [pending, setPending] = useState("");
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const active = periods.includes(period) ? period : periods[0],
    index = periods.indexOf(active),
    visible = items.filter((m) => periodFor(m.year) === active);
  function select(value: string) {
    setPeriod(value);
    setLimit(12);
    setInteracted(true);
  }
  function key(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const next =
      e.key === "ArrowRight"
        ? Math.min(periods.length - 1, i + 1)
        : e.key === "ArrowLeft"
          ? Math.max(0, i - 1)
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? periods.length - 1
              : -1;
    if (next < 0) return;
    e.preventDefault();
    select(periods[next]);
    buttons.current[next]?.focus();
  }
  function follow(id: string) {
    const target = items.find((m) => m.id === id);
    if (!target) return;
    const group = items.filter(
      (m) => periodFor(m.year) === periodFor(target.year),
    );
    setPeriod(periodFor(target.year));
    setLimit(Math.max(12, group.findIndex((m) => m.id === id) + 1));
    setInteracted(true);
    setPending(id);
  }
  useEffect(() => {
    if (pending) {
      document.getElementById(itemAnchor(pending))?.focus();
      setPending("");
    }
  }, [pending, period, limit]);
  return (
    <>
      <div className="future-section-heading">
        <span className="future-kicker">01 / CHRONOLOGIE</span>
        <h2>Parcourir les horizons.</h2>
        <p>
          Des jalons déclarés, pas un calendrier garanti. Choisissez une période
          pour explorer les trajectoires.
        </p>
      </div>
      <div
        className="future-horizon-rail"
        role="group"
        aria-label="Horizons de la chronologie"
      >
        {periods.map((year, i) => (
          <button
            key={year}
            ref={(el) => {
              buttons.current[i] = el;
            }}
            aria-pressed={active === year}
            onKeyDown={(e) => key(e, i)}
            onClick={() => select(year)}
          >
            <span>{year}</span>
            <small>
              {items.filter((m) => periodFor(m.year) === year).length} jalon(s)
            </small>
          </button>
        ))}
      </div>
      <div className="future-period-controls">
        <button
          onClick={() => select(periods[index - 1])}
          disabled={index === 0}
        >
          ← Horizon précédent
        </button>
        <span role="status">
          {active} · {visible.length} jalon(s)
        </span>
        <button
          onClick={() => select(periods[index + 1])}
          disabled={index === periods.length - 1}
        >
          Horizon suivant →
        </button>
      </div>
      <div
        key={active}
        className={
          "future-timeline" + (interacted ? " future-interaction" : "")
        }
      >
        <div className="future-period-title" aria-hidden="true">
          {active}
          <span>HORIZON</span>
        </div>
        <div className="future-milestones">
          {visible.slice(0, limit).map((m) => (
            <article
              className="future-milestone quiet-panel"
              key={m.id}
              id={itemAnchor(m.id)}
              tabIndex={-1}
            >
              <span className="future-badge">
                {m.year} · {statusLabels[m.status]}
              </span>
              <h3>{m.title}</h3>
              <FutureText text={m.description} />
              <p className="future-caption">
                {pathLabels[m.path]} · {m.scenario}
                {m.observedAt
                  ? " · Observation déclarée le " + m.observedAt
                  : ""}
              </p>
              <details>
                <summary>D’où vient cette affirmation ?</summary>
                <FutureEvidence urls={m.evidenceUrls} payload={p} />
              </details>
              {p.visualization.links
                .filter((l) => l.from === m.id)
                .map((l, i) => (
                  <a
                    className="future-related"
                    key={i}
                    href={"#" + itemAnchor(l.to)}
                    onClick={(e) => {
                      e.preventDefault();
                      follow(l.to);
                    }}
                  >
                    {l.label || "Voir le jalon lié"} →{" "}
                    {items.find((target) => target.id === l.to)?.title}
                  </a>
                ))}
            </article>
          ))}
          {!visible.length && (
            <p className="future-empty">
              Aucun jalon renseigné pour cet horizon. Les autres périodes
              restent accessibles.
            </p>
          )}
          {visible.length > limit && (
            <button onClick={() => setLimit((n) => n + 12)}>
              Afficher 12 jalons de plus ({visible.length - limit} restants)
            </button>
          )}
        </div>
      </div>
      {p.visualization.links.length > 0 && (
        <details className="future-relations">
          <summary>
            Relations déclarées entre les jalons ({p.visualization.links.length}
            )
          </summary>
          <ul>
            {p.visualization.links.map((l, i) => (
              <li key={i}>
                {items.find((m) => m.id === l.from)?.title} →{" "}
                <a
                  href={"#" + itemAnchor(l.to)}
                  onClick={(e) => {
                    e.preventDefault();
                    follow(l.to);
                  }}
                >
                  {items.find((m) => m.id === l.to)?.title}
                </a>
                {l.label ? " · " + l.label : ""}
              </li>
            ))}
          </ul>
          <p>Aucun lien supplémentaire n’est déduit par l’application.</p>
        </details>
      )}
    </>
  );
}
