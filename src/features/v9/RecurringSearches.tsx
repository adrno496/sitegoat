import { useId, useState, type FormEvent } from "react";
import {
  RECURRING_SEARCHES_KEY,
  cadences,
  nextSearchAt,
  parseRecurringSearches,
  recurringGoogleUrl,
  serializeRecurringSearches,
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
  const [editing, setEditing] = useState<string | null>(null);
  const formId = useId();

  function save(next: RecurringSearch[]) {
    setItems(next);
    try {
      localStorage.setItem(
        RECURRING_SEARCHES_KEY,
        serializeRecurringSearches(next),
      );
      setError("");
    } catch {
      setError(
        "Recherches conservées pour cette session. Leur enregistrement sur l’appareil a échoué.",
      );
    }
  }
  function reset() {
    setEditing(null);
    setTheme("");
    setQuery("");
    setCadence("daily");
  }
  function submit(event: FormEvent) {
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
    const previous = items.find((s) => s.id === editing);
    const item: RecurringSearch = {
      id: editing || crypto.randomUUID(),
      theme: name,
      query: text,
      cadence,
      lastOpenedAt: previous?.query === text ? previous.lastOpenedAt : null,
    };
    save(
      editing
        ? items.map((s) => (s.id === editing ? item : s))
        : [...items, item],
    );
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
      <form className="quiet-panel recurring-search-form" onSubmit={submit}>
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
          {editing && (
            <button className="secondary" type="button" onClick={reset}>
              Annuler
            </button>
          )}
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
                    save(
                      items.map((s) =>
                        s.id === search.id
                          ? { ...s, lastOpenedAt: new Date().toISOString() }
                          : s,
                      ),
                    );
                    setMessage(
                      `Recherche « ${search.theme} » ouverte sur Google.`,
                    );
                  }}
                >
                  Rechercher sur Google
                </a>
                <button
                  className="secondary"
                  onClick={() => {
                    setEditing(search.id);
                    setTheme(search.theme);
                    setQuery(search.query);
                    setCadence(search.cadence);
                    document.getElementById(`${formId}-theme`)?.focus();
                  }}
                >
                  Modifier
                </button>
                <button
                  className="text-button"
                  onClick={() => {
                    save(items.filter((s) => s.id !== search.id));
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
