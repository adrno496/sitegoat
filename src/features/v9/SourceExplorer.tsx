import { useEffect, useState } from "react";
import { z } from "zod";
import { editorialDate } from "../editorialPresentation";
import { validateSourceUrl } from "../sourceUrl";
const CACHE_KEY = "journal360.online-sources.v1";
const entrySchema = z
  .object({
    title: z.string().max(220),
    url: z.string().url().max(2048),
    summary: z.string().max(600),
    publishedAt: z.string().max(60).optional(),
  })
  .strict();
export const sourceResultSchema = z
  .object({
    provider: z.string().max(20),
    label: z.string().max(80),
    query: z.string().max(200),
    retrievedAt: z.iso.datetime(),
    entries: z.array(entrySchema).max(12),
    cached: z.boolean().optional(),
  })
  .strict();
export type SourceResult = z.infer<typeof sourceResultSchema>;
export const catalogSchema = z.object({
  sources: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        search: z.boolean(),
        private: z.boolean(),
        available: z.boolean(),
      }),
    )
    .max(12),
});
export const DEFAULT_SOURCES = [
  {
    id: "ecb",
    label: "Économie · devises BCE",
    search: false,
    private: false,
    available: true,
  },
  {
    id: "worldbank",
    label: "Économie · Banque mondiale",
    search: false,
    private: false,
    available: true,
  },
  {
    id: "cisa",
    label: "Cybersécurité · CISA",
    search: false,
    private: false,
    available: true,
  },
  ...["vscode", "node", "react", "ollama"].map((id) => ({
    id,
    label: `Versions · ${id}`,
    search: false,
    private: false,
    available: true,
  })),
  ...[
    ["brave", "Actualités · Brave"],
    ["tavily", "Recherche · Tavily"],
    ["exa", "Recherche · Exa"],
  ].map(([id, label]) => ({
    id,
    label,
    search: true,
    private: true,
    available: false,
  })),
];
export function readSourceCache(): SourceResult[] {
  try {
    const text = localStorage.getItem(CACHE_KEY);
    if (!text || text.length > 256000) return [];
    return z.array(sourceResultSchema).max(10).parse(JSON.parse(text));
  } catch {
    return [];
  }
}
export function saveSourceResult(value: SourceResult) {
  const next = [
    value,
    ...readSourceCache().filter(
      (r) => r.provider !== value.provider || r.query !== value.query,
    ),
  ].slice(0, 10);
  const text = JSON.stringify(next);
  if (text.length > 256000)
    throw Error("Résultats trop volumineux pour la conservation locale.");
  localStorage.setItem(CACHE_KEY, text);
  return next;
}
const ERRORS: Record<string, string> = {
  LOGIN_REQUIRED:
    "Connectez votre bibliothèque dans Paramètres pour utiliser ce moteur.",
  NOT_CONFIGURED: "Ce moteur n’est pas configuré sur le serveur.",
  CREDENTIALS_REFUSED:
    "Accès refusé par le fournisseur. Vérifiez la configuration de ce moteur.",
  RATE_LIMITED: "Quota ou cadence atteints. Réessayez plus tard.",
  PUBLIC_QUERY_REQUIRED:
    "Utilisez quelques mots publics, sans clé, adresse e-mail ni donnée privée.",
};
export async function requestSource(
  source: (typeof DEFAULT_SOURCES)[number],
  query: string,
  accessToken?: string,
  signal?: AbortSignal,
): Promise<SourceResult> {
  const response = await fetch("/api/sources", {
    method: "POST",
    credentials: "omit",
    headers: {
      "Content-Type": "application/json",
      ...(source.private && accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {}),
    },
    body: JSON.stringify({
      provider: source.id,
      ...(source.search ? { query } : {}),
    }),
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(20000)])
      : AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw Error(
      ERRORS[error.code] ||
        "Cette source est indisponible. Les résultats conservés restent lisibles.",
    );
  }
  const value = sourceResultSchema.parse(await response.json());
  if (
    value.provider !== source.id ||
    value.query !== (source.search ? query.trim() : "")
  )
    throw Error("Réponse incompatible avec la source demandée.");
  return value;
}
export function SourceExplorer({
  accessToken,
  onSettings,
}: {
  accessToken?: string;
  onSettings?: () => void;
}) {
  const [sources, setSources] = useState(DEFAULT_SOURCES),
    [source, setSource] = useState("ecb"),
    [query, setQuery] = useState("");
  const [history, setHistory] = useState(readSourceCache),
    [result, setResult] = useState<SourceResult | null>(
      () => readSourceCache()[0] || null,
    );
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const selected = sources.find((s) => s.id === source) || DEFAULT_SOURCES[0];
  useEffect(() => {
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
      .then((r) => setSources(r.sources))
      .catch(() => {});
    return () => controller.abort();
  }, []);
  async function retrieve(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const value = await requestSource(selected, query, accessToken);
      setResult(value);
      try {
        setHistory(saveSourceResult(value));
        setNotice(
          `${value.entries.length} résultat(s) conservé(s) pour le hors ligne.`,
        );
      } catch {
        setNotice(
          "Résultats reçus, mais leur conservation locale est indisponible. Les anciennes données sont conservées.",
        );
      }
    } catch (e) {
      setNotice(
        e instanceof Error && Object.values(ERRORS).includes(e.message)
          ? e.message
          : "Récupération indisponible. Les résultats conservés restent lisibles hors ligne.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="source-explorer" aria-label="Sources en ligne">
      <h2>Sources en ligne</h2>
      <form onSubmit={(e) => void retrieve(e)}>
        <label>
          Source
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
                {s.available ? "" : " · indisponible"}
              </option>
            ))}
          </select>
        </label>
        {selected.search && (
          <label>
            Recherche publique
            <input
              type="search"
              value={query}
              maxLength={200}
              minLength={3}
              required
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Un sujet, sans donnée privée"
            />
          </label>
        )}
        {selected.private && (
          <p className="small-note">
            Seule cette recherche est envoyée au moteur choisi. Elle utilise le
            quota de votre compte.
          </p>
        )}
        {selected.private && !accessToken && (
          <p>
            Connexion de la bibliothèque requise.{" "}
            <button type="button" className="text-button" onClick={onSettings}>
              Ouvrir Paramètres
            </button>
          </p>
        )}
        <button
          className="secondary"
          disabled={
            busy || !selected.available || (selected.private && !accessToken)
          }
        >
          {busy ? "Récupération…" : "Récupérer"}
        </button>
      </form>
      <p role="status">{notice}</p>
      {history.length > 0 && (
        <label>
          Résultats conservés
          <select
            value={result ? `${result.provider}:${result.retrievedAt}` : ""}
            onChange={(e) =>
              setResult(
                history.find(
                  (r) => `${r.provider}:${r.retrievedAt}` === e.target.value,
                ) || null,
              )
            }
          >
            {history.map((r) => (
              <option
                key={`${r.provider}:${r.retrievedAt}`}
                value={`${r.provider}:${r.retrievedAt}`}
              >
                {r.label}
                {r.query ? ` · ${r.query}` : ""} ·{" "}
                {editorialDate(r.retrievedAt)}
              </option>
            ))}
          </select>
        </label>
      )}
      {result && (
        <div className="source-results">
          <h3>{result.label}</h3>
          <p className="small-note">{editorialDate(result.retrievedAt)}</p>
          {result.query && <p>{result.query}</p>}
          {result.entries.length === 0 && (
            <p>Aucun résultat reçu pour cette recherche.</p>
          )}
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
      )}
      {!result && (
        <p>
          Choisissez une source puis récupérez ses dernières données. Vos
          journaux restent inchangés.
        </p>
      )}
    </section>
  );
}
