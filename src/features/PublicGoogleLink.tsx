import { googleAiQuestionDestination } from "./googleAi";

export function publicGoogleUrl(question?: string) {
  return (
    googleAiQuestionDestination(question)?.url || "https://www.google.com/"
  );
}
// Only explicitly public research questions; never infer from private text.
export function PublicGoogleLink({ question }: { question?: string }) {
  const href = publicGoogleUrl(question);
  return (
    <a
      className="secondary google-search"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      referrerPolicy="no-referrer"
      title={
        href === "https://www.google.com/"
          ? "Question publique absente ou refusée : Google s’ouvre sans transmettre de texte."
          : "Rechercher la question publique sur Google"
      }
    >
      Recherche Google
    </a>
  );
}
