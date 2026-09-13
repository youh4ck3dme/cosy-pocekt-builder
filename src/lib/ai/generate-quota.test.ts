import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { consumeQuota, createInMemoryQuotaStore, type QuotaStore } from "./generate-quota.ts";

describe("consumeQuota", () => {
  it("allows up to per-minute then denies with retryAfter", async () => {
    const store: QuotaStore = createInMemoryQuotaStore();
    const t0 = Date.parse("2026-09-11T10:00:00.000Z");
    for (let i = 0; i < 10; i += 1) {
      const r = await consumeQuota(store, "1.1.1.1", t0 + i * 10, 10, 100);
      assert.equal(r.ok, true);
    }
    const denied = await consumeQuota(store, "1.1.1.1", t0 + 200, 10, 100);
    assert.equal(denied.ok, false);
    if (!denied.ok) {
      assert.equal(denied.reason, "minute");
      assert.ok(denied.retryAfter >= 1);
      assert.ok(denied.retryAfter <= 60);
    }
  });

  it("isolates IPs", async () => {
    const store: QuotaStore = createInMemoryQuotaStore();
    const t0 = Date.parse("2026-09-11T10:00:00.000Z");
    for (let i = 0; i < 10; i += 1) {
      await consumeQuota(store, "10.0.0.1", t0, 10, 100);
    }
    const other = await consumeQuota(store, "10.0.0.2", t0, 10, 100);
    assert.equal(other.ok, true);
  });

  it("enforces daily cap even inside a fresh minute window", async () => {
    const store: QuotaStore = createInMemoryQuotaStore();
    const t0 = Date.parse("2026-09-11T00:00:00.000Z");
    for (let i = 0; i < 5; i += 1) {
      const t = t0 + i * 61_000;
      const r = await consumeQuota(store, "9.9.9.9", t, 10, 5);
      assert.equal(r.ok, true);
    }
    const denied = await consumeQuota(store, "9.9.9.9", t0 + 5 * 61_000, 10, 5);
    assert.equal(denied.ok, false);
    if (!denied.ok) assert.equal(denied.reason, "day");
  });

  it("serializes concurrent consumes for the same key", async () => {
    const store: QuotaStore = createInMemoryQuotaStore();
    const t0 = Date.parse("2026-09-11T10:00:00.000Z");
    const results = await Promise.all(
      Array.from({ length: 20 }, () => consumeQuota(store, "7.7.7.7", t0, 10, 100)),
    );

    assert.equal(results.filter((result) => result.ok).length, 10);
    assert.equal(results.filter((result) => !result.ok).length, 10);
    for (const denied of results.filter((result) => !result.ok)) {
      assert.equal(denied.ok, false);
      if (!denied.ok) assert.equal(denied.reason, "minute");
    }
  });
});
