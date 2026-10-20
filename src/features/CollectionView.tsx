import { useMemo, useState } from "react";
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
import { indexArticles, normalizeArticleSearch } from "../data/articles";
import { PromptAccess } from "./unified/PromptAccess";

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
  onOpen: (id: string, articleId?: string) => void;
  onUpdate: (
    id: string,
    patch: Partial<Pick<Edition, "archived" | "deleted">>,
  ) => void;
}) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"active" | "archived" | "trash">("active");
  const info = collections.find((item) => item.id === collection)!;
  const unifiedItems = useMemo(
    () =>
      indexArticles(editions).filter(
        (i) =>
          i.edition.unified &&
          !i.edition.collection &&
          i.article.sourceWatch === collection &&
          (mode === "archived"
            ? i.edition.archived
            : mode === "active" && !i.edition.archived) &&
          normalizeArticleSearch(
            i.article.title + " " + i.article.text,
          ).includes(normalizeArticleSearch(query).trim()),
      ),
    [editions, collection, mode, query],
  );
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
      {unifiedItems.length > 0 && (
        <p>
          {unifiedItems.length} article(s) de l’édition unifiée, sans copie de
          l’original. Historique et restauration dans Bibliothèque.
        </p>
      )}
      {documents.length || unifiedItems.length ? (
        <div className="edition-grid">
          {unifiedItems.map((item) => (
            <article className="collection-card" key={item.key}>
              <p className="eyebrow">{info.label} · ÉDITION UNIFIÉE</p>
              <h2>{item.article.title}</h2>
              <p>{item.article.text.slice(0, 400)}</p>
              <p className="muted">
                {dateLabel(item.edition.date)} · original conservé dans
                Bibliothèque
              </p>
              <button
                className="text-button"
                onClick={() => onOpen(item.edition.id, item.article.id)}
              >
                Ouvrir l’article dans le HTML <ArrowUpRight size={16} />
              </button>
              {collection === "sentinel" &&
                item.edition.unified?.promptAssets.some(
                  (p) => p.eventId === item.article.eventId,
                ) && (
                  <PromptAccess
                    edition={item.edition}
                    eventId={item.article.eventId}
                  />
                )}
            </article>
          ))}
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
              {collection === "sentinel" && mode !== "trash" && (
                <PromptAccess key={edition.sha256} edition={edition} />
              )}
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
