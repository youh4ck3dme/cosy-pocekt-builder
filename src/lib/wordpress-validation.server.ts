import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const BLOCKED_HOSTNAMES = new Set(["localhost", "localhost.localdomain"]);

function blockedIp(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b! >= 16 && b! <= 31) ||
      (a === 192 && b === 168) ||
      a === 0
    );
  }
  if (version === 6) {
    const normalized = address.toLowerCase();
    return (
      normalized === "::1" ||
      normalized === "::" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe8") ||
      normalized.startsWith("fe9") ||
      normalized.startsWith("fea") ||
      normalized.startsWith("feb")
    );
  }
  return true;
}

/** Validate an external WordPress origin and its current DNS answers. */
export async function validateWordPressUrl(value: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("Zadajte platnú HTTPS adresu WordPressu.");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port && url.port !== "443") {
    throw new Error("WordPress musí používať HTTPS na porte 443.");
  }
  if (url.hostname.length > 253 || BLOCKED_HOSTNAMES.has(url.hostname.toLowerCase())) {
    throw new Error("Táto adresa nie je povolená.");
  }
  const answers = isIP(url.hostname)
    ? [{ address: url.hostname }]
    : await lookup(url.hostname, { all: true, verbatim: true });
  if (!answers.length || answers.some(({ address }) => blockedIp(address))) {
    throw new Error("Adresa smeruje do nepovolenej internej siete.");
  }
  const sanitized = new URL(`${url.protocol}//${url.host}${url.pathname}${url.search}`);
  sanitized.hash = "";
  return sanitized;
}

export function redactWordPressError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Požiadavka zlyhala.";
  return message
    .replace(/Basic\s+[A-Za-z0-9+/=]+/gi, "Basic [redacted]")
    .replace(/https?:\/\/[^\s)]+/gi, "WordPress")
    .slice(0, 240);
}
