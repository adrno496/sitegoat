import { useEffect, useRef, useState } from "react";
import type { Edition } from "../../data/model";
import { editorialDate } from "../editorialPresentation";
import { validateSourceUrl } from "../sourceUrl";
import { EconomyRadar } from "../unified/EconomyRadar";
import {
  catalogSchema,
  DEFAULT_SOURCES,
  readSourceCache,
  requestSource,
  saveSourceResult,
  type SourceResult,
} from "./SourceExplorer";
import "../unified/unified.css";
import "./liveWatch.css";

export default function LiveWatch({
  editions,
  accessToken,
  onSettings,
}: {
  editions: Edition[];
  accessToken?: string;
  onSettings: () => void;
}) {
  const [pane, setPane] = useState("feeds");
  const [sources, setSources] = useState(DEFAULT_SOURCES);
  const [selected, setSelected] = useState(["worldbank", "ecb"]);
  const [query, setQuery] = useState("");
  const [minutes, setMinutes] = useState(30);
  const [mode, setMode] = useState<"paused" | "once" | "continuous">("paused");
  const [ticket, setTicket] = useState(0);
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [visible, setVisible] = useState(!document.hidden);
  const [results, setResults] = useState(readSourceCache);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [storageNotice, setStorageNotice] = useState("");
  const nextDue = useRef(0);
  const catalog = useRef(DEFAULT_SOURCES);
  useEffect(() => {
    const connectivity = () => setOnline(navigator.onLine);
    const visibility = () => setVisible(!document.hidden);
    const storage = () => setResults(readSourceCache());
    window.addEventListener("online", connectivity);
    window.addEventListener("offline", connectivity);
    window.addEventListener("storage", storage);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("online", connectivity);
      window.removeEventListener("offline", connectivity);
      window.removeEventListener("storage", storage);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    if (!online) return;
    const controller = new AbortController();
    fetch("/api/sources", {
      signal: controller.signal,
      credentials: "omit",
      cache: "no-store",
    })
      .then(async (r) => {
        if (!r.ok) throw Error();
        return catalogSchema.parse(await r.json());
      })
      .then((r) => {
        catalog.current = r.sources;
        setSources(r.sources);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [online]);
  useEffect(() => {
    if (mode === "paused" || !online || !visible) {
      setBusy(false);
      return;
    }
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function cycle() {
      const targets = catalog.current.filter(
        (s) =>
          selected.includes(s.id) && s.available && (!s.private || accessToken),
      );
      setBusy(true);
      setErrors({});
      setStorageNotice("");
      for (const source of targets) {
        if (controller.signal.aborted) return;
        try {
          const value = await requestSource(
            source,
            query,
            accessToken,
            controller.signal,
          );
          if (controller.signal.aborted) return;
          setResults((old) =>
            [
              value,
              ...old.filter(
                (r) => r.provider !== value.provider || r.query !== value.query,
              ),
            ].slice(0, 10),
          );
          try {
            saveSourceResult(value);
          } catch {
            setStorageNotice(
              "Résultats reçus, mais leur conservation hors ligne est indisponible. Les anciennes données sont conservées.",
            );
          }
        } catch (error) {
          if (controller.signal.aborted) return;
          setErrors((old) => ({
            ...old,
            [source.id]:
              error instanceof Error ? error.message : "Source indisponible.",
          }));
        }
      }
      if (controller.signal.aborted) return;
      setBusy(false);
      nextDue.current = Date.now() + minutes * 60000;
      if (mode === "continuous")
        timer = setTimeout(() => void cycle(), minutes * 60000);
      else setMode("paused");
    }
    timer = setTimeout(
      () => void cycle(),
      mode === "once" ? 0 : Math.max(0, nextDue.current - Date.now()),
    );
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [mode, ticket, online, visible, selected, query, accessToken, minutes]);

  const targets = sources.filter(
    (s) =>
      selected.includes(s.id) && s.available && (!s.private || accessToken),
  );
  const canStart =
    online &&
    targets.length > 0 &&
    (!targets.some((s) => s.search) || query.trim().length >= 3);
  const latest = results.filter(
    (r, i) => results.findIndex((v) => v.provider === r.provider) === i,
  );
  const displayed =
    pane === "radar"
      ? latest.filter((r) => ["worldbank", "ecb"].includes(r.provider))
      : latest;
  function start(continuous: boolean) {
    nextDue.current = 0;
    setTicket((value) => value + 1);
    setMode(continuous ? "continuous" : "once");
  }
  const status = !online
    ? "Hors ligne · derniers résultats conservés"
    : !visible && mode !== "paused"
      ? "Suivi suspendu · onglet masqué"
      : busy
        ? "Actualisation en cours…"
        : mode === "continuous"
          ? `Suivi actif · toutes les ${minutes} min`
          : "Suivi en pause";
  return (
    <div className="live-watch">
      <h1>Veille en direct</h1>
      <div
        className="live-tabs"
        role="tablist"
        aria-label="Vue de la veille en direct"
      >
        {[
          ["feeds", "Flux API"],
          ["radar", "Radar économique mondial"],
        ].map(([id, label]) => (
          <button
            key={id}
            id={`live-tab-${id}`}
            role="tab"
            aria-selected={pane === id}
            aria-controls="live-panel"
            tabIndex={pane === id ? 0 : -1}
            onClick={() => setPane(id)}
            onKeyDown={(event) => {
              if (
                !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              )
                return;
              event.preventDefault();
              const next =
                event.key === "Home"
                  ? "feeds"
                  : event.key === "End"
                    ? "radar"
                    : pane === "feeds"
                      ? "radar"
                      : "feeds";
              setPane(next);
              document.getElementById(`live-tab-${next}`)?.focus();
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <section className="live-controls" aria-label="Suivi des sources">
        <div className="live-actions">
          <button
            className="primary"
            disabled={!canStart || mode !== "paused"}
            onClick={() => start(true)}
          >
            Démarrer le suivi
          </button>
          <button
            className="secondary"
            disabled={!canStart || busy}
            onClick={() => start(mode === "continuous")}
          >
            Actualiser maintenant
          </button>
          <button
            className="secondary"
            disabled={mode === "paused"}
            onClick={() => setMode("paused")}
          >
            Mettre en pause
          </button>
          <label>
            Fréquence
            <select
              value={minutes}
              onChange={(e) => {
                setMode("paused");
                setMinutes(Number(e.target.value));
              }}
            >
              {[15, 30, 60].map((n) => (
                <option value={n} key={n}>
                  {n} min
                </option>
              ))}
            </select>
          </label>
        </div>
        <p role="status">{status}</p>
        <details>
          <summary>Choisir les sources et la recherche</summary>
          <fieldset className="live-source-options">
            <legend>Sources à suivre</legend>
            {sources.map((source) => (
              <label key={source.id}>
                <input
                  type="checkbox"
                  checked={selected.includes(source.id)}
                  disabled={
                    !source.available || (source.private && !accessToken)
                  }
                  onChange={(e) => {
                    setMode("paused");
                    setSelected((old) =>
                      e.target.checked
                        ? [...old, source.id]
                        : old.filter((id) => id !== source.id),
                    );
                  }}
                />
                {source.label}
                {source.private && !accessToken ? " · connexion requise" : ""}
                {!source.available ? " · indisponible" : ""}
              </label>
            ))}
          </fieldset>
          <label>
            Recherche publique
            <input
              type="search"
              maxLength={200}
              value={query}
              placeholder="Un sujet, sans donnée privée"
              onChange={(e) => {
                setMode("paused");
                setQuery(e.target.value);
              }}
            />
          </label>
          <p className="small-note">
            Un appel par source et par cycle. Brave, Tavily et Exa utilisent les
            quotas de vos comptes. Seuls les mots de cette recherche sont
            envoyés aux moteurs choisis.
          </p>
          {!accessToken && (
            <button className="text-button" onClick={onSettings}>
              Se connecter dans Paramètres
            </button>
          )}
        </details>
        {storageNotice && <p role="alert">{storageNotice}</p>}
        {Object.entries(errors).map(([id, error]) => (
          <p role="alert" key={id}>
            <strong>{sources.find((s) => s.id === id)?.label}</strong> : {error}
          </p>
        ))}
      </section>
      <section
        id="live-panel"
        role="tabpanel"
        aria-labelledby={`live-tab-${pane}`}
      >
        {pane === "radar" && (
          <p className="small-note">
            Banque mondiale : PIB et inflation annuels, Monde, France, zone
            euro, États-Unis et Chine. BCE : devises de référence. La période
            figure sur chaque chiffre ; ces données ne sont pas des cotations en
            temps réel.
          </p>
        )}
        {!displayed.length && (
          <p>
            Aucun résultat conservé. Actualisez pour recevoir les données des
            sources choisies.
          </p>
        )}
        <div className="live-results">
          {displayed.map((result) => (
            <LiveResult key={result.provider} result={result} />
          ))}
        </div>
        {pane === "radar" && (
          <details className="live-imported">
            <summary>Indicateurs de mes éditions</summary>
            <EconomyRadar editions={editions} />
          </details>
        )}
      </section>
    </div>
  );
}
function LiveResult({ result }: { result: SourceResult }) {
  return (
    <section className="live-source-result" aria-label={result.label}>
      <h2>{result.label}</h2>
      <p className="small-note">
        <time dateTime={result.retrievedAt}>
          {editorialDate(result.retrievedAt)}
        </time>
        {result.query ? ` · ${result.query}` : ""}
      </p>
      {!result.entries.length && <p>Aucun résultat reçu.</p>}
      <div className="live-entry-grid">
        {result.entries.map((entry, index) => (
          <article className="brief-card" key={`${entry.url}:${index}`}>
            <h3>{entry.title}</h3>
            {entry.publishedAt && (
              <p className="small-note">{editorialDate(entry.publishedAt)}</p>
            )}
            <p>{entry.summary}</p>
            {validateSourceUrl(entry.url) && (
              <a
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
                referrerPolicy="no-referrer"
              >
                Lire la source
              </a>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
