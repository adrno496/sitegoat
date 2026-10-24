import { mutateRecurringSearch } from "./recurringSearchStorage";
import { useId, useState, useEffect, type FormEvent } from "react";
import {
  RECURRING_SEARCHES_KEY,
  cadences,
  nextSearchAt,
  parseRecurringSearches,
  recurringGoogleUrl,
  type RecurringSearch,
  type SearchCadence,
} from "./recurringSearchModel";

const suggestions = [
  "Intelligence artificielle",
  "Cybersécurité",
  "Économie",
  "Géopolitique",
  "Énergie",
];
const dateLabel = (date: Date) =>
  new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeZone: "Europe/Paris",
  }).format(date);

export function RecurringSearches({ themes }: { themes: string[] }) {
  const [loaded] = useState(() => {
    try {
      return {
        items: parseRecurringSearches(
          localStorage.getItem(RECURRING_SEARCHES_KEY),
        ),
        error: "",
      };
    } catch {
      return {
        items: [] as RecurringSearch[],
        error:
          "Impossible de relire vos recherches enregistrées sur cet appareil.",
      };
    }
  });
  const [items, setItems] = useState(loaded.items);
  const [error, setError] = useState(loaded.error);
  const [message, setMessage] = useState("");
  const [theme, setTheme] = useState("");
  const [query, setQuery] = useState("");
  const [cadence, setCadence] = useState<SearchCadence>("daily");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editBase, setEditBase] = useState<RecurringSearch | null>(null);
  const formId = useId();

  useEffect(() => {
    const reload = () => { try { setItems(parseRecurringSearches(localStorage.getItem(RECURRING_SEARCHES_KEY))); } catch { setError("Impossible de relire les recherches : stockage indisponible."); } };
    window.addEventListener("storage", reload); window.addEventListener("journal360:recurring-change", reload); window.addEventListener("focus", reload);
    return () => { window.removeEventListener("storage", reload); window.removeEventListener("journal360:recurring-change", reload); window.removeEventListener("focus", reload); };
  }, []);
  async function save(expected: RecurringSearch | null, next: RecurringSearch | null) {
    try { setItems(await mutateRecurringSearch(expected, next)); setError(""); return true; }
    catch (e) { setError(String(e)); return false; }
  }
  function reset() {
    setFormOpen(false);
    document.getElementById(`${formId}-trigger`)?.focus();
    setEditing(null);
    setTheme("");
    setQuery("");
    setCadence("daily");
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    const name = theme.trim();
    if (!name) return;
    const text = query.trim() || name;
    if (
      items.some(
        (s) =>
          s.id !== editing &&
          s.theme.toLocaleLowerCase("fr") === name.toLocaleLowerCase("fr") &&
          s.query === text &&
          s.cadence === cadence,
      )
    ) {
      setMessage("Cette recherche est déjà enregistrée.");
      return;
    }
    const previous = editing ? editBase : null;
    const item: RecurringSearch = {
      id: editing || crypto.randomUUID(),
      theme: name,
      query: text,
      cadence,
      lastOpenedAt: previous?.query === text ? previous.lastOpenedAt : null,
    };
    if (!await save(previous || null, item)) return;
    setMessage(editing ? "Recherche modifiée." : "Recherche ajoutée.");
    reset();
  }
  const due = items.filter(
    (s) => !nextSearchAt(s) || +nextSearchAt(s)! <= Date.now(),
  ).length;
  return (
    <section className="recurring-searches" aria-label="Recherches récurrentes">
      <h2>Vos thèmes à suivre</h2>
      <p>
        Enregistrez vos recherches, puis retrouvez les résultats récents de
        Google en un clic. Vos thèmes et vos dernières consultations restent
        enregistrés sur cet appareil.
      </p>
      <button
        className="secondary"
        type="button"
        id={`${formId}-trigger`}
        aria-expanded={formOpen}
        aria-controls={`${formId}-form`}
        onClick={() => {
          if (formOpen) reset();
          else {
            setFormOpen(true);
            requestAnimationFrame(() =>
              document.getElementById(`${formId}-theme`)?.focus(),
            );
          }
        }}
      >
        Ajouter une recherche
      </button>
      <form
        id={`${formId}-form`}
        hidden={!formOpen}
        className="quiet-panel recurring-search-form"
        onSubmit={submit}
      >
        <h3>{editing ? "Modifier la recherche" : "Ajouter une recherche"}</h3>
        <label htmlFor={`${formId}-theme`}>Thème</label>
        <input
          id={`${formId}-theme`}
          list={`${formId}-themes`}
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          maxLength={120}
          required
          placeholder="Ex. : Intelligence artificielle"
        />
        <datalist id={`${formId}-themes`}>
          {[...new Set([...suggestions, ...themes])].sort().map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <label htmlFor={`${formId}-query`}>Mots clés de la recherche</label>
        <input
          id={`${formId}-query`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={1000}
          placeholder="Facultatif : le thème est utilisé si ce champ est vide"
        />
        <label htmlFor={`${formId}-cadence`}>Fréquence</label>
        <select
          id={`${formId}-cadence`}
          value={cadence}
          onChange={(e) => setCadence(e.target.value as SearchCadence)}
        >
          {Object.entries(cadences).map(([value, c]) => (
            <option key={value} value={value}>
              {c.label}
            </option>
          ))}
        </select>
        <p className="small-note">
          Résultats Google : {cadences[cadence].results.toLocaleLowerCase("fr")}
          .
        </p>
        <div className="settings-actions">
          <button className="primary" type="submit">
            {editing ? "Enregistrer les modifications" : "Ajouter la recherche"}
          </button>
          <button className="secondary" type="button" onClick={reset}>
            Annuler
          </button>
        </div>
      </form>
      {error && <p role="alert">{error}</p>}
      <p role="status">
        {message ||
          `${items.length} recherche(s) enregistrée(s) · ${due} à consulter`}
      </p>
      <div className="recurring-search-list">
        {items.map((search) => {
          const next = nextSearchAt(search);
          const isDue = !next || +next <= Date.now();
          return (
            <article
              className="quiet-panel recurring-search-card"
              key={search.id}
            >
              <p className="eyebrow">
                {cadences[search.cadence].label} ·{" "}
                {isDue ? "À consulter" : "À jour"}
              </p>
              <h3>{search.theme}</h3>
              <p>{search.query}</p>
              <p className="small-note">{cadences[search.cadence].results}</p>
              <p className="small-note">
                {search.lastOpenedAt
                  ? `Dernière consultation : ${dateLabel(new Date(search.lastOpenedAt))}`
                  : "Pas encore consultée"}
                {next ? ` · À relancer le ${dateLabel(next)}` : ""}
              </p>
              <div className="settings-actions">
                <a
                  className="primary"
                  href={recurringGoogleUrl(search)}
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                  onClick={() => {
                    void save(search, { ...search, lastOpenedAt: new Date().toISOString() });
                    setMessage(`Recherche « ${search.theme} » ouverte sur Google.`);
                  }}
                >
                  Rechercher sur Google
                </a>
                <button
                  className="secondary"
                  onClick={() => {
                    setFormOpen(true);
                    setEditing(search.id);
                    setEditBase(search);
                    setTheme(search.theme);
                    setQuery(search.query);
                    setCadence(search.cadence);
                    requestAnimationFrame(() =>
                      document.getElementById(`${formId}-theme`)?.focus(),
                    );
                  }}
                >
                  Modifier
                </button>
                <button
                  className="text-button"
                  onClick={async () => {
                    if (!await save(search, null)) return;
                    if (editing === search.id) reset();
                    setMessage("Recherche supprimée.");
                  }}
                >
                  Supprimer
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {!items.length && (
        <p className="v9-empty">
          Ajoutez votre premier thème pour le retrouver à chaque visite.
        </p>
      )}
    </section>
  );
}
