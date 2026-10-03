/**
 * Mistral API key pool — round-robin load spread + rate-limit/quota failover.
 *
 * Keys come from `MISTRAL_API_KEYS` (comma-separated); if that is absent we fall
 * back to the single `MISTRAL_API_KEY`. Server-only: these are secrets and must
 * never be bundled into the client.
 */

export function getMistralKeys(): string[] {
  const multi = (process.env.MISTRAL_API_KEYS ?? "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
  if (multi.length > 0) return Array.from(new Set(multi));
  const single = (process.env.MISTRAL_API_KEY ?? "").trim();
  return single ? [single] : [];
}

// Round-robin cursor so consecutive requests start on different keys and spread
// load, while a single request still fails over across the whole pool.
let cursor = 0;

export function orderedMistralKeys(): string[] {
  const keys = getMistralKeys();
  if (keys.length <= 1) return keys;
  const start = cursor % keys.length;
  cursor = (cursor + 1) % keys.length;
  return [...keys.slice(start), ...keys.slice(0, start)];
}

// Errors worth retrying on the next key: rate limit (429) and quota/billing (402).
export function isRotatableStatus(status: number | undefined): boolean {
  return status === 429 || status === 402;
}
