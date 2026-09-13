export type QuotaBucket = {
  hits: number[];
  day: string;
  dayCount: number;
};

export type QuotaStore = {
  get: (key: string) => Promise<QuotaBucket | undefined>;
  set: (key: string, value: QuotaBucket) => Promise<void>;
  clear: () => void;
  withLock?: <T>(key: string, run: () => Promise<T>) => Promise<T>;
};

export type InMemoryQuotaStore = Map<string, QuotaBucket>;

export type QuotaOk = {
  ok: true;
  remainingMinute: number;
  remainingDay: number;
};

export type QuotaDenied = {
  ok: false;
  retryAfter: number;
  reason: "minute" | "day";
};

export function utcDayKey(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

export function secondsUntilNextUtcDay(nowMs: number): number {
  const d = new Date(nowMs);
  const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
  return Math.max(1, Math.ceil((next - nowMs) / 1000));
}

export async function consumeQuota(
  store: QuotaStore,
  ip: string,
  nowMs: number,
  perMinute: number,
  perDay: number,
): Promise<QuotaOk | QuotaDenied> {
  if (store.withLock) {
    return store.withLock(ip, () => consumeQuota({ ...store, withLock: undefined }, ip, nowMs, perMinute, perDay));
  }

  const windowMs = 60_000;
  let bucket = await store.get(ip);
  if (!bucket) {
    bucket = { hits: [], day: utcDayKey(nowMs), dayCount: 0 };
  }

  bucket.hits = bucket.hits.filter((t) => nowMs - t < windowMs);
  const day = utcDayKey(nowMs);
  if (bucket.day !== day) {
    bucket.day = day;
    bucket.dayCount = 0;
  }

  if (bucket.hits.length >= perMinute) {
    const oldest = bucket.hits[0] ?? nowMs;
    const retryAfter = Math.max(1, Math.ceil((oldest + windowMs - nowMs) / 1000));
    return { ok: false, retryAfter, reason: "minute" };
  }

  if (bucket.dayCount >= perDay) {
    return { ok: false, retryAfter: secondsUntilNextUtcDay(nowMs), reason: "day" };
  }

  bucket.hits.push(nowMs);
  bucket.dayCount += 1;
  await store.set(ip, bucket);
  return {
    ok: true,
    remainingMinute: perMinute - bucket.hits.length,
    remainingDay: perDay - bucket.dayCount,
  };
}

// Create an async wrapper for in-memory store to maintain backward compatibility
export function createInMemoryQuotaStore(): QuotaStore {
  const memoryStore: InMemoryQuotaStore = new Map();
  const locks = new Map<string, Promise<void>>();

  async function withLock<T>(key: string, run: () => Promise<T>): Promise<T> {
    const previous = locks.get(key) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    locks.set(key, previous.then(() => current, () => current));
    await previous.catch(() => undefined);
    try {
      return await run();
    } finally {
      release();
      if (locks.get(key) === current) locks.delete(key);
    }
  }
  
  return {
    get: async (key: string) => memoryStore.get(key),
    set: async (key: string, value: QuotaBucket) => { memoryStore.set(key, value); },
    clear: () => {
      memoryStore.clear();
      locks.clear();
    },
    withLock,
  };
}
