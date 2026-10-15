import {
  type Edition,
  articleSchema,
  editionSchema,
  now,
  hash,
} from "../data/model";
import { LocalRepository } from "../data/db";
import {
  googleAiLinkBridge,
  validateGoogleDestination,
  GOOGLE_AI_ENTRY,
  rememberReadingQuestions,
} from "./googleAi";
import Dexie from "dexie";
import {
  editorialMetadata,
  verifiedInstant,
  validDate,
} from "../data/editorial";
import {
  editorialUUID,
  assessVersion,
  resolveDay,
  dayKeyOf,
  journalFilenameDate,
} from "../data/day";
import { validateSourceUrl } from "./sourceUrl";
import { LOCAL_FRAGMENT_LINK_BRIDGE } from "./frameNavigation";
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
  return validDate(date) ? date : null;
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
  let rejectedArticles = 0,
    duplicateArticles = 0,
    rejectedSources = 0;
  if (Array.isArray(data.items) && data.items.length > 2000)
    warnings.push(
      "Sommaire limité à 2000 articles ; le HTML original reste intégral.",
    );
  const articles = items.flatMap((item: unknown, index) => {
    if (!item || typeof item !== "object") {
      rejectedArticles++;
      return [];
    }
    const a = item as Record<string, unknown>;
    if (!str(a.title)) return [];
    const id = str(a.id) || `article-${index + 1}`;
    if (articleIds.has(id)) {
      duplicateArticles++;
      return [];
    }
    articleIds.add(id);
    const sources = Array.isArray(a.sources)
      ? a.sources.flatMap((s: unknown) => {
          const u =
            typeof s === "string"
              ? s
              : Array.isArray(s)
                ? str(s[1])
                : s && typeof s === "object"
                  ? str((s as Record<string, unknown>).url)
                  : "";
          const valid = validateSourceUrl(u);
          if (!valid) rejectedSources++;
          return valid ? [valid] : [];
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
      firstSeenSlot: ["08:00", "16:00", "21:00"].includes(str(a.firstSeenSlot))
        ? a.firstSeenSlot
        : undefined,
      kind: [
        "news",
        "business",
        "hypothesis",
        "technical",
        "decision",
      ].includes(str(a.kind))
        ? a.kind
        : undefined,
    });
    if (!parsed.success) rejectedArticles++;
    return parsed.success ? [parsed.data] : [];
  });
  if (rejectedArticles)
    warnings.push(
      `${rejectedArticles} article(s) non indexé(s) car invalides ; originaux conservés.`,
    );
  if (duplicateArticles)
    warnings.push(
      `${duplicateArticles} identifiant(s) d’article répété(s) : premier article conservé dans l’index.`,
    );
  if (rejectedSources)
    warnings.push(`${rejectedSources} URL de source refusée(s) dans l’index.`);
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
    cleanText(
      document.title || document.querySelector("h1")?.textContent || "",
    ) ||
    filename.replace(/\.html?$/i, "");
  const date =
    editorialDate(
      data.editionDate ??
        data.date ??
        document
          .querySelector('meta[name="edition-date"]')
          ?.getAttribute("content"),
    ) ||
    journalFilenameDate(filename) ||
    null;
  const metadata = editorialMetadata(data, date, warnings);
  const sourceVerifiedAt = verifiedInstant(data.sourceVerifiedAt, warnings);
  return editionSchema.parse({
    id,
    familyId: id,
    revision: 1,
    filename,
    sha256: await hash(bytes),
    title,
    date,
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
    sourceVerifiedAt,
    ...metadata,
  });
}
export async function commitImport(
  repository: LocalRepository,
  edition: Edition,
  bytes: Uint8Array,
  choice: "ignore" | "keep" | "version" | "day" | "replace",
  parentId?: string,
) {
  const key = dayKeyOf(edition);
  if (key && choice !== "ignore") {
    edition = {
      ...edition,
      date: key.slice(15),
      dayKey: key,
      independent: false,
    };
    choice = "day";
  }
  // Derive identities before opening the local transaction; waitFor also keeps
  // the caller's batch transaction alive without including any network request.
  if (choice === "day" && edition.dayKey) {
    const [familyId, id] = await Dexie.waitFor(
      Promise.all([
        editorialUUID(`family:${edition.dayKey}`),
        editorialUUID(`version:${edition.dayKey}:${edition.sha256}`),
      ]),
    );
    edition = { ...edition, familyId, id, independent: false };
  }
  return repository.transaction(
    "rw",
    [repository.editions, repository.originals],
    async () => {
      const matching = await repository.editions
        .where("sha256")
        .equals(edition.sha256)
        .toArray();
      const existing =
        choice === "day"
          ? matching.find((e) => dayKeyOf(e) === edition.dayKey)
          : matching[0];
      if (existing && choice === "ignore")
        return { id: existing.id, duplicate: true, replaced: false };
      // An exact duplicate (same SHA-256) is no longer ignored: the last import
      // replaces the previous one in place. Same bytes, so the record keeps its
      // ID, notes and favourites; it is dated by this import (latest version of
      // its slot) and shown again even if it was archived or in the trash. The
      // existing filename is kept: it may carry the edition hour used to order.
      if (existing && (choice === "replace" || choice === "day")) {
        const at = now();
        await repository.editions.update(existing.id, {
          importedAt: at,
          updatedAt: at,
          archived: false,
          deleted: false,
        });
        if (!(await repository.originals.get(existing.id)))
          await repository.originals.put({ id: existing.id, bytes });
        return { id: existing.id, duplicate: true, replaced: true };
      }
      if (choice === "day" && edition.dayKey) {
        const family = (await repository.editions.toArray()).filter(
          (e) => dayKeyOf(e) === edition.dayKey,
        );
        const current = resolveDay(family).current;
        const assessment = assessVersion(edition, family);
        edition = {
          ...edition,
          revision: Math.max(0, ...family.map((e) => e.revision)) + 1,
          cumulativeStatus: assessment.status,
          supersedes:
            current &&
            resolveDay([...family, edition]).current?.id === edition.id
              ? current.id
              : undefined,
        };
      }
      if (choice === "version" && parentId) {
        const parent = await repository.editions.get(parentId);
        if (!parent) throw new Error("Édition précédente introuvable.");
        if (parent.dayKey && edition.date !== parent.date)
          throw new Error(
            "Le rattachement à une journée exige la même date éditoriale.",
          );
        edition = {
          ...edition,
          familyId: parent.familyId,
          dayKey: parent.dayKey,
          independent: parent.independent,
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
      return { id: edition.id, duplicate: false, replaced: false };
    },
  );
}
export function isolatedHTML(bytes: Uint8Array, interactive: boolean) {
  const doc = new DOMParser().parseFromString(
    new TextDecoder().decode(bytes),
    "text/html",
  );
  rememberReadingQuestions(bytes, doc);
  // Conserver les contrôles/calculatrices sans autoriser de soumission réseau.
  doc.querySelectorAll("form").forEach((form) => {
    const neutral = doc.createElement("div");
    for (const attribute of [...form.attributes])
      neutral.setAttribute(attribute.name, attribute.value);
    neutral.append(...form.childNodes);
    form.replaceWith(neutral);
  });
  doc
    .querySelectorAll("base,meta[http-equiv],iframe,object,embed,link")
    .forEach((e) => e.remove());
  doc.querySelectorAll("*").forEach((e) => {
    const googleAi =
      interactive && e.matches("a[href]")
        ? validateGoogleDestination(e.getAttribute("href")) ||
          (e.getAttribute("href") === GOOGLE_AI_ENTRY
            ? { url: GOOGLE_AI_ENTRY, query: "" }
            : null)
        : null;
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
          "data-journal360-google-ai-url",
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
    if (googleAi) {
      e.setAttribute("data-ai-link", "google-ai-mode");
      e.setAttribute("data-journal360-google-ai-url", googleAi.url);
      e.setAttribute("href", "#");
    }
  });
  // srcdoc inherits the parent's base URL. A bare #fragment would load the
  // PWA inside the frame instead of navigating within the imported document.
  // This also works in safe mode without scripts or a permissive <base>.
  if (!interactive)
    doc.querySelectorAll('a[href^="#"],area[href^="#"]').forEach((link) => {
      link.setAttribute("href", `about:srcdoc${link.getAttribute("href")}`);
    });
  if (!interactive) doc.querySelectorAll("script").forEach((e) => e.remove());
  else doc.querySelectorAll("script[src]").forEach((e) => e.remove());
  const csp = doc.createElement("meta");
  csp.httpEquiv = "Content-Security-Policy";
  csp.content = `default-src 'none'; script-src ${interactive ? "'unsafe-inline'" : "'none'"}; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'; object-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'`;
  doc.head.prepend(csp);
  if (interactive) {
    const googleAi = doc.createElement("script");
    googleAi.textContent = googleAiLinkBridge(location.origin);
    csp.after(googleAi);
    const routing = doc.createElement("script");
    // about:srcdoc à origine opaque refuse pushState ; les fragments restent locaux au cadre.
    routing.textContent =
      LOCAL_FRAGMENT_LINK_BRIDGE +
      `(()=>{for(const method of ['pushState','replaceState']){const original=history[method].bind(history);history[method]=function(state,unused,url){try{return original(state,unused,url)}catch(error){if(error.name==='SecurityError'&&typeof url==='string'&&url.startsWith('#')){location.hash=url;return}throw error}}}})();`;
    csp.after(routing);
  }
  return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
}
