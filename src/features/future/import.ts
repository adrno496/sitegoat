import { classifyFuture } from "./routing";
export { classifyFuture } from "./routing";
import { hash } from "../../data/model";
import { inspectRadar, type RadarFile } from "../aiRadar/import";
import { publicHttps } from "../aiRadar/schema";
import { futureSchema, type FuturePayload } from "./schema";
export type FutureFile = RadarFile;
export interface FutureCandidate {
  file: FutureFile;
  payload?: FuturePayload;
  sha256?: string;
  migration?: boolean;
  error?: string;
  journal?: boolean;
  kind?: "html" | "json" | "legacy-radar";
}
function checkDepth(value: unknown) {
  const stack = [{ value, depth: 0 }];
  let nodes = 0;
  while (stack.length) {
    const entry = stack.pop()!;
    if (++nodes > 30000 || entry.depth > 12)
      throw new Error("JSON trop profond ou trop complexe.");
    if (entry.value && typeof entry.value === "object")
      for (const child of Object.values(entry.value))
        stack.push({ value: child, depth: entry.depth + 1 });
  }
}
export function validateFuture(value: unknown, at = new Date()) {
  checkDepth(value);
  const result = futureSchema.safeParse(value);
  if (!result.success)
    throw new Error(
      result.error.issues
        .slice(0, 4)
        .map(
          (issue) => `${issue.path.join(".") || "dossier"} : ${issue.message}`,
        )
        .join(" · "),
    );
  const p = result.data;
  const today = at.toISOString().slice(0, 10),
    limit = +at + 5 * 60 * 1000;
  if (
    Date.parse(p.updatedAt) > limit ||
    Date.parse(p.provenance.providedAt) > limit
  )
    throw new Error(
      "Date de révision ou de remise future. Utilisez les années des scénarios pour la prospective.",
    );
  for (const source of p.provenance.sources) {
    if (
      (source.publishedAt && source.publishedAt > today) ||
      (source.consultedAt && Date.parse(source.consultedAt) > limit)
    )
      throw new Error("Date de source incohérente.");
  }
  for (const scenario of p.scenarios)
    for (const milestone of scenario.milestones)
      if (
        milestone.status === "observed" &&
        (!milestone.observedAt ||
          milestone.observedAt > today ||
          milestone.year > at.getUTCFullYear())
      )
        throw new Error("Un jalon futur n’est pas un événement déjà observé.");
  for (const signal of p.signals)
    if (signal.lastCheckedAt && Date.parse(signal.lastCheckedAt) > limit)
      throw new Error("Contrôle de signal daté dans le futur.");
  if (
    p.status === "observed" &&
    !p.signals.some((signal) => signal.status === "observed") &&
    !p.scenarios.some((s) => s.milestones.some((m) => m.status === "observed"))
  )
    throw new Error(
      "Un dossier observé doit contenir au moins une observation sourcée.",
    );
  return p;
}
export async function inspectFuture(
  file: FutureFile,
  revision = 1,
): Promise<FutureCandidate> {
  try {
    if (
      file.name.length > 300 ||
      !file.bytes.length ||
      file.bytes.length > 10 * 1024 * 1024
    )
      throw new Error("Fichier vide, supérieur à 10 Mo ou nom trop long.");
    if (!/\.(html?|json)$/i.test(file.name))
      throw new Error("Extension HTML ou JSON requise.");
    if (
      file.type &&
      !(
        /\.json$/i.test(file.name)
          ? ["application/json", "text/plain"]
          : ["text/html", "application/xhtml+xml"]
      ).includes(file.type)
    )
      throw new Error("Type de fichier incohérent.");
    const raw = new TextDecoder("utf-8", { fatal: true }).decode(file.bytes);
    const type = classifyFuture(file.bytes);
    if (type === "legacy") {
      const legacy = await inspectRadar(file);
      if (!legacy.payload)
        throw new Error(legacy.error || "Ancien format AI-RADAR invalide.");
      const p = legacy.payload;
      const documentId = `legacy-${await hash(new TextEncoder().encode(p.documentId || p.items[0].event_id))}`;
      const sources = [
        ...new Map(
          p.items
            .flatMap((item) => item.sources)
            .map((source) => [source.url, source]),
        ).values(),
      ];
      const at = new Date().toISOString();
      const payload = validateFuture({
        format: "journal360.future",
        version: 1,
        documentId,
        revision,
        updatedAt: at,
        title: p.title,
        status: "hypothesis",
        synthetic: p.synthetic,
        editorialDecision: {
          verdict: p.editorialVerdict,
          reason: p.editorialReason,
        },
        provenance: {
          originType: p.radar.originType,
          title: p.radar.sourceTitle,
          originalUrl: null,
          author: p.radar.sourceAuthor,
          publishedAt: p.radar.sourcePublishedAt?.slice(0, 10) || null,
          providedAt: at,
          legacyFormat: "ai-radar",
          sources: sources.map((source, i) => ({
            id: `legacy-source-${i + 1}`,
            label: source.label,
            url: source.url,
            publisher: source.publisher || "Non renseigné",
            author: source.author || null,
            publishedAt: source.publishedAt?.slice(0, 10) || null,
            type: source.evidenceType,
            consultedAt: null,
          })),
        },
        scenarios: [],
        signals: p.items.map((item) => ({
          id: item.id,
          title: item.title,
          status: "unknown",
          description: `${item.plain}\n${item.detail}`,
          evidenceUrls: item.sources.map((s) => s.url),
          lastCheckedAt: null,
          checkNote:
            "Migration AI-RADAR : affirmation non certifiée, prospective à compléter.",
        })),
        actions: [],
        visualization: {
          modules: ["signals", "changes", "sources"],
          motion: "off",
          links: [],
        },
      });
      return {
        file,
        payload,
        sha256: await hash(file.bytes),
        migration: true,
        kind: "legacy-radar",
      };
    }
    if (type === "journal")
      return {
        file,
        journal: true,
        error:
          "Ce HTML est un journal standard. Confirmez son transfert au parcours Bibliothèque.",
      };
    let value: unknown;
    if (/\.json$/i.test(file.name)) {
      if (
        file.bytes.length > 2 * 1024 * 1024 ||
        (file.type && !["application/json", "text/plain"].includes(file.type))
      )
        throw new Error("JSON v1 limité à 2 Mo ; type de fichier incohérent.");
      value = JSON.parse(raw);
    } else {
      if (
        !/\.html?$/i.test(file.name) ||
        (file.type &&
          !["text/html", "application/xhtml+xml"].includes(file.type))
      )
        throw new Error("Choisissez un HTML ou JSON du contrat Le Futur v1.");
      if (!/^\s*<!doctype\s+html\s*>/i.test(raw) || raw.includes("\0"))
        throw new Error("HTML autonome UTF-8 avec doctype requis.");
      if (
        /<\s*(?:iframe|object|embed|img|link|base|form|svg|math)\b/i.test(raw)
      )
        throw new Error("Ressource externe ou contenu actif interdit.");
      const doc = new DOMParser().parseFromString(raw, "text/html");
      const blocks = doc.querySelectorAll(
        'script#futureData[type="application/json"]',
      );
      if (blocks.length !== 1 || doc.scripts.length !== 1)
        throw new Error(
          "Un seul bloc JSON futureData et aucun script exécutable sont autorisés.",
        );
      if (doc.querySelector("meta[http-equiv]"))
        throw new Error("Redirection interdite.");
      for (const element of doc.querySelectorAll("*"))
        for (const attribute of element.attributes) {
          if (
            /^on/i.test(attribute.name) ||
            [
              "src",
              "srcset",
              "srcdoc",
              "action",
              "formaction",
              "xlink:href",
            ].includes(attribute.name)
          )
            throw new Error("Attribut actif refusé.");
          if (
            attribute.name === "href" &&
            !attribute.value.startsWith("#") &&
            !publicHttps(attribute.value)
          )
            throw new Error("Lien HTTPS public requis.");
          if (
            attribute.name === "style" &&
            /@import|@font-face|url\s*\(|expression\s*\(|\\/i.test(
              attribute.value,
            )
          )
            throw new Error("CSS actif ou externe refusé.");
        }
      if (
        [...doc.querySelectorAll("style")].some((node) =>
          /@import|@font-face|url\s*\(|expression\s*\(|\\/i.test(
            node.textContent || "",
          ),
        )
      )
        throw new Error("Styles externes interdits.");
      const json = blocks[0].textContent || "";
      if (new TextEncoder().encode(json).length > 2 * 1024 * 1024)
        throw new Error("Métadonnées limitées à 2 Mo.");
      value = JSON.parse(json);
    }
    return {
      file,
      payload: validateFuture(value),
      sha256: await hash(file.bytes),
      kind: /\.json$/i.test(file.name) ? "json" : "html",
    };
  } catch (error) {
    return {
      file,
      error: error instanceof Error ? error.message : "Dossier incompatible.",
    };
  }
}
