import { hash } from "../../data/model";
import {
  payloadSchema,
  publicHttps,
  RADAR_LIMIT,
  type RadarPayload,
} from "./schema";

export interface RadarFile {
  name: string;
  bytes: Uint8Array;
  type?: string;
  pendingId?: string;
}
export interface RadarCandidate {
  file: RadarFile;
  payload?: RadarPayload;
  sha256?: string;
  family?: string;
  error?: string;
  journal?: boolean;
}
export async function inspectRadar(
  file: RadarFile,
  today = new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()),
): Promise<RadarCandidate> {
  try {
    if (
      file.name.length > 300 ||
      !/\.html?$/i.test(file.name) ||
      (file.type &&
        file.type !== "text/html" &&
        file.type !== "application/xhtml+xml")
    )
      throw new Error(
        "Choisissez un fichier HTML, avec un type HTML cohérent et un nom de 300 caractères maximum.",
      );
    if (!file.bytes.length || file.bytes.length > RADAR_LIMIT)
      throw new Error("HTML vide ou supérieur à 10 Mo.");
    const html = new TextDecoder("utf-8", { fatal: true }).decode(file.bytes);
    if (!/^\s*<!doctype\s+html\s*>/i.test(html) || html.includes("\0"))
      throw new Error("HTML autonome UTF-8 avec doctype requis.");
    // Reject active/resource-bearing markup before constructing the inert DOM.
    if (/<\s*(?:iframe|object|embed|img|link|base|form|svg|math)\b/i.test(html))
      throw new Error(
        "Ressource active ou externe interdite dans AI-RADAR HTML v1.",
      );
    const doc = new DOMParser().parseFromString(html, "text/html");
    const blocks = doc.querySelectorAll(
      'script#editionData[type="application/json"]',
    );
    if (blocks.length !== 1)
      throw new Error("Un unique bloc JSON editionData est requis.");
    let value: unknown;
    try {
      value = JSON.parse(blocks[0].textContent || "");
    } catch {
      throw new Error("Métadonnées JSON invalides.");
    }
    if (
      !value ||
      typeof value !== "object" ||
      !("contentType" in value) ||
      value.contentType !== "ai-radar"
    )
      return {
        file,
        journal: true,
        error:
          "Ce fichier n’est pas AI-RADAR v1. Utilisez le parcours Bibliothèque, IA majeur ou Sentinel.",
      };
    if (
      [...doc.scripts].some((script) => script !== blocks[0]) ||
      doc.querySelector("meta[http-equiv]")
    )
      throw new Error("Scripts exécutables et redirections interdits.");
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
          throw new Error("Attribut actif ou ressource externe interdite.");
        if (
          attribute.name === "href" &&
          !attribute.value.startsWith("#") &&
          !publicHttps(attribute.value)
        )
          throw new Error("Lien non HTTPS public refusé.");
        if (
          attribute.name === "style" &&
          /@import|url\s*\(|expression\s*\(/i.test(attribute.value)
        )
          throw new Error("CSS externe ou actif refusé.");
      }
    if (
      [...doc.querySelectorAll("style")].some((style) =>
        /@import|url\s*\(|expression\s*\(/i.test(style.textContent || ""),
      )
    )
      throw new Error(
        "Les styles doivent rester locaux et sans ressources distantes.",
      );
    const parsed = payloadSchema.safeParse(value);
    if (!parsed.success)
      throw new Error(
        parsed.error.issues
          .slice(0, 3)
          .map(
            (issue) =>
              `${issue.path.join(".") || "document"} : ${issue.message}`,
          )
          .join(" · "),
      );
    const payload = parsed.data;
    if (
      payload.date > today ||
      payload.radar.fetchedOrProvidedAt.slice(0, 10) > today
    )
      throw new Error(
        "Document ou capture daté dans le futur. Décrivez la projection dans une hypothèse datée d’aujourd’hui.",
      );
    return {
      file,
      payload,
      sha256: await hash(file.bytes),
      family: `ai-radar:${payload.documentId || payload.items[0].event_id}`,
    };
  } catch (error) {
    return {
      file,
      error: error instanceof Error ? error.message : "Fichier refusé.",
    };
  }
}
export function radarReaderHTML(bytes: Uint8Array) {
  const doc = new DOMParser().parseFromString(
    new TextDecoder().decode(bytes),
    "text/html",
  );
  doc
    .querySelectorAll(
      "script,iframe,object,embed,link,base,meta[http-equiv],form",
    )
    .forEach((node) => node.remove());
  for (const element of doc.querySelectorAll("*"))
    for (const attribute of [...element.attributes]) {
      if (
        /^on/i.test(attribute.name) ||
        ["src", "srcset", "srcdoc", "action", "target"].includes(attribute.name)
      )
        element.removeAttribute(attribute.name);
      if (attribute.name === "href" && !attribute.value.startsWith("#"))
        element.removeAttribute("href");
    }
  const csp = doc.createElement("meta");
  csp.httpEquiv = "Content-Security-Policy";
  csp.content =
    "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; connect-src 'none'; img-src 'none'; object-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'";
  doc.head.prepend(csp);
  return "<!doctype html>" + doc.documentElement.outerHTML;
}
