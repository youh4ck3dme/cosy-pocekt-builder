import { timingSafeEqual } from "node:crypto";
import {
  getCookie,
  getRequest,
  getRequestIP,
  getRequestProtocol,
  setCookie,
  setResponseHeader,
  setResponseStatus,
} from "@tanstack/react-start/server";
import { assertSameSiteRequest, CrossSiteRequestError } from "@/lib/auth/isolation.server";
import { consumeQuota, createInMemoryQuotaStore, type QuotaStore } from "@/lib/ai/generate-quota";
import { getRedisQuotaStore } from "@/lib/ai/redis-quota.server";

export class GenerateGateError extends Error {
  readonly status: number;
  readonly retryAfter?: number;
  constructor(status: number, message: string, retryAfter?: number) {
    super(message);
    this.name = "GenerateGateError";
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

const COOKIE = "cozy_generate_access";

const globalRef = globalThis as typeof globalThis & {
  __generateQuota__?: QuotaStore;
  __generateQuotaRedis__?: boolean;
};

async function quotaStore(): Promise<QuotaStore> {
  // Check if we've already determined the store type
  if (globalRef.__generateQuota__) {
    return globalRef.__generateQuota__;
  }

  // Try Redis first if REDIS_URL is configured
  const redisUrl = process.env.REDIS_URL || process.env.REDIS_MODULE_URL;
  
  if (redisUrl) {
    try {
      const redisStore = getRedisQuotaStore();
      const connected = await redisStore.connect();
      
      if (connected) {
        globalRef.__generateQuota__ = redisStore;
        globalRef.__generateQuotaRedis__ = true;
        console.log('[Quota] Using Redis-based rate limiting');
        return redisStore;
      }
    } catch (error) {
      console.warn('[Quota] Redis connection failed, falling back to in-memory:', error);
    }
  }

  // Fall back to in-memory store
  console.log('[Quota] Using in-memory rate limiting');
  globalRef.__generateQuota__ = createInMemoryQuotaStore();
  globalRef.__generateQuotaRedis__ = false;
  return globalRef.__generateQuota__;
}

function envInt(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function configuredAccessToken(): string {
  return (process.env.GENERATE_ACCESS_TOKEN ?? process.env.API_SECRET ?? "").trim();
}

export function generateLocked(): boolean {
  return Boolean(configuredAccessToken());
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function clientIp(): string {
  return getRequestIP({ xForwardedFor: true })?.trim() || "unknown";
}

function presentedToken(): string {
  const request = getRequest();
  const header = request?.headers.get("authorization") ?? "";
  if (header.toLowerCase().startsWith("bearer ")) return header.slice(7).trim();
  return (getCookie(COOKIE) ?? "").trim();
}

function logGate(event: string, extra: Record<string, string | number | undefined>) {
  if (process.env.NODE_ENV === "production") return;
  console.info("[generate-gate]", event, extra);
}

export function applyGateHttp(err: GenerateGateError): void {
  setResponseStatus(err.status);
  setResponseHeader("Cache-Control", "no-store");
  if (err.retryAfter) setResponseHeader("Retry-After", String(err.retryAfter));
}

export async function gateGenerate(): Promise<{ ip: string }> {
  try {
    assertSameSiteRequest();
  } catch (e) {
    if (e instanceof CrossSiteRequestError) {
      logGate("forbidden", { reason: "cross-site" });
      throw new GenerateGateError(403, "Forbidden");
    }
    throw e;
  }

  const expected = configuredAccessToken();
  if (expected) {
    const got = presentedToken();
    if (!got || !safeEqual(got, expected)) {
      logGate("unauthorized", { ip: clientIp() });
      throw new GenerateGateError(401, "Unauthorized");
    }
  }

  const ip = clientIp();
  const perMinute = envInt("MAX_REQUESTS_PER_MINUTE", 10);
  const perDay = envInt("MAX_REQUESTS_PER_DAY", 100);
  const store = await quotaStore();
  const result = await consumeQuota(store, ip, Date.now(), perMinute, perDay);
  if (!result.ok) {
    const message =
      result.reason === "day"
        ? "Daily generate quota exceeded"
        : "Too many requests";
    logGate("rate-limit", { ip, reason: result.reason, retryAfter: result.retryAfter });
    throw new GenerateGateError(429, message, result.retryAfter);
  }

  logGate("ok", {
    ip,
    remainingMinute: result.remainingMinute,
    remainingDay: result.remainingDay,
  });
  return { ip };
}

export function redeemAccess(token: string): { ok: true } | { ok: false; error: string; status: number } {
  try {
    assertSameSiteRequest();
  } catch {
    return { ok: false, error: "Forbidden", status: 403 };
  }
  const expected = configuredAccessToken();
  if (!expected) {
    return { ok: false, error: "Access token is not required", status: 400 };
  }
  const got = token.trim();
  if (!got || !safeEqual(got, expected)) {
    logGate("redeem-denied", { ip: clientIp() });
    setResponseStatus(401);
    return { ok: false, error: "Unauthorized", status: 401 };
  }
  const secure = getRequestProtocol() === "https";
  setCookie(COOKIE, expected, {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure,
  });
  logGate("redeem-ok", { ip: clientIp() });
  return { ok: true };
}

export async function resetQuotaStoreForTests(): Promise<void> {
  const store = await quotaStore();
  store.clear();
}
