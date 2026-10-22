import { DisplayFilters } from "../v9/preferences";
import { indexQuickBriefs } from "../../data/quickBriefs";
import { useMemo, useState, useEffect } from "react";
import type { Edition } from "../../data/model";
import {
  indexArticles,
  normalizeArticleSearch as normalize,
} from "../../data/articles";
import { futureDb } from "../future/db";
import { economicRows, unifiedVersions } from "./selectors";
import { PromptAccess } from "./PromptAccess";
export function PromptLibrary({ editions }: { editions: Edition[] }) {
  const [query, setQuery] = useState(""),
    [selected, setSelected] = useState(""),
    [documentLimit, setDocumentLimit] = useState(100);
  const candidates = [
    ...unifiedVersions(editions),
    ...editions.filter((e) => !e.unified),
  ].filter(
    (e) =>
      !e.deleted &&
      (e.unified
        ? e.unified.promptAssets.length > 0
        : e.collection === "sentinel"),
  );
  const needle = normalize(query).trim();
  const filtered = !needle
    ? candidates
    : candidates.filter((e) =>
        normalize(
          e.title +
            " " +
            e.text +
            " " +
            JSON.stringify(e.unified?.promptAssets || []),
        ).includes(needle),
      );
  const edition = candidates.find((e) => e.id === selected);
  return (
    <section>
      <h2>Mes prompts .md</h2>
      <p>
        Texte intégral conservé dans les originaux. Rien n’est exécuté ni
        transmis à Google. Les anciennes cartes Sentinel peuvent être inspectées
        sans réimport.
      </p>
      <label>
        Rechercher un prompt
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setDocumentLimit(100);
          }}
        />
      </label>
      <p role="status">
        {filtered.length} document(s) candidat(s). Les anciens HTML sont
        vérifiés à l’ouverture.
      </p>
      <div className="unified-prompt-layout">
        <div>
          {filtered.slice(0, documentLimit).map((e) => (
            <button
              className="unified-result"
              key={e.id}
              aria-pressed={selected === e.id}
              onClick={() => setSelected(e.id)}
            >
              <b>{e.title}</b>
              <span>
                {e.date || "Date inconnue"} ·{" "}
                {e.editionSlot || "heure inconnue"} · révision{" "}
                {e.externalRevision || e.revision} ·{" "}
                {e.unified
                  ? e.unified.promptAssets.length + " prompts"
                  : "HTML ancien à inspecter"}
                {e.archived ? " · Archive" : ""}
              </span>
            </button>
          ))}
          {filtered.length > documentLimit && (
            <button
              className="secondary"
              onClick={() => setDocumentLimit((n) => n + 100)}
            >
              Afficher plus de documents avec prompts
            </button>
          )}
        </div>
        <div>
          {edition ? (
            <PromptAccess key={edition.id} edition={edition} />
          ) : (
            <p>
              Choisissez un document pour voir, copier, sélectionner ou
              télécharger chaque prompt.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
type Row = {
  key: string;
  kind: string;
  title: string;
  text: string;
  date: string;
  source: string;
  status: string;
  theme: string;
  open: () => void;
  alternatives?: Row[];
};
export function UnifiedSearch({
  editions,
  onOpen,
  onFuture,
  onPrompts,
}: {
  editions: Edition[];
  onOpen: (id: string, article?: string) => void;
  onFuture: (id?: string) => void;
  onPrompts: () => void;
}) {
  const [query, setQuery] = useState(""),
    [kind, setKind] = useState(""),
    [date, setDate] = useState(""),
    [source, setSource] = useState(""),
    [status, setStatus] = useState(""),
    [theme, setTheme] = useState(""),
    [sort, setSort] = useState("relevance"),
    [futureRows, setFutureRows] = useState<Row[]>([]),
    [error, setError] = useState(""),
    [indexing, setIndexing] = useState(false),
    [limit, setLimit] = useState(30);
  // Full-text on public/imported payloads, no personal notes, no network or model.
  useEffect(() => {
    let active = true;
    setIndexing(true);
    setError("");
    (async () => {
      const docs = await futureDb.documents.toArray();
      const rows: Row[] = [];
      for (let i = 0; i < docs.length; i += 25) {
        const batch = docs.slice(i, i + 25),
          contents = await futureDb.contents.bulkGet(
            batch.map((d) => d.latest),
          );
        for (let j = 0; j < batch.length; j++) {
          const d = batch[j],
            p = contents[j]?.payload;
          if (!p) throw Error("Snapshot Future manquant.");
          rows.push({
            key: "future:" + d.documentId,
            kind: "Future",
            title: d.title,
            text: JSON.stringify(p),
            date: d.updatedAt.slice(0, 10),
            source: "future",
            status: d.status,
            theme: "Prospective",
            open: () => onFuture(d.documentId),
          });
        }
        if (!active) return;
        await new Promise((r) => setTimeout(r, 0));
      }
      if (active) setFutureRows(rows);
    })()
      .catch(() => {
        if (active)
          setError(
            "Index Future indisponible ; les autres recherches restent locales et accessibles.",
          );
      })
      .finally(() => {
        if (active) setIndexing(false);
      });
    return () => {
      active = false;
    };
  }, [onFuture]);
  const rows = useMemo(() => {
    const result: Row[] = indexArticles(editions).map((i) => ({
      key: i.key,
      kind: "Article",
      title: i.article.title,
      text: i.article.text + " " + i.article.sources.join(" "),
      date: i.edition.date || "",
      source: i.article.sourceWatch || i.edition.collection || "journal360",
      status:
        i.edition.unified?.items.find((a) => a.eventId === i.article.eventId)
          ?.evidenceStatus || "legacy",
      theme: i.article.category,
      open: () => onOpen(i.edition.id, i.article.id),
      alternatives: i.history.map((h) => ({
        key: i.key,
        kind: "Article",
        title: h.article.title,
        text: h.article.text + " " + h.article.sources.join(" "),
        date: h.edition.date || "",
        source: h.article.sourceWatch || h.edition.collection || "journal360",
        status: "historique",
        theme: h.article.category,
        open: () => onOpen(h.edition.id, h.article.id),
      })),
    }));
    for (const r of indexQuickBriefs(editions))
      result.push({
        key: "brief:" + r.key,
        kind: "Brève",
        title: r.item.title,
        text: [
          r.item.title,
          r.item.theme,
          r.item.source.publisher,
          r.item.source.url,
        ].join(" "),
        date: r.item.publishedAt,
        source: r.item.source.publisher,
        status: r.item.evidenceStatus,
        theme: r.item.theme,
        open: () => onOpen(r.edition.id),
      });
    for (const { data: e, edition } of economicRows(editions))
      result.push({
        key: "eco:" + e.id + e.period + edition.id,
        kind: "Économie",
        title: e.indicator + " · " + e.zone,
        text: JSON.stringify(e),
        date: e.statisticDate,
        source: "journal360",
        status: e.status,
        theme: "Économie",
        open: () => onOpen(edition.id),
      });
    const seen = new Set<string>();
    for (const e of unifiedVersions(editions)) {
      for (const p of e.unified!.promptAssets) {
        const key = "prompt:" + p.promptId + e.date;
        if (seen.has(key)) continue;
        seen.add(key);
        result.push({
          key,
          kind: "Prompt",
          title: p.title,
          text: p.content,
          date: e.date || "",
          source: p.product,
          status: "intégral",
          theme: "Prompts",
          open: onPrompts,
        });
      }
      for (const i of e.unified!.futureInsights) {
        const key = "insight:" + i.id + e.date;
        if (seen.has(key)) continue;
        seen.add(key);
        result.push({
          key,
          kind: "Jalon",
          title: i.title,
          text: JSON.stringify(i),
          date: i.observedAt || i.publishedAt || e.date || "",
          source: "future",
          status: i.status,
          theme: "Prospective",
          open: () => onOpen(e.id),
        });
      }
      for (const p of e.unified!.futureDocuments) {
        const key = "embedded:" + p.documentId + ":" + p.revision;
        if (seen.has(key)) continue;
        seen.add(key);
        result.push({
          key,
          kind: "Dossier embarqué",
          title: p.title,
          text: JSON.stringify(p),
          date: e.date || "",
          source: "future",
          status: p.status,
          theme: "Prospective",
          open: () => onOpen(e.id),
        });
      }
    }
    return [...result, ...futureRows];
  }, [editions, futureRows, onOpen, onPrompts]);
  const tokens = normalize(query).trim().split(/\s+/).filter(Boolean);
  const matches = (r: Row) =>
    (!kind || kind === r.kind) &&
    (!date || r.date === date) &&
    (!source || r.source === source) &&
    (!status || r.status === status) &&
    (!theme || r.theme === theme) &&
    tokens.every((t) => normalize(r.title + " " + r.text).includes(t));
  const matching = rows
    .map((r) => [r, ...(r.alternatives || [])].find(matches))
    .filter((r): r is Row => !!r)
    .sort((a, b) =>
      sort === "date"
        ? b.date.localeCompare(a.date)
        : Number(normalize(b.title).includes(normalize(query))) -
            Number(normalize(a.title).includes(normalize(query))) ||
          b.date.localeCompare(a.date),
    );
  return (
    <section>
      <h2>Recherche globale locale</h2>
      <p>
        Articles, sources, signaux et scénarios Future, économie, jalons et
        prompts. Recherche textuelle sans accents ni casse ; aucun service IA
        n’est appelé.
      </p>
      <label>
        Rechercher partout
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(30);
          }}
        />
      </label>
      <DisplayFilters>
        <details>
          <summary>Filtres de la recherche globale</summary>
          <div className="unified-filters">
            {[
              ["Type", kind, setKind, rows.map((r) => r.kind)],
              ["Date", date, setDate, rows.map((r) => r.date)],
              ["Provenance", source, setSource, rows.map((r) => r.source)],
              ["Statut", status, setStatus, rows.map((r) => r.status)],
              ["Thème", theme, setTheme, rows.map((r) => r.theme)],
            ].map(([label, value, set, options]) => (
              <label key={String(label)}>
                {String(label)}
                <select
                  value={value as string}
                  onChange={(e) => {
                    (set as (v: string) => void)(e.target.value);
                    setLimit(30);
                  }}
                >
                  <option value="">Tous</option>
                  {[...new Set(options as string[])]
                    .filter(Boolean)
                    .sort()
                    .map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                </select>
              </label>
            ))}
            <label>
              Tri
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="relevance">Pertinence textuelle</option>
                <option value="date">Date</option>
              </select>
            </label>
          </div>
        </details>
      </DisplayFilters>
      {indexing && <p role="status">Indexation locale des dossiers Future…</p>}
      {error && <p role="alert">{error}</p>}
      <p role="status">{matching.length} résultat(s) · aucun envoi externe</p>
      {matching.slice(0, limit).map((r) => (
        <button className="unified-result" key={r.key} onClick={r.open}>
          <b>{r.title}</b>
          <span>
            {r.kind} · {r.date || "date inconnue"} · {r.source} · {r.status}
          </span>
        </button>
      ))}
      {matching.length > limit && (
        <button className="secondary" onClick={() => setLimit((n) => n + 30)}>
          Afficher 30 résultats de plus
        </button>
      )}
    </section>
  );
}
