import { createContext, useContext, useState, type ReactNode } from "react";
export const INTERFACE_KEY = "journal360.interface.v1";
export const essential = {
  kpis: false,
  economy: true,
  timeline: false,
  prompts: false,
  sources: false,
  advanced: false,
  technical: false,
  help: false,
  secondaryNav: true,
};
export type InterfaceOptions = typeof essential;
export type InterfacePreferences = {
  version: 1;
  profile: "essential" | "complete" | "custom";
  options: InterfaceOptions;
};
export const defaults = (): InterfacePreferences => ({
  version: 1,
  profile: "essential",
  options: { ...essential },
});
export function parsePreferences(raw: string | null): InterfacePreferences {
  try {
    const p = JSON.parse(raw || "null");
    if (
      p?.version !== 1 ||
      !["essential", "complete", "custom"].includes(p.profile) ||
      !p.options ||
      Object.keys(essential).some((k) => typeof p.options[k] !== "boolean")
    )
      return defaults();
    return {
      version: 1,
      profile: p.profile,
      options: Object.fromEntries(
        Object.keys(essential).map((k) => [k, p.options[k]]),
      ) as InterfaceOptions,
    };
  } catch {
    return defaults();
  }
}
const Context = createContext<{
  preferences: InterfacePreferences;
  update: (p: InterfacePreferences) => void;
  error: string;
}>({
  preferences: defaults(),
  update: () => {},
  error: "",
});
export function InterfaceProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(() => {
    try {
      return parsePreferences(localStorage.getItem(INTERFACE_KEY));
    } catch {
      return defaults();
    }
  });
  const [error, setError] = useState("");
  function update(p: InterfacePreferences) {
    setPreferences(p);
    try {
      localStorage.setItem(INTERFACE_KEY, JSON.stringify(p));
      setError("");
    } catch {
      setError(
        "Préférences appliquées pour cette session ; leur enregistrement local a échoué.",
      );
    }
  }
  return (
    <Context.Provider value={{ preferences, update, error }}>
      {children}
    </Context.Provider>
  );
}
export const useInterface = () => useContext(Context);
export function InterfaceSettings() {
  const { preferences: p, update, error } = useInterface();
  const labels: Record<keyof InterfaceOptions, string> = {
    kpis: "Cartes KPI et quatre univers",
    economy: "Aperçu du radar économique",
    timeline: "Aperçu de la frise",
    prompts: "Aperçu des prompts",
    sources: "Sources détaillées dépliées",
    advanced: "Actions avancées dépliées",
    technical: "Badges et diagnostics techniques dépliés",
    help: "Blocs d’aide et synthèse",
    secondaryNav: "Sections de navigation secondaires",
  };
  return (
    <section className="quiet-panel interface-settings">
      <h2>Personnaliser l’interface</h2>
      <p>
        Affichage local uniquement. Les données, alertes et contrôles de
        sécurité restent conservés. Les rubriques complètes et les actions
        repliées restent accessibles.
      </p>
      <label>
        Profil d’interface
        <select
          aria-label="Profil d’interface"
          value={p.profile}
          onChange={(e) => {
            const profile = e.target.value as InterfacePreferences["profile"];
            update({
              version: 1,
              profile,
              options:
                profile === "custom"
                  ? p.options
                  : profile === "essential"
                    ? { ...essential }
                    : (Object.fromEntries(
                        Object.keys(essential).map((k) => [k, true]),
                      ) as InterfaceOptions),
            });
          }}
        >
          <option value="essential">Essentiel</option>
          <option value="complete">Complet</option>
          <option value="custom">Personnalisé</option>
        </select>
      </label>
      <div className="interface-toggles">
        {Object.entries(labels).map(([key, label]) => (
          <label key={key}>
            <input
              type="checkbox"
              checked={p.options[key as keyof InterfaceOptions]}
              onChange={(e) =>
                update({
                  version: 1,
                  profile: "custom",
                  options: { ...p.options, [key]: e.target.checked },
                })
              }
            />
            {label}
          </label>
        ))}
      </div>
      <button className="secondary" onClick={() => update(defaults())}>
        Restaurer l’interface par défaut
      </button>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
