import { parseGoogleAiMessage, type GoogleAiMessage } from "./googleAi";

export const GOOGLE_AI_SESSION_TTL = 5 * 60 * 1000;
const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
// A freshness token, not a secret or a trust grant to the imported document.
// Reader must authenticate the exact WindowProxy and opaque origin BEFORE use.
export class GoogleAiSession {
  private nonce = crypto.randomUUID();
  private expiresAt: number;
  private used = new Set<string>();
  constructor(now = Date.now()) {
    this.expiresAt = now + GOOGLE_AI_SESSION_TTL;
  }
  capability(now = Date.now()) {
    if (now >= this.expiresAt || this.used.size >= 256) {
      this.nonce = crypto.randomUUID();
      this.expiresAt = now + GOOGLE_AI_SESSION_TTL;
      this.used.clear();
    }
    return {
      type: "journal360:google-ai:capability",
      version: 3,
      enabled: true,
      nonce: this.nonce,
      expiresAt: this.expiresAt,
    };
  }
  current(nonce: string, now = Date.now()) {
    return nonce === this.nonce && now < this.expiresAt;
  }
  accept(
    value: unknown,
    now = Date.now(),
  ): { message: GoogleAiMessage; nonce: string } | null {
    if (!value || typeof value !== "object" || Array.isArray(value))
      return null;
    const data = value as Record<string, unknown>;
    const field =
      data.type === "journal360:google-ai:question-request"
        ? "question"
        : "url";
    const keys = Object.keys(data);
    if (
      data.version !== 3 ||
      keys.length !== 5 ||
      keys.some(
        (k) => !["type", "version", "nonce", "requestId", field].includes(k),
      ) ||
      typeof data.nonce !== "string" ||
      !uuid.test(data.nonce) ||
      !this.current(data.nonce, now) ||
      typeof data.requestId !== "string" ||
      !/^[\da-f]{32}$/.test(data.requestId) ||
      this.used.has(data.requestId) ||
      this.used.size >= 256
    )
      return null;
    const message = parseGoogleAiMessage({
      type: data.type,
      version: field === "question" ? 2 : 1,
      [field]: data[field],
    });
    if (!message || message.type !== "open") return null;
    this.used.add(data.requestId);
    return { message, nonce: data.nonce };
  }
}
