import { useState } from "react";
import {
  Archive,
  ArrowUpRight,
  FileText,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { collections, type Collection } from "../data/collections";
import {
  dateLabel,
  sizeLabel,
  sortEditions,
  type Edition,
} from "../data/model";
import { normalizeArticleSearch } from "../data/articles";

export function CollectionView({
  collection,
  editions,
  onImport,
  onOpen,
  onUpdate,
}: {
  collection: Collection;
  editions: Edition[];
  onImport: () => void;
  onOpen: (id: string) => void;
  onUpdate: (
    id: string,
    patch: Partial<Pick<Edition, "archived" | "deleted">>,
  ) => void;
}) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"active" | "archived" | "trash">("active");
  const info = collections.find((item) => item.id === collection)!;
  const documents = sortEditions(
    editions.filter(
      (edition) =>
        edition.collection === collection &&
        (mode === "trash"
          ? edition.deleted
          : !edition.deleted &&
            (mode === "archived" ? edition.archived : !edition.archived)) &&
        normalizeArticleSearch(
          `${edition.title} ${edition.filename} ${edition.text}`,
        ).includes(normalizeArticleSearch(query).trim()),
    ),
  );
  return (
    <section className="collection-view" aria-label={`Documents ${info.label}`}>
      <div className="section-title collection-heading">
        <div>
          <p className="eyebrow">VOS DOSSIERS HTML</p>
          <h1>{info.label}</h1>
          <p className="muted">{info.description}</p>
        </div>
        <button className="primary" onClick={onImport}>
          <Plus size={18} />
          Importer dans {info.label}
        </button>
      </div>
      <div className="collection-toolbar">
        <label className="search-field">
          <Search size={18} />
          <span className="sr-only">Rechercher dans {info.label}</span>
          <input
            type="search"
            value={query}
            placeholder="Un titre, un fichier, un sujet…"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="mode-tabs">
          {(
            [
              { id: "active", label: "Documents" },
              { id: "archived", label: "Archives" },
              { id: "trash", label: "Corbeille" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              aria-pressed={mode === item.id}
              onClick={() => setMode(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <p className="muted results-count" role="status">
        {documents.length} document{documents.length !== 1 ? "s" : ""} · Chaque
        HTML est conservé séparément.
      </p>
      {documents.length ? (
        <div className="edition-grid">
          {documents.map((edition) => (
            <article className="collection-card" key={edition.id}>
              <div className="collection-card-top">
                <FileText size={23} />
                <span>{info.label}</span>
              </div>
              <h2>
                <button
                  className="title-button"
                  onClick={() => onOpen(edition.id)}
                >
                  {edition.title}
                </button>
              </h2>
              <p className="muted">
                {dateLabel(edition.date)} · {sizeLabel(edition.size)}
              </p>
              <p className="collection-excerpt">{edition.excerpt}</p>
              <p className="collection-filename">{edition.filename}</p>
              <div className="collection-card-actions">
                {mode === "trash" ? (
                  <button
                    className="secondary"
                    onClick={() => onUpdate(edition.id, { deleted: false })}
                  >
                    Restaurer
                  </button>
                ) : (
                  <>
                    <button
                      className="text-button"
                      onClick={() => onOpen(edition.id)}
                    >
                      Ouvrir le HTML
                      <ArrowUpRight size={16} />
                    </button>
                    <button
                      className="text-button"
                      onClick={() =>
                        onUpdate(edition.id, { archived: !edition.archived })
                      }
                    >
                      <Archive size={15} />
                      {edition.archived ? "Désarchiver" : "Archiver"}
                    </button>
                    <button
                      className="text-button"
                      onClick={() => onUpdate(edition.id, { deleted: true })}
                    >
                      <Trash2 size={15} />
                      Corbeille
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <FileText size={34} />
          <h2>
            {query
              ? "Aucun document trouvé."
              : mode === "active"
                ? `Vos HTML ${info.label}, ici.`
                : mode === "archived"
                  ? "Aucune archive ici."
                  : "La corbeille est vide."}
          </h2>
          <p>
            {query
              ? "Essayez un autre mot ou un autre titre."
              : "Importez vos fichiers HTML dans cet espace. Ils restent disponibles hors ligne après l’import."}
          </p>
          <button className="primary" onClick={onImport}>
            Importer un HTML dans {info.label}
          </button>
        </div>
      )}
    </section>
  );
}
