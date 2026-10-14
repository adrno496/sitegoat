export function validateSourceUrl(value: unknown): string | null {
  if (
    typeof value !== "string" ||
    value.length > 2048 ||
    !/^https?:\/\//.test(value) ||
    /[\s\\]/u.test(value)
  )
    return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const privateIP =
      /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(
        host,
      );
    if (
      url.username ||
      url.password ||
      url.port ||
      privateIP ||
      !host.includes(".") ||
      /(?:^|\.)(?:localhost|local|internal)$/.test(host) ||
      host.includes(":")
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}
