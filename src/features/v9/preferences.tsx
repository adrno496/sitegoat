import { createContext, useContext, useState, Children, isValidElement, cloneElement, type ReactElement, type ReactNode } from "react";
import { z } from "zod";
export const V9_DISPLAY_KEY = "journal360.display.v9";
const schema = z
  .object({
    version: z.literal(1),
    density: z.enum(["compact", "comfort"]),
    motion: z.boolean(),
    cards: z.boolean(),
    graphs: z.boolean(),
    detail: z.boolean(),
    secondaryActions: z.boolean(),
    filters: z.boolean().default(false),
    homeHighlights: z.boolean(),
    homeChanges: z.boolean(),
    homeWatch: z.boolean(),
    todayEconomy: z.boolean(),
    favorites: z.array(z.string().max(200)).max(100),
  })
  .strict();
export type DisplayPreferences = z.infer<typeof schema>;
export const displayDefaults = (): DisplayPreferences => ({
  version: 1,
  density: "comfort",
  motion: true,
  cards: true,
  graphs: true,
  detail: false,
  secondaryActions: false,
  filters: false,
  homeHighlights: true,
  homeChanges: true,
  homeWatch: true,
  todayEconomy: true,
  favorites: [],
});
export function parseDisplayPreferences(raw: string | null) {
  try {
    const p = schema.safeParse(JSON.parse(raw || "null"));
    return p.success ? p.data : displayDefaults();
  } catch {
    return displayDefaults();
  }
}
const Context = createContext<{
  display: DisplayPreferences;
  update: (p: DisplayPreferences) => void;
  error: string;
}>({ display: displayDefaults(), update: () => {}, error: "" });
export const useDisplay = () => useContext(Context);
export function DisplayProvider({ children }: { children: ReactNode }) {
  const [display, setDisplay] = useState(() => {
      try {
        return parseDisplayPreferences(localStorage.getItem(V9_DISPLAY_KEY));
      } catch {
        return displayDefaults();
      }
    }),
    [error, setError] = useState("");
  function update(p: DisplayPreferences) {
    setDisplay(p);
    try {
      localStorage.setItem(V9_DISPLAY_KEY, JSON.stringify(p));
      setError("");
    } catch {
      setError(
        "Réglages appliqués pour cette session. Leur enregistrement local est indisponible.",
      );
    }
  }
  return (
    <Context.Provider value={{ display, update, error }}>
      <div
        className="v9-presentation"
        data-density={display.density}
        data-cards={display.cards}
        data-motion={display.motion}
      >
        {children}
      </div>
    </Context.Provider>
  );
}
export function DisplayFilters({ children }: { children: ReactNode }) {
  const { display } = useDisplay();
  if (Children.count(children) === 1 && isValidElement(children) && children.type === "details")
    return cloneElement(children as ReactElement<{ open?: boolean }>, display.filters ? { open: true } : {});
  return <details open={display.filters || undefined}><summary>Filtres et tri</summary>{children}</details>;
}
export function DisplaySettings({ categories }: { categories: string[] }) {
  const { display: d, update, error } = useDisplay();
  const labels = {
    motion: "Animations",
    cards: "Cartes confortables (désactiver pour une liste)",
    graphs: "Graphiques de l’Accueil",
    detail: "Détails des articles dépliés",
    secondaryActions: "Actions secondaires visibles",
    filters: "Afficher les filtres et le tri",
    homeHighlights: "Accueil : points essentiels",
    homeChanges: "Accueil : ce qui change",
    homeWatch: "Accueil : à surveiller",
    todayEconomy: "Aujourd’hui : aperçu économique",
  };
  return (
    <section className="quiet-panel display-settings">
      <h2>Affichage</h2>
      <label>
        Densité
        <select
          aria-label="Densité"
          value={d.density}
          onChange={(e) =>
            update({
              ...d,
              density: e.target.value as DisplayPreferences["density"],
            })
          }
        >
          <option value="comfort">Confort</option>
          <option value="compact">Compacte</option>
        </select>
      </label>
      <div className="interface-toggles">
        {Object.entries(labels).map(([key, label]) => (
          <label key={key}>
            <input
              type="checkbox"
              checked={d[key as keyof typeof labels]}
              onChange={(e) => update({ ...d, [key]: e.target.checked })}
            />
            {label}
          </label>
        ))}
      </div>
      <details>
        <summary>Catégories favorites</summary>
        <p>
          Les catégories favorites apparaissent en premier dans Aujourd’hui et
          les points essentiels.
        </p>
        {categories.map((c) => (
          <label key={c}>
            <input
              type="checkbox"
              checked={d.favorites.includes(c)}
              onChange={(e) =>
                update({
                  ...d,
                  favorites: e.target.checked
                    ? [...d.favorites, c]
                    : d.favorites.filter((v) => v !== c),
                })
              }
            />
            {c}
          </label>
        ))}
      </details>
      <button className="secondary" onClick={() => update(displayDefaults())}>
        Réinitialiser l’affichage V9
      </button>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
