import type { FuturePayload } from "./schema";
export function FutureEvidence({
  urls,
  payload,
}: {
  urls: string[];
  payload: FuturePayload;
}) {
  return urls.length ? (
    <ul className="future-evidence">
      {urls.map((url) => (
        <li key={url}>
          <a href={url} target="_blank" rel="noreferrer noopener">
            {payload.provenance.sources.find((s) => s.url === url)?.label ||
              "Source déclarée"}{" "}
            <span aria-hidden="true">↗</span>
          </a>
        </li>
      ))}
    </ul>
  ) : (
    <p className="future-missing">
      Aucune source renseignée pour cette affirmation.
    </p>
  );
}
export function FutureText({ text }: { text: string }) {
  return text.length > 320 ? (
    <>
      <p>{text.slice(0, 320)}…</p>
      <details>
        <summary>Lire le texte complet</summary>
        <p>{text}</p>
      </details>
    </>
  ) : (
    <p>{text}</p>
  );
}
