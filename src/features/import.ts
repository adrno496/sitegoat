import {
  type Edition,
  articleSchema,
  editionSchema,
  now,
  hash,
} from "../data/model";
import { LocalRepository } from "../data/db";
const cleanText = (s: string) => s.replace(/\s+/g, " ").trim();
const str = (s: unknown) => (typeof s === "string" ? s : "");
function plain(s: unknown) {
  const d = new DOMParser().parseFromString(str(s), "text/html");
  d.querySelectorAll("script,style,iframe,object").forEach((e) => e.remove());
  return cleanText(d.body.textContent || "");
}
function editorialDate(value: unknown): string | null {
  const s = str(value);
  const m = s.match(/^\d{4}-\d{2}-\d{2}(?:T.*)?$/);
  if (!m) return null;
  const date = s.slice(0, 10);
  return !Number.isNaN(Date.parse(date)) &&
    new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date
    ? date
    : null;
}
export async function inspectHTML(
  filename: string,
  bytes: Uint8Array,
  demo = false,
): Promise<Edition> {
  if (!/\.html?$/i.test(filename))
    throw new Error("Choisissez un fichier .html ou .htm.");
  if (bytes.length === 0 || bytes.length > 10 * 1024 * 1024)
    throw new Error("Fichier vide ou supérieur à 10 Mo.");
  let html: string;
  try {
    html = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(
      "Encodage non pris en charge : enregistrez le fichier en UTF-8.",
    );
  }
  if (
    !/<(?:!doctype\s+html|html|head|body|article|h[1-6]|div)\b/i.test(html) ||
    html.includes("\0")
  )
    throw new Error("Le fichier ne ressemble pas à un document HTML valide.");
  const document = new DOMParser().parseFromString(html, "text/html");
  const warnings: string[] = [];
  const script = document.querySelector(
    'script#editionData[type="application/json"]',
  );
  let data: Record<string, unknown> = {};
  if (script) {
    try {
      const parsed: unknown = JSON.parse(script.textContent || "");
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
        data = parsed as Record<string, unknown>;
      else warnings.push("Métadonnées JSON non reconnues.");
    } catch {
      warnings.push(
        "Métadonnées JSON invalides : lecture intégrale conservée.",
      );
    }
  }
  const items = Array.isArray(data.items) ? data.items.slice(0, 2000) : [];
  const articleIds = new Set<string>();
  const articles = items.flatMap((item: unknown, index) => {
    if (!item || typeof item !== "object") return [];
    const a = item as Record<string, unknown>;
    if (!str(a.title)) return [];
    const id = str(a.id) || `article-${index + 1}`;
    if (articleIds.has(id)) return [];
    articleIds.add(id);
    const sources = Array.isArray(a.sources)
      ? a.sources.flatMap((s: unknown) => {
          const u =
            typeof s === "string"
              ? s
              : s && typeof s === "object"
                ? str((s as Record<string, unknown>).url)
                : "";
          return /^https?:\/\//i.test(u) ? [u] : [];
        })
      : [];
    const text = [
      plain(a.plain),
      plain(a.summary),
      plain(a.detail),
      ...(Array.isArray(a.steps) ? a.steps.map(plain) : []),
    ]
      .filter(Boolean)
      .join("\n");
    const parsed = articleSchema.safeParse({
      id,
      eventId: str(a.event_id) || undefined,
      title: plain(a.title),
      category: plain(a.category) || "Non classé",
      text,
      sources,
      date: editorialDate(a.date) || undefined,
    });
    return parsed.success ? [parsed.data] : [];
  });
  if (document.querySelector('script:not([type="application/json"])'))
    warnings.push("Scripts présents : désactivés en lecture sécurisée.");
  if (
    document.querySelector('[src^="http"],link[href],iframe,object') ||
    /@import|url\(['"]?https?:/i.test(html)
  )
    warnings.push(
      "Ressources externes bloquées ; le rendu peut être incomplet.",
    );
  if (/localStorage|sessionStorage/.test(html))
    warnings.push(
      "Le stockage intégré au journal est incompatible avec le lecteur isolé. Utilisez les notes de la PWA.",
    );
  document
    .querySelectorAll("script,style,iframe,object,template")
    .forEach((e) => e.remove());
  const text = cleanText(document.body.textContent || "");
  const id = crypto.randomUUID();
  const title =
    plain(data.title) ||
    cleanText(document.querySelector("h1")?.textContent || document.title) ||
    filename.replace(/\.html?$/i, "");
  return editionSchema.parse({
    id,
    familyId: id,
    revision: 1,
    filename,
    sha256: await hash(bytes),
    title,
    date: editorialDate(
      data.editionDate ??
        data.date ??
        document
          .querySelector('meta[name="edition-date"]')
          ?.getAttribute("content"),
    ),
    importedAt: now(),
    updatedAt: now(),
    size: bytes.length,
    categories: [...new Set(articles.map((a) => a.category))],
    excerpt: (articles[0]?.text || text).slice(0, 240),
    text,
    articles,
    warnings,
    demo,
    archived: false,
    deleted: false,
    sourceVerifiedAt: editorialDate(data.sourceVerifiedAt) || undefined,
  });
}
export async function commitImport(
  repository: LocalRepository,
  edition: Edition,
  bytes: Uint8Array,
  choice: "ignore" | "keep" | "version",
  parentId?: string,
) {
  const existing = await repository.editions
    .where("sha256")
    .equals(edition.sha256)
    .first();
  if (existing && choice === "ignore")
    return { id: existing.id, duplicate: true };
  if (choice === "version" && parentId) {
    const parent = await repository.editions.get(parentId);
    if (!parent) throw new Error("Édition précédente introuvable.");
    edition = {
      ...edition,
      familyId: parent.familyId,
      revision:
        Math.max(
          ...(
            await repository.editions
              .where("familyId")
              .equals(parent.familyId)
              .toArray()
          ).map((e) => e.revision),
        ) + 1,
    };
  }
  await repository.saveEdition(edition, bytes);
  return { id: edition.id, duplicate: false };
}
export function isolatedHTML(bytes: Uint8Array, interactive: boolean) {
  const doc = new DOMParser().parseFromString(
    new TextDecoder().decode(bytes),
    "text/html",
  );
  doc
    .querySelectorAll("base,meta[http-equiv],iframe,object,embed,link,form")
    .forEach((e) => e.remove());
  doc.querySelectorAll("*").forEach((e) => {
    for (const attr of [...e.attributes]) {
      if (
        (!interactive && attr.name.startsWith("on")) ||
        [
          "srcdoc",
          "action",
          "formaction",
          "ping",
          "target",
          "download",
          "autofocus",
        ].includes(attr.name)
      )
        e.removeAttribute(attr.name);
      if (
        ["src", "srcset", "href", "xlink:href"].includes(attr.name) &&
        !attr.value.startsWith("data:") &&
        !attr.value.startsWith("#")
      )
        e.removeAttribute(attr.name);
    }
  });
  if (!interactive) doc.querySelectorAll("script").forEach((e) => e.remove());
  else doc.querySelectorAll("script[src]").forEach((e) => e.remove());
  const csp = doc.createElement("meta");
  csp.httpEquiv = "Content-Security-Policy";
  csp.content = `default-src 'none'; script-src ${interactive ? "'unsafe-inline'" : "'none'"}; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'; object-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'`;
  doc.head.prepend(csp);
  return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
}
