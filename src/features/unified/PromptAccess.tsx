import { summaryPreview } from "../eventPresentation";
import { useState, useRef } from "react";
import type { Edition } from "../../data/model";
import { hash } from "../../data/model";
import { db } from "../../data/db";
import { download } from "../backup";
import {
  extractVscodePrompts,
  promptDownloadFilename,
  safePromptFilename,
  type VscodePrompt,
} from "../vscodePrompt";
export function PromptAccess({
  edition,
  eventId,
}: {
  edition: Edition;
  eventId?: string;
}) {
  const [loaded, setLoaded] = useState<VscodePrompt[] | null>(
      () =>
        edition.unified?.promptAssets.map((p) => ({ ...p, id: p.promptId })) ??
        null,
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const prompts = loaded?.filter((p) => !eventId || p.eventId === eventId);
  async function load() {
    setBusy(true);
    setError("");
    try {
      const o = await db.originals.get(edition.id);
      if (!o)
        throw Error("Le HTML original est indisponible sur cet appareil.");
      setLoaded(extractVscodePrompts(o.bytes));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Lecture des prompts impossible.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="prompt-access">
      {loaded === null && (
        <button
          className="text-button"
          disabled={busy}
          onClick={() => void load()}
        >
          {busy ? "Lecture des prompts…" : "Voir les prompts VS Code"}
        </button>
      )}
      {error && <p role="alert">{error}</p>}
      {prompts?.length === 0 && (
        <p role="status" className="muted">
          Aucun prompt VS Code identifiable dans ce document.
        </p>
      )}
      {prompts?.map((p, i) => (
        <PromptCard
          key={p.id}
          prompt={p}
          filename={promptDownloadFilename(
            edition.filename,
            p,
            i,
            loaded?.length || 0,
            !!edition.unified,
          )}
        />
      ))}
    </div>
  );
}
export function PromptCard({
  prompt: p,
  filename,
}: {
  prompt: VscodePrompt;
  filename: string;
}) {
  const [notice, setNotice] = useState(""),
    [digest, setDigest] = useState(""),
    [busy, setBusy] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  function select() {
    area.current?.focus();
    area.current?.select();
    setNotice("Texte sélectionné. Utilisez Cmd+C ou Ctrl+C.");
  }
  async function copy() {
    try {
      if (!navigator.clipboard?.writeText) throw Error();
      await navigator.clipboard.writeText(p.content);
      setNotice("Prompt complet copié. Aucune transmission externe.");
    } catch {
      select();
    }
  }
  async function save() {
    setBusy(true);
    try {
      const checksum = await hash(new TextEncoder().encode(p.content));
      if (p.sha256 && p.sha256 !== checksum)
        throw Error("Prompt tronqué ou checksum Markdown invalide.");
      setDigest(checksum);
      download(
        new Blob([p.content], { type: "text/markdown;charset=utf-8" }),
        safePromptFilename(filename),
      );
      setNotice(
        "Téléchargement du prompt lancé. Vérifiez le fichier dans votre navigateur.",
      );
    } catch (e) {
      setNotice(
        e instanceof Error
          ? e.message
          : "Téléchargement impossible. Le texte reste sélectionnable.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="prompt-card">
      <h3>{p.title}</h3>
      <p className="prompt-preview">
        {summaryPreview(p.content.split(/\n\s*\n/)[0]).slice(0, 240)}
        {p.content.split(/\n\s*\n/)[0].length > 240 ? "…" : ""}
      </p>
      <p className="small-note">
        Texte intégral · privé à cet appareil · aucune exécution ni envoi à
        Google
      </p>
      <details>
        <summary>Voir et sélectionner le prompt complet</summary>
        <label>
          Prompt complet : {p.title}
          <textarea ref={area} readOnly value={p.content} rows={14} />
        </label>
        <div className="settings-actions">
          <button className="secondary" onClick={() => void copy()}>
            Copier
          </button>
          <button className="secondary" onClick={select}>
            Sélectionner
          </button>
        </div>
      </details>
      <button className="secondary" disabled={busy} onClick={() => void save()}>
        Télécharger le prompt VS Code (.md)
      </button>
      {digest && <p className="hash-text small-note">SHA-256 : {digest}</p>}
      <p role="status">{notice}</p>
    </article>
  );
}
